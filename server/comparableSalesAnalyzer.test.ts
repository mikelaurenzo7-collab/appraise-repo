import { describe, it, expect } from "vitest";
import {
  buildAdjustmentGrid,
  computeMedianPricePerSF,
  applyTimeAdjustment,
} from "./services/comparableSalesAnalyzer";
import type { ComparableSale } from "./services/propertyDataAggregator";

const makeComp = (overrides: Partial<ComparableSale> = {}): ComparableSale => ({
  address: "123 Comp St",
  salePrice: 300000,
  saleDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  squareFeet: 1500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2000,
  lotSize: 6000,
  similarity: 0.9,
  source: "redfin",
  transactionType: "arms_length",
  ...overrides,
});

describe("comparableSalesAnalyzer", () => {
  it("applies positive time adjustment for older sale", () => {
    const comp = makeComp({ saleDate: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString() });
    const adjustment = applyTimeAdjustment(comp.salePrice, comp.saleDate);
    expect(adjustment).toBeGreaterThan(0);
    expect(adjustment).toBeCloseTo(300000 * 12 * 0.003, 0);
  });

  it("computes median price per SF from comps", () => {
    const comps = [
      makeComp({ salePrice: 300000, squareFeet: 1500 }),
      makeComp({ salePrice: 400000, squareFeet: 2000 }),
      makeComp({ salePrice: 250000, squareFeet: 1250 }),
    ];
    expect(computeMedianPricePerSF(comps)).toBeCloseTo(200, 0);
  });

  it("builds adjustment grid with all entries", () => {
    const subject = { squareFeet: 1400, bedrooms: 3, bathrooms: 2, yearBuilt: 1995, lotSize: 5000 };
    const comps = [makeComp(), makeComp({ address: "456 Other St", salePrice: 320000 })];
    const grid = buildAdjustmentGrid(subject, comps);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveProperty("compAddress");
    expect(grid[0]).toHaveProperty("adjustments");
    expect(grid[0]).toHaveProperty("adjustedValue");
    expect(grid[0]).toHaveProperty("netAdjustmentPct");
  });

  it("caps net adjustment at ±30% of sale price", () => {
    const subject = { squareFeet: 500, bedrooms: 1, bathrooms: 1, yearBuilt: 1920, lotSize: 1000 };
    const comp = makeComp({ salePrice: 300000, squareFeet: 3000, bedrooms: 6, bathrooms: 4, yearBuilt: 2020, lotSize: 20000 });
    const [entry] = buildAdjustmentGrid(subject, [comp]);
    expect(Math.abs(entry.netAdjustmentPct)).toBeLessThanOrEqual(30);
  });

  it("excludes non-arms-length comps when flag set", () => {
    const subject = { squareFeet: 1500, bedrooms: 3, bathrooms: 2, yearBuilt: 2000, lotSize: 6000 };
    const comps = [
      makeComp({ transactionType: "foreclosure" }),
      makeComp({ address: "999 Normal St", transactionType: "arms_length" }),
    ];
    const grid = buildAdjustmentGrid(subject, comps, { excludeNonArmsLength: true });
    expect(grid).toHaveLength(1);
    expect(grid[0].compAddress).toBe("999 Normal St");
  });

  it("sorts grid by adjusted value ascending", () => {
    const subject = { squareFeet: 1500, bedrooms: 3, bathrooms: 2, yearBuilt: 2000, lotSize: 6000 };
    const comps = [
      makeComp({ address: "High St", salePrice: 400000 }),
      makeComp({ address: "Low St", salePrice: 250000 }),
      makeComp({ address: "Mid St", salePrice: 320000 }),
    ];
    const grid = buildAdjustmentGrid(subject, comps);
    expect(grid[0].adjustedValue).toBeLessThanOrEqual(grid[1].adjustedValue);
    expect(grid[1].adjustedValue).toBeLessThanOrEqual(grid[2].adjustedValue);
  });
});
