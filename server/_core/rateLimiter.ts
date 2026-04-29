import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * JSON-formatted rate limit handler — ensures tRPC clients always receive
 * a parseable response instead of a raw text string that crashes JSON.parse.
 */
function jsonHandler(message: string) {
  return (_req: Request, res: Response) => {
    res.status(429).json({ error: message, code: 'RATE_LIMITED' });
  };
}

/**
 * Build a key generator that uses user ID when authenticated, falling back
 * to the IPv6-safe ipKeyGenerator helper for unauthenticated requests.
 * Passing ipKeyGenerator as the `keyGenerator` directly avoids the library's
 * IPv6 validation warning while still supporting user-level bucketing.
 */
function userAwareKeyGen(req: Request): string {
  const userId = (req as any).user?.id;
  if (userId) return `u:${userId}`;
  // Delegate to the library's official IPv6-safe helper
  return ipKeyGenerator(req.ip ?? '');
}

/**
 * Global rate limiter: 500 requests per 15 minutes.
 * Generous ceiling — only blocks genuine abuse, not normal usage.
 * Authenticated users are keyed by user ID so shared IPs (offices, NAT)
 * don't collide.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  handler: jsonHandler('Too many requests. Please try again in a few minutes.'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  keyGenerator: userAwareKeyGen,
});

/**
 * Strict rate limiter for auth endpoints: 20 requests per 15 minutes.
 * Prevents brute force while allowing normal OAuth retry flows.
 * No custom keyGenerator — uses default IP keying (correct for auth).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  handler: jsonHandler('Too many login attempts. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * API rate limiter for tRPC endpoints: 300 requests per minute.
 * Keyed by authenticated user ID so each user has their own budget.
 * 300/min is generous enough for normal UI usage (page loads fire 5–10
 * parallel queries) while still blocking runaway polling loops.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  handler: jsonHandler('Too many API requests. Please slow down and try again.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userAwareKeyGen,
});

/**
 * Payment rate limiter: 20 requests per hour.
 * Prevents payment abuse while allowing legitimate retries.
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  handler: jsonHandler('Too many payment requests. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userAwareKeyGen,
});

/**
 * File upload rate limiter: 20 uploads per hour.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  handler: jsonHandler('Too many uploads. Please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userAwareKeyGen,
});

/**
 * Analysis submission rate limiter: 10 submissions per day per user.
 * Prevents spam while allowing legitimate re-submissions.
 */
export const submissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  handler: jsonHandler('Too many submissions today. Please try again tomorrow.'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userAwareKeyGen,
});
