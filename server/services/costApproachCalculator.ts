/**
 * CostApproachCalculator
 *
 * Pure TypeScript service for computing the Cost Approach to property valuation.
 * Methodology: Replacement Cost New - Total Depreciation + Land Value = Cost Approach Value
 */

import type { CostApproachData } from "./pdfGenerator";

// ─── Lookup Tables ────────────────────────────────────────────────────────────

/** Replacement cost per square foot by property type */
const REPLACEMENT_COST_PER_SF: Record<string, number> = {
  residential: 165,
  "single-family": 165,
  multi_family: 140,
  "multi-family": 140,
  commercial: 175,
  industrial: 90,
  agricultural: 75,
  land: 0,
};
const DEFAULT_REPLACEMENT_COST_PER_SF = 150;

/** Economic life in years by property type */
const ECONOMIC_LIFE: Record<string, number> = {
  residential: 75,
  "single-family": 75,
  multi_family: 60,
  "multi-family": 60,
  commercial: 50,
  industrial: 40,
  agricultural: 35,
};
const DEFAULT_ECONOMIC_LIFE = 60;

/** Land value as fraction of assessed/estimated value */
const LAND_VALUE_RATIO: Record<string, number> = {
  commercial: 0.25,
  land: 1.0,
};
const DEFAULT_LAND_VALUE_RATIO = 0.20;

// ─── Exported Helper Functions ────────────────────────────────────────────────

/**
 * Returns the replacement cost per square foot for a given property type.
 * Falls back to the default ($150/SF) for unknown types.
 */
export function computeReplacementCostPerSF(propertyType?: string | null): number {
  if (!propertyType) return DEFAULT_REPLACEMENT_COST_PER_SF;
  const key = propertyType.toLowerCase();
  return key in REPLACEMENT_COST_PER_SF
    ? REPLACEMENT_COST_PER_SF[key]
    : DEFAULT_REPLACEMENT_COST_PER_SF;
}

/**
 * Returns the economic life in years for a given property type.
 */
function getEconomicLife(propertyType?: string | null): number {
  if (!propertyType) return DEFAULT_ECONOMIC_LIFE;
  const key = propertyType.toLowerCase();
  return key in ECONOMIC_LIFE ? ECONOMIC_LIFE[key] : DEFAULT_ECONOMIC_LIFE;
}

/**
 * Computes the physical depreciation (in dollars) for a property.
 *
 * - Effective age is capped at 90% of economic life.
 * - Depreciation rate is capped at 80%.
 */
export function computePhysicalDepreciation(
  replacementCostNew: number,
  chronologicalAge: number,
  propertyType?: string | null
): number {
  const econLife = getEconomicLife(propertyType);
  const effectiveAge = Math.min(chronologicalAge, econLife * 0.9);
  const depRate = Math.min(0.80, effectiveAge / econLife);
  return Math.round(replacementCostNew * depRate);
}

/**
 * Estimates land value as a percentage of the assessed or estimated value.
 */
export function estimateLandValue(params: {
  assessedValue?: number | null;
  estimatedValue?: number | null;
  propertyType?: string | null;
}): number {
  const { assessedValue, estimatedValue, propertyType } = params;
  const base = assessedValue ?? estimatedValue ?? 0;

  const key = (propertyType ?? "").toLowerCase();
  const ratio = key in LAND_VALUE_RATIO ? LAND_VALUE_RATIO[key] : DEFAULT_LAND_VALUE_RATIO;

  return Math.round(base * ratio);
}

// ─── Main Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates all Cost Approach components for a property.
 *
 * When squareFeet is missing/null/≤0, costApproachValue and replacementCostNew
 * are returned as null, but landValue is still computed.
 */
export function calculateCostApproach(params: {
  squareFeet?: number | null;
  yearBuilt?: number | null;
  assessedValue?: number | null;
  estimatedValue?: number | null;
  propertyType?: string | null;
}): CostApproachData {
  const { squareFeet, yearBuilt, assessedValue, estimatedValue, propertyType } = params;

  const landValue = estimateLandValue({ assessedValue, estimatedValue, propertyType });

  // If squareFeet is missing or invalid, return partial result
  if (squareFeet == null || squareFeet <= 0) {
    return {
      landValue,
      improvementValue: null,
      replacementCostNew: null,
      totalDepreciation: null,
      effectiveAge: null,
      remainingEconomicLife: null,
      costApproachValue: null,
    };
  }

  const costPerSF = computeReplacementCostPerSF(propertyType);
  const replacementCostNew = squareFeet * costPerSF;

  const econLife = getEconomicLife(propertyType);
  const currentYear = new Date().getFullYear();
  const chronologicalAge = yearBuilt != null ? Math.max(0, currentYear - yearBuilt) : 0;
  const effectiveAge = Math.min(chronologicalAge, econLife * 0.9);
  const remainingEconomicLife = Math.max(0, econLife - effectiveAge);

  // Physical depreciation
  const depRate = Math.min(0.80, effectiveAge / econLife);
  const physicalDep = Math.round(replacementCostNew * depRate);

  // Functional obsolescence
  let functionalObsolescenceRate = 0;
  if (yearBuilt != null) {
    if (yearBuilt < 1960) {
      functionalObsolescenceRate = 0.05;
    } else if (yearBuilt < 1980) {
      functionalObsolescenceRate = 0.02;
    }
  }
  const functionalDep = Math.round(replacementCostNew * functionalObsolescenceRate);

  const totalDepreciation = physicalDep + functionalDep;
  const improvementValue = Math.max(0, replacementCostNew - totalDepreciation);
  const costApproachValue = improvementValue + landValue;

  return {
    landValue,
    improvementValue,
    replacementCostNew,
    totalDepreciation,
    effectiveAge,
    remainingEconomicLife,
    costApproachValue,
  };
}
