import { invokeLLM } from "../_core/llm";
import { analyzeWithClaude, isClaudeAvailable } from "../_core/claude";
import { hashLLMInput, withLLMCache } from "../_core/lcache";
import type { PropertyData } from "./propertyDataAggregator";

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

// Stable system prompt — prompt-cached by Claude across all analysis calls.
// Exported so batchProcessor can reuse it for the Batch API requests.
export const APPRAISAL_SYSTEM_PROMPT_EXPORT =
  "You are an independent valuation analyst preparing supporting analysis for a property-tax appeal. " +
  "You produce professional, evidence-based, USPAP-aligned narratives. You are not an attorney and " +
  "do not provide legal advice. You output valid JSON only. When the data fairly supports a fair " +
  "market value below the current assessment, you state that conclusion clearly and explain the " +
  "underlying evidence — but you never invent facts and never editorialize about the assessor.";

const APPRAISAL_SYSTEM_PROMPT = APPRAISAL_SYSTEM_PROMPT_EXPORT;

const APPRAISAL_JSON_SCHEMA = {
  type: "object",
  properties: {
    marketValueEstimate: { type: "number" },
    assessmentGap: { type: "number" },
    assessmentGapPercent: { type: "number" },
    appealStrengthScore: { type: "number" },
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
    "executiveSummary", "valuationJustification", "potentialSavings", "nextSteps",
  ],
  additionalProperties: false,
};

/**
 * Analyze property data and generate appraisal assessment
 * Uses LLM to synthesize multi-source data into coherent analysis
 */
export async function analyzeProperty(propertyData: PropertyData, propertyType: string = "residential"): Promise<AppraisalAnalysis> {
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
${methodologyGuidance}${photoAnalysis ? `

## GEMINI PHOTO ANALYSIS (Condition Evidence)
Condition Score: ${photoAnalysis.conditionScore}/5
Condition Notes: ${photoAnalysis.conditionNotes}
Defects Identified: ${photoAnalysis.defectsFound.length > 0 ? photoAnalysis.defectsFound.join("; ") : "None"}
Estimated Cost-to-Cure: $${photoAnalysis.costToCureEstimate.toLocaleString()}
Appeal Impact: ${photoAnalysis.appealImpact}` : ""}${researchInsights ? formatInsightsForLLM(researchInsights) : ""}
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

Respond ONLY with valid JSON matching this schema:
${JSON.stringify(APPRAISAL_JSON_SCHEMA, null, 2)}`;

    // Cache key derived from the property inputs only. Identical
    // (propertyData, propertyType) yields the same key, so admin
    // retriggers and pipeline retries skip the LLM round-trip.
    // 24h TTL aligns with the report-generation SLA window.
    const source = isClaudeAvailable() ? "claude-opus-4-7" : "forge-gemini-2.5-flash";
    const cacheKey = `llm:appraisal:${source}:${hashLLMInput([propertyData, propertyType])}`;

    const analysis = await withLLMCache<AppraisalAnalysis>(cacheKey, source, 24 * 3600, async () => {
      let rawJson: string;

      if (isClaudeAvailable()) {
        // Claude Opus 4.7 with adaptive thinking + xhigh effort + prompt caching.
        // The stable system prompt is cached across calls, cutting repeat-call
        // token costs by ~90%. Adaptive thinking lets Claude reason through
        // comparable-sales weighting before committing to the JSON output.
        rawJson = await analyzeWithClaude({
          systemPrompt: APPRAISAL_SYSTEM_PROMPT,
          userContent: prompt,
          maxTokens: 8192,
          effort: "xhigh",
        });
      } else {
        // Forge / Gemini fallback — used when ANTHROPIC_API_KEY is not set.
        const response = await invokeLLM({
          messages: [
            { role: "system", content: APPRAISAL_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "appraisal_analysis", strict: true, schema: APPRAISAL_JSON_SCHEMA },
          },
        });
        const content = response.choices[0]?.message.content;
        if (!content || typeof content !== "string") {
          throw new Error("Invalid LLM response format");
        }
        rawJson = content;
      }

      // Strip any markdown fences Claude might emit before the JSON object
      const jsonStart = rawJson.indexOf("{");
      const jsonEnd = rawJson.lastIndexOf("}");
      const cleanJson = jsonStart >= 0 && jsonEnd > jsonStart ? rawJson.slice(jsonStart, jsonEnd + 1) : rawJson;

      const parsed = JSON.parse(cleanJson) as AppraisalAnalysis;

      // Validate response — throw before caching so we never store a partial.
      if (
        !parsed.marketValueEstimate ||
        !parsed.appealStrengthScore ||
        !parsed.recommendedApproach ||
        !parsed.executiveSummary
      ) {
        throw new Error("Incomplete analysis response");
      }

      return parsed;
    });

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
