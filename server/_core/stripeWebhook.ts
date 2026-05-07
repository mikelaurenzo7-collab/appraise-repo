import express, { Request, Response } from "express";
import Stripe from "stripe";
import {
  updateAppealOutcome,
  getAppealOutcomeBySubmissionId,
  recordStripeEvent,
  getReferralTrackingBySubmission,
  updateReferralTracking,
  creditReferral,
  getFilingTierBySubmission,
  updateFilingTierPayment,
  createFilingTier,
  getPropertySubmissionById,
} from "../db";
import { sendPaymentConfirmationEmail } from "./emailService";
import { scopedLogger } from "./logger";

const log = scopedLogger("StripeWebhook");

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  _stripe = new Stripe(key);
  return _stripe;
}
/**
 * Stripe webhook handler for payment events
 * Endpoint: POST /api/stripe/webhook
 *
 * Refuses to start if STRIPE_WEBHOOK_SECRET is missing. With an empty
 * secret, Stripe's HMAC-SHA256 signature check still runs but accepts
 * any payload an attacker can hash with the empty key — i.e. forged
 * webhooks would be processed as real payments. This used to default
 * to "" via `process.env.STRIPE_WEBHOOK_SECRET || ""`, which on Vercel
 * (where validateEnvOrExit doesn't run) silently shipped to production.
 */
export function registerStripeWebhook(app: express.Application) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.warn(
      "[StripeWebhook] STRIPE_WEBHOOK_SECRET is not configured — webhook disabled. Set the env var to enable Stripe events."
    );
    app.post(
      "/api/stripe/webhook",
      express.raw({ type: "application/json" }),
      (_req: Request, res: Response) => {
        res.status(503).json({ error: "Stripe webhook is not configured" });
      }
    );
    return;
  }

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;

      if (!sig) {
        log.error("[Stripe Webhook] Missing signature");
        return res.status(400).json({ error: "Missing signature" });
      }

      let event: Stripe.Event;

      try {
        event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        log.error("[Stripe Webhook] Signature verification failed:", { err: err.message });
        return res.status(400).json({ error: "Webhook signature verification failed" });
      }

      // Handle test events (Stripe's CLI test uses evt_test_*). These still
      // pass signature verification because we use the real secret; we just
      // short-circuit the handler so tests don't mutate real data.
      if (event.id.startsWith("evt_test_")) {
        log.info("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      // Idempotency — refuse to reprocess an event id we've already handled.
      // Stripe retries on 5xx, and misconfigured endpoints can deliver the
      // same event twice. Without this check, a duplicate checkout.session.
      // completed would double-apply payment state.
      const outcome = await recordStripeEvent(event.id, event.type);
      if (outcome === "duplicate") {
        log.info(`[Stripe Webhook] Duplicate event ${event.id} ignored`);
        return res.json({ received: true, duplicate: true });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleCheckoutSessionCompleted(session);
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await handlePaymentIntentSucceeded(paymentIntent);
            break;
          }

          case "charge.failed": {
            const charge = event.data.object as Stripe.Charge;
            log.info(`[Stripe Webhook] Charge failed: ${charge.id}`);
            break;
          }

          default:
            log.info(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err: any) {
        log.error("[Stripe Webhook] Error processing event:", { err: err });
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}

/**
 * Handle checkout.session.completed event
 * This fires when a payment is successfully completed
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const submissionId = parseInt(session.metadata?.submissionId || "0");
  const userId = parseInt(session.metadata?.userId || "0");
  const annualTaxSavings = parseInt(session.metadata?.annualTaxSavings || "0");

  if (!submissionId || !userId) {
    log.error("[Stripe Webhook] Missing metadata in session");
    return;
  }

  const tierId = session.metadata?.tierId || "";
  const paymentIntentId = (session.payment_intent as string) || "";

  // ─── UPDATE FILING TIER PAYMENT STATUS ──────────────────────────────
  // This is the critical payment gate: mark the filing tier as "paid"
  // so report generation and filing submission can verify payment.
  try {
    const existingTier = await getFilingTierBySubmission(submissionId);
    if (existingTier) {
      await updateFilingTierPayment(submissionId, {
        paymentStatus: "paid",
        paymentMethod: "stripe",
        stripePaymentIntentId: paymentIntentId,
      });
      log.info(`[Stripe Webhook] Filing tier payment marked as paid for submission ${submissionId}`);
    } else {
      // Create a filing tier record if one doesn't exist yet
      // (e.g., user went through checkout before the tier was persisted)
      const tierMapping: Record<string, "pro-se" | "automated_standard" | "automated_express"> = {
        // Current tier IDs
        pro_se: "pro-se",
        automated_standard: "automated_standard",
        automated_express: "automated_express",
        // Legacy tier IDs (backward compat)
        free: "pro-se",
        automated: "automated_express",
        poa: "automated_express",
        starter: "pro-se",
        standard: "automated_standard",
        premium: "automated_express",
      };
      await createFilingTier({
        submissionId,
        tier: tierMapping[tierId] || "automated_express",
        paymentStatus: "paid",
        paymentMethod: "stripe",
        stripePaymentIntentId: paymentIntentId,
        proSePrice: session.amount_total || 0,
      });
      log.info(`[Stripe Webhook] Created filing tier (paid) for submission ${submissionId}`);
    }
  } catch (err) {
    log.error("[Stripe Webhook] Failed to update filing tier payment status:", { err: err });
  }

  // Flat-fee model: record payment against appeal outcome (no contingency fee)
  const flatFeePaid = ((session.amount_total || 0) / 100).toFixed(2);

  // Update appeal outcome with payment info
  const existing = await getAppealOutcomeBySubmissionId(submissionId);

  if (existing) {
    await updateAppealOutcome(existing.id, {
      stripePaymentIntentId: (session.payment_intent as string) || undefined,
      contingencyFeePaid: flatFeePaid, // field repurposed as flat-fee revenue tracker
      paidAt: new Date(),
    });
    log.info(`[Stripe Webhook] Updated appeal outcome ${existing.id} with payment info`);
  } else {
    log.warn(`[Stripe Webhook] No appeal outcome found for submission ${submissionId}`);
  }

  // ─── REFERRAL CREDITING ─────────────────────────────────────────────
  // If this submission was referred, credit the referrer now that payment
  // has succeeded. The referral tracking row was created at submission time
  // with status "submitted". We advance it to "paid" → "credited".
  try {
    const referralEntry = await getReferralTrackingBySubmission(submissionId);
    if (referralEntry && referralEntry.status !== "credited" && referralEntry.status !== "reversed") {
      // Mark as paid first
      await updateReferralTracking(referralEntry.id, {
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: (session.payment_intent as string) || undefined,
      });

      // Credit the referrer (bumps their stats + calculates tier-based commission)
      await creditReferral(
        referralEntry.id,
        (session.payment_intent as string) || ""
      );

      log.info(`[Stripe Webhook] Referral credited for submission ${submissionId} (referrer: ${referralEntry.referrerUserId})`);
    }
  } catch (err) {
    // Referral crediting should never block the main payment flow
    log.error("[Stripe Webhook] Referral crediting failed (non-blocking):", { err: err });
  }

  log.info(`[Stripe Webhook] Payment completed for submission ${submissionId}: $${flatFeePaid} flat fee`);

  // ── Send payment confirmation email ────────────────────────────────
  try {
    const sub = await getPropertySubmissionById(submissionId);
    if (sub?.email) {
      await sendPaymentConfirmationEmail({
        userEmail: sub.email,
        userName: sub.email.split("@")[0],
        amount: (session.amount_total || 0) / 100,
        propertyAddress: sub.address,
        transactionId: paymentIntentId || session.id,
      });
    }
  } catch (err) {
    log.error("[Stripe Webhook] Payment confirmation email failed (non-blocking):", { err: err });
  }
}

/**
 * Handle payment_intent.succeeded event
 * This fires when a payment intent succeeds
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  log.info(`[Stripe Webhook] Payment intent succeeded: ${paymentIntent.id}`);
  // Additional processing can be added here if needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void paymentIntent;
}
