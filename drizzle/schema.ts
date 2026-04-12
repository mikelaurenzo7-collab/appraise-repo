import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Property analysis submissions
 * Stores user addresses submitted for AI appraisal analysis
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
  appealStrengthScore: int("appealStrengthScore"), // 0-100

  // Jurisdiction info
  county: varchar("county", { length: 100 }),
  assessor: varchar("assessor", { length: 255 }),
  appealDeadline: timestamp("appealDeadline"),

  // Status tracking
  status: mysqlEnum("status", ["pending", "analyzing", "analyzed", "contacted", "appeal-filed", "archived"]).default("pending").notNull(),
  filingMethod: mysqlEnum("filingMethod", ["poa", "pro-se", "none"]),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertySubmission = typeof propertySubmissions.$inferSelect;
export type InsertPropertySubmission = typeof propertySubmissions.$inferInsert;

/**
 * Property analysis results (detailed analysis data)
 * Stores API responses and LLM-generated analysis
 */
export const propertyAnalysis = mysqlTable("property_analysis", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),

  // Raw API data (stored as JSON)
  lightboxData: text("lightboxData"),
  rentcastData: text("rentcastData"),
  regrindData: text("regrindData"),
  attomData: text("attomData"),

  // Processed analysis
  comparableSales: text("comparableSales"), // JSON array of comps
  marketValueEstimate: int("marketValueEstimate"),
  assessmentGap: int("assessmentGap"),
  appealStrengthFactors: text("appealStrengthFactors"), // JSON array
  recommendedApproach: mysqlEnum("recommendedApproach", ["poa", "pro-se", "not-recommended"]),

  // LLM-generated content
  executiveSummary: text("executiveSummary"),
  valuationJustification: text("valuationJustification"),
  nextSteps: text("nextSteps"), // JSON array

  // Report generation
  reportUrl: varchar("reportUrl", { length: 500 }), // S3 URL to PDF
  reportGeneratedAt: timestamp("reportGeneratedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyAnalysis = typeof propertyAnalysis.$inferSelect;
export type InsertPropertyAnalysis = typeof propertyAnalysis.$inferInsert;
