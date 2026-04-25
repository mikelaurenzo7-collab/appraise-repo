import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Referral Tracking System Tests
 * Tests the referral tRPC router: dashboard, validateCode, trackClick, requestPayout
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("referral.dashboard", () => {
  it("returns referral dashboard data for authenticated user", async () => {
    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.referral.dashboard();

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("string");
    expect(result.code).toMatch(/^APPR-/); // Referral codes start with APPR-
    expect(result.tier).toBeDefined();
    expect(["bronze", "silver", "gold", "platinum"]).toContain(result.tier);
    expect(typeof result.lifetimeReferrals).toBe("number");
    expect(typeof result.lifetimeEarningsCents).toBe("number");
    expect(typeof result.pendingBalanceCents).toBe("number");
    expect(typeof result.paidOutCents).toBe("number");
    expect(typeof result.successfulCount).toBe("number");
    expect(typeof result.pendingCount).toBe("number");
    expect(Array.isArray(result.recentReferrals)).toBe(true);
  });

  it("creates a new referral code on first access", async () => {
    // Use a high user ID unlikely to already exist
    const ctx = createUserContext(99999);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.referral.dashboard();

    expect(result.code).toBe("APPR-99999");
    expect(result.tier).toBe("bronze");
    expect(result.lifetimeReferrals).toBe(0);
    expect(result.lifetimeEarningsCents).toBe(0);
    expect(result.pendingBalanceCents).toBe(0);
  });

  it("returns consistent code on repeated calls", async () => {
    const ctx = createUserContext(88888);
    const caller = appRouter.createCaller(ctx);

    const first = await caller.referral.dashboard();
    const second = await caller.referral.dashboard();

    expect(first.code).toBe(second.code);
  });
});

describe("referral.validateCode", () => {
  it("returns valid=true for an existing referral code", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First, create a code by calling dashboard as an authenticated user
    const authCtx = createUserContext(77777);
    const authCaller = appRouter.createCaller(authCtx);
    const dashboard = await authCaller.referral.dashboard();

    // Now validate it as a public user
    const result = await caller.referral.validateCode({ code: dashboard.code });

    expect(result.valid).toBe(true);
    expect(result.code).toBe(dashboard.code);
  });

  it("returns valid=false for a non-existent referral code", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.referral.validateCode({ code: "APPR-NONEXISTENT" });

    expect(result.valid).toBe(false);
    expect(result.code).toBe("APPR-NONEXISTENT");
  });
});

describe("referral.trackClick", () => {
  it("tracks a click for a valid referral code", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Create a referral code first
    const authCtx = createUserContext(66666);
    const authCaller = appRouter.createCaller(authCtx);
    const dashboard = await authCaller.referral.dashboard();

    const result = await caller.referral.trackClick({
      code: dashboard.code,
      email: "referred@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("returns failure for an invalid referral code", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.referral.trackClick({
      code: "INVALID-CODE-XYZ",
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("invalid_code");
  });

  it("tracks a click without email (optional)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Create a referral code first
    const authCtx = createUserContext(55555);
    const authCaller = appRouter.createCaller(authCtx);
    const dashboard = await authCaller.referral.dashboard();

    const result = await caller.referral.trackClick({
      code: dashboard.code,
    });

    expect(result.success).toBe(true);
  });
});

describe("referral.requestPayout", () => {
  it("rejects payout when balance is insufficient", async () => {
    // New user with zero balance
    const ctx = createUserContext(44444);
    const caller = appRouter.createCaller(ctx);

    // Ensure the code exists
    await caller.referral.dashboard();

    await expect(
      caller.referral.requestPayout({ amountCents: 5000 })
    ).rejects.toThrow("Insufficient balance");
  });

  it("rejects payout below minimum ($50 = 5000 cents)", async () => {
    const ctx = createUserContext(33333);
    const caller = appRouter.createCaller(ctx);

    // This should fail zod validation (min 5000)
    await expect(
      caller.referral.requestPayout({ amountCents: 100 })
    ).rejects.toThrow();
  });
});

describe("referral integration", () => {
  it("dashboard shows zero state correctly for new user", async () => {
    const ctx = createUserContext(22222);
    const caller = appRouter.createCaller(ctx);

    const dashboard = await caller.referral.dashboard();

    expect(dashboard.lifetimeReferrals).toBe(0);
    expect(dashboard.successfulCount).toBe(0);
    expect(dashboard.pendingCount).toBe(0);
    expect(dashboard.recentReferrals).toHaveLength(0);
    expect(dashboard.tier).toBe("bronze");
  });

  it("click tracking appears in referrer dashboard", async () => {
    // Create referrer
    const referrerCtx = createUserContext(11111);
    const referrerCaller = appRouter.createCaller(referrerCtx);
    const dashboard = await referrerCaller.referral.dashboard();

    // Track a click
    const publicCtx = createPublicContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    await publicCaller.referral.trackClick({
      code: dashboard.code,
      email: "newuser@example.com",
    });

    // Check referrer dashboard
    const updated = await referrerCaller.referral.dashboard();
    expect(updated.recentReferrals.length).toBeGreaterThanOrEqual(1);

    const latestReferral = updated.recentReferrals[0];
    expect(latestReferral.referredEmail).toBe("newuser@example.com");
    expect(latestReferral.status).toBe("clicked");
  });
});
