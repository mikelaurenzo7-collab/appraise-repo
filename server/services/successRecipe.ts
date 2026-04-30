/**
 * Success recipe engine.
 *
 * Builds a deterministic, county-aware appraisal playbook for the analysis
 * pipeline. It combines jurisdiction rules, scenario configuration, property
 * type methodology, and county playbooks into compact instructions that can be
 * injected into LLM prompts or rendered in operator workflows.
 */

import {
  getJurisdictionRules,
  calculateAppealViability,
  getFilingStrategy,
} from "../data/jurisdictionRules";
import { getCountyPlaybook } from "./appealStrategy";
import { getScenarioContext, type UserScenario } from "./scenarioValuation";
import type { PropertyData } from "./propertyDataAggregator";

export type SuccessRecipe = {
  jurisdiction: string;
  scenario: string;
  propertyType: string;
  expertPosture: string;
  valuationFocus: string[];
  evidenceChecklist: string[];
  countyTactics: string[];
  riskControls: string[];
  filingRecommendation: {
    method: "poa" | "pro-se" | "none";
    reasoning: string;
    estimatedFee?: number;
  };
  viabilitySignals: string[];
  promptContext: string;
};

const PROPERTY_TYPE_GUIDANCE: Record<
  string,
  { valuationFocus: string[]; evidenceChecklist: string[] }
> = {
  residential: {
    valuationFocus: [
      "Prioritize adjusted comparable sales within the same neighborhood, school district, and assessment neighborhood.",
      "Anchor the conclusion inside the comp-supported range and explain every adjustment.",
      "Check assessor facts first: living area, condition, bedroom/bath count, lot size, exemptions, and quality grade.",
    ],
    evidenceChecklist: [
      "3-7 recent comparable sales with price-per-square-foot support",
      "Assessor property record card and current assessment notice",
      "Photos or inspection notes proving condition, deferred maintenance, or feature differences",
    ],
  },
  "multi-family": {
    valuationFocus: [
      "Blend sales comparison with income capitalization; do not rely on owner-occupied comps alone.",
      "Normalize rent, vacancy, concessions, operating expenses, and cap rate assumptions.",
      "Separate building value from land or excess-site value when the county model overweights land.",
    ],
    evidenceChecklist: [
      "Rent roll, leases, vacancy history, and trailing income/expense statement",
      "Comparable rental and sale data for similar unit mix",
      "Cap-rate support and assessor income-model assumptions when available",
    ],
  },
  commercial: {
    valuationFocus: [
      "Lead with income approach when reliable operating data exists; reconcile with market sales as support.",
      "Stress vacancy, lease rollover, tenant quality, concessions, and market rent deltas.",
      "Document functional obsolescence and any zoning or use restrictions.",
    ],
    evidenceChecklist: [
      "NOI bridge, rent roll, leases, vacancy, and expense detail",
      "Comparable sales or cap-rate data for the same asset class",
      "Photos, floor plans, zoning, and deferred-maintenance documentation",
    ],
  },
  agricultural: {
    valuationFocus: [
      "Confirm use classification, productivity value, acreage, soil, water, and ag exemption eligibility.",
      "Use per-acre land comps and adjust for access, utilities, improvements, and restrictions.",
      "Separate homestead/building-site value from agricultural productivity value.",
    ],
    evidenceChecklist: [
      "Acreage, soil, water, zoning, and current-use documentation",
      "Comparable per-acre land sales with use restrictions noted",
      "Ag exemption/current-use approval or denial records",
    ],
  },
  industrial: {
    valuationFocus: [
      "Blend cost and income approaches; isolate building shell, clear height, power, docks, yard, and rail utility.",
      "Adjust for specialized improvements that do not translate dollar-for-dollar to market value.",
      "Check depreciation, functional obsolescence, and excess land assumptions.",
    ],
    evidenceChecklist: [
      "Building specifications, depreciation schedule, and cost support",
      "Industrial rent/sale comps by clear height, loading, age, and location",
      "Environmental, zoning, equipment, and functional-obsolescence documentation",
    ],
  },
  land: {
    valuationFocus: [
      "Use land-only comparables and adjust for entitlement, access, utilities, floodplain, slope, and zoning.",
      "Reject speculative highest-and-best-use assumptions unless supported by permits or market evidence.",
      "Separate development potential from current legally permissible use.",
    ],
    evidenceChecklist: [
      "Land-only comparable sales with acreage and entitlement status",
      "Zoning, floodplain, utility, access, survey, and topography records",
      "Development constraints or feasibility evidence",
    ],
  },
  unknown: {
    valuationFocus: [
      "First classify the property type from public records before selecting a valuation method.",
      "Use the most reliable available public-record facts and clearly state data limitations.",
      "Default to sales comparison only when property use and comparable universe are clear.",
    ],
    evidenceChecklist: [
      "Assessor property record card",
      "Parcel facts from at least two public or API sources",
      "Photos or owner-provided facts clarifying use and condition",
    ],
  },
};

function normalizePropertyType(
  propertyType: string
): keyof typeof PROPERTY_TYPE_GUIDANCE {
  const normalized = propertyType.toLowerCase().trim();
  if (normalized === "agricultural") return "agricultural";
  if (normalized in PROPERTY_TYPE_GUIDANCE)
    return normalized as keyof typeof PROPERTY_TYPE_GUIDANCE;
  return "unknown";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeFilingMethod(
  method: "poa" | "pro_se" | "none"
): "poa" | "pro-se" | "none" {
  return method === "pro_se" ? "pro-se" : method;
}

export function buildSuccessRecipe(
  propertyData: PropertyData,
  propertyType: string,
  scenario: UserScenario = "none"
): SuccessRecipe {
  const state = (propertyData.state || "US").toUpperCase();
  const county = propertyData.county;
  const rules = getJurisdictionRules(state, county);
  const scenarioContext = getScenarioContext(scenario);
  const countyPlaybook = getCountyPlaybook(state, county);
  const typeGuidance =
    PROPERTY_TYPE_GUIDANCE[normalizePropertyType(propertyType)];
  const assessedValue = propertyData.assessedValue || 0;
  const marketValue = propertyData.marketValue || assessedValue;
  const viability = calculateAppealViability(
    assessedValue,
    marketValue,
    state,
    county
  );
  const filing = getFilingStrategy(
    state,
    county,
    propertyType,
    assessedValue,
    marketValue
  );

  const jurisdiction = rules.county
    ? `${rules.county} County, ${rules.state}`
    : `${rules.state} statewide / county fallback`;
  const evidenceChecklist = unique([
    ...typeGuidance.evidenceChecklist,
    ...rules.documentationRequired,
    "Deadline proof: notice date, mailing date, and county appeal calendar",
    ...scenarioContext.userAdvocacyPoints.slice(0, 2),
  ]);
  const countyTactics = unique([
    ...countyPlaybook.keyStrategies,
    countyPlaybook.winningFormula,
    `Respect ${rules.appealDeadlineDays}-day ${rules.appealDeadlineType.replace(/_/g, " ")} deadline logic.`,
  ]);
  const riskControls = unique([
    ...countyPlaybook.commonErrors.map(error => `Avoid: ${error}`),
    "Do not invent facts; every recipe point must trace to public records, comps, photos, user documents, or arithmetic.",
    "Never conclude below the supportable comparable-sales or income-supported range.",
    `Verify county-specific procedure because fallback notes may apply: ${rules.notes}`,
  ]);

  const valuationFocus = unique([
    ...typeGuidance.valuationFocus,
    scenarioContext.narrativeTemplate,
    `Weight methods for this scenario: market ${(scenarioContext.valuationAdjustments.marketApproachWeight * 100).toFixed(0)}%, income ${(scenarioContext.valuationAdjustments.incomeApproachWeight * 100).toFixed(0)}%, cost ${(scenarioContext.valuationAdjustments.costApproachWeight * 100).toFixed(0)}%.`,
  ]);

  const recipe: Omit<SuccessRecipe, "promptContext"> = {
    jurisdiction,
    scenario: scenarioContext.scenarioLabel,
    propertyType,
    expertPosture:
      "Act as a county-specific appraisal expert: fair-market-value first, owner-advocacy within evidence, USPAP-aligned reasoning, no legal advice.",
    valuationFocus,
    evidenceChecklist,
    countyTactics,
    riskControls,
    filingRecommendation: {
      method: normalizeFilingMethod(filing.recommendedMethod),
      reasoning: filing.reasoning,
      estimatedFee: filing.estimatedFee,
    },
    viabilitySignals: viability.reasoning,
  };

  return {
    ...recipe,
    promptContext: formatSuccessRecipePrompt(recipe),
  };
}

function bulletList(items: string[]): string {
  return items.map(item => `- ${item}`).join("\n");
}

export function formatSuccessRecipePrompt(
  recipe: Omit<SuccessRecipe, "promptContext">
): string {
  return `
COUNTY + SCENARIO SUCCESS RECIPE
Jurisdiction: ${recipe.jurisdiction}
Scenario: ${recipe.scenario}
Property type: ${recipe.propertyType}
Expert posture: ${recipe.expertPosture}

VALUATION FOCUS:
${bulletList(recipe.valuationFocus)}

EVIDENCE CHECKLIST:
${bulletList(recipe.evidenceChecklist)}

COUNTY TACTICS:
${bulletList(recipe.countyTactics)}

RISK CONTROLS:
${bulletList(recipe.riskControls)}

FILING RECOMMENDATION:
- Method: ${recipe.filingRecommendation.method}
- Reasoning: ${recipe.filingRecommendation.reasoning}
${recipe.filingRecommendation.estimatedFee ? `- Estimated fee: $${recipe.filingRecommendation.estimatedFee.toLocaleString()}` : ""}

VIABILITY SIGNALS:
${bulletList(recipe.viabilitySignals)}
`;
}
