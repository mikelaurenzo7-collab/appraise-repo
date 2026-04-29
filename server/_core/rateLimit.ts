/**
 * Lightweight in-memory token bucket rate limiter.
 *
 * Sufficient for a single-node deployment. For multi-node or serverless,
 * swap the storage backend for Redis/MySQL. Keyed by IP + procedure path
 * so separate tRPC endpoints have independent budgets.
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

// Capped at a generous ceiling to prevent unbounded memory use under abuse.
const MAX_BUCKETS = 10_000;

function pruneIfTooLarge() {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  const toDelete: string[] = [];
  buckets.forEach((bucket, key) => {
    // Drop buckets whose windows already expired an hour ago.
    if (now - bucket.windowStart > 60 * 60 * 1000) toDelete.push(key);
  });
  toDelete.forEach((k) => buckets.delete(k));
  // If still too large, evict oldest entries.
  if (buckets.size > MAX_BUCKETS) {
    const overage = buckets.size - MAX_BUCKETS;
    const keys = Array.from(buckets.keys()).slice(0, overage);
    keys.forEach((k) => buckets.delete(k));
  }
}

export function getClientIp(ctx: TrpcContext): string {
  const req = ctx.req as
    | (TrpcContext["req"] & { ip?: string })
    | undefined;
  if (!req) return "unknown";
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  if (typeof req.ip === "string" && req.ip.length > 0) return req.ip;
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Rate-limit check for raw Express requests (non-tRPC handlers such as SSE
 * and webhooks). Returns false when the caller is within budget, true when
 * they have exceeded the limit and the handler should return 429.
 */
export function checkRateLimit(
  req: { headers?: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string }; userId?: string | number },
  opts: RateLimitOptions
): boolean {
  const ip = (() => {
    const forwarded = req.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
    if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0];
    if (typeof req.ip === "string" && req.ip.length > 0) return req.ip;
    return req.socket?.remoteAddress || "unknown";
  })();
  const clientKey = req.userId !== undefined && req.userId !== null && req.userId !== ""
    ? `u:${req.userId}`
    : `ip:${ip}`;
  const key = `${opts.scope}:${clientKey}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= opts.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    pruneIfTooLarge();
    return false;
  }
  if (bucket.count >= opts.max) return true;
  bucket.count += 1;
  return false;
}

/**
 * Preferred client identifier for rate limiting.
 *
 * Behind the Manus reverse proxy, all traffic typically arrives from one or
 * two source IPs, so per-IP keying effectively means every authenticated
 * user shares a single bucket — defeating the limit. Use the authenticated
 * user id when present, fall back to IP only for anonymous / public routes.
 */
export function getClientKey(ctx: TrpcContext): string {
  const userId = (ctx as { user?: { id?: number | string } } | undefined)?.user?.id;
  if (userId !== undefined && userId !== null && userId !== "") {
    return `u:${userId}`;
  }
  return `ip:${getClientIp(ctx)}`;
}

export interface RateLimitOptions {
  /** Max requests allowed inside the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Cache key suffix — used so different procedures have separate budgets. */
  scope: string;
}

export function enforceRateLimit(
  ctx: TrpcContext,
  opts: RateLimitOptions
): void {
  // Prefer user-id keying so authenticated users get their own bucket
  // even when Manus's proxy collapses everyone to one source IP.
  const clientKey = getClientKey(ctx);
  const key = `${opts.scope}:${clientKey}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= opts.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    pruneIfTooLarge();
    return;
  }

  if (bucket.count >= opts.max) {
    const retryAfterMs = opts.windowMs - (now - bucket.windowStart);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many requests. Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
    });
  }

  bucket.count += 1;
}

// Exposed for tests.
export function __resetRateLimiterForTests() {
  buckets.clear();
}
