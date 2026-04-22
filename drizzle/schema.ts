import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Stripe integration
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Property analysis submissions
 */
export const propertySubmissions = mysqlTable("property_submissions", {
  id: int("id").autoincrement().primaryKey(),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),

  // Property details
  propertyType: mysqlEnum("propertyType", ["residential", "multi-family", "commercial", "agricultural", "industrial", "land", "unknown"]).default("unknown"),
  squareFeet: int("squareFeet"),
  lotSize: int("lotSize"),
  yearBuilt: int("yearBuilt"),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),

  // Analysis results
  assessedValue: int("assessedValue"),
  marketValue: int("marketValue"),
  potentialSavings: int("potentialSavings"),
  appealStrengthScore: int("appealStrengthScore"),

  // Jurisdiction info
  county: varchar("county", { length: 100 }),
  assessor: varchar("assessor", { length: 255 }),
  appealDeadline: timestamp("appealDeadline"),

  // Status tracking
  status: mysqlEnum("status", ["pending", "analyzing", "analyzed", "contacted", "appeal-filed", "hearing-scheduled", "won", "lost", "withdrawn", "archived"]).default("pending").notNull(),
  filingMethod: mysqlEnum("filingMethod", ["poa", "pro-se", "none"]),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertySubmission = typeof propertySubmissions.$inferSelect;
export type InsertPropertySubmission = typeof propertySubmissions.$inferInsert;

/**
 * Property analysis results
 */
export const propertyAnalysis = mysqlTable("property_analysis", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),

  // Raw API data
  lightboxData: text("lightboxData"),
  rentcastData: text("rentcastData"),
  regrindData: text("regrindData"),
  attomData: text("attomData"),

  // Processed analysis
  comparableSales: text("comparableSales"),
  marketValueEstimate: int("marketValueEstimate"),
  assessmentGap: int("assessmentGap"),
  appealStrengthFactors: text("appealStrengthFactors"),
  recommendedApproach: mysqlEnum("recommendedApproach", ["poa", "pro-se", "not-recommended"]),

  // LLM-generated content
  executiveSummary: text("executiveSummary"),
  valuationJustification: text("valuationJustification"),
  nextSteps: text("nextSteps"),

  // Report generation
  reportUrl: varchar("reportUrl", { length: 500 }),
  reportGeneratedAt: timestamp("reportGeneratedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyAnalysis = typeof propertyAnalysis.$inferSelect;
export type InsertPropertyAnalysis = typeof propertyAnalysis.$inferInsert;

/**
 * Appeal outcomes — tracks the result of every filed appeal
 * This is the core model-improvement feedback loop
 */
export const appealOutcomes = mysqlTable("appeal_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),

  // Outcome details
  outcome: mysqlEnum("outcome", ["won", "lost", "settled", "withdrawn", "pending-hearing"]).notNull(),
  originalAssessedValue: int("originalAssessedValue"),
  finalAssessedValue: int("finalAssessedValue"),
  reductionAmount: int("reductionAmount"),
  annualTaxSavings: int("annualTaxSavings"),
  contingencyFeeEarned: decimal("contingencyFeeEarned", { precision: 10, scale: 2 }),

  // Timeline
  filedAt: timestamp("filedAt"),
  hearingDate: timestamp("hearingDate"),
  resolvedAt: timestamp("resolvedAt"),
  resolutionDays: int("resolutionDays"),

  // Jurisdiction
  county: varchar("county", { length: 100 }),
  state: varchar("state", { length: 2 }),
  boardName: varchar("boardName", { length: 255 }),

  // Filing details
  filingMethod: mysqlEnum("filingMethod", ["poa", "pro-se"]),
  groundsForAppeal: text("groundsForAppeal"),
  evidenceStrength: int("evidenceStrength"), // 0-100 score at time of filing

  // Notes
  adminNotes: text("adminNotes"),
  hearingNotes: text("hearingNotes"),

  // Stripe payment tracking
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  contingencyFeePaid: decimal("contingencyFeePaid", { precision: 10, scale: 2 }),
  paidAt: timestamp("paidAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppealOutcome = typeof appealOutcomes.$inferSelect;
export type InsertAppealOutcome = typeof appealOutcomes.$inferInsert;

/**
 * Activity logs — persistent audit trail for all system events
 */
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId"),

  type: varchar("type", { length: 64 }).notNull(),
  actor: mysqlEnum("actor", ["system", "user", "admin"]).default("system").notNull(),
  actorId: int("actorId"),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON
  status: mysqlEnum("status", ["success", "warning", "error"]).default("success").notNull(),
  durationMs: int("durationMs"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

/**
 * API response cache — reduces redundant API calls and costs
 */
export const apiCache = mysqlTable("api_cache", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 64 }).notNull(), // lightbox, rentcast, regrid, attom
  responseData: text("responseData").notNull(), // JSON
  expiresAt: timestamp("expiresAt").notNull(),
  hitCount: int("hitCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiCache = typeof apiCache.$inferSelect;
export type InsertApiCache = typeof apiCache.$inferInsert;

/**
 * Property photos — user-uploaded images for appraisal reports
 * Critical for winning appeals
 */
export const propertyPhotos = mysqlTable("property_photos", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  photoUrl: varchar("photoUrl", { length: 500 }).notNull(), // S3 URL
  photoKey: varchar("photoKey", { length: 255 }).notNull(), // S3 key for reference
  caption: text("caption"), // User-provided description
  category: mysqlEnum("category", [
    "exterior",
    "interior",
    "damage",
    "condition",
    "comparable",
    "neighborhood",
    "other"
  ]).default("other"),
  displayOrder: int("displayOrder").default(0), // For sorting in report
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = typeof propertyPhotos.$inferInsert;

/**
 * Report preferences — customization for each appraisal report
 */
export const reportPreferences = mysqlTable("report_preferences", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull().unique(),
  // Valuation methods to include
  includeCostApproach: mysqlEnum("includeCostApproach", ["yes", "no", "auto"]).default("auto"),
  includeSalesComparison: mysqlEnum("includeSalesComparison", ["yes", "no", "auto"]).default("auto"),
  includeIncomeApproach: mysqlEnum("includeIncomeApproach", ["yes", "no", "auto"]).default("auto"),
  // Strategy preferences
  recommendedStrategy: mysqlEnum("recommendedStrategy", ["poa", "pro-se", "both", "auto"]).default("auto"),
  emphasizePhotos: mysqlEnum("emphasizePhotos", ["yes", "no"]).default("yes"),
  includeMarketAnalysis: mysqlEnum("includeMarketAnalysis", ["yes", "no"]).default("yes"),
  includeComparableProperties: mysqlEnum("includeComparableProperties", ["yes", "no"]).default("yes"),
  // Report customization
  additionalNotes: text("additionalNotes"), // Custom notes to include
  targetAudience: mysqlEnum("targetAudience", ["assessor", "board", "attorney", "owner"]).default("board"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportPreference = typeof reportPreferences.$inferSelect;
export type InsertReportPreference = typeof reportPreferences.$inferInsert;

/**
 * Report generation jobs — async PDF generation with 24-hour SLA
 */
export const reportJobs = mysqlTable("report_jobs", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  userId: int("userId").notNull(),
  
  // Job status
  status: mysqlEnum("status", ["queued", "generating", "completed", "failed", "expired"]).default("queued").notNull(),
  
  // Result
  reportUrl: varchar("reportUrl", { length: 500 }),
  reportKey: varchar("reportKey", { length: 255 }),
  sizeBytes: int("sizeBytes"),
  
  // Error tracking
  errorMessage: text("errorMessage"),
  
  // SLA tracking
  queuedAt: timestamp("queuedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt").notNull(), // 24 hours from queuedAt
  
  // Retry logic
  retryCount: int("retryCount").default(0).notNull(),
  maxRetries: int("maxRetries").default(3).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportJob = typeof reportJobs.$inferSelect;
export type InsertReportJob = typeof reportJobs.$inferInsert;


/**
 * County-specific filing information
 * Stores deadlines, forms, portals, and procedures for each county
 */
export const counties = mysqlTable("counties", {
  id: int("id").autoincrement().primaryKey(),
  state: varchar("state", { length: 2 }).notNull(), // TX, IL, NJ, etc.
  countyName: varchar("countyName", { length: 100 }).notNull(), // Travis County
  countyCode: varchar("countyCode", { length: 10 }), // Optional FIPS code

  // Filing deadlines (in days from assessment notice)
  poaDeadlineDays: int("poaDeadlineDays"), // Days to file POA appeal
  proSeDeadlineDays: int("proSeDeadlineDays"), // Days to file pro se appeal

  // Filing methods
  hasOnlinePortal: boolean("hasOnlinePortal").default(false),
  portalUrl: varchar("portalUrl", { length: 500 }),
  acceptsEmail: boolean("acceptsEmail").default(false),
  acceptsMail: boolean("acceptsMail").default(false),
  acceptsInPerson: boolean("acceptsInPerson").default(false),

  // Pivot: pro-se automation eligibility. Populated from legal review of each
  // jurisdiction. See drizzle migration 0008 for the scoping guarantees.
  poaEligible: boolean("poaEligible").default(false), // jurisdiction allows non-attorney rep AND portal is online
  onlinePortalOnly: boolean("onlinePortalOnly").default(false), // portal accepts electronic filing end-to-end
  pinOnlyLogin: boolean("pinOnlyLogin").default(false), // portal auth uses only a taxpayer PIN (no persistent account)
  filingWindowStart: varchar("filingWindowStart", { length: 10 }), // MM-DD annually
  filingWindowEnd: varchar("filingWindowEnd", { length: 10 }), // MM-DD annually

  // Delivery dispatcher. The filing queue picks the channel based on what
  // each county will actually accept. `unsupported` means we generate a
  // PDF packet only and do not charge the filing fee.
  preferredChannel: mysqlEnum("preferredChannel", [
    "portal",
    "mail_certified",
    "mail_first_class",
    "email",
    "unsupported",
  ]).default("mail_certified").notNull(),
  fallbackChannel: mysqlEnum("fallbackChannel", [
    "mail_certified",
    "mail_first_class",
    "email",
    "unsupported",
  ]).default("mail_certified"),
  // Structured mailing address for the assessor / ARB. Used by the Lob
  // letter API. Kept denormalized on the county row for simplicity.
  mailingAddressName: varchar("mailingAddressName", { length: 255 }),
  mailingAddressLine1: varchar("mailingAddressLine1", { length: 200 }),
  mailingAddressLine2: varchar("mailingAddressLine2", { length: 200 }),
  mailingAddressCity: varchar("mailingAddressCity", { length: 100 }),
  mailingAddressState: varchar("mailingAddressState", { length: 2 }),
  mailingAddressZip: varchar("mailingAddressZip", { length: 10 }),
  // Official intake email for counties that accept email filings.
  intakeEmail: varchar("intakeEmail", { length: 320 }),

  // Contact info
  assessorName: varchar("assessorName", { length: 255 }),
  assessorPhone: varchar("assessorPhone", { length: 20 }),
  assessorEmail: varchar("assessorEmail", { length: 320 }),
  arbName: varchar("arbName", { length: 255 }), // Appraisal Review Board name
  arbPhone: varchar("arbPhone", { length: 20 }),
  arbEmail: varchar("arbEmail", { length: 320 }),

  // Filing fees
  filingFee: int("filingFee"), // In cents
  hearingFee: int("hearingFee"), // In cents

  // ARB procedures
  hearingFormat: mysqlEnum("hearingFormat", ["in-person", "virtual", "hybrid", "mail"]).default("in-person"),
  hearingScheduleDays: int("hearingScheduleDays"), // Days between filing and hearing
  requiresAttorney: boolean("requiresAttorney").default(false),

  // Form templates
  formTemplateUrl: varchar("formTemplateUrl", { length: 500 }),
  formTemplateName: varchar("formTemplateName", { length: 255 }),

  // Additional notes
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type County = typeof counties.$inferSelect;
export type InsertCounty = typeof counties.$inferInsert;

/**
 * Per-county Playwright filing recipe. A recipe is a versioned JSON plan
 * the filing worker executes to submit a pro-se appeal on behalf of the
 * taxpayer, using credentials or a PIN the taxpayer provides for that run.
 */
export const filingRecipes = mysqlTable("filing_recipes", {
  id: int("id").autoincrement().primaryKey(),
  countyId: int("countyId").notNull(),
  version: int("version").notNull().default(1),
  portalUrl: varchar("portalUrl", { length: 500 }).notNull(),
  // JSON plan — see server/services/filingRecipeEngine.ts for the schema.
  steps: text("steps").notNull(),
  // Filing window — ISO dates, inclusive. When outside, recipe is ineligible.
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  // Set to true exactly once per county — the runner selects this recipe.
  active: boolean("active").default(true).notNull(),
  // Verification status. "draft" recipes have never been run against the
  // live portal; the runner must refuse to execute them in production.
  verificationStatus: mysqlEnum("verificationStatus", [
    "draft",
    "staging",
    "verified",
    "broken",
  ]).default("draft").notNull(),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilingRecipe = typeof filingRecipes.$inferSelect;
export type InsertFilingRecipe = typeof filingRecipes.$inferInsert;

/**
 * Scrivener authorization — the record that the taxpayer explicitly
 * authorized AppraiseAI to complete and submit a specific form on their
 * behalf. This is NOT a legal POA; it is a per-submission authorization
 * that documents consent, identity, and the exact text the user approved.
 */
export const scrivenerAuthorizations = mysqlTable("scrivener_authorizations", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  userId: int("userId"),
  typedName: varchar("typedName", { length: 255 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  // SHA-256 of the exact authorization text presented to the user.
  authorizationTextHash: varchar("authorizationTextHash", { length: 64 }).notNull(),
  // Full text stored once (not per-authorization) via the hash lookup, but
  // also kept here as a snapshot so we never lose the exact copy shown.
  authorizationText: text("authorizationText").notNull(),
  // Optional evidence from the frontend that the user reached the end of
  // the authorization pane.
  scrolledToEnd: boolean("scrolledToEnd").default(false).notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
});

export type ScrivenerAuthorization = typeof scrivenerAuthorizations.$inferSelect;
export type InsertScrivenerAuthorization = typeof scrivenerAuthorizations.$inferInsert;

/**
 * Filing job — one run of a recipe on behalf of one submission.
 * Distinct from POAFiling (legacy) and ReportJob (PDF generation).
 */
export const filingJobs = mysqlTable("filing_jobs", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  userId: int("userId").notNull(),
  // recipeId is nullable — only populated when delivery channel is "portal".
  recipeId: int("recipeId"),
  authorizationId: int("authorizationId").notNull(),

  // Which delivery channel was used for this specific job. Populated by
  // the dispatcher at job start, after eligibility resolution.
  deliveryChannel: mysqlEnum("deliveryChannel", [
    "portal",
    "mail_certified",
    "mail_first_class",
    "email",
  ]),

  status: mysqlEnum("status", [
    "pending",
    "processing",
    "awaiting_captcha",
    "completed",
    "failed",
    "cancelled",
  ]).default("pending").notNull(),

  // Taxpayer-provided inputs for this run (encrypted at rest in production;
  // for now stored as opaque JSON so we can wipe on completion).
  inputs: text("inputs"),

  // Unified filing artifacts. Exactly which fields are populated depends
  // on the delivery channel — e.g. portal runs populate the screenshot +
  // conf number, Lob mail runs populate mailTrackingNumber + lobLetterId.
  portalConfirmationNumber: varchar("portalConfirmationNumber", { length: 255 }),
  finalScreenshotKey: varchar("finalScreenshotKey", { length: 500 }),
  executionLogKey: varchar("executionLogKey", { length: 500 }),
  mailTrackingNumber: varchar("mailTrackingNumber", { length: 64 }),
  lobLetterId: varchar("lobLetterId", { length: 64 }),
  lobExpectedDeliveryDate: timestamp("lobExpectedDeliveryDate"),
  emailMessageId: varchar("emailMessageId", { length: 255 }),
  emailRecipient: varchar("emailRecipient", { length: 320 }),
  // Carrier-side lifecycle for mail filings. Separate from internal
  // `status` so we can track "mailed but awaiting delivery confirmation"
  // versus "delivered and signed-for at the county." Updated by the Lob
  // webhook and the reconciliation poll.
  deliveryStatus: mysqlEnum("deliveryStatus", [
    "pending",
    "in_transit",
    "delivered",
    "returned",
    "failed",
  ]).default("pending"),
  deliveryStatusUpdatedAt: timestamp("deliveryStatusUpdatedAt"),
  errorMessage: text("errorMessage"),

  // Lifecycle.
  queuedAt: timestamp("queuedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  retryCount: int("retryCount").default(0).notNull(),
  maxRetries: int("maxRetries").default(2).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilingJob = typeof filingJobs.$inferSelect;
export type InsertFilingJob = typeof filingJobs.$inferInsert;

/**
 * Refund requests — in the new flat-fee + money-back-guarantee model,
 * users whose appeals do not reduce their assessment can request a refund
 * of the software fee. An admin approves, then the webhook issues the
 * Stripe refund.
 */
export const refundRequests = mysqlTable("refund_requests", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  userId: int("userId").notNull(),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  amountCents: int("amountCents").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "denied", "refunded", "failed"]).default("pending").notNull(),
  reason: text("reason"),
  adminNotes: text("adminNotes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  decidedAt: timestamp("decidedAt"),
  decidedBy: int("decidedBy"),
  refundedAt: timestamp("refundedAt"),
  stripeRefundId: varchar("stripeRefundId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RefundRequest = typeof refundRequests.$inferSelect;
export type InsertRefundRequest = typeof refundRequests.$inferInsert;

/**
 * Stripe webhook idempotency — one row per processed event id.
 * Any incoming event whose id we've already seen is a no-op.
 */
export const stripeEventsProcessed = mysqlTable("stripe_events_processed", {
  eventId: varchar("eventId", { length: 255 }).primaryKey(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
});

export type StripeEventProcessed = typeof stripeEventsProcessed.$inferSelect;
export type InsertStripeEventProcessed = typeof stripeEventsProcessed.$inferInsert;

/**
 * POA filing records
 * Tracks appeals filed on behalf of users via Power of Attorney
 */
export const poaFilings = mysqlTable("poa_filings", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  countyId: int("countyId").notNull(),
  
  // Filing details
  status: mysqlEnum("status", ["pending", "filed", "acknowledged", "scheduled", "hearing-held", "decided", "failed"]).default("pending").notNull(),
  filingDate: timestamp("filingDate"),
  filedBy: varchar("filedBy", { length: 255 }), // Paralegal name
  
  // Hearing details
  hearingDate: timestamp("hearingDate"),
  hearingTime: varchar("hearingTime", { length: 20 }),
  hearingLocation: varchar("hearingLocation", { length: 255 }),
  hearingFormat: mysqlEnum("hearingFormat", ["in-person", "virtual", "mail"]),
  
  // Outcome
  outcome: mysqlEnum("outcome", ["won", "lost", "settled", "withdrawn", "pending"]).default("pending"),
  newAssessedValue: int("newAssessedValue"),
  assessmentReduction: int("assessmentReduction"),
  
  // Tracking
  confirmationNumber: varchar("confirmationNumber", { length: 100 }),
  portalUrl: varchar("portalUrl", { length: 500 }), // Link to county portal
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type POAFiling = typeof poaFilings.$inferSelect;
export type InsertPOAFiling = typeof poaFilings.$inferInsert;

/**
 * Pro Se filing guides
 * Tracks guided pro se filings with user progress
 */
export const proSeFilings = mysqlTable("pro_se_filings", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  countyId: int("countyId").notNull(),
  
  // Filing progress
  status: mysqlEnum("status", ["started", "forms-generated", "documents-sent", "filed", "hearing-scheduled", "completed", "abandoned"]).default("started").notNull(),
  
  // Generated documents
  formsPdfUrl: varchar("formsPdfUrl", { length: 500 }),
  checklistPdfUrl: varchar("checklistPdfUrl", { length: 500 }),
  instructionsPdfUrl: varchar("instructionsPdfUrl", { length: 500 }),
  
  // User progress
  formsSentDate: timestamp("formsSentDate"),
  userFiledDate: timestamp("userFiledDate"),
  confirmationReceived: boolean("confirmationReceived").default(false),
  
  // Coaching
  coachingEmailsSent: int("coachingEmailsSent").default(0),
  lastCoachingEmail: timestamp("lastCoachingEmail"),
  
  // Outcome
  hearingDate: timestamp("hearingDate"),
  outcome: mysqlEnum("outcome", ["won", "lost", "pending", "unknown"]).default("pending"),
  
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProSeFiling = typeof proSeFilings.$inferSelect;
export type InsertProSeFiling = typeof proSeFilings.$inferInsert;

/**
 * Filing tier selection & pricing
 * Tracks which tier user selected and pricing details
 */
export const filingTiers = mysqlTable("filing_tiers", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  
  // Tier selection
  tier: mysqlEnum("tier", ["pro-se", "poa"]).notNull(),
  
  // Pricing
  proSePrice: int("proSePrice"), // In cents (e.g., 19900 = $199)
  contingencyPercentage: int("contingencyPercentage"), // For POA (e.g., 25 = 25%)
  
  // Payment status
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["stripe", "none"]),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  
  // For contingency fees
  contingencyPaidDate: timestamp("contingencyPaidDate"),
  contingencyAmount: int("contingencyAmount"), // In cents
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilingTier = typeof filingTiers.$inferSelect;
export type InsertFilingTier = typeof filingTiers.$inferInsert;

/**
 * Paralegal workload queue
 * Tracks pending POA filings for paralegals to process
 */
export const paralegalsQueue = mysqlTable("paralegals_queue", {
  id: int("id").autoincrement().primaryKey(),
  poaFilingId: int("poaFilingId").notNull(),
  
  // Assignment
  assignedTo: varchar("assignedTo", { length: 255 }), // Paralegal name
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  
  // Status
  status: mysqlEnum("status", ["queued", "in-progress", "completed", "blocked"]).default("queued").notNull(),
  
  // Tracking
  queuedAt: timestamp("queuedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  deadline: timestamp("deadline"), // Filing deadline
  
  // Notes
  notes: text("notes"),
  blockers: text("blockers"), // If blocked, why
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParalegalsQueueItem = typeof paralegalsQueue.$inferSelect;
export type InsertParalegalsQueueItem = typeof paralegalsQueue.$inferInsert;
