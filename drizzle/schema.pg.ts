import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  serial,
} from "drizzle-orm/pg-core";

// =============================================================================
// ENUMS — PostgreSQL uses pgEnum instead of mysqlEnum
// =============================================================================

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const propertyTypeEnum = pgEnum("property_type", [
  "residential",
  "multi-family",
  "commercial",
  "agricultural",
  "industrial",
  "land",
  "unknown",
]);
export const userScenarioEnum = pgEnum("user_scenario", [
  "primary_residence",
  "rental_property",
  "vacation_home",
  "inherited_property",
  "recently_purchased",
  "planning_to_sell",
  "distressed_condition",
  "new_construction",
  "recently_renovated",
  "senior_homestead",
  "veteran_disability",
  "financial_hardship",
  "mixed_use",
  "none",
]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "analyzing",
  "analyzed",
  "error",
  "contacted",
  "appeal-filed",
  "hearing-scheduled",
  "won",
  "lost",
  "withdrawn",
  "archived",
]);
export const filingMethodEnum = pgEnum("filing_method", [
  "poa",
  "pro-se",
  "none",
  "automated_standard",
  "automated_express",
]);
export const recommendedApproachEnum = pgEnum("recommended_approach", [
  "poa",
  "pro-se",
  "automated_standard",
  "automated_express",
  "not-recommended",
]);
export const appealOutcomeEnum = pgEnum("appeal_outcome", [
  "won",
  "lost",
  "settled",
  "withdrawn",
  "pending-hearing",
]);
export const activityActorEnum = pgEnum("activity_actor", [
  "system",
  "user",
  "admin",
]);
export const activityStatusEnum = pgEnum("activity_status", [
  "success",
  "warning",
  "error",
]);
export const photoCategoryEnum = pgEnum("photo_category", [
  "exterior",
  "interior",
  "damage",
  "condition",
  "comparable",
  "neighborhood",
  "other",
]);
export const includeOptionEnum = pgEnum("include_option", ["yes", "no", "auto"]);
export const strategyOptionEnum = pgEnum("strategy_option", [
  "poa",
  "pro-se",
  "both",
  "auto",
]);
export const targetAudienceEnum = pgEnum("target_audience", [
  "assessor",
  "board",
  "attorney",
  "owner",
]);
export const reportJobStatusEnum = pgEnum("report_job_status", [
  "queued",
  "generating",
  "completed",
  "failed",
  "expired",
]);
export const preferredChannelEnum = pgEnum("preferred_channel", [
  "portal",
  "mail_certified",
  "mail_first_class",
  "email",
  "unsupported",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "draft",
  "staging",
  "verified",
  "broken",
]);
export const deliveryChannelEnum = pgEnum("delivery_channel", [
  "portal",
  "mail_certified",
  "mail_first_class",
  "email",
]);
export const filingJobStatusEnum = pgEnum("filing_job_status", [
  "pending",
  "processing",
  "awaiting_captcha",
  "completed",
  "failed",
  "cancelled",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "in_transit",
  "delivered",
  "returned",
  "failed",
]);
export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "approved",
  "denied",
  "refunded",
  "failed",
]);
export const poaFilingStatusEnum = pgEnum("poa_filing_status", [
  "pending",
  "filed",
  "acknowledged",
  "scheduled",
  "hearing-held",
  "decided",
  "failed",
]);
export const hearingFormatEnum = pgEnum("hearing_format", [
  "in-person",
  "virtual",
  "hybrid",
  "mail",
]);
export const poaFilingOutcomeEnum = pgEnum("poa_filing_outcome", [
  "won",
  "lost",
  "settled",
  "withdrawn",
  "pending",
]);
export const proSeFilingStatusEnum = pgEnum("pro_se_filing_status", [
  "started",
  "forms-generated",
  "documents-sent",
  "filed",
  "hearing-scheduled",
  "completed",
  "abandoned",
]);
export const filingTierEnum = pgEnum("filing_tier", [
  "pro-se",
  "poa",
  "automated_standard",
  "automated_express",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["stripe", "none"]);
export const paralegalQueuePriorityEnum = pgEnum("paralegal_queue_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);
export const paralegalQueueStatusEnum = pgEnum("paralegal_queue_status", [
  "queued",
  "in-progress",
  "completed",
  "blocked",
]);
export const jurisdictionAppealDeadlineTypeEnum = pgEnum(
  "jurisdiction_appeal_deadline_type",
  ["from_notice", "calendar_year", "fiscal_year", "rolling"]
);
export const referralTierEnum = pgEnum("referral_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
]);
export const referralStatusEnum = pgEnum("referral_status", [
  "clicked",
  "signed_up",
  "submitted",
  "paid",
  "credited",
  "reversed",
]);
export const referralPayoutMethodEnum = pgEnum("referral_payout_method", [
  "stripe_transfer",
  "manual",
]);
export const referralPayoutStatusEnum = pgEnum("referral_payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

// =============================================================================
// TABLES
// =============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  // SMS Notifications
  phoneNumber: varchar("phone_number", { length: 20 }),
  smsOptIn: boolean("sms_opt_in").default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const propertySubmissions = pgTable("property_submissions", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  propertyType: propertyTypeEnum("property_type").default("unknown"),
  userScenario: userScenarioEnum("user_scenario").default("none"),
  conditionNotes: text("condition_notes"),
  squareFeet: integer("square_feet"),
  lotSize: integer("lot_size"),
  yearBuilt: integer("year_built"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  assessedValue: integer("assessed_value"),
  marketValue: integer("market_value"),
  estimatedMarketValueLow: integer("estimated_market_value_low"),
  estimatedMarketValueHigh: integer("estimated_market_value_high"),
  potentialSavings: integer("potential_savings"),
  taxRateOverride: decimal("tax_rate_override", { precision: 5, scale: 4 }),
  appealStrengthScore: integer("appeal_strength_score"),
  confidenceScore: integer("confidence_score"),
  compQualityScore: integer("comp_quality_score"),
  county: varchar("county", { length: 100 }),
  assessor: varchar("assessor", { length: 255 }),
  appealDeadline: timestamp("appeal_deadline", { withTimezone: true }),
  // Google Maps imagery (captured async after submission)
  streetViewUrl: varchar("street_view_url", { length: 500 }),
  satelliteUrl: varchar("satellite_url", { length: 500 }),
  roadmapUrl: varchar("roadmap_url", { length: 500 }),
  lat: varchar("lat", { length: 20 }),
  lng: varchar("lng", { length: 20 }),
  status: submissionStatusEnum("status").default("pending").notNull(),
  filingMethod: filingMethodEnum("filing_method"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PropertySubmission = typeof propertySubmissions.$inferSelect;
export type InsertPropertySubmission = typeof propertySubmissions.$inferInsert;

export const propertyAnalysis = pgTable("property_analysis", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  lightboxData: text("lightbox_data"),
  rentcastData: text("rentcast_data"),
  regrindData: text("regrind_data"),
  attomData: text("attom_data"),
  comparableSales: text("comparable_sales"),
  marketValueEstimate: integer("market_value_estimate"),
  assessmentGap: integer("assessment_gap"),
  appealStrengthFactors: text("appeal_strength_factors"),
  recommendedApproach: recommendedApproachEnum("recommended_approach"),
  executiveSummary: text("executive_summary"),
  valuationJustification: text("valuation_justification"),
  nextSteps: text("next_steps"),
  scenarioContext: text("scenario_context"),
  valuationApproachWeights: text("valuation_approach_weights"),
  compQualityBreakdown: text("comp_quality_breakdown"),
  // Detailed valuation data (persisted for report generation)
  adjustmentGrid: text("adjustment_grid"),
  costApproachData: text("cost_approach_data"),
  incomeApproachData: text("income_approach_data"),
  marketTrendData: text("market_trend_data"),
  reconciliationNarrative: text("reconciliation_narrative"),
  reportUrl: varchar("report_url", { length: 500 }),
  reportGeneratedAt: timestamp("report_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PropertyAnalysis = typeof propertyAnalysis.$inferSelect;
export type InsertPropertyAnalysis = typeof propertyAnalysis.$inferInsert;

export const appealOutcomes = pgTable("appeal_outcomes", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  outcome: appealOutcomeEnum("outcome").notNull(),
  originalAssessedValue: integer("original_assessed_value"),
  finalAssessedValue: integer("final_assessed_value"),
  reductionAmount: integer("reduction_amount"),
  annualTaxSavings: integer("annual_tax_savings"),
  contingencyFeeEarned: decimal("contingency_fee_earned", {
    precision: 10,
    scale: 2,
  }),
  filedAt: timestamp("filed_at", { withTimezone: true }),
  hearingDate: timestamp("hearing_date", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionDays: integer("resolution_days"),
  county: varchar("county", { length: 100 }),
  state: varchar("state", { length: 2 }),
  boardName: varchar("board_name", { length: 255 }),
  filingMethod: filingMethodEnum("filing_method"),
  groundsForAppeal: text("grounds_for_appeal"),
  evidenceStrength: integer("evidence_strength"),
  adminNotes: text("admin_notes"),
  hearingNotes: text("hearing_notes"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  contingencyFeePaid: decimal("contingency_fee_paid", {
    precision: 10,
    scale: 2,
  }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AppealOutcome = typeof appealOutcomes.$inferSelect;
export type InsertAppealOutcome = typeof appealOutcomes.$inferInsert;

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id"),
  type: varchar("type", { length: 64 }).notNull(),
  actor: activityActorEnum("actor").default("system").notNull(),
  actorId: integer("actor_id"),
  description: text("description").notNull(),
  metadata: text("metadata"),
  status: activityStatusEnum("status").default("success").notNull(),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

export const apiCache = pgTable("api_cache", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 64 }).notNull(),
  responseData: text("response_data").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  hitCount: integer("hit_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ApiCache = typeof apiCache.$inferSelect;
export type InsertApiCache = typeof apiCache.$inferInsert;

export const propertyPhotos = pgTable("property_photos", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  photoUrl: varchar("photo_url", { length: 500 }).notNull(),
  photoKey: varchar("photo_key", { length: 255 }).notNull(),
  caption: text("caption"),
  category: photoCategoryEnum("category").default("other"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PropertyPhoto = typeof propertyPhotos.$inferSelect;
export type InsertPropertyPhoto = typeof propertyPhotos.$inferInsert;

export const reportPreferences = pgTable("report_preferences", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().unique(),
  includeCostApproach: includeOptionEnum("include_cost_approach").default(
    "auto"
  ),
  includeSalesComparison: includeOptionEnum("include_sales_comparison").default(
    "auto"
  ),
  includeIncomeApproach: includeOptionEnum("include_income_approach").default(
    "auto"
  ),
  recommendedStrategy: strategyOptionEnum("recommended_strategy").default(
    "auto"
  ),
  emphasizePhotos: includeOptionEnum("emphasize_photos").default("yes"),
  includeMarketAnalysis: includeOptionEnum("include_market_analysis").default(
    "yes"
  ),
  includeComparableProperties: includeOptionEnum(
    "include_comparable_properties"
  ).default("yes"),
  additionalNotes: text("additional_notes"),
  targetAudience: targetAudienceEnum("target_audience").default("board"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ReportPreference = typeof reportPreferences.$inferSelect;
export type InsertReportPreference = typeof reportPreferences.$inferInsert;

export const reportJobs = pgTable("report_jobs", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  userId: integer("user_id").notNull(),
  status: reportJobStatusEnum("status").default("queued").notNull(),
  reportUrl: varchar("report_url", { length: 500 }),
  reportKey: varchar("report_key", { length: 255 }),
  sizeBytes: integer("size_bytes"),
  errorMessage: text("error_message"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ReportJob = typeof reportJobs.$inferSelect;
export type InsertReportJob = typeof reportJobs.$inferInsert;

export const counties = pgTable("counties", {
  id: serial("id").primaryKey(),
  state: varchar("state", { length: 2 }).notNull(),
  countyName: varchar("county_name", { length: 100 }).notNull(),
  countyCode: varchar("county_code", { length: 10 }),
  poaDeadlineDays: integer("poa_deadline_days"),
  proSeDeadlineDays: integer("pro_se_deadline_days"),
  hasOnlinePortal: boolean("has_online_portal").default(false),
  portalUrl: varchar("portal_url", { length: 500 }),
  acceptsEmail: boolean("accepts_email").default(false),
  acceptsMail: boolean("accepts_mail").default(false),
  acceptsInPerson: boolean("accepts_in_person").default(false),
  poaEligible: boolean("poa_eligible").default(false),
  onlinePortalOnly: boolean("online_portal_only").default(false),
  pinOnlyLogin: boolean("pin_only_login").default(false),
  filingWindowStart: varchar("filing_window_start", { length: 10 }),
  filingWindowEnd: varchar("filing_window_end", { length: 10 }),
  preferredChannel: preferredChannelEnum("preferred_channel")
    .default("mail_certified")
    .notNull(),
  fallbackChannel: preferredChannelEnum("fallback_channel").default(
    "mail_certified"
  ),
  mailingAddressName: varchar("mailing_address_name", { length: 255 }),
  mailingAddressLine1: varchar("mailing_address_line1", { length: 200 }),
  mailingAddressLine2: varchar("mailing_address_line2", { length: 200 }),
  mailingAddressCity: varchar("mailing_address_city", { length: 100 }),
  mailingAddressState: varchar("mailing_address_state", { length: 2 }),
  mailingAddressZip: varchar("mailing_address_zip", { length: 10 }),
  intakeEmail: varchar("intake_email", { length: 320 }),
  assessorName: varchar("assessor_name", { length: 255 }),
  assessorPhone: varchar("assessor_phone", { length: 20 }),
  assessorEmail: varchar("assessor_email", { length: 320 }),
  arbName: varchar("arb_name", { length: 255 }),
  arbPhone: varchar("arb_phone", { length: 20 }),
  arbEmail: varchar("arb_email", { length: 320 }),
  filingFee: integer("filing_fee"),
  hearingFee: integer("hearing_fee"),
  hearingFormat: hearingFormatEnum("hearing_format").default("in-person"),
  hearingScheduleDays: integer("hearing_schedule_days"),
  requiresAttorney: boolean("requires_attorney").default(false),
  formTemplateUrl: varchar("form_template_url", { length: 500 }),
  formTemplateName: varchar("form_template_name", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type County = typeof counties.$inferSelect;
export type InsertCounty = typeof counties.$inferInsert;

export const filingRecipes = pgTable("filing_recipes", {
  id: serial("id").primaryKey(),
  countyId: integer("county_id").notNull(),
  version: integer("version").notNull().default(1),
  portalUrl: varchar("portal_url", { length: 500 }).notNull(),
  steps: text("steps").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  verificationStatus: verificationStatusEnum("verification_status")
    .default("draft")
    .notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type FilingRecipe = typeof filingRecipes.$inferSelect;
export type InsertFilingRecipe = typeof filingRecipes.$inferInsert;

export const scrivenerAuthorizations = pgTable("scrivener_authorizations", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  userId: integer("user_id"),
  typedName: varchar("typed_name", { length: 255 }).notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: varchar("user_agent", { length: 512 }),
  authorizationTextHash: varchar("authorization_text_hash", { length: 64 })
    .notNull(),
  authorizationText: text("authorization_text").notNull(),
  scrolledToEnd: boolean("scrolled_to_end").default(false).notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ScrivenerAuthorization =
  typeof scrivenerAuthorizations.$inferSelect;
export type InsertScrivenerAuthorization =
  typeof scrivenerAuthorizations.$inferInsert;

export const filingJobs = pgTable("filing_jobs", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  userId: integer("user_id").notNull(),
  recipeId: integer("recipe_id"),
  authorizationId: integer("authorization_id").notNull(),
  deliveryChannel: deliveryChannelEnum("delivery_channel"),
  status: filingJobStatusEnum("status").default("pending").notNull(),
  inputs: text("inputs"),
  portalConfirmationNumber: varchar("portal_confirmation_number", {
    length: 255,
  }),
  finalScreenshotKey: varchar("final_screenshot_key", { length: 500 }),
  executionLogKey: varchar("execution_log_key", { length: 500 }),
  mailTrackingNumber: varchar("mail_tracking_number", { length: 64 }),
  lobLetterId: varchar("lob_letter_id", { length: 64 }),
  lobExpectedDeliveryDate: timestamp("lob_expected_delivery_date", {
    withTimezone: true,
  }),
  emailMessageId: varchar("email_message_id", { length: 255 }),
  emailRecipient: varchar("email_recipient", { length: 320 }),
  deliveryStatus: deliveryStatusEnum("delivery_status").default("pending"),
  deliveryStatusUpdatedAt: timestamp("delivery_status_updated_at", {
    withTimezone: true,
  }),
  errorMessage: text("error_message"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(2).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type FilingJob = typeof filingJobs.$inferSelect;
export type InsertFilingJob = typeof filingJobs.$inferInsert;

export const refundRequests = pgTable("refund_requests", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  userId: integer("user_id").notNull(),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  amountCents: integer("amount_cents").notNull(),
  status: refundStatusEnum("status").default("pending").notNull(),
  reason: text("reason"),
  adminNotes: text("admin_notes"),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: integer("decided_by"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type RefundRequest = typeof refundRequests.$inferSelect;
export type InsertRefundRequest = typeof refundRequests.$inferInsert;

export const stripeEventsProcessed = pgTable("stripe_events_processed", {
  eventId: varchar("event_id", { length: 255 }).primaryKey(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type StripeEventProcessed = typeof stripeEventsProcessed.$inferSelect;
export type InsertStripeEventProcessed =
  typeof stripeEventsProcessed.$inferInsert;

export const countyWaitlist = pgTable("county_waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  state: varchar("state", { length: 2 }),
  countyName: varchar("county_name", { length: 100 }),
  submissionId: integer("submission_id"),
  notes: text("notes"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type CountyWaitlistEntry = typeof countyWaitlist.$inferSelect;
export type InsertCountyWaitlistEntry = typeof countyWaitlist.$inferInsert;

export const poaFilings = pgTable("poa_filings", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  countyId: integer("county_id").notNull(),
  status: poaFilingStatusEnum("status").default("pending").notNull(),
  filingDate: timestamp("filing_date", { withTimezone: true }),
  filedBy: varchar("filed_by", { length: 255 }),
  hearingDate: timestamp("hearing_date", { withTimezone: true }),
  hearingTime: varchar("hearing_time", { length: 20 }),
  hearingLocation: varchar("hearing_location", { length: 255 }),
  hearingFormat: hearingFormatEnum("hearing_format"),
  outcome: poaFilingOutcomeEnum("outcome").default("pending"),
  newAssessedValue: integer("new_assessed_value"),
  assessmentReduction: integer("assessment_reduction"),
  confirmationNumber: varchar("confirmation_number", { length: 100 }),
  portalUrl: varchar("portal_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type POAFiling = typeof poaFilings.$inferSelect;
export type InsertPOAFiling = typeof poaFilings.$inferInsert;

export const proSeFilings = pgTable("pro_se_filings", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  countyId: integer("county_id").notNull(),
  status: proSeFilingStatusEnum("status").default("started").notNull(),
  formsPdfUrl: varchar("forms_pdf_url", { length: 500 }),
  checklistPdfUrl: varchar("checklist_pdf_url", { length: 500 }),
  instructionsPdfUrl: varchar("instructions_pdf_url", { length: 500 }),
  formsSentDate: timestamp("forms_sent_date", { withTimezone: true }),
  userFiledDate: timestamp("user_filed_date", { withTimezone: true }),
  confirmationReceived: boolean("confirmation_received").default(false),
  coachingEmailsSent: integer("coaching_emails_sent").default(0),
  lastCoachingEmail: timestamp("last_coaching_email", { withTimezone: true }),
  hearingDate: timestamp("hearing_date", { withTimezone: true }),
  outcome: poaFilingOutcomeEnum("outcome").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ProSeFiling = typeof proSeFilings.$inferSelect;
export type InsertProSeFiling = typeof proSeFilings.$inferInsert;

export const filingTiers = pgTable("filing_tiers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  tier: filingTierEnum("tier").notNull(),
  proSePrice: integer("pro_se_price"),
  contingencyPercentage: integer("contingency_percentage"),
  paymentStatus: paymentStatusEnum("payment_status")
    .default("pending")
    .notNull(),
  paymentMethod: paymentMethodEnum("payment_method"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  contingencyPaidDate: timestamp("contingency_paid_date", { withTimezone: true }),
  contingencyAmount: integer("contingency_amount"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type FilingTier = typeof filingTiers.$inferSelect;
export type InsertFilingTier = typeof filingTiers.$inferInsert;

export const paralegalsQueue = pgTable("paralegals_queue", {
  id: serial("id").primaryKey(),
  poaFilingId: integer("poa_filing_id").notNull(),
  assignedTo: varchar("assigned_to", { length: 255 }),
  priority: paralegalQueuePriorityEnum("priority")
    .default("normal")
    .notNull(),
  status: paralegalQueueStatusEnum("status").default("queued").notNull(),
  notes: text("notes"),
  blockers: text("blockers"),
  queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ParalegalsQueue = typeof paralegalsQueue.$inferSelect;
export type InsertParalegalsQueue = typeof paralegalsQueue.$inferInsert;
// Aliases for back-compat with code referencing the old names
export type ParalegalsQueueItem = ParalegalsQueue;
export type InsertParalegalsQueueItem = InsertParalegalsQueue;

// =============================================================================
// REFERRAL TABLES
// =============================================================================

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  tier: referralTierEnum("tier").default("bronze").notNull(),
  lifetimeReferrals: integer("lifetime_referrals").default(0).notNull(),
  lifetimeEarningsCents: integer("lifetime_earnings_cents").default(0).notNull(),
  pendingBalanceCents: integer("pending_balance_cents").default(0).notNull(),
  paidOutCents: integer("paid_out_cents").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

export const referralTracking = pgTable("referral_tracking", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").notNull(),
  referredUserId: integer("referred_user_id"),
  referredEmail: varchar("referred_email", { length: 320 }),
  submissionId: integer("submission_id"),
  referralCode: varchar("referral_code", { length: 20 }).notNull(),
  status: referralStatusEnum("status").default("clicked").notNull(),
  commissionCents: integer("commission_cents").default(0).notNull(),
  commissionTier: referralTierEnum("commission_tier"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  signedUpAt: timestamp("signed_up_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  creditedAt: timestamp("credited_at", { withTimezone: true }),
  reversedAt: timestamp("reversed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ReferralTrackingEntry = typeof referralTracking.$inferSelect;
export type InsertReferralTrackingEntry = typeof referralTracking.$inferInsert;

export const referralPayouts = pgTable("referral_payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: referralPayoutStatusEnum("status").default("pending").notNull(),
  method: referralPayoutMethodEnum("method").default("stripe_transfer").notNull(),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }),
  notes: text("notes"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ReferralPayout = typeof referralPayouts.$inferSelect;
export type InsertReferralPayout = typeof referralPayouts.$inferInsert;

// =============================================================================
// JURISDICTION RULES
// =============================================================================

export const jurisdictionRules = pgTable("jurisdiction_rules", {
  id: serial("id").primaryKey(),
  state: varchar("state", { length: 2 }).notNull(),
  county: varchar("county", { length: 100 }).notNull(),
  assessmentRate: decimal("assessment_rate", { precision: 5, scale: 2 }).notNull(),
  appealDeadlineDays: integer("appeal_deadline_days").notNull(),
  appealDeadlineType: jurisdictionAppealDeadlineTypeEnum("appeal_deadline_type").notNull(),
  minAssessmentDifference: integer("min_assessment_difference"),
  minAssessmentPercentage: decimal("min_assessment_percentage", { precision: 5, scale: 2 }),
  successRate: integer("success_rate"),
  averageResolutionDays: integer("average_resolution_days"),
  filingMethods: varchar("filing_methods", { length: 255 }),
  documentationRequired: text("documentation_required"),
  hearingRequired: boolean("hearing_required").default(false),
  contingencyFeeAllowed: boolean("contingency_fee_allowed").default(false),
  maxContingencyFee: decimal("max_contingency_fee", { precision: 5, scale: 2 }),
  notes: text("notes"),
  source: varchar("source", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 500 }),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }).notNull(),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type JurisdictionRule = typeof jurisdictionRules.$inferSelect;
export type InsertJurisdictionRule = typeof jurisdictionRules.$inferInsert;
