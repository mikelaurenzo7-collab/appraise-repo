import { describe, it, expect, vi } from "vitest";

vi.mock("./_core/claude", () => ({
  analyzeWithClaude: vi.fn().mockResolvedValue(
    "The Sales Comparison Approach is given primary weight. Final value: $295,000."
  ),
  isClaudeAvailable: vi.fn().mockReturnValue(true),
}));

import { generateReconciliationNarrative } from "./services/reconciliationNarrative";

describe("reconciliationNarrative", () => {
  it("generates a narrative string when Claude available", async () => {
    const result = await generateReconciliationNarrative({
      salesCompValue: 295000,
      costApproachValue: 312000,
      incomeApproachValue: null,
      assessedValue: 380000,
      propertyType: "residential",
      scenario: "primary_residence",
      appealStrengthFactors: ["Value gap: 19%", "3 supporting comparables"],
      approachWeights: { market: 0.85, cost: 0.15, income: 0 },
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(20);
  });

  it("returns fallback narrative when Claude unavailable", async () => {
    const { isClaudeAvailable } = await import("./_core/claude");
    (isClaudeAvailable as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const result = await generateReconciliationNarrative({
      salesCompValue: 295000,
      costApproachValue: null,
      incomeApproachValue: null,
      assessedValue: 380000,
      propertyType: "residential",
      scenario: "primary_residence",
      appealStrengthFactors: [],
      approachWeights: { market: 1.0, cost: 0, income: 0 },
    });
    expect(typeof result).toBe("string");
    expect(result).toContain("295,000");
  });

  it("fallback includes cost approach when provided", async () => {
    const { isClaudeAvailable } = await import("./_core/claude");
    (isClaudeAvailable as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const result = await generateReconciliationNarrative({
      salesCompValue: 300000,
      costApproachValue: 315000,
      incomeApproachValue: null,
      assessedValue: 400000,
      propertyType: "residential",
      scenario: "primary_residence",
      appealStrengthFactors: [],
      approachWeights: { market: 0.85, cost: 0.15, income: 0 },
    });
    expect(result).toContain("315,000");
  });
});
