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

    const prompt = `You are preparing the analytical narrative for a property
owner who intends to challenge an over-assessment by their county tax authority.
You are NOT their attorney and you do NOT provide case-specific legal advice.
Your role is that of an independent valuation analyst whose work product will
be entered into a property-tax appeal record.

Tone & framing:
- Professional, evidence-based, and quantitative — every observation must be
  traceable to a comp, a public record, a measurement, or an arithmetic step.
- Where the data fairly supports a lower fair market value than the current
  assessment, say so plainly and explain WHY the data supports that conclusion.
  This is not advocacy — it is competent valuation.
- Avoid prescriptive legal language ("you should argue…", "demand that…").
  Use analytical language ("the comparable evidence indicates…",
  "the data is consistent with a fair market value of…").
- Do not editorialize about the assessor. Stick to numbers and methodology.

${dataSummary}

Provide a JSON response with:
1. marketValueEstimate: Independent fair-market-value conclusion derived from the
   comparable sales and public records above. Round to the nearest $500.
2. assessmentGap: assessedValue minus marketValueEstimate (positive = over-assessed).
3. assessmentGapPercent: gap / assessedValue, expressed as a number.
4. appealStrengthScore: 0-100. Reflects (a) the magnitude of the gap, (b) the
   quantity and quality of corroborating comparable sales, and (c) the
   consistency of the supporting public-record data.
5. appealStrengthFactors: 3-5 concise, evidence-grade factors (e.g. "comparable
   sales within 0.5 mi support a value of $X", "lot size discrepancy vs.
   assessor record"). Each factor must be verifiable from the data shown.
6. recommendedApproach: "poa" (we file on the owner's behalf), "pro-se"
   (guided owner-filed appeal), or "not-recommended" (data does not support
   an appeal at this time).
7. executiveSummary: 2-3 sentences. State the assessed value, the
   evidence-supported fair market value, and the resulting over-assessment if
   any, in plain professional language.
8. valuationJustification: One paragraph (4-7 sentences). Walk through the
   methodology used: which approach (sales comparison / income / cost) was
   weighted most, which comps drove the conclusion, and how public-record
   data corroborates or refines the estimate.
9. potentialSavings: Estimated annual property-tax savings if the assessment
   were reduced to marketValueEstimate (use 1.2% as default effective rate
   when not otherwise indicated).
10. nextSteps: 3-4 concrete, professional next steps the owner can take
    (e.g. "Verify assessed value on the most recent tax notice",
    "Photograph any deferred-maintenance items prior to the hearing",
    "Confirm appeal-filing deadline with the county assessor's office"). Do
    not provide legal strategy or jurisdiction-specific procedural advice.

Respond ONLY with valid JSON, no additional text.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an independent valuation analyst preparing supporting analysis for a property-tax appeal. " +
            "You produce professional, evidence-based, USPAP-aligned narratives. You are not an attorney and " +
            "do not provide legal advice. You output valid JSON only. When the data fairly supports a fair " +
            "market value below the current assessment, you state that conclusion clearly and explain the " +
            "underlying evidence — but you never invent facts and never editorialize about the assessor.",
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
