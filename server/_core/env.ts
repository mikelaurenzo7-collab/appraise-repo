export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  googleCseApiKey: process.env.GOOGLE_CSE_API_KEY ?? "",
  googleCseCx: process.env.GOOGLE_CSE_CX ?? "",
  realieApiKey: process.env.REALIE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // Optional: set ANTHROPIC_API_KEY to unlock Claude Opus 4.7 features
  // (adaptive thinking, vision with prompt caching, Batch API).
  // When absent, all services fall back to the Forge/Gemini path.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
};
