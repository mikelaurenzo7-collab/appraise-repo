/**
 * Structured JSON logger.
 *
 * Emits one JSON object per line so log collectors (Manus, Datadog,
 * CloudWatch) can parse them as structured events without regex hacks.
 *
 * Drop-in compatible with the existing `console.log/warn/error` calls —
 * existing code keeps working, but new code should prefer this module so
 * we get parseable level / timestamp / context fields.
 *
 * Intentionally additive: this module does NOT replace any existing
 * console.* calls; teams can migrate at their own pace.
 *
 *   import { log } from "../_core/logger";
 *   log.info("FilingQueue heartbeat", { pendingCount: 4, jobId });
 *   log.error("Report job failed", { jobId, err: err.message });
 */

type Meta = Record<string, unknown> | undefined;

function emit(level: "info" | "warn" | "error" | "debug", msg: string, meta?: Meta) {
  // Use stable field ordering for log-stream readability.
  const record: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    msg,
  };
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      // Don't overwrite reserved fields.
      if (k === "level" || k === "ts" || k === "msg") continue;
      record[k] = v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v;
    }
  }
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, meta?: Meta) => emit("info", msg, meta),
  warn: (msg: string, meta?: Meta) => emit("warn", msg, meta),
  error: (msg: string, meta?: Meta) => emit("error", msg, meta),
  debug: (msg: string, meta?: Meta) => emit("debug", msg, meta),
};

/**
 * Bind a stable scope (e.g. `"FilingQueue"`) to all emitted log lines.
 * Useful inside service modules so every line auto-tags itself.
 */
export function scopedLogger(scope: string) {
  return {
    info: (msg: string, meta?: Meta) => emit("info", msg, { scope, ...meta }),
    warn: (msg: string, meta?: Meta) => emit("warn", msg, { scope, ...meta }),
    error: (msg: string, meta?: Meta) => emit("error", msg, { scope, ...meta }),
    debug: (msg: string, meta?: Meta) => emit("debug", msg, { scope, ...meta }),
  };
}
