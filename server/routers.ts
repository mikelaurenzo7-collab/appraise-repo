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
} from "./db";
import { notifyOwner } from "./_core/notification";
import { queueAnalysisJob } from "./services/analysisJob";
import { generateAppraisalPDF, type AppraisalReportData } from "./services/pdfGenerator";
import { storagePut } from "./storage";
import Stripe from "stripe"; // eslint-disable-line @typescript-eslint/no-unused-vars

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

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
      .mutation(async ({ input }) => {
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

          if (submission) {
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
            submissionId: submission?.id,
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
  }),

  // ─── PAYMENTS (STRIPE) ──────────────────────────────────────────────────
  payments: router({
    // Create checkout session for certified report
    createCheckoutSession: protectedProcedure
      .input(z.object({
        submissionId: z.number(),
        annualTaxSavings: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        // Calculate 25% contingency fee
        const contingencyFee = Math.round(input.annualTaxSavings * 0.25 * 100);
        const minCharge = 5000; // $50 minimum
        const chargeAmount = Math.max(contingencyFee, minCharge);

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "AppraiseAI Certified Appraisal Report",
                  description: `25% contingency fee on $${(input.annualTaxSavings / 100).toFixed(2)} annual tax savings`,
                },
                unit_amount: chargeAmount,
              },
              quantity: 1,
            },
          ],
          success_url: `${ctx.req.headers.origin}/dashboard?payment=success&submissionId=${input.submissionId}`,
          cancel_url: `${ctx.req.headers.origin}/analysis?id=${input.submissionId}`,
          metadata: {
            submissionId: input.submissionId.toString(),
            userId: ctx.user.id.toString(),
            annualTaxSavings: input.annualTaxSavings.toString(),
          },
        });

        return {
          sessionId: session.id,
          url: session.url,
          chargeAmount: chargeAmount / 100,
        };
      }),

    // Get payment history
    getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
      const charges = await stripe.charges.list({
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
  }),
  // ─── ADMIN COMMAND CENTER ────────────────────────────────────────────────
  admin: router({
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
  }),
});

export type AppRouter = typeof appRouter;
