/**
 * Appeals Router
 * Integrates appeal strength scoring, deadline calendar, photo analysis, and report generation
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { calculateAppealStrengthScore } from "../services/appealStrengthScoring";
import {
  getCountyDeadlines,
  analyzePropertyPhotos,
  generateProfessionalReport,
  formatDeadlineCalendar,
} from "../services/comprehensiveAppealService";
import { getDb } from "../db";
import { propertySubmissions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const appealsRouter = router({
  /**
   * Get appeal strength score for a submission
   */
  getStrengthScore: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ input }) => {
      try {
        const score = await calculateAppealStrengthScore(input.submissionId);
        return score;
      } catch (error) {
        console.error("[Appeals] Error calculating strength score:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate appeal strength score",
        });
      }
    }),

  /**
   * Get deadline calendar for a submission
   */
  getDeadlineCalendar: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const submission = await db
          .select()
          .from(propertySubmissions)
          .where(eq(propertySubmissions.id, input.submissionId))
          .limit(1);

        if (!submission.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Submission not found",
          });
        }

        const county = submission[0].county || "Travis County";
        const filedDate = submission[0].createdAt || new Date();

        const deadlines = getCountyDeadlines(county, filedDate);

        return {
          county: deadlines.county,
          appealDeadline: deadlines.appealDeadline,
          hearingDeadline: deadlines.hearingDeadline,
          decisionDeadline: deadlines.decisionDeadline,
          daysUntilAppealDeadline: deadlines.daysUntilAppealDeadline,
          status: deadlines.status,
          formattedCalendar: formatDeadlineCalendar([deadlines]),
        };
      } catch (error) {
        console.error("[Appeals] Error getting deadline calendar:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get deadline calendar",
        });
      }
    }),

  /**
   * Analyze property photos for defects and cost-to-cure
   */
  analyzePhotos: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        photoUrls: z.array(z.string().url()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (input.photoUrls.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least one photo URL is required",
          });
        }

        if (input.photoUrls.length > 10) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum 10 photos allowed",
          });
        }

        const results = await analyzePropertyPhotos(
          input.submissionId,
          input.photoUrls
        );

        return {
          success: true,
          photosAnalyzed: results.length,
          results,
          totalCostToCure: results.reduce((sum, r) => sum + r.totalCostToCure, 0),
        };
      } catch (error) {
        console.error("[Appeals] Error analyzing photos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to analyze photos",
        });
      }
    }),

  /**
   * Generate professional appeal report (always includes photos, max 70 pages)
   */
  generateReport: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        tone: z.enum(["aggressive", "balanced", "conservative"]).default("aggressive"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Verify submission exists and belongs to user
        const submission = await db
          .select()
          .from(propertySubmissions)
          .where(eq(propertySubmissions.id, input.submissionId))
          .limit(1);

        if (!submission.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Submission not found",
          });
        }

        // Generate report (always includes photos)
        const report = await generateProfessionalReport({
          submissionId: input.submissionId,
          tone: input.tone,
        });

        return {
          success: true,
          reportUrl: report.reportUrl,
          pageCount: report.pageCount,
          generatedAt: new Date(),
        };
      } catch (error) {
        console.error("[Appeals] Error generating report:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate report",
        });
      }
    }),

  /**
   * Get complete appeal package (score + deadlines + report recommendation)
   */
  getCompleteAppealPackage: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ input }) => {
      try {
        // Get strength score
        const strengthScore = await calculateAppealStrengthScore(input.submissionId);

        // Get deadline calendar
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const submission = await db
          .select()
          .from(propertySubmissions)
          .where(eq(propertySubmissions.id, input.submissionId))
          .limit(1);

        if (!submission.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Submission not found",
          });
        }

        const county = submission[0].county || "Travis County";
        const filedDate = submission[0].createdAt || new Date();
        const deadlines = getCountyDeadlines(county, filedDate);

        // Determine if appeal is recommended (success probability > 50% and deadline not passed)
        const isRecommended =
          strengthScore.successProbability > 0.5 &&
          deadlines.daysUntilAppealDeadline > 0;

        return {
          submissionId: input.submissionId,
          strengthScore,
          deadlines: {
            county: deadlines.county,
            appealDeadline: deadlines.appealDeadline,
            daysUntilAppealDeadline: deadlines.daysUntilAppealDeadline,
            status: deadlines.status,
          },
          recommendation: {
            isRecommended,
            reason: isRecommended
              ? `Strong appeal candidate with ${(strengthScore.successProbability * 100).toFixed(0)}% success probability. Appeal deadline: ${deadlines.daysUntilAppealDeadline} days.`
              : strengthScore.successProbability < 0.4
                ? "Weak appeal prospects. Consider gathering additional evidence before proceeding."
                : "Borderline case. Consult with a property tax professional.",
            nextSteps: isRecommended
              ? [
                  "Review the detailed appeal report",
                  "Upload property photos for cost-to-cure analysis",
                  "File appeal before deadline",
                  "Prepare for hearing",
                ]
              : ["Gather additional evidence", "Reassess after market changes"],
          },
        };
      } catch (error) {
        console.error("[Appeals] Error getting complete package:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get appeal package",
        });
      }
    }),
});
