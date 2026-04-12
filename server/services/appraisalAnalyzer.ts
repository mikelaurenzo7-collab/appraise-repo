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

    const prompt = `You are a professional property appraiser and tax appeal expert. Analyze this property data and provide a detailed assessment.

${dataSummary}

Based on this data, provide a JSON response with:
1. marketValueEstimate: Your professional estimate of fair market value
2. assessmentGap: Dollar difference between assessed and market value
3. assessmentGapPercent: Percentage difference
4. appealStrengthScore: 0-100 score indicating likelihood of successful appeal
5. appealStrengthFactors: Array of 3-5 key factors supporting the appeal
6. recommendedApproach: "poa" (we file), "pro-se" (user files with our help), or "not-recommended"
7. executiveSummary: 2-3 sentence summary of findings
8. valuationJustification: Paragraph explaining the valuation methodology
9. potentialSavings: Estimated annual tax savings if appeal succeeds
10. nextSteps: Array of 3-4 recommended next steps

Respond ONLY with valid JSON, no additional text.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert property appraiser and tax appeal specialist. Provide accurate, professional analysis based on market data. Always respond with valid JSON.",
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
