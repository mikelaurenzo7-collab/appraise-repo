/**
 * Filing artifact cleanup.
 *
 * Portal screenshots, execution logs, and mail PDFs accumulate in S3
 * forever by default. We set a 365-day retention window (adjustable
 * via FILING_ARTIFACT_RETENTION_DAYS) and run daily to delete S3
 * objects older than that. The filing_jobs row itself is retained for
 * audit — only the artifact keys are nulled and the blobs removed.
 *
 * Why not just set an S3 bucket lifecycle rule?  We could, and in
 * production you should — but this app-level sweeper keeps retention
 * portable across storage providers and lets us log every deletion in
 * the activity_logs audit trail for compliance reviews.
 */

import { and, isNotNull, lt, or, sql } from "drizzle-orm";
import { filingJobs } from "../../drizzle/schema";
import { getDb, persistActivityLog } from "../db";
import { storageDelete } from "../storage";

const DEFAULT_RETENTION_DAYS = 365;

export interface CleanupResult {
  scanned: number;
  artifactsDeleted: number;
  errors: number;
}

export async function cleanupExpiredFilingArtifacts(opts: {
  retentionDays?: number;
  limit?: number;
} = {}): Promise<CleanupResult> {
  const result: CleanupResult = { scanned: 0, artifactsDeleted: 0, errors: 0 };
  const retentionDays =
    opts.retentionDays ??
    Number(process.env.FILING_ARTIFACT_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
  const limit = opts.limit ?? 100;
  const db = await getDb();
  if (!db) return result;

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  let rows: Array<typeof filingJobs.$inferSelect>;
  try {
    rows = await db
      .select()
      .from(filingJobs)
      .where(
        and(
          or(
            isNotNull(filingJobs.finalScreenshotKey),
            isNotNull(filingJobs.executionLogKey)
          ),
          lt(filingJobs.completedAt, cutoff)
        )
      )
      .limit(limit);
  } catch (err) {
    console.error("[FilingCleanup] Failed to query", err);
    return result;
  }

  for (const row of rows) {
    result.scanned += 1;
    const keysToDelete: string[] = [];
    if (row.finalScreenshotKey) keysToDelete.push(row.finalScreenshotKey);
    if (row.executionLogKey) keysToDelete.push(row.executionLogKey);

    for (const key of keysToDelete) {
      try {
        const ok = await storageDelete(key);
        if (ok) result.artifactsDeleted += 1;
        else result.errors += 1;
      } catch {
        result.errors += 1;
      }
    }

    try {
      await db
        .update(filingJobs)
        .set({
          finalScreenshotKey: null,
          executionLogKey: null,
        })
        .where(sql`${filingJobs.id} = ${row.id}`);
      await persistActivityLog({
        submissionId: row.submissionId,
        type: "filing_artifacts_cleaned",
        actor: "system",
        description: `Filing #${row.id} artifacts purged (retention ${retentionDays}d)`,
        metadata: JSON.stringify({
          jobId: row.id,
          deletedKeys: keysToDelete,
        }),
        status: "success",
      });
    } catch (err) {
      console.error(`[FilingCleanup] Failed to clear keys for filing ${row.id}`, err);
      result.errors += 1;
    }
  }

  return result;
}

export function buildCleanupInterval(intervalMs: number = 24 * 60 * 60 * 1000): () => NodeJS.Timeout {
  return () =>
    setInterval(async () => {
      try {
        const r = await cleanupExpiredFilingArtifacts();
        if (r.scanned > 0) {
          console.log(
            `[FilingCleanup] scanned=${r.scanned} deleted=${r.artifactsDeleted} errors=${r.errors}`
          );
        }
      } catch (err) {
        console.error("[FilingCleanup] top-level error", err);
      }
    }, intervalMs);
}
