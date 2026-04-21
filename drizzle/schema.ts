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
