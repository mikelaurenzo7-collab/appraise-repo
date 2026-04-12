/**
 * Appeal Strategy Service
 * 
 * Generates jurisdiction-specific filing strategies and tactics
 * for maximizing appeal success rates.
 */

import {
  getJurisdictionRules,
  calculateAppealViability,
  getFilingStrategy,
} from "../data/jurisdictionRules";

export interface AppealStrategy {
  jurisdiction: string;
  filingMethod: "poa" | "pro_se";
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

/**
 * Generate comprehensive appeal strategy for a property
 */
export function generateAppealStrategy(
  state: string,
  county: string | undefined,
  propertyType: string,
  assessedValue: number,
  marketValue: number,
  noticeDate: Date
): AppealStrategy | null {
  const rules = getJurisdictionRules(state, county);
  if (!rules) return null;

  const viability = calculateAppealViability(assessedValue, marketValue, state, county);
  const filing = getFilingStrategy(state, county, propertyType, assessedValue, marketValue);

  // If filing is not recommended, return null
  if (filing.recommendedMethod === "none") {
    return null;
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

  const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  // Estimate costs
  const estimatedCost = filing.recommendedMethod === "poa" ? 500 : 200; // POA filing is more expensive
  const estimatedFee = filing.estimatedFee || 0;

  // Calculate success probability
  const successProbability = Math.min(
    viability.score + (rules.successRate - 50) / 2, // Adjust by jurisdiction success rate
    95
  );

  // Generate jurisdiction-specific tactics
  const hearingTactics = getHearingTactics(state, county, propertyType);
  const recommendedDocuments = getRecommendedDocuments(state, county, propertyType);
  const riskFactors = getRiskFactors(state, county, daysUntilDeadline, viability.score);
  const opportunityFactors = getOpportunityFactors(state, county, assessedValue, marketValue);

  // Generate next actions
  const nextActions: string[] = [];
  if (daysUntilDeadline < 14) {
    nextActions.push("⚠️ URGENT: File appeal immediately - deadline approaching");
  } else if (daysUntilDeadline < 30) {
    nextActions.push("File appeal within next 2 weeks to ensure timely submission");
  }
  nextActions.push(`Gather required documentation: ${recommendedDocuments.slice(0, 2).join(", ")}`);
  if (filing.recommendedMethod === "poa") {
    nextActions.push("Sign power of attorney form to authorize representation");
  } else {
    nextActions.push("Prepare pro se filing documents - we'll provide templates");
  }
  nextActions.push("Schedule property inspection if required by jurisdiction");

  return {
    jurisdiction: county ? `${county}, ${state}` : state,
    filingMethod: filing.recommendedMethod,
    deadline,
    daysUntilDeadline,
    estimatedCost,
    estimatedFee,
    successProbability: Math.round(successProbability),
    recommendedDocuments,
    hearingTactics,
    riskFactors,
    opportunityFactors,
    nextActions,
  };
}

/**
 * Get jurisdiction-specific hearing tactics
 */
function getHearingTactics(state: string, county: string | undefined, propertyType: string): string[] {
  const tactics: string[] = [];

  // General tactics
  tactics.push("Lead with market data - comparable sales are most persuasive");
  tactics.push("Emphasize recent sales within 6 months");
  tactics.push("Highlight assessment errors (wrong square footage, wrong condition)");

  // Jurisdiction-specific tactics
  if (state === "TX") {
    tactics.push("Texas boards value recent MLS data heavily - bring printouts");
    tactics.push("Emphasize property condition - Texas assessors often overestimate condition");
  }

  if (state === "NJ") {
    tactics.push("NJ assessors respond well to certified appraisals - bring original");
    tactics.push("Highlight comparable properties in same school district");
  }

  if (state === "IL") {
    tactics.push("Cook County values formal appraisals - must be USPAP-compliant");
    tactics.push("Bring photos showing property condition vs. assessment");
  }

  if (state === "CA") {
    tactics.push("California boards require MLS data - bring printed comparables");
    tactics.push("Emphasize market conditions at time of assessment");
  }

  // Property-type specific
  if (propertyType === "commercial") {
    tactics.push("Focus on income approach - NOI and cap rates");
    tactics.push("Bring lease agreements and rent rolls");
  }

  if (propertyType === "multi-family") {
    tactics.push("Emphasize rental income vs. assessed value");
    tactics.push("Bring tenant leases and rent history");
  }

  return tactics;
}

/**
 * Get recommended documents for filing
 */
function getRecommendedDocuments(state: string, county: string | undefined, propertyType: string): string[] {
  const docs = [
    "Certified appraisal report",
    "Comparable sales analysis (3-5 recent sales)",
    "Property photos (interior & exterior)",
    "Assessment notice from county",
    "Deed or title document",
  ];

  if (state === "TX") {
    docs.push("MLS printouts for comparable properties");
  }

  if (state === "NJ" || state === "IL") {
    docs.push("USPAP-compliant appraisal (required)");
  }

  if (propertyType === "commercial" || propertyType === "multi-family") {
    docs.push("Income and expense statement");
    docs.push("Tenant lease agreements");
  }

  return docs;
}

/**
 * Identify risk factors that could reduce success probability
 */
function getRiskFactors(state: string, county: string | undefined, daysUntilDeadline: number, viabilityScore: number): string[] {
  const risks: string[] = [];

  if (daysUntilDeadline < 14) {
    risks.push("⚠️ Deadline is very close - limited time to prepare");
  }

  if (viabilityScore < 40) {
    risks.push("⚠️ Weak case - overassessment is marginal");
  }

  if (state === "CA") {
    risks.push("California has low appeal success rates - high bar for evidence");
  }

  if (state === "NY") {
    risks.push("New York requires legal expertise - consider attorney");
  }

  return risks;
}

/**
 * Identify opportunity factors that could increase success probability
 */
function getOpportunityFactors(state: string, county: string | undefined, assessedValue: number, marketValue: number): string[] {
  const opportunities: string[] = [];

  const diff = assessedValue - marketValue;
  const percentDiff = (diff / assessedValue) * 100;

  if (percentDiff > 10) {
    opportunities.push("✓ Large overassessment (>10%) - strong case");
  }

  if (diff > 20000) {
    opportunities.push("✓ High dollar amount - significant savings potential");
  }

  if (state === "NJ" || state === "MI" || state === "OH") {
    opportunities.push("✓ Favorable jurisdiction - high success rates");
  }

  if (state === "TX") {
    opportunities.push("✓ Strong market - many recent comparable sales available");
  }

  return opportunities;
}

/**
 * Generate county-specific playbook (tactics that work in specific counties)
 */
export function getCountyPlaybook(state: string, county: string | undefined): {
  name: string;
  keyStrategies: string[];
  commonErrors: string[];
  winningFormula: string;
} {
  const playbooks: Record<string, Record<string, any>> = {
    TX: {
      Harris: {
        name: "Houston (Harris County) Playbook",
        keyStrategies: [
          "Lead with recent MLS data (within 6 months)",
          "Emphasize assessment errors (wrong square footage is common)",
          "Bring photos showing actual condition vs. assessment",
          "Use comparable properties in same neighborhood",
        ],
        commonErrors: [
          "Using old sales data (>1 year)",
          "Not bringing physical evidence",
          "Focusing on opinion rather than data",
        ],
        winningFormula:
          "Strong comparable sales + clear assessment error + professional presentation = 50%+ success",
      },
      Dallas: {
        name: "Dallas CAD Playbook",
        keyStrategies: [
          "Certified appraisals are required for POA filings",
          "Dallas CAD is data-driven - bring detailed documentation",
          "Emphasize recent market changes",
        ],
        commonErrors: [
          "Submitting uncertified appraisals",
          "Not addressing CAD's specific data",
        ],
        winningFormula: "Certified appraisal + market analysis + POA filing = 48%+ success",
      },
    },
    NJ: {
      Bergen: {
        name: "Bergen County Playbook",
        keyStrategies: [
          "Bergen County is one of the best markets for appeals",
          "Use comparable properties within same school district",
          "Bring USPAP-compliant appraisals",
        ],
        commonErrors: [
          "Using properties from different school districts",
          "Not bringing professional appraisals",
        ],
        winningFormula: "Professional appraisal + local comps + POA = 58%+ success",
      },
    },
    IL: {
      Cook: {
        name: "Cook County Playbook",
        keyStrategies: [
          "Cook County requires certified appraisals",
          "Bring detailed market analysis",
          "Emphasize assessment methodology errors",
        ],
        commonErrors: [
          "Submitting uncertified appraisals",
          "Not understanding Cook County's assessment methodology",
        ],
        winningFormula: "Certified appraisal + methodology analysis + market data = 45%+ success",
      },
    },
  };

  const countyPlaybook =
    playbooks[state]?.[county || ""] ||
    playbooks[state]?.[Object.keys(playbooks[state] || {})[0]] ||
    {
      name: `${state} General Playbook`,
      keyStrategies: [
        "Use recent comparable sales",
        "Bring professional appraisal",
        "Document assessment errors",
      ],
      commonErrors: ["Using old data", "Weak documentation"],
      winningFormula: "Strong data + professional presentation = success",
    };

  return countyPlaybook;
}
