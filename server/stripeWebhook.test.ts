import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import type { Request, Response } from "express";

const originalEnv = { ...process.env };

type AppLike = {
  _router?: {
    stack: Array<{
      route?: {
        path: string;
        stack: Array<{ method: string; handle: (req: Request, res: Response) => unknown }>;
      };
    }>;
  };
};

function getRouteHandler(app: express.Express, path: string, method: string) {
  const stack = (app as unknown as AppLike)._router?.stack ?? [];
  const layer = stack.find((entry) => entry.route?.path === path);
  // app.post(path, rawParser, handler) registers the body parser AND the
  // handler in route.stack. The last matching entry is our actual handler;
  // skip the raw body parser.
  const handlers = layer?.route?.stack.filter((entry) => entry.method === method) ?? [];
  return handlers[handlers.length - 1]?.handle;
}

async function buildApp(): Promise<express.Express> {
  const { registerStripeWebhook } = await import("./_core/stripeWebhook");
  const app = express();
  registerStripeWebhook(app);
  return app;
}

function makeRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
}

describe("Stripe webhook registration", () => {
  beforeEach(async () => {
    const vitest = await import("vitest");
    vitest.vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 503 when STRIPE_WEBHOOK_SECRET is missing instead of accepting forged events", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const app = await buildApp();
    const handler = getRouteHandler(app, "/api/stripe/webhook", "post");
    expect(handler).toBeTruthy();

    const res = makeRes();
    await handler!(
      { headers: {}, body: Buffer.from("{}") } as unknown as Request,
      res as unknown as Response,
    );

    // Without a configured secret we must NOT process the event — even if it
    // happens to look valid. Returning 503 keeps Stripe in a retry loop and
    // makes the misconfiguration visible instead of silently accepting forged
    // events with an empty-key HMAC.
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Stripe webhook is not configured" });
  });

  it("attaches the real signature-verifying handler when STRIPE_WEBHOOK_SECRET is set", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_value";
    process.env.STRIPE_SECRET_KEY = "sk_test_value";

    const app = await buildApp();
    const handler = getRouteHandler(app, "/api/stripe/webhook", "post");
    expect(handler).toBeTruthy();

    const res = makeRes();
    // No signature header → real handler returns 400 ("Missing signature").
    await handler!(
      { headers: {}, body: Buffer.from("{}") } as unknown as Request,
      res as unknown as Response,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Missing signature" });
  });
});
