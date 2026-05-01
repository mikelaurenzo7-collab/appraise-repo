/**
 * Supabase Auth — replaces Manus OAuth for Vercel deployment.
 *
 * Keeps the existing JWT session infrastructure (jose-signed cookies via COOKIE_NAME)
 * but swaps the OAuth token exchange for Supabase Auth's PKCE flow.
 *
 * Flow:
 *  1. Browser → GET /api/auth/login?returnTo=/dashboard
 *     → redirects to Supabase Auth (email, Google, GitHub, etc.)
 *  2. Supabase redirects to GET /api/auth/callback?code=xxx&state=xxx
 *     → exchanges code for Supabase session
 *     → creates our own JWT session cookie (same as before)
 *     → stores/updates user in DB
 *     → redirects to returnTo
 */
import type { Express, Request, Response } from "express";
import { signJWT, verifyJWT, COOKIE_NAME, ONE_YEAR_MS } from "./auth";
import { getSessionCookieOptions } from "./cookies";
import * as db from "../db";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[Startup] Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY. " +
    "Set them in your Vercel project settings or .env file."
  );
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Initiate Supabase Auth login flow.
 * Redirects to Supabase Auth page (email magic link, Google, GitHub, etc.)
 */
export function registerAuthRoutes(app: Express) {
  // ── Login initiation ──────────────────────────────────────────────────────
  // GET /api/auth/login?returnTo=/dashboard
  // Redirects to Supabase Auth (you configure which providers in Supabase dashboard)
  app.get("/api/auth/login", (req: Request, res: Response) => {
    const returnTo =
      (typeof req.query.returnTo === "string" && req.query.returnTo) ||
      "/";
    // Validate it's a safe path
    if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
      res.redirect(302, "/");
      return;
    }

    const redirectTo = `${process.env.APP_BASE_URL}/api/auth/callback`;
    const params = new URLSearchParams({
      redirectTo,
      // Encode where to send the user after login
      ...(returnTo !== "/" && { next: returnTo }),
    });

    // Redirect to Supabase Auth page — you style this in Supabase dashboard
    // or use your own hosted auth page that calls supabase.auth.signIn*
    const supabaseAuthUrl = `${SUPABASE_URL}/auth/v1/authorize?${params}`;
    res.redirect(302, supabaseAuthUrl);
  });

  // ── OAuth / Auth callback ─────────────────────────────────────────────────
  // Supabase (or your custom auth page) redirects here after login attempt
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const next = getQueryParam(req, "next") ?? "/";

    // PKCE code exchange — exchange auth code for Supabase session
    if (!code) {
      console.error("[Auth] No code in callback");
      res.status(400).json({ error: "missing code" });
      return;
    }

    try {
      // Exchange code for Supabase session
      const sbRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          code,
          grant_type: "pkce",
        }),
      });

      if (!sbRes.ok) {
        const err = await sbRes.text();
        console.error("[Auth] Supabase token exchange failed:", err);
        res.status(500).json({ error: "auth exchange failed" });
        return;
      }

      const sbSession = await sbRes.json();
      const supabaseUser = sbSession.user;
      if (!supabaseUser) {
        res.status(400).json({ error: "no user in supabase session" });
        return;
      }

      // Use Supabase user.id as the openId (stable identifier)
      const openId = supabaseUser.id;
      const email = supabaseUser.email ?? null;
      const name = supabaseUser.user_metadata?.full_name ??
        supabaseUser.user_metadata?.name ??
        null;
      const loginMethod = inferLoginMethod(supabaseUser);

      // Upsert user into our DB
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod,
        lastSignedIn: new Date(),
      });

      // Create our own JWT session (keeps the rest of the app unchanged)
      const sessionToken = await signJWT({ openId, name: name ?? "" });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, next);
    } catch (error) {
      console.error("[Auth] Callback failed:", error);
      res.status(500).json({ error: "auth callback failed" });
    }
  });

  // ── Logout ───────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  });
}

function inferLoginMethod(sbUser: Record<string, unknown>): string | null {
  const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
  if (meta?.provider === "google") return "google";
  if (meta?.provider === "github") return "github";
  if (meta?.provider === "apple") return "apple";
  if (meta?.provider === "email") return "email";
  return sbUser.confirm_email === false ? "magic_link" : "email";
}
