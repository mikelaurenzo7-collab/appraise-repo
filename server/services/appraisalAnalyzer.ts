import { invokeLLM } from "../_core/llm";
import type { PropertyData } from "./propertyDataAggregator";

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
}

/**
 * Analyze property data and generate appraisal assessment
 * Uses LLM to synthesize multi-source data into coherent analysis
 */
export async function analyzeProperty(propertyData: PropertyData, propertyType: string = "residential"): Promise<AppraisalAnalysis> {
  try {
    // Prepare data summary for LLM
    const dataSummary = `
Property Address: ${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.zipCode}
Property Type: ${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
County: ${propertyData.county || "Unknown"}

Current Assessment:
- Assessed Value: $${propertyData.assessedValue?.toLocaleString() || "Unknown"}

Market Data:
- Estimated Market Value: $${propertyData.marketValue?.toLocaleString() || "Unknown"}
- Last Sale Price: $${propertyData.lastSalePrice?.toLocaleString() || "Unknown"} (${propertyData.lastSaleDate || "Unknown"})
- Square Feet: ${propertyData.squareFeet?.toLocaleString() || "Unknown"}
- Lot Size: ${propertyData.lotSize?.toLocaleString() || "Unknown"} sq ft
- Year Built: ${propertyData.yearBuilt || "Unknown"}
- Bedrooms: ${propertyData.bedrooms || "Unknown"}
- Bathrooms: ${propertyData.bathrooms || "Unknown"}

Comparable Properties: ${propertyData.comparableSales?.length || 0} found
${
  propertyData.comparableSales
    ?.slice(0, 3)
    .map((comp) => `- ${comp.address}: $${comp.salePrice.toLocaleString()} (${comp.squareFeet} sqft)`)
    .join("\n") || "None"
}

Rental Comps: ${propertyData.rentalComps?.length || 0} found
${
  propertyData.rentalComps
    ?.slice(0, 3)
    .map((comp) => `- ${comp.address}: $${comp.monthlyRent}/month (${comp.bedrooms}bd/${comp.bathrooms}ba)`)
    .join("\n") || "None"
}
    `;

    const prompt = `You are generating a DATA report for a property owner who is
considering a pro-se tax-assessment appeal. You are NOT their attorney and you
do NOT provide case-specific legal advice. Produce descriptive, evidence-based
fields only. Do not use prescriptive language ("you should…", "argue that…").
Stick to what the market data shows.

${dataSummary}

Provide a JSON response with:
1. marketValueEstimate: Estimated fair market value from the supplied data
2. assessmentGap: Dollar difference between assessed value and marketValueEstimate
3. assessmentGapPercent: Percentage difference (gap / assessed value)
4. appealStrengthScore: 0-100 score describing how supportive the data is
5. appealStrengthFactors: 3-5 observational, data-based factors (no strategy advice)
6. recommendedApproach: "poa" (automated online filing), "pro-se" (guided mail-in filing), or "not-recommended"
7. executiveSummary: 2-3 factual sentences summarizing the data
8. valuationJustification: Paragraph describing the methodology — which comps, which public records
9. potentialSavings: Estimated annual tax savings if assessment were reduced to marketValueEstimate
10. nextSteps: 3-4 informational next steps (e.g. "gather your tax notice", "verify assessed value"), NOT legal strategy

Respond ONLY with valid JSON, no additional text.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a data-analysis engine producing factual property-valuation information. You are not an attorney and do not provide legal advice. Output valid JSON only. Describe what the data shows; never prescribe legal strategy.",
        },
        {
          role: "user",
          content: prompt,
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

    return analysis;
  } catch (error) {
    console.error("[AppraisalAnalyzer] Error analyzing property:", error);

    // Return default analysis if LLM fails
    const assessed = propertyData.assessedValue || 0;
    const market = propertyData.marketValue || assessed * 0.9;
    const gap = assessed - market;
    const gapPercent = assessed > 0 ? (gap / assessed) * 100 : 0;

    return {
      marketValueEstimate: market,
      assessmentGap: gap,
      assessmentGapPercent: gapPercent,
      appealStrengthScore: gapPercent > 10 ? 65 : 35,
      appealStrengthFactors: ["Assessment appears higher than market comparables", "Recent market data available"],
      recommendedApproach: gapPercent > 10 ? "poa" : "not-recommended",
      executiveSummary: `Property assessed at $${assessed.toLocaleString()} but estimated market value is $${market.toLocaleString()}.`,
      valuationJustification: "Analysis based on comparable sales and market data from multiple sources.",
      potentialSavings: (gap * 0.012) / 1, // Rough estimate: 1.2% annual tax rate
      nextSteps: ["Review detailed comparable sales", "Consider filing appeal", "Contact our team for consultation"],
    };
  }
}

/**
 * Calculate potential annual tax savings
 * Assumes ~1.2% average property tax rate in US
 */
export function calculatePotentialSavings(assessmentGap: number, taxRate: number = 0.012): number {
  return Math.round(assessmentGap * taxRate);
}
