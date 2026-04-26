/**
 * Maps the real activity-log event stream emitted by analysisJob into
 * user-facing pipeline stages, so the AnalysisResults page can render
 * progress that actually reflects what the backend is doing.
 *
 * Keeping this in /shared means the server and client share one source
 * of truth for stage definitions.
 */

export type PipelineStageKey =
  | "classify"
  | "aggregate"
  | "valuation"
  | "strategy"
  | "finalize";

export interface PipelineStageDefinition {
  key: PipelineStageKey;
  label: string;
  description: string;
  // Activity-log event types that, when present, mean this stage is complete.
  completedBy: string[];
  // Activity-log event types that, when present, mean this stage is running.
  startedBy?: string[];
}

export const PIPELINE_STAGES: PipelineStageDefinition[] = [
  {
    key: "classify",
    label: "Detecting property type",
    description: "Classifying residential vs commercial, parcel + jurisdiction lookup.",
    startedBy: ["analysis_started"],
    completedBy: ["property_classified"],
  },
  {
    key: "aggregate",
    label: "Pulling assessor + market data",
    description: "Lightbox, RentCast, ReGRID, and ATTOM in parallel.",
    startedBy: ["api_aggregation_started"],
    completedBy: ["api_aggregation_complete"],
  },
  {
    key: "valuation",
    label: "Running AI valuation model",
    description: "USPAP-aligned comparable sales + income analysis.",
    startedBy: ["llm_analysis_started"],
    completedBy: ["llm_analysis_complete"],
  },
  {
    key: "strategy",
    label: "Generating appeal strategy",
    description: "County playbook + filing method recommendation.",
    completedBy: ["appeal_strategy_generated"],
  },
  {
    key: "finalize",
    label: "Finalizing report",
    description: "Persisting analysis and notifying owner.",
    completedBy: ["analysis_complete"],
  },
];

export type PipelineStageStatus = "pending" | "running" | "completed" | "error";

export interface PipelineStageState {
  key: PipelineStageKey;
  label: string;
  description: string;
  status: PipelineStageStatus;
  durationMs?: number;
  completedAt?: Date;
  errorMessage?: string;
}

export interface ActivityLogLike {
  type: string;
  status?: string | null;
  durationMs?: number | null;
  description?: string | null;
  createdAt?: Date | string;
}

/**
 * Compute the current state of each pipeline stage from the activity logs.
 *
 * Rules:
 * - A stage is `completed` if any log of its `completedBy` types is present.
 * - If not completed, it's `running` if any `startedBy` log is present OR the
 *   previous stage is completed and the overall submission is still analyzing.
 * - If the pipeline emitted an `analysis_error`, the first still-running stage
 *   is marked `error` and subsequent stages stay `pending`.
 */
export function computePipelineState(
  logs: ActivityLogLike[],
  opts?: { submissionStatus?: string }
): PipelineStageState[] {
  const sorted = [...logs].sort((a, b) => {
    const ta = new Date(a.createdAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? 0).getTime();
    return ta - tb;
  });

  const byType = new Map<string, ActivityLogLike>();
  for (const log of sorted) byType.set(log.type, log);

  const errorLog = byType.get("analysis_error");
  const isAnalyzing =
    opts?.submissionStatus === "pending" || opts?.submissionStatus === "analyzing";

  const result: PipelineStageState[] = [];
  let previousCompleted = true;
  let errorAssigned = false;

  for (const def of PIPELINE_STAGES) {
    const completedLog = def.completedBy
      .map((t) => byType.get(t))
      .find((l): l is ActivityLogLike => Boolean(l));

    if (completedLog) {
      result.push({
        key: def.key,
        label: def.label,
        description: def.description,
        status: "completed",
        durationMs: completedLog.durationMs ?? undefined,
        completedAt: completedLog.createdAt ? new Date(completedLog.createdAt) : undefined,
      });
      previousCompleted = true;
      continue;
    }

    const startedLog = (def.startedBy ?? [])
      .map((t) => byType.get(t))
      .find((l): l is ActivityLogLike => Boolean(l));

    let status: PipelineStageStatus;
    if (errorLog && !errorAssigned && (startedLog || previousCompleted)) {
      status = "error";
      errorAssigned = true;
    } else if (startedLog) {
      status = "running";
    } else if (previousCompleted && isAnalyzing && !errorAssigned) {
      status = "running";
    } else {
      status = "pending";
    }

    result.push({
      key: def.key,
      label: def.label,
      description: def.description,
      status,
      errorMessage: status === "error" ? errorLog?.description ?? undefined : undefined,
    });

    previousCompleted = false;
  }

  return result;
}
