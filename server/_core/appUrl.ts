const DEFAULT_PUBLIC_APP_URL = "https://appraise-ai.manus.space";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getPublicAppUrl(): string {
  const configured = [
    process.env.PUBLIC_APP_URL,
    process.env.APP_BASE_URL,
    process.env.VITE_PUBLIC_APP_URL,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  return normalizeBaseUrl(configured ?? DEFAULT_PUBLIC_APP_URL);
}

export function buildAppUrl(path: string = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}${normalizedPath}`;
}
