/**
 * serperSearch.ts
 * Intelligent property research using Serper (Google Search API).
 *
 * PROPERTY RESEARCH — 6 appeal-focused scenarios:
 *   1. assessorOvervaluation  — evidence the county over-assessed
 *   2. comparableSales        — recent sold comps to anchor lower market value
 *   3. marketTrends           — declining/flat market data weakening the assessment
 *   4. zoningLandUse          — zoning restrictions that reduce utility/value
 *   5. neighborhoodDistress   — foreclosures, vacancies, crime that depress value
 *   6. taxAppealOutcomes      — prior appeal wins in the same county (social proof + precedent)
 *
 * COUNTY LOOKUP — 3 county-info scenarios (for unseeded counties):
 *   A. countyDeadline         — filing window, appeal deadline, key dates
 *   B. countyFilingProcedure  — how to file, required forms, fee schedule, portal URL
 *   C. countyAssessorContact  — assessor office address, phone, email, portal URL
 *
 * Results are extracted into structured objects and stored on the analysis record
 * so the LLM can cite them in the appraisal report.
 */

import axios from "axios";
import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { getStateRules } from "./stateAssessmentRules";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

export interface SerperInsight {
  scenario: SearchScenario;
  query: string;
  results: SerperResult[];
  /** LLM-ready summary of the most useful findings */
  summary: string;
}

export type SearchScenario =
  | "assessorOvervaluation"
  | "comparableSales"
  | "marketTrends"
  | "zoningLandUse"
  | "neighborhoodDistress"
  | "taxAppealOutcomes";

export type CountyScenario =
  | "countyDeadline"
  | "countyFilingProcedure"
  | "countyAssessorContact";

/** Structured county info extracted by LLM from Serper results */
export interface DynamicCountyInfo {
  countyName: string;
  state: string;
  /** ISO date string (YYYY-MM-DD) or human-readable like "May 31" */
  appealDeadline: string | null;
  /** MM-DD format for annual filing window start */
  filingWindowStart: string | null;
  /** MM-DD format for annual filing window end */
  filingWindowEnd: string | null;
  /** URL to the county's online appeal portal */
  portalUrl: string | null;
  /** URL to the county assessor's website */
  assessorUrl: string | null;
  /** Assessor office phone number */
  assessorPhone: string | null;
  /** Assessor office email */
  assessorEmail: string | null;
  /** Step-by-step filing instructions (plain text) */
  filingInstructions: string | null;
  /** Required forms or documents */
  requiredForms: string | null;
  /** Filing fee if any */
  filingFee: string | null;
  /** Confidence level of the extracted data */
  confidence: "high" | "medium" | "low";
  /** Source URLs used */
  sources: string[];
}

// ─── Property Research Query Builders ────────────────────────────────────────

function buildQuery(
  scenario: SearchScenario,
  address: string,
  city: string,
  state: string,
  county: string,
  propertyType: string,
  assessedValue?: number
): string {
  const countyStr = county ? `${county} County` : city;
  const year = new Date().getFullYear();
  const prevYear = year - 1;
  
  // Get state-specific rules for enhanced query context
  const stateRules = getStateRules(state);
  const assessmentLevel = stateRules?.assessmentLevel ? Math.round(stateRules.assessmentLevel * 100) : 100;
  const primaryMethod = stateRules?.primaryValuationMethod || "sca";

  switch (scenario) {
    case "assessorOvervaluation":
      // State-specific: emphasize assessment level context
      return `"${countyStr}" "${state}" property tax over-assessed overvalued appeal reduction ${year} OR ${prevYear} assessment level ${assessmentLevel}% site:zillow.com OR site:realtor.com OR site:assessor.gov OR site:propertytax.com`;

    case "comparableSales":
      // State-specific: use primary valuation method context
      const compQuery = primaryMethod === "income" 
        ? `"${city}" "${state}" ${propertyType} sold ${prevYear} OR ${year} comparable sales rental income cap rate site:zillow.com OR site:redfin.com OR site:realtor.com`
        : `"${city}" "${state}" ${propertyType} sold ${prevYear} OR ${year} comparable sales price per sqft site:zillow.com OR site:redfin.com OR site:realtor.com`;
      return compQuery;

    case "marketTrends":
      // State-specific: use assessment level to frame market weakness
      return `"${countyStr}" "${state}" real estate market ${year} home values declining flat median price trend assessment level ${assessmentLevel}% site:zillow.com OR site:redfin.com OR site:corelogic.com OR site:housingwire.com`;

    case "zoningLandUse":
      return `"${city}" "${state}" zoning restrictions land use ${propertyType} limitations easements site:${city.toLowerCase().replace(/\s+/g, "")}${state.toLowerCase()}.gov OR site:municode.com OR site:planning.gov`;

    case "neighborhoodDistress":
      return `"${city}" "${state}" foreclosure vacancy rate distressed properties crime ${year} OR ${prevYear} neighborhood decline site:attomdata.com OR site:realtytrac.com OR site:neighborhoodscout.com`;

    case "taxAppealOutcomes":
      // State-specific: use appeal body name from rules
      const appealBody = stateRules?.primaryAppealBody || "Board of Equalization";
      return `"${countyStr}" "${state}" property tax appeal won reduction successful ${year} OR ${prevYear} assessment lowered "${appealBody}" site:${state.toLowerCase()}courts.gov OR site:propertytax.com OR site:reddit.com/r/personalfinance`;
  }
}

// ─── County Lookup Query Builders ─────────────────────────────────────────────

function buildCountyQuery(
  scenario: CountyScenario,
  countyName: string,
  state: string
): string {
  const year = new Date().getFullYear();
  const countyStr = countyName.toLowerCase().includes("county")
    ? countyName
    : `${countyName} County`;

  switch (scenario) {
    case "countyDeadline":
      return `"${countyStr}" "${state}" property tax appeal deadline ${year} filing window protest period site:${state.toLowerCase()}.gov OR site:${countyName.toLowerCase().replace(/\s+/g, "")}${state.toLowerCase()}.gov OR site:propertytax.com`;

    case "countyFilingProcedure":
      return `"${countyStr}" "${state}" how to file property tax appeal protest ${year} online portal form instructions site:${state.toLowerCase()}.gov OR site:${countyName.toLowerCase().replace(/\s+/g, "")}${state.toLowerCase()}.gov OR site:propertytax.com`;

    case "countyAssessorContact":
      return `"${countyStr}" "${state}" county assessor office phone email address website portal ${year} site:${state.toLowerCase()}.gov OR site:${countyName.toLowerCase().replace(/\s+/g, "")}${state.toLowerCase()}.gov`;
  }
}

// ─── Serper API Call ──────────────────────────────────────────────────────────

async function searchSerper(query: string, num = 5): Promise<SerperResult[]> {
  const apiKey = ENV.serperApiKey;
  if (!apiKey) {
    console.warn("[Serper] SERPER_API_KEY not set — skipping search");
    return [];
  }

  try {
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query, num, gl: "us", hl: "en" },
      {
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      }
    );

    const organic: Array<{ title: string; link: string; snippet: string; date?: string; source?: string }> =
      response.data?.organic ?? [];

    return organic.slice(0, num).map((r) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      date: r.date,
      source: r.source ?? new URL(r.link).hostname.replace("www.", ""),
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Serper] Search failed for query "${query.slice(0, 60)}...": ${msg}`);
    return [];
  }
}

// ─── Summary Builder ─────────────────────────────────────────────────────────

function buildSummary(scenario: SearchScenario, results: SerperResult[]): string {
  if (!results.length) return "No relevant data found.";

  const lines = results.slice(0, 3).map((r) => `• [${r.source}] ${r.title}: ${r.snippet}`);
  const prefix: Record<SearchScenario, string> = {
    assessorOvervaluation: "Evidence of assessor overvaluation in the area:",
    comparableSales: "Recent comparable sales data:",
    marketTrends: "Local real estate market trend indicators:",
    zoningLandUse: "Zoning and land use restrictions:",
    neighborhoodDistress: "Neighborhood distress indicators:",
    taxAppealOutcomes: "Recent tax appeal outcomes in this county:",
  };

  return `${prefix[scenario]}\n${lines.join("\n")}`;
}

// ─── County Info Extractor ────────────────────────────────────────────────────

/**
 * Uses the LLM to extract structured county filing info from raw Serper results.
 * Returns a structured DynamicCountyInfo object with confidence scoring.
 */
async function extractCountyInfoWithLLM(
  countyName: string,
  state: string,
  allResults: Array<{ scenario: CountyScenario; results: SerperResult[] }>
): Promise<DynamicCountyInfo> {
  const rawText = allResults
    .map(({ scenario, results }) => {
      const label =
        scenario === "countyDeadline"
          ? "DEADLINE & FILING WINDOW"
          : scenario === "countyFilingProcedure"
          ? "FILING PROCEDURE & PORTAL"
          : "ASSESSOR CONTACT INFO";
      const lines = results
        .map((r) => `  - ${r.title} (${r.source}): ${r.snippet}`)
        .join("\n");
      return `### ${label}\n${lines}`;
    })
    .join("\n\n");

  const sources = allResults
    .flatMap(({ results }) => results.map((r) => r.link))
    .filter(Boolean)
    .slice(0, 8);

  if (!rawText.trim()) {
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
      sources: [],
    };
  }

  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a property tax research assistant. Extract structured county filing information from Google search results. Return ONLY valid JSON matching the schema exactly. If a field cannot be determined from the search results, return null for that field.`,
        },
        {
          role: "user",
          content: `Extract property tax appeal filing information for ${countyName} County, ${state} from these search results:\n\n${rawText}\n\nReturn JSON with this exact schema:\n{\n  "appealDeadline": "string or null (e.g. 'May 31, 2025' or 'MM-DD annually')",\n  "filingWindowStart": "string or null (MM-DD format, e.g. '01-01')",\n  "filingWindowEnd": "string or null (MM-DD format, e.g. '05-31')",\n  "portalUrl": "string or null (full URL to online appeal portal)",\n  "assessorUrl": "string or null (full URL to assessor website)",\n  "assessorPhone": "string or null",\n  "assessorEmail": "string or null",\n  "filingInstructions": "string or null (2-3 sentence plain English summary of how to file)",\n  "requiredForms": "string or null (list of required forms/documents)",\n  "filingFee": "string or null (e.g. '$25' or 'Free')",\n  "confidence": "high|medium|low"\n}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "county_filing_info",
          strict: true,
          schema: {
            type: "object",
            properties: {
              appealDeadline: { type: ["string", "null"] },
              filingWindowStart: { type: ["string", "null"] },
              filingWindowEnd: { type: ["string", "null"] },
              portalUrl: { type: ["string", "null"] },
              assessorUrl: { type: ["string", "null"] },
              assessorPhone: { type: ["string", "null"] },
              assessorEmail: { type: ["string", "null"] },
              filingInstructions: { type: ["string", "null"] },
              requiredForms: { type: ["string", "null"] },
              filingFee: { type: ["string", "null"] },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: [
              "appealDeadline", "filingWindowStart", "filingWindowEnd",
              "portalUrl", "assessorUrl", "assessorPhone", "assessorEmail",
              "filingInstructions", "requiredForms", "filingFee", "confidence",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = llmResponse?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    return {
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
      confidence: parsed.confidence ?? "low",
      sources,
    };
  } catch (err) {
    console.warn(`[Serper] LLM extraction failed for ${countyName}, ${state}:`, err);
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
}

// ─── Main Exports ─────────────────────────────────────────────────────────────

export interface PropertySearchContext {
  address: string;
  city: string;
  state: string;
  county: string;
  propertyType: string;
  assessedValue?: number;
}

/**
 * Runs all 6 property research scenarios in parallel and returns structured insights.
 * Each search is independently fault-tolerant — a failure in one does not
 * block the others or the overall analysis pipeline.
 */
export async function runPropertyResearch(
  ctx: PropertySearchContext
): Promise<SerperInsight[]> {
  const scenarios: SearchScenario[] = [
    "assessorOvervaluation",
    "comparableSales",
    "marketTrends",
    "zoningLandUse",
    "neighborhoodDistress",
    "taxAppealOutcomes",
  ];

  const results = await Promise.allSettled(
    scenarios.map(async (scenario) => {
      const query = buildQuery(
        scenario,
        ctx.address,
        ctx.city,
        ctx.state,
        ctx.county,
        ctx.propertyType,
        ctx.assessedValue
      );
      const hits = await searchSerper(query, 5);
      const insight: SerperInsight = {
        scenario,
        query,
        results: hits,
        summary: buildSummary(scenario, hits),
      };
      return insight;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SerperInsight> => r.status === "fulfilled")
    .map((r) => r.value);
}

/**
 * Dynamically looks up county deadline and filing info for any county not in the DB.
 * Runs 3 targeted Serper searches in parallel, then uses the LLM to extract
 * structured data (deadline, portal URL, filing instructions, assessor contact).
 *
 * This gives AppraiseAI effective coverage of all 3,000+ US counties without
 * requiring manual data entry.
 */
export async function lookupCountyInfo(
  countyName: string,
  state: string
): Promise<DynamicCountyInfo> {
  console.log(`[Serper] Looking up county info for ${countyName}, ${state}`);

  const countyScenarios: CountyScenario[] = [
    "countyDeadline",
    "countyFilingProcedure",
    "countyAssessorContact",
  ];

  // Run all 3 county searches in parallel
  const searchResults = await Promise.allSettled(
    countyScenarios.map(async (scenario) => {
      const query = buildCountyQuery(scenario, countyName, state);
      const hits = await searchSerper(query, 6); // More results for county lookup
      return { scenario, results: hits };
    })
  );

  const allResults = searchResults
    .filter(
      (r): r is PromiseFulfilledResult<{ scenario: CountyScenario; results: SerperResult[] }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  // Use LLM to extract structured data from the raw search results
  const countyInfo = await extractCountyInfoWithLLM(countyName, state, allResults);

  console.log(
    `[Serper] County lookup complete for ${countyName}, ${state} — confidence: ${countyInfo.confidence}, deadline: ${countyInfo.appealDeadline ?? "not found"}`
  );

  return countyInfo;
}

/**
 * Formats all Serper insights into a single block of text for LLM consumption.
 * This is injected into the appraisal analysis prompt to ground the AI in
 * real, current market data specific to the user's property and county.
 */
export function formatInsightsForLLM(insights: SerperInsight[]): string {
  if (!insights.length) return "";

  const sections = insights
    .filter((i) => i.results.length > 0)
    .map((i) => i.summary);

  if (!sections.length) return "";

  return `\n\n## Web Research Findings (Current Market Intelligence)\n${sections.join("\n\n")}`;
}
