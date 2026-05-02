/**
 * Vercel Cron entrypoint.
 *
 * Vercel cron jobs are HTTP GETs scheduled in vercel.json. They invoke this
 * route which dispatches to the appropriate background-task handler based
 * on the `?task=` query param. Each background task is a single shot that
 * processes a small batch and returns immediately — no long-running
 * intervals, since serverless functions cannot.
 *
 * Auth: every cron call MUST present `Authorization: Bearer ${CRON_SECRET}`.
 * Vercel automatically attaches this header to scheduled cron requests when
 * the env var is set; manual callers must do the same.
 *
 * Tasks:
 *   ?task=process-analysis     Pick up pending/stuck submissions and run analysis
 *   ?task=process-reports      Generate any queued PDF reports
 *   ?task=cleanup-reports      Mark expired report jobs as expired
 *   ?task=process-filings      Dispatch any pending appeal filings
 *   ?task=cleanup-filings      Purge expired filing artifacts from storage
 *   ?task=lob-reconcile        Reconcile Lob mail-tracking statuses
 *   ?task=deadline-reminders   Send T-30 / T-7 / T-1 deadline reminder emails
 */

import type { IncomingMessage, ServerResponse } from "node:http";

const ALL_TASKS = [
  "process-analysis",
  "process-reports",
  "cleanup-reports",
  "process-filings",
  "cleanup-filings",
  "lob-reconcile",
  "deadline-reminders",
] as const;
type Task = (typeof ALL_TASKS)[number];

function parseTask(req: IncomingMessage): Task | null {
  const url = req.url || "";
  const q = url.split("?")[1] || "";
  const params = new URLSearchParams(q);
  const t = params.get("task") || "";
  return (ALL_TASKS as readonly string[]).includes(t) ? (t as Task) : null;
}

function readJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function runTask(task: Task): Promise<unknown> {
  switch (task) {
    case "process-analysis": {
      const { findStuckAnalysisSubmissions, updatePropertySubmission, listPendingAnalysisSubmissions } =
        await import("../../server/db");
      const { analyzePropertySubmission } = await import("../../server/services/analysisJob");

      const results: Array<{ id: number; ok: boolean; error?: string }> = [];

      // Pending submissions never picked up
      const pending = (await listPendingAnalysisSubmissions?.(5)) ?? [];
      // Stuck (analyzing > 10 minutes)
      const stuck = await findStuckAnalysisSubmissions(10 * 60 * 1000);
      for (const s of stuck) {
        await updatePropertySubmission(s.id, { status: "pending" });
      }

      const candidates = [
        ...pending.map((s: { id: number }) => s.id),
        ...stuck.map((s: { id: number }) => s.id),
      ];
      const unique = Array.from(new Set(candidates)).slice(0, 3); // small batch per cron tick

      for (const id of unique) {
        try {
          await analyzePropertySubmission(id);
          results.push({ id, ok: true });
        } catch (err) {
          results.push({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
        }
      }
      return { processed: results.length, results };
    }

    case "process-reports": {
      const { processPendingReportJobs } = await import("../../server/services/reportJobQueue");
      const count = await processPendingReportJobs(3);
      return { processed: count };
    }

    case "cleanup-reports": {
      const { cleanupExpiredReportJobs } = await import("../../server/db");
      const count = await cleanupExpiredReportJobs();
      return { cleaned: count };
    }

    case "process-filings": {
      const { processPendingFilingJobs } = await import("../../server/services/filingJobQueue");
      const count = await processPendingFilingJobs(2);
      return { processed: count };
    }

    case "cleanup-filings": {
      const { cleanupExpiredFilingArtifacts } = await import("../../server/services/filingCleanup");
      const r = await cleanupExpiredFilingArtifacts();
      return r;
    }

    case "lob-reconcile": {
      const { reconcilePendingMailFilings } = await import("../../server/services/lobReconciliation");
      const r = await reconcilePendingMailFilings(25);
      return r;
    }

    case "deadline-reminders": {
      const { sendPendingDeadlineReminders } = await import("../../server/services/deadlineReminders");
      const r = await sendPendingDeadlineReminders();
      return r;
    }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const auth = req.headers["authorization"] || "";
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected) {
    return readJson(res, 500, { error: "CRON_SECRET not configured" });
  }
  if (auth !== expected) {
    return readJson(res, 401, { error: "Unauthorized" });
  }

  const task = parseTask(req);
  if (!task) {
    return readJson(res, 400, { error: "Unknown or missing task", validTasks: ALL_TASKS });
  }

  const start = Date.now();
  try {
    const result = await runTask(task);
    return readJson(res, 200, { ok: true, task, durationMs: Date.now() - start, result });
  } catch (err) {
    console.error(`[Cron:${task}]`, err);
    return readJson(res, 500, {
      ok: false,
      task,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
