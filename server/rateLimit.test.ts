import { beforeEach, describe, expect, it } from "vitest";
import {
  enforceRateLimit,
  getClientIp,
  __resetRateLimiterForTests,
} from "./_core/rateLimit";
import type { TrpcContext } from "./_core/context";

function makeContext(ip?: string): TrpcContext {
  return {
    user: null,
    req: {
      headers: ip ? { "x-forwarded-for": ip } : {},
      socket: { remoteAddress: ip ?? "127.0.0.1" },
    } as unknown as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("rateLimit", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
  });

  it("allows requests within the limit", () => {
    const ctx = makeContext("1.1.1.1");
    for (let i = 0; i < 3; i++) {
      expect(() =>
        enforceRateLimit(ctx, { scope: "test", max: 3, windowMs: 60_000 })
      ).not.toThrow();
    }
  });

  it("throws TOO_MANY_REQUESTS once max is exceeded", () => {
    const ctx = makeContext("2.2.2.2");
    for (let i = 0; i < 2; i++) {
      enforceRateLimit(ctx, { scope: "t", max: 2, windowMs: 60_000 });
    }
    expect(() =>
      enforceRateLimit(ctx, { scope: "t", max: 2, windowMs: 60_000 })
    ).toThrowError(/Too many requests/);
  });

  it("separates buckets per scope", () => {
    const ctx = makeContext("3.3.3.3");
    enforceRateLimit(ctx, { scope: "a", max: 1, windowMs: 60_000 });
    // Same IP under a new scope should still be allowed once.
    expect(() =>
      enforceRateLimit(ctx, { scope: "b", max: 1, windowMs: 60_000 })
    ).not.toThrow();
  });

  it("separates buckets per IP", () => {
    const ctxA = makeContext("4.4.4.4");
    const ctxB = makeContext("5.5.5.5");
    enforceRateLimit(ctxA, { scope: "s", max: 1, windowMs: 60_000 });
    expect(() =>
      enforceRateLimit(ctxB, { scope: "s", max: 1, windowMs: 60_000 })
    ).not.toThrow();
  });

  it("extracts IP from x-forwarded-for when multiple", () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
        socket: { remoteAddress: "127.0.0.1" },
      } as unknown as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    expect(getClientIp(ctx)).toBe("10.0.0.1");
  });

  it("falls back to 'unknown' when no address is available", () => {
    const ctx: TrpcContext = {
      user: null,
      req: { headers: {} } as unknown as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    expect(getClientIp(ctx)).toBe("unknown");
  });
});
