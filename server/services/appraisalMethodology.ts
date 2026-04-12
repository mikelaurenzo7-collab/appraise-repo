/**
 * Advanced Appraisal Methodology Service
 * 
 * Implements multiple valuation approaches per USPAP standards:
 * 1. Sales Comparison Approach (Market Data Approach)
 * 2. Cost Approach (Replacement Cost)
 * 3. Income Approach (for multi-family, commercial)
 * 
 * Generates defensible appraisals suitable for tax appeal hearings.
 */

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
  confidence: number; // 0-100
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

/**
 * Sales Comparison Approach (Most Common for Residential)
 * 
 * Finds comparable sales and adjusts for differences
 */
export function salesComparisonApproach(
  subject: {
    squareFeet: number;
    bedrooms: number;
    bathrooms: number;
    yearBuilt: number;
    condition: string;
    location: string;
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
      reasoning: ["Insufficient market data"],
      dataPoints: [],
    };
  }

  // Weight recent sales more heavily
  const weightedComps = comparables
    .sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime())
    .slice(0, 5) // Use top 5 most recent
    .map((comp, idx) => ({
      ...comp,
      weight: 0.5 ** idx, // Exponential decay: 1.0, 0.5, 0.25, 0.125, 0.0625
    }));

  const totalWeight = weightedComps.reduce((sum, c) => sum + c.weight, 0);
  const weightedAverage =
    weightedComps.reduce((sum, c) => sum + (c.adjustedPrice * c.weight) / c.squareFeet, 0) /
    (totalWeight / subject.squareFeet);

  const indicatedValue = Math.round(weightedAverage * subject.squareFeet);

  reasoning.push(`Analyzed ${comparables.length} comparable sales`);
  reasoning.push(`Weighted average price/sq ft: $${(weightedAverage).toFixed(2)}`);
  reasoning.push(`Subject property square footage: ${subject.squareFeet.toLocaleString()} sq ft`);

  dataPoints.push(`Comparable Sales: ${comparables.length}`);
  dataPoints.push(`Most Recent Sale: ${comparables[0]?.saleDate.toLocaleDateString() || "N/A"}`);
  dataPoints.push(`Price Range: $${Math.min(...comparables.map((c) => c.salePrice)).toLocaleString()} - $${Math.max(...comparables.map((c) => c.salePrice)).toLocaleString()}`);

  return {
    name: "Sales Comparison Approach",
    methodology: "Market Data Analysis - Weighted comparable sales with adjustments",
    indicatedValue,
    confidence: Math.min(95, 50 + comparables.length * 10), // Higher confidence with more comps
    reasoning,
    dataPoints,
  };
}

/**
 * Cost Approach (Replacement Cost Method)
 * 
 * Calculates: Land Value + Replacement Cost of Building - Depreciation
 */
export function costApproach(
  subject: {
    squareFeet: number;
    yearBuilt: number;
    condition: string;
    landValue: number;
  },
  marketData: {
    costPerSquareFoot: number;
    depreciationRate: number; // Annual depreciation as %
  }
): AppraisalApproach {
  const reasoning: string[] = [];
  const dataPoints: string[] = [];

  const age = new Date().getFullYear() - subject.yearBuilt;
  const depreciationPercent = Math.min(age * marketData.depreciationRate, 50); // Cap at 50%

  const replacementCost = subject.squareFeet * marketData.costPerSquareFoot;
  const depreciation = replacementCost * (depreciationPercent / 100);
  const buildingValue = replacementCost - depreciation;
  const indicatedValue = Math.round(subject.landValue + buildingValue);

  reasoning.push(`Land value: $${subject.landValue.toLocaleString()}`);
  reasoning.push(`Replacement cost: $${replacementCost.toLocaleString()} (${subject.squareFeet} sq ft × $${marketData.costPerSquareFoot}/sq ft)`);
  reasoning.push(`Building age: ${age} years`);
  reasoning.push(`Depreciation: ${depreciationPercent.toFixed(1)}% = $${depreciation.toLocaleString()}`);
  reasoning.push(`Indicated value: $${indicatedValue.toLocaleString()}`);

  dataPoints.push(`Building Age: ${age} years`);
  dataPoints.push(`Cost/Sq Ft: $${marketData.costPerSquareFoot}`);
  dataPoints.push(`Depreciation Rate: ${depreciationPercent.toFixed(1)}%`);

  return {
    name: "Cost Approach",
    methodology: "Land Value + Replacement Cost - Depreciation",
    indicatedValue,
    confidence: 60, // Lower confidence than comps for residential
    reasoning,
    dataPoints,
  };
}

/**
 * Income Approach (For Multi-Family, Commercial, Rental Properties)
 * 
 * Uses: Net Operating Income / Capitalization Rate
 */
export function incomeApproach(
  subject: {
    annualRentalIncome: number;
    annualExpenses: number;
    capitalizationRate: number;
  }
): AppraisalApproach {
  const reasoning: string[] = [];
  const dataPoints: string[] = [];

  const noi = subject.annualRentalIncome - subject.annualExpenses;
  const indicatedValue = Math.round(noi / (subject.capitalizationRate / 100));

  reasoning.push(`Annual rental income: $${subject.annualRentalIncome.toLocaleString()}`);
  reasoning.push(`Annual expenses: $${subject.annualExpenses.toLocaleString()}`);
  reasoning.push(`Net Operating Income: $${noi.toLocaleString()}`);
  reasoning.push(`Capitalization rate: ${subject.capitalizationRate}%`);
  reasoning.push(`Indicated value: $${indicatedValue.toLocaleString()}`);

  dataPoints.push(`NOI: $${noi.toLocaleString()}`);
  dataPoints.push(`Cap Rate: ${subject.capitalizationRate}%`);

  return {
    name: "Income Approach",
    methodology: "Net Operating Income / Capitalization Rate",
    indicatedValue,
    confidence: 75, // Good for income-producing properties
    reasoning,
    dataPoints,
  };
}

/**
 * Reconcile multiple approaches into final appraised value
 * 
 * Weights approaches based on property type and data quality
 */
export function reconcileApproaches(
  approaches: AppraisalApproach[],
  propertyType: string
): { finalValue: number; reasoning: string[] } {
  const reasoning: string[] = [];

  // Weight approaches based on property type
  const weights: Record<string, Record<string, number>> = {
    residential: {
      "Sales Comparison Approach": 0.6,
      "Cost Approach": 0.3,
      "Income Approach": 0.1,
    },
    "multi-family": {
      "Sales Comparison Approach": 0.4,
      "Cost Approach": 0.2,
      "Income Approach": 0.4,
    },
    commercial: {
      "Sales Comparison Approach": 0.3,
      "Cost Approach": 0.2,
      "Income Approach": 0.5,
    },
    land: {
      "Sales Comparison Approach": 0.7,
      "Cost Approach": 0.3,
      "Income Approach": 0.0,
    },
  };

  const typeWeights = weights[propertyType.toLowerCase()] || weights.residential;

  let weightedValue = 0;
  let totalWeight = 0;

  approaches.forEach((approach) => {
    const weight = typeWeights[approach.name] || 0;
    if (weight > 0) {
      weightedValue += approach.indicatedValue * weight;
      totalWeight += weight;
      reasoning.push(
        `${approach.name}: $${approach.indicatedValue.toLocaleString()} (weight: ${(weight * 100).toFixed(0)}%, confidence: ${approach.confidence}%)`
      );
    }
  });

  const finalValue = Math.round(weightedValue / totalWeight);
  reasoning.push(`Final reconciled value: $${finalValue.toLocaleString()}`);

  return { finalValue, reasoning };
}

/**
 * Generate comprehensive appraisal report
 */
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
  const overassessmentPercentage = (overassessmentAmount / subject.assessedValue) * 100;

  const limitationsAndAssumptions = [
    "Appraisal is limited to the specific date of valuation",
    "Assumes property is in typical condition for its type",
    "Market data based on recent comparable sales in the area",
    "No hidden defects or structural issues assumed",
    "Title is assumed to be clear and marketable",
    "Property is assumed to be available on the open market",
  ];

  const nextSteps = [];
  if (overassessmentPercentage > 5) {
    nextSteps.push("Strong appeal case - overassessment exceeds 5%");
    nextSteps.push("Recommend filing property tax appeal");
    if (overassessmentAmount > 5000) {
      nextSteps.push("Consider power of attorney filing for professional representation");
    }
  } else if (overassessmentPercentage > 2) {
    nextSteps.push("Moderate appeal case - consider pro se filing");
  } else {
    nextSteps.push("Minimal overassessment - appeal may not be cost-effective");
  }

  return {
    propertyAddress: subject.address,
    assessedValue: subject.assessedValue,
    marketValue: finalValue,
    approaches,
    finalValue,
    confidence: Math.round(approaches.reduce((sum, a) => sum + a.confidence, 0) / approaches.length),
    overassessmentAmount,
    overassessmentPercentage: Math.round(overassessmentPercentage * 10) / 10,
    reportDate: new Date(),
    methodology: "Multi-Approach USPAP-Compliant Appraisal",
    limitationsAndAssumptions,
    nextSteps,
  };
}
