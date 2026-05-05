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
  // Refuse to sign or verify with an empty / trivial secret. An empty
  // HS256 secret would silently treat any tampered token as "valid" —
  // no JWT signature can ever be empty-keyed safely. We require ≥32 bytes
  // (the minimum HS256 deems safe per RFC 7518). Production startup
  // already validates JWT_SECRET via validateEnvOrExit; this is the
  // defense-in-depth layer for dev / test misconfiguration.
  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET is too short or unset (length ${secret.length}). ` +
        "Set JWT_SECRET to a random ≥32-character secret. " +
        "Generate one with: openssl rand -base64 32"
    );
  }
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
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .sign(getSecret());
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
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
