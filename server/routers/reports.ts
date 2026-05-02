/**
 * Reports Router
 * Handles professional report generation, delivery, and management
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ProfessionalReportTemplate, ReportData } from "../services/reportTemplate";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import {
  getDb,
  getReportJobBySubmissionId,
  getPropertySubmissionById,
} from "../db";
import { reportJobs } from "../../drizzle/schema.pg";
import { eq } from "drizzle-orm";
import { scopedLogger } from "../_core/logger";

const log = scopedLogger("Reports");

export const reportsRouter = router({
  /**
   * Generate professional report for a submission.
   * Fetches real submission and analysis data from the database
   * and generates a PDF report via the ProfessionalReportTemplate.
   */
  generateReport: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        includePhotos: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const submission = await getPropertySubmissionById(input.submissionId);
        if (!submission) throw new Error("Submission not found");
        // Verify ownership via email (submissions are linked to users by email)
        if (submission.email !== ctx.user!.email) throw new Error("Unauthorized");

        const reportData: ReportData = {
          propertyAddress: submission.address,
          city: submission.city ?? "",
          state: submission.state ?? "",
          zipCode: submission.zipCode ?? "",
          county: submission.county ?? "",
          assessedValue: submission.assessedValue ?? 0,
          marketValue: submission.marketValue ?? submission.assessedValue ?? 0,
          assessmentGap: (submission.assessedValue ?? 0) - (submission.marketValue ?? submission.assessedValue ?? 0),
          propertyType: submission.propertyType ?? "residential",
          yearBuilt: submission.yearBuilt ?? 0,
          squareFeet: submission.squareFeet ?? 0,
          bedrooms: submission.bedrooms ?? 0,
          bathrooms: submission.bathrooms ?? 0,
          lotSize: submission.lotSize ?? 0,
          condition: "Average",
          comparableSales: [],
          marketTrends: { yearOverYearChange: 0, sixMonthChange: 0, marketStatus: "Stable" },
          appealScore: submission.appealStrengthScore ?? 0,
          successProbability: (submission.appealStrengthScore ?? 0) / 100,
          annualSavings: submission.potentialSavings ?? 0,
          estimatedSavings40Year: (submission.potentialSavings ?? 0) * 40,
          photos: input.includePhotos ? [] : [],
        };

        const template = new ProfessionalReportTemplate();
        const validation = template.validateReport(reportData);
        if (!validation.valid) {
          throw new Error(`Report validation failed: ${validation.errors.join(", ")}`);
        }

        const pdfStream = template.generateReport(reportData);
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
          pdfStream.on("data", (chunk: Buffer) => chunks.push(chunk));
          pdfStream.on("end", async () => {
            try {
              const pdfBuffer = Buffer.concat(chunks);
              const userId = ctx.user!.id;
              const fileName = `reports/${userId}/${input.submissionId}-${Date.now()}.pdf`;
              const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");
              await notifyOwner({
                title: "Report Generated",
                content: `Professional report generated for ${reportData.propertyAddress}. File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`,
              });
              resolve({ url, fileSize: pdfBuffer.length, fileName: `${submission.address}-report.pdf` });
            } catch (err) {
              reject(err);
            }
          });
          pdfStream.on("error", reject);
        });
      } catch (error) {
        log.error("Generation failed", { submissionId: input.submissionId, err: (error as Error).message });
        throw error;
      }
    }),

  /**
   * Get the completed report for a submission.
   * Returns the URL and metadata for the most recent completed report job.
   */
  getReport: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const submission = await getPropertySubmissionById(input.submissionId);
      if (!submission) throw new Error("Submission not found");
      if (submission.email !== ctx.user!.email) throw new Error("Unauthorized");

      const job = await getReportJobBySubmissionId(input.submissionId);
      if (!job || !job.reportUrl) return null;

      return {
        url: job.reportUrl,
        fileSize: job.sizeBytes ?? null,
        generatedAt: job.completedAt ?? job.updatedAt,
      };
    }),

  /**
   * List all completed report jobs for the authenticated user.
   */
  listReports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const jobs = await db
      .select()
      .from(reportJobs)
      .where(eq(reportJobs.userId, ctx.user!.id))
      .orderBy(reportJobs.createdAt);
    return jobs
      .filter((j) => j.reportUrl)
      .map((j) => ({
        submissionId: j.submissionId,
        url: j.reportUrl!,
        fileSize: j.sizeBytes ?? null,
        generatedAt: j.completedAt ?? j.updatedAt,
      }));
  }),
});
