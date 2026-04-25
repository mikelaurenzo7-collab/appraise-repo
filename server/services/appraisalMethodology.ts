/**
 * Advanced Appraisal Methodology Service
 *
 * Implements multiple valuation approaches per USPAP standards:
 * 1. Sales Comparison Approach (Market Data Approach)
 * 2. Cost Approach (Replacement Cost / Reproduction Cost)
 * 3. Income Approach (Direct Capitalization + GRM)
 *
 * Covers all 10+ property type scenarios:
 *   Residential: SFR, Condo, Townhome, Co-op, Manufactured/Mobile, Modular
 *   Income: Duplex, Triplex, Quadplex, Small Multifamily (5-12 units), Large Multifamily (13+)
 *   Commercial: Retail, Office, Industrial/Warehouse, Mixed-Use, Hospitality
 *   Special: Agricultural, Vacant Land, Special-Purpose, Excess Land
 *
 * Generates defensible appraisals suitable for pro-se tax appeal hearings.
 * All next-step language is software/pro-se oriented — no POA/legal representation.
 */

// ─── PROPERTY TYPE TAXONOMY ───────────────────────────────────────────────────

export type PropertyTypeCategory =
  | "sfr"              // Single-family residential
  | "condo"            // Condominium
  | "townhome"         // Townhome / rowhouse
  | "co-op"            // Cooperative apartment
  | "manufactured"     // Manufactured / mobile home
  | "modular"          // Modular home
  | "duplex"           // 2-unit residential
  | "triplex"          // 3-unit residential
  | "quadplex"         // 4-unit residential
  | "small-multifamily"  // 5–12 units
  | "large-multifamily"  // 13+ units
  | "retail"           // Retail / strip mall
  | "office"           // Office building
  | "industrial"       // Industrial / warehouse / flex
  | "mixed-use"        // Mixed residential + commercial
  | "hospitality"      // Hotel / motel / B&B
  | "agricultural"     // Farm / ranch / timberland
  | "vacant-land"      // Unimproved land
  | "special-purpose"  // Church, school, gas station, etc.
  | "excess-land"      // Land beyond what the improvement requires
  | "residential"      // Generic residential fallback
  | "commercial"       // Generic commercial fallback
  | "multi-family";    // Generic multifamily fallback

// ─── INTERFACES ───────────────────────────────────────────────────────────────

export interface ComparableSale {
  address: string;
  salePrice: number;
  saleDate: Date;
  daysAgo: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  condition: "excellent" | "good" | "average" | "fair" | "poor";
  adjustments: {
    location: number;
    condition: number;
    size: number;
    age: number;
    features: number;
  };
  adjustedPrice: number;
  source: string;
}

export interface AppraisalApproach {
  name: string;
  methodology: string;
  indicatedValue: number;
  confidence: number; // 0–100
  reasoning: string[];
  dataPoints: string[];
}

export interface AppraisalReport {
  propertyAddress: string;
  assessedValue: number;
  marketValue: number;
  approaches: AppraisalApproach[];
  finalValue: number;
  confidence: number;
  overassessmentAmount: number;
  overassessmentPercentage: number;
  reportDate: Date;
  methodology: string;
  limitationsAndAssumptions: string[];
  nextSteps: string[];
}

// ─── PROPERTY TYPE NORMALIZER ─────────────────────────────────────────────────

export function normalizePropertyType(raw: string): PropertyTypeCategory {
  const t = raw.toLowerCase().trim();
  if (t.includes("co-op") || t.includes("coop") || t.includes("cooperative")) return "co-op";
  if (t.includes("condo") || t.includes("condominium")) return "condo";
  if (t.includes("townhome") || t.includes("townhouse") || t.includes("rowhouse")) return "townhome";
  if (t.includes("manufactured") || t.includes("mobile home")) return "manufactured";
  if (t.includes("modular")) return "modular";
  if (t.includes("quadplex") || t.includes("4-flat") || t.includes("4 unit") || t.includes("four unit")) return "quadplex";
  if (t.includes("triplex") || t.includes("3-flat") || t.includes("3 unit") || t.includes("three unit")) return "triplex";
  if (t.includes("duplex") || t.includes("2-flat") || t.includes("2 unit") || t.includes("two unit")) return "duplex";
  if (t.includes("small multi") || (t.includes("apartment") && t.includes("small"))) return "small-multifamily";
  if (t.includes("large multi") || (t.includes("apartment") && t.includes("large"))) return "large-multifamily";
  if (t.includes("multi") || t.includes("apartment") || t.includes("multi-family")) return "multi-family";
  if (t.includes("retail") || t.includes("strip") || t.includes("storefront")) return "retail";
  if (t.includes("office")) return "office";
  if (t.includes("industrial") || t.includes("warehouse") || t.includes("flex")) return "industrial";
  if (t.includes("mixed") || t.includes("mixed-use")) return "mixed-use";
  if (t.includes("hotel") || t.includes("motel") || t.includes("hospitality") || t.includes("b&b") || t.includes("inn")) return "hospitality";
  if (t.includes("farm") || t.includes("ranch") || t.includes("agricultural") || t.includes("timberland") || t.includes("orchard")) return "agricultural";
  if (t.includes("vacant") || t.includes("land") || t.includes("lot") || t.includes("unimproved")) return "vacant-land";
  if (t.includes("special") || t.includes("church") || t.includes("school") || t.includes("gas station")) return "special-purpose";
  if (t.includes("excess land")) return "excess-land";
  if (t.includes("commercial")) return "commercial";
  if (t.includes("sfr") || t.includes("single family") || t.includes("single-family") || t.includes("house")) return "sfr";
  return "residential";
}

// ─── APPROACH WEIGHTING TABLE ─────────────────────────────────────────────────
// Weights reflect USPAP guidance and assessor board expectations per property type.

const APPROACH_WEIGHTS: Record<string, Record<string, number>> = {
  sfr:               { "Sales Comparison Approach": 0.70, "Cost Approach": 0.25, "Income Approach": 0.05 },
  condo:             { "Sales Comparison Approach": 0.80, "Cost Approach": 0.10, "Income Approach": 0.10 },
  townhome:          { "Sales Comparison Approach": 0.75, "Cost Approach": 0.20, "Income Approach": 0.05 },
  "co-op":           { "Sales Comparison Approach": 0.85, "Cost Approach": 0.05, "Income Approach": 0.10 },
  manufactured:      { "Sales Comparison Approach": 0.65, "Cost Approach": 0.35, "Income Approach": 0.00 },
  modular:           { "Sales Comparison Approach": 0.65, "Cost Approach": 0.35, "Income Approach": 0.00 },
  duplex:            { "Sales Comparison Approach": 0.50, "Cost Approach": 0.20, "Income Approach": 0.30 },
  triplex:           { "Sales Comparison Approach": 0.45, "Cost Approach": 0.15, "Income Approach": 0.40 },
  quadplex:          { "Sales Comparison Approach": 0.40, "Cost Approach": 0.15, "Income Approach": 0.45 },
  "small-multifamily": { "Sales Comparison Approach": 0.30, "Cost Approach": 0.15, "Income Approach": 0.55 },
  "large-multifamily": { "Sales Comparison Approach": 0.20, "Cost Approach": 0.10, "Income Approach": 0.70 },
  "multi-family":    { "Sales Comparison Approach": 0.35, "Cost Approach": 0.15, "Income Approach": 0.50 },
  retail:            { "Sales Comparison Approach": 0.30, "Cost Approach": 0.20, "Income Approach": 0.50 },
  office:            { "Sales Comparison Approach": 0.25, "Cost Approach": 0.20, "Income Approach": 0.55 },
  industrial:        { "Sales Comparison Approach": 0.35, "Cost Approach": 0.30, "Income Approach": 0.35 },
  "mixed-use":       { "Sales Comparison Approach": 0.35, "Cost Approach": 0.20, "Income Approach": 0.45 },
  hospitality:       { "Sales Comparison Approach": 0.20, "Cost Approach": 0.25, "Income Approach": 0.55 },
  agricultural:      { "Sales Comparison Approach": 0.55, "Cost Approach": 0.30, "Income Approach": 0.15 },
  "vacant-land":     { "Sales Comparison Approach": 0.90, "Cost Approach": 0.10, "Income Approach": 0.00 },
  "special-purpose": { "Sales Comparison Approach": 0.30, "Cost Approach": 0.50, "Income Approach": 0.20 },
  "excess-land":     { "Sales Comparison Approach": 0.80, "Cost Approach": 0.20, "Income Approach": 0.00 },
  residential:       { "Sales Comparison Approach": 0.65, "Cost Approach": 0.25, "Income Approach": 0.10 },
  commercial:        { "Sales Comparison Approach": 0.30, "Cost Approach": 0.20, "Income Approach": 0.50 },
};

// ─── REPLACEMENT COST PER SF BENCHMARKS ──────────────────────────────────────
// National median ranges (2024). Adjusted by condition multiplier downstream.

const REPLACEMENT_COST_PER_SF: Record<string, number> = {
  sfr: 175,
  condo: 165,
  townhome: 170,
  "co-op": 160,
  manufactured: 90,
  modular: 130,
  duplex: 160,
  triplex: 155,
  quadplex: 150,
  "small-multifamily": 145,
  "large-multifamily": 140,
  "multi-family": 150,
  retail: 130,
  office: 160,
  industrial: 85,
  "mixed-use": 150,
  hospitality: 200,
  agricultural: 60,
  "vacant-land": 0,
  "special-purpose": 180,
  "excess-land": 0,
  residential: 170,
  commercial: 145,
};

// ─── MARKET CAP RATE BENCHMARKS ──────────────────────────────────────────────
// National median cap rates by property type (2024).

const CAP_RATES: Record<string, number> = {
  sfr: 0.055,
  condo: 0.055,
  townhome: 0.055,
  "co-op": 0.055,
  manufactured: 0.075,
  modular: 0.065,
  duplex: 0.065,
  triplex: 0.068,
  quadplex: 0.070,
  "small-multifamily": 0.075,
  "large-multifamily": 0.055,
  "multi-family": 0.068,
  retail: 0.065,
  office: 0.070,
  industrial: 0.055,
  "mixed-use": 0.065,
  hospitality: 0.085,
  agricultural: 0.040,
  "vacant-land": 0.030,
  "special-purpose": 0.080,
  "excess-land": 0.030,
  residential: 0.060,
  commercial: 0.068,
};

// ─── EXPENSE RATIO BENCHMARKS ─────────────────────────────────────────────────

const EXPENSE_RATIOS: Record<string, number> = {
  sfr: 0.30,
  condo: 0.35,
  townhome: 0.32,
  "co-op": 0.40,
  manufactured: 0.30,
  modular: 0.30,
  duplex: 0.35,
  triplex: 0.38,
  quadplex: 0.40,
  "small-multifamily": 0.42,
  "large-multifamily": 0.45,
  "multi-family": 0.40,
  retail: 0.35,
  office: 0.40,
  industrial: 0.30,
  "mixed-use": 0.40,
  hospitality: 0.60,
  agricultural: 0.25,
  "vacant-land": 0.05,
  "special-purpose": 0.45,
  "excess-land": 0.05,
  residential: 0.32,
  commercial: 0.40,
};

// ─── VACANCY RATE BENCHMARKS ──────────────────────────────────────────────────

const VACANCY_RATES: Record<string, number> = {
  sfr: 0.05,
  condo: 0.05,
  townhome: 0.05,
  "co-op": 0.03,
  manufactured: 0.07,
  modular: 0.05,
  duplex: 0.05,
  triplex: 0.06,
  quadplex: 0.06,
  "small-multifamily": 0.07,
  "large-multifamily": 0.08,
  "multi-family": 0.07,
  retail: 0.10,
  office: 0.12,
  industrial: 0.06,
  "mixed-use": 0.08,
  hospitality: 0.30,
  agricultural: 0.02,
  "vacant-land": 0.00,
  "special-purpose": 0.05,
  "excess-land": 0.00,
  residential: 0.05,
  commercial: 0.10,
};

// ─── CONDITION MULTIPLIERS ────────────────────────────────────────────────────

const CONDITION_MULTIPLIERS: Record<string, number> = {
  excellent: 1.15,
  good: 1.05,
  average: 1.00,
  fair: 0.90,
  poor: 0.75,
};

// ─── DEPRECIATION RATE BY PROPERTY TYPE ──────────────────────────────────────
// Annual effective age depreciation rate (straight-line, capped at 80%).

const DEPRECIATION_RATES: Record<string, number> = {
  sfr: 1.5,
  condo: 1.2,
  townhome: 1.4,
  "co-op": 1.2,
  manufactured: 3.5,  // Manufactured homes depreciate faster
  modular: 2.0,
  duplex: 1.5,
  triplex: 1.5,
  quadplex: 1.5,
  "small-multifamily": 1.8,
  "large-multifamily": 2.0,
  "multi-family": 1.8,
  retail: 2.0,
  office: 2.0,
  industrial: 1.5,
  "mixed-use": 1.8,
  hospitality: 2.5,
  agricultural: 1.0,
  "vacant-land": 0.0,
  "special-purpose": 2.0,
  "excess-land": 0.0,
  residential: 1.5,
  commercial: 2.0,
};

// ─── SALES COMPARISON APPROACH ────────────────────────────────────────────────

export function salesComparisonApproach(
  subject: {
    squareFeet: number;
    bedrooms: number;
    bathrooms: number;
    yearBuilt: number;
    condition: string;
    location: string;
    propertyType?: string;
  },
  comparables: ComparableSale[]
): AppraisalApproach {
  const reasoning: string[] = [];
  const dataPoints: string[] = [];

  if (comparables.length === 0) {
    return {
      name: "Sales Comparison Approach",
      methodology: "No comparable sales data available",
      indicatedValue: 0,
      confidence: 0,
      reasoning: ["Insufficient market data — no comparable sales found within search radius"],
      dataPoints: [],
    };
  }

  // Confidence degrades with thin data
  const baseConfidence = Math.min(90, 40 + comparables.length * 8);

  // Weight by recency (exponential decay) and similarity
  const weightedComps = comparables
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
    .slice(0, 6)
    .map((comp, idx) => {
      const recencyWeight = Math.pow(0.75, idx); // 1.0, 0.75, 0.56, 0.42, 0.32, 0.24
      return { ...comp, weight: recencyWeight };
    });

  const totalWeight = weightedComps.reduce((sum, c) => sum + c.weight, 0);

  // Price per SF weighted average
  const weightedPricePerSF =
    weightedComps.reduce((sum, c) => sum + (c.adjustedPrice / c.squareFeet) * c.weight, 0) / totalWeight;

  const indicatedValue = Math.round(weightedPricePerSF * subject.squareFeet);

  // Apply condition multiplier
  const conditionKey = subject.condition?.toLowerCase() || "average";
  const conditionMultiplier = CONDITION_MULTIPLIERS[conditionKey] || 1.0;
  const conditionAdjustedValue = Math.round(indicatedValue * conditionMultiplier);

  reasoning.push(`Analyzed ${comparables.length} comparable sales in the subject market area`);
  reasoning.push(`Weighted average price per sq ft: $${weightedPricePerSF.toFixed(2)} (recency-weighted)`);
  reasoning.push(`Subject property: ${subject.squareFeet.toLocaleString()} sq ft × $${weightedPricePerSF.toFixed(2)} = $${indicatedValue.toLocaleString()}`);
  if (conditionMultiplier !== 1.0) {
    reasoning.push(`Condition adjustment (${conditionKey}): ×${conditionMultiplier} → $${conditionAdjustedValue.toLocaleString()}`);
  }

  const priceRange = `$${Math.min(...comparables.map(c => c.salePrice)).toLocaleString()} – $${Math.max(...comparables.map(c => c.salePrice)).toLocaleString()}`;
  dataPoints.push(`Comparable Sales Used: ${Math.min(6, comparables.length)}`);
  dataPoints.push(`Total Comps Available: ${comparables.length}`);
  dataPoints.push(`Most Recent Sale: ${new Date(comparables[0]?.saleDate).toLocaleDateString()}`);
  dataPoints.push(`Sale Price Range: ${priceRange}`);
  dataPoints.push(`Weighted Price/SF: $${weightedPricePerSF.toFixed(2)}`);

  return {
    name: "Sales Comparison Approach",
    methodology: "Recency-weighted comparable sales analysis with condition adjustment",
    indicatedValue: conditionAdjustedValue,
    confidence: baseConfidence,
    reasoning,
    dataPoints,
  };
}

// ─── COST APPROACH ────────────────────────────────────────────────────────────

export function costApproach(
  subject: {
    squareFeet: number;
    yearBuilt: number;
    condition: string;
    landValue: number;
    propertyType?: string;
    functionalObsolescence?: number;  // $ amount of functional obsolescence
    externalObsolescence?: number;    // $ amount of external/economic obsolescence
  },
  marketData?: {
    costPerSquareFoot?: number;
    depreciationRate?: number;
  }
): AppraisalApproach {
  const reasoning: string[] = [];
  const dataPoints: string[] = [];

  const normalizedType = normalizePropertyType(subject.propertyType || "residential");

  // Use provided cost/sqft or fall back to benchmark
  const costPerSF = marketData?.costPerSquareFoot || REPLACEMENT_COST_PER_SF[normalizedType] || 170;

  // Condition-adjusted replacement cost
  const conditionKey = subject.condition?.toLowerCase() || "average";
  const conditionMultiplier = CONDITION_MULTIPLIERS[conditionKey] || 1.0;
  const replacementCost = subject.squareFeet * costPerSF * conditionMultiplier;

  // Effective age depreciation
  const age = new Date().getFullYear() - subject.yearBuilt;
  const depreciationRate = marketData?.depreciationRate || DEPRECIATION_RATES[normalizedType] || 1.5;
  const physicalDepreciationPct = Math.min(age * depreciationRate, 80); // Cap at 80%
  const physicalDepreciation = replacementCost * (physicalDepreciationPct / 100);

  // Functional obsolescence (e.g., outdated floor plan, inadequate electrical)
  const functionalObs = subject.functionalObsolescence || 0;

  // External/economic obsolescence (e.g., highway proximity, declining neighborhood)
  const externalObs = subject.externalObsolescence || 0;

  const totalDepreciation = physicalDepreciation + functionalObs + externalObs;
  const depreciatedBuildingValue = Math.max(0, replacementCost - totalDepreciation);
  const indicatedValue = Math.round(subject.landValue + depreciatedBuildingValue);

  reasoning.push(`Land value: $${subject.landValue.toLocaleString()}`);
  reasoning.push(`Replacement cost (${subject.squareFeet.toLocaleString()} sq ft × $${costPerSF}/sq ft × ${conditionMultiplier} condition): $${Math.round(replacementCost).toLocaleString()}`);
  reasoning.push(`Physical depreciation: ${physicalDepreciationPct.toFixed(1)}% (${age} yrs × ${depreciationRate}%/yr) = −$${Math.round(physicalDepreciation).toLocaleString()}`);
  if (functionalObs > 0) reasoning.push(`Functional obsolescence: −$${functionalObs.toLocaleString()}`);
  if (externalObs > 0) reasoning.push(`External/economic obsolescence: −$${externalObs.toLocaleString()}`);
  reasoning.push(`Depreciated building value: $${Math.round(depreciatedBuildingValue).toLocaleString()}`);
  reasoning.push(`Indicated value (land + building): $${indicatedValue.toLocaleString()}`);

  dataPoints.push(`Building Age: ${age} years`);
  dataPoints.push(`Cost/Sq Ft: $${costPerSF}`);
  dataPoints.push(`Physical Depreciation: ${physicalDepreciationPct.toFixed(1)}%`);
  if (functionalObs > 0) dataPoints.push(`Functional Obsolescence: $${functionalObs.toLocaleString()}`);
  if (externalObs > 0) dataPoints.push(`External Obsolescence: $${externalObs.toLocaleString()}`);

  // Confidence: lower for older buildings (more depreciation uncertainty), higher for new
  const confidence = Math.max(40, Math.min(75, 75 - age * 0.5));

  return {
    name: "Cost Approach",
    methodology: "Land Value + Replacement Cost − Physical/Functional/External Depreciation",
    indicatedValue,
    confidence: Math.round(confidence),
    reasoning,
    dataPoints,
  };
}

// ─── INCOME APPROACH ─────────────────────────────────────────────────────────

export function incomeApproach(
  subject: {
    annualRentalIncome: number;
    annualExpenses?: number;
    capitalizationRate?: number;
    propertyType?: string;
    vacancyRate?: number;
    grossRentMultiplier?: number; // Alternative GRM method
    monthlyRent?: number;         // For GRM cross-check
    squareFeet?: number;          // For commercial $/SF rent
  }
): AppraisalApproach {
  const reasoning: string[] = [];
  const dataPoints: string[] = [];

  const normalizedType = normalizePropertyType(subject.propertyType || "residential");
  const capRate = subject.capitalizationRate || CAP_RATES[normalizedType] || 0.065;
  const vacancyRate = subject.vacancyRate || VACANCY_RATES[normalizedType] || 0.07;
  const expenseRatio = EXPENSE_RATIOS[normalizedType] || 0.40;

  const grossPotentialIncome = subject.annualRentalIncome;
  const vacancyLoss = grossPotentialIncome * vacancyRate;
  const effectiveGrossIncome = grossPotentialIncome - vacancyLoss;

  // Use provided expenses or estimate from benchmark ratio
  const operatingExpenses = subject.annualExpenses || effectiveGrossIncome * expenseRatio;
  const noi = effectiveGrossIncome - operatingExpenses;

  if (noi <= 0) {
    return {
      name: "Income Approach",
      methodology: "Direct Capitalization — insufficient NOI",
      indicatedValue: 0,
      confidence: 0,
      reasoning: ["Net Operating Income is zero or negative — income approach not applicable"],
      dataPoints: [],
    };
  }

  const directCapValue = Math.round(noi / capRate);

  // GRM cross-check if monthly rent provided
  let grmValue: number | undefined;
  if (subject.monthlyRent && subject.grossRentMultiplier) {
    grmValue = Math.round(subject.monthlyRent * 12 * subject.grossRentMultiplier);
    reasoning.push(`GRM cross-check: $${(subject.monthlyRent * 12).toLocaleString()} × ${subject.grossRentMultiplier} GRM = $${grmValue.toLocaleString()}`);
  }

  // Final income value: weight direct cap 80%, GRM 20% if available
  const indicatedValue = grmValue
    ? Math.round(directCapValue * 0.80 + grmValue * 0.20)
    : directCapValue;

  reasoning.push(`Gross potential income: $${grossPotentialIncome.toLocaleString()}`);
  reasoning.push(`Vacancy & collection loss (${(vacancyRate * 100).toFixed(0)}%): −$${Math.round(vacancyLoss).toLocaleString()}`);
  reasoning.push(`Effective gross income: $${Math.round(effectiveGrossIncome).toLocaleString()}`);
  reasoning.push(`Operating expenses (${(expenseRatio * 100).toFixed(0)}% of EGI): −$${Math.round(operatingExpenses).toLocaleString()}`);
  reasoning.push(`Net operating income: $${Math.round(noi).toLocaleString()}`);
  reasoning.push(`Capitalization rate: ${(capRate * 100).toFixed(2)}%`);
  reasoning.push(`Indicated value (NOI ÷ Cap Rate): $${directCapValue.toLocaleString()}`);
  if (grmValue) reasoning.push(`Reconciled with GRM: $${indicatedValue.toLocaleString()}`);

  dataPoints.push(`Gross Potential Income: $${grossPotentialIncome.toLocaleString()}`);
  dataPoints.push(`Vacancy Rate: ${(vacancyRate * 100).toFixed(0)}%`);
  dataPoints.push(`Effective Gross Income: $${Math.round(effectiveGrossIncome).toLocaleString()}`);
  dataPoints.push(`NOI: $${Math.round(noi).toLocaleString()}`);
  dataPoints.push(`Cap Rate: ${(capRate * 100).toFixed(2)}%`);
  if (grmValue) dataPoints.push(`GRM Cross-Check: $${grmValue.toLocaleString()}`);

  // Confidence: higher for income properties with real rent data
  const confidence = subject.annualExpenses ? 80 : 65;

  return {
    name: "Income Approach",
    methodology: "Direct Capitalization (NOI ÷ Cap Rate)" + (grmValue ? " + GRM Cross-Check" : ""),
    indicatedValue,
    confidence,
    reasoning,
    dataPoints,
  };
}

// ─── RECONCILE APPROACHES ─────────────────────────────────────────────────────

export function reconcileApproaches(
  approaches: AppraisalApproach[],
  propertyType: string
): { finalValue: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const normalizedType = normalizePropertyType(propertyType);
  const typeWeights = APPROACH_WEIGHTS[normalizedType] || APPROACH_WEIGHTS.residential;

  // Filter out zero-confidence approaches (no data)
  const validApproaches = approaches.filter(a => a.confidence > 0 && a.indicatedValue > 0);

  if (validApproaches.length === 0) {
    return { finalValue: 0, reasoning: ["No valid approaches — insufficient data for reconciliation"] };
  }

  let weightedValue = 0;
  let totalWeight = 0;

  validApproaches.forEach(approach => {
    const weight = typeWeights[approach.name] || 0;
    if (weight > 0) {
      // Scale weight by confidence (higher confidence = more weight)
      const confidenceScaled = weight * (approach.confidence / 100);
      weightedValue += approach.indicatedValue * confidenceScaled;
      totalWeight += confidenceScaled;
      reasoning.push(
        `${approach.name}: $${approach.indicatedValue.toLocaleString()} ` +
        `(weight: ${(weight * 100).toFixed(0)}%, confidence: ${approach.confidence}%)`
      );
    }
  });

  const finalValue = totalWeight > 0 ? Math.round(weightedValue / totalWeight) : 0;
  reasoning.push(`Reconciled market value indication: $${finalValue.toLocaleString()}`);

  return { finalValue, reasoning };
}

// ─── GENERATE APPRAISAL REPORT ────────────────────────────────────────────────

export function generateAppraisalReport(
  subject: {
    address: string;
    assessedValue: number;
    squareFeet: number;
    yearBuilt: number;
    condition: string;
    propertyType: string;
  },
  approaches: AppraisalApproach[]
): AppraisalReport {
  const { finalValue, reasoning: reconciliationReasoning } = reconcileApproaches(
    approaches,
    subject.propertyType
  );

  const overassessmentAmount = subject.assessedValue - finalValue;
  const overassessmentPercentage = finalValue > 0
    ? (overassessmentAmount / subject.assessedValue) * 100
    : 0;

  const normalizedType = normalizePropertyType(subject.propertyType);

  // Property-type-specific limitations
  const limitationsAndAssumptions: string[] = [
    "Appraisal is limited to the specific date of valuation",
    "Market data based on publicly available comparable sales and assessor records",
    "No hidden defects, structural issues, or environmental hazards assumed unless noted",
    "Title is assumed to be clear and marketable",
    "Property is assumed to be available on the open market",
  ];

  if (normalizedType === "condo" || normalizedType === "co-op") {
    limitationsAndAssumptions.push("HOA/co-op financials, special assessments, and monthly fees not independently verified");
  }
  if (normalizedType === "manufactured" || normalizedType === "modular") {
    limitationsAndAssumptions.push("Manufactured/modular home value is sensitive to land ownership status (owned vs. leased) and HUD certification");
  }
  if (["duplex", "triplex", "quadplex", "small-multifamily", "large-multifamily", "multi-family"].includes(normalizedType)) {
    limitationsAndAssumptions.push("Rental income estimates based on market rent surveys; actual leases not reviewed");
    limitationsAndAssumptions.push("Operating expense ratio based on market benchmarks; actual expenses not audited");
  }
  if (["retail", "office", "industrial", "mixed-use", "hospitality"].includes(normalizedType)) {
    limitationsAndAssumptions.push("Commercial lease terms, tenant creditworthiness, and lease expiration dates not independently verified");
    limitationsAndAssumptions.push("Cap rate derived from market transactions; actual investor yield may vary");
  }
  if (normalizedType === "agricultural") {
    limitationsAndAssumptions.push("Agricultural productivity rating, soil classification, and water rights not independently verified");
    limitationsAndAssumptions.push("Farm income estimates based on market rent surveys; actual crop yields not reviewed");
  }
  if (normalizedType === "vacant-land" || normalizedType === "excess-land") {
    limitationsAndAssumptions.push("Zoning, entitlements, and development potential not independently verified");
    limitationsAndAssumptions.push("Environmental conditions, wetlands, and flood zone status assumed clear unless noted");
  }

  // Pro-se oriented next steps (no POA/legal representation language)
  const nextSteps: string[] = [];
  if (overassessmentPercentage > 10) {
    nextSteps.push(`Strong appeal case — assessed value exceeds market value estimate by ${overassessmentPercentage.toFixed(1)}%`);
    nextSteps.push("Download the full PDF appraisal report to use as evidence in your pro-se appeal");
    nextSteps.push("Use the AppraiseAI automated filing tool to submit your appeal through your county's online portal");
  } else if (overassessmentPercentage > 5) {
    nextSteps.push(`Moderate appeal case — assessed value exceeds market value estimate by ${overassessmentPercentage.toFixed(1)}%`);
    nextSteps.push("Consider filing a pro-se appeal — the evidence package supports a reduction");
    nextSteps.push("Download the full PDF appraisal report and comparable sales analysis");
  } else if (overassessmentPercentage > 2) {
    nextSteps.push(`Marginal appeal case — ${overassessmentPercentage.toFixed(1)}% gap may be within assessor's tolerance`);
    nextSteps.push("Review comparable sales carefully — a pro-se appeal may still yield a reduction");
  } else if (overassessmentPercentage > 0) {
    nextSteps.push("Minimal overassessment detected — appeal may not be cost-effective at this margin");
    nextSteps.push("Monitor your assessment notice each year and re-run analysis if assessment increases");
  } else {
    nextSteps.push("Property appears to be assessed at or below market value — no appeal recommended at this time");
  }

  // Confidence: average of valid approaches weighted by their confidence
  const validApproaches = approaches.filter(a => a.confidence > 0 && a.indicatedValue > 0);
  const avgConfidence = validApproaches.length > 0
    ? Math.round(validApproaches.reduce((sum, a) => sum + a.confidence, 0) / validApproaches.length)
    : 0;

  return {
    propertyAddress: subject.address,
    assessedValue: subject.assessedValue,
    marketValue: finalValue,
    approaches,
    finalValue,
    confidence: avgConfidence,
    overassessmentAmount,
    overassessmentPercentage: Math.round(overassessmentPercentage * 10) / 10,
    reportDate: new Date(),
    methodology: "Multi-Approach USPAP-Compliant Appraisal",
    limitationsAndAssumptions,
    nextSteps,
  };
}
