/**
 * Safe JSON parser — never throws.
 *
 * Wraps `JSON.parse` so a single corrupt or schema-evolved DB row doesn't
 * crash a critical path (report generation, dashboard load, etc.). Returns
 * the fallback on any failure (null/undefined input, malformed JSON,
 * non-string type) and logs the failure once with a scope tag so the
 * underlying data corruption can still be tracked down.
 *
 * Use this for any JSON-in-text-column read where the parse failure would
 * surface as a 500 to the user. Don't use it for trusted input where a
 * parse failure should genuinely abort.
 *
 * Example
 * -------
 *     const comparableSales = safeJsonParse<Comp[]>(
 *       analysis.comparableSales,
 *       [],
 *       "reportJobQueue.comparableSales",
 *     );
 */

import { scopedLogger } from "./logger";

const log = scopedLogger("safeJson");

export function safeJsonParse<T>(value: string | null | undefined, fallback: T, scope?: string): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch (err) {
    // Truncate the offending value to keep logs sane while still aiding
    // diagnosis — the first 120 chars almost always contain enough to spot
    // a missing brace or unescaped quote.
    log.warn("JSON.parse failed; using fallback", {
      scope: scope ?? "unknown",
      err: (err as Error).message,
      preview: value.slice(0, 120),
      length: value.length,
    });
    return fallback;
  }
}
