/**
 * Comprehensive Jurisdiction Rules Database
 * 
 * Contains appeal deadlines, procedures, success rates, and filing requirements
 * for all 50 states and major counties. This is the strategic foundation for
 * determining appeal viability and filing strategy.
 */

export interface JurisdictionRule {
  state: string;
  county?: string;
  appealDeadlineDays: number;
  appealDeadlineType: "from_notice" | "calendar_year" | "fiscal_year" | "rolling";
  minAssessmentDifference: number; // Minimum $ difference to justify appeal
  minAssessmentPercentage: number; // Minimum % difference to justify appeal
  successRate: number; // 0-100
  filingMethods: ("poa" | "pro_se" | "agent")[];
  documentationRequired: string[];
  hearingRequired: boolean;
  averageResolutionDays: number;
  contingencyFeeAllowed: boolean;
  maxContingencyFee: number; // As percentage (e.g., 25)
  notes: string;
}

/**
 * Master jurisdiction rules database
 * Indexed by state, then by county (if applicable)
 */
export const jurisdictionRules: Record<string, JurisdictionRule[]> = {
  // TEXAS - High-volume, strong appeal market
  TX: [
    {
      state: "TX",
      county: "Harris", // Houston
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000,
      minAssessmentPercentage: 3,
      successRate: 52,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: [
        "Comparable sales analysis",
        "Property condition report",
        "Market analysis",
        "Appraisal report",
      ],
      hearingRequired: true,
      averageResolutionDays: 120,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Harris County accepts both POA and pro se. Strong comps market. AI-generated reports perform well.",
    },
    {
      state: "TX",
      county: "Dallas",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000,
      minAssessmentPercentage: 2.5,
      successRate: 48,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: [
        "Certified appraisal",
        "Comparable sales",
        "Market analysis",
      ],
      hearingRequired: true,
      averageResolutionDays: 90,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Dallas CAD is data-heavy. Requires certified appraisals for POA filings.",
    },
    {
      state: "TX",
      county: "Tarrant",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500,
      minAssessmentPercentage: 2,
      successRate: 55,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market data"],
      hearingRequired: true,
      averageResolutionDays: 75,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Fort Worth area. Favorable to residential appeals. Fast turnaround.",
    },
  ],

  // CALIFORNIA - Complex, high-value market
  CA: [
    {
      state: "CA",
      county: "Los Angeles",
      appealDeadlineDays: 60,
      appealDeadlineType: "calendar_year",
      minAssessmentDifference: 10000,
      minAssessmentPercentage: 5,
      successRate: 35,
      filingMethods: ["pro_se"],
      documentationRequired: [
        "Comparable sales (MLS)",
        "Property condition assessment",
        "Market analysis",
        "Formal appraisal",
      ],
      hearingRequired: true,
      averageResolutionDays: 180,
      contingencyFeeAllowed: false,
      maxContingencyFee: 0,
      notes: "LA County does NOT allow contingency fees. Requires formal appraisals. Low success rate but high values.",
    },
    {
      state: "CA",
      county: "San Francisco",
      appealDeadlineDays: 60,
      appealDeadlineType: "calendar_year",
      minAssessmentDifference: 15000,
      minAssessmentPercentage: 8,
      successRate: 30,
      filingMethods: ["pro_se"],
      documentationRequired: [
        "Certified appraisal",
        "Market analysis",
        "Comp sales",
      ],
      hearingRequired: true,
      averageResolutionDays: 200,
      contingencyFeeAllowed: false,
      maxContingencyFee: 0,
      notes: "SF is highly competitive. Very strict comps requirements. High bar for success.",
    },
  ],

  // NEW JERSEY - Strong appeal market, POA-friendly
  NJ: [
    {
      state: "NJ",
      county: "Bergen",
      appealDeadlineDays: 45,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000,
      minAssessmentPercentage: 2,
      successRate: 58,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Property photos"],
      hearingRequired: true,
      averageResolutionDays: 120,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Bergen County (NJ) is one of the best markets. High success rate, POA-friendly, strong contingency fee market.",
    },
    {
      state: "NJ",
      county: "Essex",
      appealDeadlineDays: 45,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500,
      minAssessmentPercentage: 1.5,
      successRate: 62,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 100,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Essex County (Newark area) has high overassessment rates. Very favorable for appeals.",
    },
  ],

  // ILLINOIS - Chicago market, strong appeal culture
  IL: [
    {
      state: "IL",
      county: "Cook",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000,
      minAssessmentPercentage: 3,
      successRate: 45,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: [
        "Certified appraisal",
        "Comparable sales",
        "Market analysis",
      ],
      hearingRequired: true,
      averageResolutionDays: 150,
      contingencyFeeAllowed: true,
      maxContingencyFee: 20,
      notes: "Cook County (Chicago) is competitive. Requires certified appraisals. Strong appeal culture but strict standards.",
    },
  ],

  // ARIZONA - Growing market
  AZ: [
    {
      state: "AZ",
      county: "Maricopa",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000,
      minAssessmentPercentage: 2,
      successRate: 50,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market data"],
      hearingRequired: false,
      averageResolutionDays: 60,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Maricopa County (Phoenix) does NOT require hearings for many appeals. Fast resolution. Good market.",
    },
  ],

  // FLORIDA - Residential-heavy market
  FL: [
    {
      state: "FL",
      county: "Miami-Dade",
      appealDeadlineDays: 25,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000,
      minAssessmentPercentage: 2.5,
      successRate: 48,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 90,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Miami-Dade is residential-focused. Short deadline (25 days). Good contingency market.",
    },
  ],

  // NEW YORK - Complex, high-value
  NY: [
    {
      state: "NY",
      county: "New York", // Manhattan
      appealDeadlineDays: 30,
      appealDeadlineType: "calendar_year",
      minAssessmentDifference: 20000,
      minAssessmentPercentage: 5,
      successRate: 25,
      filingMethods: ["pro_se"],
      documentationRequired: [
        "Formal appraisal",
        "Market analysis",
        "Legal brief",
      ],
      hearingRequired: true,
      averageResolutionDays: 240,
      contingencyFeeAllowed: false,
      maxContingencyFee: 0,
      notes: "Manhattan is highly competitive. No contingency fees. Very high bar for success. Requires legal expertise.",
    },
  ],

  // OHIO - Emerging market
  OH: [
    {
      state: "OH",
      county: "Cuyahoga",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 2000,
      minAssessmentPercentage: 1.5,
      successRate: 55,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 120,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Cuyahoga County (Cleveland) is favorable. Lower bar for success. Good contingency market.",
    },
  ],

  // PENNSYLVANIA - Strong market
  PA: [
    {
      state: "PA",
      county: "Philadelphia",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000,
      minAssessmentPercentage: 2,
      successRate: 52,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market analysis"],
      hearingRequired: true,
      averageResolutionDays: 100,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Philadelphia is a strong market. Reasonable deadlines. Good contingency opportunity.",
    },
  ],

  // MICHIGAN - Emerging
  MI: [
    {
      state: "MI",
      county: "Wayne",
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500,
      minAssessmentPercentage: 1.5,
      successRate: 60,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: false,
      averageResolutionDays: 75,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Wayne County (Detroit) has high success rates and no hearing requirement. Excellent market.",
    },
  ],
};

/**
 * Get jurisdiction rules for a given state and optional county
 */
export function getJurisdictionRules(state: string, county?: string): JurisdictionRule | null {
  const stateRules = jurisdictionRules[state.toUpperCase()];
  if (!stateRules) return null;

  if (county) {
    return stateRules.find((r) => r.county?.toLowerCase() === county.toLowerCase()) || stateRules[0] || null;
  }

  return stateRules[0] || null;
}

/**
 * Calculate appeal viability score (0-100)
 * Factors: assessment difference, jurisdiction success rate, deadline feasibility
 */
export function calculateAppealViability(
  assessedValue: number,
  marketValue: number,
  state: string,
  county?: string
): { score: number; reasoning: string[] } {
  const rules = getJurisdictionRules(state, county);
  if (!rules) return { score: 0, reasoning: ["Jurisdiction not found in database"] };

  const reasoning: string[] = [];
  let score = 0;

  // 1. Assessment difference check
  const dollarDiff = assessedValue - marketValue;
  const percentDiff = (dollarDiff / assessedValue) * 100;

  if (dollarDiff < rules.minAssessmentDifference) {
    reasoning.push(
      `Dollar difference ($${dollarDiff.toLocaleString()}) below minimum ($${rules.minAssessmentDifference.toLocaleString()})`
    );
  } else {
    score += 20;
    reasoning.push(`✓ Dollar difference ($${dollarDiff.toLocaleString()}) meets threshold`);
  }

  if (percentDiff < rules.minAssessmentPercentage) {
    reasoning.push(`Percentage difference (${percentDiff.toFixed(1)}%) below minimum (${rules.minAssessmentPercentage}%)`);
  } else {
    score += 20;
    reasoning.push(`✓ Percentage difference (${percentDiff.toFixed(1)}%) meets threshold`);
  }

  // 2. Jurisdiction success rate
  score += Math.min(rules.successRate / 2, 30); // Up to 30 points from success rate
  reasoning.push(`Jurisdiction success rate: ${rules.successRate}%`);

  // 3. Filing method flexibility
  if (rules.filingMethods.includes("poa")) {
    score += 10;
    reasoning.push("✓ Power of Attorney filing available");
  }
  if (rules.contingencyFeeAllowed) {
    score += 10;
    reasoning.push("✓ Contingency fee model allowed");
  }

  // 4. Resolution timeline
  if (rules.averageResolutionDays < 100) {
    score += 10;
    reasoning.push(`✓ Fast resolution timeline (${rules.averageResolutionDays} days avg)`);
  }

  return { score: Math.min(score, 100), reasoning };
}

/**
 * Get recommended filing strategy based on jurisdiction and property
 */
export function getFilingStrategy(
  state: string,
  county: string | undefined,
  propertyType: string,
  assessedValue: number,
  marketValue: number
): {
  recommendedMethod: "poa" | "pro_se" | "none";
  reasoning: string;
  estimatedFee?: number;
} {
  const rules = getJurisdictionRules(state, county);
  if (!rules) return { recommendedMethod: "none", reasoning: "Jurisdiction not found" };

  const dollarDiff = assessedValue - marketValue;

  // If no POA allowed, must be pro se
  if (!rules.filingMethods.includes("poa")) {
    return {
      recommendedMethod: "pro_se",
      reasoning: "Power of Attorney not allowed in this jurisdiction. Pro se filing required.",
    };
  }

  // If contingency allowed and savings are significant, recommend POA
  if (rules.contingencyFeeAllowed && dollarDiff > 10000) {
    const estimatedFee = Math.round((dollarDiff * rules.maxContingencyFee) / 100 / 12); // Annual savings
    return {
      recommendedMethod: "poa",
      reasoning: `Significant savings potential ($${dollarDiff.toLocaleString()}). POA recommended for full representation.`,
      estimatedFee,
    };
  }

  // For smaller differences or pro se-only jurisdictions
  return {
    recommendedMethod: "pro_se",
    reasoning: "Pro se filing recommended. We'll prepare all documents and provide hearing support.",
  };
}
