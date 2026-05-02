import { describe, it, expect } from "vitest";
import { applyCompFilterStrategy, getScenarioContext } from "./services/scenarioValuation";

type Tx = "arms_length" | "foreclosure" | "reo" | "short_sale" | "family_transfer" | "auction" | "unknown";

function comp(over: Partial<{ saleDate: string; similarity: number; salePrice: number; squareFeet: number; transactionType: Tx }>) {
  return {
    saleDate: "2025-09-15",
    similarity: 0.85,
    salePrice: 400_000,
    squareFeet: 1800,
    transactionType: "arms_length" as Tx,
    ...over,
  };
}

describe("applyCompFilterStrategy — arms-length enforcement", () => {
  // The "primary_residence" scenario excludes foreclosures + short sales.
  const primary = getScenarioContext("primary_residence").compFilterStrategy;
  // The "distressed_condition" scenario allows distressed comps.
  const distressed = getScenarioContext("distressed_condition").compFilterStrategy;

  it("drops foreclosure / REO / auction transactions on the primary-residence strategy", () => {
    const comps = [
      comp({ transactionType: "arms_length" }),
      comp({ transactionType: "foreclosure" }),
      comp({ transactionType: "reo" }),
      comp({ transactionType: "auction" }),
      comp({ transactionType: "unknown" }),
    ];
    const filtered = applyCompFilterStrategy(comps, primary);
    expect(filtered.find((c) => c.transactionType === "foreclosure")).toBeUndefined();
    expect(filtered.find((c) => c.transactionType === "reo")).toBeUndefined();
    expect(filtered.find((c) => c.transactionType === "auction")).toBeUndefined();
    // Arms-length and unknown stay
    expect(filtered.find((c) => c.transactionType === "arms_length")).toBeTruthy();
    expect(filtered.find((c) => c.transactionType === "unknown")).toBeTruthy();
  });

  it("drops short sales when strategy.excludeShortSales is true", () => {
    const comps = [
      comp({ transactionType: "arms_length" }),
      comp({ transactionType: "short_sale" }),
    ];
    const filtered = applyCompFilterStrategy(comps, primary);
    expect(filtered.find((c) => c.transactionType === "short_sale")).toBeUndefined();
  });

  it("drops family transfers under any strategy (always non-arm's-length)", () => {
    const comps = [
      comp({ transactionType: "arms_length" }),
      comp({ transactionType: "family_transfer" }),
    ];
    expect(
      applyCompFilterStrategy(comps, primary).find((c) => c.transactionType === "family_transfer"),
    ).toBeUndefined();
    expect(
      applyCompFilterStrategy(comps, distressed).find((c) => c.transactionType === "family_transfer"),
    ).toBeUndefined();
  });

  it("keeps foreclosures when distressed comps are explicitly allowed", () => {
    const comps = [
      comp({ transactionType: "foreclosure" }),
      comp({ transactionType: "arms_length" }),
    ];
    const filtered = applyCompFilterStrategy(comps, distressed);
    // The distressed strategy has excludeForeclosures=false AND
    // allowDistressedComps=true so foreclosures stay.
    expect(filtered.find((c) => c.transactionType === "foreclosure")).toBeTruthy();
    expect(filtered.find((c) => c.transactionType === "arms_length")).toBeTruthy();
  });

  it("treats undated comps as keepable rather than silently dropping them", () => {
    const comps = [comp({ saleDate: "" }), comp({ transactionType: "arms_length" })];
    const filtered = applyCompFilterStrategy(comps, primary);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it("comps with missing transactionType (legacy data) are treated as 'unknown' and kept", () => {
    const comps = [
      { saleDate: "2025-09-15", similarity: 0.85, salePrice: 400_000, squareFeet: 1800 },
      comp({ transactionType: "foreclosure" }),
    ];
    const filtered = applyCompFilterStrategy(comps, primary);
    // The legacy-shape comp (no transactionType) should not be dropped
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    // But the foreclosure should be dropped under primary strategy
    expect(filtered.find((c) => "transactionType" in c && c.transactionType === "foreclosure")).toBeUndefined();
  });
});
