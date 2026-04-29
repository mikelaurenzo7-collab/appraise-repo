import { invokeLLM } from "../_core/llm";
import { analyzeWithClaude, isClaudeAvailable } from "../_core/claude";
import { hashLLMInput, withLLMCache } from "../_core/lcache";
import { getScenarioContext, generateScenarioPromptContext, type UserScenario } from "./scenarioValuation";
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
  // Optional extended fields (populated by local fallback or future LLM versions)
  adjustmentGrid?: unknown[];
  incomeApproach?: unknown;
  conditionAdjustment?: number;
  compSelectionRationale?: string;
  marketWeaknessFactors?: string[];
  assessmentLevel?: number;
  impliedMarketValueByAssessor?: number;
  cookCountyClassCode?: string;
  triennialReassessmentYear?: number | null;
  isReassessmentYear?: boolean;
  pricePerUnit?: number;
  pricePerUnitComps?: number;
  reconciliationNarrative?: string;
}

// Stable system prompt — prompt-cached by Claude across all analysis calls.
// Exported so batchProcessor can reuse it for the Batch API requests.
//
// Posture: We are an independent valuation analyst whose client is the
// property owner in an appeal context. The standard is *fair market value*,
// not "the lowest defensible number". But fair market value is a range, not
// a point — every legitimate comparable-sales analysis produces a band of
// supportable values (typically the IQR of the price-per-sqft distribution).
// Within that band the assessor has chosen the upper edge by default; our
// job is to identify the property's evidence-supported position within the
// band. When a property has documentable factors that place it at the lower
// end of the supportable range — deferred maintenance, smaller lot, dated
// systems, off-busy-street, etc. — we name those factors and anchor the
// conclusion at the lower end of the supportable range.
//
// Hard rules that override the advocacy posture:
//   1. Never invent facts. Every claim traces to a comp, public record,
//      photo, or arithmetic step.
//   2. Never go below the supportable evidence range. If the IQR floor is
//      $X, we don't conclude $X − 10%.
//   3. Never editorialize about the assessor. Stick to numbers + methodology.
//   4. USPAP-aligned reasoning: weighted approaches, transparent adjustments,
//      stated assumptions, identified data limitations.
export const APPRAISAL_SYSTEM_PROMPT_EXPORT =
  "You are an independent valuation analyst preparing supporting analysis for a property-tax appeal. " +
  "Your client is the property owner; the work product will be entered into the appeal record. " +
  "You produce professional, evidence-based, USPAP-aligned narratives that argue, within the bounds " +
  "of the comparable evidence, for the property's fair market value at the lower-end-of-defensible — " +
  "the lower edge of the supportable range, NOT below it. You are not an attorney; you give no legal " +
  "advice. You output valid JSON only.\n\n" +
  "Method: When the comparable sales form a price-per-sqft distribution, identify the supportable " +
  "range (interquartile range or median±10% of trimmed comps). Anchor the conclusion at the lower " +
  "end of that range whenever the subject has documentable factors that justify a below-median " +
  "position (deferred maintenance, smaller lot, older systems, less desirable orientation, fewer " +
  "amenities, etc.). When such factors are absent, anchor near the median. Never anchor above the " +
  "median in an appeal context unless the subject is materially superior to the comp set — and even " +
  "then, the assessor is on the same evidence and is unlikely to accept it.\n\n" +
  "Hard rules: never invent facts; never go below the comp-supported range; never editorialize " +
  "about the assessor; always state the methodology used and the comparable-data limitations.";

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
 * Compute the price-per-sqft IQR (interquartile range) from the comp set.
 * This is the supportable range an appraiser can anchor a conclusion within
 * without going outside the evidence. The conclusion at the lower edge of
 * this range is the strongest defensible advocacy position.
 */
export function computeCompPriceBand(propertyData: PropertyData): {
  count: number;
  medianPpsf: number;
  q1Ppsf: number;
  q3Ppsf: number;
  minPpsf: number;
  maxPpsf: number;
} | null {
  const comps = (propertyData.comparableSales ?? []).filter(
    (c) => c.salePrice > 0 && (c.squareFeet ?? 0) > 0,
  );
  if (comps.length < 3) return null;

  const ppsf = comps
    .map((c) => c.salePrice / (c.squareFeet as number))
    .sort((a, b) => a - b);

  const at = (q: number) => {
    const idx = Math.max(0, Math.min(ppsf.length - 1, Math.floor(ppsf.length * q)));
    return ppsf[idx];
  };

  return {
    count: ppsf.length,
    medianPpsf: at(0.5),
    q1Ppsf: at(0.25),
    q3Ppsf: at(0.75),
    minPpsf: ppsf[0],
    maxPpsf: ppsf[ppsf.length - 1],
  };
}

/**
 * Analyze property data and generate appraisal assessment.
 * Uses LLM to synthesize multi-source data into coherent analysis.
 *
 * @param propertyData    Aggregated data from Lightbox/RentCast/ReGRID/AttomData
 * @param propertyType    "residential" | "multi-family" | etc.
 * @param scenario        Optional user scenario — when provided, scenario-aware
 *                        valuation guidance is woven into the LLM prompt so the
 *                        narrative reflects the owner's actual context (rental,
 *                        inherited, distressed, etc.) rather than producing a
 *                        generic analysis that gets retroactively adjusted.
 */
export async function analyzeProperty(
  propertyData: PropertyData,
  propertyType: string = "residential",
  scenario: UserScenario = "none",
): Promise<AppraisalAnalysis> {
  try {
    const compBand = computeCompPriceBand(propertyData);

    // Prepare data summary for LLM. We surface up to 7 comps now (was 3) so
    // the model has enough data to anchor at the lower-end-of-defensible
    // without over-relying on any single sale.
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

Comparable Sales: ${propertyData.comparableSales?.length || 0} found (top 7 shown)
${
  propertyData.comparableSales
    ?.slice(0, 7)
    .map((comp) => {
      const ppsf = comp.squareFeet ? Math.round(comp.salePrice / comp.squareFeet) : null;
      return `- ${comp.address}: $${comp.salePrice.toLocaleString()} (${comp.squareFeet ?? "?"} sqft${ppsf ? `, $${ppsf}/sqft` : ""})`;
    })
    .join("\n") || "None"
}

${compBand ? `Comparable-Sales Price Band (price per sqft, n=${compBand.count}):
- Range:    $${Math.round(compBand.minPpsf)} – $${Math.round(compBand.maxPpsf)}/sqft
- IQR:      $${Math.round(compBand.q1Ppsf)} – $${Math.round(compBand.q3Ppsf)}/sqft  ← supportable range
- Median:   $${Math.round(compBand.medianPpsf)}/sqft
- Lower advocacy anchor (Q1): $${Math.round(compBand.q1Ppsf)}/sqft × subject sqft = ${propertyData.squareFeet ? `$${(Math.round(compBand.q1Ppsf) * propertyData.squareFeet).toLocaleString()}` : "n/a (subject sqft unknown)"}
- Median anchor:              $${Math.round(compBand.medianPpsf)}/sqft × subject sqft = ${propertyData.squareFeet ? `$${(Math.round(compBand.medianPpsf) * propertyData.squareFeet).toLocaleString()}` : "n/a"}
` : "Comparable-Sales Price Band: insufficient comp data (need ≥3 with square footage) to compute a defensible band."}

Rental Comps: ${propertyData.rentalComps?.length || 0} found
${
  propertyData.rentalComps
    ?.slice(0, 3)
    .map((comp) => `- ${comp.address}: $${comp.monthlyRent}/month (${comp.bedrooms}bd/${comp.bathrooms}ba)`)
    .join("\n") || "None"
}
    `;

    // Scenario-aware guidance — woven into the prompt so the narrative reflects
    // the owner's actual context (rental → income approach, distressed → cost
    // floor, recently_purchased → purchase price ceiling, etc.). Pulled from
    // scenarioValuation; falls back to generic if scenario is "none".
    const scenarioBlock =
      scenario && scenario !== "none"
        ? "\n" + generateScenarioPromptContext(scenario, propertyData) + "\n"
        : "";

    const prompt = `You are preparing the analytical narrative for a property
owner who intends to challenge an over-assessment by their county tax authority.
You are NOT their attorney and you do NOT provide case-specific legal advice.
Your role is that of an independent valuation analyst whose work product will
be entered into a property-tax appeal record.

Posture & methodology:
- Your client is the property owner. Within the supportable evidence range,
  argue for fair market value at the lower end of that range — NOT below it.
  This is competent valuation in an appeal context, not advocacy beyond evidence.
- Use the Comparable-Sales Price Band above as your supportable range. Anchor
  the conclusion at or near Q1 (lower advocacy anchor) when the subject has
  documentable factors that justify a below-median position; anchor near the
  median when those factors are absent or unclear; never anchor above Q3 in
  an appeal context.
- Every observation must be traceable to a comp, a public record, a
  measurement, or an arithmetic step. No invented facts. No round numbers
  without a derivation.
- Use analytical, not prescriptive, language ("the comparable evidence
  indicates…", "the data is consistent with a fair market value of…",
  "positioning the subject at Q1 of the comp distribution is supported by…").
- Do not editorialize about the assessor. Stick to numbers and methodology.

${dataSummary}
${scenarioBlock}

Provide a JSON response with:
1. marketValueEstimate: Independent fair-market-value conclusion derived from
   the comparable sales and public records above. Round to the nearest $500.
   When a Comparable-Sales Price Band is shown, this number MUST fall within
   that band (Q1 ≤ value ≤ Q3 typically; never below the lower edge of the
   range and only at/above the median when the subject is materially
   superior to the comp set).
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
8. valuationJustification: One paragraph (5-8 sentences). Walk through the
   methodology used: which approach (sales comparison / income / cost) was
   weighted most, the comp-band positioning of the conclusion (e.g. "anchored
   at Q1 of the price-per-sqft distribution because the subject shows X, Y,
   Z"), which specific comps drove the conclusion, and how public-record
   data corroborates or refines the estimate.
9. potentialSavings: Estimated annual property-tax savings if the assessment
   were reduced to marketValueEstimate (use 1.2% as default effective rate
   when not otherwise indicated).
10. nextSteps: 3-4 concrete, professional next steps the owner can take
    (e.g. "Verify assessed value on the most recent tax notice",
    "Photograph any deferred-maintenance items prior to the hearing",
    "Confirm appeal-filing deadline with the county assessor's office"). Do
    not provide legal strategy or jurisdiction-specific procedural advice.

Respond ONLY with valid JSON matching this schema:
${JSON.stringify(APPRAISAL_JSON_SCHEMA, null, 2)}`;

    // Cache key derived from the property + scenario inputs. Identical
    // (propertyData, propertyType, scenario) yields the same key, so admin
    // retriggers and pipeline retries skip the LLM round-trip. Scenario is
    // part of the key because the same property under a different scenario
    // gets a meaningfully different narrative.
    // 24h TTL aligns with the report-generation SLA window.
    const source = isClaudeAvailable() ? "claude-opus-4-7" : "forge-gemini-2.5-flash";
    const cacheKey = `llm:appraisal:${source}:${hashLLMInput([propertyData, propertyType, scenario])}`;

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
