/**
 * LLM response cache.
 *
 * Wraps an LLM call so identical inputs return the same output without
 * re-billing tokens. Backed by the existing `api_cache` table — same TTL
 * + eviction infra as the property-data API cache.
 *
 * Best for:
 *  • Admin "retrigger analysis" flows — same propertyData hits cache
 *  • Pipeline retry loops — transient failure shouldn't double-bill
 *  • Identical re-queues from idempotency edge cases
 *
 * Not for:
 *  • User chat (every prompt is unique anyway)
 *  • Anything where you want fresh sampling every call
 *
 * Usage:
 *
 *   const cacheKey = "llm:appraisal:" + hashLLMInput([propertyData, propertyType]);
 *   const result = await withLLMCache(cacheKey, "claude-opus-4-7", 24 * 3600, async () => {
 *     // … existing LLM call returning the result you want cached …
 *   });
 */

import { createHash } from "crypto";
import { getCachedApiResponse, setCachedApiResponse } from "../db";

/**
 * Stable 32-char SHA-256 hex prefix of the JSON-serialized inputs.
 * Use this to build a deterministic cache key from any structured payload.
 */
export function hashLLMInput(parts: unknown[]): string {
  const body = JSON.stringify(parts);
  return createHash("sha256").update(body).digest("hex").slice(0, 32);
}

/**
 * Look up `cacheKey` in api_cache; if missing or expired, run `compute()`,
 * store the result, and return it. Cache misses on read errors fall through
 * to compute() so a flaky DB never blocks the LLM call.
 */
export async function withLLMCache<T>(
  cacheKey: string,
  source: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await getCachedApiResponse(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached as T;
    }
  } catch {
    // Best-effort cache; fall through to compute.
  }

  const fresh = await compute();

  // Best-effort write — never fail the call because the cache write failed.
  try {
    await setCachedApiResponse(cacheKey, source, fresh, ttlSeconds);
  } catch {
    /* ignore */
  }

  return fresh;
}
