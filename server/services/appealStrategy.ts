/**
 * Appeal Strategy Service
 * 
 * Generates jurisdiction-specific filing strategies and tactics
 * for maximizing appeal success rates.
 */

import { getJurisdictionRule } from "../db-jurisdiction-helpers";

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

/**
 * Generate comprehensive appeal strategy for a property
 */
export async function generateAppealStrategy(
  state: string,
  county: string | undefined,
  propertyType: string,
  assessedValue: number,
  marketValue: number,
  noticeDate: Date
): Promise<AppealStrategy | null> {
  const rules = await getJurisdictionRule(state, county || "Unknown");
  if (!rules) return null;

  // Calculate viability based on difference between assessed and market value
  const valueDifference = Math.abs(marketValue - assessedValue);
  const percentageDifference = (valueDifference / assessedValue) * 100;
  const isViable = percentageDifference >= rules.minAssessmentPercentage && valueDifference >= rules.minAssessmentDifference;

  // Determine filing method based on available methods
  const filingMethods = rules.filingMethods || ["pro_se"];
  const recommendedMethod = (filingMethods[0] || "pro_se") as "pro_se" | "automated_standard" | "automated_express";

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
  const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Estimate costs and fees
  const estimatedCost = isViable ? 500 : 0;
  const estimatedFee = isViable ? assessedValue * 0.01 : 0; // 1% of assessed value

  // Success probability based on jurisdiction rules and property factors
  const baseSuccessProbability = rules.successRate || 40;
  const adjustedSuccessProbability = isViable ? Math.min(100, baseSuccessProbability * (1 + percentageDifference / 100)) : 0;

  // Recommended documents based on jurisdiction rules
  const recommendedDocuments = rules.documentationRequired || ["Appraisal", "Comparable sales"];

  // Hearing tactics based on property type and jurisdiction
  const hearingTactics = [
    "Present comparable sales data",
    "Highlight market trends",
    "Emphasize property condition",
    "Challenge assessor's methodology",
  ];

  // Risk factors
  const riskFactors = [];
  if (daysUntilDeadline < 30) riskFactors.push("Approaching deadline");
  if (percentageDifference < 10) riskFactors.push("Small valuation difference");
  if (!rules.hearingRequired) riskFactors.push("No hearing opportunity");

  // Opportunity factors
  const opportunityFactors = [];
  if (percentageDifference > 20) opportunityFactors.push("Large valuation gap");
  if (rules.successRate > 50) opportunityFactors.push("High jurisdiction success rate");
  if (propertyType === "commercial") opportunityFactors.push("Commercial property (often favorable)");

  // Next actions
  const nextActions = [
    "Gather comparable sales data",
    "Document property condition",
    "Review assessor's report",
    "Prepare appeal statement",
    `File appeal by ${deadline.toLocaleDateString()}`,
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
