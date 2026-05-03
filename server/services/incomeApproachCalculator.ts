/**
 * IncomeApproachCalculator
 *
 * Pure TypeScript service for computing the Income Capitalization Approach
 * to property valuation.
 *
 * Methodology: NOI / Cap Rate = Income Value
 *   where NOI = Effective Gross Income - Operating Expenses
 *   and   EGI = Gross Potential Income × (1 - Vacancy Rate)
 *   and   GPI = Market Rent Per Unit × Total Units × 12
 */

import type { IncomeApproachSummary } from "./pdfGenerator";
import type { PropertyData } from "./propertyDataAggregator";

// ─── Lookup Tables ────────────────────────────────────────────────────────────

/** Vacancy rates by property scenario */
const VACANCY_RATES: Record<string, number> = {
  residential: 0.05,
  "single-family": 0.05,
  rental_property: 0.05,
  multi_family: 0.08,
  "multi-family": 0.08,
  commercial: 0.08,
  industrial: 0.10,
};
const DEFAULT_VACANCY_RATE = 0.07;

/** Operating expense ratios (as % of EGI) by property scenario */
const EXPENSE_RATIOS: Record<string, number> = {
  residential: 0.35,
  "single-family": 0.35,
  rental_property: 0.35,
  multi_family: 0.45,
  "multi-family": 0.45,
  commercial: 0.45,
  industrial: 0.40,
};
const DEFAULT_EXPENSE_RATIO = 0.40;

/** Cap rates by property scenario */
const CAP_RATES: Record<string, number> = {
  residential: 0.06,
  "single-family": 0.06,
  rental_property: 0.06,
  multi_family: 0.07,
  "multi-family": 0.07,
  commercial: 0.08,
  industrial: 0.09,
};
const DEFAULT_CAP_RATE = 0.07;

/** Scenarios where income approach is applicable */
const INCOME_APPLICABLE_SCENARIOS = new Set([
  "rental_property",
  "multi_family",
  "multi-family",
  "commercial",
  "industrial",
  "mixed_use",
]);

// ─── Exported Helper Functions ────────────────────────────────────────────────

/**
 * Derives the market rent per unit from property data.
 * Priority: data.marketRent → median of rentalComps → null
 */
export function deriveMarketRent(data: Partial<PropertyData>): number | null {
  if (data.marketRent != null) {
    return data.marketRent;
  }

  const comps = data.rentalComps;
  if (comps && comps.length > 0) {
    const rents = comps.map((c) => c.monthlyRent).sort((a, b) => a - b);
    const mid = Math.floor(rents.length / 2);
    if (rents.length % 2 === 1) {
      return rents[mid];
    }
    return (rents[mid - 1] + rents[mid]) / 2;
  }

  return null;
}

/**
 * Returns the vacancy rate for the given scenario key.
 * Falls back to the default (0.07) for unknown scenarios.
 */
export function computeVacancyRate(scenario: string): number {
  const key = scenario.toLowerCase();
  return key in VACANCY_RATES ? VACANCY_RATES[key] : DEFAULT_VACANCY_RATE;
}

// ─── Main Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates all Income Approach components for a property.
 *
 * Returns null when:
 *   - The scenario is not income-applicable AND no rental data is present
 *   - No market rent can be derived from the data
 */
export function calculateIncomeApproach(
  data: Partial<PropertyData>,
  scenario: string
): IncomeApproachSummary | null {
  const scenarioKey = scenario.toLowerCase();
  const isIncomeScenario = INCOME_APPLICABLE_SCENARIOS.has(scenarioKey);
  const hasRentalData = data.marketRent != null || (data.rentalComps && data.rentalComps.length > 0);

  // Only applicable for income scenarios or when rental data is present
  if (!isIncomeScenario && !hasRentalData) {
    return null;
  }

  const marketRentPerUnit = deriveMarketRent(data);
  if (marketRentPerUnit == null) {
    return null;
  }

  const totalUnits = Math.max(1, (data as any).unitCount ?? 1);
  const vacancyRate = computeVacancyRate(scenarioKey);
  const expenseRatio = EXPENSE_RATIOS[scenarioKey] ?? DEFAULT_EXPENSE_RATIO;
  const capRate = CAP_RATES[scenarioKey] ?? DEFAULT_CAP_RATE;

  const grossPotentialIncome = Math.round(marketRentPerUnit * totalUnits * 12);
  const effectiveGrossIncome = Math.round(grossPotentialIncome * (1 - vacancyRate));
  const operatingExpenses = Math.round(effectiveGrossIncome * expenseRatio);
  const netOperatingIncome = effectiveGrossIncome - operatingExpenses;
  const incomeValue = netOperatingIncome > 0 ? Math.round(netOperatingIncome / capRate) : 0;

  return {
    marketRentPerUnit,
    totalUnits,
    grossPotentialIncome,
    vacancyRate,
    effectiveGrossIncome,
    operatingExpenses,
    netOperatingIncome,
    capRate,
    incomeValue,
  };
}
