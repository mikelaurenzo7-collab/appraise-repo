import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LLM before importing the module under test
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { analyzePropertyPhotos } from "./services/photoAnalyzer";
import type { SubmissionPhoto } from "./db";

const mockedInvokeLLM = invokeLLM as unknown as ReturnType<typeof vi.fn>;

function llmResponse(payload: object) {
  return {
    id: "x", created: 0, model: "m",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(payload) }, finish_reason: "stop" }],
  };
}

const photo = (over: Partial<SubmissionPhoto> = {}): SubmissionPhoto => ({
  url: "https://example.com/p.jpg",
  category: "exterior",
  caption: undefined,
  uploadedAt: new Date(),
  ...over,
});

describe("photoAnalyzer", () => {
  beforeEach(() => {
    mockedInvokeLLM.mockReset();
  });

  it("returns empty summary when no photos provided", async () => {
    const out = await analyzePropertyPhotos([]);
    expect(out.findings).toHaveLength(0);
    expect(out.appealStrengthDelta).toBe(0);
    expect(out.summaryParagraph).toBe("");
  });

  it("aggregates findings and produces a positive delta for poor condition", async () => {
    mockedInvokeLLM.mockResolvedValue(
      llmResponse({
        conditionScore: 30,
        conditionLabel: "poor",
        observations: ["roof shingle granule loss visible", "missing gutter on north elevation"],
        valueImpactingIssues: ["deferred roof maintenance"],
        evidenceStrength: 80,
      }),
    );
    const out = await analyzePropertyPhotos([photo({ category: "roof" }), photo({ category: "exterior" })]);
    expect(out.findings).toHaveLength(2);
    expect(out.overallConditionScore).toBe(30);
    expect(out.appealStrengthDelta).toBeGreaterThan(0);
    expect(out.topValueIssues).toContain("deferred roof maintenance");
    expect(out.summaryParagraph).toContain("materially impaired");
  });

  it("produces a small negative delta for above-average condition", async () => {
    mockedInvokeLLM.mockResolvedValue(
      llmResponse({
        conditionScore: 90,
        conditionLabel: "excellent",
        observations: ["clean exterior"],
        valueImpactingIssues: [],
        evidenceStrength: 70,
      }),
    );
    const out = await analyzePropertyPhotos([photo()]);
    expect(out.overallConditionScore).toBe(90);
    expect(out.appealStrengthDelta).toBeLessThanOrEqual(0);
  });

  it("never throws when the LLM call fails", async () => {
    mockedInvokeLLM.mockRejectedValue(new Error("upstream down"));
    const out = await analyzePropertyPhotos([photo()]);
    expect(out.findings).toHaveLength(0);
    expect(out.appealStrengthDelta).toBe(0);
  });

  it("clamps invalid scores to the 0-100 range", async () => {
    mockedInvokeLLM.mockResolvedValue(
      llmResponse({
        conditionScore: 150,
        conditionLabel: "good",
        observations: ["x"],
        valueImpactingIssues: [],
        evidenceStrength: -20,
      }),
    );
    const out = await analyzePropertyPhotos([photo()]);
    expect(out.findings[0].conditionScore).toBeLessThanOrEqual(100);
    expect(out.findings[0].evidenceStrength).toBeGreaterThanOrEqual(0);
  });

  it("dedupes overlapping observations across photos", async () => {
    mockedInvokeLLM.mockResolvedValue(
      llmResponse({
        conditionScore: 50,
        conditionLabel: "fair",
        observations: ["roof shingle granule loss", "Roof shingle granule loss"],
        valueImpactingIssues: ["deferred maintenance", "deferred maintenance"],
        evidenceStrength: 60,
      }),
    );
    const out = await analyzePropertyPhotos([photo(), photo()]);
    expect(out.topObservations.length).toBeLessThanOrEqual(2);
    expect(out.topValueIssues.length).toBeLessThanOrEqual(1);
  });
});
