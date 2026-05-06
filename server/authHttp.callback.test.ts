import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    upsertUser: vi.fn(async () => undefined),
  };
});

const originalEnv = { ...process.env };

type AppLike = {
  _router?: {
    stack: Array<{
      route?: {
        path: string;
        stack: Array<{ method: string; handle: (req: unknown, res: unknown) => unknown }>;
      };
    }>;
  };
};

function getRouteHandler(app: express.Express, path: string, method: string) {
  const stack = (app as unknown as AppLike)._router?.stack ?? [];
  const layer = stack.find((entry) => entry.route?.path === path);
  expect(layer, `${method.toUpperCase()} ${path} route should be registered`).toBeTruthy();
  return layer!.route!.stack.find((entry) => entry.method === method)?.handle;
}

function stubFetch(response: { ok: boolean; status?: number; text: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      text: async () => response.text,
    })) as unknown as typeof fetch
  );
}

async function invokeCallback(query: Record<string, string>) {
  const { registerAuthRoutes } = await import("./_core/supabaseAuth");
  const app = express();
  app.set("trust proxy", 1);
  registerAuthRoutes(app);

  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> =
    [];
  const response = {
    headersSent: false,
    statusCode: 200,
    body: undefined as unknown,
    redirectArgs: [] as unknown[],
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies.push({ name, value, options });
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    redirect(...args: unknown[]) {
      this.redirectArgs = args;
      this.headersSent = true;
      return this;
    },
  };

  const handler = getRouteHandler(app, "/api/auth/callback", "get");
  expect(handler).toBeTruthy();

  await handler!(
    {
      query,
      headers: { "x-forwarded-proto": "https", host: "appraise.example.com" },
      protocol: "http",
      app,
    },
    response
  );

  return { response, cookies };
}

describe("HTTP /api/auth/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://supabase.test",
      SUPABASE_ANON_KEY: "anon-key",
      APP_BASE_URL: "https://appraise.example.com",
      JWT_SECRET: "x".repeat(40),
      DATABASE_URL: "",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("falls back to / when callback next is not a safe relative path", async () => {
    stubFetch({
      ok: true,
      text: JSON.stringify({
        user: {
          id: "user-123",
          email: "owner@example.com",
          user_metadata: { full_name: "Owner Name" },
        },
      }),
    });

    const { response, cookies } = await invokeCallback({
      code: "pkce-code",
      next: "https://evil.example/phish",
    });

    expect(cookies).toHaveLength(1);
    expect(response.redirectArgs).toEqual([302, "/"]);
  });

  it("returns a fallback error when Supabase callback failure is plain text", async () => {
    stubFetch({
      ok: false,
      status: 400,
      text: "A server error occurred",
    });

    const { response } = await invokeCallback({ code: "pkce-code" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: "Supabase auth exchange failed" });
  });

  it("returns a fallback error when Supabase callback success is malformed", async () => {
    stubFetch({
      ok: true,
      text: "A server error occurred",
    });

    const { response } = await invokeCallback({ code: "pkce-code" });

    expect(response.statusCode).toBe(502);
    expect(response.body).toEqual({ error: "Supabase auth exchange failed" });
  });
});
