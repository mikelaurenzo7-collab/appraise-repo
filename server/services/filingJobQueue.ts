/**
 * Filing job queue — DB-backed, polling-style workflow that picks up
 * pending filing jobs and runs them through the Playwright executor.
 *
 * The queue mirrors reportJobQueue.ts. On a production deployment the
 * processor should run in a dedicated worker process (one container, one
 * browser) so concurrent filings do not fight for Chromium resources.
 */

import {
  createFilingJob,
  getFilingJobById,
  getActiveRecipeForCounty,
  listPendingFilingJobs,
  updateFilingJob,
  persistActivityLog,
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  getReportJobBySubmissionId,
  getScrivenerAuthorizationById,
} from "../db";
import { storagePut, storageGet } from "../storage";
import {
  parseRecipe,
  planRecipe,
  type Recipe,
  type RecipeInputs,
  RecipeInputError,
} from "./filingRecipeEngine";

export type QueuedFilingJob = {
  jobId: number;
  submissionId: number;
};

export interface QueueFilingOptions {
  submissionId: number;
  userId: number;
  countyId: number;
  recipeId: number;
  authorizationId: number;
  /**
   * User-provided inputs for the recipe (account number, taxpayer PIN, etc).
   * Stored as JSON on the job row; cleared when the job completes.
   */
  inputs: Record<string, string | number | null>;
}

export async function queueFilingJob(options: QueueFilingOptions): Promise<QueuedFilingJob> {
  const job = await createFilingJob({
    submissionId: options.submissionId,
    userId: options.userId,
    recipeId: options.recipeId,
    authorizationId: options.authorizationId,
    status: "pending",
    inputs: JSON.stringify(options.inputs),
  });
  if (!job) throw new Error("Failed to enqueue filing job");
  await persistActivityLog({
    submissionId: options.submissionId,
    type: "filing_queued",
    actor: "user",
    actorId: options.userId,
    description: `Filing job #${job.id} queued for county ${options.countyId}`,
    metadata: JSON.stringify({ jobId: job.id, recipeId: options.recipeId }),
    status: "success",
  });
  return { jobId: job.id, submissionId: options.submissionId };
}

/**
 * Build the RecipeInputs object by merging:
 *   - the submission and analysis rows from the database
 *   - the per-run inputs the user provided (PIN, account number, etc.)
 */
async function buildRecipeInputs(
  submissionId: number,
  perRunInputs: Record<string, string | number | null>
): Promise<{
  inputs: RecipeInputs;
  reportPdfBuffer: Buffer | null;
  reportPdfFilename: string | null;
}> {
  const submission = await getPropertySubmissionById(submissionId);
  if (!submission) throw new Error(`Submission ${submissionId} not found`);
  const analysis = await getPropertyAnalysisBySubmissionId(submissionId);
  const reportJob = await getReportJobBySubmissionId(submissionId);

  let reportPdfBuffer: Buffer | null = null;
  let reportPdfFilename: string | null = null;
  let reportPdfUrl: string | null = null;

  if (reportJob?.reportKey) {
    try {
      const { url } = await storageGet(reportJob.reportKey);
      reportPdfUrl = url;
      // Fetch the PDF so the executor can upload it to the portal.
      const resp = await fetch(url);
      if (resp.ok) {
        reportPdfBuffer = Buffer.from(await resp.arrayBuffer());
        reportPdfFilename = `AppraiseAI-Report-${submission.id}.pdf`;
      }
    } catch (err) {
      console.warn("[FilingQueue] Could not fetch report PDF:", err);
    }
  }

  const inputs: RecipeInputs = {
    user: {
      ownerEmail: submission.email,
      ownerName: (perRunInputs.ownerName as string | undefined) ?? submission.email?.split("@")[0],
      address: submission.address,
      city: submission.city ?? undefined,
      state: submission.state ?? undefined,
      zip: submission.zipCode ?? undefined,
      accountNumber: perRunInputs.accountNumber as string | undefined,
      taxpayerPin: perRunInputs.taxpayerPin as string | undefined,
    },
    analysis: {
      marketValueEstimate: analysis?.marketValueEstimate ?? submission.marketValue ?? undefined,
      assessmentGap: analysis?.assessmentGap ?? undefined,
      appealStrengthScore: submission.appealStrengthScore ?? undefined,
    },
    submission: {
      assessedValue: submission.assessedValue ?? undefined,
      propertyType: submission.propertyType ?? undefined,
      squareFeet: submission.squareFeet ?? undefined,
      yearBuilt: submission.yearBuilt ?? undefined,
    },
    report: {
      pdfUrl: reportPdfUrl,
    },
  };

  return { inputs, reportPdfBuffer, reportPdfFilename };
}

/**
 * Process a single pending job. Returns true if a job was processed.
 */
export async function processOnePendingJob(): Promise<boolean> {
  const pending = await listPendingFilingJobs(1);
  if (pending.length === 0) return false;
  const job = pending[0];

  const recipe = await getActiveRecipeForCounty(/* countyId derived below */ 0);
  // Re-load by the specific recipeId actually tied to the job so we honor
  // the pinned version even if a newer recipe was activated since queuing.
  const row = await getFilingJobById(job.id);
  if (!row) return false;

  await updateFilingJob(row.id, {
    status: "processing",
    startedAt: new Date(),
  });

  // Load authorization (must exist and match submission).
  const auth = await getScrivenerAuthorizationById(row.authorizationId);
  if (!auth || auth.submissionId !== row.submissionId) {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: "Scrivener authorization missing or mismatched",
      completedAt: new Date(),
    });
    return true;
  }

  // Load recipe from the pinned recipeId. We shortcut and re-query the
  // active recipe for the county if the pinned recipe is no longer active.
  const dbHelpers = await import("../db");
  const dbInstance = await dbHelpers.getDb();
  let recipeRow: any = null;
  if (dbInstance) {
    const { filingRecipes } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    recipeRow = await dbInstance.select().from(filingRecipes).where(eq(filingRecipes.id, row.recipeId)).limit(1).then((r: any) => r[0]);
  }
  if (!recipeRow) {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: "Recipe not found",
      completedAt: new Date(),
    });
    return true;
  }
  if (recipeRow.verificationStatus === "draft" && process.env.ALLOW_DRAFT_RECIPES !== "1") {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: "Refused to run draft recipe in production. Set ALLOW_DRAFT_RECIPES=1 to override (staging only).",
      completedAt: new Date(),
    });
    return true;
  }

  let recipeParsed: Recipe;
  try {
    recipeParsed = parseRecipe(recipeRow.steps);
    recipeParsed.portalUrl = recipeRow.portalUrl;
    recipeParsed.countyId = recipeRow.countyId;
    recipeParsed.version = recipeRow.version;
  } catch (err) {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "Recipe parse failed",
      completedAt: new Date(),
    });
    return true;
  }

  const perRunInputs = row.inputs ? (JSON.parse(row.inputs) as Record<string, string | number | null>) : {};
  let planned;
  try {
    const built = await buildRecipeInputs(row.submissionId, perRunInputs);
    planned = planRecipe(recipeParsed, built.inputs);
    // Executor is loaded lazily.
    const { executeRecipe } = await import("./playwrightExecutor");
    const result = await executeRecipe(planned.steps, {
      reportPdfBuffer: built.reportPdfBuffer ?? undefined,
      reportPdfFilename: built.reportPdfFilename ?? undefined,
    });
    let screenshotKey: string | undefined;
    if (result.finalScreenshot) {
      const key = `filings/${row.submissionId}/${row.id}-confirmation.png`;
      const { key: storedKey } = await storagePut(key, result.finalScreenshot, "image/png");
      screenshotKey = storedKey;
    }
    const logKey = `filings/${row.submissionId}/${row.id}-log.json`;
    const { key: storedLogKey } = await storagePut(
      logKey,
      Buffer.from(JSON.stringify(result.executionLog, null, 2)),
      "application/json"
    );

    await updateFilingJob(row.id, {
      status: result.success ? "completed" : "failed",
      completedAt: new Date(),
      portalConfirmationNumber: result.portalConfirmationNumber,
      finalScreenshotKey: screenshotKey,
      executionLogKey: storedLogKey,
      errorMessage: result.errorMessage,
      // Wipe inputs so any PIN/account number is gone after the run.
      inputs: null,
    });

    await persistActivityLog({
      submissionId: row.submissionId,
      type: result.success ? "filing_succeeded" : "filing_failed",
      actor: "system",
      description: result.success
        ? `Filing #${row.id} submitted successfully`
        : `Filing #${row.id} failed: ${result.errorMessage}`,
      metadata: JSON.stringify({
        jobId: row.id,
        confirmationNumber: result.portalConfirmationNumber,
      }),
      status: result.success ? "success" : "error",
    });
    return true;
  } catch (err) {
    const message =
      err instanceof RecipeInputError
        ? `Missing required taxpayer input: ${err.missingField}`
        : err instanceof Error
          ? err.message
          : String(err);
    await updateFilingJob(row.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: message,
    });
    return true;
  }
}

export async function processPendingFilingJobs(max = 2): Promise<number> {
  let processed = 0;
  for (let i = 0; i < max; i++) {
    const did = await processOnePendingJob();
    if (!did) break;
    processed += 1;
  }
  return processed;
}
