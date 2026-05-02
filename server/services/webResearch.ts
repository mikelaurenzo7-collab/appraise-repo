/**
 * webResearch.ts — Claude-powered web research engine.
 *
 * ARCHITECTURE:
 *   • Claude Sonnet + web_search_20250305 — Deep market research with live
 *     web grounding. Searches the web, synthesizes findings, returns
 *     structured market intelligence.
 *   • Claude Sonnet + web_search_20250305 — Fast county info extraction.
 *     Grounded search for county assessor portals, deadlines, filing
 *     procedures.
 *
 * PIPELINE INTEGRATION:
 *   analysisJob.ts  → runPropertyResearch() → feeds into analyzeProperty()
 *   counties router → lookupCountyInfo()    → feeds into county eligibility
 */

import { getClaudeClient } from "../_core/claude";
import { callAnthropic } from "../_core/llmProviders";
import { getStateRules } from "./stateAssessmentRules";

// ─── Types (kept for backward compatibility) ─────────────────────────────────

/** A single web source cited in research */
export interface ResearchSource {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

/** Structured research insight for one scenario — structured research insight */
export interface ResearchInsight {
  scenario: ResearchScenario;
  query: string;
  results: ResearchSource[];
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

// ─── Core Claude Web-Search Call ─────────────────────────────────────────────

function extractHostname(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); }
  catch { return url; }
}

/**
 * Call Claude Sonnet with the web_search_20250305 built-in tool.
 * Anthropic's servers execute the searches; we get a synthesized text response
 * plus structured source citations from the web_search_tool_result blocks.
 *
 * Falls back to a plain Claude call (no live search) if web_search fails —
 * Claude's training knowledge is still highly useful for property research.
 */
async function callClaudeWithWebSearch(
  prompt: string,
  timeoutMs = 30000,
): Promise<{ text: string; sources: ResearchSource[] }> {
  const client = getClaudeClient();
  if (!client) {
    console.warn("[Research] ANTHROPIC_API_KEY not set — skipping research");
    return { text: "", sources: [] };
  }

  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Research timeout")), ms),
      ),
    ]);

  try {
    // Beta messages API supports the web_search_20250305 built-in tool.
    // Anthropic's servers execute each search; Claude synthesizes across results.
    const response = await withTimeout(
      (client.beta.messages as unknown as {
        create: (params: Record<string, unknown>) => Promise<{ content: Array<Record<string, unknown>> }>;
      }).create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        betas: ["web-search-2025-03-05"],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
      timeoutMs,
    );

    let text = "";
    const sources: ResearchSource[] = [];

    for (const block of response.content) {
      if (block["type"] === "text") {
        text += String(block["text"] ?? "");
      } else if (block["type"] === "web_search_tool_result") {
        const content = block["content"];
        if (Array.isArray(content)) {
          for (const result of content as Array<Record<string, unknown>>) {
            if (result["type"] === "web_search_result" && result["url"]) {
              sources.push({
                title: String(result["title"] ?? ""),
                link: String(result["url"]),
                snippet: "",
                source: extractHostname(String(result["url"])),
              });
            }
          }
        }
      }
    }

    return { text, sources };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Research] Claude web search failed (${msg}) — falling back to knowledge-only`);

    // Plain Claude call — no live search, but still produces structured research
    // from Claude's training knowledge. Silently degrades rather than blocking.
    try {
      const fallbackText = await callAnthropic(
        [{ role: "user" as const, content: prompt }],
        "claude-sonnet-4-20250514",
        6000,
      );
      return { text: fallbackText, sources: [] };
    } catch (fallbackErr: unknown) {
      console.warn("[Research] Claude fallback also failed:", (fallbackErr as Error).message);
      return { text: "", sources: [] };
    }
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
  sources: ResearchSource[],
  ctx: PropertySearchContext
): ResearchInsight[] {
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

  const insights: ResearchInsight[] = [];

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
 * Runs comprehensive property research using Claude + web_search_20250305.
 * Performs one deep synthesis call with live web search grounding and returns
 * structured market intelligence for each appeal scenario.
 *
 * Primary property research function
 */
export async function runPropertyResearch(
  ctx: PropertySearchContext
): Promise<ResearchInsight[]> {
  console.log(`[Research] Starting Claude web-search research for ${ctx.address}, ${ctx.state}`);

  const prompt = buildResearchPrompt(ctx);

  const { text, sources } = await callClaudeWithWebSearch(
    prompt,
    30000, // 30s timeout for deep research
  );

  if (!text) {
    console.warn("[Research] Property research returned empty — analysis will proceed without web context");
    return [];
  }

  const insights = parseResearchIntoInsights(text, sources, ctx);

  const totalSources = sources.length;
  console.log(`[Research] ✓ Property research complete — ${insights.length} scenarios, ${totalSources} grounded sources`);

  return insights;
}

/**
 * Looks up county filing info using Claude + web_search_20250305.
 * Searches official county assessor portals and returns structured filing data.
 *
 * Dynamic county information lookup
 */
export async function lookupCountyInfo(
  countyName: string,
  state: string
): Promise<DynamicCountyInfo> {
  console.log(`[Research] Looking up county info for ${countyName}, ${state}`);

  const prompt = buildCountyLookupPrompt(countyName, state);

  const { text, sources } = await callClaudeWithWebSearch(
    prompt,
    20000, // 20s timeout
  );

  const sourceUrls = sources.map((s) => s.link).filter(Boolean).slice(0, 6);

  if (!text) {
    console.warn(`[Research] County lookup returned empty for ${countyName}, ${state}`);
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

    console.log(`[Research] ✓ County lookup complete for ${countyName}, ${state} — confidence: ${result.confidence}, deadline: ${result.appealDeadline ?? "not found"}`);
    return result;
  } catch (err) {
    console.warn(`[Research] Failed to parse county info JSON for ${countyName}, ${state}:`, err);
    return emptyCountyInfo(countyName, state, sourceUrls);
  }
}

/**
 * Formats all research insights into a single block of text for LLM consumption.
 * Format research insights for LLM context injection
 */
export function formatInsightsForLLM(insights: ResearchInsight[]): string {
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

  return `\n\n## Claude Market Intelligence (Live Web Research)\n${sections.join("\n\n")}`;
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
