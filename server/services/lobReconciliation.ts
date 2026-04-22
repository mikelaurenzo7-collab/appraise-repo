/**
 * Lob reconciliation job.
 *
 * Lob webhooks are reliable but not guaranteed — a missed event (broken
 * deploy, endpoint 502, firewall) would leave a filing_job stuck showing
 * "in_transit" forever even after the piece was delivered. This job
 * sweeps filing_jobs that:
 *
 *   - used a mail_* delivery channel,
 *   - have a lobLetterId,
 *   - are not yet in a terminal delivery state (delivered / returned / failed),
 *   - were mailed more than 24h ago,
 *
 * and calls Lob's status endpoint to reconcile. Runs every N minutes
 * from the server's setInterval.
 */

import { and, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { filingJobs } from "../../drizzle/schema";
import { getDb, persistActivityLog } from "../db";
import { getLobLetterStatus } from "./lobDelivery";

// The canonical event → internal status map mirrors lobWebhook.ts.
const LOB_EVENT_TO_STATUS: Record<string, "in_transit" | "delivered" | "returned" | "failed"> = {
  mailed: "in_transit",
  in_transit: "in_transit",
  in_local_area: "in_transit",
  processed_for_delivery: "in_transit",
  delivered: "delivered",
  returned_to_sender: "returned",
  undeliverable: "failed",
};

function statusRank(s: string | null | undefined): number {
  switch (s) {
    case "pending":
      return 0;
    case "in_transit":
      return 1;
    case "returned":
    case "failed":
      return 2;
    case "delivered":
      return 3;
    default:
      return 0;
  }
}

export interface ReconcileResult {
  checked: number;
  updated: number;
  errors: number;
}

/**
 * Walks up to `limit` non-terminal mail filings and reconciles their
 * delivery status against Lob. Exposed as a standalone function so tests
 * can drive it directly with a stubbed getLobLetterStatus.
 */
export async function reconcilePendingMailFilings(
  limit = 25
): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, updated: 0, errors: 0 };
  const db = await getDb();
  if (!db) return result;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let rows: Array<typeof filingJobs.$inferSelect>;
  try {
    rows = await db
      .select()
      .from(filingJobs)
      .where(
        and(
          isNotNull(filingJobs.lobLetterId),
          inArray(filingJobs.deliveryChannel, ["mail_certified", "mail_first_class"]),
          or(
            eq(filingJobs.deliveryStatus, "pending"),
            eq(filingJobs.deliveryStatus, "in_transit")
          ),
          lt(filingJobs.completedAt, cutoff)
        )
      )
      .limit(limit);
  } catch (err) {
    console.error("[LobReconcile] Failed to query pending filings", err);
    return result;
  }

  for (const row of rows) {
    if (!row.lobLetterId) continue;
    result.checked += 1;
    try {
      const status = await getLobLetterStatus(row.lobLetterId);
      if (!status) continue;
      // Lob returns `tracking_events` ordered oldest-to-newest; the last
      // event's `name` is the current carrier state.
      const lastEvent = status.trackingEvents[status.trackingEvents.length - 1];
      const carrierStatus = lastEvent?.name?.toLowerCase() ?? status.status.toLowerCase();
      const nextStatus = LOB_EVENT_TO_STATUS[carrierStatus];
      if (!nextStatus) continue;
      if (statusRank(nextStatus) <= statusRank(row.deliveryStatus)) continue;
      await db
        .update(filingJobs)
        .set({
          deliveryStatus: nextStatus,
          deliveryStatusUpdatedAt: new Date(),
        })
        .where(eq(filingJobs.id, row.id));
      await persistActivityLog({
        submissionId: row.submissionId,
        type: "filing_delivery_reconciled",
        actor: "system",
        description: `Reconciliation: filing #${row.id} → ${nextStatus}`,
        metadata: JSON.stringify({
          jobId: row.id,
          lobLetterId: row.lobLetterId,
          previousStatus: row.deliveryStatus,
          newStatus: nextStatus,
        }),
        status: nextStatus === "returned" || nextStatus === "failed" ? "warning" : "success",
      });
      result.updated += 1;
    } catch (err) {
      result.errors += 1;
      console.error(`[LobReconcile] Failure for filing ${row.id}`, err);
    }
  }

  return result;
}

// Expose the helper so the server bootstrap can install a cron without
// knowing the query shape.
export function buildReconciliationInterval(options: {
  intervalMs?: number;
  batchSize?: number;
} = {}): () => NodeJS.Timeout {
  const { intervalMs = 30 * 60 * 1000, batchSize = 25 } = options;
  return () =>
    setInterval(async () => {
      try {
        const result = await reconcilePendingMailFilings(batchSize);
        if (result.updated > 0 || result.errors > 0) {
          console.log(
            `[LobReconcile] checked=${result.checked} updated=${result.updated} errors=${result.errors}`
          );
        }
      } catch (err) {
        console.error("[LobReconcile] top-level error", err);
      }
    }, intervalMs);
}

// sql import tree-shake guard
void sql;
