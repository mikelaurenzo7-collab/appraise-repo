import { describe, it, expect } from "vitest";
import {
  calculateCostApproach,
  computeReplacementCostPerSF,
  computePhysicalDepreciation,
  estimateLandValue,
} from "./services/costApproachCalculator";

describe("costApproachCalculator", () => {
  it("returns replacement cost per SF by property type", () => {
    expect(computeReplacementCostPerSF("residential")).toBe(165);
    expect(computeReplacementCostPerSF("commercial")).toBe(175);
    expect(computeReplacementCostPerSF("industrial")).toBe(90);
    expect(computeReplacementCostPerSF("agricultural")).toBe(75);
    expect(computeReplacementCostPerSF("unknown_type")).toBe(150);
  });

  it("computes physical depreciation correctly", () => {
    // 30yr / 75yr = 40% of $200k = $80k
    const dep = computePhysicalDepreciation(200000, 30, "residential");
    expect(dep).toBeCloseTo(80000, -2);
  });

  it("caps physical depreciation at 80% of replacement cost", () => {
    // 90yr old residential: effectiveAge = min(90, 67.5) = 67.5, rate = min(0.8, 67.5/75) = 0.8
    const dep = computePhysicalDepreciation(200000, 90, "residential");
    expect(dep).toBe(160000);
  });

  it("estimates land value as percentage of assessed value", () => {
    const land = estimateLandValue({ assessedValue: 400000, propertyType: "residential" });
    expect(land).toBe(80000); // 20% of 400000
  });

  it("estimates higher land ratio for commercial", () => {
    const land = estimateLandValue({ assessedValue: 400000, propertyType: "commercial" });
    expect(land).toBe(100000); // 25% of 400000
  });

  it("calculates full cost approach value", () => {
    const result = calculateCostApproach({
      squareFeet: 2000,
      yearBuilt: 2000,
      assessedValue: 500000,
      propertyType: "residential",
    });
    expect(result.replacementCostNew).toBeCloseTo(2000 * 165, 0);
    expect(result.landValue).toBeDefined();
    expect(result.totalDepreciation).toBeDefined();
    expect(result.costApproachValue).toBeDefined();
    expect(result.costApproachValue).toBeGreaterThan(0);
    expect(result.effectiveAge).toBeDefined();
    expect(result.remainingEconomicLife).toBeDefined();
  });

  it("returns null costApproachValue when squareFeet missing", () => {
    const result = calculateCostApproach({
      squareFeet: undefined,
      yearBuilt: 2000,
      assessedValue: 400000,
      propertyType: "residential",
    });
    expect(result.costApproachValue).toBeNull();
    expect(result.landValue).toBe(80000); // still computes land value
  });
});
