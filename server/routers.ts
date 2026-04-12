import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createPropertySubmission,
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  listAllSubmissions,
  getSubmissionStats,
  getUserSubmissions,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { queueAnalysisJob } from "./services/analysisJob";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  properties: router({
    submitAddress: publicProcedure
      .input(
        z.object({
          address: z.string().min(5, "Please enter a valid address"),
          email: z.string().email("Please enter a valid email"),
          phone: z.string().optional(),
          filingMethod: z.enum(["poa", "pro-se"]).default("poa"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const addressParts = input.address.split(",").map((p) => p.trim());
          const fullAddress = addressParts[0] || input.address;
          const city = addressParts[1] || "";
          const stateZip = addressParts[2] || "";
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
            await notifyOwner({
              title: "New Property Analysis Request",
              content: `New submission from ${input.email}\n\nAddress: ${input.address}\nPhone: ${input.phone || "Not provided"}\n\nStatus: Pending analysis`,
            }).catch((err: unknown) => console.error("[Notification] Failed to notify owner:", err));

            queueAnalysisJob(submission.id, 2000);
          }

          return {
            success: true,
            submissionId: submission?.id,
            message: "Your address has been received. We'll analyze it and send results to your email within 24 hours.",
          };
        } catch (error) {
          console.error("[Properties] Error submitting address:", error);
          throw new Error("Failed to submit your address. Please try again.");
        }
      }),

    getAnalysis: publicProcedure
      .input(z.object({ submissionId: z.number() }))
      .query(async ({ input }) => {
        try {
          const submission = await getPropertySubmissionById(input.submissionId);
          if (!submission) throw new Error("Submission not found");

          const analysis = await getPropertyAnalysisBySubmissionId(input.submissionId);

          return {
            submission,
            analysis: analysis
              ? {
                  ...analysis,
                  comparableSales: analysis.comparableSales ? JSON.parse(analysis.comparableSales) : [],
                  appealStrengthFactors: analysis.appealStrengthFactors ? JSON.parse(analysis.appealStrengthFactors) : [],
                  nextSteps: analysis.nextSteps ? JSON.parse(analysis.nextSteps) : [],
                }
              : null,
          };
        } catch (error) {
          console.error("[Properties] Error getting analysis:", error);
          throw new Error("Failed to retrieve analysis. Please try again.");
        }
      }),
  }),

  user: router({
    getSubmissions: protectedProcedure.query(async ({ ctx }) => {
      try {
        const userEmail = ctx.user.email || "";
        const submissions = await getUserSubmissions(userEmail);
        return submissions || [];
      } catch (error) {
        console.error("[User] Error fetching submissions:", error);
        return [];
      }
    }),
  }),

  admin: router({
    listSubmissions: adminProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        const { submissions, total } = await listAllSubmissions(input.limit, input.offset);
        const stats = await getSubmissionStats();
        return { submissions, total, stats };
      }),
  }),
});

export type AppRouter = typeof appRouter;
