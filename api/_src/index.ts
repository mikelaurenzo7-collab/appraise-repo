/**
 * Vercel serverless function entrypoint.
 *
 * Vercel's filesystem-based router maps every file in /api to a serverless
 * function. The `vercel.json` rewrites send all `/api/*` traffic here, where
 * we delegate to the same Express app used in local dev.
 *
 * IMPORTANT: serverless functions are stateless and short-lived — never call
 * listen(), never schedule setInterval, never assume a previous request's
 * memory survives.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../../server/_core/index";

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req as never, res as never);
}
