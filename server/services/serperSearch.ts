/**
 * serperSearch.ts
 * Intelligent property research using Serper (Google Search API).
 *
 * Each search scenario is purpose-built for a specific appeal argument:
 *   1. assessorOvervaluation  — evidence the county over-assessed
 *   2. comparableSales        — recent sold comps to anchor lower market value
 *   3. marketTrends           — declining/flat market data weakening the assessment
 *   4. zoningLandUse          — zoning restrictions that reduce utility/value
 *   5. neighborhoodDistress   — foreclosures, vacancies, crime that depress value
 *   6. taxAppealOutcomes      — prior appeal wins in the same county (social proof + precedent)
 *
 * Results are extracted into structured SerperInsight objects and stored on the
 * analysis record so the LLM can cite them in the appraisal report.
 */

import axios from "axios";
import { ENV } from "../_core/env";

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

// ─── Query Builders ───────────────────────────────────────────────────────────

/**
 * Builds a highly targeted search query for each scenario.
 * Queries are crafted to surface the most useful evidence for a tax appeal.
 */
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

  switch (scenario) {
    case "assessorOvervaluation":
      return `"${countyStr}" "${state}" property tax over-assessed overvalued appeal reduction ${year} OR ${prevYear} site:zillow.com OR site:realtor.com OR site:assessor.gov OR site:propertytax.com`;

    case "comparableSales":
      return `"${city}" "${state}" ${propertyType} sold ${prevYear} OR ${year} comparable sales price per sqft site:zillow.com OR site:redfin.com OR site:realtor.com`;

    case "marketTrends":
      return `"${countyStr}" "${state}" real estate market ${year} home values declining flat median price trend site:zillow.com OR site:redfin.com OR site:corelogic.com OR site:housingwire.com`;

    case "zoningLandUse":
      return `"${city}" "${state}" zoning restrictions land use ${propertyType} limitations easements site:${city.toLowerCase().replace(/\s+/g, "")}${state.toLowerCase()}.gov OR site:municode.com OR site:planning.gov`;

    case "neighborhoodDistress":
      return `"${city}" "${state}" foreclosure vacancy rate distressed properties crime ${year} OR ${prevYear} neighborhood decline site:attomdata.com OR site:realtytrac.com OR site:neighborhoodscout.com`;

    case "taxAppealOutcomes":
      return `"${countyStr}" "${state}" property tax appeal won reduction successful ${year} OR ${prevYear} assessment lowered site:${state.toLowerCase()}courts.gov OR site:propertytax.com OR site:reddit.com/r/personalfinance`;
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

/**
 * Converts raw search results into a concise, LLM-ready summary string.
 * Focuses on extracting dollar amounts, percentages, and dates.
 */
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

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface PropertySearchContext {
  address: string;
  city: string;
  state: string;
  county: string;
  propertyType: string;
  assessedValue?: number;
}

/**
 * Runs all 6 scenario searches in parallel and returns structured insights.
 * Each search is independently fault-tolerant — a failure in one does not
 * block the others or the overall analysis pipeline.
 *
 * Call this from the analysis pipeline alongside the other API queries.
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
