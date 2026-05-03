/**
 * Comparable Sales Analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure-computation module — no external API calls or database access.
 * Provides time-adjusted comparable sale analysis and adjustment grid building
 * for the sales comparison approach to valuation.
 */

import type { ComparableSale } from "./propertyDataAggregator";
import type { AdjustmentGridEntry } from "./pdfGenerator";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SubjectCharacteristics {
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  lotSize?: number | null;
}

export interface AdjustmentGridOptions {
  excludeNonArmsLength?: boolean;
  maxComps?: number; // default 8
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_ADJUSTMENT_RATE = 0.003; // 0.3% per month
const SIZE_ADJUSTMENT_FACTOR = 0.85;
const BEDROOM_ADJUSTMENT = 5000;
const BATHROOM_ADJUSTMENT = 3000;
const AGE_ADJUSTMENT = 500;
const LOT_ADJUSTMENT_RATE = 2.5;
const LOT_ADJUSTMENT_CAP = 15000;
const NET_ADJUSTMENT_CAP_PCT = 30; // ±30% of sale price
const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

// ─── Exported Functions ───────────────────────────────────────────────────────

/**
 * Compute the time adjustment for a comparable sale.
 * Returns positive dollar amount representing appreciation since sale date.
 * Rate: 0.3% per month.
 */
export function applyTimeAdjustment(salePrice: number, saleDate: string): number {
  const saleTime = new Date(saleDate).getTime();
  if (isNaN(saleTime)) return 0;
  const monthsSinceSale = (Date.now() - saleTime) / MS_PER_MONTH;
  return Math.round(salePrice * monthsSinceSale * TIME_ADJUSTMENT_RATE);
}

/**
 * Compute the median price per square foot from a set of comparable sales.
 */
export function computeMedianPricePerSF(comps: ComparableSale[]): number {
  if (comps.length === 0) return 0;

  const pricesPerSF = comps
    .filter((c) => c.squareFeet > 0)
    .map((c) => c.salePrice / c.squareFeet)
    .sort((a, b) => a - b);

  if (pricesPerSF.length === 0) return 0;

  const mid = Math.floor(pricesPerSF.length / 2);
  if (pricesPerSF.length % 2 === 1) {
    return pricesPerSF[mid];
  }
  return (pricesPerSF[mid - 1] + pricesPerSF[mid]) / 2;
}

/**
 * Build an adjustment grid for the sales comparison approach.
 * Each entry represents one comparable sale with individual line-item adjustments
 * applied to arrive at an adjusted value.
 *
 * Adjustments applied (when subject and comp both have data):
 *   time      — 0.3% per month since sale
 *   size      — (subjectSF - compSF) × medianPSF × 0.85
 *   bedrooms  — (subjectBeds - compBeds) × 5000
 *   bathrooms — (subjectBaths - compBaths) × 3000
 *   age       — (compYearBuilt - subjectYearBuilt) × 500
 *   lot       — (subjectLotSF - compLotSF) × 2.5, capped at ±15000
 *
 * Net adjustment is capped at ±30% of sale price.
 * Result is sorted ascending by adjustedValue.
 */
export function buildAdjustmentGrid(
  subject: SubjectCharacteristics,
  comps: ComparableSale[],
  opts?: AdjustmentGridOptions
): AdjustmentGridEntry[] {
  const excludeNonArmsLength = opts?.excludeNonArmsLength ?? false;
  const maxComps = opts?.maxComps ?? 8;

  // Filter comps
  let filtered = comps;
  if (excludeNonArmsLength) {
    filtered = filtered.filter((c) => c.transactionType === "arms_length");
  }

  // Limit to maxComps
  filtered = filtered.slice(0, maxComps);

  // Compute median PSF from all filtered comps (before per-comp processing)
  const medianPSF = computeMedianPricePerSF(filtered);

  const entries: AdjustmentGridEntry[] = filtered.filter((comp) => comp.salePrice > 0).map((comp) => {
    const adjustments: Record<string, number> = {};

    // Time adjustment
    const timeAdj = applyTimeAdjustment(comp.salePrice, comp.saleDate);
    adjustments.time = timeAdj;

    // Size adjustment
    if (
      subject.squareFeet != null &&
      comp.squareFeet > 0 &&
      medianPSF > 0
    ) {
      adjustments.size = Math.round(
        (subject.squareFeet - comp.squareFeet) * medianPSF * SIZE_ADJUSTMENT_FACTOR
      );
    }

    // Bedroom adjustment
    if (subject.bedrooms != null && comp.bedrooms != null) {
      adjustments.bedrooms = Math.round((subject.bedrooms - comp.bedrooms) * BEDROOM_ADJUSTMENT);
    }

    // Bathroom adjustment
    if (subject.bathrooms != null && comp.bathrooms != null) {
      adjustments.bathrooms = Math.round(
        (subject.bathrooms - comp.bathrooms) * BATHROOM_ADJUSTMENT
      );
    }

    // Age adjustment
    if (subject.yearBuilt != null && comp.yearBuilt != null) {
      adjustments.age = Math.round((comp.yearBuilt - subject.yearBuilt) * AGE_ADJUSTMENT);
    }

    // Lot size adjustment
    if (subject.lotSize != null && comp.lotSize != null) {
      const rawLotAdj = Math.round(
        (subject.lotSize - comp.lotSize) * LOT_ADJUSTMENT_RATE
      );
      adjustments.lot = Math.max(
        -LOT_ADJUSTMENT_CAP,
        Math.min(LOT_ADJUSTMENT_CAP, rawLotAdj)
      );
    }

    // Sum all adjustments
    const totalAdjustment = Object.values(adjustments).reduce((sum, v) => sum + v, 0);

    // Cap net adjustment at ±30% of sale price
    const maxAdjustment = comp.salePrice * (NET_ADJUSTMENT_CAP_PCT / 100);
    const cappedAdjustment = Math.max(
      -maxAdjustment,
      Math.min(maxAdjustment, totalAdjustment)
    );

    const adjustedValue = Math.round(comp.salePrice + cappedAdjustment);
    const netAdjustmentPct = (cappedAdjustment / comp.salePrice) * 100;

    const entry: AdjustmentGridEntry = {
      compAddress: comp.address,
      salePrice: comp.salePrice,
      adjustments,
      netAdjustmentPct: Math.round(netAdjustmentPct * 100) / 100,
      adjustedValue,
    };

    // Optional computed fields
    if (comp.squareFeet > 0) {
      entry.pricePerSF = Math.round((comp.salePrice / comp.squareFeet) * 100) / 100;
    }

    return entry;
  });

  // Sort ascending by adjustedValue
  entries.sort((a, b) => a.adjustedValue - b.adjustedValue);

  return entries;
}
