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
import type { SubmissionPhoto } from "../db";

export interface PhotoFinding {
  url: string;
  category: SubmissionPhoto["category"];
  caption?: string;
  /** 0-100; higher = property is in BETTER condition than typical */
  conditionScore: number;
  /** Descriptive condition rating */
  conditionLabel: "excellent" | "good" | "average" | "fair" | "poor";
  /** Concrete, verifiable observations (max ~5 short bullets) */
  observations: string[];
  /** Items that, if present, would tend to support a downward valuation */
  valueImpactingIssues: string[];
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
  /** One-paragraph professional summary suitable for the PDF report */
  summaryParagraph: string;
}

const PHOTO_VISION_TIMEOUT_MS = 25_000;

async function analyzeSinglePhoto(photo: SubmissionPhoto): Promise<PhotoFinding | null> {
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
      `You are a property condition analyst preparing factual observations for a property tax appeal.\n\n` +
      `Photo category: ${photo.category} (showing ${categoryLabel}).\n` +
      (photo.caption ? `Owner caption: "${photo.caption}"\n` : "") +
      `\nDescribe ONLY what is visible in the image. Do not speculate beyond evidence. ` +
      `Do not make legal recommendations. Write each observation as a short, neutral, ` +
      `verifiable phrase (e.g. "missing gutter on north elevation", "interior wall ` +
      `staining consistent with prior moisture intrusion"). If a defect is unclear, omit it.\n\n` +
      `Return JSON only.`;

    const llmPromise = invokeLLM({
      maxTokens: 800,
      messages: [
        {
          role: "system",
          content:
            "You are a meticulous property condition analyst. You produce evidence-based, " +
            "non-prescriptive observations. You never give legal advice and never overstate " +
            "what an image shows. You output valid JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: userInstruction },
            { type: "image_url", image_url: { url: photo.url, detail: "high" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "photo_finding",
          strict: true,
          schema: {
            type: "object",
            properties: {
              conditionScore: { type: "number" },
              conditionLabel: {
                type: "string",
                enum: ["excellent", "good", "average", "fair", "poor"],
              },
              observations: {
                type: "array",
                items: { type: "string" },
              },
              valueImpactingIssues: {
                type: "array",
                items: { type: "string" },
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
          },
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("photo vision timeout")), PHOTO_VISION_TIMEOUT_MS),
    );

    const response = await Promise.race([llmPromise, timeoutPromise]);
    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return null;

    const parsed = JSON.parse(content) as Omit<PhotoFinding, "url" | "category" | "caption">;
    const conditionScore = clampScore(parsed.conditionScore);
    const evidenceStrength = clampScore(parsed.evidenceStrength);

    return {
      url: photo.url,
      category: photo.category,
      caption: photo.caption,
      conditionScore,
      conditionLabel: parsed.conditionLabel,
      observations: (parsed.observations || []).slice(0, 5).map(s => s.trim()).filter(Boolean),
      valueImpactingIssues: (parsed.valueImpactingIssues || []).slice(0, 5).map(s => s.trim()).filter(Boolean),
      evidenceStrength,
    };
  } catch (err) {
    console.warn(`[PhotoAnalyzer] Failed to analyze photo ${photo.url}:`, (err as Error).message);
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
  photos: SubmissionPhoto[],
): Promise<PhotoAnalysisSummary> {
  const empty: PhotoAnalysisSummary = {
    findings: [],
    overallConditionScore: 0,
    overallEvidenceStrength: 0,
    appealStrengthDelta: 0,
    topObservations: [],
    topValueIssues: [],
    summaryParagraph: "",
  };

  if (!photos || photos.length === 0) return empty;

  // Cap photos analyzed to control LLM cost/time
  const capped = photos.slice(0, 8);

  // Bounded-concurrency map (3 at a time)
  const findings: PhotoFinding[] = [];
  const queue = [...capped];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) break;
      const f = await analyzeSinglePhoto(next);
      if (f) findings.push(f);
    }
  });
  await Promise.all(workers);

  if (findings.length === 0) return empty;

  const overallConditionScore = Math.round(
    findings.reduce((acc, f) => acc + f.conditionScore, 0) / findings.length,
  );
  const overallEvidenceStrength = Math.min(
    100,
    Math.round(
      Math.max(...findings.map(f => f.evidenceStrength)) +
        Math.min(15, (findings.length - 1) * 4), // small bonus for corroborating photos
    ),
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
    6,
  );
  const topValueIssues = dedupeShort(
    findings.flatMap(f => f.valueImpactingIssues),
    6,
  );

  const conditionWord =
    overallConditionScore >= 80 ? "above-average"
    : overallConditionScore >= 60 ? "average"
    : overallConditionScore >= 40 ? "below-average"
    : "materially impaired";

  const issuesClause = topValueIssues.length
    ? ` Documented condition items observed in the photographs include ${topValueIssues.slice(0, 3).join("; ")}.`
    : "";

  const summaryParagraph =
    `Visual inspection of ${findings.length} owner-submitted photograph${findings.length === 1 ? "" : "s"} ` +
    `indicates the subject property presents in ${conditionWord} condition relative to typical ` +
    `comparable inventory (composite condition index: ${overallConditionScore}/100).` +
    issuesClause +
    ` These observations are descriptive in nature and supplement — but do not replace — the comparable-sales analysis.`;

  return {
    findings,
    overallConditionScore,
    overallEvidenceStrength,
    appealStrengthDelta: delta,
    topObservations,
    topValueIssues,
    summaryParagraph,
  };
}
