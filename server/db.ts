import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users,
  propertySubmissions, InsertPropertySubmission, PropertySubmission,
  propertyAnalysis, InsertPropertyAnalysis,
  appealOutcomes, InsertAppealOutcome,
  activityLogs, InsertActivityLog,
  apiCache, InsertApiCache,
  reportJobs, InsertReportJob, ReportJob,
  counties, County, InsertCounty,
  filingTiers, FilingTier, InsertFilingTier,
  poaFilings, POAFiling, InsertPOAFiling,
  proSeFilings, ProSeFiling, InsertProSeFiling,
  paralegalsQueue, ParalegalsQueueItem, InsertParalegalsQueueItem,
  filingRecipes, FilingRecipe, InsertFilingRecipe,
  scrivenerAuthorizations, ScrivenerAuthorization, InsertScrivenerAuthorization,
  filingJobs, FilingJob, InsertFilingJob,
  refundRequests, RefundRequest, InsertRefundRequest,
  stripeEventsProcessed, InsertStripeEventProcessed,
  countyWaitlist, CountyWaitlistEntry, InsertCountyWaitlistEntry,
  referralCodes, ReferralCode, InsertReferralCode,
  referralTracking, ReferralTrackingEntry, InsertReferralTrackingEntry,
  referralPayouts, ReferralPayout, InsertReferralPayout,
  jurisdictionRules, JurisdictionRule, InsertJurisdictionRule,
  propertyPhotos, PropertyPhoto, InsertPropertyPhoto,
  reportPreferences, ReportPreference, InsertReportPreference,
} from "../drizzle/schema.pg";
import { ENV } from './_core/env';
import { scopedLogger } from "./_core/logger";

const log = scopedLogger("Database");

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Supabase pooler (port 6543) uses transaction-mode pooling which
      // is incompatible with prepared statements. Disable them so queries
      // don't fail with "prepared statement does not exist" errors.
      // The pooler handles connection reuse across serverless invocations.
      const client = postgres(process.env.DATABASE_URL, {
        max: 1,
        ssl: "require",
        prepare: false,
        // Serverless-friendly timeouts
        connect_timeout: 5,
        idle_timeout: 20,
        max_lifetime: 60 * 30,
      });
      _db = drizzle(client);
    } catch (error) {
      log.warn("[Database] Failed to connect:", { err: error });
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { log.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    log.error("[Database] Failed to upsert user:", { err: error });
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── PROPERTY SUBMISSIONS ─────────────────────────────────────────────────────

export async function createPropertySubmission(submission: InsertPropertySubmission) {
  const db = await getDb();
  if (!db) { log.warn("[Database] Cannot create submission: database not available"); return undefined; }
  try {
    const result = await db.insert(propertySubmissions).values(submission).returning({ id: propertySubmissions.id });
    const insertedId = result[0]?.id;
    if (!insertedId) return undefined;
    const record = await db.select().from(propertySubmissions).where(eq(propertySubmissions.id, insertedId)).limit(1);
    log.info("[Database] Fetched record id:", { recordId: record[0]?.id });
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to create property submission:", { err: error });
    throw error;
  }
}

export async function getPropertySubmissionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(propertySubmissions).where(eq(propertySubmissions.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to get property submission:", { err: error });
    return undefined;
  }
}

export async function updatePropertySubmission(id: number, updates: Partial<InsertPropertySubmission>) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const updateData = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await db.update(propertySubmissions).set(updateData).where(eq(propertySubmissions.id, id));
    return await getPropertySubmissionById(id);
  } catch (error) {
    log.error("[Database] Failed to update property submission:", { err: error });
    return undefined;
  }
}

export async function getUserSubmissions(userEmail: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(propertySubmissions)
      .where(eq(propertySubmissions.email, userEmail))
      .orderBy(desc(propertySubmissions.createdAt));
  } catch (error) {
    log.error("[Database] Failed to get user submissions:", { err: error });
    return [];
  }
}

/**
 * Find submissions stuck in "analyzing" — last updated more than
 * `thresholdMs` ago. Used by the startup recovery sweep so a process crash
 * during analysis doesn't leave a submission permanently stuck.
 */
export async function findStuckAnalysisSubmissions(thresholdMs = 10 * 60 * 1000) {
  const db = await getDb();
  if (!db) return [];
  try {
    const cutoff = new Date(Date.now() - thresholdMs);
    return await db
      .select()
      .from(propertySubmissions)
      .where(and(eq(propertySubmissions.status, "analyzing"), lt(propertySubmissions.updatedAt, cutoff)))
      .limit(100);
  } catch (error) {
    log.error("[Database] Failed to find stuck submissions:", { err: error });
    return [];
  }
}

/**
 * List submissions that are queued but not yet analyzed. Used by the
 * Vercel cron to pick up work since serverless functions can't keep
 * setInterval running.
 */
export async function listPendingAnalysisSubmissions(limit = 5) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(propertySubmissions)
      .where(eq(propertySubmissions.status, "pending"))
      .orderBy(propertySubmissions.createdAt)
      .limit(limit);
  } catch (error) {
    log.error("[Database] Failed to list pending submissions:", { err: error });
    return [];
  }
}

export async function listAllSubmissions(limit: number, offset: number) {
  const db = await getDb();
  if (!db) return { submissions: [], total: 0 };
  try {
    const submissions = await db.select().from(propertySubmissions)
      .orderBy(desc(propertySubmissions.createdAt))
      .limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(propertySubmissions);
    const total = Number(countResult[0]?.count ?? 0);
    return { submissions, total };
  } catch (error) {
    log.error("[Database] Failed to list submissions:", { err: error });
    return { submissions: [], total: 0 };
  }
}

export async function getSubmissionStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, analyzing: 0, analyzed: 0, won: 0, lost: 0, avgSavings: null, totalRevenue: 0 };
  try {
    const all = await db.select().from(propertySubmissions);
    const total = all.length;
    const pending = all.filter((s) => s.status === "pending").length;
    const analyzing = all.filter((s) => s.status === "analyzing").length;
    const analyzed = all.filter((s) => s.status === "analyzed").length;
    const won = all.filter((s) => s.status === "won").length;
    const lost = all.filter((s) => s.status === "lost").length;
    const savings = all.filter((s) => s.potentialSavings != null).map((s) => s.potentialSavings as number);
    const avgSavings = savings.length ? Math.round(savings.reduce((a, b) => a + b, 0) / savings.length) : null;

    // Revenue from outcomes
    const outcomes = await db.select().from(appealOutcomes).where(eq(appealOutcomes.outcome, "won"));
    const totalRevenue = outcomes.reduce((sum, o) => sum + Number(o.contingencyFeeEarned ?? 0), 0);

    return { total, pending, analyzing, analyzed, won, lost, avgSavings, totalRevenue };
  } catch (error) {
    log.error("[Database] Failed to get stats:", { err: error });
    return { total: 0, pending: 0, analyzing: 0, analyzed: 0, won: 0, lost: 0, avgSavings: null, totalRevenue: 0 };
  }
}

// ─── PROPERTY ANALYSIS ────────────────────────────────────────────────────────

export async function createPropertyAnalysis(analysis: InsertPropertyAnalysis) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(propertyAnalysis).values(analysis).returning({ id: propertyAnalysis.id });
    const insertedId = result[0]?.id;
    const record = await db.select().from(propertyAnalysis).where(eq(propertyAnalysis.id, insertedId)).limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to create property analysis:", { err: error });
    throw error;
  }
}

export async function getPropertyAnalysisBySubmissionId(submissionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(propertyAnalysis).where(eq(propertyAnalysis.submissionId, submissionId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to get property analysis:", { err: error });
    return undefined;
  }
}

// ─── APPEAL OUTCOMES ──────────────────────────────────────────────────────────

export async function createAppealOutcome(outcome: InsertAppealOutcome) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(appealOutcomes).values(outcome).returning({ id: appealOutcomes.id });
    const insertedId = result[0]?.id;
    const record = await db.select().from(appealOutcomes).where(eq(appealOutcomes.id, insertedId)).limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to create appeal outcome:", { err: error });
    throw error;
  }
}

export async function updateAppealOutcome(id: number, updates: Partial<InsertAppealOutcome>) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const updateData = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await db.update(appealOutcomes).set(updateData).where(eq(appealOutcomes.id, id));
    const record = await db.select().from(appealOutcomes).where(eq(appealOutcomes.id, id)).limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to update appeal outcome:", { err: error });
    return undefined;
  }
}

export async function getAppealOutcomeBySubmissionId(submissionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(appealOutcomes).where(eq(appealOutcomes.submissionId, submissionId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    log.error("[Database] Failed to get appeal outcome:", { err: error });
    return undefined;
  }
}

export async function listAppealOutcomes(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { outcomes: [], total: 0 };
  try {
    const outcomes = await db.select().from(appealOutcomes)
      .orderBy(desc(appealOutcomes.createdAt))
      .limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(appealOutcomes);
    const total = Number(countResult[0]?.count ?? 0);
    return { outcomes, total };
  } catch (error) {
    log.error("[Database] Failed to list appeal outcomes:", { err: error });
    return { outcomes: [], total: 0 };
  }
}

export async function getOutcomeStats() {
  const db = await getDb();
  if (!db) return { totalFiled: 0, won: 0, lost: 0, settled: 0, winRate: 0, avgSavings: 0, totalRevenue: 0, avgResolutionDays: 0 };
  try {
    const all = await db.select().from(appealOutcomes);
    const totalFiled = all.length;
    const won = all.filter((o) => o.outcome === "won").length;
    const lost = all.filter((o) => o.outcome === "lost").length;
    const settled = all.filter((o) => o.outcome === "settled").length;
    const winRate = totalFiled > 0 ? Math.round((won / totalFiled) * 100) : 0;
    const wonOutcomes = all.filter((o) => o.outcome === "won" && o.annualTaxSavings);
    const avgSavings = wonOutcomes.length > 0
      ? Math.round(wonOutcomes.reduce((sum, o) => sum + (o.annualTaxSavings ?? 0), 0) / wonOutcomes.length)
      : 0;
    const totalRevenue = all.reduce((sum, o) => sum + Number(o.contingencyFeeEarned ?? 0), 0);
    const withDays = all.filter((o) => o.resolutionDays != null);
    const avgResolutionDays = withDays.length > 0
      ? Math.round(withDays.reduce((sum, o) => sum + (o.resolutionDays ?? 0), 0) / withDays.length)
      : 0;
    return { totalFiled, won, lost, settled, winRate, avgSavings, totalRevenue, avgResolutionDays };
  } catch (error) {
    log.error("[Database] Failed to get outcome stats:", { err: error });
    return { totalFiled: 0, won: 0, lost: 0, settled: 0, winRate: 0, avgSavings: 0, totalRevenue: 0, avgResolutionDays: 0 };
  }
}

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

export async function persistActivityLog(entry: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLogs).values(entry);
  } catch (error) {
    log.error("[Database] Failed to persist activity log:", { err: error });
  }
}

export async function getActivityLogsBySubmission(submissionId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(activityLogs)
      .where(eq(activityLogs.submissionId, submissionId))
      .orderBy(desc(activityLogs.createdAt));
  } catch (error) {
    log.error("[Database] Failed to get activity logs:", { err: error });
    return [];
  }
}

export type PhotoCategory = NonNullable<PropertyPhoto["category"]>;

export interface SubmissionPhoto {
  url: string;
  category: PhotoCategory;
  caption?: string;
  fileName?: string;
  uploadedAt: Date;
  /** Database row id when the photo is persisted to property_photos. */
  id?: number;
  /** Storage key (S3 object key) when available — needed for delete. */
  photoKey?: string;
}

const VALID_PHOTO_CATEGORIES = new Set<PhotoCategory>([
  "exterior",
  "interior",
  "damage",
  "condition",
  "comparable",
  "neighborhood",
  "other",
]);

function normalizePhotoCategory(value: unknown): PhotoCategory {
  return typeof value === "string" && VALID_PHOTO_CATEGORIES.has(value as PhotoCategory)
    ? (value as PhotoCategory)
    : "other";
}

/**
 * Pure parser: converts activity-log rows into photo records.
 * Extracted so it can be unit-tested without a DB or module mocks.
 */
export function parsePhotosFromLogs(
  logs: Array<{ type: string; metadata: string | null; createdAt: Date }>
): SubmissionPhoto[] {
  const photos: SubmissionPhoto[] = [];
  for (const log of logs) {
    if (log.type !== "photo_uploaded" || !log.metadata) continue;
    try {
      const meta = JSON.parse(log.metadata) as {
        url?: string;
        category?: unknown;
        caption?: string;
        fileName?: string;
        photoKey?: string;
      };
      if (!meta.url) continue;
      photos.push({
        url: meta.url,
        category: normalizePhotoCategory(meta.category),
        caption: meta.caption,
        fileName: meta.fileName,
        photoKey: meta.photoKey,
        uploadedAt: log.createdAt,
      });
    } catch {
      // skip malformed metadata
    }
  }
  // Return in upload order (oldest first) so the PDF renders a stable sequence.
  return photos.reverse();
}

/**
 * Returns photos for a submission. Reads the dedicated `property_photos` table
 * when available, and falls back to parsing legacy `photo_uploaded` activity
 * logs (for rows uploaded before the table was wired up).
 */
export async function getSubmissionPhotos(submissionId: number): Promise<SubmissionPhoto[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(propertyPhotos)
        .where(eq(propertyPhotos.submissionId, submissionId))
        .orderBy(propertyPhotos.displayOrder, propertyPhotos.createdAt);
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          url: r.photoUrl,
          photoKey: r.photoKey,
          category: normalizePhotoCategory(r.category),
          caption: r.caption ?? undefined,
          uploadedAt: r.createdAt,
        }));
      }
    } catch (error) {
      log.error("[Database] Failed to read property_photos:", { err: error });
    }
  }
  // Fallback: photos uploaded before the table was wired up only exist in
  // activity logs.
  const logs = await getActivityLogsBySubmission(submissionId);
  return parsePhotosFromLogs(logs);
}

/**
 * Persist a freshly uploaded photo to the `property_photos` table. Returns
 * the inserted row id when the DB is available, or null when running without
 * a database (callers still log to activity_logs as a safety net).
 */
export async function addSubmissionPhoto(input: {
  submissionId: number;
  photoUrl: string;
  photoKey: string;
  category: PhotoCategory;
  caption?: string;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const insert: InsertPropertyPhoto = {
      submissionId: input.submissionId,
      photoUrl: input.photoUrl,
      photoKey: input.photoKey,
      category: input.category,
      caption: input.caption ?? null,
    };
    const result = await db
      .insert(propertyPhotos)
      .values(insert)
      .returning({ id: propertyPhotos.id });
    return result[0]?.id ?? null;
  } catch (error) {
    log.error("[Database] Failed to insert property_photo:", { err: error });
    return null;
  }
}

/**
 * Delete a single photo row by id. Returns the deleted row (with photoKey,
 * so callers can also remove the underlying S3 object) or null when the row
 * does not exist or the DB is unavailable.
 */
export async function deleteSubmissionPhoto(id: number): Promise<PropertyPhoto | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .delete(propertyPhotos)
      .where(eq(propertyPhotos.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    log.error("[Database] Failed to delete property_photo:", { err: error });
    return null;
  }
}

export interface PhotoAnalysisRecord {
  photoCount: number;
  overallConditionScore: number;
  overallEvidenceStrength: number;
  appealStrengthDelta: number;
  topObservations: string[];
  topValueIssues: string[];
  // USPAP evidence fields persisted from photoAnalyzer
  uspapRatings: string[];
  assessorBlindSpotItems: string[];
  functionalObsolescenceItems: string[];
  summaryParagraph: string;
  costToCureTotal?: number;
  costToCureItems?: Array<{ low: number; high: number; description: string }>;
}

/**
 * Returns the most recent photo-analysis result for a submission by reading
 * the latest `photo_analysis_complete` activity-log entry. Returns null when
 * no photo analysis has run yet.
 */
export async function getLatestPhotoAnalysis(submissionId: number): Promise<PhotoAnalysisRecord | null> {
  const logs = await getActivityLogsBySubmission(submissionId);
  for (const log of logs) {
    if (log.type !== "photo_analysis_complete" || !log.metadata) continue;
    try {
      const meta = JSON.parse(log.metadata) as Partial<PhotoAnalysisRecord>;
      if (typeof meta.overallConditionScore !== "number") continue;
      const safeCostToCureItems = Array.isArray(meta.costToCureItems)
        ? meta.costToCureItems.filter(
            (i): i is { low: number; high: number; description: string } =>
              typeof i?.low === "number" &&
              typeof i?.high === "number" &&
              typeof i?.description === "string",
          )
        : undefined;
      return {
        photoCount: meta.photoCount ?? 0,
        overallConditionScore: meta.overallConditionScore,
        overallEvidenceStrength: meta.overallEvidenceStrength ?? 0,
        appealStrengthDelta: meta.appealStrengthDelta ?? 0,
        topObservations: meta.topObservations ?? [],
        topValueIssues: meta.topValueIssues ?? [],
        uspapRatings: meta.uspapRatings ?? [],
        assessorBlindSpotItems: meta.assessorBlindSpotItems ?? [],
        functionalObsolescenceItems: meta.functionalObsolescenceItems ?? [],
        summaryParagraph: meta.summaryParagraph ?? "",
        costToCureTotal:
          typeof meta.costToCureTotal === "number" ? meta.costToCureTotal : undefined,
        costToCureItems:
          safeCostToCureItems && safeCostToCureItems.length > 0
            ? safeCostToCureItems
            : undefined,
      };
    } catch {
      // skip malformed
    }
  }
  return null;
}

export async function getRecentActivityLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  } catch (error) {
    log.error("[Database] Failed to get recent activity logs:", { err: error });
    return [];
  }
}

// ─── REPORT PREFERENCES ──────────────────────────────────────────────────────

export async function getReportPreferences(submissionId: number): Promise<ReportPreference | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(reportPreferences)
      .where(eq(reportPreferences.submissionId, submissionId))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    log.error("[Database] Failed to read report_preferences:", { err: error });
    return null;
  }
}

/** Insert or update the report preferences row for a submission. */
export async function upsertReportPreferences(
  submissionId: number,
  patch: Partial<Omit<InsertReportPreference, "id" | "submissionId" | "createdAt">>,
): Promise<ReportPreference | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const updateSet = { ...patch, updatedAt: new Date() };
    const rows = await db
      .insert(reportPreferences)
      .values({ submissionId, ...patch })
      .onConflictDoUpdate({
        target: reportPreferences.submissionId,
        set: updateSet,
      })
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    log.error("[Database] Failed to upsert report_preferences:", { err: error });
    return null;
  }
}

// ─── API CACHE ────────────────────────────────────────────────────────────────

export async function getCachedApiResponse(cacheKey: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const now = new Date();
    const result = await db.select().from(apiCache)
      .where(and(eq(apiCache.cacheKey, cacheKey), gte(apiCache.expiresAt, now)))
      .limit(1);
    if (result.length > 0) {
      // Increment hit count
      await db.update(apiCache).set({ hitCount: sql`${apiCache.hitCount} + 1` }).where(eq(apiCache.cacheKey, cacheKey));
      return JSON.parse(result[0].responseData);
    }
    return null;
  } catch (error) {
    log.error("[Cache] Failed to get cached response:", { err: error });
    return null;
  }
}

export async function setCachedApiResponse(cacheKey: string, source: string, data: unknown, ttlSeconds = 86400) {
  const db = await getDb();
  if (!db) return;
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const entry: InsertApiCache = {
      cacheKey,
      source,
      responseData: JSON.stringify(data),
      expiresAt,
      hitCount: 0,
    };
    await db.insert(apiCache).values(entry).onConflictDoUpdate({
      target: apiCache.cacheKey,
      set: { responseData: entry.responseData, expiresAt: entry.expiresAt, hitCount: 0 },
    });
  } catch (error) {
    log.error("[Cache] Failed to set cached response:", { err: error });
  }
}

export async function evictExpiredCache() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const now = new Date();
    const result = await db.delete(apiCache).where(lt(apiCache.expiresAt, now));
    return Number((result as unknown as { count?: number })?.count ?? 0);
  } catch (error) {
    log.error("[Cache] Failed to evict expired cache:", { err: error });
    return 0;
  }
}

// ─── REPORT JOBS ─────────────────────────────────────────────────────────────

export async function createReportJob(data: InsertReportJob): Promise<ReportJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(reportJobs).values(data).returning({ id: reportJobs.id });
    const id = result[0]?.id;
    return id ? await getReportJobById(id) : null;
  } catch (error) {
    log.error("[ReportJob] Failed to create:", { err: error });
    return null;
  }
}

export async function getReportJobById(jobId: number): Promise<ReportJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(reportJobs).where(eq(reportJobs.id, jobId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    log.error("[ReportJob] Failed to get by ID:", { err: error });
    return null;
  }
}

export async function getReportJobBySubmissionId(submissionId: number): Promise<ReportJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(reportJobs)
      .where(eq(reportJobs.submissionId, submissionId))
      .orderBy(desc(reportJobs.createdAt))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    log.error("[ReportJob] Failed to get by submission:", { err: error });
    return null;
  }
}

export async function updateReportJob(jobId: number, data: Partial<InsertReportJob>): Promise<ReportJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(reportJobs).set(data).where(eq(reportJobs.id, jobId));
    return await getReportJobById(jobId);
  } catch (error) {
    log.error("[ReportJob] Failed to update:", { err: error });
    return null;
  }
}

export async function listPendingReportJobs(limit = 10): Promise<ReportJob[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const now = new Date();
    return await db.select().from(reportJobs)
      .where(and(
        eq(reportJobs.status, "queued"),
        gte(reportJobs.expiresAt, now)
      ))
      .orderBy(reportJobs.queuedAt)
      .limit(limit);
  } catch (error) {
    log.error("[ReportJob] Failed to list pending:", { err: error });
    return [];
  }
}

export async function listFailedReportJobs(limit = 10): Promise<ReportJob[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(reportJobs)
      .where(eq(reportJobs.status, "failed"))
      .orderBy(desc(reportJobs.updatedAt))
      .limit(limit);
  } catch (error) {
    log.error("[ReportJob] Failed to list failed:", { err: error });
    return [];
  }
}

export async function cleanupExpiredReportJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const now = new Date();
    const result = await db.update(reportJobs)
      .set({ status: "expired" })
      .where(and(
        lt(reportJobs.expiresAt, now),
        eq(reportJobs.status, "queued")
      ));
    return Number((result as unknown as { count?: number })?.count ?? 0);
  } catch (error) {
    log.error("[ReportJob] Failed to cleanup expired:", { err: error });
    return 0;
  }
}


// ─── COUNTIES ────────────────────────────────────────────────────────────────

export async function getCounty(state: string, countyName: string): Promise<County | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(counties)
      .where(and(
        eq(counties.state, state),
        eq(counties.countyName, countyName)
      ))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    log.error("[County] Failed to get county:", { err: error });
    return null;
  }
}

export async function getCountyById(id: number): Promise<County | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(counties)
      .where(eq(counties.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    log.error("[County] Failed to get county by ID:", { err: error });
    return null;
  }
}

/** Return all distinct states that have at least one county seeded, with county count */
export async function getDistinctStates(): Promise<{ code: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        code: counties.state,
        count: sql<number>`count(*)`,
      })
      .from(counties)
      .groupBy(counties.state)
      .orderBy(counties.state);
    return rows.map(r => ({ code: r.code, count: Number(r.count) }));
  } catch (error) {
    log.error("[County] Failed to get distinct states:", { err: error });
    return [];
  }
}

export async function listCountiesByState(state: string): Promise<County[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(counties)
      .where(eq(counties.state, state))
      .orderBy(counties.countyName);
  } catch (error) {
    log.error("[County] Failed to list counties:", { err: error });
    return [];
  }
}

export async function createCounty(county: InsertCounty): Promise<County | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(counties).values(county).returning({ id: counties.id });
    const id = result[0]?.id;
    return await getCountyById(id);
  } catch (error) {
    log.error("[County] Failed to create county:", { err: error });
    return null;
  }
}

// ─── FILING TIERS ────────────────────────────────────────────────────────────

export async function createFilingTier(tier: InsertFilingTier): Promise<FilingTier | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(filingTiers).values(tier).returning({ id: filingTiers.id });
    const id = result[0]?.id;
    return await db.select().from(filingTiers)
      .where(eq(filingTiers.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    log.error("[FilingTier] Failed to create tier:", { err: error });
    return null;
  }
}

export async function getFilingTierBySubmission(submissionId: number): Promise<FilingTier | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(filingTiers)
      .where(eq(filingTiers.submissionId, submissionId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    log.error("[FilingTier] Failed to get tier:", { err: error });
    return null;
  }
}

export async function updateFilingTierPayment(
  submissionId: number,
  updates: {
    paymentStatus: "pending" | "paid" | "failed" | "refunded";
    paymentMethod?: "stripe" | "none";
    stripePaymentIntentId?: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(filingTiers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(filingTiers.submissionId, submissionId));
    return true;
  } catch (error) {
    log.error("[FilingTier] Failed to update payment status:", { err: error });
    return false;
  }
}

// ─── POA FILINGS ─────────────────────────────────────────────────────────────

export async function createPOAFiling(filing: InsertPOAFiling): Promise<POAFiling | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(poaFilings).values(filing).returning({ id: poaFilings.id });
    const id = result[0]?.id;
    return await db.select().from(poaFilings)
      .where(eq(poaFilings.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    log.error("[POAFiling] Failed to create filing:", { err: error });
    return null;
  }
}

export async function getPOAFilingBySubmission(submissionId: number): Promise<POAFiling | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(poaFilings)
      .where(eq(poaFilings.submissionId, submissionId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    log.error("[POAFiling] Failed to get filing:", { err: error });
    return null;
  }
}

export async function listPendingPOAFilings(): Promise<POAFiling[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(poaFilings)
      .where(eq(poaFilings.status, "pending"))
      .orderBy(poaFilings.createdAt);
  } catch (error) {
    log.error("[POAFiling] Failed to list pending:", { err: error });
    return [];
  }
}

// ─── PRO SE FILINGS ──────────────────────────────────────────────────────────

export async function createProSeFiling(filing: InsertProSeFiling): Promise<ProSeFiling | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(proSeFilings).values(filing).returning({ id: proSeFilings.id });
    const id = result[0]?.id;
    return await db.select().from(proSeFilings)
      .where(eq(proSeFilings.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    log.error("[ProSeFiling] Failed to create filing:", { err: error });
    return null;
  }
}

export async function getProSeFilingBySubmission(submissionId: number): Promise<ProSeFiling | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(proSeFilings)
      .where(eq(proSeFilings.submissionId, submissionId))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    log.error("[ProSeFiling] Failed to get filing:", { err: error });
    return null;
  }
}

// ─── PARALEGALS QUEUE ────────────────────────────────────────────────────────

export async function addToParalegalsQueue(item: InsertParalegalsQueueItem): Promise<ParalegalsQueueItem | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(paralegalsQueue).values(item).returning({ id: paralegalsQueue.id });
    const id = result[0]?.id;
    return await db.select().from(paralegalsQueue)
      .where(eq(paralegalsQueue.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    log.error("[ParalegalsQueue] Failed to add item:", { err: error });
    return null;
  }
}

export async function listQueuedItems(): Promise<ParalegalsQueueItem[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(paralegalsQueue)
      .where(eq(paralegalsQueue.status, "queued"))
      .orderBy(paralegalsQueue.priority, paralegalsQueue.queuedAt);
  } catch (error) {
    log.error("[ParalegalsQueue] Failed to list queued:", { err: error });
    return [];
  }
}

export async function listParalegalsWorkload(paralegalName: string): Promise<ParalegalsQueueItem[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(paralegalsQueue)
      .where(and(
        eq(paralegalsQueue.assignedTo, paralegalName),
        eq(paralegalsQueue.status, "in-progress")
      ))
      .orderBy(paralegalsQueue.deadline);
  } catch (error) {
    log.error("[ParalegalsQueue] Failed to list workload:", { err: error });
    return [];
  }
}

/**
 * Aggregated filing view used by the Paralegals Dashboard.
 * Joins the queue to the underlying POA filing, submission, and county
 * so the UI can render everything from one query.
 */
export type FilingQueueRow = {
  queueId: number;
  poaFilingId: number;
  submissionId: number;
  status: ParalegalsQueueItem["status"];
  priority: ParalegalsQueueItem["priority"];
  assignedTo: string | null;
  deadline: Date | null;
  queuedAt: Date;
  completedAt: Date | null;
  county: string;
  state: string;
  address: string;
  ownerEmail: string;
  ownerPhone: string | null;
  filingType: "automated" | "pro-se";
  notes: string | null;
};

export async function listFilingQueue(limit = 200): Promise<FilingQueueRow[]> {
  const db = await getDb();
  if (!db) return [];
  // Cap defensively — even an admin call shouldn't pull unbounded rows.
  const safeLimit = Math.min(Math.max(1, limit), 500);
  try {
    const rows = await db
      .select({
        queueId: paralegalsQueue.id,
        poaFilingId: paralegalsQueue.poaFilingId,
        status: paralegalsQueue.status,
        priority: paralegalsQueue.priority,
        assignedTo: paralegalsQueue.assignedTo,
        deadline: paralegalsQueue.deadline,
        queuedAt: paralegalsQueue.queuedAt,
        completedAt: paralegalsQueue.completedAt,
        notes: paralegalsQueue.notes,
        submissionId: poaFilings.submissionId,
        countyId: poaFilings.countyId,
        countyName: counties.countyName,
        state: counties.state,
        address: propertySubmissions.address,
        ownerEmail: propertySubmissions.email,
        ownerPhone: propertySubmissions.phone,
      })
      .from(paralegalsQueue)
      .leftJoin(poaFilings, eq(paralegalsQueue.poaFilingId, poaFilings.id))
      .leftJoin(counties, eq(poaFilings.countyId, counties.id))
      .leftJoin(propertySubmissions, eq(poaFilings.submissionId, propertySubmissions.id))
      .orderBy(paralegalsQueue.priority, paralegalsQueue.queuedAt)
      .limit(safeLimit);

    return rows.map((r) => ({
      queueId: r.queueId,
      poaFilingId: r.poaFilingId,
      submissionId: r.submissionId ?? 0,
      status: r.status,
      priority: r.priority,
      assignedTo: r.assignedTo ?? null,
      deadline: r.deadline ?? null,
      queuedAt: r.queuedAt,
      completedAt: r.completedAt ?? null,
      county: r.countyName ?? "",
      state: r.state ?? "",
      address: r.address ?? "",
      ownerEmail: r.ownerEmail ?? "",
      ownerPhone: r.ownerPhone ?? null,
      filingType: "automated",
      notes: r.notes ?? null,
    }));
  } catch (error) {
    log.error("[ParalegalsQueue] Failed to list filing queue:", { err: error });
    return [];
  }
}

export async function assignQueueItem(
  queueId: number,
  assignedTo: string
): Promise<ParalegalsQueueItem | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db
      .update(paralegalsQueue)
      .set({ assignedTo, status: "in-progress", startedAt: new Date() })
      .where(eq(paralegalsQueue.id, queueId));
    return await db
      .select()
      .from(paralegalsQueue)
      .where(eq(paralegalsQueue.id, queueId))
      .limit(1)
      .then((r) => r[0] || null);
  } catch (error) {
    log.error("[ParalegalsQueue] Failed to assign queue item:", { err: error });
    return null;
  }
}

export async function completeQueueItem(
  queueId: number,
  notes?: string
): Promise<ParalegalsQueueItem | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const updates: Partial<InsertParalegalsQueueItem> = {
      status: "completed",
      completedAt: new Date(),
    };
    if (notes !== undefined) updates.notes = notes;
    await db.update(paralegalsQueue).set(updates).where(eq(paralegalsQueue.id, queueId));
    return await db
      .select()
      .from(paralegalsQueue)
      .where(eq(paralegalsQueue.id, queueId))
      .limit(1)
      .then((r) => r[0] || null);
  } catch (error) {
    log.error("[ParalegalsQueue] Failed to mark complete:", { err: error });
    return null;
  }
}

/**
 * User-facing filing status rows. For each submission owned by this email,
 * return the POA filing (if any), outcome, and key timeline data.
 */
export type UserFilingRow = {
  submissionId: number;
  address: string;
  city: string | null;
  state: string | null;
  status: PropertySubmission["status"];
  filingMethod: PropertySubmission["filingMethod"];
  filedDate: Date | null;
  hearingDate: Date | null;
  hearingLocation: string | null;
  hearingFormat: POAFiling["hearingFormat"] | null;
  outcome: POAFiling["outcome"] | null;
  newAssessedValue: number | null;
  assessmentReduction: number | null;
  annualTaxSavings: number | null;
  confirmationNumber: string | null;
  portalUrl: string | null;
  lastUpdated: Date;
  notes: string | null;
  // Filing-job surfaced artifacts — shown in the user dashboard so the
  // owner can see "USPS tracking #9407…, delivered 4/18" without
  // clicking through.
  filingJob: {
    id: number;
    status: FilingJob["status"];
    deliveryChannel: FilingJob["deliveryChannel"];
    deliveryStatus: FilingJob["deliveryStatus"];
    portalConfirmationNumber: string | null;
    mailTrackingNumber: string | null;
    lobExpectedDeliveryDate: Date | null;
    emailRecipient: string | null;
    completedAt: Date | null;
    errorMessage: string | null;
  } | null;
};

export async function listUserFilings(userEmail: string): Promise<UserFilingRow[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const submissions = await db
      .select()
      .from(propertySubmissions)
      .where(eq(propertySubmissions.email, userEmail))
      .orderBy(desc(propertySubmissions.createdAt));

    const results: UserFilingRow[] = [];
    for (const s of submissions) {
      const poa = await db
        .select()
        .from(poaFilings)
        .where(eq(poaFilings.submissionId, s.id))
        .limit(1)
        .then((r) => r[0] || null);
      const outcome = await db
        .select()
        .from(appealOutcomes)
        .where(eq(appealOutcomes.submissionId, s.id))
        .limit(1)
        .then((r) => r[0] || null);
      const job = await db
        .select()
        .from(filingJobs)
        .where(eq(filingJobs.submissionId, s.id))
        .orderBy(desc(filingJobs.createdAt))
        .limit(1)
        .then((r) => r[0] || null);

      results.push({
        submissionId: s.id,
        address: s.address,
        city: s.city ?? null,
        state: s.state ?? null,
        status: s.status,
        filingMethod: s.filingMethod ?? null,
        filedDate: poa?.filingDate ?? outcome?.filedAt ?? job?.completedAt ?? null,
        hearingDate: poa?.hearingDate ?? outcome?.hearingDate ?? null,
        hearingLocation: poa?.hearingLocation ?? null,
        hearingFormat: poa?.hearingFormat ?? null,
        outcome: poa?.outcome ?? null,
        newAssessedValue: poa?.newAssessedValue ?? outcome?.finalAssessedValue ?? null,
        assessmentReduction: poa?.assessmentReduction ?? outcome?.reductionAmount ?? null,
        annualTaxSavings: outcome?.annualTaxSavings ?? s.potentialSavings ?? null,
        confirmationNumber: poa?.confirmationNumber ?? null,
        portalUrl: poa?.portalUrl ?? null,
        lastUpdated: poa?.updatedAt ?? s.updatedAt,
        notes: poa?.notes ?? null,
        filingJob: job
          ? {
              id: job.id,
              status: job.status,
              deliveryChannel: job.deliveryChannel,
              deliveryStatus: job.deliveryStatus,
              portalConfirmationNumber: job.portalConfirmationNumber ?? null,
              mailTrackingNumber: job.mailTrackingNumber ?? null,
              lobExpectedDeliveryDate: job.lobExpectedDeliveryDate ?? null,
              emailRecipient: job.emailRecipient ?? null,
              completedAt: job.completedAt ?? null,
              errorMessage: job.errorMessage ?? null,
            }
          : null,
      });
    }
    return results;
  } catch (error) {
    log.error("[Database] Failed to list user filings:", { err: error });
    return [];
  }
}

/**
 * Look up the submissions that belong to a batchId. Batches are tagged in
 * the activity_logs table via metadata.batchId at submission time.
 */
export async function getBatchSubmissionIds(batchId: string): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const logs = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.type, "batch_submitted"))
      .orderBy(desc(activityLogs.createdAt));
    for (const log of logs) {
      if (!log.metadata) continue;
      try {
        const meta = JSON.parse(log.metadata);
        if (meta.batchId === batchId && Array.isArray(meta.results)) {
          return meta.results
            .filter((r: any) => r?.submissionId)
            .map((r: any) => Number(r.submissionId));
        }
      } catch {
        // ignore malformed metadata
      }
    }
    return [];
  } catch (error) {
    log.error("[Database] Failed to fetch batch submission ids:", { err: error });
    return [];
  }
}

// ─── FILING RECIPES ─────────────────────────────────────────────────────────

export async function getActiveRecipeForCounty(countyId: number): Promise<FilingRecipe | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(filingRecipes)
      .where(and(eq(filingRecipes.countyId, countyId), eq(filingRecipes.active, true)))
      .orderBy(desc(filingRecipes.version))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    log.error("[FilingRecipes] Failed to load recipe:", { err: error });
    return null;
  }
}

export async function upsertRecipe(recipe: InsertFilingRecipe): Promise<FilingRecipe | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    // Deactivate older active recipes for this county
    await db.update(filingRecipes)
      .set({ active: false })
      .where(eq(filingRecipes.countyId, recipe.countyId));
    const result = await db.insert(filingRecipes).values({ ...recipe, active: true }).returning({ id: filingRecipes.id });
    const id = result[0]?.id;
    return await db.select().from(filingRecipes).where(eq(filingRecipes.id, id)).limit(1).then(r => r[0] ?? null);
  } catch (error) {
    log.error("[FilingRecipes] Failed to upsert recipe:", { err: error });
    return null;
  }
}

// ─── SCRIVENER AUTHORIZATIONS ───────────────────────────────────────────────

export async function createScrivenerAuthorization(
  auth: InsertScrivenerAuthorization
): Promise<ScrivenerAuthorization | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(scrivenerAuthorizations).values(auth).returning({ id: scrivenerAuthorizations.id });
    const id = result[0]?.id;
    return await db.select().from(scrivenerAuthorizations)
      .where(eq(scrivenerAuthorizations.id, id))
      .limit(1)
      .then(r => r[0] ?? null);
  } catch (error) {
    log.error("[ScrivenerAuth] Failed to create:", { err: error });
    return null;
  }
}

export async function getScrivenerAuthorizationById(id: number): Promise<ScrivenerAuthorization | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.select().from(scrivenerAuthorizations)
      .where(eq(scrivenerAuthorizations.id, id))
      .limit(1)
      .then(r => r[0] ?? null);
  } catch (error) {
    log.error("[ScrivenerAuth] Failed to fetch:", { err: error });
    return null;
  }
}

// ─── FILING JOBS ────────────────────────────────────────────────────────────

export async function createFilingJob(job: InsertFilingJob): Promise<FilingJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(filingJobs).values(job).returning({ id: filingJobs.id });
    const id = result[0]?.id;
    return await db.select().from(filingJobs).where(eq(filingJobs.id, id)).limit(1).then(r => r[0] ?? null);
  } catch (error) {
    log.error("[FilingJob] Failed to create:", { err: error });
    return null;
  }
}

export async function getFilingJobById(id: number): Promise<FilingJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.select().from(filingJobs).where(eq(filingJobs.id, id)).limit(1).then(r => r[0] ?? null);
  } catch (error) {
    log.error("[FilingJob] Failed to fetch:", { err: error });
    return null;
  }
}

export async function getFilingJobBySubmissionId(submissionId: number): Promise<FilingJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.select().from(filingJobs)
      .where(eq(filingJobs.submissionId, submissionId))
      .orderBy(desc(filingJobs.createdAt))
      .limit(1)
      .then(r => r[0] ?? null);
  } catch (error) {
    log.error("[FilingJob] Failed to fetch by submission:", { err: error });
    return null;
  }
}

export async function updateFilingJob(id: number, updates: Partial<InsertFilingJob>): Promise<FilingJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(filingJobs).set(updates).where(eq(filingJobs.id, id));
    return getFilingJobById(id);
  } catch (error) {
    log.error("[FilingJob] Failed to update:", { err: error });
    return null;
  }
}

/**
 * Lightweight health-probe helpers used by /readyz to detect a stalled
 * filing pipeline (DB ping is necessary but not sufficient — the queue
 * worker can be wedged while the DB is still reachable).
 */
export async function countPendingFilingJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(filingJobs)
      .where(eq(filingJobs.status, "pending"));
    return Number(result[0]?.count ?? 0);
  } catch (error) {
    log.error("[FilingJob] Failed to count pending:", { err: error });
    return 0;
  }
}

export async function getLastFilingJobCompletedAt(): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db
      .select({ completedAt: filingJobs.completedAt })
      .from(filingJobs)
      .where(eq(filingJobs.status, "completed"))
      .orderBy(desc(filingJobs.completedAt))
      .limit(1);
    return result[0]?.completedAt ?? null;
  } catch (error) {
    log.error("[FilingJob] Failed to fetch last completed:", { err: error });
    return null;
  }
}

export async function listPendingFilingJobs(limit = 5): Promise<FilingJob[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(filingJobs)
      .where(eq(filingJobs.status, "pending"))
      .orderBy(filingJobs.queuedAt)
      .limit(limit);
  } catch (error) {
    log.error("[FilingJob] Failed to list pending:", { err: error });
    return [];
  }
}

export async function listRecentFilingJobs(limit = 50): Promise<FilingJob[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(filingJobs)
      .orderBy(desc(filingJobs.createdAt))
      .limit(limit);
  } catch (error) {
    log.error("[FilingJob] Failed to list recent:", { err: error });
    return [];
  }
}

export async function listFilingJobsByStatus(
  statuses: Array<FilingJob["status"]>,
  limit = 100
): Promise<FilingJob[]> {
  if (statuses.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(filingJobs)
      .where(
        statuses.length === 1
          ? eq(filingJobs.status, statuses[0])
          : sql`${filingJobs.status} in (${sql.join(
              statuses.map((s) => sql`${s}`),
              sql`, `
            )})`
      )
      .orderBy(desc(filingJobs.createdAt))
      .limit(limit);
  } catch (error) {
    log.error("[FilingJob] Failed to list by status:", { err: error });
    return [];
  }
}

// ─── REFUND REQUESTS ────────────────────────────────────────────────────────

export async function createRefundRequest(req: InsertRefundRequest): Promise<RefundRequest | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(refundRequests).values(req).returning({ id: refundRequests.id });
    const id = result[0]?.id;
    return await db.select().from(refundRequests).where(eq(refundRequests.id, id)).limit(1).then(r => r[0] ?? null);
  } catch (error) {
    log.error("[RefundRequest] Failed to create:", { err: error });
    return null;
  }
}

export async function getRefundRequestBySubmissionId(submissionId: number): Promise<RefundRequest | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db.select().from(refundRequests)
      .where(eq(refundRequests.submissionId, submissionId))
      .orderBy(desc(refundRequests.createdAt))
      .limit(1)
      .then(r => r[0] ?? null);
  } catch (error) {
    log.error("[RefundRequest] Failed to fetch:", { err: error });
    return null;
  }
}

export async function listPendingRefundRequests(limit = 200): Promise<RefundRequest[]> {
  const db = await getDb();
  if (!db) return [];
  const safeLimit = Math.min(Math.max(1, limit), 500);
  try {
    return await db.select().from(refundRequests)
      .where(eq(refundRequests.status, "pending"))
      .orderBy(refundRequests.requestedAt)
      .limit(safeLimit);
  } catch (error) {
    log.error("[RefundRequest] Failed to list pending:", { err: error });
    return [];
  }
}

export async function updateRefundRequest(id: number, updates: Partial<InsertRefundRequest>): Promise<RefundRequest | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(refundRequests).set(updates).where(eq(refundRequests.id, id));
    return await db.select().from(refundRequests).where(eq(refundRequests.id, id)).limit(1).then(r => r[0] ?? null);
  } catch (error) {
    log.error("[RefundRequest] Failed to update:", { err: error });
    return null;
  }
}

// ─── STRIPE WEBHOOK IDEMPOTENCY ─────────────────────────────────────────────

export async function recordStripeEvent(eventId: string, eventType: string): Promise<"recorded" | "duplicate"> {
  const db = await getDb();
  if (!db) return "recorded"; // fail open when DB is unavailable; webhook side will log
  try {
    await db.insert(stripeEventsProcessed).values({
      eventId,
      eventType,
    });
    return "recorded";
  } catch (error) {
    // PostgreSQL unique-constraint violation => we've already handled this event.
    const code = (error as any)?.code;
    if (code === "23505") return "duplicate";
    log.error("[StripeEvents] Failed to record event:", { err: error });
    return "recorded";
  }
}

// ─── COUNTY ELIGIBILITY ─────────────────────────────────────────────────────

export type CountyEligibility = {
  poaEligible: boolean;
  onlinePortalOnly: boolean;
  pinOnlyLogin: boolean;
  hasActiveRecipe: boolean;
  withinFilingWindow: boolean;
  reasonsIneligible: string[];
  // Which channel we actually plan to use if the user proceeds. Lets the
  // UI show "We'll file via certified mail" or "We'll file through the
  // online portal" before the user authorizes or pays.
  selectedChannel:
    | "portal"
    | "mail_certified"
    | "mail_first_class"
    | "email"
    | "unsupported";
};

function monthDayWithinWindow(start: string | null | undefined, end: string | null | undefined, today = new Date()): boolean {
  if (!start || !end) return true; // no window configured means always-on
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const now = `${mm}-${dd}`;
  if (start <= end) return now >= start && now <= end;
  // Window wraps the year boundary
  return now >= start || now <= end;
}

export async function getCountyEligibility(countyId: number): Promise<CountyEligibility> {
  const reasons: string[] = [];
  const county = await getCountyById(countyId);
  if (!county) {
    return {
      poaEligible: false,
      onlinePortalOnly: false,
      pinOnlyLogin: false,
      hasActiveRecipe: false,
      withinFilingWindow: false,
      reasonsIneligible: ["County not found"],
      selectedChannel: "unsupported",
    };
  }
  const recipe = await getActiveRecipeForCounty(countyId);
  const withinFilingWindow = monthDayWithinWindow(county.filingWindowStart ?? null, county.filingWindowEnd ?? null);
  if (!withinFilingWindow) reasons.push("Outside the annual filing window");

  // Channel resolution mirrors services/deliveryDispatcher.resolveChannel.
  // We keep the logic in both places because `getCountyEligibility` has to
  // stay dependency-light (db.ts doesn't import services) — but the two
  // MUST stay consistent or the user sees a different channel at preview
  // vs. at filing time.
  const preferred = county.preferredChannel;
  const hasMailingAddress =
    !!county.mailingAddressLine1 &&
    !!county.mailingAddressCity &&
    !!county.mailingAddressState &&
    !!county.mailingAddressZip;
  const hasEmail = !!county.intakeEmail && county.intakeEmail.includes("@");
  const recipeUsable =
    !!recipe &&
    (recipe.verificationStatus === "verified" ||
      recipe.verificationStatus === "staging" ||
      process.env.ALLOW_DRAFT_RECIPES === "1");

  let selected: CountyEligibility["selectedChannel"] = "unsupported";
  if (preferred === "portal" && recipeUsable) {
    selected = "portal";
  } else if (preferred === "email" && hasEmail) {
    selected = "email";
  } else if (
    (preferred === "mail_certified" || preferred === "mail_first_class") &&
    hasMailingAddress
  ) {
    selected = preferred;
  } else {
    // Fall back.
    const fb = county.fallbackChannel;
    if (fb === "email" && hasEmail) selected = "email";
    else if (
      (fb === "mail_certified" || fb === "mail_first_class") &&
      hasMailingAddress
    )
      selected = fb;
  }

  if (selected === "unsupported") {
    reasons.push("No viable delivery channel configured for this county");
    if (!hasMailingAddress) reasons.push("No county mailing address on file");
    if (!hasEmail && preferred === "email")
      reasons.push("County intake email not configured");
    if (preferred === "portal" && !recipeUsable) {
      if (!recipe) reasons.push("No active filing recipe for this county");
      else if (recipe.verificationStatus === "draft")
        reasons.push("Recipe is not verified against the live portal");
      else if (recipe.verificationStatus === "broken")
        reasons.push("Recipe is currently broken pending fix");
    }
  }

  return {
    poaEligible: Boolean(county.poaEligible),
    onlinePortalOnly: Boolean(county.onlinePortalOnly),
    pinOnlyLogin: Boolean(county.pinOnlyLogin),
    hasActiveRecipe: Boolean(recipe),
    withinFilingWindow,
    reasonsIneligible: reasons,
    selectedChannel: selected,
  };
}

// ─── COUNTY WAITLIST ────────────────────────────────────────────────────────

export async function addWaitlistEntry(
  entry: InsertCountyWaitlistEntry
): Promise<CountyWaitlistEntry | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(countyWaitlist).values(entry).returning({ id: countyWaitlist.id });
    const id = result[0]?.id;
    return await db.select().from(countyWaitlist)
      .where(eq(countyWaitlist.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);
  } catch (error) {
    log.error("[Waitlist] Failed to add entry:", { err: error });
    return null;
  }
}

export async function listWaitlistEntries(limit = 200): Promise<CountyWaitlistEntry[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(countyWaitlist)
      .orderBy(desc(countyWaitlist.createdAt))
      .limit(limit);
  } catch (error) {
    log.error("[Waitlist] Failed to list entries:", { err: error });
    return [];
  }
}

export async function aggregateWaitlistByCounty(): Promise<
  Array<{ state: string | null; countyName: string | null; count: number }>
> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        state: countyWaitlist.state,
        countyName: countyWaitlist.countyName,
        count: sql<number>`count(*)`,
      })
      .from(countyWaitlist)
      .groupBy(countyWaitlist.state, countyWaitlist.countyName)
      .orderBy(sql`count(*) desc`);
    return rows.map((r) => ({
      state: r.state,
      countyName: r.countyName,
      count: Number(r.count ?? 0),
    }));
  } catch (error) {
    log.error("[Waitlist] Failed to aggregate:", { err: error });
    return [];
  }
}

// ─── FILING STATS (ADMIN) ───────────────────────────────────────────────────

export type FilingStatsRow = { key: string; count: number };

export interface FilingStats {
  totalJobs: number;
  sinceDate: Date;
  byStatus: FilingStatsRow[];
  byChannel: FilingStatsRow[];
  byDeliveryStatus: FilingStatsRow[];
  deliveredInWindow: number;
  returnedInWindow: number;
  successRate7d: number | null; // 0..1 of completed/(completed+failed) in the last 7 days
}

export async function getFilingStats(windowDays = 30): Promise<FilingStats> {
  const empty: FilingStats = {
    totalJobs: 0,
    sinceDate: new Date(),
    byStatus: [],
    byChannel: [],
    byDeliveryStatus: [],
    deliveredInWindow: 0,
    returnedInWindow: 0,
    successRate7d: null,
  };
  const db = await getDb();
  if (!db) return empty;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const rows = await db
      .select()
      .from(filingJobs)
      .where(gte(filingJobs.createdAt, since));

    const byStatus = new Map<string, number>();
    const byChannel = new Map<string, number>();
    const byDeliveryStatus = new Map<string, number>();
    let delivered = 0;
    let returned = 0;
    let completed7d = 0;
    let failed7d = 0;

    for (const r of rows) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
      const ch = r.deliveryChannel ?? "unassigned";
      byChannel.set(ch, (byChannel.get(ch) ?? 0) + 1);
      const ds = r.deliveryStatus ?? "pending";
      byDeliveryStatus.set(ds, (byDeliveryStatus.get(ds) ?? 0) + 1);
      if (ds === "delivered") delivered += 1;
      if (ds === "returned" || ds === "failed") returned += 1;
      if (r.completedAt && r.completedAt >= sevenDaysAgo) {
        if (r.status === "completed") completed7d += 1;
        else if (r.status === "failed") failed7d += 1;
      }
    }

    const totalRated = completed7d + failed7d;
    const successRate7d = totalRated > 0 ? completed7d / totalRated : null;

    const mapToRows = (m: Map<string, number>): FilingStatsRow[] =>
      Array.from(m.entries())
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalJobs: rows.length,
      sinceDate: since,
      byStatus: mapToRows(byStatus),
      byChannel: mapToRows(byChannel),
      byDeliveryStatus: mapToRows(byDeliveryStatus),
      deliveredInWindow: delivered,
      returnedInWindow: returned,
      successRate7d,
    };
  } catch (error) {
    log.error("[FilingStats] Query failed:", { err: error });
    return empty;
  }
}

// ─── REFERRAL TRACKING ──────────────────────────────────────────────────────

/** Commission cents per tier */
const TIER_COMMISSION: Record<string, number> = {
  bronze: 2500,   // $25
  silver: 4000,   // $40
  gold: 5000,     // $50
  platinum: 7500, // $75
};

/** Tier thresholds based on lifetime referral count */
function computeTier(lifetimeReferrals: number): "bronze" | "silver" | "gold" | "platinum" {
  if (lifetimeReferrals >= 51) return "platinum";
  if (lifetimeReferrals >= 16) return "gold";
  if (lifetimeReferrals >= 6) return "silver";
  return "bronze";
}

/** Get or create a referral code for a user */
export async function getOrCreateReferralCode(userId: number): Promise<ReferralCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const existing = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
    if (existing.length > 0) return existing[0];

    const code = `APPR-${String(userId).padStart(4, "0")}`;
    await db.insert(referralCodes).values({ userId, code, tier: "bronze" });
    const created = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
    return created[0];
  } catch (error) {
    log.error("[Referral] Failed to get/create referral code:", { err: error });
    return undefined;
  }
}

/** Look up a referral code row by code string */
export async function getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
    return result[0];
  } catch (error) {
    log.error("[Referral] Failed to look up referral code:", { err: error });
    return undefined;
  }
}

/** Record a referral click / sign-up / submission */
export async function createReferralTracking(entry: InsertReferralTrackingEntry): Promise<ReferralTrackingEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(referralTracking).values(entry).returning({ id: referralTracking.id });
    const insertedId = result[0]?.id;
    const row = await db.select().from(referralTracking).where(eq(referralTracking.id, insertedId)).limit(1);
    return row[0];
  } catch (error) {
    log.error("[Referral] Failed to create tracking entry:", { err: error });
    return undefined;
  }
}

/** Find a referral tracking entry by referred user + referral code */
export async function getReferralTrackingByReferredUser(referredUserId: number, referralCode: string): Promise<ReferralTrackingEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(referralTracking)
      .where(and(eq(referralTracking.referredUserId, referredUserId), eq(referralTracking.referralCode, referralCode)))
      .limit(1);
    return result[0];
  } catch (error) {
    log.error("[Referral] Failed to get tracking by referred user:", { err: error });
    return undefined;
  }
}

/** Find a referral tracking entry by submission ID */
export async function getReferralTrackingBySubmission(submissionId: number): Promise<ReferralTrackingEntry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(referralTracking)
      .where(eq(referralTracking.submissionId, submissionId))
      .limit(1);
    return result[0];
  } catch (error) {
    log.error("[Referral] Failed to get tracking by submission:", { err: error });
    return undefined;
  }
}

/** Update a referral tracking entry */
export async function updateReferralTracking(id: number, updates: Partial<InsertReferralTrackingEntry>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const updateData = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
    await db.update(referralTracking).set(updateData).where(eq(referralTracking.id, id));
  } catch (error) {
    log.error("[Referral] Failed to update tracking entry:", { err: error });
  }
}

/** Credit a referral: update tracking status, bump referrer stats, recalculate tier */
export async function creditReferral(trackingId: number, stripePaymentIntentId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    // Get the tracking entry
    const [entry] = await db.select().from(referralTracking).where(eq(referralTracking.id, trackingId)).limit(1);
    if (!entry || entry.status === "credited") return;

    // Get the referrer's code row
    const [codeRow] = await db.select().from(referralCodes).where(eq(referralCodes.userId, entry.referrerUserId)).limit(1);
    if (!codeRow) return;

    // Calculate commission based on current tier
    const commissionCents = TIER_COMMISSION[codeRow.tier] || 2500;

    // Update tracking entry
    await db.update(referralTracking).set({
      status: "credited",
      commissionCents,
      commissionTier: codeRow.tier,
      stripePaymentIntentId,
      creditedAt: new Date(),
    }).where(eq(referralTracking.id, trackingId));

    // Bump referrer stats
    const newLifetime = codeRow.lifetimeReferrals + 1;
    const newTier = computeTier(newLifetime);
    await db.update(referralCodes).set({
      lifetimeReferrals: newLifetime,
      lifetimeEarningsCents: codeRow.lifetimeEarningsCents + commissionCents,
      pendingBalanceCents: codeRow.pendingBalanceCents + commissionCents,
      tier: newTier,
    }).where(eq(referralCodes.id, codeRow.id));

    log.info(`[Referral] Credited ${commissionCents / 100} to user ${entry.referrerUserId} (tier: ${newTier})`);
  } catch (error) {
    log.error("[Referral] Failed to credit referral:", { err: error });
  }
}

/** Reverse a referral credit (e.g. on refund) */
export async function reverseReferralCredit(submissionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const [entry] = await db.select().from(referralTracking)
      .where(and(eq(referralTracking.submissionId, submissionId), eq(referralTracking.status, "credited")))
      .limit(1);
    if (!entry) return;

    // Update tracking
    await db.update(referralTracking).set({
      status: "reversed",
      reversedAt: new Date(),
    }).where(eq(referralTracking.id, entry.id));

    // Deduct from referrer balance
    const [codeRow] = await db.select().from(referralCodes).where(eq(referralCodes.userId, entry.referrerUserId)).limit(1);
    if (codeRow) {
      await db.update(referralCodes).set({
        pendingBalanceCents: Math.max(0, codeRow.pendingBalanceCents - entry.commissionCents),
        lifetimeEarningsCents: Math.max(0, codeRow.lifetimeEarningsCents - entry.commissionCents),
      }).where(eq(referralCodes.id, codeRow.id));
    }

    log.info(`[Referral] Reversed credit for submission ${submissionId}`);
  } catch (error) {
    log.error("[Referral] Failed to reverse referral credit:", { err: error });
  }
}

/** Get referral stats for a user's dashboard */
export async function getReferralDashboard(userId: number) {
  const db = await getDb();
  if (!db) return null;
  try {
    const codeRow = await getOrCreateReferralCode(userId);
    if (!codeRow) return null;

    // Get recent referrals
    const recentReferrals = await db.select().from(referralTracking)
      .where(eq(referralTracking.referrerUserId, userId))
      .orderBy(desc(referralTracking.createdAt))
      .limit(50);

    const successfulCount = recentReferrals.filter(r => r.status === "credited").length;
    const pendingCount = recentReferrals.filter(r => ["clicked", "signed_up", "submitted", "paid"].includes(r.status)).length;

    return {
      code: codeRow.code,
      tier: codeRow.tier,
      lifetimeReferrals: codeRow.lifetimeReferrals,
      lifetimeEarningsCents: codeRow.lifetimeEarningsCents,
      pendingBalanceCents: codeRow.pendingBalanceCents,
      paidOutCents: codeRow.paidOutCents,
      successfulCount,
      pendingCount,
      recentReferrals: recentReferrals.map(r => ({
        id: r.id,
        referredEmail: r.referredEmail,
        status: r.status,
        commissionCents: r.commissionCents,
        createdAt: r.createdAt,
        creditedAt: r.creditedAt,
      })),
    };
  } catch (error) {
    log.error("[Referral] Failed to get dashboard:", { err: error });
    return null;
  }
}

/** Create a payout request */
export async function createReferralPayout(userId: number, amountCents: number): Promise<ReferralPayout | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(referralPayouts).values({
      userId,
      amountCents,
      status: "pending",
      method: "stripe_transfer",
    }).returning({ id: referralPayouts.id });
    const insertedId = result[0]?.id;
    const row = await db.select().from(referralPayouts).where(eq(referralPayouts.id, insertedId)).limit(1);

    // Deduct from pending balance
    const [codeRow] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
    if (codeRow) {
      await db.update(referralCodes).set({
        pendingBalanceCents: Math.max(0, codeRow.pendingBalanceCents - amountCents),
        paidOutCents: codeRow.paidOutCents + amountCents,
      }).where(eq(referralCodes.id, codeRow.id));
    }

    return row[0];
  } catch (error) {
    log.error("[Referral] Failed to create payout:", { err: error });
    return undefined;
  }
}

// ─── ADMIN REFERRAL MANAGEMENT ──────────────────────────────────────────────

/** List all referral codes with user info for admin leaderboard */
export async function listAllReferralCodes(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        id: referralCodes.id,
        userId: referralCodes.userId,
        code: referralCodes.code,
        tier: referralCodes.tier,
        lifetimeReferrals: referralCodes.lifetimeReferrals,
        lifetimeEarningsCents: referralCodes.lifetimeEarningsCents,
        pendingBalanceCents: referralCodes.pendingBalanceCents,
        paidOutCents: referralCodes.paidOutCents,
        createdAt: referralCodes.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(referralCodes)
      .leftJoin(users, eq(referralCodes.userId, users.id))
      .orderBy(desc(referralCodes.lifetimeEarningsCents))
      .limit(limit);
    return rows;
  } catch (error) {
    log.error("[Admin Referral] Failed to list codes:", { err: error });
    return [];
  }
}

/** List all referral tracking entries for admin view */
export async function listAllReferralTracking(limit: number = 200) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        id: referralTracking.id,
        referrerUserId: referralTracking.referrerUserId,
        referredEmail: referralTracking.referredEmail,
        referralCode: referralTracking.referralCode,
        submissionId: referralTracking.submissionId,
        status: referralTracking.status,
        commissionCents: referralTracking.commissionCents,
        commissionTier: referralTracking.commissionTier,
        clickedAt: referralTracking.clickedAt,
        paidAt: referralTracking.paidAt,
        creditedAt: referralTracking.creditedAt,
        reversedAt: referralTracking.reversedAt,
        createdAt: referralTracking.createdAt,
      })
      .from(referralTracking)
      .orderBy(desc(referralTracking.createdAt))
      .limit(limit);
    return rows;
  } catch (error) {
    log.error("[Admin Referral] Failed to list tracking:", { err: error });
    return [];
  }
}

/** List all referral payouts for admin management */
export async function listAllReferralPayouts(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select({
        id: referralPayouts.id,
        userId: referralPayouts.userId,
        amountCents: referralPayouts.amountCents,
        status: referralPayouts.status,
        method: referralPayouts.method,
        stripeTransferId: referralPayouts.stripeTransferId,
        notes: referralPayouts.notes,
        requestedAt: referralPayouts.requestedAt,
        processedAt: referralPayouts.processedAt,
        completedAt: referralPayouts.completedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(referralPayouts)
      .leftJoin(users, eq(referralPayouts.userId, users.id))
      .orderBy(desc(referralPayouts.requestedAt))
      .limit(limit);
    return rows;
  } catch (error) {
    log.error("[Admin Referral] Failed to list payouts:", { err: error });
    return [];
  }
}

/** Update a referral payout status (admin action) */
export async function updateReferralPayout(
  payoutId: number,
  updates: { status?: string; notes?: string; processedAt?: Date; completedAt?: Date; stripeTransferId?: string }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(referralPayouts).set(updates as any).where(eq(referralPayouts.id, payoutId));
    return true;
  } catch (error) {
    log.error("[Admin Referral] Failed to update payout:", { err: error });
    return false;
  }
}

/** Get aggregate referral stats for admin dashboard */
export async function getReferralAdminStats() {
  const db = await getDb();
  if (!db) return { totalCodes: 0, totalReferrals: 0, totalEarningsCents: 0, totalPendingCents: 0, totalPaidCents: 0, pendingPayouts: 0 };
  try {
    const codes = await db.select().from(referralCodes);
    const pendingPayoutRows = await db.select().from(referralPayouts).where(eq(referralPayouts.status, "pending"));

    const totalCodes = codes.length;
    const totalReferrals = codes.reduce((s, c) => s + c.lifetimeReferrals, 0);
    const totalEarningsCents = codes.reduce((s, c) => s + c.lifetimeEarningsCents, 0);
    const totalPendingCents = codes.reduce((s, c) => s + c.pendingBalanceCents, 0);
    const totalPaidCents = codes.reduce((s, c) => s + c.paidOutCents, 0);
    const pendingPayouts = pendingPayoutRows.length;

    return { totalCodes, totalReferrals, totalEarningsCents, totalPendingCents, totalPaidCents, pendingPayouts };
  } catch (error) {
    log.error("[Admin Referral] Failed to get stats:", { err: error });
    return { totalCodes: 0, totalReferrals: 0, totalEarningsCents: 0, totalPendingCents: 0, totalPaidCents: 0, pendingPayouts: 0 };
  }
}

/** Update a referral code tier (admin override) */
export async function updateReferralCodeTier(codeId: number, tier: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(referralCodes).set({ tier: tier as any }).where(eq(referralCodes.id, codeId));
    return true;
  } catch (error) {
    log.error("[Admin Referral] Failed to update tier:", { err: error });
    return false;
  }
}
