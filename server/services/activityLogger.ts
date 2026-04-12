/**
 * Activity Logger Service
 * 
 * Logs all actions, decisions, and state changes for:
 * - Audit trail
 * - Analytics and reporting
 * - Debugging and troubleshooting
 * - Compliance and legal documentation
 */

export type ActivityType =
  | "submission_received"
  | "property_classified"
  | "data_aggregated"
  | "analysis_started"
  | "analysis_completed"
  | "analysis_failed"
  | "appeal_strategy_generated"
  | "filing_initiated"
  | "document_generated"
  | "hearing_scheduled"
  | "hearing_completed"
  | "appeal_won"
  | "appeal_lost"
  | "appeal_withdrawn"
  | "admin_action";

export interface ActivityLog {
  submissionId: number;
  timestamp: Date;
  type: ActivityType;
  actor: "system" | "user" | "admin";
  actorId?: number;
  description: string;
  metadata: Record<string, any>;
  status: "success" | "warning" | "error";
  duration?: number; // milliseconds
}

/**
 * In-memory activity log (in production, this would be a database table)
 */
const activityLogs: ActivityLog[] = [];

/**
 * Log an activity
 */
export function logActivity(
  submissionId: number,
  type: ActivityType,
  description: string,
  metadata: Record<string, any> = {},
  actor: "system" | "user" | "admin" = "system",
  status: "success" | "warning" | "error" = "success",
  duration?: number
): ActivityLog {
  const log: ActivityLog = {
    submissionId,
    timestamp: new Date(),
    type,
    actor,
    description,
    metadata,
    status,
    duration,
  };

  activityLogs.push(log);
  console.log(`[Activity] ${type}: ${description}`);

  return log;
}

/**
 * Get activity logs for a submission
 */
export function getActivityLogs(submissionId: number): ActivityLog[] {
  return activityLogs.filter((log) => log.submissionId === submissionId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get all activity logs (for admin dashboard)
 */
export function getAllActivityLogs(limit: number = 100): ActivityLog[] {
  return activityLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}

/**
 * Get activity summary for a submission
 */
export function getActivitySummary(submissionId: number): {
  totalActions: number;
  timeline: string[];
  errors: string[];
  lastAction: ActivityLog | null;
} {
  const logs = getActivityLogs(submissionId);

  return {
    totalActions: logs.length,
    timeline: logs.map((log) => `${log.timestamp.toLocaleTimeString()}: ${log.description}`),
    errors: logs.filter((log) => log.status === "error").map((log) => log.description),
    lastAction: logs[0] || null,
  };
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(): {
  totalSubmissions: number;
  completedAnalyses: number;
  failedAnalyses: number;
  appealsInitiated: number;
  averageProcessingTime: number;
  successRate: number;
} {
  const submissionIds = new Set(activityLogs.map((log) => log.submissionId));
  const totalSubmissions = submissionIds.size;

  const completedAnalyses = new Set(
    activityLogs.filter((log) => log.type === "analysis_completed").map((log) => log.submissionId)
  ).size;

  const failedAnalyses = new Set(
    activityLogs.filter((log) => log.type === "analysis_failed").map((log) => log.submissionId)
  ).size;

  const appealsInitiated = new Set(
    activityLogs.filter((log) => log.type === "filing_initiated").map((log) => log.submissionId)
  ).size;

  const processingTimes = activityLogs
    .filter((log) => log.duration)
    .map((log) => log.duration as number);
  const averageProcessingTime =
    processingTimes.length > 0 ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) : 0;

  const appealsWon = activityLogs.filter((log) => log.type === "appeal_won").length;
  const successRate = appealsInitiated > 0 ? Math.round((appealsWon / appealsInitiated) * 100) : 0;

  return {
    totalSubmissions,
    completedAnalyses,
    failedAnalyses,
    appealsInitiated,
    averageProcessingTime,
    successRate,
  };
}

/**
 * Export activity logs for reporting
 */
export function exportActivityLogs(format: "json" | "csv" = "json"): string {
  if (format === "json") {
    return JSON.stringify(activityLogs, null, 2);
  }

  // CSV format
  const headers = ["Submission ID", "Timestamp", "Type", "Actor", "Description", "Status", "Duration (ms)"];
  const rows = activityLogs.map((log) => [
    log.submissionId,
    log.timestamp.toISOString(),
    log.type,
    log.actor,
    log.description,
    log.status,
    log.duration || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  return csv;
}
