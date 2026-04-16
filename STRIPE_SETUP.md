# Stripe Integration Setup Guide

## Overview

AppraiseAI uses Stripe to collect 25% contingency fees when appeals are won. This guide walks you through setting up your Stripe sandbox for testing and live mode for production.

## Step 1: Claim Your Stripe Sandbox

Your Stripe sandbox has been provisioned but needs to be claimed before it can be used.

**Action Required:**
1. Visit: https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVEw5RTVFMTBKUDREM2o0LDE3NzY1Njc0Njkv100x6Mqb96J
2. Complete the claim process
3. **Deadline: June 11, 2026** (after this date, the sandbox will expire)

## Step 2: Test Payments in Sandbox Mode

Once your sandbox is claimed, you can test the payment flow using Stripe's test card numbers.

### Test Card Numbers

| Card Number | Expiry | CVC | Use Case |
|---|---|---|---|
| 4242 4242 4242 4242 | Any future date | Any 3 digits | Successful payment |
| 4000 0000 0000 0002 | Any future date | Any 3 digits | Card declined |
| 4000 0025 0000 3155 | Any future date | Any 3 digits | Requires authentication |

### Testing the Payment Flow

1. **Start an appeal:**
   - Go to `/get-started` and submit a property address
   - Complete the analysis to get your appeal strength score

2. **Trigger payment:**
   - In the analysis results, click "Proceed to Payment"
   - This creates a Stripe checkout session

3. **Complete checkout:**
   - You'll be redirected to Stripe's hosted checkout page
   - Use test card `4242 4242 4242 4242`
   - Enter any future expiry date and any 3-digit CVC
   - Complete the payment

4. **Verify webhook:**
   - The webhook handler at `/api/stripe/webhook` processes the payment
   - Check your database to confirm `stripePaymentIntentId` was recorded
   - Payment history should appear in your dashboard at `/payments`

## Step 3: Environment Variables

The following Stripe environment variables are automatically configured:

```
STRIPE_SECRET_KEY=sk_test_... (test mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (test mode)
STRIPE_WEBHOOK_SECRET=whsec_... (webhook signing secret)
```

**Never commit these to version control.** They're stored securely in the Manus platform.

## Step 4: Going Live

When you're ready to accept real payments:

1. **Complete Stripe KYC verification:**
   - Visit https://dashboard.stripe.com
   - Complete identity and business verification
   - This typically takes 1-2 business days

2. **Switch to live keys:**
   - In the Manus Management UI, go to Settings → Payment
   - Replace test keys with live keys from your Stripe dashboard
   - Live keys start with `sk_live_` and `pk_live_`

3. **Update webhook endpoint:**
   - In Stripe Dashboard → Developers → Webhooks
   - Add your production domain webhook endpoint
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`

4. **Test with live card (optional):**
   - Stripe provides a 99% discount promo code for testing
   - Use this to verify the live flow without large charges

## Step 5: Webhook Events

The webhook handler processes these Stripe events:

### `payment_intent.succeeded`
- Triggered when a payment is successfully completed
- Records `stripePaymentIntentId` in the database
- Updates appeal outcome with contingency fee payment status

### `payment_intent.payment_failed`
- Triggered when a payment fails
- Logs the failure for troubleshooting
- User is notified to retry payment

### `customer.subscription.updated`
- Triggered when subscription details change
- Updates customer record if applicable

## Step 6: Payment Flow Architecture

```
User clicks "Proceed to Payment"
    ↓
Frontend calls: trpc.payments.createCheckoutSession()
    ↓
Backend creates Stripe checkout session
    ↓
Frontend redirects to Stripe checkout page
    ↓
User enters payment details
    ↓
Stripe processes payment
    ↓
Webhook: /api/stripe/webhook receives payment_intent.succeeded
    ↓
Backend updates database with stripePaymentIntentId
    ↓
User redirected to success page
    ↓
Payment history visible in dashboard
```

## Step 7: Database Schema

Payment data is stored in the `appeal_outcomes` table:

```sql
-- Stripe payment tracking
stripe_payment_intent_id VARCHAR(255) -- Stripe PaymentIntent ID
contingency_fee_paid DECIMAL(10, 2) -- 25% of tax savings
paid_at TIMESTAMP -- Payment completion timestamp
```

## Step 8: Troubleshooting

### "Cannot find package 'stripe'" Error
- Run `pnpm add stripe` to install the Stripe SDK
- Restart the dev server with `pnpm dev`

### Webhook not receiving events
- Verify webhook secret in environment variables
- Check Stripe Dashboard → Developers → Webhooks for delivery logs
- Ensure webhook endpoint is publicly accessible

### Payment succeeded but database not updated
- Check server logs for webhook processing errors
- Verify database connection is working
- Ensure `appeal_outcomes` table has required columns

### Test payment not working
- Verify you're using correct test card number
- Check that you're in test mode (not live mode)
- Ensure webhook secret is correctly configured

## Step 9: Security Best Practices

1. **Never expose secret keys:**
   - Keep `STRIPE_SECRET_KEY` server-side only
   - Use `VITE_STRIPE_PUBLISHABLE_KEY` on frontend

2. **Verify webhook signatures:**
   - Always verify webhook signature before processing
   - Use `stripe.webhooks.constructEvent()` to validate

3. **Handle PCI compliance:**
   - Never store full card numbers
   - Use Stripe's hosted checkout to handle card data
   - Stripe handles PCI compliance for you

4. **Implement idempotency:**
   - Use idempotency keys for payment creation
   - Prevents duplicate charges if request is retried

## Step 10: Monitoring and Analytics

Monitor your payments in the Stripe Dashboard:

- **Payments Dashboard:** View all transactions, refunds, and disputes
- **Revenue Analytics:** Track MRR, churn, and customer lifetime value
- **Webhook Logs:** Debug webhook delivery issues
- **API Logs:** View all API calls for troubleshooting

## Support

For Stripe-specific questions:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For AppraiseAI integration questions:
- Email: support@appraise-ai.com
- Dashboard: https://appraise-ai.manus.space/admin

## Next Steps

1. ✅ Claim your Stripe sandbox (deadline: June 11, 2026)
2. ✅ Test payment flow with test cards
3. ✅ Verify webhook handler is working
4. ✅ Monitor payment history in dashboard
5. ✅ Complete Stripe KYC for live mode
6. ✅ Switch to live keys and test with live card
7. ✅ Launch to production!
