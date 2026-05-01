/**
 * JWT Session Infrastructure — used by Supabase Auth.
 *
 * Keeps the existing session format (HS256-signed JWT with openId/name)
 * so the rest of the codebase (context.ts, sdk.ts) continues to work.
 *
 * The signing secret is JWT_SECRET from env.
 */
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export type SessionPayload = {
  openId: string;
  name: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

export async function signJWT(
  payload: SessionPayload,
  expiresInMs = ONE_YEAR_MS
): Promise<string> {
  const issuedAt = Date.now();
  const exp = Math.floor((issuedAt + expiresInMs) / 1000);
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setIssuedAt(issuedAt)
    .sign(getSecret());
}

export async function verifyJWT(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    const openId = payload.openId as string;
    const name = payload.name as string | undefined;
    if (!openId) return null;
    return { openId, name: name ?? "" };
  } catch {
    return null;
  }
}

// Re-export constants used by session middleware
export { COOKIE_NAME, ONE_YEAR_MS };
