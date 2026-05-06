import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default(""),
  JWT_SECRET: z.string().default(""),

  // AI Providers
  ANTHROPIC_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.2"),

  // Supabase Auth
  SUPABASE_URL: z.string().default(""),
  SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Maps & Property Data
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_PLATFORM_API_KEY: z.string().optional(),
  GOOGLE_CSE_API_KEY: z.string().optional(),
  GOOGLE_CSE_CX: z.string().optional(),
  REALIE_API_KEY: z.string().optional(),

  // Owner identity
  OWNER_OPEN_ID: z.string().optional(),
  OWNER_ID: z.string().optional(),

  // App Config
  PORT: z.string().default("3000").transform(Number),
  APP_BASE_URL: z.string().optional(),
  PUBLIC_APP_URL: z.string().optional(),

  // Stripe (required in production)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // AWS (required in production)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().optional(),
});

/**
 * Validates and exports environment variables.
 * Fails fast if required variables are missing in production.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  const isProd = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const missing = Object.keys(errors);

    if (!isTest) {
      console.warn("⚠️ Some environment variables are missing or invalid:", missing.join(", "));
    }

    // Use defaults where possible, otherwise use what we have
    // Important: we use parse here to ensure the return type is correct (z.infer<typeof envSchema>)
    return envSchema.parse({
      ...process.env,
      // Ensure defaults for critical ones if they're completely missing from process.env
      DATABASE_URL: process.env.DATABASE_URL || "",
      JWT_SECRET: process.env.JWT_SECRET || "",
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    });
  }

  const data = result.data;

  // Validate required production environment variables AFTER parsing
  // This check must happen outside the `if (!result.success)` block because
  // fields with `.default("")` will always pass Zod validation with empty strings
  if (isProd) {
    const requiredInProd: { key: keyof typeof data; name: string }[] = [
      { key: "DATABASE_URL", name: "DATABASE_URL" },
      { key: "JWT_SECRET", name: "JWT_SECRET" },
      { key: "SUPABASE_URL", name: "SUPABASE_URL" },
      { key: "SUPABASE_ANON_KEY", name: "SUPABASE_ANON_KEY" },
      { key: "ANTHROPIC_API_KEY", name: "ANTHROPIC_API_KEY" },
    ];

    const missingRequired = requiredInProd
      .filter(({ key }) => !data[key])
      .map(({ name }) => name);

    if (missingRequired.length > 0) {
      console.error("❌ Missing required production environment variables:", missingRequired.join(", "));
      throw new Error(`Missing required production environment variables: ${missingRequired.join(", ")}`);
    }
  }

  return data;
}

const validatedEnv = validateEnv();

export const ENV = {
  nodeEnv: validatedEnv.NODE_ENV,
  isProduction: validatedEnv.NODE_ENV === "production",
  databaseUrl: validatedEnv.DATABASE_URL,
  cookieSecret: validatedEnv.JWT_SECRET,

  anthropicApiKey: validatedEnv.ANTHROPIC_API_KEY,
  openaiApiKey: validatedEnv.OPENAI_API_KEY ?? "",
  openaiModel: validatedEnv.OPENAI_MODEL,

  supabaseUrl: validatedEnv.SUPABASE_URL,
  supabaseAnonKey: validatedEnv.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: validatedEnv.SUPABASE_SERVICE_ROLE_KEY ?? "",

  mapboxAccessToken: validatedEnv.MAPBOX_ACCESS_TOKEN ?? "",
  googleMapsApiKey: validatedEnv.GOOGLE_MAPS_API_KEY ?? validatedEnv.GOOGLE_MAPS_PLATFORM_API_KEY ?? "",
  googleCseApiKey: validatedEnv.GOOGLE_CSE_API_KEY ?? "",
  googleCseCx: validatedEnv.GOOGLE_CSE_CX ?? "",
  realieApiKey: validatedEnv.REALIE_API_KEY ?? "",

  ownerOpenId: validatedEnv.OWNER_OPEN_ID ?? validatedEnv.OWNER_ID,

  appBaseUrl: validatedEnv.APP_BASE_URL ?? validatedEnv.PUBLIC_APP_URL ?? "https://appraise-repo.vercel.app",
  port: validatedEnv.PORT,

  stripeSecretKey: validatedEnv.STRIPE_SECRET_KEY,
  stripeWebhookSecret: validatedEnv.STRIPE_WEBHOOK_SECRET,

  awsAccessKeyId: validatedEnv.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: validatedEnv.AWS_SECRET_ACCESS_KEY,
  awsRegion: validatedEnv.AWS_REGION,
  s3Bucket: validatedEnv.S3_BUCKET,

  sentryDsn: validatedEnv.SENTRY_DSN,
};
