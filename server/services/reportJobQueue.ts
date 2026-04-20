/**
 * Report Job Queue — Async PDF generation with 24-hour SLA
 * Handles background report generation with retry logic and email notifications
 */

import { generateAppraisalPDF, type AppraisalReportData } from "./pdfGenerator";
import {
  getReportJobById,
  updateReportJob,
  listPendingReportJobs,
  createReportJob,
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  persistActivityLog,
} from "../db";
import { sendAnalysisConfirmationEmail, sendReportCompletionEmail } from "../_core/emailService";

// Prevent duplicate concurrent jobs
const activeJobs = new Set<number>();

/**
 * Queue a report generation job
 * Returns immediately with jobId for polling
 */
export async function queueReportGeneration(
  submissionId: number,
  userId: number
): Promise<{ jobId: number; status: string }> {
  try {
    // Create job record with 24-hour expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const job = await createReportJob({
      submissionId,
      userId,
      status: "queued",
      expiresAt,
      retryCount: 0,
      maxRetries: 3,
    });

    if (!job) throw new Error("Failed to create report job");

    console.log(`[ReportQueue] Job queued: #${job.id} for submission #${submissionId}`);

    // Queue background processing (non-blocking)
    processReportJobAsync(job.id).catch((err) => {
      console.error(`[ReportQueue] Unhandled error in async processing:`, err);
    });

    return {
      jobId: job.id,
      status: "queued",
    };
  } catch (error) {
    console.error(`[ReportQueue] Failed to queue report:`, error);
    throw error;
  }
}

/**
 * Process a single report job (background task)
 */
async function processReportJobAsync(jobId: number): Promise<void> {
  if (activeJobs.has(jobId)) {
    console.log(`[ReportQueue] Job ${jobId} already processing — skipping duplicate`);
    return;
  }

  activeJobs.add(jobId);
  const startTime = Date.now();

  try {
    const job = await getReportJobById(jobId);
    if (!job) {
      console.error(`[ReportQueue] Job ${jobId} not found`);
      return;
    }

    // Check if job has expired
    if (new Date() > job.expiresAt) {
      await updateReportJob(jobId, { status: "expired" });
      console.warn(`[ReportQueue] Job ${jobId} expired before processing`);
      return;
    }

    // Mark as generating
    await updateReportJob(jobId, { status: "generating", startedAt: new Date() });

    // Fetch submission and analysis
    const submission = await getPropertySubmissionById(job.submissionId);
    if (!submission) throw new Error("Submission not found");

    const analysis = await getPropertyAnalysisBySubmissionId(job.submissionId);
    if (!analysis) throw new Error("Analysis not found");

    // Prepare report data
    const comparableSales = analysis.comparableSales ? JSON.parse(analysis.comparableSales) : [];
    const reportData: AppraisalReportData = {
      submissionId: job.submissionId,
      address: submission.address,
      city: submission.city ?? undefined,
      state: submission.state ?? undefined,
      zipCode: submission.zipCode ?? undefined,
      county: submission.county ?? undefined,
      propertyType: submission.propertyType ?? undefined,
      ownerEmail: submission.email ?? undefined,
      assessedValue: submission.assessedValue ?? undefined,
      marketValueEstimate: submission.marketValue ?? undefined,
      assessmentGap: submission.assessedValue && submission.marketValue
        ? submission.assessedValue - submission.marketValue
        : undefined,
      potentialSavings: submission.potentialSavings ?? undefined,
      appealStrengthScore: submission.appealStrengthScore ?? undefined,
      executiveSummary: analysis.executiveSummary ?? undefined,
      valuationJustification: analysis.valuationJustification ?? undefined,
      recommendedApproach: analysis.recommendedApproach ?? undefined,
      nextSteps: analysis.nextSteps ?? undefined,
      filingMethod: submission.filingMethod ?? undefined,
      appealDeadline: submission.appealDeadline
        ? submission.appealDeadline.toISOString().split("T")[0]
        : undefined,
      comparableSales,
      squareFeet: submission.squareFeet ?? undefined,
      yearBuilt: submission.yearBuilt ?? undefined,
      bedrooms: submission.bedrooms ?? undefined,
      bathrooms: submission.bathrooms ?? undefined,
      lotSize: submission.lotSize ?? undefined,
    };

    // Generate PDF
    const { url, key, sizeBytes } = await generateAppraisalPDF(reportData);

    // Update job with success
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startTime;

    await updateReportJob(jobId, {
      status: "completed",
      reportUrl: url,
      reportKey: key,
      sizeBytes,
      completedAt,
    });

    // Log activity
    await persistActivityLog({
      submissionId: job.submissionId,
      type: "report_generated_async",
      actor: "system",
      description: `Async report generated in ${(durationMs / 1000).toFixed(1)}s — ${sizeBytes} bytes`,
      metadata: JSON.stringify({ jobId, reportUrl: url, reportKey: key, sizeBytes, durationMs }),
      status: "success",
      durationMs,
    });

    // Send email notification with report download link
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      const expiresAtStr = expiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      await sendReportCompletionEmail({
        userEmail: submission.email,
        userName: submission.email.split("@")[0],
        propertyAddress: submission.address,
        reportUrl: url,
        appealStrengthScore: submission.appealStrengthScore || 0,
        downloadExpiresAt: expiresAtStr,
      });
    } catch (emailErr) {
      console.warn(`[ReportQueue] Failed to send email for job ${jobId}:`, emailErr);
    }

    console.log(`[ReportQueue] ✓ Job ${jobId} completed in ${(durationMs / 1000).toFixed(1)}s`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ReportQueue] ✗ Job ${jobId} failed:`, errMsg);

    const job = await getReportJobById(jobId);
    if (job && job.retryCount < job.maxRetries) {
      // Retry
      await updateReportJob(jobId, {
        status: "queued",
        retryCount: job.retryCount + 1,
        errorMessage: errMsg,
      });
      console.log(`[ReportQueue] Job ${jobId} queued for retry (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
    } else {
      // Final failure
      await updateReportJob(jobId, {
        status: "failed",
        errorMessage: errMsg,
      });

      await persistActivityLog({
        submissionId: job?.submissionId || 0,
        type: "report_generation_failed",
        actor: "system",
        description: `Report generation failed: ${errMsg}`,
        metadata: JSON.stringify({ jobId, error: errMsg }),
        status: "error",
        durationMs: Date.now() - startTime,
      }).catch(() => {});
    }
  } finally {
    activeJobs.delete(jobId);
  }
}

/**
 * Process all pending report jobs (call periodically from server startup)
 */
export async function processPendingReportJobs(limit = 5): Promise<number> {
  try {
    const jobs = await listPendingReportJobs(limit);
    console.log(`[ReportQueue] Processing ${jobs.length} pending jobs...`);

    let processed = 0;
    for (const job of jobs) {
      if (!activeJobs.has(job.id)) {
        processReportJobAsync(job.id).catch((err) => {
          console.error(`[ReportQueue] Error processing job ${job.id}:`, err);
        });
        processed++;
      }
    }

    return processed;
  } catch (error) {
    console.error(`[ReportQueue] Failed to process pending jobs:`, error);
    return 0;
  }
}
