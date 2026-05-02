import { describe, it, expect } from "vitest";
import { analyzeUniformity } from "./services/uniformityAnalyzer";
import type { ComparableSale } from "./services/propertyDataAggregator";

const comp = (
  address: string,
  salePrice: number,
  squareFeet: number,
): ComparableSale => ({
  address,
  salePrice,
  saleDate: "2025-09-01",
  squareFeet,
  similarity: 0.9,
  source: "rentcast",
});

describe("uniformityAnalyzer", () => {
  it("returns no claim when no comp assessed values are available", () => {
    const result = analyzeUniformity(
      450_000, // subject assessed
      400_000, // subject market
      [comp("100 Main", 380_000, 1800), comp("200 Oak", 390_000, 1750)],
    );
    expect(result.hasUniformityClaim).toBe(false);
    expect(result.medianComparableRatio).toBeNull();
    expect(result.uniformityArgument).toBe("");
  });

  it("flags lack of uniformity when subject ratio is materially above peers", () => {
    const comps = [
      comp("100 Main", 400_000, 1800),
      comp("200 Oak", 410_000, 1850),
      comp("300 Pine", 395_000, 1820),
      comp("400 Elm", 405_000, 1830),
    ];
    // Peer ratio ~70%; subject ratio 100% (450k/450k)
    const result = analyzeUniformity(
      450_000,
      450_000,
      comps,
      (c) => Math.round(c.salePrice * 0.7),
    );
    expect(result.hasUniformityClaim).toBe(true);
    expect(result.comparableCount).toBe(4);
    expect(result.medianComparableRatio).toBeCloseTo(0.7, 2);
    expect(result.subjectAssessmentRatio).toBeCloseTo(1.0, 2);
    expect(result.ratioMultiplier).toBeGreaterThan(1.4);
    expect(result.equalizedAssessedValue).toBeLessThan(450_000);
    expect(result.equalizationGap).toBeGreaterThan(0);
    expect(result.uniformityArgument).toContain("higher");
    expect(result.uniformityStrength).toBeGreaterThanOrEqual(75);
  });

  it("does not flag when subject ratio is below peers", () => {
    const comps = [
      comp("100 Main", 300_000, 1500),
      comp("200 Oak", 310_000, 1550),
      comp("300 Pine", 305_000, 1520),
    ];
    // Peer ratio ~90%; subject ratio 50% (200k/400k)
    const result = analyzeUniformity(
      200_000,
      400_000,
      comps,
      (c) => Math.round(c.salePrice * 0.9),
    );
    expect(result.hasUniformityClaim).toBe(false);
    expect(result.uniformityArgument).toBe("");
  });

  it("ignores comps with implausible ratios (data errors)", () => {
    const comps = [
      comp("100 Main", 400_000, 1800),
      comp("200 Oak", 410_000, 1850),
      comp("300 Pine", 395_000, 1820),
    ];
    // First comp has assessed = 5,000 (ratio < 5%), should be excluded
    const result = analyzeUniformity(
      450_000,
      450_000,
      comps,
      (c) => (c.address === "100 Main" ? 5_000 : Math.round(c.salePrice * 0.7)),
    );
    // Only 2 usable ratios → not enough for a claim (min 3)
    expect(result.comparableCount).toBe(2);
    expect(result.hasUniformityClaim).toBe(false);
  });

  it("computes equalized value at peer median", () => {
    const comps = [
      comp("A", 400_000, 1800),
      comp("B", 400_000, 1800),
      comp("C", 400_000, 1800),
    ];
    const result = analyzeUniformity(
      500_000, // subject assessed
      500_000, // subject market
      comps,
      () => 300_000, // each comp assessed at 75% of $400k sale
    );
    expect(result.medianComparableRatio).toBeCloseTo(0.75, 3);
    expect(result.equalizedAssessedValue).toBe(375_000);
    expect(result.equalizationGap).toBe(125_000);
  });
});
