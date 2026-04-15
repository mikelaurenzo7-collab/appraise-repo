import express, { Request, Response } from "express";
import Stripe from "stripe";
import { updateAppealOutcome, getAppealOutcomeBySubmissionId } from "../db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

/**
 * Stripe webhook handler for payment events
 * Endpoint: POST /api/stripe/webhook
 */
export function registerStripeWebhook(app: express.Application) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;

      if (!sig) {
        console.error("[Stripe Webhook] Missing signature");
        return res.status(400).json({ error: "Missing signature" });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: "Webhook signature verification failed" });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
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
            console.log(`[Stripe Webhook] Charge failed: ${charge.id}`);
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err: any) {
        console.error("[Stripe Webhook] Error processing event:", err);
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
    console.error("[Stripe Webhook] Missing metadata in session");
    return;
  }

  // Calculate contingency fee (25% of annual tax savings)
  const contingencyFee = ((annualTaxSavings * 0.25) / 100).toFixed(2); // Convert from cents

  // Update appeal outcome with payment info
  const existing = await getAppealOutcomeBySubmissionId(submissionId);

  if (existing) {
    await updateAppealOutcome(existing.id, {
      stripePaymentIntentId: (session.payment_intent as string) || undefined,
      contingencyFeePaid: contingencyFee,
      paidAt: new Date(),
    });
    console.log(`[Stripe Webhook] Updated appeal outcome ${existing.id} with payment info`);
  } else {
    console.warn(`[Stripe Webhook] No appeal outcome found for submission ${submissionId}`);
  }

  console.log(
    `[Stripe Webhook] Payment completed for submission ${submissionId}: $${contingencyFee}`
  );
}

/**
 * Handle payment_intent.succeeded event
 * This fires when a payment intent succeeds
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe Webhook] Payment intent succeeded: ${paymentIntent.id}`);
  // Additional processing can be added here if needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void paymentIntent;
}
