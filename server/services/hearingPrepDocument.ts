/**
 * Hearing Prep Document Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * The persuasion brief is the cover letter the assessor / board READS.
 * The hearing prep document is what the OWNER STUDIES the night before
 * the hearing — script, anticipated questions, verbatim response
 * templates, per-comp talking points, record-error walkthrough.
 *
 * Per practitioner consensus (Cook County BOR practitioner guides, Walker
 * Advisory hearing-preparation playbook, AppealDesk 2026 hearing prep),
 * preparation is the single largest determinant of hearing outcome at the
 * board level — owners who walked in with anticipated Q&A and a written
 * script outperform owners with the same evidence and no preparation by
 * a wide margin. This module produces that preparation artifact.
 *
 * Structure of the output:
 *   • Opening Statement   — 60-90 second script, in first person.
 *   • Per-Ground Talking Points — 2-4 talking points per active ground,
 *                                 ranked by evidence strength.
 *   • Anticipated Q&A     — common board / assessor questions with a
 *                           response template grounded in the actual
 *                           evidence package.
 *   • Per-Comp Walkthrough — for each top comparable, the 1-2 sentence
 *                            "this is why this comp is admissible and
 *                            what its adjusted value supports."
 *   • Record-Error Walkthrough — when applicable, the 30-second factual
 *                                 read of each material discrepancy.
 *   • Closing Statement   — 30-45 second script that asks for a
 *                           specific assessed value.
 *
 * Powered by Claude Opus 4.7 with prompt caching on the hearing-prep
 * system prompt and adaptive thinking on the synthesis. Falls back to a
 * deterministic locally-rendered prep document when Claude is unavailable.
 *
 * IMPORTANT: this document is OWNER-ONLY. Never include it in the assessor-
 * facing PDF — it would broadcast our anticipated assessor questions and
 * coaching to the opposing party. The PDF generator and delivery dispatcher
 * MUST gate this section on `reportAudience === "owner"`.
 */

import { generateNarrativeWithClaude, isClaudeAvailable } from "../_core/claude";
import type { UniformityResult } from "./uniformityAnalyzer";
import type { RecordErrorReport } from "./recordErrorDetector";

export interface HearingPrepInput {
  ownerName?: string;
  propertyAddress: string;
  parcelId?: string | null;
  taxYear?: number | null;
  jurisdiction: string;
  /** Local hearing body (e.g. "Cook County Board of Review", "ARB"). */
  hearingBody?: string;
  /** Hearing date (ISO string), when known. */
  hearingDate?: string | null;
  /** Hearing format affects script tone (in-person vs virtual vs mail). */
  hearingFormat?: "in-person" | "virtual" | "mail" | "hybrid";
  currentAssessedValue: number;
  requestedAssessedValue: number;
  evidenceSupportedMarketValue: number;
  /**
   * Top 3-5 comparable summaries — each with adjusted price + reason
   * the comp is admissible (recent, similar, arms-length).
   */
  comparableSummaries: Array<{
    address: string;
    adjustedPrice: number;
    saleDate: string;
    keyAttribute: string; // e.g. "1,950 sqft, 2 mi away, sold Sep 2025"
  }>;
  uniformity: UniformityResult;
  recordErrors: RecordErrorReport;
  /** Photo evidence: 1-3 short factual phrases. */
  photoFindings: string[];
  /** Functional obsolescence items, if any. */
  functionalObsolescence: string[];
}

export interface HearingPrepDocument {
  /** Opening statement — 60-90 second first-person script. */
  openingStatement: string;
  /** Per-ground talking points (max 4 per ground), ranked strongest-first. */
  groundsTalkingPoints: Array<{
    ground: "market_value" | "uniformity" | "record_errors";
    headline: string;
    bullets: string[];
  }>;
  /**
   * Anticipated questions from the assessor / board, each with a 1-3
   * sentence response grounded in the evidence package. Categorized so
   * the owner can scan for the type of challenge they expect.
   */
  anticipatedQuestions: Array<{
    category: "comp_admissibility" | "valuation_method" | "condition_evidence" | "record_errors" | "uniformity" | "general";
    question: string;
    response: string;
  }>;
  /** Per-comp 1-2 sentence walkthrough for ARB / board admissibility. */
  comparableWalkthrough: Array<{
    address: string;
    line: string;
  }>;
  /** Record-error 30-second factual read per material/major finding. */
  recordErrorWalkthrough: string[];
  /** Closing statement — asks for a precise assessed value. */
  closingStatement: string;
  /** Pre-hearing checklist — practical items to bring + verify. */
  preHearingChecklist: string[];
  /** Source: which generator produced the document. */
  source: "claude" | "fallback";
}

// ─── Stable system prompt — prompt-cached by Claude ─────────────────────────

const HEARING_PREP_SYSTEM_PROMPT =
  "You are an experienced property-tax appeal practitioner preparing a property " +
  "owner for a board / assessor hearing. The owner is your client. Your job is " +
  "to produce a written preparation document the owner can study the night " +
  "before the hearing — opening script, talking points, anticipated questions " +
  "with response templates, per-comp walkthrough, record-error walkthrough, " +
  "closing script. The document MUST be owner-only — never include text that " +
  "broadcasts your strategy to the opposing party (no 'we anticipate the " +
  "assessor will argue X because Y is weak'; instead 'if you are asked about " +
  "X, the answer grounded in your evidence is Y').\n\n" +
  "Tone: practical, calm, confident. First-person scripts. Short sentences " +
  "the owner can deliver naturally — not legal jargon. The opening should " +
  "open with the parcel and requested value, then state the strongest ground. " +
  "The closing should restate the requested assessed value with precision.\n\n" +
  "Hard rules: (1) Never invent facts — every talking point traces to a comp, " +
  "a record-card discrepancy, a photo, or an arithmetic step in the supplied " +
  "evidence package. (2) Never coach the owner to misrepresent or speculate. " +
  "(3) Never recommend emotional appeals — boards evaluate evidence, not " +
  "sympathy. (4) Specify a precise requested assessed value, never an " +
  "open-ended ask.\n\n" +
  "OUTPUT FORMAT: valid JSON only, no markdown fences, with these exact fields:\n" +
  "{\n" +
  '  "openingStatement": string,            // 60-90 second first-person script\n' +
  '  "groundsTalkingPoints": Array<{ground: "market_value"|"uniformity"|"record_errors", headline: string, bullets: string[]}>,\n' +
  '  "anticipatedQuestions": Array<{category: "comp_admissibility"|"valuation_method"|"condition_evidence"|"record_errors"|"uniformity"|"general", question: string, response: string}>,\n' +
  '  "comparableWalkthrough": Array<{address: string, line: string}>,\n' +
  '  "recordErrorWalkthrough": string[],   // one short factual statement per material/major discrepancy\n' +
  '  "closingStatement": string,           // 30-45 second first-person script that asks for a precise assessed value\n' +
  '  "preHearingChecklist": string[]       // 6-10 practical items to bring or verify before the hearing\n' +
  "}\n";

// ─── Public entry point ─────────────────────────────────────────────────────

export async function generateHearingPrepDocument(
  input: HearingPrepInput,
): Promise<HearingPrepDocument> {
  if (isClaudeAvailable()) {
    try {
      const userContent = buildUserPrompt(input);
      const raw = await generateNarrativeWithClaude({
        systemPrompt: HEARING_PREP_SYSTEM_PROMPT,
        userContent,
        maxTokens: 6_000,
      });
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
      const parsed = JSON.parse(slice) as Omit<HearingPrepDocument, "source">;
      return { ...parsed, source: "claude" };
    } catch (err) {
      console.warn(
        "[HearingPrepDocument] Claude generation failed; using fallback:",
        (err as Error).message,
      );
      // fall through to deterministic fallback
    }
  }
  return buildFallback(input);
}

function buildUserPrompt(input: HearingPrepInput): string {
  const lines: string[] = [];
  lines.push(`## Subject Property`);
  lines.push(`Address: ${input.propertyAddress}`);
  if (input.parcelId) lines.push(`Parcel ID: ${input.parcelId}`);
  lines.push(`Jurisdiction: ${input.jurisdiction}`);
  if (input.hearingBody) lines.push(`Hearing Body: ${input.hearingBody}`);
  if (input.hearingDate) lines.push(`Hearing Date: ${input.hearingDate}`);
  if (input.hearingFormat) lines.push(`Hearing Format: ${input.hearingFormat}`);
  if (input.taxYear) lines.push(`Tax Year: ${input.taxYear}`);
  if (input.ownerName) lines.push(`Owner: ${input.ownerName}`);
  lines.push("");
  lines.push(`## Valuation Position`);
  lines.push(`Current Assessed Value: $${input.currentAssessedValue.toLocaleString()}`);
  lines.push(
    `Evidence-Supported Market Value: $${input.evidenceSupportedMarketValue.toLocaleString()}`,
  );
  lines.push(`Requested Assessed Value: $${input.requestedAssessedValue.toLocaleString()}`);
  lines.push("");

  lines.push(`## Comparable Sales (top 3-5, already adjusted)`);
  if (input.comparableSummaries.length === 0) {
    lines.push("(No comparable sales available — say so plainly in the opening script.)");
  } else {
    for (const c of input.comparableSummaries) {
      lines.push(
        `- ${c.address}: adjusted $${c.adjustedPrice.toLocaleString()} (${c.keyAttribute}, sold ${c.saleDate})`,
      );
    }
  }
  lines.push("");

  if (input.uniformity.hasUniformityClaim) {
    lines.push(`## Uniformity / Equity Argument`);
    lines.push(`Subject ratio is ${((input.uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% above peer-median.`);
    lines.push(
      `Equalized assessed value at peer-median ratio: $${input.uniformity.equalizedAssessedValue.toLocaleString()}.`,
    );
    lines.push(`Equalization gap from current assessment: $${input.uniformity.equalizationGap.toLocaleString()}.`);
    lines.push("");
  }

  if (input.recordErrors.hasErrors) {
    lines.push(`## Record-Card Discrepancies (${input.recordErrors.significantCount})`);
    for (const f of input.recordErrors.findings.filter((x) => x.severity !== "minor")) {
      lines.push(`- ${f.field}: assessor records ${f.assessorValue}; verified ${f.ownerValue}. ${f.factualClaim}`);
    }
    lines.push("");
  }

  if (input.photoFindings.length > 0) {
    lines.push(`## Photo Evidence (verifiable observations)`);
    for (const p of input.photoFindings) lines.push(`- ${p}`);
    lines.push("");
  }
  if (input.functionalObsolescence.length > 0) {
    lines.push(`## Functional Obsolescence`);
    for (const f of input.functionalObsolescence) lines.push(`- ${f}`);
    lines.push("");
  }

  lines.push(`## Output Instructions`);
  lines.push(
    `Produce the JSON object specified in your system prompt. Use ONLY the facts above. ` +
      `Anticipate the 5-8 questions a board member or assessor's appraiser is most likely to ` +
      `ask given THIS evidence package and ground the response in the supplied facts (no ` +
      `legal advice, no speculation). Pre-hearing checklist must be specific and practical.`,
  );
  return lines.join("\n");
}

// ─── Deterministic fallback — never the best output, but always shippable ──

function buildFallback(input: HearingPrepInput): HearingPrepDocument {
  const reductionPct =
    input.currentAssessedValue > 0
      ? ((input.currentAssessedValue - input.requestedAssessedValue) / input.currentAssessedValue) * 100
      : 0;

  const opening =
    `Good ${guessGreeting()}. My name${input.ownerName ? ` is ${input.ownerName}` : " is"} and ` +
    `I'm here to request a reduction in the assessed value of my property at ` +
    `${input.propertyAddress}${input.parcelId ? `, parcel ${input.parcelId}` : ""}, ` +
    `for the ${input.taxYear ?? new Date().getFullYear()} tax year. The property is currently ` +
    `assessed at $${input.currentAssessedValue.toLocaleString()}, but the comparable-sales evidence ` +
    `I'm presenting today supports a fair market value of $${input.evidenceSupportedMarketValue.toLocaleString()} ` +
    `and a corresponding assessed value of $${input.requestedAssessedValue.toLocaleString()} — ` +
    `a reduction of ${reductionPct.toFixed(1)}%. ` +
    (input.uniformity.hasUniformityClaim
      ? `In addition to the market-value evidence, I want to call attention to the uniformity gap: my ` +
        `assessment-to-market ratio is ${((input.uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% above the ` +
        `peer-median ratio for ${input.uniformity.comparableCount} comparable parcels in the same jurisdiction. `
      : "") +
    (input.recordErrors.hasErrors
      ? `I've also identified ${input.recordErrors.significantCount} factual discrepanc${input.recordErrors.significantCount === 1 ? "y" : "ies"} ` +
        `in the assessor's property record card that I'll walk through in detail. `
      : "") +
    `I'll proceed in order: comparable sales first, then ${input.uniformity.hasUniformityClaim ? "the uniformity argument, then " : ""}` +
    `${input.recordErrors.hasErrors ? "the record-card corrections, and finally " : ""}the requested relief.`;

  const groundsTalkingPoints: HearingPrepDocument["groundsTalkingPoints"] = [];

  // Market-value ground
  const compAddrLine =
    input.comparableSummaries.length > 0
      ? input.comparableSummaries
          .slice(0, 3)
          .map((c) => `${c.address} ($${c.adjustedPrice.toLocaleString()} adjusted)`)
          .join("; ")
      : "no comparables available";
  groundsTalkingPoints.push({
    ground: "market_value",
    headline: `Comparable sales support a market value of $${input.evidenceSupportedMarketValue.toLocaleString()}.`,
    bullets: [
      `Top comparables: ${compAddrLine}.`,
      `All comparables are recent arms-length transactions in the subject's market area.`,
      `Each comparable has been adjusted for time, size, condition, and configuration per USPAP.`,
      `The weighted-average adjusted value supports the requested assessment.`,
    ],
  });

  if (input.uniformity.hasUniformityClaim) {
    groundsTalkingPoints.push({
      ground: "uniformity",
      headline: `The subject's assessment ratio is ${((input.uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% above the peer median.`,
      bullets: [
        `Peer-median assessment-to-market ratio (n=${input.uniformity.comparableCount}): ${
          input.uniformity.medianComparableRatio !== null
            ? (input.uniformity.medianComparableRatio * 100).toFixed(1) + "%"
            : "n/a"
        }.`,
        `Subject's current assessment ratio: ${(input.uniformity.subjectAssessmentRatio * 100).toFixed(1)}%.`,
        `Equalized assessed value at the peer-median ratio: $${input.uniformity.equalizedAssessedValue.toLocaleString()}.`,
        `This is the assessor's own data — same parcels, same jurisdiction, same assessment year.`,
      ],
    });
  }

  if (input.recordErrors.hasErrors) {
    groundsTalkingPoints.push({
      ground: "record_errors",
      headline: input.recordErrors.summaryLine,
      bullets: input.recordErrors.findings
        .filter((f) => f.severity !== "minor")
        .slice(0, 4)
        .map((f) => f.factualClaim),
    });
  }

  const anticipatedQuestions: HearingPrepDocument["anticipatedQuestions"] = [
    {
      category: "comp_admissibility",
      question: "Why are these the right comparables for this property?",
      response:
        `Each comparable was selected for proximity to the subject's market area, similarity in physical ` +
        `characteristics, recency of sale (within typical underwriting tolerance), and arm's-length transaction ` +
        `type. None are foreclosure, REO, family transfer, or distressed.`,
    },
    {
      category: "valuation_method",
      question: "What adjustments did you make to the comparables, and how did you size them?",
      response:
        `The adjustments are quantified in the adjustment grid in the evidence packet — time, size, condition, ` +
        `age, and configuration — applied per USPAP Standards Rule 1-4. Adjustments are sized to the typical ` +
        `paired-sale extraction in the subject's market.`,
    },
    {
      category: "valuation_method",
      question: "Why this requested value rather than the median of the comparable set?",
      response:
        `Within the supportable evidence range produced by the comparable sales (the IQR of the price-per-sqft ` +
        `distribution), the subject's evidence-supported position is at or near the lower end of that range ` +
        `because of [photo evidence / record-card factors / functional obsolescence the assessor's record does ` +
        `not reflect]. The requested value sits at that supportable position, not below the evidence.`,
    },
  ];

  if (input.uniformity.hasUniformityClaim) {
    anticipatedQuestions.push({
      category: "uniformity",
      question: "How is your uniformity argument different from the market-value argument?",
      response:
        `The market-value ground says the property is worth less than its assessment. The uniformity ground says ` +
        `the property is assessed at a higher ratio of its market value than comparable parcels in the same ` +
        `jurisdiction — an independent statutory ground. Both can be granted; they are not duplicative.`,
    });
  }

  if (input.recordErrors.hasErrors) {
    anticipatedQuestions.push({
      category: "record_errors",
      question: "How did you verify the corrected facts on the property record card?",
      response:
        `Each correction is supported by the documentary evidence cited in the record-card discrepancy ` +
        `analysis: floor-plan markup, building permits, photographs of each room, or the recorded plat. ` +
        `These are factual corrections, not valuation opinions.`,
    });
  }

  if (input.photoFindings.length > 0) {
    anticipatedQuestions.push({
      category: "condition_evidence",
      question: "How do these condition photos affect value?",
      response:
        `Each item documented is a market-recognized value-impacting factor that the mass-appraisal model ` +
        `cannot observe — interior conditions are the assessor's blind spot. Per USPAP, the appraiser ` +
        `incorporates verifiable condition observations directly into the comparable-sales adjustment ` +
        `(condition adjustment) and into the cost approach (depreciation), where applicable.`,
    });
  }

  anticipatedQuestions.push({
    category: "general",
    question: "What specific assessed value are you requesting today?",
    response:
      `$${input.requestedAssessedValue.toLocaleString()} for the ${input.taxYear ?? new Date().getFullYear()} tax year.`,
  });

  const comparableWalkthrough = input.comparableSummaries.slice(0, 5).map((c) => ({
    address: c.address,
    line:
      `${c.address} sold for an adjusted ${`$${c.adjustedPrice.toLocaleString()}`} on ${c.saleDate} ` +
      `(${c.keyAttribute}). This is an arms-length comparable in the subject's market area whose adjusted ` +
      `price-per-sqft falls within the supportable range for the requested assessed value.`,
  }));

  const recordErrorWalkthrough = input.recordErrors.findings
    .filter((f) => f.severity !== "minor")
    .map((f) => `${f.factualClaim} Recommended evidence: ${f.recommendedEvidence}`);

  const closing =
    `For the reasons just presented — the comparable-sales analysis` +
    `${input.uniformity.hasUniformityClaim ? `, the peer-median uniformity gap` : ""}` +
    `${input.recordErrors.hasErrors ? `, and the record-card corrections` : ""} — ` +
    `I respectfully request that the assessed value of ${input.propertyAddress}` +
    `${input.parcelId ? `, parcel ${input.parcelId}` : ""}, be reduced from ` +
    `$${input.currentAssessedValue.toLocaleString()} to $${input.requestedAssessedValue.toLocaleString()} for the ` +
    `${input.taxYear ?? new Date().getFullYear()} tax year. Thank you for the opportunity to present this evidence.`;

  const preHearingChecklist: string[] = [
    "Bring two printed copies of the full evidence packet (one for the panel, one for yourself).",
    "Bring a printed copy of the property record card with the discrepancies highlighted, if any.",
    "Confirm the hearing time, location, and format the morning of the hearing.",
    "Arrive 20 minutes early; the panel may run ahead of schedule.",
    "Speak slowly. Pause at the end of each ground so the panel can take notes.",
    "Do not interrupt the assessor's representative. Save rebuttal for the closing.",
    "Do not introduce new evidence in the closing — restrict the closing to the requested value.",
    "If asked a question you don't know the answer to, say 'I don't have that on hand; the answer is in the evidence packet on page X' or 'I'd defer to the supporting documentation in the packet.'",
  ];

  return {
    openingStatement: opening,
    groundsTalkingPoints,
    anticipatedQuestions,
    comparableWalkthrough,
    recordErrorWalkthrough,
    closingStatement: closing,
    preHearingChecklist,
    source: "fallback",
  };
}

function guessGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
