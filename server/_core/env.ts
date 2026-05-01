export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // AI Providers — Gemini & Anthropic (replacing Manus Forge)
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  // Supabase Auth
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  // Maps
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN ?? "",
  googleMapsApiKey: process.env.GOOGLE_MAPS_PLATFORM_API_KEY ?? "",
  googleCseApiKey: process.env.GOOGLE_CSE_API_KEY ?? "",
  googleCseCx: process.env.GOOGLE_CSE_CX ?? "",
  realieApiKey: process.env.REALIE_API_KEY ?? "",
  // Owner identity (for admin escalation). Maps to the Supabase user id
  // (openId) of the workspace owner. MUST be set in production — if absent,
  // no user will ever be promoted to admin on first login.
  ownerOpenId: process.env.OWNER_OPEN_ID ?? process.env.OWNER_ID ?? undefined,
  // Legacy Manus OAuth SDK fields — kept as empty strings so the old
  // _core/sdk.ts module still type-checks. The Supabase auth path in
  // _core/supabaseAuth.ts is the real auth surface.
  oAuthServerUrl: process.env.MANUS_OAUTH_SERVER_URL ?? "",
  appId: process.env.MANUS_APP_ID ?? "",
};
