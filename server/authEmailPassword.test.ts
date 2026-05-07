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
    // When email confirmation is enabled, Supabase /auth/v1/signup returns a
    // bare User object (no access_token, no session wrapper).
    mockSupabase({
      id: "pending-user",
      email: "pending@example.com",
      confirmation_sent_at: "2024-01-01T00:00:00Z",
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

  it("creates an app session after signup when Supabase auto-confirms (no email confirmation)", async () => {
    // When email confirmation is disabled, Supabase /auth/v1/signup returns a
    // full Session: { access_token, refresh_token, user: {...}, ... } — there
    // is no top-level `session` wrapper.
    mockSupabase({
      access_token: "supabase-access-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "supabase-refresh-token",
      user: { id: "confirmed-user", email: "confirmed@example.com" },
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

  it("resendConfirmation always succeeds without leaking whether the email is registered", async () => {
    // Even when Supabase reports an error (e.g. user not found), we return
    // success: true so callers cannot enumerate registered accounts.
    const fetchMock = mockSupabase({ msg: "user not found" }, false);

    const res = await (await caller()).auth.resendConfirmation({
      email: "anyone@example.com",
    });

    expect(res).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://supabase.test/auth/v1/resend",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ type: "signup", email: "anyone@example.com" }),
      })
    );
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

  it("returns a friendly auth service error when Supabase cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch
    );

    await expect(
      (await caller()).auth.signin({
        email: "owner@example.com",
        password: "secret123",
      })
    ).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Authentication service is temporarily unavailable. Please try again.",
    });
  });

  it("validates Supabase auth configuration before calling signup", async () => {
    process.env.SUPABASE_URL = "not-a-url";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(
      (await caller()).auth.signup({
        email: "owner@example.com",
        password: "secret123",
        name: "Owner Name",
      })
    ).rejects.toMatchObject({
      message: "Auth is misconfigured. Please contact support.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces plain-text Supabase signup failures without exposing JSON parser errors", async () => {
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
    ).rejects.toMatchObject({ message: "A server error occurred" });
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
