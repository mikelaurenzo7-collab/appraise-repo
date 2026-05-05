export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // AI Providers — Anthropic Claude + OpenAI work as a dual-review appraisal pipeline when both are configured.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.2",
  // Supabase Auth
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // Maps — canonical key name is GOOGLE_MAPS_API_KEY; GOOGLE_MAPS_PLATFORM_API_KEY is a legacy alias
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN ?? "",
  googleMapsApiKey:
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.GOOGLE_MAPS_PLATFORM_API_KEY ??
    "",
  googleCseApiKey: process.env.GOOGLE_CSE_API_KEY ?? "",
  googleCseCx: process.env.GOOGLE_CSE_CX ?? "",
  realieApiKey: process.env.REALIE_API_KEY ?? "",
  // Owner identity (for admin escalation). Maps to the Supabase user id
  // (openId) of the workspace owner. MUST be set in production — if absent,
  // no user will ever be promoted to admin on first login.
  ownerOpenId: process.env.OWNER_OPEN_ID ?? process.env.OWNER_ID ?? undefined,
  // App base URL — used for email links and OAuth callbacks.
  appBaseUrl:
    process.env.APP_BASE_URL ??
    process.env.PUBLIC_APP_URL ??
    "https://appraise-repo.vercel.app",
};
