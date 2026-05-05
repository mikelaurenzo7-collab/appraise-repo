import { describe, it, expect } from "vitest";
import { computeCompPriceBand } from "./services/appraisalAnalyzer";
import type { PropertyData } from "./services/propertyDataAggregator";

// Locks in the price-per-sqft IQR math that drives the LLM's lower-end
// advocacy anchor. If this regresses, every appraisal narrative loses
// its supportable-range guidance.

function comp(salePrice: number, squareFeet = 2_000) {
  return {
    address: "x",
    salePrice,
    saleDate: "2025-06-01",
    squareFeet,
    similarity: 0.8,
    source: "rentcast" as const,
  };
}

function pdata(comparableSales: ReturnType<typeof comp>[]): PropertyData {
  return {
    address: "1 Test St",
    city: "Austin",
    state: "TX",
    comparableSales,
    source: "test",
  };
}

describe("computeCompPriceBand", () => {
  it("returns null when fewer than 3 valid comps", () => {
    expect(computeCompPriceBand(pdata([]))).toBeNull();
    expect(computeCompPriceBand(pdata([comp(400_000)]))).toBeNull();
    expect(
      computeCompPriceBand(pdata([comp(400_000), comp(420_000)]))
    ).toBeNull();
  });

  it("ignores comps with zero price or zero square footage", () => {
    const band = computeCompPriceBand(
      pdata([
        comp(400_000),
        comp(0), // bad comp
        comp(420_000, 0), // also bad
        comp(440_000),
        comp(460_000),
      ])
    );
    // Three valid comps remain → band is non-null
    expect(band).not.toBeNull();
    expect(band!.count).toBe(3);
  });

  it("computes a sensible IQR with a tight comp set", () => {
    // Five comps at $200, $210, $220, $230, $240 per sqft (2000 sqft each)
    const comps = [400_000, 420_000, 440_000, 460_000, 480_000].map(p =>
      comp(p)
    );
    const band = computeCompPriceBand({ ...pdata(comps), squareFeet: 2_000 });
    expect(band).not.toBeNull();
    expect(band!.medianPpsf).toBeCloseTo(220, 0);
    expect(band!.q1Ppsf).toBeLessThan(band!.medianPpsf);
    expect(band!.q3Ppsf).toBeGreaterThan(band!.medianPpsf);
    expect(band!.minPpsf).toBeCloseTo(200, 0);
    expect(band!.maxPpsf).toBeCloseTo(240, 0);
  });

  it("Q1 < median < Q3 invariant holds across random distributions", () => {
    for (let trial = 0; trial < 10; trial++) {
      const ppsfs = Array.from({ length: 9 }, () => 150 + Math.random() * 200);
      const comps = ppsfs.map(p => comp(Math.round(p * 2_000)));
      const band = computeCompPriceBand(pdata(comps));
      expect(band).not.toBeNull();
      expect(band!.q1Ppsf).toBeLessThanOrEqual(band!.medianPpsf);
      expect(band!.medianPpsf).toBeLessThanOrEqual(band!.q3Ppsf);
      expect(band!.minPpsf).toBeLessThanOrEqual(band!.q1Ppsf);
      expect(band!.maxPpsf).toBeGreaterThanOrEqual(band!.q3Ppsf);
    }
  });

  it("Q1 anchor is below the assessment in a realistic overassessment scenario", () => {
    // Ten comps clustered around $250/sqft on a 2000-sqft subject
    const comps = [240, 245, 248, 250, 252, 253, 255, 258, 260, 265].map(ppsf =>
      comp(ppsf * 2_000)
    );
    const band = computeCompPriceBand(pdata(comps));
    expect(band).not.toBeNull();
    // The Q1 anchor should be strictly below the median — that's the whole
    // point of the lower-end-of-defensible advocacy posture.
    expect(band!.q1Ppsf).toBeLessThan(band!.medianPpsf);
  });
});

// Weighted anchors are the valuation-quality upgrade: similar/recent comps
// should carry more persuasive weight than stale or low-similarity outliers.
describe("computeCompPriceBand weighted anchors", () => {
  it("weights recent high-similarity comps over stale low-similarity outliers", () => {
    const recent = new Date().toISOString().slice(0, 10);
    const stale = new Date(Date.now() - 30 * 30.4375 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const comps = [
      { ...comp(300_000), saleDate: recent, similarity: 95 }, // $150/sqft
      { ...comp(310_000), saleDate: recent, similarity: 92 }, // $155/sqft
      { ...comp(320_000), saleDate: recent, similarity: 90 }, // $160/sqft
      { ...comp(600_000), saleDate: stale, similarity: 30 }, // stale $300/sqft outlier
      { ...comp(620_000), saleDate: stale, similarity: 30 }, // stale $310/sqft outlier
    ];

    const band = computeCompPriceBand({ ...pdata(comps), squareFeet: 2_000 });
    expect(band).not.toBeNull();
    expect(band!.weightedMedianPpsf).toBeLessThan(band!.medianPpsf);
    expect(band!.lowerAnchorValue).toBe(300_000);
    expect(band!.compQuality).toBe("moderate");
  });
});
