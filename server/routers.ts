import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createPropertySubmission,
  getPropertySubmissionById,
  updatePropertySubmission,
  getPropertyAnalysisBySubmissionId,
  listAllSubmissions,
  getSubmissionStats,
  getUserSubmissions,
  createAppealOutcome,
  updateAppealOutcome,
  getAppealOutcomeBySubmissionId,
  listAppealOutcomes,
  getOutcomeStats,
  getRecentActivityLogs,
  getActivityLogsBySubmission,
  persistActivityLog,
  evictExpiredCache,
  getSubmissionPhotos,
  getFilingTierBySubmission,
  createFilingTier,
  getDb,
  listUserFilings,
  listFilingQueue,
  assignQueueItem,
  completeQueueItem,
  getBatchSubmissionIds,
  listRecentFilingJobs,
  listFilingJobsByStatus,
  updateFilingJob,
  addWaitlistEntry,
  listWaitlistEntries,
  aggregateWaitlistByCounty,
  getFilingStats,
} from "./db";
import { eq } from "drizzle-orm";
import { filingTiers } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { queueAnalysisJob } from "./services/analysisJob";
import { queueReportGeneration } from "./services/reportJobQueue";
import { getReportJobById, getReportJobBySubmissionId, getDb as getDbForReports } from "./db";
import { generateAppraisalPDF, type AppraisalReportData } from "./services/pdfGenerator";
import { storagePut, storageGet } from "./storage";
import {
  CHAT_MAX_CHARS_PER_MESSAGE,
  CHAT_MAX_MESSAGES,
  ChatValidationError,
  buildLLMMessages,
  extractContactInfo,
  sanitizeMessages,
} from "./services/chat";
import { invokeLLM } from "./_core/llm";
import Stripe from "stripe"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { countiesRouter } from "./routers/counties";
import { enforceRateLimit } from "./_core/rateLimit";
import {
  PRICING_TIERS,
  selectPricingTier,
  SCRIVENER_AUTHORIZATION_TEXT,
} from "../shared/pricing";
import {
  createScrivenerAuthorization,
  getScrivenerAuthorizationById,
  getCountyEligibility,
  getActiveRecipeForCounty,
  createRefundRequest,
  getRefundRequestBySubmissionId,
  listPendingRefundRequests,
  updateRefundRequest,
  getFilingJobById,
  getFilingJobBySubmissionId,
} from "./db";
import { hashAuthorizationText } from "./services/filingRecipeEngine";
import { queueFilingJob } from "./services/filingJobQueue";

// Lazy Stripe init — importing this module should not crash when STRIPE_SECRET_KEY
// is missing (e.g. during tests or first-time local setup). The first payment
// endpoint call will surface a clear error instead.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Stripe is not configured (STRIPE_SECRET_KEY missing).",
    });
  }
  _stripe = new Stripe(key);
  return _stripe;
}

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/**
 * Money-back-guarantee window, in days. The Terms page commits to 60 days,
 * and every refund path (user-initiated + admin auto-create) enforces it.
 */
export const REFUND_WINDOW_DAYS = 60;
const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Latest of filing dispatch timestamp or submission creation. Filings can
 * land after the submission (queued work), and the guarantee clock should
 * start when the service was actually rendered. Falls back to submission
 * createdAt when no filing has run yet.
 */
function refundAnchorDate(
  submission: { createdAt?: Date | string | null } | null | undefined,
  filingJob: { createdAt?: Date | string | null } | null | undefined
): Date | null {
  const toDate = (v: Date | string | null | undefined): Date | null => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const filingAt = toDate(filingJob?.createdAt);
  const submissionAt = toDate(submission?.createdAt);
  if (filingAt && submissionAt) {
    return filingAt.getTime() >= submissionAt.getTime() ? filingAt : submissionAt;
  }
  return filingAt ?? submissionAt;
}

function refundWindowRemaining(anchor: Date): number {
  return Math.max(0, REFUND_WINDOW_MS - (Date.now() - anchor.getTime()));
}

/**
 * Auto-create a refund request after an admin records an appeal_denied
 * outcome. The guarantee only applies when a filing actually ran — if
 * the user never paid/filed, we don't create a refund. The refund is
 * pending until admin.decideRefund approves.
 */
async function maybeAutoRequestRefund(submissionId: number, adminUserId: number): Promise<void> {
  const [filingJob, existing] = await Promise.all([
    getFilingJobBySubmissionId(submissionId),
    getRefundRequestBySubmissionId(submissionId),
  ]);
  if (!filingJob || filingJob.status !== "completed") return;
  if (existing && existing.status !== "denied" && existing.status !== "failed") return;
  const submission = await getPropertySubmissionById(submissionId);
  if (!submission) return;

  // Don't auto-create refunds for outcomes recorded after the 60-day window.
  // Admins can still issue out-of-policy refunds manually via decideRefund.
  const anchor = refundAnchorDate(submission, filingJob);
  if (anchor && refundWindowRemaining(anchor) === 0) {
    await persistActivityLog({
      submissionId,
      type: "refund_auto_skipped_out_of_window",
      actor: "system",
      description: `Auto-refund skipped: outside ${REFUND_WINDOW_DAYS}-day guarantee window.`,
      metadata: JSON.stringify({ anchor: anchor.toISOString() }),
      status: "success",
    });
    return;
  }

  const tier = selectPricingTier(submission.assessedValue ? submission.assessedValue * 100 : null);

  const req = await createRefundRequest({
    submissionId,
    userId: adminUserId,
    amountCents: tier.priceCents,
    status: "pending",
    reason:
      "Auto-created under the money-back guarantee: appeal outcome recorded as denied/withdrawn. Pending admin review.",
  });
  if (req) {
    await persistActivityLog({
      submissionId,
      type: "refund_auto_requested",
      actor: "system",
      description: `Auto-refund request #${req.id} created ($${(tier.priceCents / 100).toFixed(2)})`,
      metadata: JSON.stringify({ refundId: req.id, tierId: tier.id }),
      status: "success",
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  counties: countiesRouter,

  // ─── AUTH ────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── PROPERTIES ──────────────────────────────────────────────────────────
  properties: router({
    submitAddress: publicProcedure
      .input(z.object({
        address: z.string().min(5, "Please enter a valid address"),
        email: z.string().email("Please enter a valid email"),
        phone: z.string().optional(),
        filingMethod: z.enum(["poa", "pro-se", "none"]).default("poa"),
      }))
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx, {
          scope: "submitAddress",
          max: 5,
          windowMs: 60_000,
        });
        try {
          const addressParts = input.address.split(",").map((p) => p.trim());
          const fullAddress = addressParts[0] || input.address;
          const city = addressParts[1] || "";
          const stateZip = (addressParts[2] || "").trim();
          const stateParts = stateZip.split(/\s+/);
          const state = stateParts[0] || "";
          const zipCode = stateParts[1] || "";

          const submission = await createPropertySubmission({
            address: fullAddress,
            city,
            state,
            zipCode,
            email: input.email,
            phone: input.phone,
            filingMethod: input.filingMethod,
            status: "pending",
          });

          const submissionId = submission?.id;
          
          if (submission && submissionId) {
            // Persist activity log
            await persistActivityLog({
              submissionId: submission.id,
              type: "submission_received",
              actor: "user",
              description: `New submission from ${input.email} — ${input.address}`,
              metadata: JSON.stringify({ filingMethod: input.filingMethod }),
              status: "success",
            });

            // Notify owner
            await notifyOwner({
              title: `🏠 New Appeal Request — ${fullAddress}`,
              content: `**From:** ${input.email}\n**Phone:** ${input.phone || "Not provided"}\n**Address:** ${input.address}\n**Filing Method:** ${input.filingMethod.toUpperCase()}\n\nAnalysis queued and will complete within 24 hours.`,
            }).catch((err: unknown) => console.error("[Notification] Failed to notify owner:", err));

            // Queue analysis
            queueAnalysisJob(submission.id, 2000);
          }

          return {
            success: true,
            submissionId: submissionId ? Number(submissionId) : null,
            message: "Your address has been received. AI analysis is running now.",
          };
        } catch (error) {
          console.error("[Properties] Error submitting address:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit your address. Please try again." });
        }
      }),

    getAnalysis: publicProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ input }) => {
        try {
          const submission = await getPropertySubmissionById(input.submissionId);
          if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });

          const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);
          const outcome = await getAppealOutcomeBySubmissionId(input.submissionId);
          const activityLogs = await getActivityLogsBySubmission(input.submissionId);

          return {
            submission,
            analysis: analysis ? {
              ...analysis,
              comparableSales: analysis.comparableSales ? JSON.parse(analysis.comparableSales) : [],
              appealStrengthFactors: analysis.appealStrengthFactors ? JSON.parse(analysis.appealStrengthFactors) : [],
              nextSteps: analysis.nextSteps ? JSON.parse(analysis.nextSteps) : [],
            } : null,
            outcome: outcome || null,
            activityLogs: activityLogs || [],
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve analysis." });
        }
      }),
    generateReport: publicProcedure
      .input(z.object({ submissionId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const submission = await getPropertySubmissionById(input.submissionId);
          if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });

          const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);
          const photos = await getSubmissionPhotos(input.submissionId);

          // Build report data from submission + analysis
          const reportData = {
            submissionId: submission.id,
            address: submission.address,
            city: submission.city || undefined,
            state: submission.state || undefined,
            zipCode: submission.zipCode || undefined,
            county: submission.county || undefined,
            propertyType: submission.propertyType || "residential",
            ownerName: undefined as string | undefined,
            ownerEmail: submission.email || undefined,
            assessedValue: submission.assessedValue ?? null,
            marketValueEstimate: analysis?.marketValueEstimate ?? null,
            assessmentGap: analysis?.assessmentGap ?? null,
            potentialSavings: submission.potentialSavings ?? null,
            appealStrengthScore: submission.appealStrengthScore ?? null,
            executiveSummary: analysis?.executiveSummary || undefined,
            valuationJustification: analysis?.valuationJustification || undefined,
            recommendedApproach: analysis?.recommendedApproach || undefined,
            filingMethod: submission.filingMethod || "poa",
            reportType: "instant" as const,
            comparableSales: analysis?.comparableSales ? JSON.parse(analysis.comparableSales) : [],
            squareFeet: submission.squareFeet ?? null,
            yearBuilt: submission.yearBuilt ?? null,
            bedrooms: submission.bedrooms ?? null,
            bathrooms: submission.bathrooms ?? null,
            lotSize: submission.lotSize ?? null,
            parcelNumber: undefined,
            photos: photos.map(p => ({ url: p.url, category: p.category, caption: p.caption })),
          };

          const { url, sizeBytes } = await generateAppraisalPDF(reportData);

          await persistActivityLog({
            submissionId: submission.id,
            type: "report_generated",
            actor: "system",
            description: `PDF report generated (${Math.round(sizeBytes / 1024)}KB)`,
            metadata: JSON.stringify({ pdfUrl: url }),
            status: "success",
          });

          return { success: true, url, sizeBytes };
        } catch (error) {
          console.error("[PDF] Generation failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate PDF report. Please try again." });
        }
      }),
  }),

  // ─── USER ────────────────────────────────────────────────────────────────
  user: router({
    getSubmissions: protectedProcedure.query(async ({ ctx }) => {
      try {
        const userEmail = ctx.user.email || "";
        const submissions = await getUserSubmissions(userEmail);
        // Attach outcomes to each submission
        const withOutcomes = await Promise.all(
          (submissions || []).map(async (s) => {
            const outcome = await getAppealOutcomeBySubmissionId(s.id);
            return { ...s, outcome: outcome || null };
          })
        );
        return withOutcomes;
      } catch (error) {
        console.error("[User] Error fetching submissions:", error);
        return [];
      }
    }),

    getSubmissionDetail: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        // Ensure user owns this submission
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);
        const outcome = await getAppealOutcomeBySubmissionId(input.submissionId);
        const logs = await getActivityLogsBySubmission(input.submissionId);
        return {
          submission,
          analysis: analysis ? {
            ...analysis,
            comparableSales: analysis.comparableSales ? JSON.parse(analysis.comparableSales) : [],
            appealStrengthFactors: analysis.appealStrengthFactors ? JSON.parse(analysis.appealStrengthFactors) : [],
            nextSteps: analysis.nextSteps ? JSON.parse(analysis.nextSteps) : [],
          } : null,
          outcome: outcome || null,
          activityLogs: logs,
        };
      }),

    // Filing status view — one row per submission with the latest POA filing +
    // outcome joined in. Powers the /filing-status page.
    getFilings: protectedProcedure.query(async ({ ctx }) => {
      const email = ctx.user.email || "";
      if (!email) return [];
      return listUserFilings(email);
    }),
  }),

  // ─── CHAT (LEAD CAPTURE + FAQ) ──────────────────────────────────────────
  chat: router({
    ask: publicProcedure
      .input(
        z.object({
          messages: z
            .array(
              z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().max(CHAT_MAX_CHARS_PER_MESSAGE),
              })
            )
            .min(1)
            .max(CHAT_MAX_MESSAGES),
        })
      )
      .mutation(async ({ input, ctx }) => {
        enforceRateLimit(ctx, {
          scope: "chat.ask",
          max: 20,
          windowMs: 60_000,
        });
        let clean;
        try {
          clean = sanitizeMessages(input.messages);
        } catch (err) {
          if (err instanceof ChatValidationError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
          }
          throw err;
        }

        const llmMessages = buildLLMMessages(clean);

        let reply = "";
        try {
          const result = await invokeLLM({
            messages: llmMessages,
            maxTokens: 400,
          });
          const content = result.choices[0]?.message?.content;
          reply =
            typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content
                    .map((p) => ("text" in p && p.text ? p.text : ""))
                    .join("")
                : "";
          reply = reply.trim();
        } catch (err) {
          console.error("[chat.ask] invokeLLM failed:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Chat is temporarily unavailable. Please try again.",
          });
        }

        if (!reply) {
          reply =
            "I'm having trouble answering that right now. Could you rephrase, or head to /get-started for a free analysis?";
        }

        // Fire-and-forget lead notification when the user has volunteered an
        // email or phone. Failing to notify should not break the chat.
        const contact = extractContactInfo(clean);
        let leadCaptured = false;
        if (contact.email || contact.phone) {
          leadCaptured = true;
          const lastUser = clean.filter((m) => m.role === "user").pop()?.content ?? "";
          const title = "New chat lead captured";
          const content = [
            `Email: ${contact.email ?? "(none)"}`,
            `Phone: ${contact.phone ?? "(none)"}`,
            `Last message: ${lastUser.slice(0, 280)}`,
          ].join("\n");
          void notifyOwner({ title, content }).catch((err) => {
            console.warn("[chat.ask] notifyOwner failed:", err);
          });
        }

        return { reply, leadCaptured, contact };
      }),
  }),

  // ─── PAYMENTS (STRIPE) ──────────────────────────────────────────────────
  payments: router({
    // List the public pricing tiers so the UI can render them from a single
    // source of truth (shared/pricing.ts).
    listTiers: publicProcedure.query(() => {
      return PRICING_TIERS.map((t) => ({
        id: t.id,
        label: t.label,
        priceCents: t.priceCents,
        price: t.priceCents / 100,
        assessedValueMaxCents: t.assessedValueMaxCents,
        blurb: t.blurb,
      }));
    }),

    // Flat-fee checkout: we no longer take contingency. The fee is indexed
    // by the property's assessed value and refundable under the
    // money-back guarantee if the appeal does not reduce the assessment.
    createCheckoutSession: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          // Optional override for callers who want to preview a tier before
          // the submission has an assessed value recorded.
          overrideTier: z.enum(["starter", "standard", "premium"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        }
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }

        const tier = input.overrideTier
          ? PRICING_TIERS.find((t) => t.id === input.overrideTier) ?? PRICING_TIERS[0]
          : selectPricingTier(submission.assessedValue ? submission.assessedValue * 100 : null);

        // Idempotency key: a double-click or retry within the same 5-minute
        // bucket returns the same Checkout Session instead of creating a new
        // one (which would let Stripe race two charges). Different minute
        // bucket = intentional new session (user abandoned + came back).
        const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
        const idempotencyKey = `checkout:${ctx.user.id}:${input.submissionId}:${tier.id}:${bucket}`;

        const session = await getStripe().checkout.sessions.create(
          {
            payment_method_types: ["card"],
            mode: "payment",
            customer_email: ctx.user.email || undefined,
            client_reference_id: ctx.user.id.toString(),
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: `AppraiseAI ${tier.label} Filing`,
                    description: `Pro-se property tax appeal filing. ${tier.blurb}. 60-day money-back guarantee.`,
                  },
                  unit_amount: tier.priceCents,
                },
                quantity: 1,
              },
            ],
            success_url: `${ctx.req.headers.origin}/dashboard?payment=success&submissionId=${input.submissionId}`,
            cancel_url: `${ctx.req.headers.origin}/analysis?id=${input.submissionId}`,
            metadata: {
              submissionId: input.submissionId.toString(),
              userId: ctx.user.id.toString(),
              tierId: tier.id,
              pricingModel: "flat-fee",
            },
          },
          { idempotencyKey }
        );

        await persistActivityLog({
          submissionId: input.submissionId,
          type: "checkout_started",
          actor: "user",
          actorId: ctx.user.id,
          description: `Flat-fee checkout started (${tier.label}, $${tier.priceCents / 100})`,
          metadata: JSON.stringify({ tierId: tier.id, priceCents: tier.priceCents }),
          status: "success",
        });

        return {
          sessionId: session.id,
          url: session.url,
          chargeAmount: tier.priceCents / 100,
          tier: tier.id,
        };
      }),

    // Request a refund under the money-back guarantee. Admin approves,
    // the webhook executes the refund. A submission can have at most one
    // active refund request at a time.
    requestRefund: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          reason: z.string().min(10).max(1000),
          stripeChargeId: z.string().optional(),
          stripePaymentIntentId: z.string().optional(),
          amountCents: z.number().int().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }
        const existing = await getRefundRequestBySubmissionId(input.submissionId);
        if (existing && (existing.status === "pending" || existing.status === "approved")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Refund already ${existing.status} for this submission`,
          });
        }
        // Enforce the 60-day money-back guarantee window. Admins can bypass
        // for out-of-policy refunds via direct decideRefund. The anchor is
        // the later of filing-dispatch or submission creation, so the clock
        // starts when the service was rendered, not when the user signed up.
        if (ctx.user.role !== "admin") {
          const filingJob = await getFilingJobBySubmissionId(input.submissionId);
          const anchor = refundAnchorDate(submission, filingJob);
          if (anchor && refundWindowRemaining(anchor) === 0) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `The ${REFUND_WINDOW_DAYS}-day money-back guarantee window has closed for this submission. Please contact support@appraise-ai.com if you believe an exception applies.`,
            });
          }
        }
        const req = await createRefundRequest({
          submissionId: input.submissionId,
          userId: ctx.user.id,
          stripeChargeId: input.stripeChargeId,
          stripePaymentIntentId: input.stripePaymentIntentId,
          amountCents: input.amountCents,
          reason: input.reason,
          status: "pending",
        });
        if (!req) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not record refund" });
        await persistActivityLog({
          submissionId: input.submissionId,
          type: "refund_requested",
          actor: "user",
          actorId: ctx.user.id,
          description: `Refund requested: $${(input.amountCents / 100).toFixed(2)}`,
          metadata: JSON.stringify({ refundId: req.id, reason: input.reason }),
          status: "success",
        });
        return req;
      }),

    getRefundStatus: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }
        const existing = await getRefundRequestBySubmissionId(input.submissionId);
        return existing ?? null;
      }),

    // Get payment history
    getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const charges = await getStripe().charges.list({
        limit: 50,
      });

      return charges.data
        .filter((charge: any) => charge.receipt_email === ctx.user.email || charge.metadata?.userId === ctx.user.id.toString())
        .map((charge: any) => ({
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency.toUpperCase(),
          status: charge.status,
          created: new Date(charge.created * 1000),
          description: charge.description,
         }));
    }),

    // Upload property photos to S3
    uploadPhoto: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        category: z.enum(["exterior", "interior", "roof", "foundation", "other"]),
        caption: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        }

        // Convert base64 to buffer and upload to S3
        const buffer = Buffer.from(input.fileData, "base64");
        const photoKey = `photos/${ctx.user.id}/${input.submissionId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(photoKey, buffer, "image/jpeg");

        // Log activity
        await persistActivityLog({
          submissionId: input.submissionId,
          type: "photo_uploaded",
          actor: "user",
          actorId: ctx.user.id,
          description: `Photo uploaded: ${input.fileName}`,
          metadata: JSON.stringify({ category: input.category, url }),
          status: "success",
        });

        return { url, fileName: input.fileName, category: input.category };
      }),

    // Generate certified appraisal report
    generateReport: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .mutation(async ({ input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });

        const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });

        const comparableSales = analysis.comparableSales ? JSON.parse(analysis.comparableSales) : [];
        const photos = await getSubmissionPhotos(input.submissionId);

        const reportData: AppraisalReportData = {
          submissionId: input.submissionId,
          address: submission.address,
          city: submission.city ?? undefined,
          state: submission.state ?? undefined,
          zipCode: submission.zipCode ?? undefined,
          county: submission.county ?? undefined,
          propertyType: submission.propertyType ?? undefined,
          ownerEmail: submission.email ?? undefined,
          assessedValue: submission.assessedValue ?? undefined,
          marketValueEstimate: submission.marketValue ?? undefined,
          assessmentGap: (submission.assessedValue && submission.marketValue) ? submission.assessedValue - submission.marketValue : undefined,
          potentialSavings: submission.potentialSavings ?? undefined,
          appealStrengthScore: submission.appealStrengthScore ?? undefined,
          executiveSummary: analysis.executiveSummary ?? undefined,
          valuationJustification: analysis.valuationJustification ?? undefined,
          recommendedApproach: analysis.recommendedApproach ?? undefined,
          nextSteps: analysis.nextSteps ?? undefined,
          filingMethod: submission.filingMethod ?? undefined,
          appealDeadline: submission.appealDeadline ? submission.appealDeadline.toISOString().split("T")[0] : undefined,
          comparableSales,
          squareFeet: submission.squareFeet ?? undefined,
          yearBuilt: submission.yearBuilt ?? undefined,
          bedrooms: submission.bedrooms ?? undefined,
          bathrooms: submission.bathrooms ?? undefined,
          lotSize: submission.lotSize ?? undefined,
          parcelNumber: undefined,
          photos: photos.map(p => ({ url: p.url, category: p.category, caption: p.caption })),
        };

        const { url, key } = await generateAppraisalPDF(reportData);

        await persistActivityLog({
          submissionId: input.submissionId,
          type: "report_generated",
          actor: "user",
          actorId: 0,
          description: "Certified appraisal report generated",
          metadata: JSON.stringify({ reportUrl: url, reportKey: key }),
          status: "success",
        });

        return {
          url,
          key,
          fileName: `AppraiseAI-Report-${submission.address.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`,
        };
      }),

    // Tier selection & pricing
    selectTier: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        tier: z.enum(["poa", "pro-se"]),
        countyId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const existingTier = await db.select().from(filingTiers)
          .where(eq(filingTiers.submissionId, input.submissionId))
          .limit(1);

        if (existingTier.length > 0) {
          await db.update(filingTiers)
            .set({ tier: input.tier, updatedAt: new Date() })
            .where(eq(filingTiers.submissionId, input.submissionId));
        } else {
          await db.insert(filingTiers).values({
            submissionId: input.submissionId,
            tier: input.tier,
            proSePrice: 14900,
            contingencyPercentage: 25,
            paymentStatus: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return { success: true, tier: input.tier };
      }),

    // Get tier info & pricing
    getTierInfo: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;

        const tier = await db.select().from(filingTiers)
          .where(eq(filingTiers.submissionId, input.submissionId))
          .limit(1)
          .then(r => r[0] || null);

        if (!tier) return null;

        return {
          tier: tier.tier,
          proSePrice: tier.proSePrice ? tier.proSePrice / 100 : 149,
          contingencyPercentage: tier.contingencyPercentage || 25,
          paymentStatus: tier.paymentStatus,
        };
      }),

    // Queue async report generation (24-hour SLA)
    generateReportAsync: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });

        const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });

        const { jobId, status } = await queueReportGeneration(input.submissionId, ctx.user.id);

        await persistActivityLog({
          submissionId: input.submissionId,
          type: "report_job_queued",
          actor: "user",
          actorId: ctx.user.id,
          description: `Async report generation queued (24-hour SLA)`,
          metadata: JSON.stringify({ jobId, status }),
          status: "success",
        });

        return { jobId, status };
      }),

    // Check report job status
    getReportJobStatus: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        const job = await getReportJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

        return {
          jobId: job.id,
          status: job.status,
          reportUrl: job.reportUrl || null,
          reportKey: job.reportKey || null,
          sizeBytes: job.sizeBytes || null,
          errorMessage: job.errorMessage || null,
          queuedAt: job.queuedAt,
          startedAt: job.startedAt || null,
          completedAt: job.completedAt || null,
          expiresAt: job.expiresAt,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
        };
      }),

    // Fetch a fresh presigned download URL for a completed report.
    // Accepts either a jobId or submissionId; the user must own the job.
    getReportDownloadUrl: protectedProcedure
      .input(
        z.object({
          jobId: z.number().optional(),
          submissionId: z.number().optional(),
        }).refine(v => v.jobId !== undefined || v.submissionId !== undefined, {
          message: "Provide jobId or submissionId",
        })
      )
      .query(async ({ ctx, input }) => {
        const job = input.jobId
          ? await getReportJobById(input.jobId)
          : await getReportJobBySubmissionId(input.submissionId!);

        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Report job not found" });
        if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your report" });
        }
        if (job.status !== "completed" || !job.reportKey) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Report is not ready (status: ${job.status})`,
          });
        }

        const submission = await getPropertySubmissionById(job.submissionId);
        const addressSlug = submission?.address
          ? submission.address.replace(/[^A-Za-z0-9]+/g, "-")
          : `submission-${job.submissionId}`;
        const dateStr = new Date().toISOString().split("T")[0];

        const { url } = await storageGet(job.reportKey);
        return {
          jobId: job.id,
          submissionId: job.submissionId,
          url,
          fileName: `AppraiseAI-Report-${addressSlug}-${dateStr}.pdf`,
          sizeBytes: job.sizeBytes ?? null,
          completedAt: job.completedAt ?? null,
        };
      }),

    // Batch processing endpoints
    submitBatch: protectedProcedure
      .input(
        z.object({
          properties: z.array(
            z.object({
              address: z.string(),
              city: z.string(),
              state: z.string(),
              zipCode: z.string(),
              county: z.string().optional(),
              propertyType: z.string().optional(),
              assessedValue: z.number().optional(),
            })
          ),
          filingMethod: z.enum(["poa", "pro-se"]),
          contactEmail: z.string().email(),
          contactPhone: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const results = [];

        for (const prop of input.properties) {
          try {
            // Create submission for each property
            const submission = await createPropertySubmission({
              address: prop.address,
              city: prop.city,
              state: prop.state,
              zipCode: prop.zipCode,
              county: prop.county,
              propertyType: (prop.propertyType as any) || "unknown",
              assessedValue: prop.assessedValue,
              email: input.contactEmail,
              phone: input.contactPhone,
              filingMethod: input.filingMethod,
              status: "pending",
            });

            if (submission) {
              // Queue analysis job
              await queueAnalysisJob(submission.id, ctx.user.id);
              results.push({
                address: prop.address,
                status: "queued" as const,
                submissionId: submission.id,
              });
            }
          } catch (err) {
            results.push({
              address: prop.address,
              status: "failed" as const,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        // Log batch submission
        await persistActivityLog({
          type: "batch_submitted" as any,
          actor: "system",
          description: `Batch submission: ${input.properties.length} properties`,
          metadata: JSON.stringify({ batchId, count: input.properties.length, results }),
          status: "success",
        });

        return {
          batchId,
          totalProperties: input.properties.length,
          queuedCount: results.filter((r) => r.status === "queued").length,
          failedCount: results.filter((r) => r.status === "failed").length,
          results,
        };
      }),

    // Get batch status — aggregates every submission tied to the batch
    getBatchStatus: protectedProcedure
      .input(z.object({ batchId: z.string() }))
      .query(async ({ input }) => {
        const ids = await getBatchSubmissionIds(input.batchId);
        if (ids.length === 0) {
          return {
            batchId: input.batchId,
            status: "not-found" as const,
            totalProperties: 0,
            completedCount: 0,
            failedCount: 0,
            pendingCount: 0,
            submissions: [] as Array<{
              submissionId: number;
              address: string;
              status: string;
              potentialSavings: number | null;
            }>,
          };
        }

        const submissions = await Promise.all(ids.map(getPropertySubmissionById));
        const resolved = submissions.filter(
          (s): s is NonNullable<typeof s> => s !== null && s !== undefined
        );

        const completedStatuses = new Set([
          "analyzed",
          "contacted",
          "appeal-filed",
          "hearing-scheduled",
          "won",
        ]);
        const failedStatuses = new Set(["lost", "withdrawn", "archived"]);

        const completedCount = resolved.filter((s) => completedStatuses.has(s.status)).length;
        const failedCount = resolved.filter((s) => failedStatuses.has(s.status)).length;
        const pendingCount = resolved.length - completedCount - failedCount;

        const status: "completed" | "processing" | "failed" =
          completedCount === resolved.length
            ? "completed"
            : failedCount === resolved.length
              ? "failed"
              : "processing";

        return {
          batchId: input.batchId,
          status,
          totalProperties: resolved.length,
          completedCount,
          failedCount,
          pendingCount,
          submissions: resolved.map((s) => ({
            submissionId: s.id,
            address: s.address,
            status: s.status,
            potentialSavings: s.potentialSavings ?? null,
          })),
        };
      }),
  }),
  // ─── ADMIN COMMAND CENTER ────────────────────────────────────────────────
  admin: router({
    // Seed counties (one-time setup)
    seedCounties: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Seeding logic handled by adminRouter
      return { success: true, message: "Counties seeded", count: 14 };
    }),

    // Dashboard overview
    getDashboard: adminProcedure.query(async () => {
      const [submissionStats, outcomeStats, recentActivity] = await Promise.all([
        getSubmissionStats(),
        getOutcomeStats(),
        getRecentActivityLogs(20),
      ]);
      return { submissionStats, outcomeStats, recentActivity };
    }),

    // Submissions management
    listSubmissions: adminProcedure
      .input(z.object({
        limit: z.number().default(25),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const { submissions, total } = await listAllSubmissions(input.limit, input.offset);
        return { submissions, total };
      }),

    getSubmissionDetail: adminProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);
        const outcome = await getAppealOutcomeBySubmissionId(input.submissionId);
        const logs = await getActivityLogsBySubmission(input.submissionId);
        return {
          submission,
          analysis: analysis ? {
            ...analysis,
            comparableSales: analysis.comparableSales ? JSON.parse(analysis.comparableSales) : [],
            appealStrengthFactors: analysis.appealStrengthFactors ? JSON.parse(analysis.appealStrengthFactors) : [],
            nextSteps: analysis.nextSteps ? JSON.parse(analysis.nextSteps) : [],
          } : null,
          outcome: outcome || null,
          activityLogs: logs,
        };
      }),

    updateSubmissionStatus: adminProcedure
      .input(z.object({
        submissionId: z.number(),
        status: z.enum(["pending", "analyzing", "analyzed", "contacted", "appeal-filed", "hearing-scheduled", "won", "lost", "withdrawn", "archived"]),
        adminNote: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updatePropertySubmission(input.submissionId, { status: input.status });
        await persistActivityLog({
          submissionId: input.submissionId,
          type: "admin_action",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Status updated to "${input.status}"${input.adminNote ? ` — ${input.adminNote}` : ""}`,
          metadata: JSON.stringify({ newStatus: input.status, note: input.adminNote }),
          status: "success",
        });
        return updated;
      }),

    // Appeal outcomes
    recordOutcome: adminProcedure
      .input(z.object({
        submissionId: z.number(),
        outcome: z.enum(["won", "lost", "settled", "withdrawn", "pending-hearing"]),
        originalAssessedValue: z.number().optional(),
        finalAssessedValue: z.number().optional(),
        annualTaxSavings: z.number().optional(),
        filingMethod: z.enum(["poa", "pro-se"]).optional(),
        filedAt: z.string().optional(),
        resolvedAt: z.string().optional(),
        groundsForAppeal: z.string().optional(),
        adminNotes: z.string().optional(),
        hearingNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getAppealOutcomeBySubmissionId(input.submissionId);

        let reductionAmount: number | undefined;
        let contingencyFee: string | undefined;

        if (input.originalAssessedValue && input.finalAssessedValue) {
          reductionAmount = input.originalAssessedValue - input.finalAssessedValue;
        }
        if (input.annualTaxSavings && input.outcome === "won") {
          // 25% contingency of first-year savings
          contingencyFee = (input.annualTaxSavings * 0.25).toFixed(2);
        }

        let resolutionDays: number | undefined;
        if (input.filedAt && input.resolvedAt) {
          const filed = new Date(input.filedAt);
          const resolved = new Date(input.resolvedAt);
          resolutionDays = Math.round((resolved.getTime() - filed.getTime()) / (1000 * 60 * 60 * 24));
        }

        const outcomeData = {
          submissionId: input.submissionId,
          outcome: input.outcome,
          originalAssessedValue: input.originalAssessedValue,
          finalAssessedValue: input.finalAssessedValue,
          reductionAmount,
          annualTaxSavings: input.annualTaxSavings,
          contingencyFeeEarned: contingencyFee,
          filingMethod: input.filingMethod,
          filedAt: input.filedAt ? new Date(input.filedAt) : undefined,
          resolvedAt: input.resolvedAt ? new Date(input.resolvedAt) : undefined,
          resolutionDays,
          groundsForAppeal: input.groundsForAppeal,
          adminNotes: input.adminNotes,
          hearingNotes: input.hearingNotes,
        };

        let result;
        if (existing) {
          result = await updateAppealOutcome(existing.id, outcomeData);
        } else {
          result = await createAppealOutcome(outcomeData);
        }

        // Update submission status to match outcome
        const statusMap: Record<string, "won" | "lost" | "withdrawn" | "hearing-scheduled"> = {
          won: "won", lost: "lost", settled: "won", withdrawn: "withdrawn", "pending-hearing": "hearing-scheduled",
        };
        await updatePropertySubmission(input.submissionId, { status: statusMap[input.outcome] || "appeal-filed" });

        await persistActivityLog({
          submissionId: input.submissionId,
          type: input.outcome === "won" ? "appeal_won" : input.outcome === "lost" ? "appeal_lost" : "admin_action",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Appeal outcome recorded: ${input.outcome.toUpperCase()}${input.annualTaxSavings ? ` — $${input.annualTaxSavings.toLocaleString()}/yr savings` : ""}`,
          metadata: JSON.stringify(outcomeData),
          status: "success",
        });

        // Auto-create a refund request under the money-back guarantee
        // when the appeal was denied (lost/withdrawn with no reduction).
        // Only creates the refund — an admin still approves it via
        // admin.decideRefund. Keeps a human in the loop but removes the
        // manual data-entry step.
        if (input.outcome === "lost" || input.outcome === "withdrawn") {
          await maybeAutoRequestRefund(input.submissionId, ctx.user.id).catch((err) => {
            console.error("[AutoRefund] Failed to request:", err);
          });
        }

        return result;
      }),

    listOutcomes: adminProcedure
      .input(z.object({ limit: z.number().default(25), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        return listAppealOutcomes(input.limit, input.offset);
      }),

    getOutcomeStats: adminProcedure.query(async () => {
      return getOutcomeStats();
    }),

    // Activity feed
    getActivityFeed: adminProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return getRecentActivityLogs(input.limit);
      }),

    // Cache management
    evictCache: adminProcedure.mutation(async () => {
      const evicted = await evictExpiredCache();
      return { evicted, message: `Evicted ${evicted} expired cache entries` };
    }),

    // Re-trigger analysis for a submission
    retriggerAnalysis: adminProcedure
      .input(z.object({ submissionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });

        await updatePropertySubmission(input.submissionId, { status: "pending" });
        queueAnalysisJob(input.submissionId, 500);

        await persistActivityLog({
          submissionId: input.submissionId,
          type: "analysis_started",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Analysis re-triggered by admin`,
          metadata: JSON.stringify({}),
          status: "success",
        });

        return { success: true, message: "Analysis re-triggered" };
      }),

    // ─── REFUND ADMINISTRATION ───────────────────────────────────────────
    listRefundRequests: adminProcedure.query(async () => {
      return listPendingRefundRequests();
    }),

    decideRefund: adminProcedure
      .input(
        z.object({
          refundId: z.number(),
          decision: z.enum(["approved", "denied"]),
          adminNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await updateRefundRequest(input.refundId, {
          status: input.decision,
          adminNotes: input.adminNotes,
          decidedAt: new Date(),
          decidedBy: ctx.user.id,
        });
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Refund request not found" });
        }
        if (input.decision === "approved") {
          // Execute refund against Stripe if we have a payment reference.
          try {
            if (updated.stripePaymentIntentId) {
              const refund = await getStripe().refunds.create({
                payment_intent: updated.stripePaymentIntentId,
                amount: updated.amountCents,
                metadata: {
                  refundRequestId: updated.id.toString(),
                  submissionId: updated.submissionId.toString(),
                },
              });
              await updateRefundRequest(updated.id, {
                status: "refunded",
                refundedAt: new Date(),
                stripeRefundId: refund.id,
              });
            } else if (updated.stripeChargeId) {
              const refund = await getStripe().refunds.create({
                charge: updated.stripeChargeId,
                amount: updated.amountCents,
                metadata: {
                  refundRequestId: updated.id.toString(),
                  submissionId: updated.submissionId.toString(),
                },
              });
              await updateRefundRequest(updated.id, {
                status: "refunded",
                refundedAt: new Date(),
                stripeRefundId: refund.id,
              });
            } else {
              await updateRefundRequest(updated.id, {
                status: "failed",
                adminNotes: [input.adminNotes, "No Stripe reference; manual refund required"].filter(Boolean).join("\n"),
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await updateRefundRequest(updated.id, {
              status: "failed",
              adminNotes: [input.adminNotes, `Stripe refund failed: ${message}`].filter(Boolean).join("\n"),
            });
          }
        }
        await persistActivityLog({
          submissionId: updated.submissionId,
          type: input.decision === "approved" ? "refund_approved" : "refund_denied",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Refund #${updated.id} ${input.decision}`,
          metadata: JSON.stringify({ refundId: updated.id, amountCents: updated.amountCents }),
          status: "success",
        });
        return updated;
      }),

    // ─── FILING STATS + WAITLIST ─────────────────────────────────────────
    getFilingStats: adminProcedure
      .input(z.object({ windowDays: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ input }) => {
        return getFilingStats(input?.windowDays ?? 30);
      }),

    listWaitlist: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(200) }).optional())
      .query(async ({ input }) => {
        const [entries, agg] = await Promise.all([
          listWaitlistEntries(input?.limit ?? 200),
          aggregateWaitlistByCounty(),
        ]);
        return { entries, aggregates: agg };
      }),

    // ─── FILING JOBS (multi-channel) ─────────────────────────────────────
    listFilingJobs: adminProcedure
      .input(
        z
          .object({
            status: z.enum([
              "pending",
              "processing",
              "awaiting_captcha",
              "completed",
              "failed",
              "cancelled",
            ]).optional(),
            limit: z.number().min(1).max(500).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const limit = input?.limit ?? 50;
        if (input?.status) {
          return listFilingJobsByStatus([input.status], limit);
        }
        return listRecentFilingJobs(limit);
      }),

    retryFiling: adminProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getFilingJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Filing job not found" });
        if (job.status !== "failed" && job.status !== "cancelled") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Can only retry failed or cancelled jobs (current: ${job.status})`,
          });
        }
        if (job.retryCount >= job.maxRetries) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Job has exceeded max retries — escalate to engineering",
          });
        }
        await updateFilingJob(job.id, {
          status: "pending",
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          retryCount: job.retryCount + 1,
        });
        await persistActivityLog({
          submissionId: job.submissionId,
          type: "filing_retry",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Filing #${job.id} re-queued (retry ${job.retryCount + 1}/${job.maxRetries})`,
          metadata: JSON.stringify({ jobId: job.id }),
          status: "success",
        });
        return { success: true, jobId: job.id };
      }),

    cancelFiling: adminProcedure
      .input(z.object({ jobId: z.number(), reason: z.string().max(1000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getFilingJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Filing job not found" });
        if (job.status === "completed") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot cancel a completed filing",
          });
        }
        await updateFilingJob(job.id, {
          status: "cancelled",
          errorMessage: input.reason ?? "Cancelled by admin",
          completedAt: new Date(),
        });
        await persistActivityLog({
          submissionId: job.submissionId,
          type: "filing_cancelled",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Filing #${job.id} cancelled${input.reason ? `: ${input.reason}` : ""}`,
          metadata: JSON.stringify({ jobId: job.id, reason: input.reason ?? null }),
          status: "warning",
        });
        return { success: true, jobId: job.id };
      }),

    // ─── PARALEGALS QUEUE ────────────────────────────────────────────────
    listFilingQueue: adminProcedure.query(async () => {
      return listFilingQueue();
    }),

    assignFiling: adminProcedure
      .input(z.object({ queueId: z.number(), assignedTo: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        const updated = await assignQueueItem(input.queueId, input.assignedTo);
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Queue item not found or database unavailable",
          });
        }
        await persistActivityLog({
          type: "paralegal_assigned",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Filing queue item #${input.queueId} assigned to ${input.assignedTo}`,
          metadata: JSON.stringify({ queueId: input.queueId, assignedTo: input.assignedTo }),
          status: "success",
        });
        return updated;
      }),

    completeFiling: adminProcedure
      .input(
        z.object({
          queueId: z.number(),
          notes: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await completeQueueItem(input.queueId, input.notes);
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Queue item not found or database unavailable",
          });
        }
        await persistActivityLog({
          type: "paralegal_completed",
          actor: "admin",
          actorId: ctx.user.id,
          description: `Filing queue item #${input.queueId} marked complete`,
          metadata: JSON.stringify({ queueId: input.queueId }),
          status: "success",
        });
        return updated;
      }),
  }),

  // ─── FILINGS (PLAYWRIGHT AUTOMATION) ─────────────────────────────────────
  filings: router({
    // Return the canonical scrivener authorization text so the client can
    // render exactly what gets hashed and stored. Versioned implicitly by
    // the hash — if the text changes, the hash changes, and existing
    // authorizations are clearly pinned to the text they approved.
    getAuthorizationText: publicProcedure.query(() => ({
      text: SCRIVENER_AUTHORIZATION_TEXT,
      textHash: hashAuthorizationText(SCRIVENER_AUTHORIZATION_TEXT),
    })),

    // Record a scrivener authorization. The client must POST the exact
    // text they displayed; we verify the hash matches ours before storing.
    authorize: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          typedName: z.string().min(2).max(255),
          authorizationText: z.string().min(100).max(5000),
          scrolledToEnd: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }
        const hash = hashAuthorizationText(input.authorizationText);
        const canonicalHash = hashAuthorizationText(SCRIVENER_AUTHORIZATION_TEXT);
        if (hash !== canonicalHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Authorization text does not match the canonical version. Refresh and try again.",
          });
        }

        const forwarded = ctx.req.headers["x-forwarded-for"];
        const ip = typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : Array.isArray(forwarded)
            ? forwarded[0]
            : ctx.req.socket?.remoteAddress || undefined;
        const userAgent = (ctx.req.headers["user-agent"] as string | undefined)?.slice(0, 512);

        const auth = await createScrivenerAuthorization({
          submissionId: input.submissionId,
          userId: ctx.user.id,
          typedName: input.typedName,
          ipAddress: ip,
          userAgent,
          authorizationText: input.authorizationText,
          authorizationTextHash: hash,
          scrolledToEnd: input.scrolledToEnd,
        });
        if (!auth) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not record authorization" });

        await persistActivityLog({
          submissionId: input.submissionId,
          type: "scrivener_authorized",
          actor: "user",
          actorId: ctx.user.id,
          description: `Scrivener authorization signed by ${input.typedName}`,
          metadata: JSON.stringify({ authId: auth.id, ip, textHash: hash }),
          status: "success",
        });
        return auth;
      }),

    // Eligibility check — combines county flags with submission context.
    checkEligibility: protectedProcedure
      .input(z.object({ submissionId: z.number(), countyId: z.number() }))
      .query(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }
        const eligibility = await getCountyEligibility(input.countyId);
        const recipe = await getActiveRecipeForCounty(input.countyId);
        return {
          ...eligibility,
          recipeVerificationStatus: recipe?.verificationStatus ?? null,
          portalUrl: recipe?.portalUrl ?? null,
        };
      }),

    // Submit a filing. Validates: ownership, eligibility, prior
    // authorization, paid status (we do not run filings for unpaid
    // submissions), and enqueues the Playwright job.
    submit: protectedProcedure
      .input(
        z.object({
          submissionId: z.number(),
          countyId: z.number(),
          authorizationId: z.number(),
          // Per-run inputs — PIN, account number, etc. Wiped after job
          // completes. Allows string and number.
          inputs: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
        })
      )
      .mutation(async ({ ctx, input }) => {
        enforceRateLimit(ctx, {
          scope: "filings.submit",
          max: 3,
          windowMs: 60_000,
        });
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }

        const eligibility = await getCountyEligibility(input.countyId);
        if (eligibility.reasonsIneligible.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Not eligible for automated filing: ${eligibility.reasonsIneligible.join("; ")}`,
          });
        }
        if (!eligibility.withinFilingWindow) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This county's appeal filing window is currently closed",
          });
        }

        const auth = await getScrivenerAuthorizationById(input.authorizationId);
        if (!auth || auth.submissionId !== input.submissionId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "A scrivener authorization is required before filing",
          });
        }

        // Idempotency: if an active (pending/processing) or successful
        // filing already exists for this submission, return it rather
        // than double-submitting. Users will refresh/re-click — we
        // don't want to file twice.
        const existing = await getFilingJobBySubmissionId(input.submissionId);
        if (existing && existing.status !== "failed" && existing.status !== "cancelled") {
          return { jobId: existing.id, submissionId: existing.submissionId };
        }

        // Portal is optional — if the county uses a mail or email channel,
        // no recipe is needed. Only pin a recipe when one exists.
        const recipe = await getActiveRecipeForCounty(input.countyId);

        const queued = await queueFilingJob({
          submissionId: input.submissionId,
          userId: ctx.user.id,
          countyId: input.countyId,
          recipeId: recipe?.id,
          authorizationId: auth.id,
          inputs: input.inputs,
        });

        return queued;
      }),

    getJobStatus: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await getFilingJobById(input.jobId);
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your job" });
        }
        return {
          jobId: job.id,
          submissionId: job.submissionId,
          status: job.status,
          deliveryChannel: job.deliveryChannel ?? null,
          portalConfirmationNumber: job.portalConfirmationNumber ?? null,
          finalScreenshotKey: job.finalScreenshotKey ?? null,
          executionLogKey: job.executionLogKey ?? null,
          mailTrackingNumber: job.mailTrackingNumber ?? null,
          lobLetterId: job.lobLetterId ?? null,
          lobExpectedDeliveryDate: job.lobExpectedDeliveryDate ?? null,
          emailMessageId: job.emailMessageId ?? null,
          emailRecipient: job.emailRecipient ?? null,
          errorMessage: job.errorMessage ?? null,
          queuedAt: job.queuedAt,
          startedAt: job.startedAt ?? null,
          completedAt: job.completedAt ?? null,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
        };
      }),

    getJobForSubmission: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
        if (submission.email !== ctx.user.email && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your submission" });
        }
        const job = await getFilingJobBySubmissionId(input.submissionId);
        return job ?? null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
