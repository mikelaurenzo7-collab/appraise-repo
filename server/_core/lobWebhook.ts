/**
 * Lob webhook handler.
 *
 * Lob POSTs webhook events for letter lifecycle transitions (mailed,
 * in_transit, delivered, returned_to_sender, etc.). We verify the
 * signature, find the matching filing_job row, and update its
 * deliveryStatus so the user's dashboard reflects carrier state.
 *
 * Reference:
 *   https://docs.lob.com/#section/Webhooks
 *
 * Signature verification follows Lob's documented scheme:
 *   hmac_sha256(secret, `${timestamp}.${rawBody}`) === header[lob-signature]
 *
 * The handler returns 200 even on signature failure with no-op, so Lob
 * doesn't retry forever — we log loudly instead.
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { filingJobs } from "../../drizzle/schema";
import { getDb, persistActivityLog } from "../db";

const LOB_RAW_LIMIT = "2mb";

// Map Lob event types to our internal delivery_status enum.
const EVENT_TO_STATUS: Record<string, "pending" | "in_transit" | "delivered" | "returned" | "failed"> = {
  "letter.created": "pending",
  "letter.rendered_pdf": "pending",
  "letter.zip_verified": "pending",
  "letter.mailed": "in_transit",
  "letter.in_transit": "in_transit",
  "letter.in_local_area": "in_transit",
  "letter.processed_for_delivery": "in_transit",
  "letter.delivered": "delivered",
  "letter.re-routed": "in_transit",
  "letter.returned_to_sender": "returned",
  "letter.undeliverable": "failed",
};

export function verifyLobSignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string
): boolean {
  if (!signature || !timestamp || !secret) return false;
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface LobWebhookEvent {
  id: string;
  event_type?: { id?: string } | string;
  body?: {
    id?: string;
    tracking_number?: string | null;
  };
}

export async function handleLobEvent(
  event: LobWebhookEvent
): Promise<{ matched: boolean; filingJobId?: number; deliveryStatus?: string }> {
  const rawType =
    typeof event.event_type === "string"
      ? event.event_type
      : event.event_type?.id ?? "";
  const eventType = rawType.toLowerCase();
  const nextStatus = EVENT_TO_STATUS[eventType];
  if (!nextStatus) return { matched: false };

  const letterId = event.body?.id;
  if (!letterId) return { matched: false };

  const db = await getDb();
  if (!db) return { matched: false };

  // Find the filing_job row for this letter.
  const rows = await db
    .select()
    .from(filingJobs)
    .where(eq(filingJobs.lobLetterId, letterId))
    .limit(1);
  const row = rows[0];
  if (!row) return { matched: false };

  // Never regress a status (e.g. a late "in_transit" event after we've
  // already seen "delivered" shouldn't overwrite).
  const currentRank = deliveryStatusRank(row.deliveryStatus ?? "pending");
  const nextRank = deliveryStatusRank(nextStatus);
  if (nextRank < currentRank) {
    return { matched: true, filingJobId: row.id, deliveryStatus: row.deliveryStatus ?? "pending" };
  }

  await db
    .update(filingJobs)
    .set({
      deliveryStatus: nextStatus,
      deliveryStatusUpdatedAt: new Date(),
      ...(event.body?.tracking_number && !row.mailTrackingNumber
        ? { mailTrackingNumber: event.body.tracking_number }
        : {}),
    })
    .where(eq(filingJobs.id, row.id));

  await persistActivityLog({
    submissionId: row.submissionId,
    type: "filing_delivery_update",
    actor: "system",
    description: `Filing #${row.id} delivery status → ${nextStatus}`,
    metadata: JSON.stringify({
      jobId: row.id,
      lobLetterId: letterId,
      eventType,
      trackingNumber: event.body?.tracking_number ?? row.mailTrackingNumber,
    }),
    status: nextStatus === "returned" || nextStatus === "failed" ? "warning" : "success",
  });

  return { matched: true, filingJobId: row.id, deliveryStatus: nextStatus };
}

function deliveryStatusRank(s: string): number {
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

/**
 * Register the Lob webhook route on the Express app. Must be mounted
 * before the JSON body parser — signature verification needs the raw
 * bytes, not a parsed object.
 */
export function registerLobWebhook(app: express.Application) {
  app.post(
    "/api/lob/webhook",
    express.raw({ type: "application/json", limit: LOB_RAW_LIMIT }),
    async (req: Request, res: Response) => {
      const secret = process.env.LOB_WEBHOOK_SECRET ?? "";
      const rawBody = (req.body as Buffer).toString("utf8");

      if (!secret) {
        console.warn("[LobWebhook] LOB_WEBHOOK_SECRET not set — rejecting");
        return res.status(503).json({ error: "webhook not configured" });
      }

      const signature = req.header("lob-signature") ?? req.header("Lob-Signature");
      const timestamp =
        req.header("lob-signature-timestamp") ??
        req.header("Lob-Signature-Timestamp");

      if (!verifyLobSignature(rawBody, signature, timestamp, secret)) {
        console.warn("[LobWebhook] Signature verification failed");
        return res.status(401).json({ error: "invalid signature" });
      }

      let event: LobWebhookEvent;
      try {
        event = JSON.parse(rawBody) as LobWebhookEvent;
      } catch {
        return res.status(400).json({ error: "invalid json" });
      }

      try {
        const result = await handleLobEvent(event);
        return res.json({ received: true, ...result });
      } catch (err) {
        console.error("[LobWebhook] handler error", err);
        // Return 200 so Lob doesn't retry indefinitely — we've already
        // logged. Acceptable for a dashboard-display webhook; if we
        // depend on this for billing we'd want retries.
        return res.json({ received: true, error: "internal handler failed" });
      }
    }
  );
}
