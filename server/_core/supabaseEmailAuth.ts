import { TRPCError } from "@trpc/server";

const AUTH_TIMEOUT_MS = 10_000;

type SupabaseAuthConfig = {
  baseUrl: string;
  anonKey: string;
};

function normalizeSupabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error("Supabase URL must use HTTPS");
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Auth is misconfigured. Please contact support.",
    });
  }
}

export function getSupabaseAuthConfig(): SupabaseAuthConfig {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() ?? "";

  if (!supabaseUrl || !anonKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Auth not configured",
    });
  }

  return {
    baseUrl: normalizeSupabaseUrl(supabaseUrl),
    anonKey,
  };
}

export async function fetchSupabaseAuth(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { baseUrl, anonKey } = getSupabaseAuthConfig();

  try {
    return await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "Authentication service is temporarily unavailable. Please try again.",
    });
  }
}
