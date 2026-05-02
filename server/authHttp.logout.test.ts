import { describe, expect, it, beforeAll } from "vitest";
import express from "express";

// Vital regression: the HTTP /api/auth/logout endpoint must clear the
// session cookie with the SAME options used when the cookie was set
// (sameSite, secure, httpOnly, path=/). Otherwise the browser silently
// ignores the clear directive — leaving stale sessions behind.
//
// Without these flags the tRPC auth.logout mutation would clear
// correctly but a direct POST /api/auth/logout (used in some flows)
// would not, producing inconsistent logout behaviour.

describe("HTTP /api/auth/logout", () => {
  let app: express.Express;

  beforeAll(async () => {
    // Provide minimum env so registerAuthRoutes' module-level guards
    // do not throw during import.
    process.env.SUPABASE_URL ??= "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
    const { registerAuthRoutes } = await import("./_core/supabaseAuth");
    app = express();
    app.set("trust proxy", 1);
    registerAuthRoutes(app);
  });

  it("clears cookie with sameSite=lax, secure (when behind https proxy), httpOnly, path=/", async () => {
    const captured: { name: string; value: string; options: Record<string, unknown> } = {
      name: "",
      value: "",
      options: {},
    };
    const req = {
      method: "POST",
      url: "/api/auth/logout",
      headers: { "x-forwarded-proto": "https", host: "appraise.example.com" },
      query: {},
      body: {},
      get: (h: string) => (h.toLowerCase() === "host" ? "appraise.example.com" : undefined),
      protocol: "http",
      app,
    };
    const res = {
      headersSent: false,
      statusCode: 200,
      headers: {} as Record<string, string>,
      _body: undefined as unknown,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      getHeader(k: string) { return this.headers[k]; },
      removeHeader(k: string) { delete this.headers[k]; },
      cookie() { return this; },
      clearCookie(name: string, options: Record<string, unknown>) {
        captured.name = name;
        captured.options = options;
        return this;
      },
      status(c: number) { this.statusCode = c; return this; },
      json(body: unknown) { this._body = body; this.headersSent = true; return this; },
      end() { this.headersSent = true; return this; },
      redirect() { this.headersSent = true; return this; },
    };

    // Execute the registered route
    type AppLike = { _router?: { stack: Array<{ route?: { path: string; stack: Array<{ method: string; handle: (rq: unknown, rs: unknown, nx?: unknown) => unknown }> } }> } };
    const stack = (app as unknown as AppLike)._router?.stack ?? [];
    const layer = stack.find((l) => l.route?.path === "/api/auth/logout");
    expect(layer, "POST /api/auth/logout route should be registered").toBeTruthy();

    const handler = layer!.route!.stack.find((s) => s.method === "post")!.handle;
    await handler(req as unknown, res as unknown);

    expect(captured.name).toBeTruthy();
    expect(captured.options).toMatchObject({
      sameSite: "lax",
      secure: true,
      httpOnly: true,
      path: "/",
      maxAge: -1,
    });
  });
});
