import { describe, it, expect } from "vitest";
import { analyzeMarketTrends } from "./services/marketTrendAnalyzer";
import type { ComparableSale } from "./services/propertyDataAggregator";

const makeComp = (overrides: Partial<ComparableSale> = {}): ComparableSale => ({
  address: "123 Market St",
  salePrice: 300000,
  saleDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  squareFeet: 1500,
  daysOnMarket: 30,
  similarity: 0.9,
  source: "redfin",
  ...overrides,
});

describe("marketTrendAnalyzer", () => {
  it("returns all null for empty comps array", () => {
    const result = analyzeMarketTrends([]);
    expect(result.medianSalePrice).toBeNull();
    expect(result.medianPricePerSF).toBeNull();
    expect(result.inventoryCount).toBeNull();
  });

  it("computes median sale price", () => {
    const comps = [
      makeComp({ salePrice: 250000 }),
      makeComp({ salePrice: 300000 }),
      makeComp({ salePrice: 400000 }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.medianSalePrice).toBe(300000);
  });

  it("computes median price per SF", () => {
    const comps = [
      makeComp({ salePrice: 300000, squareFeet: 1500 }),
      makeComp({ salePrice: 400000, squareFeet: 2000 }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.medianPricePerSF).toBeCloseTo(200, 0);
  });

  it("computes average days on market", () => {
    const comps = [
      makeComp({ daysOnMarket: 20 }),
      makeComp({ daysOnMarket: 40 }),
      makeComp({ daysOnMarket: 60 }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.averageDaysOnMarket).toBe(40);
  });

  it("sets inventoryCount to number of comps", () => {
    const comps = [makeComp(), makeComp(), makeComp(), makeComp()];
    const result = analyzeMarketTrends(comps);
    expect(result.inventoryCount).toBe(4);
  });

  it("computes positive YoY price change when recent comps are higher", () => {
    const now = Date.now();
    const mo = (n: number) => new Date(now - n * 30 * 24 * 60 * 60 * 1000).toISOString();
    const comps = [
      makeComp({ salePrice: 300000, saleDate: mo(3) }),
      makeComp({ salePrice: 320000, saleDate: mo(6) }),
      makeComp({ salePrice: 280000, saleDate: mo(15) }),
      makeComp({ salePrice: 270000, saleDate: mo(20) }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.priceChangeYoY).not.toBeNull();
    expect(result.priceChangeYoY!).toBeGreaterThan(0);
  });

  it("returns null priceChangeYoY when only one period has data", () => {
    const now = Date.now();
    const mo = (n: number) => new Date(now - n * 30 * 24 * 60 * 60 * 1000).toISOString();
    const comps = [makeComp({ saleDate: mo(2) }), makeComp({ saleDate: mo(4) })];
    const result = analyzeMarketTrends(comps);
    expect(result.priceChangeYoY).toBeNull();
  });
});
