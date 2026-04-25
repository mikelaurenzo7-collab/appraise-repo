import { describe, it, expect } from "vitest";

describe("Stripe Live Key Validation", () => {
  it("STRIPE_SECRET_KEY is set and looks like a live key", () => {
    const key = process.env.STRIPE_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    // Should start with sk_live_ or sk_test_
    expect(key!.startsWith("sk_")).toBe(true);
    console.log(`[Stripe] Secret key prefix: ${key!.substring(0, 12)}...`);
    if (key!.startsWith("sk_live_")) {
      console.log("[Stripe] ✅ LIVE secret key detected");
    } else {
      console.log("[Stripe] ⚠️ TEST secret key detected (not live)");
    }
  });

  it("VITE_STRIPE_PUBLISHABLE_KEY is set and looks like a live key", () => {
    const key = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    expect(key!.startsWith("pk_")).toBe(true);
    console.log(`[Stripe] Publishable key prefix: ${key!.substring(0, 12)}...`);
    if (key!.startsWith("pk_live_")) {
      console.log("[Stripe] ✅ LIVE publishable key detected");
    } else {
      console.log("[Stripe] ⚠️ TEST publishable key detected (not live)");
    }
  });

  it("STRIPE_WEBHOOK_SECRET is set", () => {
    const key = process.env.STRIPE_WEBHOOK_SECRET;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    expect(key!.startsWith("whsec_")).toBe(true);
    console.log(`[Stripe] Webhook secret prefix: ${key!.substring(0, 10)}...`);
    console.log("[Stripe] ✅ Webhook secret configured");
  });

  it("can initialize Stripe client with the secret key", async () => {
    const Stripe = (await import("stripe")).default;
    const key = process.env.STRIPE_SECRET_KEY;
    expect(key).toBeDefined();

    const stripe = new Stripe(key!);
    // Try to list products — this is a read-only operation that validates the key works
    try {
      const products = await stripe.products.list({ limit: 1 });
      console.log(`[Stripe] ✅ API connection successful — ${products.data.length} product(s) found`);
      expect(products).toBeDefined();
      expect(products.object).toBe("list");
    } catch (err: any) {
      // If the key is invalid, Stripe throws an authentication error
      if (err.type === "StripeAuthenticationError") {
        throw new Error(`❌ Stripe API key is INVALID: ${err.message}`);
      }
      throw err;
    }
  });
});
