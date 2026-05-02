/**
 * Assessor Persuasion Brief Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates the single most persuasive document in a property tax appeal: the
 * audience-aware cover brief that sits on top of the evidence packet.
 *
 * Per expert practitioners, a board member or assessor reads the cover brief
 * in 60 seconds and decides whether to engage with the underlying evidence
 * at all. Three observations from current best practice (AppealDesk 2026,
 * Cook County BOR, Walker Advisory):
 *
 *   1. State a SPECIFIC requested value. Open-ended asks lose.
 *   2. Lead with the strongest of THREE legal grounds:
 *        (a) market value (subject is over-valued vs. comparable sales),
 *        (b) lack of uniformity (subject is over-assessed vs. peer parcels),
 *        (c) record errors (assessor's data differs from verified facts).
 *      All three are recognized statutory grounds in nearly every state.
 *   3. Strip emotional / irrelevant content ("unfair", "I can't afford",
 *      "my neighbor pays less"). Boards evaluate evidence, not hardship.
 *
 * Audience-aware tone (driven by report_preferences.target_audience):
 *   • assessor  — formal, neutral, data-only, third-person, no advocacy
 *                 verbs. Treats the assessor as a reasonable counterparty
 *                 who responds to professional evidence, not pressure.
 *   • board     — slightly more narrative, can frame the comp distribution
 *                 as a "supportable range" with the subject anchored at the
 *                 lower end. Still strictly evidence-based.
 *   • attorney  — densest. Includes statutory citations placeholder, full
 *                 jurisdictional context, and an explicit prayer for relief.
 *   • owner     — most explanatory. Defines uncommon terms, explains why
 *                 each ground matters, no jargon without translation.
 *
 * Powered by Claude Opus 4.7 with prompt caching on the system prompt and
 * adaptive thinking on the brief synthesis. Falls back to a deterministic
 * locally-rendered brief if Claude is unavailable so the pipeline never
 * blocks on this step.
 */

import { generateNarrativeWithClaude, isClaudeAvailable } from "../_core/claude";
import type { UniformityResult } from "./uniformityAnalyzer";
import type { RecordErrorReport } from "./recordErrorDetector";

export type BriefAudience = "assessor" | "board" | "attorney" | "owner";

export interface PersuasionBriefInput {
  audience: BriefAudience;
  ownerName?: string;
  propertyAddress: string;
  parcelId?: string | null;
  taxYear?: number | null;
  jurisdiction: string; // e.g., "Cook County, Illinois"
  currentAssessedValue: number;
  requestedAssessedValue: number;
  evidenceSupportedMarketValue: number;
  /** Effective tax rate as a decimal (e.g. 0.012). */
  effectiveTaxRate: number;
  /** Annual property-tax savings if the requested value is granted. */
  estimatedAnnualSavings: number;
  /** Top 3-5 verifiable comparable summaries — addresses + adjusted prices. */
  comparableSummaries: string[];
  /** Output of the uniformity analyzer. */
  uniformity: UniformityResult;
  /** Output of the record-error detector. */
  recordErrors: RecordErrorReport;
  /** Photo evidence: 1-3 short factual phrases, no advocacy verbs. */
  photoFindings: string[];
  /** Functional obsolescence items found, if any. */
  functionalObsolescence: string[];
  /** Appeal deadline ISO string, when known. */
  appealDeadline?: string | null;
}

export interface PersuasionBrief {
  audience: BriefAudience;
  /** 1-paragraph executive summary that survives the "60-second test". */
  sixtySecondSummary: string;
  /** Multi-section formal brief — markdown. */
  formalBrief: string;
  /** Ordered exhibit index for the evidence packet. */
  exhibitIndex: Array<{ tag: string; title: string; description: string }>;
  /** Specific requested relief sentence, ready to drop into a hearing. */
  prayerForRelief: string;
  /** The three legal grounds, ranked strongest-first for this case. */
  rankedGrounds: Array<{
    ground: "market_value" | "uniformity" | "record_errors";
    strength: number; // 0-100
    headline: string;
    bullets: string[];
  }>;
  /** Source: which generator produced the brief. */
  source: "claude" | "fallback";
}

// ─── Deterministic exhibit index ────────────────────────────────────────────

function buildExhibitIndex(
  input: PersuasionBriefInput,
): PersuasionBrief["exhibitIndex"] {
  const idx: PersuasionBrief["exhibitIndex"] = [];
  let n = 0;
  const tag = () => String.fromCharCode("A".charCodeAt(0) + n++);

  if (input.comparableSummaries.length > 0) {
    idx.push({
      tag: `Exhibit ${tag()}`,
      title: "Comparable Sales Analysis with Adjustment Grid",
      description:
        `${input.comparableSummaries.length} comparable arms-length sales within the subject's market area, ` +
        `each adjusted for time, location, condition, size, age, and configuration ` +
        `differences per USPAP guidelines.`,
    });
  }
  if (input.uniformity.hasUniformityClaim) {
    idx.push({
      tag: `Exhibit ${tag()}`,
      title: "Assessment Uniformity / Equalization Analysis",
      description:
        `Per-parcel assessment-to-sale-price ratios for ${input.uniformity.comparableCount} comparable ` +
        `parcels in the same taxing jurisdiction, demonstrating the subject's ratio is ` +
        `${((input.uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% above the peer median.`,
    });
  }
  if (input.recordErrors.hasErrors) {
    idx.push({
      tag: `Exhibit ${tag()}`,
      title: "Property Record Card — Discrepancy Analysis",
      description:
        `${input.recordErrors.significantCount} field-level discrepanc${input.recordErrors.significantCount === 1 ? "y" : "ies"} ` +
        `identified between the assessor's property record card and the owner-verified ` +
        `physical characteristics of the parcel.`,
    });
  }
  if (input.photoFindings.length > 0) {
    idx.push({
      tag: `Exhibit ${tag()}`,
      title: "Photographic Evidence of Property Condition",
      description:
        `Owner-supplied photographs documenting condition factors not observable from the ` +
        `public right-of-way, with USPAP C-rated condition observations.`,
    });
  }
  if (input.functionalObsolescence.length > 0) {
    idx.push({
      tag: `Exhibit ${tag()}`,
      title: "Functional Obsolescence Schedule",
      description:
        `Itemized list of building components and design elements that the market has ` +
        `priced down but which may not be reflected in the current assessment.`,
    });
  }
  return idx;
}

// ─── Three-grounds ranking ──────────────────────────────────────────────────

function rankGrounds(input: PersuasionBriefInput): PersuasionBrief["rankedGrounds"] {
  const marketGap = input.currentAssessedValue - input.evidenceSupportedMarketValue;
  const marketGapPct =
    input.currentAssessedValue > 0 ? (marketGap / input.currentAssessedValue) * 100 : 0;

  const marketStrength = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (marketGapPct >= 20 ? 90 : marketGapPct >= 10 ? 75 : marketGapPct >= 5 ? 55 : 25) +
          Math.min(15, input.comparableSummaries.length * 3),
      ),
    ),
  );

  const grounds: PersuasionBrief["rankedGrounds"] = [
    {
      ground: "market_value",
      strength: marketStrength,
      headline:
        `The subject's evidence-supported fair market value is $${input.evidenceSupportedMarketValue.toLocaleString()}, ` +
        `compared to the current assessed value of $${input.currentAssessedValue.toLocaleString()} ` +
        `(an over-assessment of ${marketGapPct.toFixed(1)}%).`,
      bullets: input.comparableSummaries.slice(0, 5),
    },
    {
      ground: "uniformity",
      strength: input.uniformity.uniformityStrength,
      headline:
        input.uniformity.hasUniformityClaim
          ? `The subject's assessment-to-market-value ratio is ${((input.uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% ` +
            `above the median ratio of comparable parcels in the same jurisdiction.`
          : `Insufficient assessment-roll data on comparable parcels to substantiate an independent uniformity claim.`,
      bullets: input.uniformity.hasUniformityClaim
        ? [
            input.uniformity.uniformityArgument,
            `Equalized assessed value at peer-group median ratio: $${input.uniformity.equalizedAssessedValue.toLocaleString()}.`,
            `Equalization gap from current assessment: $${input.uniformity.equalizationGap.toLocaleString()}.`,
          ]
        : [],
    },
    {
      ground: "record_errors",
      strength: input.recordErrors.errorStrength,
      headline: input.recordErrors.summaryLine,
      bullets: input.recordErrors.findings
        .filter((f) => f.severity !== "minor")
        .slice(0, 4)
        .map((f) => f.factualClaim),
    },
  ];

  return grounds.sort((a, b) => b.strength - a.strength);
}

// ─── Anti-emotion validator ─────────────────────────────────────────────────

const DISALLOWED_PHRASES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(this is unfair|so unfair|completely unfair|that's unfair)\b/gi, replacement: "[disparate]" },
  { pattern: /\b(i can'?t afford|cannot afford|can not afford)\b/gi, replacement: "[is not the basis of this appeal]" },
  { pattern: /\b(my neighbor pays less|neighbors pay less)\b/gi, replacement: "[peer parcels carry lower assessment ratios — see uniformity exhibit]" },
  { pattern: /\b(unjust|outrageous|ridiculous|absurd|insane)\b/gi, replacement: "[disparate]" },
  { pattern: /\b(please have mercy|begging you|hardship|struggling)\b/gi, replacement: "[respectfully request]" },
];

/** Strip / replace emotional language. Keeps the brief evidence-grade. */
export function sanitizePersuasionText(text: string): string {
  let cleaned = text;
  for (const { pattern, replacement } of DISALLOWED_PHRASES) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  return cleaned;
}

// ─── Audience-aware Claude system prompt ────────────────────────────────────

const BRIEF_SYSTEM_PROMPT_BASE =
  "You are a senior valuation analyst preparing the cover brief that accompanies a property " +
  "tax appeal evidence packet. Your client is the property owner; the work product enters the " +
  "official appeal record. You write in evidence-grade language: short, neutral, verifiable, " +
  "third-person. You make NO emotional appeals, NO claims about hardship or fairness, NO " +
  "comparisons to neighbors' tax burden, NO speculation. You ground every assertion in the " +
  "facts the user supplies and you NEVER invent data.\n\n" +
  "Your brief presents up to THREE recognized statutory grounds for assessment relief: " +
  "(1) excessive market value, (2) lack of uniformity, and (3) errors of fact in the assessor's " +
  "property record card. You lead with the strongest ground for the case, omit grounds that lack " +
  "evidence, and you specify a precise requested assessed value with its derivation. The brief " +
  "must survive the '60-second test' — a board member or assessor must understand the " +
  "core argument and the requested relief from a single careful read of the executive summary.\n\n" +
  "OUTPUT FORMAT: valid JSON only, no markdown fences, with these exact fields:\n" +
  "{\n" +
  '  "sixtySecondSummary": string,            // Single paragraph, ≤140 words, ' +
  "states (a) parcel + jurisdiction + tax year, (b) current assessed value, (c) requested " +
  "assessed value, (d) the strongest of the three grounds, (e) the resulting tax savings.\n" +
  '  "formalBrief": string,                   // Multi-section markdown brief. Sections: ' +
  "## Subject Property, ## Requested Relief, ## Grounds for Appeal (numbered subsections per ground), " +
  "## Evidence Index, ## Conclusion. No emotional language.\n" +
  '  "prayerForRelief": string                // One sentence: "The owner respectfully ' +
  'requests the [body] reduce the assessed value of [parcel] from $X to $Y for the [year] tax year."\n' +
  "}\n";

const AUDIENCE_TONE_OVERLAYS: Record<BriefAudience, string> = {
  assessor:
    "AUDIENCE: The county assessor or assessor's appraisal staff. Tone: most formal and most " +
    "neutral. Treat the assessor as a reasonable professional counterparty. Avoid any language " +
    "that implies bad faith. Lead with comparable-sales data and uniformity ratios — the " +
    "assessor's own data sources. Frame the brief as a request for the assessor to apply " +
    "their own methodology consistently.",

  board:
    "AUDIENCE: A volunteer Board of Equalization or Board of Review. Tone: formal but slightly " +
    "more narrative. Members may be non-lawyers; avoid acronyms without expansion. Place the " +
    "subject within the supportable comparable-sales price band and explain why the lower end " +
    "of that band is the evidence-supported anchor.",

  attorney:
    "AUDIENCE: An attorney representing the owner at a hearing. Tone: densest, most formal. " +
    "Include statutory ground references in placeholder form like [STATE STATUTE: cite uniformity " +
    "clause] for the attorney to fill in. Include an explicit prayer for relief in legal form. " +
    "Reference the precise comparable sale dates and per-comp adjustments.",

  owner:
    "AUDIENCE: The property owner reviewing the brief before filing. Tone: most explanatory. " +
    "Define each technical term (cap rate, assessment ratio, etc.) inline on first use. Explain " +
    "WHY each ground matters and what the owner should bring to the hearing to support it. " +
    "Still strictly evidence-based — never sympathetic or apologetic.",
};

// ─── Public entry point ─────────────────────────────────────────────────────

export async function generateAssessorPersuasionBrief(
  input: PersuasionBriefInput,
): Promise<PersuasionBrief> {
  const exhibitIndex = buildExhibitIndex(input);
  const rankedGrounds = rankGrounds(input);
  const prayerForReliefDeterministic =
    `The owner respectfully requests that the assessed value of ${input.propertyAddress}` +
    `${input.parcelId ? ` (Parcel ${input.parcelId})` : ""} be reduced from ` +
    `$${input.currentAssessedValue.toLocaleString()} to $${input.requestedAssessedValue.toLocaleString()} ` +
    `for the ${input.taxYear ?? new Date().getFullYear()} tax year, resulting in an estimated annual ` +
    `tax-burden reduction of $${input.estimatedAnnualSavings.toLocaleString()}.`;

  // ─── Try Claude first ────────────────────────────────────────────────────
  if (isClaudeAvailable()) {
    try {
      const userContent = buildUserPrompt(input, exhibitIndex, rankedGrounds);
      const systemPrompt =
        BRIEF_SYSTEM_PROMPT_BASE + "\n\n" + AUDIENCE_TONE_OVERLAYS[input.audience];

      const raw = await generateNarrativeWithClaude({
        systemPrompt,
        userContent,
        maxTokens: 4096,
      });

      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
      const parsed = JSON.parse(slice) as {
        sixtySecondSummary: string;
        formalBrief: string;
        prayerForRelief: string;
      };

      return {
        audience: input.audience,
        sixtySecondSummary: sanitizePersuasionText(parsed.sixtySecondSummary || ""),
        formalBrief: sanitizePersuasionText(parsed.formalBrief || ""),
        exhibitIndex,
        prayerForRelief: sanitizePersuasionText(
          parsed.prayerForRelief || prayerForReliefDeterministic,
        ),
        rankedGrounds,
        source: "claude",
      };
    } catch (err) {
      console.warn(
        "[AssessorPersuasionBrief] Claude generation failed; using fallback:",
        (err as Error).message,
      );
      // fall through to deterministic fallback
    }
  }

  // ─── Deterministic fallback ──────────────────────────────────────────────
  const summary = buildFallbackSummary(input);
  const formal = buildFallbackFormal(input, exhibitIndex, rankedGrounds);
  return {
    audience: input.audience,
    sixtySecondSummary: sanitizePersuasionText(summary),
    formalBrief: sanitizePersuasionText(formal),
    exhibitIndex,
    prayerForRelief: prayerForReliefDeterministic,
    rankedGrounds,
    source: "fallback",
  };
}

function buildUserPrompt(
  input: PersuasionBriefInput,
  exhibitIndex: PersuasionBrief["exhibitIndex"],
  rankedGrounds: PersuasionBrief["rankedGrounds"],
): string {
  const grounds = rankedGrounds
    .filter((g) => g.strength > 10)
    .map(
      (g, i) =>
        `### Ground ${i + 1} of ${rankedGrounds.filter((x) => x.strength > 10).length} — ${labelFor(g.ground)} (strength ${g.strength}/100)\n` +
        `Headline: ${g.headline}\n` +
        (g.bullets.length ? "Supporting bullets:\n" + g.bullets.map((b) => `  • ${b}`).join("\n") : ""),
    )
    .join("\n\n");

  return [
    `## Subject Property`,
    `Address: ${input.propertyAddress}`,
    input.parcelId ? `Parcel ID: ${input.parcelId}` : "",
    `Jurisdiction: ${input.jurisdiction}`,
    input.taxYear ? `Tax Year: ${input.taxYear}` : "",
    "",
    `## Valuation Position`,
    `Current Assessed Value: $${input.currentAssessedValue.toLocaleString()}`,
    `Evidence-Supported Market Value: $${input.evidenceSupportedMarketValue.toLocaleString()}`,
    `Requested Assessed Value: $${input.requestedAssessedValue.toLocaleString()}`,
    `Effective Tax Rate (used for savings calc): ${(input.effectiveTaxRate * 100).toFixed(3)}%`,
    `Estimated Annual Tax Savings If Granted: $${input.estimatedAnnualSavings.toLocaleString()}`,
    input.appealDeadline ? `Appeal Deadline: ${input.appealDeadline}` : "",
    "",
    `## Available Grounds (ranked strongest-first)`,
    grounds,
    "",
    `## Photo Evidence (verifiable observations)`,
    input.photoFindings.length ? input.photoFindings.map((p) => `• ${p}`).join("\n") : "(no photo evidence available)",
    "",
    `## Functional Obsolescence Items`,
    input.functionalObsolescence.length
      ? input.functionalObsolescence.map((f) => `• ${f}`).join("\n")
      : "(none identified)",
    "",
    `## Exhibit Index (already prepared, do not invent additions)`,
    exhibitIndex.map((e) => `${e.tag}: ${e.title} — ${e.description}`).join("\n"),
    "",
    `## Output Instructions`,
    `Produce the JSON object specified in your system prompt. Use ONLY the facts above. ` +
      `Lead with the strongest ground (Ground 1). Reference exhibits by tag. Specify the requested ` +
      `value with its derivation. Survive the 60-second test.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function labelFor(g: "market_value" | "uniformity" | "record_errors"): string {
  return g === "market_value"
    ? "Excessive Market Value"
    : g === "uniformity"
      ? "Lack of Uniformity"
      : "Errors of Fact in Assessor's Record";
}

function buildFallbackSummary(input: PersuasionBriefInput): string {
  const gap = input.currentAssessedValue - input.requestedAssessedValue;
  const pct = input.currentAssessedValue > 0 ? (gap / input.currentAssessedValue) * 100 : 0;
  return (
    `${input.propertyAddress}${input.parcelId ? ` (Parcel ${input.parcelId})` : ""}, ` +
    `${input.jurisdiction}${input.taxYear ? `, ${input.taxYear} tax year` : ""}: the property is ` +
    `currently assessed at $${input.currentAssessedValue.toLocaleString()}; the evidence supports a ` +
    `fair market value of $${input.evidenceSupportedMarketValue.toLocaleString()} and a corresponding ` +
    `assessed value of $${input.requestedAssessedValue.toLocaleString()} — a reduction of ` +
    `${pct.toFixed(1)}%. The case rests on the comparable-sales analysis (Exhibit A)` +
    `${input.uniformity.hasUniformityClaim ? `, the uniformity / equalization analysis showing the subject ${((input.uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% above the peer-median assessment ratio` : ""}` +
    `${input.recordErrors.hasErrors ? `, and ${input.recordErrors.significantCount} record-level discrepanc${input.recordErrors.significantCount === 1 ? "y" : "ies"} between the assessor's property record card and the owner-verified facts of record` : ""}. ` +
    `If granted, the requested reduction yields an estimated annual tax-burden reduction of ` +
    `$${input.estimatedAnnualSavings.toLocaleString()}.`
  );
}

function buildFallbackFormal(
  input: PersuasionBriefInput,
  exhibitIndex: PersuasionBrief["exhibitIndex"],
  rankedGrounds: PersuasionBrief["rankedGrounds"],
): string {
  const lines: string[] = [];
  lines.push(`## Subject Property`);
  lines.push(`- **Address:** ${input.propertyAddress}`);
  if (input.parcelId) lines.push(`- **Parcel ID:** ${input.parcelId}`);
  lines.push(`- **Taxing Jurisdiction:** ${input.jurisdiction}`);
  if (input.taxYear) lines.push(`- **Tax Year:** ${input.taxYear}`);
  lines.push("");
  lines.push(`## Requested Relief`);
  lines.push(
    `- **Current Assessed Value:** $${input.currentAssessedValue.toLocaleString()}`,
  );
  lines.push(
    `- **Requested Assessed Value:** $${input.requestedAssessedValue.toLocaleString()}`,
  );
  lines.push(
    `- **Evidence-Supported Market Value:** $${input.evidenceSupportedMarketValue.toLocaleString()}`,
  );
  lines.push(
    `- **Estimated Annual Tax-Burden Reduction:** $${input.estimatedAnnualSavings.toLocaleString()} ` +
      `(at effective rate ${(input.effectiveTaxRate * 100).toFixed(3)}%)`,
  );
  lines.push("");
  lines.push(`## Grounds for Appeal`);
  let n = 0;
  for (const g of rankedGrounds) {
    if (g.strength <= 10) continue;
    n++;
    lines.push(`### ${n}. ${labelFor(g.ground)} (Evidence Strength ${g.strength}/100)`);
    lines.push(g.headline);
    lines.push("");
    if (g.bullets.length > 0) {
      for (const b of g.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (input.photoFindings.length > 0) {
    lines.push(`## Property Condition (Photographic Evidence)`);
    for (const p of input.photoFindings) lines.push(`- ${p}`);
    lines.push("");
  }
  if (input.functionalObsolescence.length > 0) {
    lines.push(`## Functional Obsolescence`);
    for (const f of input.functionalObsolescence) lines.push(`- ${f}`);
    lines.push("");
  }
  lines.push(`## Evidence Index`);
  for (const e of exhibitIndex) lines.push(`- **${e.tag}:** ${e.title} — ${e.description}`);
  lines.push("");
  lines.push(`## Conclusion`);
  lines.push(
    `Based on the comparable-sales analysis, the uniformity / equalization data, and the ` +
      `record-level discrepancies enumerated above, the evidence supports an assessed value of ` +
      `$${input.requestedAssessedValue.toLocaleString()} for ${input.propertyAddress}` +
      `${input.taxYear ? ` for the ${input.taxYear} tax year` : ""}.`,
  );
  return lines.join("\n");
}
