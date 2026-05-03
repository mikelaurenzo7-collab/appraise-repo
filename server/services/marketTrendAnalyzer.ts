/**
 * Market Trend Analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes market trend statistics from a set of comparable sales.
 *
 * Exported:
 *   analyzeMarketTrends(comps: ComparableSale[]): MarketTrendData
 */

import type { ComparableSale } from "./propertyDataAggregator";
import type { MarketTrendData } from "./pdfGenerator";

/**
 * Compute the median of a numeric array.
 * Returns null if the array is empty.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Analyze market trends from a list of comparable sales.
 *
 * - medianSalePrice: median of all salePrice values (rounded to integer)
 * - medianPricePerSF: median of salePrice/squareFeet for comps where squareFeet > 0 (rounded to integer)
 * - averageDaysOnMarket: mean of daysOnMarket where present and > 0 (rounded to integer)
 * - inventoryCount: total count of comps (null if empty)
 * - priceChangeYoY: percentage change from prior 12 months (months 13-24 ago) to recent 12 months.
 *                   Requires ≥2 comps in each period. Result rounded to 1 decimal. null if insufficient data.
 * - absorptionRate: inventoryCount / 3 (months), rounded to 1 decimal. null if fewer than 3 comps.
 */
export function analyzeMarketTrends(comps: ComparableSale[]): MarketTrendData {
  if (comps.length === 0) {
    return {
      medianSalePrice: null,
      medianPricePerSF: null,
      averageDaysOnMarket: null,
      inventoryCount: null,
      priceChangeYoY: null,
      absorptionRate: null,
    };
  }

  // medianSalePrice
  const salePrices = comps.map((c) => c.salePrice);
  const medianPrice = median(salePrices);
  const medianSalePrice = medianPrice !== null ? Math.round(medianPrice) : null;

  // medianPricePerSF
  const pricesPerSF = comps
    .filter((c) => c.squareFeet > 0)
    .map((c) => c.salePrice / c.squareFeet);
  const medianPSF = median(pricesPerSF);
  const medianPricePerSF = medianPSF !== null ? Math.round(medianPSF) : null;

  // averageDaysOnMarket
  const domValues = comps
    .map((c) => c.daysOnMarket)
    .filter((d): d is number => d !== undefined && d !== null && d > 0);
  const averageDaysOnMarket =
    domValues.length > 0
      ? Math.round(domValues.reduce((sum, d) => sum + d, 0) / domValues.length)
      : null;

  // inventoryCount
  const inventoryCount = comps.length;

  // priceChangeYoY
  const now = Date.now();
  const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;
  const recentComps = comps.filter((c) => {
    const age = (now - new Date(c.saleDate).getTime()) / MS_PER_MONTH;
    return age >= 0 && age <= 12;
  });
  const priorComps = comps.filter((c) => {
    const age = (now - new Date(c.saleDate).getTime()) / MS_PER_MONTH;
    return age > 12 && age <= 24;
  });

  let priceChangeYoY: number | null = null;
  if (recentComps.length >= 2 && priorComps.length >= 2) {
    const recentMedian = median(recentComps.map((c) => c.salePrice))!;
    const priorMedian = median(priorComps.map((c) => c.salePrice))!;
    if (priorMedian !== 0) {
      priceChangeYoY =
        Math.round(((recentMedian - priorMedian) / priorMedian) * 100 * 10) / 10;
    }
  }

  // absorptionRate: inventoryCount / 3 months, null if fewer than 3 comps
  const absorptionRate =
    inventoryCount >= 3
      ? Math.round((inventoryCount / 3) * 10) / 10
      : null;

  return {
    medianSalePrice,
    medianPricePerSF,
    averageDaysOnMarket,
    inventoryCount,
    priceChangeYoY,
    absorptionRate,
  };
}
