import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Build the login page URL. Uses our own email+password login page.
 * No OAuth provider IDs or secrets required.
 */
export const getLoginUrl = (returnTo?: string) => {
  if (typeof window === "undefined") {
    throw new Error("getLoginUrl must be called in a browser context");
  }

  const dest = returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const safeDest = dest.startsWith("/") && !dest.startsWith("//") ? dest : "/";
  return `/login${safeDest !== "/" ? `?returnTo=${encodeURIComponent(safeDest)}` : ""}`;
};
