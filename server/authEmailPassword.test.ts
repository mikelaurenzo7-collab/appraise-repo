import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

const originalEnv = { ...process.env };

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function makeCtx(cookies: CookieCall[] = []): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "http",
      headers: { "x-forwarded-proto": "https" },
    } as TrpcContext["req"],
    res: {
      cookie: (
        name: string,
        value: string,
        options: Record<string, unknown>
      ) => {
        cookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function mockSupabase(payload: unknown, ok = true) {
  const body = JSON.stringify(payload);
  const fetchMock = vi.fn(async () => ({
    ok,
    text: async () => body,
    json: async () => payload,
  })) as unknown as typeof fetch;
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock as unknown as ReturnType<typeof vi.fn>;
}

async function caller(cookies: CookieCall[] = []) {
  const { appRouter } = await import("./routers");
  return appRouter.createCaller(makeCtx(cookies));
}

describe("email/password auth", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://supabase.test",
      SUPABASE_ANON_KEY: "anon-key",
      JWT_SECRET: "x".repeat(40),
      DATABASE_URL: "",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("signs in with normalized email and sets the app session cookie", async () => {
    const fetchMock = mockSupabase({
      user: {
        id: "user-123",
        email: "owner@example.com",
        user_metadata: { full_name: "Owner Name" },
      },
    });
    const cookies: CookieCall[] = [];

    const res = await (
      await caller(cookies)
    ).auth.signin({
      email: "  OWNER@Example.COM ",
      password: "secret123",
    });

    expect(res).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.test/auth/v1/token?grant_type=password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "owner@example.com",
          password: "secret123",
        }),
      })
    );
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: COOKIE_NAME,
      options: { httpOnly: true, path: "/", sameSite: "lax", secure: true },
    });
    expect(cookies[0].value).toBeTruthy();
  });

  it("does not create an app session when signup requires email confirmation", async () => {
    mockSupabase({
      user: { id: "pending-user", email: "pending@example.com" },
      session: null,
    });
    const cookies: CookieCall[] = [];

    const res = await (
      await caller(cookies)
    ).auth.signup({
      email: "Pending@Example.com",
      password: "secret123",
      name: "Pending Owner",
    });

    expect(res).toEqual({ success: true, requiresConfirmation: true });
    expect(cookies).toHaveLength(0);
  });

  it("creates an app session after signup when Supabase returns a session", async () => {
    mockSupabase({
      user: { id: "confirmed-user", email: "confirmed@example.com" },
      session: { access_token: "supabase-session" },
    });
    const cookies: CookieCall[] = [];

    const res = await (
      await caller(cookies)
    ).auth.signup({
      email: "Confirmed@Example.com",
      password: "secret123",
      name: "Confirmed Owner",
    });

    expect(res).toEqual({ success: true, requiresConfirmation: false });
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe(COOKIE_NAME);
  });

  it("surfaces Supabase auth error messages", async () => {
    mockSupabase({ message: "Email not confirmed" }, false);

    await expect(
      (await caller()).auth.signin({
        email: "owner@example.com",
        password: "secret123",
      })
    ).rejects.toMatchObject({ message: "Email not confirmed" });
  });

  it("does not expose JSON parser errors when Supabase signup returns plain text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => "A server error occurred",
      })) as unknown as typeof fetch
    );

    await expect(
      (await caller()).auth.signup({
        email: "owner@example.com",
        password: "secret123",
        name: "Owner Name",
      })
    ).rejects.toMatchObject({ message: "Registration failed" });
  });

  it("does not expose JSON parser errors when Supabase signup success is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "A server error occurred",
      })) as unknown as typeof fetch
    );

    await expect(
      (await caller()).auth.signup({
        email: "owner@example.com",
        password: "secret123",
        name: "Owner Name",
      })
    ).rejects.toMatchObject({
      message: "Registration failed. Please try again.",
    });
  });
});
