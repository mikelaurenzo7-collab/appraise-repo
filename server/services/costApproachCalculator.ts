/**
 * Cost Approach Calculator
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the Cost Approach per USPAP standards:
 * Cost Approach = Land Value + Replacement Cost − Depreciation
 *
 * Depreciation includes:
 * - Physical Depreciation (wear and tear, age)
 * - Functional Obsolescence (outdated systems, poor layout)
 * - External Obsolescence (market conditions, neighborhood decline)
 */

export interface CostApproachInput {
  address: string;
  squareFeet: number;
  yearBuilt: number;
  condition: "excellent" | "good" | "average" | "fair" | "poor";
  propertyType: string;
  landValue: number;
  functionalObsolescence?: number; // $ amount
  externalObsolescence?: number;   // $ amount
  costPerSquareFoot?: number;      // Override benchmark
  depreciationRate?: number;       // Override benchmark
}

export interface DepreciationBreakdown {
  physicalDepreciationPercent: number;
  physicalDepreciationDollar: number;
  functionalObsolescencePercent: number;
  functionalObsolescenceDollar: number;
  externalObsolescencePercent: number;
  externalObsolescenceDollar: number;
  totalDepreciationPercent: number;
  totalDepreciationDollar: number;
}

export interface CostApproachResult {
  landValue: number;
  replacementCostNew: number;
  costPerSquareFoot: number;
  buildingAge: number;
  effectiveAge: number;
  depreciation: DepreciationBreakdown;
  depreciatedBuildingValue: number;
  indicatedValue: number;
  confidence: number; // 0-100
  analysisNarrative: string;
  dataPoints: string[];
  warnings: string[];
}

// ─── REPLACEMENT COST BENCHMARKS ──────────────────────────────────────────────

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

// ─── DEPRECIATION RATES (% per year) ──────────────────────────────────────────

const ANNUAL_DEPRECIATION_RATES: Record<string, number> = {
  sfr: 1.5,
  condo: 1.2,
  townhome: 1.4,
  "co-op": 1.2,
  manufactured: 3.5,
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

// ─── CONDITION MULTIPLIERS ────────────────────────────────────────────────────

const CONDITION_MULTIPLIERS: Record<string, number> = {
  excellent: 1.15,  // 15% premium for excellent condition
  good: 1.05,       // 5% premium for good condition
  average: 1.00,    // No adjustment for average
  fair: 0.90,       // 10% discount for fair condition
  poor: 0.75,       // 25% discount for poor condition
};

// ─── EFFECTIVE AGE ADJUSTMENTS ────────────────────────────────────────────────
// Accounts for renovation/maintenance that reduces effective age

const EFFECTIVE_AGE_MULTIPLIERS: Record<string, number> = {
  excellent: 0.5,   // Well-maintained = 50% of actual age
  good: 0.7,        // Good maintenance = 70% of actual age
  average: 1.0,     // Average maintenance = 100% of actual age
  fair: 1.3,        // Poor maintenance = 130% of actual age
  poor: 1.5,        // Very poor maintenance = 150% of actual age
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function normalizePropertyType(raw: string): string {
  const t = raw.toLowerCase().trim();
  if (t.includes("sfr") || t.includes("single family") || t.includes("house")) return "sfr";
  if (t.includes("condo") || t.includes("condominium")) return "condo";
  if (t.includes("townhome") || t.includes("townhouse")) return "townhome";
  if (t.includes("duplex")) return "duplex";
  if (t.includes("triplex")) return "triplex";
  if (t.includes("quadplex")) return "quadplex";
  if (t.includes("multi") || t.includes("apartment")) return "multi-family";
  if (t.includes("commercial")) return "commercial";
  return "residential";
}

function getReplacementCostPerSF(propertyType: string): number {
  const normalized = normalizePropertyType(propertyType);
  return REPLACEMENT_COST_PER_SF[normalized] || REPLACEMENT_COST_PER_SF.residential;
}

function getDepreciationRate(propertyType: string): number {
  const normalized = normalizePropertyType(propertyType);
  return ANNUAL_DEPRECIATION_RATES[normalized] || ANNUAL_DEPRECIATION_RATES.residential;
}

function getConditionMultiplier(condition: string): number {
  const key = condition.toLowerCase() as keyof typeof CONDITION_MULTIPLIERS;
  return CONDITION_MULTIPLIERS[key] || 1.0;
}

function getEffectiveAgeMultiplier(condition: string): number {
  const key = condition.toLowerCase() as keyof typeof EFFECTIVE_AGE_MULTIPLIERS;
  return EFFECTIVE_AGE_MULTIPLIERS[key] || 1.0;
}

// ─── MAIN CALCULATION FUNCTION ─────────────────────────────────────────────────

export function calculateCostApproach(input: CostApproachInput): CostApproachResult {
  const warnings: string[] = [];
  const dataPoints: string[] = [];
  
  // Get benchmarks
  const costPerSF = input.costPerSquareFoot || getReplacementCostPerSF(input.propertyType);
  const depreciationRate = input.depreciationRate || getDepreciationRate(input.propertyType);
  const conditionMultiplier = getConditionMultiplier(input.condition);
  const effectiveAgeMultiplier = getEffectiveAgeMultiplier(input.condition);
  
  // Calculate building age
  const buildingAge = new Date().getFullYear() - input.yearBuilt;
  const effectiveAge = Math.round(buildingAge * effectiveAgeMultiplier);
  
  // Step 1: Calculate replacement cost new (RCN)
  const replacementCostNew = Math.round(input.squareFeet * costPerSF * conditionMultiplier);
  
  // Step 2: Calculate physical depreciation
  const physicalDepreciationPercent = Math.min(effectiveAge * depreciationRate, 80); // Cap at 80%
  const physicalDepreciationDollar = Math.round(replacementCostNew * (physicalDepreciationPercent / 100));
  
  // Step 3: Calculate functional obsolescence
  const functionalObsolescence = input.functionalObsolescence || 0;
  const functionalObsolescencePercent = functionalObsolescence > 0
    ? (functionalObsolescence / replacementCostNew) * 100
    : 0;
  
  // Step 4: Calculate external obsolescence
  const externalObsolescence = input.externalObsolescence || 0;
  const externalObsolescencePercent = externalObsolescence > 0
    ? (externalObsolescence / replacementCostNew) * 100
    : 0;
  
  // Step 5: Calculate total depreciation
  const totalDepreciationDollar = physicalDepreciationDollar + functionalObsolescence + externalObsolescence;
  const totalDepreciationPercent = (totalDepreciationDollar / replacementCostNew) * 100;
  
  // Step 6: Calculate depreciated building value
  const depreciatedBuildingValue = Math.max(0, replacementCostNew - totalDepreciationDollar);
  
  // Step 7: Calculate indicated value
  const indicatedValue = Math.round(input.landValue + depreciatedBuildingValue);
  
  // Calculate confidence
  let confidence = 70; // Base confidence for cost approach
  
  if (buildingAge < 5) {
    confidence += 15; // Higher confidence for newer buildings
  } else if (buildingAge > 50) {
    confidence -= 10; // Lower confidence for very old buildings
  }
  
  if (input.condition === "excellent" || input.condition === "good") {
    confidence += 10;
  } else if (input.condition === "poor") {
    confidence -= 15;
  }
  
  confidence = Math.min(100, Math.max(0, confidence));
  
  // Generate narrative
  const analysisNarrative = generateCostApproachNarrative(
    input,
    replacementCostNew,
    physicalDepreciationPercent,
    physicalDepreciationDollar,
    functionalObsolescence,
    externalObsolescence,
    depreciatedBuildingValue,
    indicatedValue
  );
  
  // Data points
  dataPoints.push(`Land Value: $${input.landValue.toLocaleString()}`);
  dataPoints.push(`Building Age: ${buildingAge} years (Effective: ${effectiveAge} years)`);
  dataPoints.push(`Cost Per Sq Ft: $${costPerSF}`);
  dataPoints.push(`Replacement Cost New: $${replacementCostNew.toLocaleString()}`);
  dataPoints.push(`Physical Depreciation: ${physicalDepreciationPercent.toFixed(1)}% = $${physicalDepreciationDollar.toLocaleString()}`);
  if (functionalObsolescence > 0) {
    dataPoints.push(`Functional Obsolescence: $${functionalObsolescence.toLocaleString()}`);
  }
  if (externalObsolescence > 0) {
    dataPoints.push(`External Obsolescence: $${externalObsolescence.toLocaleString()}`);
  }
  dataPoints.push(`Total Depreciation: ${totalDepreciationPercent.toFixed(1)}% = $${totalDepreciationDollar.toLocaleString()}`);
  dataPoints.push(`Depreciated Building Value: $${depreciatedBuildingValue.toLocaleString()}`);
  dataPoints.push(`Indicated Value: $${indicatedValue.toLocaleString()}`);
  dataPoints.push(`Confidence Level: ${confidence}%`);
  
  return {
    landValue: input.landValue,
    replacementCostNew,
    costPerSquareFoot: costPerSF,
    buildingAge,
    effectiveAge,
    depreciation: {
      physicalDepreciationPercent,
      physicalDepreciationDollar,
      functionalObsolescencePercent,
      functionalObsolescenceDollar: functionalObsolescence,
      externalObsolescencePercent,
      externalObsolescenceDollar: externalObsolescence,
      totalDepreciationPercent,
      totalDepreciationDollar,
    },
    depreciatedBuildingValue,
    indicatedValue,
    confidence,
    analysisNarrative,
    dataPoints,
    warnings,
  };
}

// ─── NARRATIVE GENERATION ──────────────────────────────────────────────────────

function generateCostApproachNarrative(
  input: CostApproachInput,
  replacementCostNew: number,
  physicalDepreciationPercent: number,
  physicalDepreciationDollar: number,
  functionalObsolescence: number,
  externalObsolescence: number,
  depreciatedBuildingValue: number,
  indicatedValue: number
): string {
  const buildingAge = new Date().getFullYear() - input.yearBuilt;
  
  let narrative = `The Cost Approach estimates value by calculating the cost to replace the improvements, less depreciation, plus land value. `;
  
  narrative += `The subject property was built in ${input.yearBuilt} (${buildingAge} years old) and contains ${input.squareFeet.toLocaleString()} square feet. `;
  
  narrative += `Using a replacement cost of $${input.costPerSquareFoot}/sq ft for ${input.propertyType} properties in this market, the replacement cost new is $${replacementCostNew.toLocaleString()}. `;
  
  narrative += `Physical depreciation is calculated at ${physicalDepreciationPercent.toFixed(1)}% based on the building's effective age and condition, totaling $${physicalDepreciationDollar.toLocaleString()}. `;
  
  if (functionalObsolescence > 0) {
    narrative += `Functional obsolescence of $${functionalObsolescence.toLocaleString()} is applied for outdated systems or layout issues. `;
  }
  
  if (externalObsolescence > 0) {
    narrative += `External obsolescence of $${externalObsolescence.toLocaleString()} reflects market conditions and neighborhood factors. `;
  }
  
  narrative += `After deducting total depreciation from the replacement cost and adding the land value of $${input.landValue.toLocaleString()}, the Cost Approach indicates a value of $${indicatedValue.toLocaleString()}.`;
  
  return narrative.trim();
}
