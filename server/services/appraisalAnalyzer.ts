import { invokeLLM } from "../_core/llm";
import type { PropertyData, ComparableSale } from "./propertyDataAggregator";
import type { SerperInsight } from "./serperSearch";
import { formatInsightsForLLM } from "./serperSearch";

export interface AppraisalAnalysis {
  marketValueEstimate: number;
  assessmentGap: number;
  assessmentGapPercent: number;
  appealStrengthScore: number; // 0-100
  appealStrengthFactors: string[];
  recommendedApproach: "poa" | "pro-se" | "not-recommended";
  executiveSummary: string;
  valuationJustification: string;
  potentialSavings: number;
  nextSteps: string[];
  /** New fields for enhanced advocacy */
  conditionAdjustment?: number;
  compSelectionRationale?: string;
  marketWeaknessFactors?: string[];
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * EXPERT APPRAISER ANALYSIS ENGINE
 * ────────────────────────────────────────────────────────────────────────────
 * Philosophy: We are the homeowner's advocate. Where the data supports a
 * lower value, we present it aggressively. Where the data is ambiguous, we
 * interpret it in the homeowner's favor. Where the data clearly shows the
 * assessment is fair, we say so honestly — but we still look for angles.
 *
 * Key principles:
 * 1. SELECT comps that favor the homeowner (lower-priced, similar condition)
 * 2. WEIGHT condition/damage evidence heavily (assessors can't see inside)
 * 3. USE distressed sales and market weakness as evidence
 * 4. TAILOR methodology by property type (residential vs commercial vs land)
 * 5. ALWAYS present the strongest possible case the data supports
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * Pre-process comparable sales to select the most favorable for the homeowner.
 * An expert appraiser would choose comps that:
 * - Are geographically close
 * - Have similar physical characteristics
 * - Sold at LOWER prices (favoring the homeowner's position)
 * - Include distressed/foreclosure sales as evidence of market weakness
 */
function selectAdvocacyComps(
  comps: ComparableSale[],
  subjectData: PropertyData
): { bestComps: ComparableSale[]; rationale: string; avgCompPrice: number } {
  if (!comps || comps.length === 0) {
    return { bestComps: [], rationale: "No comparable sales data available.", avgCompPrice: 0 };
  }

  // Score each comp for advocacy value (lower price + high similarity = best for homeowner)
  const scored = comps.map((comp) => {
    let advocacyScore = comp.similarity || 50;

    // Favor lower-priced comps (they support a lower assessed value)
    if (subjectData.assessedValue && comp.salePrice < subjectData.assessedValue) {
      const pctBelow = ((subjectData.assessedValue - comp.salePrice) / subjectData.assessedValue) * 100;
      advocacyScore += Math.min(25, pctBelow); // Up to +25 for being below assessed
    }

    // Favor recent sales (more relevant to current market)
    if (comp.saleDate) {
      const daysAgo = Math.floor((Date.now() - new Date(comp.saleDate).getTime()) / 86400000);
      if (daysAgo <= 30) advocacyScore += 15;
      else if (daysAgo <= 90) advocacyScore += 10;
      else if (daysAgo <= 180) advocacyScore += 5;
    }

    // Favor similar size (within 20% of subject)
    if (subjectData.squareFeet && comp.squareFeet) {
      const sizeRatio = comp.squareFeet / subjectData.squareFeet;
      if (sizeRatio >= 0.8 && sizeRatio <= 1.2) advocacyScore += 10;
    }

    // Favor similar bedroom/bathroom count
    if (subjectData.bedrooms && comp.bedrooms && Math.abs(subjectData.bedrooms - comp.bedrooms) <= 1) {
      advocacyScore += 5;
    }

    return { comp, advocacyScore };
  });

  // Sort by advocacy score (best for homeowner first)
  scored.sort((a, b) => b.advocacyScore - a.advocacyScore);

  // Take top 5-8 comps that build the strongest case
  const bestComps = scored.slice(0, 8).map((s) => s.comp);
  const avgCompPrice = bestComps.reduce((sum, c) => sum + c.salePrice, 0) / bestComps.length;

  // Count how many sold below assessed value
  const belowAssessed = bestComps.filter(
    (c) => subjectData.assessedValue && c.salePrice < subjectData.assessedValue
  ).length;

  const rationale = `Selected ${bestComps.length} comparable sales from ${comps.length} available. ${belowAssessed} of ${bestComps.length} selected comps sold below the subject's assessed value of $${subjectData.assessedValue?.toLocaleString() || "N/A"}. Average comp sale price: $${Math.round(avgCompPrice).toLocaleString()}.`;

  return { bestComps, rationale, avgCompPrice };
}

/**
 * Identify market weakness factors that support a lower valuation.
 * These are legitimate arguments an expert appraiser would use.
 */
function identifyMarketWeakness(
  comps: ComparableSale[],
  propertyData: PropertyData
): string[] {
  const factors: string[] = [];

  if (comps.length > 0) {
    // Check for declining prices in recent comps
    const recentComps = comps.filter((c) => {
      if (!c.saleDate) return false;
      const daysAgo = Math.floor((Date.now() - new Date(c.saleDate).getTime()) / 86400000);
      return daysAgo <= 180;
    });

    if (recentComps.length >= 3) {
      const avgRecentPrice = recentComps.reduce((s, c) => s + c.salePrice, 0) / recentComps.length;
      const avgAllPrice = comps.reduce((s, c) => s + c.salePrice, 0) / comps.length;
      if (avgRecentPrice < avgAllPrice * 0.95) {
        factors.push(`Recent comparable sales show a declining price trend (recent avg: $${Math.round(avgRecentPrice).toLocaleString()} vs overall avg: $${Math.round(avgAllPrice).toLocaleString()})`);
      }
    }

    // Check for high days on market (indicates weak demand)
    const compsWithDOM = comps.filter((c) => c.daysOnMarket !== undefined);
    if (compsWithDOM.length >= 3) {
      const avgDOM = compsWithDOM.reduce((s, c) => s + (c.daysOnMarket || 0), 0) / compsWithDOM.length;
      if (avgDOM > 45) {
        factors.push(`Average days on market for comparable properties is ${Math.round(avgDOM)} days, indicating reduced buyer demand in this area`);
      }
    }

    // Check for price reductions (comps selling below list)
    const belowAssessed = comps.filter(
      (c) => propertyData.assessedValue && c.salePrice < propertyData.assessedValue
    );
    if (belowAssessed.length > comps.length * 0.5) {
      factors.push(`${belowAssessed.length} of ${comps.length} comparable properties sold below the subject's assessed value, suggesting systematic over-assessment in this area`);
    }
  }

  // Check for age-related depreciation
  if (propertyData.yearBuilt) {
    const age = new Date().getFullYear() - propertyData.yearBuilt;
    if (age > 30) {
      factors.push(`Property is ${age} years old — physical depreciation, functional obsolescence, and deferred maintenance should be reflected in the assessed value`);
    } else if (age > 15) {
      factors.push(`Property is ${age} years old — normal physical depreciation should reduce the assessed value from replacement cost`);
    }
  }

  // Check if assessed value exceeds market value
  if (propertyData.assessedValue && propertyData.marketValue) {
    const overAssessmentPct = ((propertyData.assessedValue - propertyData.marketValue) / propertyData.assessedValue) * 100;
    if (overAssessmentPct > 5) {
      factors.push(`Assessed value exceeds estimated market value by ${overAssessmentPct.toFixed(1)}%, indicating the assessment does not reflect current market conditions`);
    }
  }

  return factors;
}

/**
 * Determine the best valuation methodology based on property type.
 * An expert appraiser selects the approach most favorable to the homeowner.
 */
function getMethodologyGuidance(propertyType: string): string {
  switch (propertyType.toLowerCase()) {
    case "residential":
      return `For this residential property, the Sales Comparison Approach is the PRIMARY and most defensible method. Focus on the most similar recent sales that sold at LOWER prices. The Cost Approach (replacement cost minus depreciation) should be used as a secondary check — emphasize all forms of depreciation (physical, functional, external). If the property shows ANY condition issues, apply aggressive depreciation adjustments. The Income Approach is generally not applicable for owner-occupied residential properties unless rental comps suggest a lower value.`;

    case "multi-family":
      return `For this multi-family property, use BOTH the Income Approach and Sales Comparison Approach — whichever produces the LOWER value should be emphasized. For the Income Approach, use conservative rent estimates and apply a higher capitalization rate to reflect investment risk. For the Sales Comparison Approach, include distressed multi-family sales if available. Apply condition adjustments aggressively for any deferred maintenance.`;

    case "commercial":
      return `For this commercial property, the Income Approach is PRIMARY. Use conservative income projections, apply vacancy and collection loss factors generously, and use a higher capitalization rate to reflect market uncertainty. The Sales Comparison Approach should include any distressed commercial sales. The Cost Approach should emphasize functional and external obsolescence (changing retail patterns, remote work trends, etc.).`;

    case "industrial":
      return `For this industrial property, the Cost Approach is often most favorable — emphasize physical depreciation, functional obsolescence (outdated loading docks, ceiling heights, power capacity), and external obsolescence (environmental regulations, changing logistics patterns). The Income Approach should use conservative lease rates and higher vacancy assumptions.`;

    case "land":
    case "agricultural":
      return `For this land/agricultural property, the Sales Comparison Approach is PRIMARY. Focus on comparable land sales that sold at lower per-acre prices. Consider environmental constraints, access limitations, topography issues, and any development restrictions that reduce value. Agricultural land should be valued based on its agricultural productivity, not speculative development potential.`;

    default:
      return `Use the Sales Comparison Approach as the primary method. Select comparable sales that sold at lower prices and have similar characteristics. Apply condition and depreciation adjustments aggressively where supported by evidence.`;
  }
}

/**
 * Analyze property data and generate an expert, user-advocating appraisal assessment.
 * Uses LLM to synthesize multi-source data with an advocacy lens.
 */
export async function analyzeProperty(
  propertyData: PropertyData,
  propertyType: string = "residential",
  serperInsights?: SerperInsight[]
): Promise<AppraisalAnalysis> {
  try {
    // Step 1: Select the most favorable comparable sales
    const { bestComps, rationale, avgCompPrice } = selectAdvocacyComps(
      propertyData.comparableSales || [],
      propertyData
    );

    // Step 2: Identify market weakness factors
    const marketWeakness = identifyMarketWeakness(
      propertyData.comparableSales || [],
      propertyData
    );

    // Step 3: Get property-type-specific methodology guidance
    const methodologyGuidance = getMethodologyGuidance(propertyType);

    // Build comprehensive data summary with advocacy framing
    const dataSummary = `
SUBJECT PROPERTY:
Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zipCode || ""}
Property Type: ${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
County: ${propertyData.county || "Unknown"}
Parcel: ${propertyData.parcelNumber || "Unknown"}
Zoning: ${propertyData.zoning || "Unknown"}

CURRENT ASSESSMENT:
- Assessed Value: $${propertyData.assessedValue?.toLocaleString() || "Unknown"}
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
${bestComps.slice(0, 8).map((comp, i) => `  ${i + 1}. ${comp.address}: $${comp.salePrice.toLocaleString()} | ${comp.squareFeet || "?"} sqft | ${comp.bedrooms || "?"}bd/${comp.bathrooms || "?"}ba | Built ${comp.yearBuilt || "?"} | Sold: ${comp.saleDate} | DOM: ${comp.daysOnMarket ?? "?"} days | Similarity: ${comp.similarity}% | Source: ${comp.source}`).join("\n") || "  None available"}
${avgCompPrice > 0 ? `\nAverage Comp Sale Price: $${Math.round(avgCompPrice).toLocaleString()}` : ""}

RENTAL COMPARABLES: ${propertyData.rentalComps?.length || 0} found
${propertyData.rentalComps?.slice(0, 3).map((comp) => `  - ${comp.address}: $${comp.monthlyRent}/month (${comp.bedrooms}bd/${comp.bathrooms}ba, ${comp.squareFeet} sqft)`).join("\n") || "  None available"}

MARKET WEAKNESS INDICATORS:
${marketWeakness.length > 0 ? marketWeakness.map((f) => `  - ${f}`).join("\n") : "  None identified from available data"}

METHODOLOGY GUIDANCE:
${methodologyGuidance}${serperInsights ? formatInsightsForLLM(serperInsights) : ""}
    `;

    const systemPrompt = `You are an EXPERT PROPERTY APPRAISER working as an advocate for the homeowner. Your job is to produce a rigorous, data-backed analysis that presents the STRONGEST POSSIBLE CASE for a lower assessed value.

CORE PRINCIPLES:
1. ALWAYS ADVOCATE for the homeowner where the data supports it. If comparable sales show lower values, emphasize them. If the property has condition issues, quantify the impact aggressively.
2. SELECT the valuation methodology that produces the LOWEST defensible value for this property type.
3. WEIGHT comparable sales that sold BELOW the assessed value more heavily — they are direct evidence of over-assessment.
4. APPLY depreciation adjustments generously — physical deterioration, functional obsolescence, and external obsolescence all reduce value.
5. USE market weakness indicators (declining prices, high DOM, distressed sales) as evidence that the assessment is stale or inflated.
6. BE HONEST — if the data clearly shows the assessment is fair, say so. But always look for legitimate angles to argue for a lower value.
7. NEVER fabricate data. Every claim must be traceable to the provided data.

VALUATION APPROACH:
- Start with the comparable sales data. The average comp price is your anchor.
- If the assessed value exceeds the average comp price, that IS the case for over-assessment.
- Apply condition adjustments downward for any property over 15 years old.
- If market weakness indicators exist, use them to argue the assessment doesn't reflect current conditions.
- Your marketValueEstimate should be the LOWEST defensible value the data supports — not the average, not the high end.

OUTPUT REQUIREMENTS:
- marketValueEstimate: The lowest defensible market value based on the data (not inflated)
- assessmentGap: Positive number = over-assessed (good for homeowner)
- appealStrengthScore: 0-100, be generous where the data supports it
- appealStrengthFactors: Specific, data-backed factors (cite actual comp prices, actual gaps)
- executiveSummary: Lead with the strongest argument for over-assessment
- valuationJustification: Explain which comps you relied on and why they support a lower value
- potentialSavings: Annual tax savings if assessment is reduced to your estimate
- nextSteps: Actionable steps focused on building the strongest appeal case`;

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
              assessmentGap: { type: "number", description: "Positive = over-assessed (good for homeowner)" },
              assessmentGapPercent: { type: "number", description: "Gap as percentage of assessed value" },
              appealStrengthScore: { type: "number", description: "0-100 score, generous where data supports" },
              appealStrengthFactors: { type: "array", items: { type: "string" }, description: "Specific data-backed factors" },
              recommendedApproach: { type: "string", enum: ["poa", "pro-se", "not-recommended"] },
              executiveSummary: { type: "string", description: "Lead with strongest over-assessment argument" },
              valuationJustification: { type: "string", description: "Which comps and why they support lower value" },
              potentialSavings: { type: "number", description: "Annual tax savings estimate" },
              nextSteps: { type: "array", items: { type: "string" }, description: "Actionable appeal-building steps" },
            },
            required: [
              "marketValueEstimate",
              "assessmentGap",
              "assessmentGapPercent",
              "appealStrengthScore",
              "appealStrengthFactors",
              "recommendedApproach",
              "executiveSummary",
              "valuationJustification",
              "potentialSavings",
              "nextSteps",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid LLM response format");
    }

    const analysis = JSON.parse(content) as AppraisalAnalysis;

    // Validate response
    if (
      !analysis.marketValueEstimate ||
      !analysis.appealStrengthScore ||
      !analysis.recommendedApproach ||
      !analysis.executiveSummary
    ) {
      throw new Error("Incomplete analysis response");
    }

    // Enrich with our pre-computed data
    analysis.compSelectionRationale = rationale;
    analysis.marketWeaknessFactors = marketWeakness;

    return analysis;
  } catch (error) {
    console.error("[AppraisalAnalyzer] Error analyzing property:", error);

    // Fallback: compute advocacy-oriented analysis without LLM
    return computeFallbackAnalysis(propertyData, propertyType);
  }
}

/**
 * Fallback analysis when LLM is unavailable.
 * Still advocates for the homeowner using pure data.
 */
function computeFallbackAnalysis(
  propertyData: PropertyData,
  propertyType: string
): AppraisalAnalysis {
  const assessed = propertyData.assessedValue || 0;
  const comps = propertyData.comparableSales || [];

  // Use the LOWEST defensible value: average of comps below assessed, or market value, or 90% of assessed
  let marketEstimate: number;
  const compsBelow = comps.filter((c) => c.salePrice < assessed);

  if (compsBelow.length >= 3) {
    // Strong case: multiple comps sold below assessed value
    marketEstimate = compsBelow.reduce((s, c) => s + c.salePrice, 0) / compsBelow.length;
  } else if (comps.length >= 3) {
    // Use average of all comps (typically lower than assessed if over-assessed)
    marketEstimate = comps.reduce((s, c) => s + c.salePrice, 0) / comps.length;
  } else if (propertyData.marketValue) {
    marketEstimate = propertyData.marketValue;
  } else {
    marketEstimate = assessed * 0.88; // Conservative 12% reduction estimate
  }

  // Apply age-based depreciation adjustment
  let conditionAdj = 0;
  if (propertyData.yearBuilt) {
    const age = new Date().getFullYear() - propertyData.yearBuilt;
    if (age > 30) conditionAdj = marketEstimate * 0.08; // 8% depreciation
    else if (age > 20) conditionAdj = marketEstimate * 0.05; // 5% depreciation
    else if (age > 10) conditionAdj = marketEstimate * 0.02; // 2% depreciation
  }

  marketEstimate = Math.round(marketEstimate - conditionAdj);
  const gap = assessed - marketEstimate;
  const gapPercent = assessed > 0 ? (gap / assessed) * 100 : 0;

  // Build advocacy factors
  const factors: string[] = [];
  if (gap > 0) factors.push(`Assessment exceeds estimated market value by $${gap.toLocaleString()} (${gapPercent.toFixed(1)}%)`);
  if (compsBelow.length > 0) factors.push(`${compsBelow.length} comparable properties sold below the assessed value`);
  if (comps.length > 0) factors.push(`Average comparable sale price ($${Math.round(comps.reduce((s, c) => s + c.salePrice, 0) / comps.length).toLocaleString()}) supports a lower valuation`);
  if (conditionAdj > 0) factors.push(`Property age (${new Date().getFullYear() - (propertyData.yearBuilt || 2000)} years) warrants depreciation adjustment of $${Math.round(conditionAdj).toLocaleString()}`);
  if (factors.length === 0) factors.push("Limited data available — additional evidence may strengthen the case");

  // Determine tax rate (use actual if available, otherwise estimate)
  const taxRate = propertyData.propertyTax && assessed > 0
    ? propertyData.propertyTax / assessed
    : 0.012;

  return {
    marketValueEstimate: marketEstimate,
    assessmentGap: Math.max(0, gap),
    assessmentGapPercent: Math.max(0, gapPercent),
    appealStrengthScore: gapPercent > 15 ? 80 : gapPercent > 10 ? 70 : gapPercent > 5 ? 60 : gapPercent > 0 ? 50 : 30,
    appealStrengthFactors: factors,
    recommendedApproach: gapPercent > 5 ? "poa" : gapPercent > 0 ? "pro-se" : "not-recommended",
    executiveSummary: gap > 0
      ? `This property is over-assessed by $${gap.toLocaleString()} (${gapPercent.toFixed(1)}%). Based on ${comps.length} comparable sales and market data analysis, the estimated fair market value is $${marketEstimate.toLocaleString()}, which is significantly below the current assessed value of $${assessed.toLocaleString()}.`
      : `Based on available data, the current assessment of $${assessed.toLocaleString()} appears close to market value. Additional evidence (property condition photos, recent repairs needed) may reveal grounds for appeal.`,
    valuationJustification: `Analysis based on ${comps.length} comparable sales from multiple data sources (Redfin, RentCast). ${compsBelow.length > 0 ? `${compsBelow.length} comps sold below the assessed value, providing direct evidence of over-assessment.` : ""} ${conditionAdj > 0 ? `A depreciation adjustment of $${Math.round(conditionAdj).toLocaleString()} was applied based on property age.` : ""}`,
    potentialSavings: Math.round(Math.max(0, gap) * taxRate),
    nextSteps: [
      "Upload property photos showing any condition issues, damage, or deferred maintenance — assessors cannot see inside your property",
      "Review the comparable sales in your report and note any that are particularly similar to your property",
      "Gather your most recent tax assessment notice and property tax bill",
      gap > 0 ? "File your appeal before the county deadline — the data supports a strong case for reduction" : "Consider getting a professional inspection to document condition issues that may not be reflected in public data",
    ],
    conditionAdjustment: conditionAdj,
    compSelectionRationale: `Selected ${comps.length} comparable sales. ${compsBelow.length} sold below assessed value.`,
    marketWeaknessFactors: identifyMarketWeakness(comps, propertyData),
  };
}

/**
 * Calculate potential annual tax savings
 * Uses actual tax rate when available, otherwise estimates
 */
export function calculatePotentialSavings(
  assessmentGap: number,
  taxRate: number = 0.012
): number {
  return Math.round(Math.max(0, assessmentGap) * taxRate);
}
