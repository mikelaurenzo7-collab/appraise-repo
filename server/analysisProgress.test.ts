import { describe, it, expect } from "vitest";
import { computePipelineState, PIPELINE_STAGES } from "../shared/analysisProgress";

const T0 = new Date("2026-04-21T12:00:00Z");

function log(type: string, offsetSec = 0, extras: Record<string, unknown> = {}) {
  return {
    type,
    createdAt: new Date(T0.getTime() + offsetSec * 1000),
    ...extras,
  };
}

describe("computePipelineState", () => {
  it("starts with the first stage running when no events and submission is analyzing", () => {
    const state = computePipelineState([], { submissionStatus: "analyzing" });
    expect(state).toHaveLength(PIPELINE_STAGES.length);
    expect(state[0].status).toBe("running");
    expect(state.slice(1).every((s) => s.status === "pending")).toBe(true);
  });

  it("leaves all stages pending when submission is not analyzing", () => {
    const state = computePipelineState([], { submissionStatus: "pending" });
    // pending still counts as "analyzing-like" → first stage runs
    expect(state[0].status).toBe("running");

    const stateAnalyzed = computePipelineState([], { submissionStatus: "analyzed" });
    expect(stateAnalyzed.every((s) => s.status === "pending")).toBe(true);
  });

  it("marks a stage completed when its completedBy event is present", () => {
    const state = computePipelineState(
      [log("analysis_started"), log("property_classified", 2, { durationMs: 1500 })],
      { submissionStatus: "analyzing" }
    );
    expect(state[0].status).toBe("completed");
    expect(state[0].durationMs).toBe(1500);
    // The next stage is running (predecessor done, still analyzing)
    expect(state[1].status).toBe("running");
  });

  it("reflects the full happy path end-to-end", () => {
    const state = computePipelineState(
      [
        log("analysis_started", 0),
        log("property_classified", 1),
        log("api_aggregation_started", 2),
        log("api_aggregation_complete", 5),
        log("llm_analysis_started", 6),
        log("llm_analysis_complete", 20),
        log("appeal_strategy_generated", 21),
        log("analysis_complete", 22),
      ],
      { submissionStatus: "analyzed" }
    );
    expect(state.map((s) => s.status)).toEqual([
      "completed", "completed", "completed", "completed", "completed",
    ]);
  });

  it("marks the first unfinished stage as error when analysis_error is logged", () => {
    const state = computePipelineState(
      [
        log("analysis_started"),
        log("property_classified", 1),
        log("api_aggregation_started", 2),
        log("analysis_error", 3, { description: "ATTOM timeout" }),
      ],
      { submissionStatus: "analyzing" }
    );
    expect(state[0].status).toBe("completed");
    expect(state[1].status).toBe("error");
    expect(state[1].errorMessage).toBe("ATTOM timeout");
    // Downstream stays pending, not running
    expect(state[2].status).toBe("pending");
    expect(state[3].status).toBe("pending");
  });

  it("prefers startedBy to mark a stage running even without predecessor completion", () => {
    // Edge: api_aggregation_started fires but property_classified hasn't — still show aggregate as running.
    const state = computePipelineState(
      [log("api_aggregation_started")],
      { submissionStatus: "analyzing" }
    );
    const aggregate = state.find((s) => s.key === "aggregate")!;
    expect(aggregate.status).toBe("running");
  });

  it("is insensitive to log ordering", () => {
    const ordered = computePipelineState(
      [
        log("analysis_started", 0),
        log("property_classified", 1),
        log("api_aggregation_complete", 5),
      ],
      { submissionStatus: "analyzing" }
    );
    const scrambled = computePipelineState(
      [
        log("api_aggregation_complete", 5),
        log("property_classified", 1),
        log("analysis_started", 0),
      ],
      { submissionStatus: "analyzing" }
    );
    expect(scrambled.map((s) => s.status)).toEqual(ordered.map((s) => s.status));
  });
});
