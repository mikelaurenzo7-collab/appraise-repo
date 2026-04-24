/**
 * Filing job queue — DB-backed, polling-style workflow that picks up
 * pending filing jobs and hands them to the delivery dispatcher.
 *
 * The queue is channel-agnostic: it updates lifecycle state (pending →
 * processing → completed | failed) and persists whichever channel-
 * specific artifacts the dispatcher returned. Which channel actually
 * ran (portal / certified mail / first-class mail / email) is decided
 * inside deliveryDispatcher.ts based on the county's configuration.
 */

import {
  createFilingJob,
  getFilingJobById,
  listPendingFilingJobs,
  updateFilingJob,
  persistActivityLog,
  getScrivenerAuthorizationById,
  getCountyById,
  getPropertySubmissionById,
  updatePropertySubmission,
} from "../db";
import { buildAppUrl } from "../_core/appUrl";
import { sendFilingSubmittedEmail } from "../_core/emailService";
import { storagePut } from "../storage";
import { dispatchFiling, resolveChannel } from "./deliveryDispatcher";

export type QueuedFilingJob = {
  jobId: number;
  submissionId: number;
};

export interface QueueFilingOptions {
  submissionId: number;
  userId: number;
  countyId: number;
  /**
   * Optional recipeId to pin. If omitted the dispatcher picks the active
   * recipe at run time. We still record it at queue time so we know
   * which recipe version was current when the user authorized the job.
   */
  recipeId?: number;
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
    recipeId: options.recipeId ?? null,
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
    metadata: JSON.stringify({ jobId: job.id, recipeId: options.recipeId ?? null }),
    status: "success",
  });
  return { jobId: job.id, submissionId: options.submissionId };
}

/**
 * Process a single pending job. Returns true if a job was processed.
 */
export async function processOnePendingJob(): Promise<boolean> {
  const pending = await listPendingFilingJobs(1);
  if (pending.length === 0) return false;
  const job = pending[0];
  const row = await getFilingJobById(job.id);
  if (!row) return false;

  await updateFilingJob(row.id, {
    status: "processing",
    startedAt: new Date(),
  });

  const auth = await getScrivenerAuthorizationById(row.authorizationId);
  if (!auth || auth.submissionId !== row.submissionId) {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: "Scrivener authorization missing or mismatched",
      completedAt: new Date(),
    });
    return true;
  }

  const submission = await getPropertySubmissionById(row.submissionId);
  if (!submission) {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: "Submission not found",
      completedAt: new Date(),
    });
    return true;
  }

  // Resolve the county. Filings are queued with the taxpayer's chosen
  // county ID; fall back to looking it up via the county name on the
  // submission if no county_id was stored directly.
  const countyId = await resolveCountyIdForJob(row);
  if (!countyId) {
    await updateFilingJob(row.id, {
      status: "failed",
      errorMessage: "No county could be associated with this filing",
      completedAt: new Date(),
    });
    return true;
  }

  const perRunInputs: Record<string, string | number | null> = row.inputs
    ? (JSON.parse(row.inputs) as Record<string, string | number | null>)
    : {};

  try {
    // Resolve the channel once for logging, then dispatch.
    const county = await getCountyById(countyId);
    const channel = county ? await resolveChannel(county) : "unsupported";

    if (channel === "unsupported") {
      await updateFilingJob(row.id, {
        status: "failed",
        errorMessage: "County is not supported for automated filing",
        completedAt: new Date(),
      });
      return true;
    }

    const dispatchResult = await dispatchFiling({
      job: row,
      countyId,
      perRunInputs,
    });

    // Persist channel-specific artifacts.
    const updates: Parameters<typeof updateFilingJob>[1] = {
      status: dispatchResult.success ? "completed" : "failed",
      completedAt: new Date(),
      deliveryChannel: dispatchResult.channelUsed,
      errorMessage: dispatchResult.errorMessage,
      // Always wipe the per-run inputs when we're done (PIN, account #).
      inputs: null,
    };

    // Portal artifacts — screenshot + execution log to S3.
    if (dispatchResult.portalConfirmationNumber) {
      updates.portalConfirmationNumber = dispatchResult.portalConfirmationNumber;
    }
    if (dispatchResult.portalScreenshot) {
      const key = `filings/${row.submissionId}/${row.id}-confirmation.png`;
      const { key: storedKey } = await storagePut(
        key,
        dispatchResult.portalScreenshot,
        "image/png"
      );
      updates.finalScreenshotKey = storedKey;
    }
    if (dispatchResult.portalExecutionLog) {
      const logKey = `filings/${row.submissionId}/${row.id}-log.json`;
      const { key: storedLogKey } = await storagePut(
        logKey,
        Buffer.from(JSON.stringify(dispatchResult.portalExecutionLog, null, 2)),
        "application/json"
      );
      updates.executionLogKey = storedLogKey;
    }

    // Mail artifacts.
    if (dispatchResult.mailTrackingNumber) {
      updates.mailTrackingNumber = dispatchResult.mailTrackingNumber;
    }
    if (dispatchResult.lobLetterId) {
      updates.lobLetterId = dispatchResult.lobLetterId;
    }
    if (dispatchResult.lobExpectedDeliveryDate) {
      updates.lobExpectedDeliveryDate = dispatchResult.lobExpectedDeliveryDate;
    }

    // Email artifacts.
    if (dispatchResult.emailMessageId) {
      updates.emailMessageId = dispatchResult.emailMessageId;
    }
    if (dispatchResult.emailRecipient) {
      updates.emailRecipient = dispatchResult.emailRecipient;
    }

    await updateFilingJob(row.id, updates);

    await persistActivityLog({
      submissionId: row.submissionId,
      type: dispatchResult.success ? "filing_succeeded" : "filing_failed",
      actor: "system",
      description: dispatchResult.success
        ? `Filing #${row.id} delivered via ${dispatchResult.channelUsed}`
        : `Filing #${row.id} failed (${dispatchResult.channelUsed}): ${dispatchResult.errorMessage ?? "unknown error"}`,
      metadata: JSON.stringify({
        jobId: row.id,
        channel: dispatchResult.channelUsed,
        trackingNumber: dispatchResult.mailTrackingNumber,
        confirmationNumber: dispatchResult.portalConfirmationNumber,
        messageId: dispatchResult.emailMessageId,
      }),
      status: dispatchResult.success ? "success" : "error",
    });

    // On successful dispatch: (1) update the property submission's
    // pipeline status so the user dashboard reflects the filing, and
    // (2) send the confirmation email with the tracking artifact.
    if (dispatchResult.success) {
      await updatePropertySubmission(row.submissionId, { status: "appeal-filed" }).catch(
        (err) => console.error("[FilingQueue] Failed to update submission status:", err)
      );
      try {
        await sendFilingSubmittedEmail({
          userEmail: submission.email,
          userName: submission.email.split("@")[0],
          propertyAddress: [submission.address, submission.city, submission.state]
            .filter(Boolean)
            .join(", "),
          countyName: county?.countyName ?? "your county",
          deliveryChannel: dispatchResult.channelUsed,
          portalConfirmationNumber: dispatchResult.portalConfirmationNumber,
          mailTrackingNumber: dispatchResult.mailTrackingNumber,
          expectedDeliveryDate: dispatchResult.lobExpectedDeliveryDate
            ? dispatchResult.lobExpectedDeliveryDate.toISOString()
            : null,
          emailRecipient: dispatchResult.emailRecipient,
          dashboardUrl: buildAppUrl("/dashboard"),
        });
      } catch (err) {
        console.error("[FilingQueue] Failed to send filing confirmation email:", err);
      }
    }

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateFilingJob(row.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: message,
    });
    return true;
  }
}

/**
 * Try hard to associate a filing job with a county ID. Current flow
 * records the countyId on the job's activity-log metadata; we fall back
 * to a best-effort lookup if needed.
 */
async function resolveCountyIdForJob(row: { id: number; submissionId: number; recipeId: number | null }): Promise<number | null> {
  // Case 1: job pinned a recipeId — load the recipe row to get its county.
  if (row.recipeId) {
    const dbHelpers = await import("../db");
    const dbInstance = await dbHelpers.getDb();
    if (dbInstance) {
      const { filingRecipes } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const recipe = await dbInstance
        .select()
        .from(filingRecipes)
        .where(eq(filingRecipes.id, row.recipeId))
        .limit(1)
        .then((r: any) => r[0]);
      if (recipe?.countyId) return recipe.countyId as number;
    }
  }

  // Case 2: look it up by submission.county + state.
  const dbHelpers = await import("../db");
  const submission = await dbHelpers.getPropertySubmissionById(row.submissionId);
  if (submission?.county && submission.state) {
    const dbInstance = await dbHelpers.getDb();
    if (dbInstance) {
      const { counties } = await import("../../drizzle/schema");
      const { and, eq } = await import("drizzle-orm");
      const match = await dbInstance
        .select()
        .from(counties)
        .where(and(eq(counties.state, submission.state), eq(counties.countyName, submission.county)))
        .limit(1)
        .then((r: any) => r[0]);
      if (match?.id) return match.id as number;
    }
  }

  return null;
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
