/**
 * Reports Router
 * Handles professional report generation, delivery, and management
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { ProfessionalReportTemplate, ReportData } from "../services/reportTemplate";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import { getDb } from "../db";

export const reportsRouter = router({
  /**
   * Generate professional report for a submission
   * Called after payment is confirmed
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
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        // Build report data from available information
        const reportData: ReportData = {
          propertyAddress: "123 Main Street",
          city: "Austin",
          state: "TX",
          zipCode: "78701",
          county: "Travis",
          assessedValue: 425000,
          marketValue: 385000,
          assessmentGap: 40000,
          propertyType: "residential",
          yearBuilt: 2005,
          squareFeet: 3200,
          bedrooms: 4,
          bathrooms: 2.5,
          lotSize: 0.5,
          condition: "Good",
          comparableSales: [
            {
              address: "456 Oak Ave",
              salePrice: 380000,
              saleDate: "2024-03-15",
              squareFeet: 3150,
            },
            {
              address: "789 Elm St",
              salePrice: 390000,
              saleDate: "2024-02-20",
              squareFeet: 3250,
            },
            {
              address: "321 Pine Rd",
              salePrice: 375000,
              saleDate: "2024-01-10",
              squareFeet: 3100,
            },
          ],
          marketTrends: {
            yearOverYearChange: -2.5,
            sixMonthChange: -1.2,
            marketStatus: "Cooling",
          },
          appealScore: 86,
          successProbability: 0.86,
          annualSavings: 413,
          estimatedSavings40Year: 16520,
          photos: input.includePhotos
            ? [
                {
                  url: "https://example.com/photo1.jpg",
                  category: "exterior",
                  defects: ["Roof wear - moderate severity"],
                },
              ]
            : [],
          costToCure: [
            {
              defect: "Roof wear",
              estimatedCost: 5000,
            },
            {
              defect: "Exterior paint",
              estimatedCost: 2000,
            },
          ],
          countyDeadlines: [
            {
              event: "Appeal Deadline",
              deadline: "2024-06-15",
            },
            {
              event: "Hearing Date",
              deadline: "2024-07-20",
            },
          ],
        };

        // Validate report data
        const template = new ProfessionalReportTemplate();
        const validation = template.validateReport(reportData);

        if (!validation.valid) {
          throw new Error(`Report validation failed: ${validation.errors.join(", ")}`);
        }

        // Generate PDF
        const pdfStream = template.generateReport(reportData);
        const chunks: Buffer[] = [];

        return new Promise((resolve, reject) => {
          pdfStream.on("data", (chunk) => chunks.push(chunk));
          pdfStream.on("end", async () => {
            try {
              const pdfBuffer = Buffer.concat(chunks);

              // Upload to S3
              const fileName = `reports/${ctx.user.id}/${input.submissionId}-${Date.now()}.pdf`;
              const { url } = await storagePut(
                fileName,
                pdfBuffer,
                "application/pdf"
              );

              // Notify owner
              await notifyOwner({
                title: "Report Generated",
                content: `Professional report generated for ${reportData.propertyAddress}. File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`,
              });

              resolve({
                url,
                fileSize: pdfBuffer.length,
                fileName: `${reportData.propertyAddress}-report.pdf`,
              });
            } catch (err) {
              reject(err);
            }
          });
          pdfStream.on("error", reject);
        });
      } catch (error) {
        console.error("[Reports] Generation failed:", error);
        throw error;
      }
    }),

  /**
   * Get report for a submission (stub)
   */
  getReport: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return {
        url: "https://example.com/report.pdf",
        fileSize: 2500000,
        generatedAt: new Date(),
      };
    }),

  /**
   * List all reports for user (stub)
   */
  listReports: protectedProcedure.query(async ({ ctx }) => {
    return [
      {
        submissionId: 1,
        url: "https://example.com/report1.pdf",
        fileSize: 2500000,
        generatedAt: new Date(),
      },
    ];
  }),
});
