import { encodeManusAuthState, sanitizeReturnTo } from "@shared/manusAuth";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
function getCurrentReturnTo() {
  if (typeof window === "undefined") {
    return "/";
  }

  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return sanitizeReturnTo(nextPath) ?? "/";
}

export const getLoginUrl = (returnTo?: string) => {
  if (typeof window === "undefined") {
    throw new Error("getLoginUrl must be called in a browser context");
  }

  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = encodeManusAuthState({
    redirectUri,
    returnTo: sanitizeReturnTo(returnTo) ?? getCurrentReturnTo(),
  });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
