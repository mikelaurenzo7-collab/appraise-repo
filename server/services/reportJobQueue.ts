/**
 * Report Job Queue — Async PDF generation with 24-hour SLA
 * Handles background report generation with retry logic and email notifications
 */

import {
  generateAppraisalPDF,
  type AppraisalReportData,
  type AdjustmentGridEntry,
  type CostApproachData,
  type IncomeApproachSummary,
  type MarketTrendData,
} from "./pdfGenerator";
import { generateEnhancedReportNarrative } from "./pdfReportGenerator";
import {
  getReportJobById,
  updateReportJob,
  listPendingReportJobs,
  createReportJob,
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  persistActivityLog,
  getSubmissionPhotos,
  getLatestPhotoAnalysis,
} from "../db";
import { buildAppUrl } from "../_core/appUrl";
import { sendAnalysisConfirmationEmail, sendReportCompletionEmail, sendReportFailedEmail } from "../_core/emailService";
import { safeJsonParse } from "../_core/safeJson";

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

    // On Vercel serverless we cannot fire-and-forget — the function exits
    // before the PDF generator finishes. The cron task `process-reports`
    // will pick it up within ~30s. On long-running runtimes (local dev /
    // self-host) we still kick off in-process processing for snappiness.
    if (process.env.VERCEL !== "1") {
      processReportJobAsync(job.id).catch((err) => {
        console.error(`[ReportQueue] Unhandled error in async processing:`, err);
      });
    }

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

    const photos = await getSubmissionPhotos(job.submissionId);

    // Prepare report data — every JSON parse is guarded so a single
    // corrupt or schema-evolved DB row can't crash the whole job. The
    // safeJsonParse helper logs the failure with a scope tag so the
    // underlying corruption is still tracked down.
    const comparableSales = safeJsonParse<NonNullable<AppraisalReportData["comparableSales"]>>(
      analysis.comparableSales, [], "reportJobQueue.comparableSales",
    );
    const appealStrengthFactors = safeJsonParse<string[]>(
      analysis.appealStrengthFactors, [], "reportJobQueue.appealStrengthFactors",
    );
    const photoAnalysis = await getLatestPhotoAnalysis(job.submissionId);
    // Parse new analysis columns (JSON stored as text)
    const adjustmentGrid = safeJsonParse<AdjustmentGridEntry[] | undefined>(
      analysis.adjustmentGrid, undefined, "reportJobQueue.adjustmentGrid",
    );
    const costApproachData = safeJsonParse<CostApproachData | undefined>(
      analysis.costApproachData, undefined, "reportJobQueue.costApproachData",
    );
    const incomeApproachData = safeJsonParse<IncomeApproachSummary | undefined>(
      analysis.incomeApproachData, undefined, "reportJobQueue.incomeApproachData",
    );
    const marketTrendData = safeJsonParse<MarketTrendData | undefined>(
      analysis.marketTrendData, undefined, "reportJobQueue.marketTrendData",
    );

    // Three-grounds persuasion package — unpacked from scenarioContext JSON
    // (analysisJob.ts persists it there to avoid a schema migration). When
    // present, the PDF renderer uses these to (a) show a 60-second summary
    // of grounds, (b) replace the synthetic uniformity calc with real peer-
    // ratio data, and (c) render a Record Card Discrepancy Analysis section.
    const scenarioCtx = safeJsonParse<{
      uniformity?: NonNullable<AppraisalReportData["uniformityResult"]>;
      recordErrors?: NonNullable<AppraisalReportData["recordErrors"]>;
      persuasionBrief?: NonNullable<AppraisalReportData["persuasionBrief"]>;
    }>(analysis.scenarioContext, {}, "reportJobQueue.scenarioContext");
    const uniformityResult = scenarioCtx.uniformity;
    const recordErrors = scenarioCtx.recordErrors;
    const persuasionBrief = scenarioCtx.persuasionBrief;
    // Determine report tier from filingMethod
    const tier = submission.filingMethod === "none" ? "free" : (submission.filingMethod || "free");

    // Try to upgrade the narrative with Claude Opus 4.7 (streaming + cached
    // USPAP template). Falls back to the analysis JSON's existing narrative
    // when Claude is unavailable or fails — never blocks PDF generation.
    let enrichedJustification = analysis.valuationJustification ?? undefined;
    try {
      const narrative = await generateEnhancedReportNarrative({
        submission,
        analysis,
        comparableSales: comparableSales.map((c: { address: string; salePrice: number; saleDate: string; squareFeet?: number; sqft?: number; pricePerSqft?: number }) => ({
          address: c.address,
          salePrice: c.salePrice,
          saleDate: c.saleDate,
          sqft: c.squareFeet ?? c.sqft ?? 0,
          pricePerSqft: c.pricePerSqft ?? (c.squareFeet || c.sqft ? Math.round(c.salePrice / (c.squareFeet ?? c.sqft ?? 1)) : 0),
        })),
        appealStrengthFactors,
        nextSteps: safeJsonParse<string[]>(analysis.nextSteps, [], "reportJobQueue.nextSteps"),
      });
      if (narrative) {
        const sections = [
          narrative.valuationMethodology,
          narrative.comparableSalesNarrative,
          narrative.conditionAdjustmentNarrative,
          narrative.conclusionAndRecommendation,
        ].filter(Boolean);
        if (sections.length > 0) {
          enrichedJustification = sections.join("\n\n");
          console.log(`[ReportQueue] Job ${jobId} narrative enriched via Claude (${enrichedJustification.length} chars)`);
        }
      }
    } catch (err) {
      console.warn(`[ReportQueue] Job ${jobId} narrative enrichment skipped:`, (err as Error).message);
    }

    const reportData: AppraisalReportData = {
      submissionId: job.submissionId,
      // The PDF emitted by this queue is the formal exhibit owners attach
      // to their appeal filing — assessor-facing by design. Owner-only
      // content (appeal-strength score, savings line, Tax Impact
      // Analysis section, etc.) stays on the /analysis dashboard.
      reportAudience: "assessor",
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
      valuationJustification: enrichedJustification,
      recommendedApproach: analysis.recommendedApproach ?? undefined,
      filingMethod: submission.filingMethod ?? undefined,
      appealDeadline: submission.appealDeadline
        ? submission.appealDeadline.toISOString().split("T")[0]
        : undefined,
      comparableSales,
      adjustmentGrid,
      costApproach: costApproachData,
      incomeApproach: incomeApproachData,
      marketTrend: marketTrendData,
      reconciliationNarrative: analysis.reconciliationNarrative ?? undefined,
      tier,
      squareFeet: submission.squareFeet ?? undefined,
      yearBuilt: submission.yearBuilt ?? undefined,
      bedrooms: submission.bedrooms ?? undefined,
      bathrooms: submission.bathrooms ?? undefined,
      lotSize: submission.lotSize ?? undefined,
      streetViewUrl: submission.streetViewUrl ?? undefined,
      satelliteImageUrl: submission.satelliteUrl ?? undefined,
      roadmapUrl: submission.roadmapUrl ?? undefined,
      photos: photos.map(p => ({ url: p.url, category: p.category, caption: p.caption })),
      photoFindings: photoAnalysis
        ? {
            overallConditionScore: photoAnalysis.overallConditionScore,
            overallEvidenceStrength: photoAnalysis.overallEvidenceStrength,
            summaryParagraph:
              `Visual inspection of ${photoAnalysis.photoCount} owner-submitted photograph${photoAnalysis.photoCount === 1 ? "" : "s"} indicates a composite condition index of ${photoAnalysis.overallConditionScore}/100. These observations supplement the comparable-sales analysis and are descriptive in nature.`,
            topObservations: photoAnalysis.topObservations,
            topValueIssues: photoAnalysis.topValueIssues,
          }
        : undefined,
      // Three-grounds persuasion package — only renders when present.
      uniformityResult,
      recordErrors,
      persuasionBrief,
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

      const downloadPageUrl = buildAppUrl(`/report?jobId=${jobId}`);

      await sendReportCompletionEmail({
        userEmail: submission.email,
        userName: submission.email.split("@")[0],
        propertyAddress: submission.address,
        reportUrl: url,
        downloadPageUrl,
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
      // Exponential backoff with jitter — prevents thundering-herd retries
      // from hammering S3 / the PDF generator during transient failures.
      // Cap at 30s so retries don't lag past the 24h job SLA.
      const backoffMs = Math.min(1000 * Math.pow(2, job.retryCount), 30_000);
      const jitterMs = Math.random() * 1000;
      const delayMs = backoffMs + jitterMs;

      await updateReportJob(jobId, {
        status: "queued",
        retryCount: job.retryCount + 1,
        errorMessage: errMsg,
      });
      console.log(`[ReportQueue] Job ${jobId} retry ${job.retryCount + 2}/${job.maxRetries + 1} in ${Math.round(delayMs)}ms`);

      setTimeout(() => {
        processReportJobAsync(jobId).catch((err) => {
          console.error(`[ReportQueue] Retry error:`, err);
        });
      }, delayMs);
    } else {
      // Final failure — exhausted retries.
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

      // Notify the paid-tier customer — closes the silent-failure gap
      // where a customer waits for their PDF and only discovers the
      // failure by checking the dashboard. Best-effort; we already failed
      // the job so an email-send error shouldn't compound things.
      if (job?.submissionId) {
        try {
          const submission = await getPropertySubmissionById(job.submissionId);
          if (submission?.email) {
            const totalAttempts = (job.maxRetries ?? 0) + 1;
            await sendReportFailedEmail({
              userEmail: submission.email,
              userName: submission.email.split("@")[0],
              propertyAddress: submission.address,
              attemptsMade: totalAttempts,
              failureReason: errMsg,
              dashboardUrl: buildAppUrl(`/analysis?id=${job.submissionId}`),
            });
          }
        } catch (emailErr) {
          console.error(
            `[ReportQueue] CRITICAL: report job ${jobId} failed AND failure email failed to send. ` +
            `Original error: ${errMsg}. Email error: ${(emailErr as Error).message}`,
          );
        }
      }
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
