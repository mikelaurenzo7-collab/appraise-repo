/**
 * Appraisal Reconciliation & Narrative Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Synthesizes multiple valuation approaches into a professional reconciliation
 * narrative per USPAP standards. Provides expert-level advocacy language while
 * maintaining objectivity and factual accuracy.
 */

export interface AppraisalApproachResult {
  name: "Sales Comparison" | "Cost Approach" | "Income Approach";
  indicatedValue: number;
  confidence: number; // 0-100
  reasoning: string[];
  dataPoints: string[];
}

export interface ReconciliationInput {
  address: string;
  assessedValue: number;
  salesComparisonValue?: number;
  salesComparisonConfidence?: number;
  costApproachValue?: number;
  costApproachConfidence?: number;
  incomeApproachValue?: number;
  incomeApproachConfidence?: number;
  propertyType: string;
  marketCondition?: "buyer" | "seller" | "balanced";
}

export interface ReconciliationResult {
  finalValue: number;
  assessmentGap: number;
  assessmentGapPercent: number;
  reconciliationNarrative: string;
  approachWeights: Record<string, number>;
  confidenceLevel: number;
  appealStrengthFactors: string[];
  expertObservations: string[];
}

// ─── APPROACH WEIGHTING TABLE ─────────────────────────────────────────────────
// Per USPAP guidelines, weights reflect property type and data quality

const APPROACH_WEIGHTS: Record<string, Record<string, number>> = {
  sfr: { "Sales Comparison": 0.70, "Cost Approach": 0.25, "Income Approach": 0.05 },
  condo: { "Sales Comparison": 0.80, "Cost Approach": 0.10, "Income Approach": 0.10 },
  townhome: { "Sales Comparison": 0.75, "Cost Approach": 0.20, "Income Approach": 0.05 },
  duplex: { "Sales Comparison": 0.50, "Cost Approach": 0.20, "Income Approach": 0.30 },
  triplex: { "Sales Comparison": 0.45, "Cost Approach": 0.15, "Income Approach": 0.40 },
  quadplex: { "Sales Comparison": 0.40, "Cost Approach": 0.15, "Income Approach": 0.45 },
  "small-multifamily": { "Sales Comparison": 0.30, "Cost Approach": 0.15, "Income Approach": 0.55 },
  "large-multifamily": { "Sales Comparison": 0.20, "Cost Approach": 0.10, "Income Approach": 0.70 },
  retail: { "Sales Comparison": 0.30, "Cost Approach": 0.20, "Income Approach": 0.50 },
  office: { "Sales Comparison": 0.25, "Cost Approach": 0.20, "Income Approach": 0.55 },
  industrial: { "Sales Comparison": 0.35, "Cost Approach": 0.30, "Income Approach": 0.35 },
  "mixed-use": { "Sales Comparison": 0.35, "Cost Approach": 0.20, "Income Approach": 0.45 },
  hospitality: { "Sales Comparison": 0.20, "Cost Approach": 0.25, "Income Approach": 0.55 },
  agricultural: { "Sales Comparison": 0.55, "Cost Approach": 0.30, "Income Approach": 0.15 },
  "vacant-land": { "Sales Comparison": 0.90, "Cost Approach": 0.10, "Income Approach": 0.00 },
  residential: { "Sales Comparison": 0.65, "Cost Approach": 0.25, "Income Approach": 0.10 },
  commercial: { "Sales Comparison": 0.30, "Cost Approach": 0.20, "Income Approach": 0.50 },
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function normalizePropertyType(raw: string): string {
  const t = raw.toLowerCase().trim();
  if (t.includes("sfr") || t.includes("single family")) return "sfr";
  if (t.includes("condo")) return "condo";
  if (t.includes("townhome")) return "townhome";
  if (t.includes("duplex")) return "duplex";
  if (t.includes("triplex")) return "triplex";
  if (t.includes("quadplex")) return "quadplex";
  if (t.includes("small multi")) return "small-multifamily";
  if (t.includes("large multi")) return "large-multifamily";
  if (t.includes("multi") || t.includes("apartment")) return "residential";
  if (t.includes("retail")) return "retail";
  if (t.includes("office")) return "office";
  if (t.includes("industrial")) return "industrial";
  if (t.includes("mixed")) return "mixed-use";
  if (t.includes("hospitality") || t.includes("hotel")) return "hospitality";
  if (t.includes("agricultural") || t.includes("farm")) return "agricultural";
  if (t.includes("vacant") || t.includes("land")) return "vacant-land";
  if (t.includes("commercial")) return "commercial";
  return "residential";
}

function getApproachWeights(propertyType: string): Record<string, number> {
  const normalized = normalizePropertyType(propertyType);
  return APPROACH_WEIGHTS[normalized] || APPROACH_WEIGHTS.residential;
}

// ─── MAIN RECONCILIATION FUNCTION ──────────────────────────────────────────────

export function reconcileApproaches(input: ReconciliationInput): ReconciliationResult {
  const weights = getApproachWeights(input.propertyType);
  
  // Collect valid approaches
  const approaches: Array<{ name: string; value: number; confidence: number; weight: number }> = [];
  
  if (input.salesComparisonValue && input.salesComparisonValue > 0) {
    const confidence = input.salesComparisonConfidence ?? 75;
    approaches.push({
      name: "Sales Comparison",
      value: input.salesComparisonValue,
      confidence,
      weight: weights["Sales Comparison"] || 0,
    });
  }
  
  if (input.costApproachValue && input.costApproachValue > 0) {
    const confidence = input.costApproachConfidence ?? 65;
    approaches.push({
      name: "Cost Approach",
      value: input.costApproachValue,
      confidence,
      weight: weights["Cost Approach"] || 0,
    });
  }
  
  if (input.incomeApproachValue && input.incomeApproachValue > 0) {
    const confidence = input.incomeApproachConfidence ?? 70;
    approaches.push({
      name: "Income Approach",
      value: input.incomeApproachValue,
      confidence,
      weight: weights["Income Approach"] || 0,
    });
  }
  
  if (approaches.length === 0) {
    return {
      finalValue: 0,
      assessmentGap: 0,
      assessmentGapPercent: 0,
      reconciliationNarrative: "Insufficient data for reconciliation.",
      approachWeights: weights,
      confidenceLevel: 0,
      appealStrengthFactors: [],
      expertObservations: [],
    };
  }
  
  // Calculate weighted value
  let weightedValue = 0;
  let totalWeight = 0;
  const approachWeights: Record<string, number> = {};
  
  approaches.forEach(approach => {
    // Scale weight by confidence
    const confidenceScaledWeight = approach.weight * (approach.confidence / 100);
    weightedValue += approach.value * confidenceScaledWeight;
    totalWeight += confidenceScaledWeight;
    approachWeights[approach.name] = approach.weight;
  });
  
  const finalValue = totalWeight > 0 ? Math.round(weightedValue / totalWeight) : 0;
  const assessmentGap = input.assessedValue - finalValue;
  const assessmentGapPercent = input.assessedValue > 0 
    ? (assessmentGap / input.assessedValue) * 100 
    : 0;
  
  // Calculate overall confidence
  const overallConfidence = Math.round(
    approaches.reduce((sum, a) => sum + a.confidence * a.weight, 0) / 
    approaches.reduce((sum, a) => sum + a.weight, 0)
  );
  
  // Generate reconciliation narrative
  const reconciliationNarrative = generateReconciliationNarrative(
    input,
    approaches,
    finalValue,
    assessmentGap,
    overallConfidence
  );
  
  // Generate appeal strength factors
  const appealStrengthFactors = generateAppealStrengthFactors(
    input,
    approaches,
    finalValue,
    assessmentGap,
    assessmentGapPercent
  );
  
  // Generate expert observations
  const expertObservations = generateExpertObservations(
    input,
    approaches,
    finalValue,
    overallConfidence
  );
  
  return {
    finalValue,
    assessmentGap,
    assessmentGapPercent,
    reconciliationNarrative,
    approachWeights,
    confidenceLevel: overallConfidence,
    appealStrengthFactors,
    expertObservations,
  };
}

// ─── NARRATIVE GENERATION ──────────────────────────────────────────────────────

function generateReconciliationNarrative(
  input: ReconciliationInput,
  approaches: Array<{ name: string; value: number; confidence: number; weight: number }>,
  finalValue: number,
  assessmentGap: number,
  confidence: number
): string {
  let narrative = `The three approaches to value have been analyzed and reconciled to arrive at a final market value estimate. `;
  
  // Describe each approach
  approaches.forEach(approach => {
    const weight = (approach.weight * 100).toFixed(0);
    narrative += `The ${approach.name} indicates a value of $${approach.value.toLocaleString()} and is weighted at ${weight}% based on data quality and applicability to this property type. `;
  });
  
  // Reconciliation statement
  narrative += `Reconciling these approaches, with consideration for the relative reliability and applicability of each method, results in a final market value estimate of $${finalValue.toLocaleString()}. `;
  
  // Assessment comparison
  if (assessmentGap > 0) {
    const gapPercent = ((assessmentGap / input.assessedValue) * 100).toFixed(1);
    narrative += `The subject property is currently assessed at $${input.assessedValue.toLocaleString()}, which represents an overassessment of $${assessmentGap.toLocaleString()} or ${gapPercent}% above the market value indication. `;
  } else if (assessmentGap < 0) {
    const gapPercent = ((Math.abs(assessmentGap) / input.assessedValue) * 100).toFixed(1);
    narrative += `The subject property is currently assessed at $${input.assessedValue.toLocaleString()}, which represents an underassessment of $${Math.abs(assessmentGap).toLocaleString()} or ${gapPercent}% below the market value indication. `;
  } else {
    narrative += `The subject property is assessed at fair market value.`;
  }
  
  narrative += `This analysis is supported by a ${confidence}% confidence level based on the quantity and quality of supporting data.`;
  
  return narrative.trim();
}

function generateAppealStrengthFactors(
  input: ReconciliationInput,
  approaches: Array<{ name: string; value: number; confidence: number; weight: number }>,
  finalValue: number,
  assessmentGap: number,
  assessmentGapPercent: number
): string[] {
  const factors: string[] = [];
  
  // Gap-based factors
  if (assessmentGapPercent > 15) {
    factors.push(`Significant overassessment of ${assessmentGapPercent.toFixed(1)}% identified through multi-approach analysis`);
  } else if (assessmentGapPercent > 10) {
    factors.push(`Material overassessment of ${assessmentGapPercent.toFixed(1)}% supported by comparable sales data`);
  } else if (assessmentGapPercent > 5) {
    factors.push(`Moderate overassessment of ${assessmentGapPercent.toFixed(1)}% indicated by market analysis`);
  }
  
  // Approach-based factors
  const salesComp = approaches.find(a => a.name === "Sales Comparison");
  if (salesComp && salesComp.confidence > 75) {
    factors.push(`Strong comparable sales evidence with ${salesComp.confidence}% confidence supports lower valuation`);
  }
  
  const costApproach = approaches.find(a => a.name === "Cost Approach");
  if (costApproach && costApproach.confidence > 70) {
    factors.push(`Cost approach analysis confirms valuation at $${costApproach.value.toLocaleString()}`);
  }
  
  const incomeApproach = approaches.find(a => a.name === "Income Approach");
  if (incomeApproach && incomeApproach.confidence > 70) {
    factors.push(`Income capitalization analysis supports valuation at $${incomeApproach.value.toLocaleString()}`);
  }
  
  // Multi-approach consistency
  if (approaches.length >= 2) {
    const values = approaches.map(a => a.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const rangePercent = (range / finalValue) * 100;
    
    if (rangePercent < 10) {
      factors.push(`High consistency across valuation approaches (${rangePercent.toFixed(1)}% range) strengthens conclusion`);
    }
  }
  
  return factors;
}

function generateExpertObservations(
  input: ReconciliationInput,
  approaches: Array<{ name: string; value: number; confidence: number; weight: number }>,
  finalValue: number,
  confidence: number
): string[] {
  const observations: string[] = [];
  
  // Confidence observations
  if (confidence > 80) {
    observations.push("High confidence in valuation conclusion based on multiple data sources and consistent approach results");
  } else if (confidence > 70) {
    observations.push("Good confidence in valuation conclusion supported by primary approach with secondary confirmation");
  } else {
    observations.push("Moderate confidence in valuation conclusion; recommend verification with additional market data");
  }
  
  // Market condition observations
  if (input.marketCondition === "buyer") {
    observations.push("Buyer's market conditions may provide additional support for lower valuations");
  } else if (input.marketCondition === "seller") {
    observations.push("Seller's market conditions suggest current assessment may be conservative");
  }
  
  // Data quality observations
  if (approaches.length === 3) {
    observations.push("All three approaches to value were applicable and analyzed, providing comprehensive valuation support");
  } else if (approaches.length === 2) {
    observations.push("Two valuation approaches were applicable and reconciled to support the conclusion");
  }
  
  // Assessment observations
  const assessmentGap = input.assessedValue - finalValue;
  if (assessmentGap > 0) {
    observations.push(`Assessment exceeds market value by $${assessmentGap.toLocaleString()}, indicating potential for successful appeal`);
  }
  
  return observations;
}
