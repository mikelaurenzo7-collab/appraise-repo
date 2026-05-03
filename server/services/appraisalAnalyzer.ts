import { invokeLLM } from "../_core/llm";
import { analyzeWithClaude, isClaudeAvailable } from "../_core/claude";
import { hashLLMInput, withLLMCache } from "../_core/lcache";
import { getScenarioContext, generateScenarioPromptContext, type UserScenario } from "./scenarioValuation";
import type { PropertyData } from "./propertyDataAggregator";
import { scopedLogger } from "../_core/logger";

const log = scopedLogger("AppraisalAnalyzer");

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
// THREE STATUTORY GROUNDS for relief — recognized in nearly every state:
//   (1) Excessive market value     (subject worth less than the assessment)
//   (2) Lack of uniformity         (subject assessed at a higher ratio than peers)
//   (3) Errors of fact             (assessor's record card materially wrong)
// The narrative should at least surface (1); when the data supports (2) or
// (3), they are independently powerful and should appear in
// appealStrengthFactors so the downstream persuasion brief can lead with
// the strongest of the three.
//
// Hard rules that override the advocacy posture:
//   1. Never invent facts. Every claim traces to a comp, public record,
//      photo, or arithmetic step.
//   2. Never go below the supportable evidence range. If the IQR floor is
//      $X, we don't conclude $X − 10%.
//   3. Never editorialize about the assessor. Stick to numbers + methodology.
//   4. USPAP-aligned reasoning: weighted approaches, transparent adjustments,
//      stated assumptions, identified data limitations.
//   5. Never use emotional / hardship language ("unfair", "I can't afford",
//      "my neighbor pays less"). Boards evaluate evidence, not sympathy.
//   6. Specify a precise number — never an open-ended ask.
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
  "Three-grounds awareness: for the appealStrengthFactors array, surface evidence supporting any " +
  "of the three statutory grounds: (1) excessive market value (the comp-band analysis), " +
  "(2) lack of uniformity (the subject's assessment-to-market ratio vs. peer parcels), and " +
  "(3) errors of fact (discrepancies between the assessor's record and verifiable physical facts). " +
  "When the input includes uniformity or record-error data, name those grounds explicitly; the " +
  "downstream persuasion brief will lead with whichever ground is strongest.\n\n" +
  "Hard rules: never invent facts; never go below the comp-supported range; never editorialize " +
  "about the assessor; never use emotional or hardship language; always state the methodology used " +
  "and the comparable-data limitations; always specify a precise requested value, never an " +
  "open-ended ask.";

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
 * @param photoContext    Rich photo analysis summary with USPAP ratings, assessor
 *                        blind spots, functional obsolescence — injected directly
 *                        into the LLM prompt as evidence.
 * @param taxBillData     Parsed tax bill OCR data — APN, actual tax amounts,
 *                        prior-year values, exemptions — grounding the analysis
 *                        in the owner's real tax document.
 */
export async function analyzeProperty(
  propertyData: PropertyData,
  propertyType: string = "residential",
  scenario: UserScenario = "none",
  photoContext?: {
    llmContext: string;
    overallConditionScore: number;
    uspapRatings: string[];
    assessorBlindSpotItems: string[];
    functionalObsolescenceItems: string[];
    topValueIssues: string[];
  } | null,
  taxBillData?: Record<string, unknown> | null,
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

    // ── Tax Bill Evidence Block ───────────────────────────────────────────────
    // Real tax document data is the most authoritative evidence we have.
    // OCR'd from the owner's actual bill: APN, true assessed value, tax amounts,
    // prior-year comparison, exemptions already applied.
    let taxBillBlock = "";
    if (taxBillData && typeof taxBillData === "object") {
      const tb = taxBillData as Record<string, unknown>;
      const lines: string[] = ["## Tax Bill Evidence (Owner-Submitted Official Document)"];
      if (tb.apn) lines.push(`- APN / Parcel ID: ${tb.apn}`);
      if (tb.taxYear) lines.push(`- Tax Year: ${tb.taxYear}`);
      if (tb.currentAssessedValue) lines.push(`- Assessed Value (from bill): $${Number(tb.currentAssessedValue).toLocaleString()}`);
      if (tb.landValue) lines.push(`- Land Value: $${Number(tb.landValue).toLocaleString()}`);
      if (tb.improvementValue) lines.push(`- Improvement Value: $${Number(tb.improvementValue).toLocaleString()}`);
      if (tb.priorYearAssessedValue) {
        const prior = Number(tb.priorYearAssessedValue);
        const current = Number(tb.currentAssessedValue ?? 0);
        const yoyChange = current && prior ? ((current - prior) / prior * 100).toFixed(1) : null;
        lines.push(`- Prior Year Assessed Value: $${prior.toLocaleString()}${yoyChange ? ` (${yoyChange}% YoY change)` : ""}`);
      }
      if (tb.annualTaxAmount) lines.push(`- Annual Tax Bill: $${Number(tb.annualTaxAmount).toLocaleString()}`);
      if (tb.effectiveTaxRate) lines.push(`- Effective Tax Rate: ${(Number(tb.effectiveTaxRate) * 100).toFixed(3)}%`);
      if (Array.isArray(tb.exemptions) && tb.exemptions.length) {
        lines.push(`- Exemptions Applied: ${(tb.exemptions as string[]).join(", ")}`);
        if (tb.exemptionAmount) lines.push(`- Exemption Value: $${Number(tb.exemptionAmount).toLocaleString()}`);
      }
      if (tb.appealDeadline) lines.push(`- Appeal Deadline (from bill): ${tb.appealDeadline}`);
      if (tb.assessorOffice) lines.push(`- Assessor Office: ${tb.assessorOffice}`);
      if (lines.length > 1) {
        taxBillBlock = "\n" + lines.join("\n") + "\n";
        taxBillBlock +=
          "\nINSTRUCTION: The tax bill above is primary-source evidence. Use the APN to " +
          "anchor your analysis to the specific parcel. Use the actual assessed value from " +
          "the bill (not the API estimate) as the authoritative current assessment. If the " +
          "bill shows a YoY increase materially above market appreciation, cite this as an " +
          "overvaluation indicator. Use the actual tax amount and rate for all savings calculations.\n";
      }
    }

    // ── Photo Evidence Block ──────────────────────────────────────────────────
    // Interior photos are the assessor's blind spot — they have no interior access.
    // This block gives Claude the same evidence the owner sees but the assessor doesn't.
    let photoEvidenceBlock = "";
    if (photoContext?.llmContext) {
      photoEvidenceBlock = "\n" + photoContext.llmContext + "\n";
      if (photoContext.assessorBlindSpotItems?.length) {
        photoEvidenceBlock +=
          "\nINSTRUCTION: The 'Assessor Blind Spots' section above documents interior " +
          "defects INVISIBLE to the assessor at the time of assessment. These are uniquely " +
          "powerful: the assessor cannot rebut them without an inspection they did not " +
          "perform. Weight these heavily as support for a below-median comp-band anchor. " +
          "Name them explicitly in 'valuationJustification' and 'appealStrengthFactors'.\n";
      }
      if (photoContext.functionalObsolescenceItems?.length) {
        photoEvidenceBlock +=
          "\nINSTRUCTION: Functional obsolescence items above represent features that " +
          "the market has already priced down but the assessor's records may not reflect. " +
          "Each item typically supports a 2–8% downward adjustment depending on severity " +
          "and market reaction. Cite these in the valuation justification.\n";
      }
    }

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
${taxBillBlock}
${photoEvidenceBlock}
${scenarioBlock}

Provide a JSON response with:
1. marketValueEstimate: Independent fair-market-value conclusion derived from
   the comparable sales and public records above. Round to the nearest $500.
   When a Comparable-Sales Price Band is shown, this number MUST fall within
   that band (Q1 ≤ value ≤ Q3 typically; never below the lower edge of the
   range and only at/above the median when the subject is materially
   superior to the comp set).
   IMPORTANT: If photo evidence shows interior defects or functional obsolescence
   the assessor has not seen, these SUPPORT anchoring at Q1. If a tax bill shows
   a year-over-year assessment increase above market appreciation, this supports
   the overvaluation argument. Use both to build the strongest defensible case.
2. assessmentGap: assessedValue minus marketValueEstimate (positive = over-assessed).
   Use the assessed value from the tax bill if provided — it's the authoritative figure.
3. assessmentGapPercent: gap / assessedValue, expressed as a number.
4. appealStrengthScore: 0-100. Reflects (a) magnitude of the gap, (b) quantity
   and quality of comparable sales, (c) consistency of public-record data,
   (d) photo evidence of defects unknown to assessor (+5 to +15 if present),
   (e) functional obsolescence not in assessor records (+3 to +8 each item),
   (f) tax bill showing above-market YoY increase (+5 to +10 if present).
5. appealStrengthFactors: 4-7 concise, evidence-grade factors. Must include
   photo-based and tax-bill-based factors when those data are present. Each
   factor must be verifiable from the data shown above.
6. recommendedApproach: "poa" (we file on the owner's behalf), "pro-se"
   (guided owner-filed appeal), or "not-recommended" (data does not support
   an appeal at this time).
7. executiveSummary: 2-3 sentences. State the assessed value (from tax bill if
   available), the evidence-supported fair market value, and the resulting
   over-assessment if any. Mention photo evidence and tax bill if present.
8. valuationJustification: 6-10 sentences. Walk through: methodology used and
   why; comp-band positioning and what factors drive the Q1 anchor; any
   interior defects the assessor could not observe; any functional obsolescence;
   how the tax bill data corroborates or refines the estimate; year-over-year
   assessment trend if known. Be specific — cite actual comp addresses, actual
   observed defects, actual dollar amounts.
9. potentialSavings: Annual property-tax savings if assessment reduced to
   marketValueEstimate. Use the ACTUAL effective tax rate from the tax bill
   ONLY. If no tax rate is shown in the data above, return 0 — the
   downstream pipeline will recompute savings from the real rate when
   available, and will surface "rate unknown" rather than display a
   fabricated savings figure to the owner.
10. nextSteps: 4-5 concrete next steps. Include: gather tax bill if not already
    uploaded, photograph remaining deferred maintenance before hearing, confirm
    appeal deadline, request assessor's property record card to check for data
    errors (square footage, bedroom count, etc.).

Respond ONLY with valid JSON matching this schema:
${JSON.stringify(APPRAISAL_JSON_SCHEMA, null, 2)}`;

    // Cache key derived from the property + scenario + evidence inputs.
    // Include a hash of photo/taxBill presence so new evidence busts the cache.
    const source = isClaudeAvailable() ? "claude-opus-4-7" : "claude-unavailable";
    const evidenceHash = hashLLMInput([
      photoContext ? photoContext.overallConditionScore : null,
      photoContext ? photoContext.uspapRatings : null,
      taxBillData ? (taxBillData as Record<string, unknown>).apn : null,
      taxBillData ? (taxBillData as Record<string, unknown>).currentAssessedValue : null,
    ]);
    const cacheKey = `llm:appraisal:${source}:${hashLLMInput([propertyData, propertyType, scenario])}:${evidenceHash}`;

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
        // Anthropic key absent — invokeLLM also routes to Claude via the
        // shared callAnthropic shim. Will throw if no API key is present.
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
    // Re-throw with diagnostic context. We DO NOT fabricate a default
    // analysis (invented market value at 90% of assessed, invented appeal
    // score, invented 1.2% tax rate). A fake analysis put into the appeal
    // record is worse than no analysis — it would mislead the owner about
    // their case and could be used against them in a hearing.
    //
    // The outer analysisJob catch handles this by marking the submission
    // as `error` so the owner / admin can investigate and re-queue. No
    // synthetic numbers ever land in the property_analysis row.
    log.error("[AppraisalAnalyzer] LLM analysis failed", { address: propertyData.address, err: error });
    throw new Error(
      `Appraisal analysis failed: ${error instanceof Error ? error.message : String(error)}. ` +
      `No fallback analysis is generated; the submission has been marked for retry.`,
    );
  }
}

/**
 * Calculate potential annual tax savings.
 *
 * @param assessmentGap  The reduction in assessed value being argued for.
 * @param taxRate        The effective tax rate as a decimal. The CALLER is
 *                       responsible for providing the actual rate from the
 *                       tax bill or jurisdiction record. There is no default
 *                       — passing an invented rate produces an invented
 *                       savings figure that misleads the appeal record.
 */
export function calculatePotentialSavings(assessmentGap: number, taxRate: number): number {
  if (!Number.isFinite(taxRate) || taxRate <= 0 || taxRate >= 1) {
    throw new Error(`calculatePotentialSavings: taxRate must be a decimal in (0, 1); got ${taxRate}`);
  }
  return Math.round(assessmentGap * taxRate);
}
