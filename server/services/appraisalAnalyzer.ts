import { invokeLLM } from "../_core/llm";
import type { PropertyData, ComparableSale } from "./propertyDataAggregator";
import type { SerperInsight } from "./serperSearch";
import { formatInsightsForLLM } from "./serperSearch";
import { getStateRules } from "./stateAssessmentRules";

// ─── ASSESSMENT LEVEL TABLE ───────────────────────────────────────────────────
// Each state/county has a statutory assessment level (% of market value).
// Cook County IL: 10% residential, 25% commercial
// Most states: 100% (assessed AT market value)
const ASSESSMENT_LEVELS: Record<string, number> = {
  "cook county": 0.10,
  "illinois": 0.3333,
  "california": 1.0,
  "new york": 1.0,
  "texas": 1.0,
  "florida": 1.0,
  "default": 1.0,
};

// ─── COOK COUNTY PROPERTY CLASS CODES ────────────────────────────────────────
const COOK_COUNTY_CLASSES: Record<string, string> = {
  "single family": "Class 2-03",
  "sfr": "Class 2-03",
  "residential": "Class 2-03",
  "condo": "Class 2-99",
  "2-flat": "Class 2-11",
  "duplex": "Class 2-11",
  "2 unit": "Class 2-11",
  "3-flat": "Class 2-12",
  "3 unit": "Class 2-12",
  "4-flat": "Class 2-12",
  "4 unit": "Class 2-12",
  "multifamily": "Class 2-11",
  "apartment": "Class 2-11",
  "commercial": "Class 5-17",
  "mixed use": "Class 5-91",
};

// ─── COOK COUNTY TRIENNIAL REASSESSMENT SCHEDULE ─────────────────────────────
const COOK_COUNTY_TRIENNIAL: Record<string, number[]> = {
  "evanston": [2022, 2025, 2028],
  "new trier": [2022, 2025, 2028],
  "niles": [2022, 2025, 2028],
  "norwood park": [2022, 2025, 2028],
  "rogers park": [2022, 2025, 2028],
  "jefferson": [2022, 2025, 2028],
  "bloom": [2021, 2024, 2027],
  "calumet": [2021, 2024, 2027],
  "thornton": [2021, 2024, 2027],
  "rich": [2021, 2024, 2027],
  "chicago": [2021, 2024, 2027],
  "lake view": [2023, 2026, 2029],
  "north chicago": [2023, 2026, 2029],
};

export interface IncomeApproachResult {
  marketRentPerUnit: number;
  totalUnits: number;
  grossPotentialIncome: number;
  vacancyRate: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  expenseRatio: number;
  netOperatingIncome: number;
  capRate: number;
  incomeValue: number;
  rentalCompsUsed: number;
}


export interface AdjustmentGridEntry {
  compAddress: string;
  salePrice: number;
  pricePerUnit?: number;
  pricePerSF?: number;
  adjustments: Record<string, number>;
  netAdjustmentPct: number;
  adjustedValue: number;
}

export interface AppraisalAnalysis {
  marketValueEstimate: number;
  assessmentGap: number;
  assessmentGapPercent: number;
  impliedMarketValueByAssessor?: number;
  assessmentLevel?: number;
  appealStrengthScore: number;
  appealStrengthFactors: string[];
  recommendedApproach: "poa" | "pro-se" | "not-recommended";
  executiveSummary: string;
  valuationJustification: string;
  potentialSavings: number;
  nextSteps: string[];
  conditionAdjustment?: number;
  compSelectionRationale?: string;
  marketWeaknessFactors?: string[];
  incomeApproach?: IncomeApproachResult;
  adjustmentGrid?: AdjustmentGridEntry[];
  cookCountyClassCode?: string;
  triennialReassessmentYear?: number | null;
  isReassessmentYear?: boolean;
  pricePerUnit?: number;
  pricePerUnitComps?: number;
}

// ─── ASSESSMENT LEVEL LOOKUP ──────────────────────────────────────────────────
function getAssessmentLevel(county?: string, state?: string): number {
  if (!county && !state) return ASSESSMENT_LEVELS.default;
  const countyKey = county?.toLowerCase() || "";
  const stateKey = state?.toLowerCase() || "";
  if (countyKey.includes("cook")) return ASSESSMENT_LEVELS["cook county"];
  if (stateKey === "il" || stateKey === "illinois") return ASSESSMENT_LEVELS["illinois"];
  if (stateKey === "ca" || stateKey === "california") return ASSESSMENT_LEVELS["california"];
  return ASSESSMENT_LEVELS.default;
}

// ─── COOK COUNTY CLASS CODE LOOKUP ───────────────────────────────────────────
function getCookCountyClassCode(propertyType: string, unitCount?: number): string | undefined {
  const type = propertyType.toLowerCase();
  if (unitCount) {
    if (unitCount === 1) return "Class 2-03";
    if (unitCount === 2) return "Class 2-11";
    if (unitCount >= 3 && unitCount <= 6) return "Class 2-12";
    if (unitCount > 6) return "Class 3-11";
  }
  for (const [key, code] of Object.entries(COOK_COUNTY_CLASSES)) {
    if (type.includes(key)) return code;
  }
  return undefined;
}

// ─── TRIENNIAL REASSESSMENT CHECK ────────────────────────────────────────────
function checkTriennialReassessment(county?: string, city?: string): { year: number | null; isReassessmentYear: boolean } {
  if (!county?.toLowerCase().includes("cook")) return { year: null, isReassessmentYear: false };
  const currentYear = new Date().getFullYear();
  const cityKey = city?.toLowerCase() || "chicago";
  for (const [township, years] of Object.entries(COOK_COUNTY_TRIENNIAL)) {
    if (cityKey.includes(township) || township.includes(cityKey)) {
      const nextYear = years.find(y => y >= currentYear) || years[years.length - 1];
      return { year: nextYear, isReassessmentYear: years.includes(currentYear) };
    }
  }
  return {
    year: COOK_COUNTY_TRIENNIAL["chicago"].find(y => y >= currentYear) || null,
    isReassessmentYear: COOK_COUNTY_TRIENNIAL["chicago"].includes(currentYear),
  };
}

// ─── INCOME APPROACH (MULTIFAMILY) ───────────────────────────────────────────
function computeIncomeApproach(
  propertyData: PropertyData,
  propertyType: string
): IncomeApproachResult | undefined {
  const isMultifamily = ["multifamily", "apartment", "duplex", "2-flat", "3-flat", "4-flat", "2 unit", "3 unit", "4 unit"].some(t =>
    propertyType.toLowerCase().includes(t)
  );
  if (!isMultifamily) return undefined;

  const totalUnits = 2; // Default to duplex if units not available
  const rentalComps = propertyData.rentalComps || [];

  let marketRentPerUnit = 0;
  if (rentalComps.length > 0) {
    marketRentPerUnit = rentalComps.reduce((s, c) => s + (c.monthlyRent || 0), 0) / rentalComps.length;
  } else if (propertyData.marketValue) {
    marketRentPerUnit = (propertyData.marketValue / totalUnits) * 0.007;
  } else {
    return undefined;
  }

  const vacancyRate = 0.05;
  const grossPotentialIncome = marketRentPerUnit * totalUnits * 12;
  const vacancyLoss = grossPotentialIncome * vacancyRate;
  const effectiveGrossIncome = grossPotentialIncome - vacancyLoss;

  const expenseRatio = totalUnits <= 4 ? 0.165 : 0.20;
  const operatingExpenses = effectiveGrossIncome * expenseRatio;
  const netOperatingIncome = effectiveGrossIncome - operatingExpenses;

  const capRate = 0.085;
  const incomeValue = Math.round(netOperatingIncome / capRate);

  return {
    marketRentPerUnit: Math.round(marketRentPerUnit),
    totalUnits,
    grossPotentialIncome: Math.round(grossPotentialIncome),
    vacancyRate,
    vacancyLoss: Math.round(vacancyLoss),
    effectiveGrossIncome: Math.round(effectiveGrossIncome),
    operatingExpenses: Math.round(operatingExpenses),
    expenseRatio,
    netOperatingIncome: Math.round(netOperatingIncome),
    capRate,
    incomeValue,
    rentalCompsUsed: rentalComps.length,
  };
}

// ─── ADJUSTMENT GRID (QUANTITATIVE) ──────────────────────────────────────────
function buildAdjustmentGrid(
  comps: ComparableSale[],
  propertyData: PropertyData,
  propertyType: string,
  totalUnits?: number
): AdjustmentGridEntry[] {
  if (!comps || comps.length === 0) return [];
  const units = totalUnits || 1;

  return comps.slice(0, 5).map(comp => {
    const adjustments: Record<string, number> = {};

    if (propertyData.squareFeet && comp.squareFeet) {
      const sizeRatio = comp.squareFeet / propertyData.squareFeet;
      if (sizeRatio > 1.2) adjustments["Size/Configuration"] = -Math.round((sizeRatio - 1) * 5) * 2;
      else if (sizeRatio < 0.8) adjustments["Size/Configuration"] = Math.round((1 - sizeRatio) * 5) * 2;
    }

    if (propertyData.yearBuilt && comp.yearBuilt) {
      const subjectAge = new Date().getFullYear() - propertyData.yearBuilt;
      const compAge = new Date().getFullYear() - comp.yearBuilt;
      const ageDiff = compAge - subjectAge;
      if (ageDiff > 10) adjustments["Quality/Condition"] = -5;
      else if (ageDiff < -10) adjustments["Quality/Condition"] = 5;
    }

    if (propertyData.bedrooms && comp.bedrooms) {
      const bdDiff = comp.bedrooms - propertyData.bedrooms;
      if (bdDiff > 0) adjustments["Unit Mix"] = -7 * bdDiff;
      else if (bdDiff < 0) adjustments["Unit Mix"] = 7 * Math.abs(bdDiff);
    }

    const netAdjustmentPct = Object.values(adjustments).reduce((s, v) => s + v, 0);
    const adjustedValue = Math.round(comp.salePrice * (1 + netAdjustmentPct / 100));

    const entry: AdjustmentGridEntry = {
      compAddress: comp.address,
      salePrice: comp.salePrice,
      adjustments,
      netAdjustmentPct,
      adjustedValue,
    };

    if (units > 1) {
      entry.pricePerUnit = Math.round(comp.salePrice / units);
    } else if (comp.squareFeet) {
      entry.pricePerSF = Math.round(comp.salePrice / comp.squareFeet);
    }

    return entry;
  });
}

// ─── COMP SELECTION (ADVOCACY-FOCUSED) ───────────────────────────────────────
function selectAdvocacyComps(
  comps: ComparableSale[],
  subjectData: PropertyData
): { bestComps: ComparableSale[]; rationale: string; avgCompPrice: number } {
  if (!comps || comps.length === 0) {
    return { bestComps: [], rationale: "No comparable sales data available.", avgCompPrice: 0 };
  }

  const scored = comps.map((comp) => {
    let advocacyScore = comp.similarity || 50;
    if (subjectData.assessedValue && comp.salePrice < subjectData.assessedValue) {
      const pctBelow = ((subjectData.assessedValue - comp.salePrice) / subjectData.assessedValue) * 100;
      advocacyScore += Math.min(25, pctBelow);
    }
    if (comp.saleDate) {
      const daysAgo = Math.floor((Date.now() - new Date(comp.saleDate).getTime()) / 86400000);
      if (daysAgo <= 30) advocacyScore += 15;
      else if (daysAgo <= 90) advocacyScore += 10;
      else if (daysAgo <= 180) advocacyScore += 5;
    }
    if (subjectData.squareFeet && comp.squareFeet) {
      const sizeRatio = comp.squareFeet / subjectData.squareFeet;
      if (sizeRatio >= 0.8 && sizeRatio <= 1.2) advocacyScore += 10;
    }
    return { comp, advocacyScore };
  });

  scored.sort((a, b) => b.advocacyScore - a.advocacyScore);
  const bestComps = scored.slice(0, 8).map((s) => s.comp);
  const avgCompPrice = bestComps.reduce((s, c) => s + c.salePrice, 0) / bestComps.length;
  const belowCount = bestComps.filter((c) => c.salePrice < (subjectData.assessedValue || Infinity)).length;

  return {
    bestComps,
    rationale: `Selected ${bestComps.length} comparable sales ranked by advocacy value. ${belowCount} sold below the assessed value, providing direct evidence of over-assessment.`,
    avgCompPrice,
  };
}

// ─── MARKET WEAKNESS IDENTIFICATION ──────────────────────────────────────────
function identifyMarketWeakness(comps: ComparableSale[], subjectData: PropertyData): string[] {
  const factors: string[] = [];
  if (comps.length === 0) return factors;

  const avgDOM = comps.filter((c) => c.daysOnMarket).reduce((s, c) => s + (c.daysOnMarket || 0), 0) / comps.filter((c) => c.daysOnMarket).length;
  if (avgDOM > 60) factors.push(`High average days on market (${Math.round(avgDOM)} days) indicates weak buyer demand`);
  if (avgDOM > 90) factors.push(`Extended marketing times (${Math.round(avgDOM)} days avg) suggest market oversupply`);

  const prices = comps.map((c) => c.salePrice).sort((a, b) => a - b);
  if (prices.length >= 3) {
    const recentComps = comps.filter((c) => c.saleDate && new Date(c.saleDate) > new Date(Date.now() - 180 * 86400000));
    const olderComps = comps.filter((c) => c.saleDate && new Date(c.saleDate) <= new Date(Date.now() - 180 * 86400000));
    if (recentComps.length > 0 && olderComps.length > 0) {
      const recentAvg = recentComps.reduce((s, c) => s + c.salePrice, 0) / recentComps.length;
      const olderAvg = olderComps.reduce((s, c) => s + c.salePrice, 0) / olderComps.length;
      if (recentAvg < olderAvg * 0.95) factors.push(`Market prices declining: recent sales avg $${Math.round(recentAvg).toLocaleString()} vs older sales avg $${Math.round(olderAvg).toLocaleString()} (-${Math.round((1 - recentAvg / olderAvg) * 100)}%)`);
    }
  }

    const distressedCount = comps.filter((c) => c.address?.toLowerCase().includes("foreclos")).length;
  if (distressedCount > 0) factors.push(`${distressedCount} distressed/foreclosure sale(s) in the comparable set — evidence of market weakness`);

  if (subjectData.yearBuilt && new Date().getFullYear() - subjectData.yearBuilt > 40) {
    factors.push(`Property age (${new Date().getFullYear() - subjectData.yearBuilt} years) warrants significant physical depreciation adjustment`);
  }

  return factors;
}

// ─── METHODOLOGY GUIDANCE BY PROPERTY TYPE ───────────────────────────────────
function getMethodologyGuidance(propertyType: string): string {
  switch (propertyType.toLowerCase()) {
    case "residential":
    case "single family":
    case "sfr":
      return `For this residential property, the Sales Comparison Approach is PRIMARY. Select 5 comparable sales within 1 mile, same property type, sold within 24 months. Apply condition adjustments aggressively — assessors cannot see interior condition. The Cost Approach may be used to establish a ceiling value. Include Highest and Best Use analysis (as improved: continued residential use).`;
    case "multifamily":
    case "apartment":
    case "duplex":
    case "2-flat":
    case "3-flat":
    case "4-flat":
    case "2 unit":
    case "3 unit":
    case "4 unit":
      return `For this multifamily property, BOTH the Sales Comparison Approach AND Income Capitalization Approach are REQUIRED. Unit of comparison: Price Per Unit (not $/SF). For the Income Approach: (1) establish market rent from rental comps, (2) apply 5% vacancy/collection loss, (3) deduct operating expenses (~16-17% of EGI for small Chicago multifamily), (4) derive NOI, (5) apply 8.50% cap rate. Reconcile both approaches with SCA as primary. Apply condition adjustments aggressively for any deferred maintenance.`;
    case "commercial":
      return `For this commercial property, the Income Approach is PRIMARY. Use conservative income projections, apply vacancy and collection loss factors generously, and use a higher capitalization rate to reflect market uncertainty. The Sales Comparison Approach should include any distressed commercial sales.`;
    case "industrial":
      return `For this industrial property, the Cost Approach is often most favorable — emphasize physical depreciation, functional obsolescence, and external obsolescence. The Income Approach should use conservative lease rates and higher vacancy assumptions.`;
    case "land":
    case "agricultural":
      return `For this land/agricultural property, the Sales Comparison Approach is PRIMARY. Focus on comparable land sales at lower per-acre prices. Consider environmental constraints, access limitations, and development restrictions.`;
    default:
      return `Use the Sales Comparison Approach as the primary method. Select comparable sales that sold at lower prices and have similar characteristics. Apply condition and depreciation adjustments aggressively where supported by evidence.`;
  }
}

// ─── MAIN ANALYSIS FUNCTION ───────────────────────────────────────────────────
export async function analyzeProperty(
  propertyData: PropertyData,
  propertyType: string = "residential",
  serperInsights?: SerperInsight[]
): Promise<AppraisalAnalysis> {
  try {
    // Pre-computations
    const assessmentLevel = getAssessmentLevel(propertyData.county, propertyData.state);
    const impliedMarketValueByAssessor = propertyData.assessedValue
      ? Math.round(propertyData.assessedValue / assessmentLevel)
      : undefined;

    const isCookCounty = propertyData.county?.toLowerCase().includes("cook");
    const cookCountyClassCode = isCookCounty
      ? getCookCountyClassCode(propertyType, undefined)
      : undefined;
    const { year: triennialYear, isReassessmentYear } = checkTriennialReassessment(
      propertyData.county,
      propertyData.city
    );

    const { bestComps, rationale, avgCompPrice } = selectAdvocacyComps(
      propertyData.comparableSales || [],
      propertyData
    );

    const marketWeakness = identifyMarketWeakness(
      propertyData.comparableSales || [],
      propertyData
    );

    const incomeApproach = computeIncomeApproach(propertyData, propertyType);
    const adjustmentGrid = buildAdjustmentGrid(bestComps, propertyData, propertyType, undefined);

    const isMultifamily = propertyType.toLowerCase().includes("multifamily") || propertyType.toLowerCase().includes("apartment");
    const pricePerUnit = isMultifamily && propertyData.marketValue
      ? Math.round(propertyData.marketValue / 2)
      : undefined;
    const pricePerUnitComps = isMultifamily && avgCompPrice
      ? Math.round(avgCompPrice / 2)
      : undefined;

    const methodologyGuidance = getMethodologyGuidance(propertyType);

    // Build LLM data summary
    const dataSummary = `
SUBJECT PROPERTY:
Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zipCode || ""}
Property Type: ${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
County: ${propertyData.county || "Unknown"}
Parcel: ${propertyData.parcelNumber || "Unknown"}
Zoning: ${propertyData.zoning || "Unknown"}
${cookCountyClassCode ? `Cook County Property Class: ${cookCountyClassCode}` : ""}
${triennialYear ? `Cook County Triennial Reassessment: Next year = ${triennialYear}${isReassessmentYear ? " ← THIS IS A REASSESSMENT YEAR (HIGH URGENCY)" : ""}` : ""}

CURRENT ASSESSMENT:
- Assessed Value: $${propertyData.assessedValue?.toLocaleString() || "Unknown"}
- Assessment Level: ${(assessmentLevel * 100).toFixed(0)}% of market value${assessmentLevel < 1 ? ` (${propertyData.county || "this county"} statutory level)` : ""}
- Implied Market Value by Assessor: $${impliedMarketValueByAssessor?.toLocaleString() || "Unknown"}${assessmentLevel < 1 ? ` ← THIS IS THE REAL COMPARISON FIGURE (assessed value ÷ ${assessmentLevel})` : ""}
- Annual Property Tax: $${propertyData.propertyTax?.toLocaleString() || "Unknown"}

MARKET DATA:
- Estimated Market Value (AVM): $${propertyData.marketValue?.toLocaleString() || "Unknown"}
- Last Sale Price: $${propertyData.lastSalePrice?.toLocaleString() || "Unknown"} (${propertyData.lastSaleDate || "Unknown"})


PHYSICAL CHARACTERISTICS:
- Square Feet: ${propertyData.squareFeet?.toLocaleString() || "Unknown"}
- Lot Size: ${propertyData.lotSize?.toLocaleString() || "Unknown"} sq ft
- Year Built: ${propertyData.yearBuilt || "Unknown"} (Age: ${propertyData.yearBuilt ? new Date().getFullYear() - propertyData.yearBuilt : "Unknown"} years)
- Bedrooms: ${propertyData.bedrooms || "Unknown"}
- Bathrooms: ${propertyData.bathrooms || "Unknown"}


COMPARABLE SALES ANALYSIS (${bestComps.length} selected from ${propertyData.comparableSales?.length || 0} available):
${rationale}
$${bestComps.slice(0, 8).map((comp, i) => `  ${i + 1}. ${comp.address}: $${comp.salePrice.toLocaleString()} | ${comp.squareFeet || "?"}sqft | ${comp.bedrooms || "?"}bd/${comp.bathrooms || "?"}ba | Built ${comp.yearBuilt || "?"} | Sold: ${comp.saleDate} | DOM: ${comp.daysOnMarket ?? "?"} | Similarity: ${comp.similarity}%`).join("\n") || "  None available"}
${avgCompPrice > 0 ? `\nAverage Comp Sale Price: $${Math.round(avgCompPrice).toLocaleString()}` : ""}

${adjustmentGrid.length > 0 ? `QUANTITATIVE ADJUSTMENT GRID:\n${adjustmentGrid.map(e => `  ${e.compAddress}: $${e.salePrice.toLocaleString()} → Net Adj: ${e.netAdjustmentPct > 0 ? "+" : ""}${e.netAdjustmentPct}% → Adjusted: $${e.adjustedValue.toLocaleString()}`).join("\n")}` : ""}

${incomeApproach ? `INCOME CAPITALIZATION APPROACH (MULTIFAMILY):
- Market Rent/Unit: $${incomeApproach.marketRentPerUnit.toLocaleString()}/month (from ${incomeApproach.rentalCompsUsed} rental comps)
- Total Units: ${incomeApproach.totalUnits}
- Gross Potential Income: $${incomeApproach.grossPotentialIncome.toLocaleString()}/year
- Vacancy & Collection Loss (${(incomeApproach.vacancyRate * 100).toFixed(0)}%): ($${incomeApproach.vacancyLoss.toLocaleString()})
- Effective Gross Income: $${incomeApproach.effectiveGrossIncome.toLocaleString()}
- Operating Expenses (${(incomeApproach.expenseRatio * 100).toFixed(1)}% of EGI): ($${incomeApproach.operatingExpenses.toLocaleString()})
- Net Operating Income: $${incomeApproach.netOperatingIncome.toLocaleString()}
- Capitalization Rate: ${(incomeApproach.capRate * 100).toFixed(2)}%
- INCOME APPROACH VALUE: $${incomeApproach.incomeValue.toLocaleString()}` : ""}

RENTAL COMPARABLES: ${propertyData.rentalComps?.length || 0} found
${propertyData.rentalComps?.slice(0, 5).map((comp) => `  - ${comp.address}: $${comp.monthlyRent}/month (${comp.bedrooms}bd/${comp.bathrooms}ba, ${comp.squareFeet}sqft)`).join("\n") || "  None available"}

MARKET WEAKNESS INDICATORS:
${marketWeakness.length > 0 ? marketWeakness.map((f) => `  - ${f}`).join("\n") : "  None identified from available data"}

METHODOLOGY GUIDANCE:
${methodologyGuidance}${serperInsights ? formatInsightsForLLM(serperInsights) : ""}
    `;

    // Get state-specific rules for LLM context
    const stateRules = getStateRules(propertyData.state || "IL");
    const stateContextLines = stateRules ? [
      `${stateRules.state.toUpperCase()} SPECIFIC RULES:`,
      `- Assessment level: ${(stateRules.assessmentLevel * 100).toFixed(0)}% of market value`,
      `- Primary appeal body: ${stateRules.primaryAppealBody}`,
      `- Appeal deadline: ${stateRules.typicalAppealDeadline}`,
      `- Key strategies:`,
      ...stateRules.keyStrategies.map(s => `  • ${s}`),
      stateRules.uspapNotes ? `- USPAP Notes: ${stateRules.uspapNotes}` : "",
      stateRules.multiunitStrategy ? `- Multifamily Strategy: ${stateRules.multiunitStrategy}` : "",
      stateRules.commercialStrategy ? `- Commercial Strategy: ${stateRules.commercialStrategy}` : "",
    ].filter(Boolean).join("\n") : "";

    // LLM System Prompt
    const systemPrompt = `You are an EXPERT PROPERTY APPRAISER and TAX APPEAL ADVOCATE with deep knowledge of nationwide assessment rules, USPAP standards, and multifamily valuation methodology. Your job is to produce a rigorous, data-backed analysis that presents the STRONGEST POSSIBLE CASE for a lower assessed value.

CORE PRINCIPLES:
1. ALWAYS ADVOCATE for the homeowner where the data supports it.
2. CRITICAL — ASSESSMENT LEVELS: Different states assess at different levels. ALWAYS calculate IMPLIED market value first: Assessed Value ÷ Assessment Level = Implied Market Value. THAT is what you compare to actual market value.
3. For MULTIFAMILY properties: use Price Per Unit as the primary unit of comparison, not $/SF. Run BOTH the Sales Comparison Approach AND the Income Capitalization Approach.
4. APPLY depreciation adjustments generously — physical deterioration, functional obsolescence, and external obsolescence all reduce value.
5. USE market weakness indicators (declining prices, high DOM, distressed sales) as evidence that the assessment is stale or inflated.
6. NEVER fabricate data. Every claim must be traceable to the provided data.
7. If the Income Approach value is provided, reconcile it with the Sales Comparison Approach value — weight SCA as primary for small multifamily (2-4 units), income as primary for larger buildings.

${stateContextLines}

OUTPUT REQUIREMENTS:
- marketValueEstimate: The lowest defensible market value based on the data
- assessmentGap: Difference between IMPLIED market value (assessed ÷ level) and your estimate
- appealStrengthScore: 0-100, be generous where data supports
- appealStrengthFactors: Specific, data-backed factors (cite actual prices, actual gaps)
- executiveSummary: Lead with the strongest argument — always reference the implied market value calculation
- valuationJustification: Explain which comps, what adjustments, and how you reconciled the approaches
- potentialSavings: Annual tax savings if assessment is reduced
- nextSteps: Actionable steps focused on building the strongest appeal case
- highestAndBestUse: Brief HBU conclusion (as improved: continued current use)
- marketingTimeEstimate: Estimated marketing time (e.g., "6-12 months")`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this property and produce your expert advocacy assessment:\n\n${dataSummary}\n\nRespond ONLY with valid JSON matching the required schema.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "appraisal_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              marketValueEstimate: { type: "number", description: "Lowest defensible market value" },
              assessmentGap: { type: "number", description: "Positive = over-assessed (implied MV - estimated MV)" },
              assessmentGapPercent: { type: "number", description: "Gap as percentage of implied assessed market value" },
              appealStrengthScore: { type: "number", description: "0-100 score" },
              appealStrengthFactors: { type: "array", items: { type: "string" } },
              recommendedApproach: { type: "string", enum: ["poa", "pro-se", "not-recommended"] },
              executiveSummary: { type: "string" },
              valuationJustification: { type: "string" },
              potentialSavings: { type: "number" },
              nextSteps: { type: "array", items: { type: "string" } },

            },
            required: [
              "marketValueEstimate", "assessmentGap", "assessmentGapPercent",
              "appealStrengthScore", "appealStrengthFactors", "recommendedApproach",
              "executiveSummary", "valuationJustification", "potentialSavings",
              "nextSteps",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content || typeof content !== "string") throw new Error("Invalid LLM response format");
    const llmResult = JSON.parse(content);

    // Merge LLM result with pre-computed data
    const analysis: AppraisalAnalysis = {
      ...llmResult,
      assessmentLevel,
      impliedMarketValueByAssessor,
      cookCountyClassCode,
      triennialReassessmentYear: triennialYear,
      isReassessmentYear,
      incomeApproach,
      adjustmentGrid: adjustmentGrid.length > 0 ? adjustmentGrid : undefined,
      pricePerUnit,
      pricePerUnitComps,
      conditionAdjustment: undefined,
      compSelectionRationale: rationale,
      marketWeaknessFactors: marketWeakness,
    };

    return analysis;
  } catch (err) {
    console.error("[appraisalAnalyzer] LLM failed, using fallback:", err);
    return computeFallbackAnalysis(propertyData, propertyType);
  }
}

// ─── FALLBACK (no LLM) ────────────────────────────────────────────────────────
function computeFallbackAnalysis(
  propertyData: PropertyData,
  propertyType: string
): AppraisalAnalysis {
  const assessmentLevel = getAssessmentLevel(propertyData.county, propertyData.state);
  const impliedMarketValueByAssessor = propertyData.assessedValue
    ? Math.round(propertyData.assessedValue / assessmentLevel)
    : undefined;

  const assessed = impliedMarketValueByAssessor || propertyData.assessedValue || 0;
  const comps = propertyData.comparableSales || [];

  let marketEstimate: number;
  const compsBelow = comps.filter((c) => c.salePrice < assessed);
  if (compsBelow.length >= 3) {
    marketEstimate = compsBelow.reduce((s, c) => s + c.salePrice, 0) / compsBelow.length;
  } else if (comps.length >= 3) {
    marketEstimate = comps.reduce((s, c) => s + c.salePrice, 0) / comps.length;
  } else if (propertyData.marketValue) {
    marketEstimate = propertyData.marketValue;
  } else {
    marketEstimate = assessed * 0.88;
  }

  let conditionAdj = 0;
  if (propertyData.yearBuilt) {
    const age = new Date().getFullYear() - propertyData.yearBuilt;
    if (age > 30) conditionAdj = marketEstimate * 0.08;
    else if (age > 20) conditionAdj = marketEstimate * 0.05;
    else if (age > 10) conditionAdj = marketEstimate * 0.02;
  }
  marketEstimate = Math.round(marketEstimate - conditionAdj);

  const gap = assessed - marketEstimate;
  const gapPercent = assessed > 0 ? (gap / assessed) * 100 : 0;
  const taxRate = propertyData.propertyTax && assessed > 0 ? propertyData.propertyTax / assessed : 0.012;

  const factors: string[] = [];
  if (gap > 0) factors.push(`Assessment implies market value of $${assessed.toLocaleString()}, exceeding estimated market value by $${gap.toLocaleString()} (${gapPercent.toFixed(1)}%)`);
  if (assessmentLevel < 1) factors.push(`Cook County 10% assessment level applied: assessed value $${propertyData.assessedValue?.toLocaleString()} ÷ 0.10 = implied market value $${assessed.toLocaleString()}`);
  if (compsBelow.length > 0) factors.push(`${compsBelow.length} comparable properties sold below the implied assessed market value`);
  if (conditionAdj > 0) factors.push(`Property age (${new Date().getFullYear() - (propertyData.yearBuilt || 2000)} years) warrants depreciation adjustment of $${Math.round(conditionAdj).toLocaleString()}`);
  if (factors.length === 0) factors.push("Limited data available — additional evidence may strengthen the case");

  const isCookCounty = propertyData.county?.toLowerCase().includes("cook");
  const cookCountyClassCode = isCookCounty ? getCookCountyClassCode(propertyType, undefined) : undefined;
  const { year: triennialYear, isReassessmentYear } = checkTriennialReassessment(propertyData.county, propertyData.city);
    const incomeApproach = computeIncomeApproach(propertyData, propertyType);
    const { bestComps, rationale } = selectAdvocacyComps(comps, propertyData);
    const adjustmentGrid = buildAdjustmentGrid(bestComps, propertyData, propertyType, undefined);

  return {
    marketValueEstimate: marketEstimate,
    assessmentGap: Math.max(0, gap),
    assessmentGapPercent: Math.max(0, gapPercent),
    assessmentLevel,
    impliedMarketValueByAssessor,
    appealStrengthScore: gapPercent > 15 ? 80 : gapPercent > 10 ? 70 : gapPercent > 5 ? 60 : gapPercent > 0 ? 50 : 30,
    appealStrengthFactors: factors,
    recommendedApproach: gapPercent > 5 ? "poa" : gapPercent > 0 ? "pro-se" : "not-recommended",
    executiveSummary: gap > 0
      ? `This property is over-assessed by $${gap.toLocaleString()} (${gapPercent.toFixed(1)}%).${assessmentLevel < 1 ? ` Note: Cook County assesses at ${(assessmentLevel * 100).toFixed(0)}% of market value — the assessor's implied market value is $${assessed.toLocaleString()}, far exceeding the estimated fair market value of $${marketEstimate.toLocaleString()}.` : ""}`
      : `Based on available data, the current assessment appears close to market value. Additional evidence may reveal grounds for appeal.`,
    valuationJustification: `Analysis based on ${comps.length} comparable sales. ${compsBelow.length > 0 ? `${compsBelow.length} comps sold below the implied assessed market value.` : ""} ${conditionAdj > 0 ? `Depreciation adjustment of $${Math.round(conditionAdj).toLocaleString()} applied for property age.` : ""}`,
    potentialSavings: Math.round(Math.max(0, gap) * taxRate),
    nextSteps: [
      "Upload property photos showing any condition issues, damage, or deferred maintenance",
      "Review the comparable sales in your report and note any particularly similar to your property",
      "Gather your most recent tax assessment notice and property tax bill",
      gap > 0 ? "File your appeal before the county deadline — the data supports a strong case for reduction" : "Consider getting a professional inspection to document condition issues",
    ],
    conditionAdjustment: conditionAdj,
    compSelectionRationale: rationale,
    marketWeaknessFactors: identifyMarketWeakness(comps, propertyData),
    incomeApproach,
    adjustmentGrid: adjustmentGrid.length > 0 ? adjustmentGrid : undefined,
    cookCountyClassCode,
    triennialReassessmentYear: triennialYear,
    isReassessmentYear,
    pricePerUnit: propertyData.marketValue ? Math.round(propertyData.marketValue / 2) : undefined,
  };
}

export function calculatePotentialSavings(assessmentGap: number, taxRate: number = 0.012): number {
  return Math.round(Math.max(0, assessmentGap) * taxRate);
}
