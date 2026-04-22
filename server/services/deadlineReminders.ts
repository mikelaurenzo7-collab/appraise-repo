/**
 * Filing-deadline reminder cron.
 *
 * Runs daily. For each property submission that has:
 *   - an email on file,
 *   - a county whose filing window closes in N days (default 7),
 *   - no completed filing_job yet,
 *   - no reminder sent in the last 6 days (de-dupe via activity_logs),
 *
 * send a one-shot reminder email. Prevents the most common refund
 * trigger: user ran the free analysis, got distracted, deadline lapsed.
 */

import { and, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import {
  activityLogs,
  counties,
  filingJobs,
  propertySubmissions,
} from "../../drizzle/schema";
import { getDb, persistActivityLog } from "../db";
import { sendFilingDeadlineReminderEmail } from "../_core/emailService";

const DEFAULT_REMINDER_DAYS = 7;
const DE_DUP_WINDOW_DAYS = 6;

export interface ReminderResult {
  scanned: number;
  sent: number;
  skipped: number;
  errors: number;
}

/**
 * Parse a "MM-DD" filing window string into a Date in the current year.
 * Returns null if the string is malformed.
 */
function nextOccurrence(mmdd: string | null | undefined, now = new Date()): Date | null {
  if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) return null;
  const [mm, dd] = mmdd.split("-").map((x) => Number(x));
  const thisYear = new Date(now.getFullYear(), mm - 1, dd, 23, 59, 59);
  if (thisYear.getTime() >= now.getTime()) return thisYear;
  // Already passed this year — return next year's occurrence.
  return new Date(now.getFullYear() + 1, mm - 1, dd, 23, 59, 59);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export async function sendPendingDeadlineReminders(opts: {
  reminderDays?: number;
  now?: Date;
} = {}): Promise<ReminderResult> {
  const result: ReminderResult = { scanned: 0, sent: 0, skipped: 0, errors: 0 };
  const reminderDays = opts.reminderDays ?? DEFAULT_REMINDER_DAYS;
  const now = opts.now ?? new Date();
  const db = await getDb();
  if (!db) return result;

  // Pull candidate submissions: must have an email and a county.
  const candidates = await db
    .select({
      submissionId: propertySubmissions.id,
      submissionEmail: propertySubmissions.email,
      submissionAddress: propertySubmissions.address,
      submissionCounty: propertySubmissions.county,
      submissionState: propertySubmissions.state,
      submissionStatus: propertySubmissions.status,
      filingWindowEnd: counties.filingWindowEnd,
      countyName: counties.countyName,
    })
    .from(propertySubmissions)
    .leftJoin(
      counties,
      and(
        eq(counties.countyName, propertySubmissions.county),
        eq(counties.state, propertySubmissions.state)
      )
    )
    .where(
      and(
        isNotNull(propertySubmissions.email),
        isNotNull(counties.filingWindowEnd)
      )
    )
    .limit(500);

  for (const row of candidates) {
    result.scanned += 1;
    if (!row.filingWindowEnd) {
      result.skipped += 1;
      continue;
    }
    const endDate = nextOccurrence(row.filingWindowEnd, now);
    if (!endDate) {
      result.skipped += 1;
      continue;
    }
    const daysRemaining = daysBetween(endDate, now);
    if (daysRemaining !== reminderDays) {
      result.skipped += 1;
      continue;
    }

    // Skip if already filed.
    const priorFiling = await db
      .select()
      .from(filingJobs)
      .where(
        and(
          eq(filingJobs.submissionId, row.submissionId),
          or(
            eq(filingJobs.status, "completed"),
            eq(filingJobs.status, "processing"),
            eq(filingJobs.status, "pending")
          )
        )
      )
      .limit(1);
    if (priorFiling.length > 0) {
      result.skipped += 1;
      continue;
    }

    // Skip if we sent a reminder recently.
    const dedupeCutoff = new Date(
      now.getTime() - DE_DUP_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const recent = await db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.submissionId, row.submissionId),
          eq(activityLogs.type, "deadline_reminder_sent"),
          gte(activityLogs.createdAt, dedupeCutoff)
        )
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(1);
    if (recent.length > 0) {
      result.skipped += 1;
      continue;
    }

    try {
      const dashboardOrigin = process.env.PUBLIC_APP_URL || "https://appraise-ai.manus.space";
      const ok = await sendFilingDeadlineReminderEmail({
        userEmail: row.submissionEmail,
        userName: row.submissionEmail.split("@")[0],
        propertyAddress: row.submissionAddress,
        countyName: row.countyName ?? row.submissionCounty ?? "your county",
        daysRemaining,
        windowEndDate: endDate.toISOString(),
        dashboardUrl: `${dashboardOrigin}/dashboard`,
      });
      if (ok) {
        result.sent += 1;
        await persistActivityLog({
          submissionId: row.submissionId,
          type: "deadline_reminder_sent",
          actor: "system",
          description: `Sent ${daysRemaining}-day reminder for ${row.countyName ?? "county"}`,
          metadata: JSON.stringify({
            daysRemaining,
            windowEndDate: endDate.toISOString(),
          }),
          status: "success",
        });
      } else {
        result.errors += 1;
      }
    } catch (err) {
      console.error(`[DeadlineReminders] submission=${row.submissionId}`, err);
      result.errors += 1;
    }
  }

  return result;
}

export function buildDeadlineReminderInterval(
  intervalMs: number = 24 * 60 * 60 * 1000
): () => NodeJS.Timeout {
  return () =>
    setInterval(async () => {
      try {
        const r = await sendPendingDeadlineReminders();
        if (r.sent > 0 || r.errors > 0) {
          console.log(
            `[DeadlineReminders] scanned=${r.scanned} sent=${r.sent} skipped=${r.skipped} errors=${r.errors}`
          );
        }
      } catch (err) {
        console.error("[DeadlineReminders] top-level error", err);
      }
    }, intervalMs);
}

// tree-shake guard for the sql import (we reserve it for future IN clauses)
void sql;
