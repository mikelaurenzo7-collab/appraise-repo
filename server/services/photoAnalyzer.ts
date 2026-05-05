/**
 * Photo Analyzer Service
 *
 * Uses LLM vision to extract evidence-based condition observations from
 * user-supplied property photos. The output is descriptive, factual, and
 * intended to support — never replace — comparable-sales-based valuation.
 *
 * Design principles:
 *  - Observation, not advocacy: we describe what is visible (e.g. "shingle
 *    granule loss visible on south slope"), we do not draft legal arguments.
 *  - Evidence-grade language: usable verbatim in a tax-appeal hearing without
 *    rewriting.
 *  - Graceful failure: if the LLM call fails or times out, the pipeline still
 *    completes — photo analysis is additive, never blocking.
 */

import { invokeLLM } from "../_core/llm";
import { analyzePhotoWithClaude, isClaudeAvailable } from "../_core/claude";
import { llmCacheSource } from "../_core/llmProviders";
import { hashLLMInput, withLLMCache } from "../_core/lcache";
import type { SubmissionPhoto } from "../db";
import { scopedLogger } from "../_core/logger";

const log = scopedLogger("PhotoAnalyzer");

/**
 * SSRF guard — reject any URL that isn't https://.
 * Without this, a user-supplied url like file:///etc/passwd or an internal
 * Manus metadata endpoint would be sent to the vision LLM and its content
 * leaked in the response.
 */
function assertSafePhotoUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid photo URL: ${url}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(
      `Unsafe photo URL scheme "${parsed.protocol}" — only https:// is allowed`
    );
  }
}

export interface PhotoFinding {
  url: string;
  category: SubmissionPhoto["category"];
  caption?: string;
  /** 0-100; higher = property is in BETTER condition than typical (for owner) */
  conditionScore: number;
  /** Descriptive condition rating */
  conditionLabel: "excellent" | "good" | "average" | "fair" | "poor";
  /** USPAP C1-C6 condition rating */
  uspapRating?: "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
  /** Concrete, verifiable observations (max ~7 short bullets) */
  observations: string[];
  /** Items that support a downward valuation adjustment */
  valueImpactingIssues: string[];
  /** Functional obsolescence items identified */
  functionalObsolescence: string[];
  /** Issues the assessor cannot know without interior access — uniquely powerful */
  assessorBlindSpots: string[];
  /** Dollar-range cost-to-cure estimates per value-impacting issue */
  costToCure?: Array<{ low: number; high: number; description: string }>;
  /** 0-100; how strongly this single photo supports the appeal narrative */
  evidenceStrength: number;
}

export interface PhotoAnalysisSummary {
  findings: PhotoFinding[];
  /** Aggregate condition score (weighted avg of conditionScore) */
  overallConditionScore: number;
  /** Aggregate evidence strength (max across findings, capped) */
  overallEvidenceStrength: number;
  /** Suggested appeal-strength delta in points; negative = lower bar than data alone */
  appealStrengthDelta: number;
  /** Top observations across all photos, deduped (max 6) */
  topObservations: string[];
  /** Top value-impacting issues across all photos, deduped (max 6) */
  topValueIssues: string[];
  /** Functional obsolescence items found across all photos */
  functionalObsolescenceItems: string[];
  /** Interior/hidden defects the assessor cannot know (their blind spot) */
  assessorBlindSpotItems: string[];
  /** USPAP condition ratings found, e.g. ["C3", "C4"] */
  uspapRatings: string[];
  /** One-paragraph professional summary suitable for the PDF report */
  summaryParagraph: string;
  /** Formatted block ready to inject into the appraisal LLM prompt */
  llmContext: string;
  /** Sum of midpoint cost-to-cure estimates across all findings (dollars) */
  costToCureTotal?: number;
  /** Flat list of every cost-to-cure entry across all findings (PDF-ready) */
  costToCureItems?: Array<{ low: number; high: number; description: string }>;
}

const PHOTO_VISION_TIMEOUT_MS = 25_000;

// Stable system prompt — prompt-cached by Claude when multiple photos are
// analyzed in sequence (e.g. the 8-photo cap per submission). The cache
// eliminates repeated input-token costs for the identical instructions.
// PHOTO_SYSTEM_PROMPT — the single most important lever for photo-based advocacy.
//
// Property tax assessors almost never have interior access. They drive by,
// snap a street photo, and rely on permit records that may be years out of date.
// Our client's uploaded photos are a legally powerful evidentiary advantage that
// the assessor literally cannot rebut without an interior inspection.
//
// This prompt trains the vision model to:
//   1. Identify USPAP Condition Ratings C1–C6 and explain each one
//   2. Catch functional obsolescence the assessor missed entirely
//   3. Produce evidence-grade language — short, neutral, verifiable phrases that
//      survive cross-examination without puffery or speculation
//   4. Flag interior-specific defects (the assessor's blind spot):
//      outdated kitchens/baths, exposed/damaged mechanicals, moisture intrusion,
//      structural settling, deferred maintenance throughout
//   5. Size the valuation impact in percentage-of-value terms when clear
const PHOTO_SYSTEM_PROMPT =
  "You are a USPAP-certified property condition analyst preparing photographic " +
  "evidence for a property tax appeal. Your role is to be the best possible " +
  "advocate for the property owner, within the strict bounds of observable fact. " +
  "Assessors NEVER have interior access — interior photos you receive are " +
  "uniquely powerful evidence the assessor cannot rebut.\n\n" +
  "CONDITION RATING SCALE (USPAP C1–C6):\n" +
  "C1 = New/never occupied — no wear\n" +
  "C2 = No deferred maintenance — updated finishes if older\n" +
  "C3 = Minor deferred maintenance, cosmetic wear — normal effective age\n" +
  "C4 = Obvious deferred maintenance — mechanicals need repair soon\n" +
  "C5 = Poor condition — major repairs needed, diminished utility\n" +
  "C6 = Substantial damage — structurally compromised, needs renovation\n\n" +
  "FUNCTIONAL OBSOLESCENCE CATEGORIES (strong appeal levers):\n" +
  "• Outdated kitchen (pre-2000 cabinets, laminate surfaces, original appliances)\n" +
  "• Outdated bath (original fixtures, pink/blue tile, tub/shower combo only)\n" +
  "• Single-car or carport in a 2-car garage market\n" +
  "• Low ceiling heights (<8 ft in living areas)\n" +
  "• No central A/C in warm climate\n" +
  "• Galvanized, polybutylene, or cast-iron plumbing visible\n" +
  "• Knob-and-tube or aluminum wiring indicators\n" +
  "• Oil heat or wall-unit HVAC in forced-air market\n" +
  "• Asbestos tile, popcorn ceiling, or vermiculite visible\n" +
  "• Dated electrical panel (Zinsco, FPE, fuse box)\n\n" +
  "DEFERRED MAINTENANCE CATALOGUE (most common appeal evidence):\n" +
  "• Roof: granule loss, missing/cracked shingles, flashing failure, moss/lichen\n" +
  "• Exterior: peeling paint, wood rot, damaged siding, failing caulk\n" +
  "• Foundation: visible cracks (horizontal = severe), efflorescence, spalling\n" +
  "• Interior: water stains on ceiling/walls/floors (moisture intrusion), " +
  "soft/damaged subflooring, cracked plaster, mold indicators\n" +
  "• Windows: fogged/failed sealed units, original single-pane, wood-frame rot\n" +
  "• HVAC: visible rust, non-functioning units, age indicators\n\n" +
  "EVIDENCE LANGUAGE RULES:\n" +
  "• Describe ONLY what is VISIBLE. Never speculate beyond the image.\n" +
  "• Use short, neutral, verifiable phrases — no adjectives like 'significant' " +
  "or 'serious' unless the defect is unambiguous.\n" +
  "• Quantify when possible: 'approximately 30% of visible shingles show granule " +
  "loss', '3 ceiling stains consistent with water intrusion', '4-inch horizontal " +
  "crack in south foundation wall'.\n" +
  "• Never give legal advice, never state appeal conclusions, never recommend " +
  "specific dollar adjustments.\n\n" +
  "Output valid JSON only with these exact fields:\n" +
  "conditionScore (0-100 integer, higher = BETTER condition for the owner),\n" +
  "conditionLabel (one of: excellent | good | average | fair | poor),\n" +
  "uspapRating (one of: C1 | C2 | C3 | C4 | C5 | C6),\n" +
  "observations (array of verifiable phrases, max 7),\n" +
  "valueImpactingIssues (array of defect phrases that SUPPORT a LOWER value, max 7),\n" +
  "functionalObsolescence (array of obsolescence items found, or empty array),\n" +
  "assessorBlindSpots (array of issues the assessor cannot know without interior access, max 4),\n" +
  'costToCure: [{"low": <number>, "high": <number>, "description": "<repair description>"}]\n' +
  "  // Include ONLY when a valueImpactingIssue has a clear repair cost (roof replacement, HVAC, foundation)\n" +
  "  // Omit for cosmetic issues or when cost is speculative\n" +
  "  // Typical ranges: minor repair $500-$2k, moderate $2k-$10k, major $10k-$50k\n" +
  "evidenceStrength (0-100 integer — how strongly this single photo supports the appeal;\n" +
  "  90-100 = major defect clearly visible, 70-89 = clear condition issue, " +
  "  50-69 = moderate deferred maintenance, 30-49 = minor cosmetic, <30 = limited evidence).";

const PHOTO_FINDING_JSON_SCHEMA = {
  type: "object",
  properties: {
    conditionScore: { type: "number" },
    conditionLabel: {
      type: "string",
      enum: ["excellent", "good", "average", "fair", "poor"],
    },
    uspapRating: { type: "string", enum: ["C1", "C2", "C3", "C4", "C5", "C6"] },
    observations: { type: "array", items: { type: "string" } },
    valueImpactingIssues: { type: "array", items: { type: "string" } },
    functionalObsolescence: { type: "array", items: { type: "string" } },
    assessorBlindSpots: { type: "array", items: { type: "string" } },
    costToCure: {
      type: "array",
      items: {
        type: "object",
        properties: {
          low: { type: "number" },
          high: { type: "number" },
          description: { type: "string" },
        },
        required: ["low", "high", "description"],
        additionalProperties: false,
      },
    },
    evidenceStrength: { type: "number" },
  },
  required: [
    "conditionScore",
    "conditionLabel",
    "observations",
    "valueImpactingIssues",
    "evidenceStrength",
  ],
  additionalProperties: false,
};

const PHOTO_FINDING_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "photo_finding",
    strict: false,
    schema: PHOTO_FINDING_JSON_SCHEMA,
  },
};

async function analyzeSinglePhoto(
  photo: SubmissionPhoto
): Promise<PhotoFinding | null> {
  try {
    // SSRF guard — block non-HTTPS URLs before sending to any vision model
    assertSafePhotoUrl(photo.url);

    // Photo URLs in this app are content-addressed (S3 keys with hashes),
    // so the same URL always represents the same image. Cache the LLM
    // observations for 7 days — re-runs (admin retrigger, retry sweeps)
    // skip the vision call entirely.
    const source = llmCacheSource("claude-opus-4-7-vision");
    const photoCacheKey = `llm:photo:${source}:${hashLLMInput([photo.url, photo.category, photo.caption ?? ""])}`;
    const cachedFinding = await withLLMCache<PhotoFinding | null>(
      photoCacheKey,
      source,
      7 * 24 * 3600,
      async () => analyzeSinglePhotoUncached(photo)
    );
    return cachedFinding;
  } catch (err) {
    log.warn(`[PhotoAnalyzer] Failed to analyze photo ${photo.url}:`, {
      err: err,
    });
    return null;
  }
}

async function analyzeSinglePhotoUncached(
  photo: SubmissionPhoto
): Promise<PhotoFinding | null> {
  try {
    const categoryLabel =
      photo.category === "roof"
        ? "the roof"
        : photo.category === "foundation"
          ? "the foundation"
          : photo.category === "exterior"
            ? "the exterior of the property"
            : photo.category === "interior"
              ? "the interior of the property"
              : "the property";

    const userInstruction =
      `Photo category: ${photo.category} (showing ${categoryLabel}).\n` +
      (photo.caption ? `Owner caption: "${photo.caption}"\n` : "") +
      `This photo will be used as EVIDENCE in a property tax appeal hearing. ` +
      `The assessor has NOT seen the interior of this property — interior photos ` +
      `are uniquely powerful evidence they cannot challenge without an inspection. ` +
      `Identify EVERY condition defect, functional obsolescence item, and deferred ` +
      `maintenance issue visible. Be thorough — missing an issue means losing ` +
      `potential valuation support for the owner. ` +
      `Describe ONLY what is visible. Write as short, neutral, verifiable phrases. ` +
      `Return JSON only.`;

    let rawJson: string;

    if (isClaudeAvailable()) {
      // Claude Opus 4.7 vision with prompt-cached system prompt.
      // Claude's vision excels at subtle structural defects (hairline
      // cracks, granule loss, moisture staining) that matter most for
      // property-condition appeals.
      const claudePromise = analyzePhotoWithClaude({
        systemPrompt: PHOTO_SYSTEM_PROMPT,
        userInstruction,
        imageUrl: photo.url,
        maxTokens: 800,
        responseFormat: PHOTO_FINDING_RESPONSE_FORMAT,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("photo vision timeout")),
          PHOTO_VISION_TIMEOUT_MS
        )
      );
      rawJson = await Promise.race([claudePromise, timeoutPromise]);
    } else {
      // Anthropic API key absent — use the legacy invokeLLM shim, which
      // also routes to Claude. Schema validation enforced via response_format.
      const llmPromise = invokeLLM({
        maxTokens: 800,
        messages: [
          { role: "system", content: PHOTO_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userInstruction },
              {
                type: "image_url",
                image_url: { url: photo.url, detail: "high" },
              },
            ],
          },
        ],
        response_format: PHOTO_FINDING_RESPONSE_FORMAT,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("photo vision timeout")),
          PHOTO_VISION_TIMEOUT_MS
        )
      );
      const response = await Promise.race([llmPromise, timeoutPromise]);
      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") return null;
      rawJson = content;
    }

    const jsonStart = rawJson.indexOf("{");
    const jsonEnd = rawJson.lastIndexOf("}");
    const cleanJson =
      jsonStart >= 0 && jsonEnd > jsonStart
        ? rawJson.slice(jsonStart, jsonEnd + 1)
        : rawJson;

    const parsed = JSON.parse(cleanJson) as Omit<
      PhotoFinding,
      "url" | "category" | "caption"
    >;
    const conditionScore = clampScore(parsed.conditionScore);
    const evidenceStrength = clampScore(parsed.evidenceStrength);

    const validUspap = ["C1", "C2", "C3", "C4", "C5", "C6"];
    const uspapRating = validUspap.includes(parsed.uspapRating as string)
      ? (parsed.uspapRating as PhotoFinding["uspapRating"])
      : undefined;

    const rawCostToCure = (parsed as any).costToCure;
    const costToCure: PhotoFinding["costToCure"] = Array.isArray(rawCostToCure)
      ? rawCostToCure
          .filter(
            (c: unknown) =>
              c &&
              typeof c === "object" &&
              typeof (c as any).low === "number" &&
              typeof (c as any).high === "number" &&
              typeof (c as any).description === "string"
          )
          .map((c: any) => ({
            low: c.low,
            high: c.high,
            description: c.description,
          }))
      : undefined;

    return {
      url: photo.url,
      category: photo.category,
      caption: photo.caption,
      conditionScore,
      conditionLabel: parsed.conditionLabel,
      uspapRating,
      observations: (parsed.observations || [])
        .slice(0, 7)
        .map(s => s.trim())
        .filter(Boolean),
      valueImpactingIssues: (parsed.valueImpactingIssues || [])
        .slice(0, 7)
        .map(s => s.trim())
        .filter(Boolean),
      functionalObsolescence: (parsed.functionalObsolescence || [])
        .slice(0, 6)
        .map(s => s.trim())
        .filter(Boolean),
      assessorBlindSpots: (parsed.assessorBlindSpots || [])
        .slice(0, 4)
        .map(s => s.trim())
        .filter(Boolean),
      ...(costToCure && costToCure.length > 0 ? { costToCure } : {}),
      evidenceStrength,
    };
  } catch (err) {
    log.warn(`[PhotoAnalyzer] Failed to analyze photo ${photo.url}:`, {
      err: err,
    });
    return null;
  }
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function dedupeShort(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const key = raw.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Analyze a batch of property photos. Runs in parallel with bounded
 * concurrency. Always resolves — never throws — so the analysis pipeline
 * remains uninterrupted if vision fails.
 */
export async function analyzePropertyPhotos(
  photos: SubmissionPhoto[]
): Promise<PhotoAnalysisSummary> {
  const empty: PhotoAnalysisSummary = {
    findings: [],
    overallConditionScore: 0,
    overallEvidenceStrength: 0,
    appealStrengthDelta: 0,
    topObservations: [],
    topValueIssues: [],
    summaryParagraph: "",
    functionalObsolescenceItems: [],
    assessorBlindSpotItems: [],
    uspapRatings: [],
    llmContext: "",
  };

  if (!photos || photos.length === 0) return empty;

  // Cap photos analyzed to control LLM cost/time
  const capped = photos.slice(0, 8);

  // Bounded concurrency. Claude vision comfortably handles 5 concurrent
  // requests per submission; the prior cap of 3 was leaving headroom on
  // the table. Bumped from 3 → 5 cuts wall-clock by ~40% on 8-photo runs.
  const findings: PhotoFinding[] = [];
  const queue = [...capped];
  const workers = Array.from(
    { length: Math.min(5, queue.length) },
    async () => {
      while (queue.length) {
        const next = queue.shift();
        if (!next) break;
        const f = await analyzeSinglePhoto(next);
        if (f) findings.push(f);
      }
    }
  );
  await Promise.all(workers);

  if (findings.length === 0) return empty;

  const overallConditionScore = Math.round(
    findings.reduce((acc, f) => acc + f.conditionScore, 0) / findings.length
  );
  const overallEvidenceStrength = Math.min(
    100,
    Math.round(
      Math.max(...findings.map(f => f.evidenceStrength)) +
        Math.min(15, (findings.length - 1) * 4) // small bonus for corroborating photos
    )
  );

  // Appeal-strength delta:
  //   conditionScore < 40 (poor)  -> +8 to +12 (worse condition supports lower value)
  //   40-59 (fair)                -> +3 to +6
  //   60-79 (average/good)        ->  0
  //   >= 80 (good/excellent)      -> -2 (above-average condition undercuts deferred-maintenance argument)
  let delta = 0;
  if (overallConditionScore < 40) delta = 10;
  else if (overallConditionScore < 60) delta = 5;
  else if (overallConditionScore >= 80) delta = -2;

  // Cap influence by evidence strength
  delta = Math.round(delta * (overallEvidenceStrength / 100));

  const topObservations = dedupeShort(
    findings.flatMap(f => f.observations),
    8
  );
  const topValueIssues = dedupeShort(
    findings.flatMap(f => f.valueImpactingIssues),
    8
  );
  const functionalObsolescenceItems = dedupeShort(
    findings.flatMap(f => f.functionalObsolescence),
    6
  );
  const assessorBlindSpotItems = dedupeShort(
    findings.flatMap(f => f.assessorBlindSpots),
    6
  );
  const uspapRatings = Array.from(
    new Set(findings.map(f => f.uspapRating).filter(Boolean))
  ) as string[];

  const costToCureItems = findings.flatMap(f => f.costToCure ?? []);
  const costToCureTotal = costToCureItems.reduce(
    (sum, c) => sum + Math.round((c.low + c.high) / 2),
    0
  );

  const conditionWord =
    overallConditionScore >= 80
      ? "above-average"
      : overallConditionScore >= 60
        ? "average"
        : overallConditionScore >= 40
          ? "below-average"
          : "materially impaired";

  const issuesClause = topValueIssues.length
    ? ` Documented condition items observed in the photographs include: ${topValueIssues.slice(0, 4).join("; ")}.`
    : "";

  const blindSpotClause = assessorBlindSpotItems.length
    ? ` Interior access by the assessor has not occurred; the following defects are visible only to the owner ` +
      `and were not available to the assessor at the time of assessment: ${assessorBlindSpotItems.join("; ")}.`
    : "";

  const obsolescenceClause = functionalObsolescenceItems.length
    ? ` Functional obsolescence items identified: ${functionalObsolescenceItems.join("; ")}.`
    : "";

  const summaryParagraph =
    `Visual inspection of ${findings.length} owner-submitted photograph${findings.length === 1 ? "" : "s"} ` +
    `indicates the subject property presents in ${conditionWord} condition relative to typical ` +
    `comparable inventory (composite condition index: ${overallConditionScore}/100` +
    (uspapRatings.length
      ? `; USPAP condition rating${uspapRatings.length > 1 ? "s" : ""}: ${uspapRatings.join(", ")}`
      : "") +
    `).` +
    issuesClause +
    blindSpotClause +
    obsolescenceClause +
    ` These observations are descriptive in nature and supplement — but do not replace — the comparable-sales analysis.`;

  // Rich LLM context block for injection into the appraisal prompt
  const llmContextParts: string[] = [
    `## Photo Evidence Analysis (${findings.length} owner-submitted photo${findings.length === 1 ? "" : "s"})`,
    `Composite Condition Index: ${overallConditionScore}/100 (${conditionWord})`,
    uspapRatings.length ? `USPAP Rating(s): ${uspapRatings.join(", ")}` : "",
    `Evidence Strength: ${overallEvidenceStrength}/100`,
    "",
  ];
  if (topValueIssues.length) {
    llmContextParts.push("### Condition Defects Supporting Lower Value");
    topValueIssues.forEach(i => llmContextParts.push(`- ${i}`));
    llmContextParts.push("");
  }
  if (assessorBlindSpotItems.length) {
    llmContextParts.push(
      "### Assessor Blind Spots (Interior — Assessor Has No Access)"
    );
    llmContextParts.push(
      "*These defects are invisible to the assessor without an interior inspection.*"
    );
    assessorBlindSpotItems.forEach(i => llmContextParts.push(`- ${i}`));
    llmContextParts.push("");
  }
  if (functionalObsolescenceItems.length) {
    llmContextParts.push("### Functional Obsolescence");
    functionalObsolescenceItems.forEach(i => llmContextParts.push(`- ${i}`));
    llmContextParts.push("");
  }
  if (topObservations.length) {
    llmContextParts.push("### Additional Verified Observations");
    topObservations.slice(0, 5).forEach(i => llmContextParts.push(`- ${i}`));
  }
  const llmContext = llmContextParts.filter(s => s !== undefined).join("\n");

  const summary: PhotoAnalysisSummary = {
    findings,
    overallConditionScore,
    overallEvidenceStrength,
    appealStrengthDelta: delta,
    topObservations,
    topValueIssues,
    functionalObsolescenceItems,
    assessorBlindSpotItems,
    uspapRatings,
    summaryParagraph,
    llmContext,
  };
  if (costToCureTotal > 0) {
    summary.costToCureTotal = costToCureTotal;
    summary.costToCureItems = costToCureItems;
  }
  return summary;
}
