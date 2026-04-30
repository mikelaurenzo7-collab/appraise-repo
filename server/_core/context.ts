import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { randomBytes } from "crypto";

/** Generate a short, URL-safe trace ID (8 hex chars = 4 bytes = enough uniqueness for log correlation). */
function generateTraceId(): string {
  return randomBytes(4).toString("hex");
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Stable identifier for correlating a tRPC request with its downstream jobs and log lines. */
  traceId: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Re-use the caller's trace ID when present (e.g. forwarded by a test harness
  // or an upstream service), otherwise generate a fresh one.
  // Sanitize: only accept hex strings up to 32 chars to prevent log injection.
  const rawTraceId = opts.req.headers["x-trace-id"] as string | undefined;
  const traceId =
    rawTraceId && /^[0-9a-f]{1,32}$/i.test(rawTraceId)
      ? rawTraceId
      : generateTraceId();

  return {
    req: opts.req,
    res: opts.res,
    user,
    traceId,
  };
}
