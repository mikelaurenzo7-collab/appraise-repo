/**
 * Appeal Strategy Service
 *
 * Generates jurisdiction-specific filing strategies and tactics
 * for maximizing appeal success rates.
 *
 * Now scenario-aware: the userScenario parameter shapes the recommended
 * filing method, opportunity factors, risk factors, and next actions
 * without leaking owner-context details into the assessor-facing report.
 */

import { getJurisdictionRule } from "../db-jurisdiction-helpers";
import type { UserScenario } from "./scenarioValuation";

export interface AppealStrategy {
  jurisdiction: string;
  filingMethod: "pro_se" | "automated_standard" | "automated_express";
  deadline: Date;
  daysUntilDeadline: number;
  estimatedCost: number;
  estimatedFee: number;
  successProbability: number;
  recommendedDocuments: string[];
  hearingTactics: string[];
  riskFactors: string[];
  opportunityFactors: string[];
  nextActions: string[];
}

// ─── SCENARIO-SPECIFIC STRATEGY OVERRIDES ───────────────────────────────────

interface ScenarioStrategyOverride {
  filingMethodBoost?: "automated_express" | "automated_standard" | "pro_se";
  successProbabilityBonus: number;
  additionalDocuments: string[];
  additionalTactics: string[];
  additionalOpportunities: string[];
  additionalRisks: string[];
  priorityNextActions: string[]; // Prepended to nextActions
}

const scenarioStrategyOverrides: Partial<Record<UserScenario, ScenarioStrategyOverride>> = {
  rental_property: {
    filingMethodBoost: "automated_standard",
    successProbabilityBonus: 8,
    additionalDocuments: [
      "Rent rolls and lease agreements (last 12 months)",
      "Operating expense statements",
      "Vacancy rate documentation",
      "Income capitalization analysis",
    ],
    additionalTactics: [
      "Lead with income approach — legally required for income-producing properties",
      "Present actual net operating income vs. assessor's assumed income",
      "Document vacancy rates and management fees",
      "Challenge assessor's cap rate assumptions with market evidence",
    ],
    additionalOpportunities: [
      "Income approach legally required — assessor must consider it",
      "Vacancy and expense documentation often reveals significant overvaluation",
    ],
    additionalRisks: [],
    priorityNextActions: [
      "Gather rent rolls, lease agreements, and expense statements",
      "Calculate net operating income and apply local cap rate",
    ],
  },

  distressed_condition: {
    successProbabilityBonus: 10,
    additionalDocuments: [
      "Contractor repair estimates (3 bids recommended)",
      "Home inspection report",
      "Photos documenting all deficiencies",
      "Insurance claim history (if applicable)",
    ],
    additionalTactics: [
      "Lead with condition evidence — photos and repair estimates are powerful",
      "Challenge assessor's assumed condition rating",
      "Request a physical re-inspection by the assessor",
      "Present distressed comparable sales to establish condition-adjusted value",
    ],
    additionalOpportunities: [
      "Mass appraisal systems assume average condition — documented deficiencies are strong evidence",
      "Physical inspection request often leads to immediate reassessment",
    ],
    additionalRisks: [
      "Assessor may argue repairs are owner's responsibility — counter with market evidence",
    ],
    priorityNextActions: [
      "Document all deficiencies with dated photos",
      "Obtain 2-3 contractor repair estimates for major deficiencies",
    ],
  },

  recently_purchased: {
    filingMethodBoost: "automated_express",
    successProbabilityBonus: 15,
    additionalDocuments: [
      "Closing disclosure (HUD-1 or CD)",
      "Purchase and sale agreement",
      "Pre-purchase inspection report",
      "Lender appraisal from closing",
    ],
    additionalTactics: [
      "Lead with purchase price — courts consistently recognize it as best evidence",
      "Present the lender's appraisal as independent corroboration",
      "Challenge any assessment that exceeds your purchase price",
    ],
    additionalOpportunities: [
      "Recent arm's-length purchase is the gold standard for market value evidence",
      "Many jurisdictions require assessment to equal purchase price after sale",
    ],
    additionalRisks: [],
    priorityNextActions: [
      "Gather closing disclosure and purchase agreement",
      "Request your lender's appraisal report",
    ],
  },

  senior_homestead: {
    successProbabilityBonus: 5,
    additionalDocuments: [
      "Proof of age (driver's license or passport)",
      "Proof of primary residence (utility bills, voter registration)",
      "Income documentation (if required for income-based exemption)",
      "Prior year tax bill showing current exemptions applied",
    ],
    additionalTactics: [
      "Verify all senior exemptions are currently applied before the hearing",
      "Request a copy of the assessor's property record card",
      "Challenge any condition rating that doesn't reflect aging-in-place maintenance",
    ],
    additionalOpportunities: [
      "Senior exemptions may not be applied — verify before filing",
      "Assessment freeze programs can lock in current value regardless of market",
      "Deferral programs can eliminate immediate cash burden",
    ],
    additionalRisks: [
      "Exemption deadlines are separate from appeal deadlines — verify both",
    ],
    priorityNextActions: [
      "Verify all senior/homestead exemptions are currently applied to your bill",
      "Check your county's senior freeze and deferral programs",
    ],
  },

  veteran_disability: {
    successProbabilityBonus: 8,
    additionalDocuments: [
      "VA disability rating letter",
      "DD-214 discharge papers",
      "Proof of primary residence",
      "Surviving spouse documentation (if applicable)",
    ],
    additionalTactics: [
      "Verify veteran/disability exemption is applied before filing the appeal",
      "ADA modifications do not increase taxable value — document and exclude them",
      "Pursue exemption AND market-value appeal simultaneously",
    ],
    additionalOpportunities: [
      "100%-disabled veterans may qualify for full exemption in most states",
      "Partial disability ratings qualify for proportional exemptions",
      "ADA modifications are non-taxable improvements in most jurisdictions",
    ],
    additionalRisks: [
      "Exemption and appeal have separate deadlines — file both promptly",
    ],
    priorityNextActions: [
      "Verify your veteran/disability exemption is applied to your current tax bill",
      "Contact your county assessor to confirm exemption status and application deadlines",
    ],
  },

  financial_hardship: {
    successProbabilityBonus: 5,
    additionalDocuments: [
      "Hardship documentation (layoff notice, medical bills, divorce decree)",
      "Income tax returns (last 2 years)",
      "Bank statements showing financial strain",
      "Any prior correspondence with assessor or tax authority",
    ],
    additionalTactics: [
      "File the market-value appeal on the merits — hardship is a separate track",
      "Request hardship deferral or payment plan from the assessor's office",
      "Ask about circuit-breaker credits that cap taxes as % of income",
    ],
    additionalOpportunities: [
      "Hardship deferrals can postpone taxes without foreclosure risk",
      "Circuit-breaker credits can cap tax burden as percentage of income",
      "Payment plans without penalty are available in most jurisdictions",
    ],
    additionalRisks: [
      "Time is critical — delinquency triggers fees and lien proceedings",
      "Hardship programs have separate application deadlines from appeals",
    ],
    priorityNextActions: [
      "File the market-value appeal immediately — do not wait",
      "Contact the assessor's office about hardship deferral and payment plans",
    ],
  },

  inherited_property: {
    successProbabilityBonus: 8,
    additionalDocuments: [
      "Probate or estate documents showing transfer",
      "Date-of-death appraisal (if available)",
      "Home inspection report documenting current condition",
      "Contractor estimates for deferred maintenance",
    ],
    additionalTactics: [
      "Emphasize as-is condition — estate properties often have deferred maintenance",
      "Stepped-up basis is for capital gains, not property tax — make this clear",
      "Present estate sale comparables as valid condition-adjusted evidence",
    ],
    additionalOpportunities: [
      "Stepped-up basis ≠ assessed value — a common assessor error",
      "Estate properties often qualify for hardship or condition-based reductions",
    ],
    additionalRisks: [],
    priorityNextActions: [
      "Document current property condition with photos and inspection report",
      "Obtain probate documents to establish transfer date and basis",
    ],
  },

  mixed_use: {
    filingMethodBoost: "automated_standard",
    successProbabilityBonus: 10,
    additionalDocuments: [
      "Floor plan showing residential vs. commercial square footage allocation",
      "Business license and commercial lease (if applicable)",
      "Income statements for commercial portion",
      "Comparable mixed-use sales in your market",
    ],
    additionalTactics: [
      "Challenge property classification — misclassification as pure commercial is common",
      "Present blended valuation: residential comps + income approach for commercial",
      "Document that homestead exemption applies to the residential portion",
    ],
    additionalOpportunities: [
      "Misclassification as pure commercial is a strong appeal ground",
      "Homestead exemption on residential portion is often overlooked",
      "Blended approach typically produces a lower value than pure-commercial assessment",
    ],
    additionalRisks: [
      "Assessor may split the assessment — ensure both portions are correctly valued",
    ],
    priorityNextActions: [
      "Verify property classification and request assessor's methodology",
      "Document square footage allocation between residential and commercial uses",
    ],
  },

  planning_to_sell: {
    successProbabilityBonus: 3,
    additionalDocuments: [
      "Comparative market analysis from a licensed real estate agent",
      "Active listings and pending sales in your neighborhood",
      "Pre-listing inspection report (if available)",
    ],
    additionalTactics: [
      "Use active listings as supporting evidence of current market conditions",
      "Emphasize that high assessment deters buyers and reduces sale price",
      "A successful appeal is a selling point — mention it in your listing",
    ],
    additionalOpportunities: [
      "Active listings and pending sales are admissible as market evidence",
      "Pre-listing appraisal serves dual purpose: appeal evidence + pricing guide",
    ],
    additionalRisks: [
      "Appeal timeline may extend beyond your planned listing date — file early",
    ],
    priorityNextActions: [
      "Obtain a comparative market analysis from a licensed agent",
      "File the appeal before listing to avoid timeline conflicts",
    ],
  },

  vacation_home: {
    successProbabilityBonus: 2,
    additionalDocuments: [
      "Seasonal use documentation",
      "Short-term rental restriction evidence (HOA rules, local ordinances)",
      "Insurance policy showing seasonal/secondary status",
    ],
    additionalTactics: [
      "Document seasonal use patterns and their impact on value",
      "Present short-term rental restrictions as value-limiting factors",
      "Challenge assessor's assumption of full-time occupancy value",
    ],
    additionalOpportunities: [
      "Seasonal depreciation and limited use justify lower valuations",
      "Short-term rental restrictions may significantly reduce market value",
    ],
    additionalRisks: [
      "Vacation homes often face higher assessment ratios — verify local rules",
    ],
    priorityNextActions: [
      "Document seasonal use and any short-term rental restrictions",
      "Verify whether local rules apply higher assessment ratios to secondary homes",
    ],
  },
};

// ─── MAIN FUNCTION ───────────────────────────────────────────────────────────

/**
 * Generate comprehensive appeal strategy for a property.
 * The userScenario parameter shapes filing method, documents, tactics,
 * and next actions without exposing owner context in the assessor-facing report.
 */
export async function generateAppealStrategy(
  state: string,
  county: string | undefined,
  propertyType: string,
  assessedValue: number,
  marketValue: number,
  noticeDate: Date,
  userScenario: UserScenario = "none"
): Promise<AppealStrategy | null> {
  const rules = await getJurisdictionRule(state, county || "Unknown");
  if (!rules) return null;

  // Calculate viability based on difference between assessed and market value
  const valueDifference = Math.abs(marketValue - assessedValue);
  const percentageDifference = (valueDifference / assessedValue) * 100;
  const isViable =
    percentageDifference >= rules.minAssessmentPercentage &&
    valueDifference >= rules.minAssessmentDifference;

  // Determine filing method based on available methods and scenario override
  const filingMethods = rules.filingMethods || ["pro_se"];
  const scenarioOverride = scenarioStrategyOverrides[userScenario];

  let recommendedMethod = (filingMethods[0] || "pro_se") as
    | "pro_se"
    | "automated_standard"
    | "automated_express";

  // Apply scenario-specific filing method boost if the jurisdiction supports it
  if (scenarioOverride?.filingMethodBoost) {
    const boosted = scenarioOverride.filingMethodBoost;
    if (filingMethods.includes(boosted)) {
      recommendedMethod = boosted;
    }
  }

  // Calculate deadline
  let deadline = new Date(noticeDate);
  if (rules.appealDeadlineType === "from_notice") {
    deadline.setDate(deadline.getDate() + rules.appealDeadlineDays);
  } else if (rules.appealDeadlineType === "calendar_year") {
    deadline = new Date(new Date().getFullYear(), 11, 31); // Dec 31 of current year
  } else if (rules.appealDeadlineType === "fiscal_year") {
    deadline = new Date(new Date().getFullYear() + 1, 5, 30); // June 30 of next year
  }

  // Calculate days until deadline
  const now = new Date();
  const daysUntilDeadline = Math.floor(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Estimate costs and fees
  const estimatedCost = isViable ? 500 : 0;
  const estimatedFee = isViable ? assessedValue * 0.01 : 0; // 1% of assessed value

  // Success probability: base + jurisdiction + scenario bonus
  const baseSuccessProbability = rules.successRate || 40;
  const scenarioBonus = scenarioOverride?.successProbabilityBonus ?? 0;
  const adjustedSuccessProbability = isViable
    ? Math.min(
        95,
        baseSuccessProbability * (1 + percentageDifference / 100) + scenarioBonus
      )
    : 0;

  // Recommended documents: base + scenario-specific
  const baseDocuments = rules.documentationRequired || [
    "Appraisal",
    "Comparable sales",
  ];
  const scenarioDocuments = scenarioOverride?.additionalDocuments ?? [];
  const recommendedDocuments = [...baseDocuments, ...scenarioDocuments];

  // Hearing tactics: base + scenario-specific
  const baseTactics = [
    "Present comparable sales data",
    "Highlight market trends",
    "Emphasize property condition",
    "Challenge assessor's methodology",
  ];
  const scenarioTactics = scenarioOverride?.additionalTactics ?? [];
  const hearingTactics = [...scenarioTactics, ...baseTactics];

  // Risk factors: base + scenario-specific
  const riskFactors: string[] = [...(scenarioOverride?.additionalRisks ?? [])];
  if (daysUntilDeadline < 30) riskFactors.push("Approaching deadline — file immediately");
  if (percentageDifference < 10) riskFactors.push("Small valuation difference may limit impact");
  if (!rules.hearingRequired) riskFactors.push("No formal hearing opportunity in this jurisdiction");

  // Opportunity factors: base + scenario-specific
  const opportunityFactors: string[] = [
    ...(scenarioOverride?.additionalOpportunities ?? []),
  ];
  if (percentageDifference > 20) opportunityFactors.push("Large valuation gap — strong appeal grounds");
  if (rules.successRate > 50) opportunityFactors.push(`High jurisdiction success rate (${rules.successRate}%)`);
  if (propertyType === "commercial") opportunityFactors.push("Commercial property — often favorable in hearings");

  // Next actions: scenario priority actions first, then standard actions
  const priorityActions = scenarioOverride?.priorityNextActions ?? [];
  const standardActions = [
    "Gather comparable sales data",
    "Document property condition",
    "Review assessor's property record card",
    "Prepare appeal statement",
    `File appeal by ${deadline.toLocaleDateString()}`,
  ];
  // Deduplicate: don't repeat steps already covered by priority actions
  const nextActions = [
    ...priorityActions,
    ...standardActions.filter(
      (a) => !priorityActions.some((p) => p.toLowerCase().includes(a.split(" ")[0].toLowerCase()))
    ),
  ];

  return {
    jurisdiction: `${county}, ${state}`,
    filingMethod: recommendedMethod,
    deadline,
    daysUntilDeadline,
    estimatedCost,
    estimatedFee,
    successProbability: adjustedSuccessProbability,
    recommendedDocuments,
    hearingTactics,
    riskFactors,
    opportunityFactors,
    nextActions,
  };
}
