import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Build the Supabase Auth login URL.
 * The backend handles the actual OAuth exchange at /api/auth/callback.
 */
export const getLoginUrl = (returnTo?: string) => {
  if (typeof window === "undefined") {
    throw new Error("getLoginUrl must be called in a browser context");
  }

  const dest = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const safeDest = dest.startsWith("/") && !dest.startsWith("//") ? dest : "/";
  const redirectUri = `${window.location.origin}/api/auth/callback`;

  // Point to our backend auth route — it redirects to Supabase
  return `/api/auth/login?returnTo=${encodeURIComponent(safeDest)}`;
};
