/**
 * geminiResearch.ts
 * Elite dual-model research engine powered by Google Gemini.
 *
 * ARCHITECTURE:
 *   • Gemini 2.5 Pro  — Deep market research synthesis (Google Search grounding)
 *     Reads actual web pages, synthesizes findings, returns structured market intelligence.
 *   • Gemini 2.5 Flash — Fast county info extraction and document parsing
 *     Grounded search for county assessor portals, deadlines, filing procedures.
 *
 * Gemini 2.5 Pro reads and synthesizes sources directly via Google Search grounding
 *
 * PIPELINE INTEGRATION:
 *   analysisJob.ts  → runPropertyResearch() → feeds into analyzeProperty()
 *   counties router → lookupCountyInfo()    → feeds into county eligibility
 *
 * EXPORTED INTERFACE: GeminiInsight, GeminiResearchResult, CountyInfo —
 * analysisJob.ts and appraisalAnalyzer.ts require minimal changes.
 */

import { ENV } from "../_core/env";
import { getStateRules } from "./stateAssessmentRules";

// ─── Models ───────────────────────────────────────────────────────────────────

const GEMINI_PRO   = "gemini-2.5-pro";    // Deep research + synthesis
const GEMINI_FLASH = "gemini-2.5-flash";  // Fast extraction + county lookup
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1/models";

// ─── Types (Gemini-native types) ─────────────────────────

/** A single web source cited by Gemini */
export interface GeminiSource {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

/** Structured research insight for one scenario — structured research insight */
export interface GeminiInsight {
  scenario: ResearchScenario;
  query: string;
  results: GeminiSource[];
  /** LLM-synthesized summary ready for injection into appraisal prompt */
  summary: string;
}

// Keep backward-compat alias so appraisalAnalyzer.ts import still works

export type ResearchScenario =
  | "assessorOvervaluation"
  | "comparableSales"
  | "marketTrends"
  | "zoningLandUse"
  | "neighborhoodDistress"
  | "taxAppealOutcomes";

/** Structured county filing info — same shape as DynamicCountyInfo */
export interface DynamicCountyInfo {
  countyName: string;
  state: string;
  appealDeadline: string | null;
  filingWindowStart: string | null;
  filingWindowEnd: string | null;
  portalUrl: string | null;
  assessorUrl: string | null;
  assessorPhone: string | null;
  assessorEmail: string | null;
  filingInstructions: string | null;
  requiredForms: string | null;
  filingFee: string | null;
  confidence: "high" | "medium" | "low";
  sources: string[];
}

export interface PropertySearchContext {
  address: string;
  city: string;
  state: string;
  county: string;
  propertyType: string;
  assessedValue?: number;
}

// ─── Core Gemini API Call ─────────────────────────────────────────────────────

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiGroundingChunk {
  web?: { uri: string; title: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    groundingMetadata?: {
      groundingChunks?: GeminiGroundingChunk[];
      webSearchQueries?: string[];
    };
  }>;
  error?: { code: number; message: string; status: string };
}

async function callGemini(
  model: string,
  contents: GeminiContent[],
  useGrounding = true,
  timeoutMs = 25000
): Promise<{ text: string; sources: GeminiSource[] }> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    console.warn("[Gemini] GEMINI_API_KEY not set — skipping research");
    return { text: "", sources: [] };
  }

  const body: Record<string, unknown> = { contents };

  if (useGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Gemini] API error ${res.status} for model ${model}: ${errText.slice(0, 200)}`);
      return { text: "", sources: [] };
    }

    const data: GeminiResponse = await res.json();

    if (data.error) {
      console.warn(`[Gemini] API returned error: ${data.error.message}`);
      return { text: "", sources: [] };
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).join("") ?? "";

    // Extract grounding sources
    const chunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const sources: GeminiSource[] = chunks
      .filter((c) => c.web?.uri)
      .map((c) => ({
        title: c.web!.title ?? "",
        link: c.web!.uri,
        snippet: "",
        source: (() => {
          try { return new URL(c.web!.uri).hostname.replace("www.", ""); }
          catch { return c.web!.uri; }
        })(),
      }));

    return { text, sources };
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      console.warn(`[Gemini] Request timed out after ${timeoutMs}ms for model ${model}`);
    } else {
      console.warn(`[Gemini] Request failed for model ${model}: ${msg}`);
    }
    return { text: "", sources: [] };
  }
}

// ─── Property Research Prompts ────────────────────────────────────────────────

function buildResearchPrompt(ctx: PropertySearchContext): string {
  const stateRules = getStateRules(ctx.state);
  const assessmentLevel = stateRules?.assessmentLevel
    ? `${Math.round(stateRules.assessmentLevel * 100)}%`
    : "100%";
  const primaryMethod = stateRules?.primaryValuationMethod ?? "sales comparison";
  const appealBody = stateRules?.primaryAppealBody ?? "Board of Equalization";
  const keyStrategies = stateRules?.keyStrategies?.slice(0, 3).join("; ") ?? "";
  const year = new Date().getFullYear();
  const prevYear = year - 1;

  return `You are an elite property tax appeal researcher and appraiser. Conduct comprehensive real-time research on the following property to build the strongest possible appeal evidence package.

SUBJECT PROPERTY:
- Address: ${ctx.address}
- City: ${ctx.city}, ${ctx.state}
- County: ${ctx.county}
- Property Type: ${ctx.propertyType}
- Current Assessed Value: ${ctx.assessedValue ? `$${ctx.assessedValue.toLocaleString()}` : "Unknown"}

STATE-SPECIFIC CONTEXT (${ctx.state}):
- Assessment Level: ${assessmentLevel} of market value
- Primary Valuation Method: ${primaryMethod}
- Appeal Body: ${appealBody}
- Key Strategies: ${keyStrategies}

RESEARCH TASKS — Search the web and synthesize findings for each:

1. ASSESSOR OVERVALUATION EVIDENCE
   Search for evidence that ${ctx.county} County, ${ctx.state} has over-assessed properties like this one. Look for:
   - Recent assessment appeal success rates in ${ctx.county} County
   - Reports of systematic overvaluation in this jurisdiction
   - Any published studies or news about ${ctx.county} County assessment accuracy
   - Comparable properties that sold below their assessed value

2. COMPARABLE SALES DATA
   Find recent (${prevYear}-${year}) sales of similar ${ctx.propertyType} properties within 1 mile of ${ctx.address}. Look for:
   - Sold prices, price per square foot, days on market
   - Any sales below current assessed values
   - Market trends showing price softness or decline
   - ${ctx.propertyType === "multifamily" || ctx.propertyType === "apartment" ? "Cap rates, gross rent multipliers, and NOI data for similar income properties" : "Single-family comparable sales with adjustment factors"}

3. MARKET TREND ANALYSIS
   Research ${city_state(ctx)} real estate market conditions for ${prevYear}-${year}:
   - Is the market appreciating, flat, or declining?
   - Median home price trends in ${ctx.county} County
   - Days on market trends (rising = buyer's market = lower values)
   - Any market softness, oversupply, or economic headwinds

4. NEIGHBORHOOD & DISTRESS FACTORS
   Research value-depressing factors near ${ctx.address}:
   - Foreclosure rates, vacancy rates, distressed sales
   - Crime statistics, school ratings, environmental issues
   - Proximity to industrial, commercial, or nuisance uses
   - Any neighborhood decline indicators

5. ZONING & FUNCTIONAL ISSUES
   Research any restrictions or issues affecting this ${ctx.propertyType}:
   - Zoning restrictions limiting use or development potential
   - Functional obsolescence (outdated systems, layout issues)
   - Any deed restrictions, easements, or encumbrances

6. PRIOR APPEAL OUTCOMES IN ${ctx.county.toUpperCase()} COUNTY
   Find evidence of successful property tax appeals in ${ctx.county} County, ${ctx.state}:
   - Published appeal success rates for ${ctx.county} County
   - Any notable reductions granted by ${appealBody}
   - Typical reduction percentages achieved
   - Any policy changes or assessment methodology issues

For each section, provide:
- Specific data points with sources (URLs when available)
- Quantitative evidence where possible (percentages, dollar amounts, dates)
- Assessment of how strong this evidence is for an appeal

Be thorough, specific, and cite your sources. This research will directly inform a professional appraisal report.`;
}

function city_state(ctx: PropertySearchContext): string {
  return `${ctx.city}, ${ctx.state}`;
}

// ─── County Lookup Prompt ─────────────────────────────────────────────────────

function buildCountyLookupPrompt(countyName: string, state: string): string {
  const year = new Date().getFullYear();
  return `You are a property tax filing specialist. Research and extract the following information for ${countyName} County, ${state} for the ${year} tax year.

Search the official county assessor website, state department of revenue, and any official government sources to find:

1. APPEAL DEADLINE: When is the last day to file a property tax appeal/protest for ${year}? (exact date or annual window like "April 1 - May 31")

2. FILING WINDOW: What are the start and end dates of the annual appeal filing period? (MM-DD format)

3. ONLINE PORTAL: What is the URL of the county's online property tax appeal portal? (the actual URL where taxpayers file online)

4. ASSESSOR WEBSITE: What is the main URL of the ${countyName} County Assessor's website?

5. ASSESSOR CONTACT: What is the phone number, email address, and mailing address of the ${countyName} County Assessor's office?

6. HOW TO FILE: Provide a 2-3 sentence plain English summary of how to file a property tax appeal in ${countyName} County. What forms are required? Is there a fee?

Return your findings as a JSON object with these exact keys:
{
  "appealDeadline": "string or null",
  "filingWindowStart": "MM-DD or null",
  "filingWindowEnd": "MM-DD or null", 
  "portalUrl": "full URL or null",
  "assessorUrl": "full URL or null",
  "assessorPhone": "string or null",
  "assessorEmail": "string or null",
  "filingInstructions": "2-3 sentences or null",
  "requiredForms": "list of forms or null",
  "filingFee": "dollar amount or 'Free' or null",
  "confidence": "high|medium|low"
}

Only return the JSON object, no other text.`;
}

// ─── Parse Research into Structured Insights ─────────────────────────────────

function parseResearchIntoInsights(
  rawText: string,
  sources: GeminiSource[],
  ctx: PropertySearchContext
): GeminiInsight[] {
  if (!rawText.trim()) return [];

  const scenarios: ResearchScenario[] = [
    "assessorOvervaluation",
    "comparableSales",
    "marketTrends",
    "neighborhoodDistress",
    "zoningLandUse",
    "taxAppealOutcomes",
  ];

  const sectionHeaders: Record<ResearchScenario, string> = {
    assessorOvervaluation: "ASSESSOR OVERVALUATION EVIDENCE",
    comparableSales: "COMPARABLE SALES DATA",
    marketTrends: "MARKET TREND ANALYSIS",
    neighborhoodDistress: "NEIGHBORHOOD & DISTRESS FACTORS",
    zoningLandUse: "ZONING & FUNCTIONAL ISSUES",
    taxAppealOutcomes: "PRIOR APPEAL OUTCOMES",
  };

  const insights: GeminiInsight[] = [];

  for (const scenario of scenarios) {
    const header = sectionHeaders[scenario];
    const headerIdx = rawText.indexOf(header);

    let sectionText = "";
    if (headerIdx !== -1) {
      // Find next section header
      const nextHeaderIdx = scenarios
        .filter((s) => s !== scenario)
        .map((s) => rawText.indexOf(sectionHeaders[s]))
        .filter((idx) => idx > headerIdx)
        .sort((a, b) => a - b)[0];

      sectionText = nextHeaderIdx !== -1
        ? rawText.slice(headerIdx, nextHeaderIdx).trim()
        : rawText.slice(headerIdx).trim();
    }

    if (!sectionText) {
      // Fallback: use the full text as context for this scenario
      sectionText = rawText.slice(0, 500);
    }

    // Assign relevant sources to this insight
    const scenarioSources = sources.slice(0, 3);

    insights.push({
      scenario,
      query: `${header} — ${ctx.address}, ${ctx.city}, ${ctx.state}`,
      results: scenarioSources,
      summary: sectionText.slice(0, 1200), // Cap at 1200 chars per section
    });
  }

  return insights;
}

// ─── Main Exports ─────────────────────────────────────────────────────────────

/**
 * Runs comprehensive property research using Gemini 2.5 Pro with Google Search grounding.
 * Performs one deep synthesis call that
 * reads the source pages and returns structured market intelligence.
 *
 * Primary property research function
 */
export async function runPropertyResearch(
  ctx: PropertySearchContext
): Promise<GeminiInsight[]> {
  console.log(`[Gemini] Starting property research for ${ctx.address}, ${ctx.state}`);

  const prompt = buildResearchPrompt(ctx);

  const { text, sources } = await callGemini(
    GEMINI_PRO,
    [{ role: "user", parts: [{ text: prompt }] }],
    true,  // Use Google Search grounding
    30000  // 30s timeout for deep research
  );

  if (!text) {
    console.warn("[Gemini] Property research returned empty — analysis will proceed without web context");
    return [];
  }

  const insights = parseResearchIntoInsights(text, sources, ctx);

  const totalSources = sources.length;
  console.log(`[Gemini] ✓ Property research complete — ${insights.length} scenarios, ${totalSources} grounded sources`);

  return insights;
}

/**
 * Looks up county filing info using Gemini 2.5 Flash with Google Search grounding.
 * Performs one intelligent lookup that
 * reads the actual county assessor portal and returns structured filing data.
 *
 * Dynamic county information lookup
 */
export async function lookupCountyInfo(
  countyName: string,
  state: string
): Promise<DynamicCountyInfo> {
  console.log(`[Gemini] Looking up county info for ${countyName}, ${state}`);

  const prompt = buildCountyLookupPrompt(countyName, state);

  const { text, sources } = await callGemini(
    GEMINI_FLASH,
    [{ role: "user", parts: [{ text: prompt }] }],
    true,  // Use Google Search grounding
    20000  // 20s timeout
  );

  const sourceUrls = sources.map((s) => s.link).filter(Boolean).slice(0, 6);

  if (!text) {
    console.warn(`[Gemini] County lookup returned empty for ${countyName}, ${state}`);
    return emptyCountyInfo(countyName, state, sourceUrls);
  }

  // Extract JSON from response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    const result: DynamicCountyInfo = {
      countyName,
      state,
      appealDeadline: parsed.appealDeadline ?? null,
      filingWindowStart: parsed.filingWindowStart ?? null,
      filingWindowEnd: parsed.filingWindowEnd ?? null,
      portalUrl: parsed.portalUrl ?? null,
      assessorUrl: parsed.assessorUrl ?? null,
      assessorPhone: parsed.assessorPhone ?? null,
      assessorEmail: parsed.assessorEmail ?? null,
      filingInstructions: parsed.filingInstructions ?? null,
      requiredForms: parsed.requiredForms ?? null,
      filingFee: parsed.filingFee ?? null,
      confidence: (["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium") as "high" | "medium" | "low",
      sources: sourceUrls,
    };

    console.log(`[Gemini] ✓ County lookup complete for ${countyName}, ${state} — confidence: ${result.confidence}, deadline: ${result.appealDeadline ?? "not found"}`);
    return result;
  } catch (err) {
    console.warn(`[Gemini] Failed to parse county info JSON for ${countyName}, ${state}:`, err);
    return emptyCountyInfo(countyName, state, sourceUrls);
  }
}

/**
 * Analyzes property photos using Gemini 2.5 Pro's multimodal vision.
 * Returns a condition assessment with cost-to-cure estimates for appeal evidence.
 */
export async function analyzePropertyPhotos(
  photoUrls: string[],
  propertyType: string,
  address: string
): Promise<{
  conditionScore: number;       // 1-5 scale (1=poor, 5=excellent)
  conditionNotes: string;       // Detailed condition observations
  defectsFound: string[];       // List of specific defects/issues
  costToCureEstimate: number;   // Estimated repair cost in dollars
  appealImpact: string;         // How condition affects appeal strength
}> {
  if (!photoUrls.length) {
    return {
      conditionScore: 3,
      conditionNotes: "No photos provided — condition assumed average.",
      defectsFound: [],
      costToCureEstimate: 0,
      appealImpact: "No photo evidence available for condition adjustment.",
    };
  }

  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    return {
      conditionScore: 3,
      conditionNotes: "Photo analysis unavailable — API key not configured.",
      defectsFound: [],
      costToCureEstimate: 0,
      appealImpact: "No photo evidence available.",
    };
  }

  // Build multimodal content with images
  const parts: Array<{ text: string } | { inlineData?: { mimeType: string; data: string } } | { fileData?: { mimeType: string; fileUri: string } }> = [
    {
      text: `You are a certified property appraiser conducting a condition inspection for a property tax appeal.

Property: ${address}
Property Type: ${propertyType}

Analyze these ${photoUrls.length} property photo(s) and provide a detailed condition assessment. Focus on:

1. OVERALL CONDITION SCORE (1-5):
   1 = Poor (major deferred maintenance, structural issues)
   2 = Fair (significant repairs needed, dated systems)
   3 = Average (typical wear and tear, functional)
   4 = Good (well-maintained, minor updates needed)
   5 = Excellent (recently renovated, like-new condition)

2. SPECIFIC DEFECTS OBSERVED:
   List every visible defect, deferred maintenance item, or condition issue that would reduce value:
   - Roof condition (missing shingles, sagging, age)
   - Exterior (siding damage, paint peeling, foundation cracks)
   - Windows (broken, fogged, single-pane)
   - HVAC/mechanical (visible age, condition)
   - Interior (dated finishes, water damage, flooring condition)
   - Landscaping/site (drainage issues, overgrowth)

3. COST-TO-CURE ESTIMATE:
   Estimate the total cost to bring the property to average condition.
   Use current contractor rates. Be specific (e.g., "roof replacement: $12,000").

4. APPEAL IMPACT:
   Explain in 2-3 sentences how the observed condition supports a lower assessed value.
   Reference specific defects that an assessor may not have accounted for.

Return your analysis as JSON:
{
  "conditionScore": number (1-5),
  "conditionNotes": "detailed paragraph describing overall condition",
  "defectsFound": ["defect 1", "defect 2", ...],
  "costToCureEstimate": number (total dollars),
  "appealImpact": "2-3 sentences on how condition supports lower value"
}`,
    },
  ];

  // Add image URLs as file references
  for (const url of photoUrls.slice(0, 8)) { // Max 8 photos
    parts.push({
      fileData: {
        mimeType: "image/jpeg",
        fileUri: url,
      },
    });
  }

  try {
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_PRO}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
      }),
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    const data: GeminiResponse = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in photo analysis response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      conditionScore: Math.min(5, Math.max(1, Number(parsed.conditionScore) || 3)),
      conditionNotes: parsed.conditionNotes ?? "Condition analysis unavailable.",
      defectsFound: Array.isArray(parsed.defectsFound) ? parsed.defectsFound : [],
      costToCureEstimate: Number(parsed.costToCureEstimate) || 0,
      appealImpact: parsed.appealImpact ?? "",
    };
  } catch (err) {
    console.warn("[Gemini] Photo analysis failed:", err instanceof Error ? err.message : err);
    return {
      conditionScore: 3,
      conditionNotes: "Photo analysis failed — condition assumed average.",
      defectsFound: [],
      costToCureEstimate: 0,
      appealImpact: "Photo analysis unavailable.",
    };
  }
}

/**
 * Formats all Gemini insights into a single block of text for LLM consumption.
 * Format research insights for LLM context injection
 */
export function formatInsightsForLLM(insights: GeminiInsight[]): string {
  if (!insights.length) return "";

  const sections = insights
    .filter((i) => i.summary && i.summary.length > 20)
    .map((i) => {
      const label: Record<ResearchScenario, string> = {
        assessorOvervaluation: "Assessor Overvaluation Evidence",
        comparableSales: "Comparable Sales Data",
        marketTrends: "Market Trend Analysis",
        zoningLandUse: "Zoning & Functional Issues",
        neighborhoodDistress: "Neighborhood & Distress Factors",
        taxAppealOutcomes: "Prior Appeal Outcomes in This County",
      };
      return `### ${label[i.scenario]}\n${i.summary}`;
    });

  if (!sections.length) return "";

  return `\n\n## Gemini Market Intelligence (Live Research — Google Grounded)\n${sections.join("\n\n")}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyCountyInfo(
  countyName: string,
  state: string,
  sources: string[]
): DynamicCountyInfo {
  return {
    countyName,
    state,
    appealDeadline: null,
    filingWindowStart: null,
    filingWindowEnd: null,
    portalUrl: null,
    assessorUrl: null,
    assessorPhone: null,
    assessorEmail: null,
    filingInstructions: null,
    requiredForms: null,
    filingFee: null,
    confidence: "low",
    sources,
  };
}
