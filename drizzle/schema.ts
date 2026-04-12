import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
