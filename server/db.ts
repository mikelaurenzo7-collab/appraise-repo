import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  propertySubmissions, InsertPropertySubmission,
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
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

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
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
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
  if (!db) { console.warn("[Database] Cannot create submission: database not available"); return undefined; }
  try {
    const result = await db.insert(propertySubmissions).values(submission);
    const insertedId = (result as any).insertId;
    const record = await db.select().from(propertySubmissions).where(eq(propertySubmissions.id, insertedId)).limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create property submission:", error);
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
    console.error("[Database] Failed to get property submission:", error);
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
    console.error("[Database] Failed to update property submission:", error);
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
    console.error("[Database] Failed to get user submissions:", error);
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
    console.error("[Database] Failed to list submissions:", error);
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
    console.error("[Database] Failed to get stats:", error);
    return { total: 0, pending: 0, analyzing: 0, analyzed: 0, won: 0, lost: 0, avgSavings: null, totalRevenue: 0 };
  }
}

// ─── PROPERTY ANALYSIS ────────────────────────────────────────────────────────

export async function createPropertyAnalysis(analysis: InsertPropertyAnalysis) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(propertyAnalysis).values(analysis);
    const insertedId = (result as any).insertId;
    const record = await db.select().from(propertyAnalysis).where(eq(propertyAnalysis.id, insertedId)).limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create property analysis:", error);
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
    console.error("[Database] Failed to get property analysis:", error);
    return undefined;
  }
}

// ─── APPEAL OUTCOMES ──────────────────────────────────────────────────────────

export async function createAppealOutcome(outcome: InsertAppealOutcome) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.insert(appealOutcomes).values(outcome);
    const insertedId = (result as any).insertId;
    const record = await db.select().from(appealOutcomes).where(eq(appealOutcomes.id, insertedId)).limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create appeal outcome:", error);
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
    console.error("[Database] Failed to update appeal outcome:", error);
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
    console.error("[Database] Failed to get appeal outcome:", error);
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
    console.error("[Database] Failed to list appeal outcomes:", error);
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
    console.error("[Database] Failed to get outcome stats:", error);
    return { totalFiled: 0, won: 0, lost: 0, settled: 0, winRate: 0, avgSavings: 0, totalRevenue: 0, avgResolutionDays: 0 };
  }
}

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

export async function persistActivityLog(log: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to persist activity log:", error);
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
    console.error("[Database] Failed to get activity logs:", error);
    return [];
  }
}

export interface SubmissionPhoto {
  url: string;
  category: "exterior" | "interior" | "roof" | "foundation" | "other";
  caption?: string;
  fileName?: string;
  uploadedAt: Date;
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
        category?: SubmissionPhoto["category"];
        caption?: string;
        fileName?: string;
      };
      if (!meta.url) continue;
      photos.push({
        url: meta.url,
        category: meta.category ?? "other",
        caption: meta.caption,
        fileName: meta.fileName,
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
 * Extract uploaded photos for a submission by reading the `photo_uploaded`
 * activity-log entries. Photos are stored in S3 via storagePut and only the
 * URL + category + caption are persisted (as JSON in `metadata`).
 */
export async function getSubmissionPhotos(submissionId: number): Promise<SubmissionPhoto[]> {
  const logs = await getActivityLogsBySubmission(submissionId);
  return parsePhotosFromLogs(logs);
}

export async function getRecentActivityLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get recent activity logs:", error);
    return [];
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
    console.error("[Cache] Failed to get cached response:", error);
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
    await db.insert(apiCache).values(entry).onDuplicateKeyUpdate({
      set: { responseData: entry.responseData, expiresAt: entry.expiresAt, hitCount: 0 },
    });
  } catch (error) {
    console.error("[Cache] Failed to set cached response:", error);
  }
}

export async function evictExpiredCache() {
  const db = await getDb();
  if (!db) return 0;
  try {
    const now = new Date();
    const result = await db.delete(apiCache).where(lt(apiCache.expiresAt, now));
    return (result as any).affectedRows ?? 0;
  } catch (error) {
    console.error("[Cache] Failed to evict expired cache:", error);
    return 0;
  }
}

// ─── REPORT JOBS ─────────────────────────────────────────────────────────────

export async function createReportJob(data: InsertReportJob): Promise<ReportJob | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(reportJobs).values(data);
    const id = (result as any).insertId;
    return id ? await getReportJobById(id) : null;
  } catch (error) {
    console.error("[ReportJob] Failed to create:", error);
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
    console.error("[ReportJob] Failed to get by ID:", error);
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
    console.error("[ReportJob] Failed to get by submission:", error);
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
    console.error("[ReportJob] Failed to update:", error);
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
    console.error("[ReportJob] Failed to list pending:", error);
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
    console.error("[ReportJob] Failed to list failed:", error);
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
    return (result as any).affectedRows ?? 0;
  } catch (error) {
    console.error("[ReportJob] Failed to cleanup expired:", error);
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
    console.error("[County] Failed to get county:", error);
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
    console.error("[County] Failed to get county by ID:", error);
    return null;
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
    console.error("[County] Failed to list counties:", error);
    return [];
  }
}

export async function createCounty(county: InsertCounty): Promise<County | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(counties).values(county);
    const id = (result as any).insertId;
    return await getCountyById(id);
  } catch (error) {
    console.error("[County] Failed to create county:", error);
    return null;
  }
}

// ─── FILING TIERS ────────────────────────────────────────────────────────────

export async function createFilingTier(tier: InsertFilingTier): Promise<FilingTier | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(filingTiers).values(tier);
    const id = (result as any).insertId;
    return await db.select().from(filingTiers)
      .where(eq(filingTiers.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    console.error("[FilingTier] Failed to create tier:", error);
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
    console.error("[FilingTier] Failed to get tier:", error);
    return null;
  }
}

// ─── POA FILINGS ─────────────────────────────────────────────────────────────

export async function createPOAFiling(filing: InsertPOAFiling): Promise<POAFiling | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(poaFilings).values(filing);
    const id = (result as any).insertId;
    return await db.select().from(poaFilings)
      .where(eq(poaFilings.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    console.error("[POAFiling] Failed to create filing:", error);
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
    console.error("[POAFiling] Failed to get filing:", error);
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
    console.error("[POAFiling] Failed to list pending:", error);
    return [];
  }
}

// ─── PRO SE FILINGS ──────────────────────────────────────────────────────────

export async function createProSeFiling(filing: InsertProSeFiling): Promise<ProSeFiling | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(proSeFilings).values(filing);
    const id = (result as any).insertId;
    return await db.select().from(proSeFilings)
      .where(eq(proSeFilings.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    console.error("[ProSeFiling] Failed to create filing:", error);
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
    console.error("[ProSeFiling] Failed to get filing:", error);
    return null;
  }
}

// ─── PARALEGALS QUEUE ────────────────────────────────────────────────────────

export async function addToParalegalsQueue(item: InsertParalegalsQueueItem): Promise<ParalegalsQueueItem | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(paralegalsQueue).values(item);
    const id = (result as any).insertId;
    return await db.select().from(paralegalsQueue)
      .where(eq(paralegalsQueue.id, id))
      .limit(1)
      .then(r => r[0] || null);
  } catch (error) {
    console.error("[ParalegalsQueue] Failed to add item:", error);
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
    console.error("[ParalegalsQueue] Failed to list queued:", error);
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
    console.error("[ParalegalsQueue] Failed to list workload:", error);
    return [];
  }
}
