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
  // TEXAS — May 15 deadline statewide via the appraisal protest system. High
  // volume, strong appeal culture, both POA and pro-se permitted everywhere.
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
      documentationRequired: ["Comparable sales analysis", "Property condition report", "Market analysis", "Appraisal report"],
      hearingRequired: true,
      averageResolutionDays: 120,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Harris County accepts both POA and pro se. Strong comps market. AI-generated reports perform well.",
    },
    {
      state: "TX", county: "Dallas",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 48, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Certified appraisal", "Comparable sales", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Dallas CAD is data-heavy. Requires certified appraisals for POA filings.",
    },
    {
      state: "TX", county: "Tarrant",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 55, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market data"],
      hearingRequired: true, averageResolutionDays: 75,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Fort Worth area. Favorable to residential appeals. Fast turnaround.",
    },
    {
      state: "TX", county: "Bexar", // San Antonio
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2.5,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market data"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Bexar Appraisal District. Reasonable hearing posture; informal review often resolves.",
    },
    {
      state: "TX", county: "Travis", // Austin
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000, minAssessmentPercentage: 3,
      successRate: 47, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comparable sales", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Travis CAD. Hot market = aggressive assessments; comps within 0.5mi and 90 days are critical.",
    },
    {
      state: "TX", county: "Collin",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 53, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 75,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Collin CAD (Plano/Frisco). Strong residential appeal market.",
    },
    {
      state: "TX", county: "Denton",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2.5,
      successRate: 54, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 80,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Denton CAD. Favorable success rate, fast turnaround.",
    },
    {
      state: "TX", county: "Williamson",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2.5,
      successRate: 51, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Williamson CAD (north of Austin). Aggressive assessments tracking the Austin metro.",
    },
    {
      state: "TX", county: "Fort Bend",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Fort Bend CAD (Sugar Land/Houston suburbs). Reasonable ARB.",
    },
    {
      state: "TX", county: "Montgomery",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 54, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 75,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Montgomery CAD (The Woodlands area). Favorable to documented appeals.",
    },
  ],

  // CALIFORNIA — Sept 15 (some counties Nov 30) deadline. Prop 13 limits
  // assessment increases to 2%/yr for non-transferring properties; Prop 8
  // appeals (decline-in-value) are the typical lever. Most counties do NOT
  // permit contingency-fee filing; pro-se is the default.
  CA: [
    {
      state: "CA", county: "Los Angeles",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 10000, minAssessmentPercentage: 5,
      successRate: 35, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Property condition assessment", "Market analysis", "Formal appraisal"],
      hearingRequired: true, averageResolutionDays: 180,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "LA County does NOT allow contingency fees. Requires formal appraisals. Low success rate but high values.",
    },
    {
      state: "CA", county: "San Francisco",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 15000, minAssessmentPercentage: 8,
      successRate: 30, filingMethods: ["pro_se"],
      documentationRequired: ["Certified appraisal", "Market analysis", "Comp sales"],
      hearingRequired: true, averageResolutionDays: 200,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "SF is highly competitive. Very strict comps requirements. High bar for success.",
    },
    {
      state: "CA", county: "Orange",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 8000, minAssessmentPercentage: 5,
      successRate: 38, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Market analysis", "Formal appraisal"],
      hearingRequired: true, averageResolutionDays: 150,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Orange County. Decline-in-value (Prop 8) appeals work best when the prior peak assessment is now above market.",
    },
    {
      state: "CA", county: "San Diego",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 7500, minAssessmentPercentage: 5,
      successRate: 40, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Formal appraisal"],
      hearingRequired: true, averageResolutionDays: 130,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "San Diego AAB. Reasonably accessible appeal process; informal review often catches obvious overassessments.",
    },
    {
      state: "CA", county: "Santa Clara",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 15000, minAssessmentPercentage: 5,
      successRate: 32, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Formal appraisal"],
      hearingRequired: true, averageResolutionDays: 180,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Santa Clara (Silicon Valley). Very high values; strict evidence standard.",
    },
    {
      state: "CA", county: "Alameda",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 10000, minAssessmentPercentage: 5,
      successRate: 36, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 160,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Alameda County (Oakland/Berkeley). Standard CA pro-se rules apply.",
    },
    {
      state: "CA", county: "Riverside",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 6000, minAssessmentPercentage: 4,
      successRate: 42, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 140,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Riverside County. Inland Empire. More forgiving evidentiary bar than coastal counties.",
    },
    {
      state: "CA", county: "San Bernardino",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 5000, minAssessmentPercentage: 4,
      successRate: 44, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 130,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "San Bernardino County. Lowest CA evidentiary bar; reasonable success on Prop 8 appeals.",
    },
    {
      state: "CA", county: "Sacramento",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 5000, minAssessmentPercentage: 4,
      successRate: 45, filingMethods: ["pro_se"],
      documentationRequired: ["Comparable sales (MLS)", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Sacramento County. Capital region, moderate values, accessible appeal process.",
    },
  ],

  // NEW JERSEY — April 1 statewide deadline (Jan 15 for revaluation/reass
  // years). One of the strongest U.S. appeal markets — high success rate,
  // POA-friendly, robust contingency-fee market.
  NJ: [
    {
      state: "NJ", county: "Bergen",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 58, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Property photos"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Bergen County (NJ) is one of the best markets. High success rate, POA-friendly, strong contingency fee market.",
    },
    {
      state: "NJ", county: "Essex",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 1.5,
      successRate: 62, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Essex County (Newark area) has high overassessment rates. Very favorable for appeals.",
    },
    {
      state: "NJ", county: "Hudson",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 60, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Hudson County (Jersey City/Hoboken). High-density urban; strong appeal volume.",
    },
    {
      state: "NJ", county: "Middlesex",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 1.5,
      successRate: 59, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Middlesex County. Reliable appeal venue; consistent results with documented comps.",
    },
    {
      state: "NJ", county: "Monmouth",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 56, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Monmouth County. Annual reassessment program — appeals work best in years following major reval.",
    },
    {
      state: "NJ", county: "Morris",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 54, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 105,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Morris County. Higher-end residential; full appraisal report carries decisive weight.",
    },
    {
      state: "NJ", county: "Union",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 1.5,
      successRate: 60, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Union County. Strong success rates on documented overassessments.",
    },
  ],

  // ILLINOIS — Triennial reassessment in Cook (1/3 of townships per year);
  // township-specific deadlines run 30 days from publication. PTAB appeal
  // available after assessor + BOR.
  IL: [
    {
      state: "IL", county: "Cook",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000, minAssessmentPercentage: 3,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Certified appraisal", "Comparable sales", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 150,
      contingencyFeeAllowed: true, maxContingencyFee: 20,
      notes: "Cook County (Chicago) is competitive. Requires certified appraisals. Strong appeal culture but strict standards.",
    },
    {
      state: "IL", county: "DuPage",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 53, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Property photos"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "DuPage County (Naperville/west suburbs). Less rigid than Cook; good comp-driven appeals.",
    },
    {
      state: "IL", county: "Lake",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Lake County (north suburbs). Reasonable BOR; township-by-township.",
    },
    {
      state: "IL", county: "Will",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Will County (Joliet/south suburbs). Lower bar; growing market.",
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

  // FLORIDA — VAB (Value Adjustment Board) appeals; ~25-day deadline from
  // TRIM notice (mailed mid-August). Strong Save Our Homes cap on homestead
  // (3%/yr). POA-friendly statewide; contingency-fee market is robust.
  FL: [
    {
      state: "FL", county: "Miami-Dade",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 48, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Miami-Dade is residential-focused. Short deadline (25 days). Good contingency market.",
    },
    {
      state: "FL", county: "Broward",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2.5,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Broward County (Fort Lauderdale). High residential volume; VAB hearings well organized.",
    },
    {
      state: "FL", county: "Palm Beach",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000, minAssessmentPercentage: 3,
      successRate: 47, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Palm Beach County. Higher-end residential; appraisals carry weight at VAB.",
    },
    {
      state: "FL", county: "Hillsborough",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 53, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 80,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Hillsborough County (Tampa). Strong residential appeal market, fast resolution.",
    },
    {
      state: "FL", county: "Orange",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 80,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Orange County (Orlando). Tourism-influenced market; STR-aware comp selection helps.",
    },
    {
      state: "FL", county: "Pinellas",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 54, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 75,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Pinellas County (St. Petersburg). Reasonable VAB; residential success consistently >50%.",
    },
    {
      state: "FL", county: "Duval",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 55, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 75,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Duval County (Jacksonville). Lowest evidentiary bar in FL major metros.",
    },
    {
      state: "FL", county: "Lee",
      appealDeadlineDays: 25, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2.5,
      successRate: 51, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 80,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Lee County (Fort Myers/Cape Coral). Hurricane impact comps often accepted as condition evidence.",
    },
  ],

  // NEW YORK — Grievance Day (4th Tue in May for most towns; varies by NYC
  // & Long Island). Article 7 SCAR proceedings available statewide for
  // residential. NYC and Manhattan are uniquely complex.
  NY: [
    {
      state: "NY", county: "New York", // Manhattan
      appealDeadlineDays: 30, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 20000, minAssessmentPercentage: 5,
      successRate: 25, filingMethods: ["pro_se"],
      documentationRequired: ["Formal appraisal", "Market analysis", "Legal brief"],
      hearingRequired: true, averageResolutionDays: 240,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Manhattan is highly competitive. No contingency fees. Very high bar for success. Requires legal expertise.",
    },
    {
      state: "NY", county: "Nassau",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2,
      successRate: 65, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Property photos"],
      hearingRequired: false, averageResolutionDays: 180,
      contingencyFeeAllowed: true, maxContingencyFee: 50,
      notes: "Nassau County (Long Island) is the BEST appeal market in NY — annual reassessment, 60%+ success on residential, contingency-fee firms common. ARC + SCAR pathways.",
    },
    {
      state: "NY", county: "Suffolk",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 58, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Property photos"],
      hearingRequired: true, averageResolutionDays: 150,
      contingencyFeeAllowed: true, maxContingencyFee: 50,
      notes: "Suffolk County (LI East). Town-by-town BAR; SCAR fallback if BAR denies. Strong contingency-fee market.",
    },
    {
      state: "NY", county: "Westchester",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000, minAssessmentPercentage: 3,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comparable sales"],
      hearingRequired: true, averageResolutionDays: 150,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Westchester County. Town-by-town with significant variation; recent revals favor appeals.",
    },
    {
      state: "NY", county: "Kings", // Brooklyn
      appealDeadlineDays: 30, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 8000, minAssessmentPercentage: 4,
      successRate: 30, filingMethods: ["pro_se"],
      documentationRequired: ["Formal appraisal", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 220,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Brooklyn (Kings). NYC Tax Commission process; complex but worthwhile on high-value properties.",
    },
    {
      state: "NY", county: "Queens",
      appealDeadlineDays: 30, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 7000, minAssessmentPercentage: 3.5,
      successRate: 32, filingMethods: ["pro_se"],
      documentationRequired: ["Formal appraisal", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 220,
      contingencyFeeAllowed: false, maxContingencyFee: 0,
      notes: "Queens. NYC Tax Commission. Tax Class 1 residential gets lighter scrutiny than Class 2/4.",
    },
    {
      state: "NY", county: "Erie",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2000, minAssessmentPercentage: 1.5,
      successRate: 55, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Erie County (Buffalo). Lower values, accessible BAR, reasonable success rates.",
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
      state: "MI", county: "Wayne",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 1.5,
      successRate: 60, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: false, averageResolutionDays: 75,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Wayne County (Detroit) has high success rates and no hearing requirement. Excellent market.",
    },
    {
      state: "MI", county: "Oakland",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 55, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Oakland County (north Detroit suburbs). MI Tax Tribunal as next step if BOR denies.",
    },
  ],

  // GEORGIA — 45-day deadline from notice. Strong appeal market, robust
  // contingency-fee firms, county Boards of Equalization handle most cases.
  GA: [
    {
      state: "GA", county: "Fulton", // Atlanta
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 55, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal", "Property photos"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Fulton County. Strong appeal volume, BOE accessible, three-tier appeal path (BOE → arbitration → Superior Court).",
    },
    {
      state: "GA", county: "DeKalb",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 57, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "DeKalb County. Reasonable BOE; appeal rates above state average.",
    },
    {
      state: "GA", county: "Cobb",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 54, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Cobb County (Marietta). Established appeal market.",
    },
    {
      state: "GA", county: "Gwinnett",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 56, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 85,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Gwinnett County (NE Atlanta). Growing market, friendly to documented appeals.",
    },
  ],

  // NORTH CAROLINA — 30 days from notice; revaluation cycle is 4-8 yrs by
  // county. Appeal goes to county BOE then NC Property Tax Commission.
  NC: [
    {
      state: "NC", county: "Mecklenburg", // Charlotte
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Mecklenburg County (Charlotte). Quadrennial reval cycle; appeals best in years 1-2 after reval.",
    },
    {
      state: "NC", county: "Wake", // Raleigh
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 95,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Wake County (Raleigh). Hot market, frequent reval — appeals well-supported.",
    },
    {
      state: "NC", county: "Guilford",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2000, minAssessmentPercentage: 1.5,
      successRate: 53, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Guilford County (Greensboro). Triad market; reasonable evidentiary bar.",
    },
  ],

  // WASHINGTON — July 1 deadline (or 60 days from notice, whichever is later).
  // Appeal goes to county BOE then WA Board of Tax Appeals.
  WA: [
    {
      state: "WA", county: "King", // Seattle
      appealDeadlineDays: 60, appealDeadlineType: "from_notice",
      minAssessmentDifference: 7500, minAssessmentPercentage: 4,
      successRate: 38, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal", "Market analysis"],
      hearingRequired: true, averageResolutionDays: 150,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "King County (Seattle). High values, sophisticated assessor; comp-band evidence essential.",
    },
    {
      state: "WA", county: "Pierce",
      appealDeadlineDays: 60, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 130,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Pierce County (Tacoma). More forgiving than King; reasonable BOE.",
    },
    {
      state: "WA", county: "Snohomish",
      appealDeadlineDays: 60, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 46, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 130,
      contingencyFeeAllowed: true, maxContingencyFee: 25,
      notes: "Snohomish County (north of Seattle). Growing volume, accessible appeal process.",
    },
  ],

  // MASSACHUSETTS — Feb 1 deadline (Q3 ATB); abatement to local board, then
  // ATB on appeal. Strong protections for owner-occupied.
  MA: [
    {
      state: "MA", county: "Suffolk", // Boston
      appealDeadlineDays: 90, appealDeadlineType: "fiscal_year",
      minAssessmentDifference: 5000, minAssessmentPercentage: 3,
      successRate: 42, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 140,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Suffolk County (Boston). High values; Appellate Tax Board is the secondary venue.",
    },
    {
      state: "MA", county: "Middlesex",
      appealDeadlineDays: 90, appealDeadlineType: "fiscal_year",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 130,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Middlesex County. Largest MA county; town-by-town variation.",
    },
    {
      state: "MA", county: "Worcester",
      appealDeadlineDays: 90, appealDeadlineType: "fiscal_year",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Worcester County. Lower values, more accessible appeal process.",
    },
  ],

  // COLORADO — June 1 deadline (changes biannual reassessment years). Notice
  // of valuation issued May 1; assessor → BOE → BAA appeal pathway.
  CO: [
    {
      state: "CO", county: "Denver",
      appealDeadlineDays: 31, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Denver. Biennial reassessment; appeal works best in reval years.",
    },
    {
      state: "CO", county: "Jefferson",
      appealDeadlineDays: 31, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 47, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Jefferson County (west of Denver). Reasonable BOE.",
    },
    {
      state: "CO", county: "El Paso",
      appealDeadlineDays: 31, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "El Paso County (Colorado Springs). Friendly appeal venue.",
    },
  ],

  // VIRGINIA — Most localities use 30-90 day windows from notice. Boards of
  // Equalization vary considerably by city/county.
  VA: [
    {
      state: "VA", county: "Fairfax",
      appealDeadlineDays: 60, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Fairfax County (DC suburbs). Sophisticated assessor; well-documented appraisals essential.",
    },
    {
      state: "VA", county: "Loudoun",
      appealDeadlineDays: 60, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 47, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Loudoun County. Hot market; appeals well-supported with current comps.",
    },
    {
      state: "VA", county: "Prince William",
      appealDeadlineDays: 60, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Prince William County. Reasonable BOE; growing residential market.",
    },
  ],

  // MARYLAND — 45 days from notice. SDAT handles assessments centrally;
  // three-step appeal (Supervisor → PTAAB → Tax Court).
  MD: [
    {
      state: "MD", county: "Montgomery",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000, minAssessmentPercentage: 2.5,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Montgomery County (DC suburbs). Triennial reassessment cycle.",
    },
    {
      state: "MD", county: "Prince George's",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Prince George's County. More accessible than Montgomery; consistent results.",
    },
    {
      state: "MD", county: "Baltimore",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Baltimore County. Reasonable evidentiary bar.",
    },
  ],

  // MINNESOTA — April 30 (open book) or May 31 (Local Board) deadlines.
  // Appeal to county BOE, then MN Tax Court.
  MN: [
    {
      state: "MN", county: "Hennepin", // Minneapolis
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Hennepin County (Minneapolis). Sophisticated assessor; documented comps essential.",
    },
    {
      state: "MN", county: "Ramsey",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Ramsey County (St. Paul). Reasonable BOE; appeal volume manageable.",
    },
  ],

  // NEVADA — Jan 15 deadline. Significant cap on residential increases (3%/yr
  // primary, 8%/yr other). State BOE covers entire state.
  NV: [
    {
      state: "NV", county: "Clark", // Las Vegas
      appealDeadlineDays: 15, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 48, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Clark County (Las Vegas). VERY short deadline (mid-January). Plan ahead.",
    },
    {
      state: "NV", county: "Washoe", // Reno
      appealDeadlineDays: 15, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Washoe County (Reno). Same compressed deadline as Clark.",
    },
  ],

  // OREGON — Dec 31 deadline. Magistrate Division of OR Tax Court handles
  // appeals from county BOPTA.
  OR: [
    {
      state: "OR", county: "Multnomah", // Portland
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 3500, minAssessmentPercentage: 2,
      successRate: 45, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 130,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Multnomah County (Portland). Measure 50 cap complicates appeals; RMV vs MAV distinction matters.",
    },
    {
      state: "OR", county: "Washington",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 47, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Washington County (Beaverton/Hillsboro, west of Portland). Reasonable BOPTA.",
    },
  ],

  // CONNECTICUT — Feb 20 deadline (Board of Assessment Appeals). Strong
  // appeal market, especially in revaluation years.
  CT: [
    {
      state: "CT", county: "Fairfield",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 5000, minAssessmentPercentage: 2.5,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 120,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Fairfield County (Stamford/Greenwich). High values; municipalities revalue every 5 years.",
    },
    {
      state: "CT", county: "Hartford",
      appealDeadlineDays: 60, appealDeadlineType: "calendar_year",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 53, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Hartford County. Lower values; consistent BAA decisions.",
    },
  ],

  // MISSOURI — 3rd Mon in July deadline (BOE). Appeals to MO State Tax
  // Commission as secondary venue.
  MO: [
    {
      state: "MO", county: "St. Louis",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "St. Louis County. Biennial reassessment; appeals best in odd years.",
    },
    {
      state: "MO", county: "Jackson",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2000, minAssessmentPercentage: 1.5,
      successRate: 53, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 90,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Jackson County (Kansas City). Recent reassessment controversies; appeals well-supported.",
    },
  ],

  // TENNESSEE — June 30 deadline (county BOE), then State Board. 4-6 yr
  // reappraisal cycle by county.
  TN: [
    {
      state: "TN", county: "Davidson", // Nashville
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 47, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales", "Appraisal"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Davidson County (Nashville). Quadrennial reappraisal; appeals strongest in years 1-2.",
    },
    {
      state: "TN", county: "Shelby", // Memphis
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2000, minAssessmentPercentage: 1.5,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Shelby County (Memphis). Reasonable BOE; lower evidentiary bar.",
    },
  ],

  // INDIANA — 45 days from Form 11 notice. BOE then Indiana Board of Tax
  // Review for residential.
  IN: [
    {
      state: "IN", county: "Marion", // Indianapolis
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Marion County (Indianapolis). Annual trending adjustments; appeal best when sales lag the trend.",
    },
    {
      state: "IN", county: "Lake",
      appealDeadlineDays: 45, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2000, minAssessmentPercentage: 1.5,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Lake County (Gary/NW IN). Lower values; reasonable BOE.",
    },
  ],

  // WISCONSIN — Open Book / Board of Review process. ~30 day window from
  // notice; specific dates set per municipality.
  WI: [
    {
      state: "WI", county: "Milwaukee",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Milwaukee County. Annual revaluations; municipal BOR is gatekeeper.",
    },
    {
      state: "WI", county: "Dane",
      appealDeadlineDays: 30, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 48, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Dane County (Madison). Hot market; appeals best when sale comps are within 6 months.",
    },
  ],

  // SOUTH CAROLINA — 90 days from notice. ATAX (assessment appeals) handles.
  SC: [
    {
      state: "SC", county: "Charleston",
      appealDeadlineDays: 90, appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000, minAssessmentPercentage: 2,
      successRate: 50, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 110,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Charleston County. Long deadline; 5-year reassessment cycle (Point of Sale captures uplift).",
    },
    {
      state: "SC", county: "Greenville",
      appealDeadlineDays: 90, appealDeadlineType: "from_notice",
      minAssessmentDifference: 2500, minAssessmentPercentage: 2,
      successRate: 52, filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales"],
      hearingRequired: true, averageResolutionDays: 100,
      contingencyFeeAllowed: true, maxContingencyFee: 33,
      notes: "Greenville County. Reasonable evidentiary bar; consistent BOE.",
    },
  ],

  // ARIZONA second county
  // (Maricopa already in AZ block above.)
  // KENTUCKY, OKLAHOMA, KANSAS, UTAH, ALABAMA, ARKANSAS, IOWA, OREGON
  // additional states served by national fallback for now — add later as
  // user demand surfaces.
};

/**
 * National fallback rule — used when the state isn't in our database.
 * Conservative defaults derived from the national-average property tax
 * appeal landscape: 30-day deadline from notice, ~50% success on a
 * well-documented appeal, both POA and pro-se permitted in most states.
 *
 * The point isn't precision per state — it's that we never return null and
 * leave the UI / pipeline guessing. A user in any U.S. state gets a
 * directionally-correct strategy, with a note that we recommend they verify
 * specific deadlines with their county assessor's office.
 */
const NATIONAL_FALLBACK: JurisdictionRule = {
  state: "US",
  appealDeadlineDays: 30,
  appealDeadlineType: "from_notice",
  minAssessmentDifference: 3000,
  minAssessmentPercentage: 2,
  successRate: 50,
  filingMethods: ["poa", "pro_se"],
  documentationRequired: ["Comparable sales analysis", "Property condition documentation", "Independent valuation"],
  hearingRequired: true,
  averageResolutionDays: 120,
  contingencyFeeAllowed: true,
  maxContingencyFee: 25,
  notes:
    "National-average defaults applied — your state isn't yet in our jurisdiction database. " +
    "Verify the exact appeal deadline with your county assessor before filing. Most states " +
    "follow a 30-day-from-notice window with a hearing requirement. POA filing is allowed in " +
    "the majority of U.S. jurisdictions but a small number (CA, NY, parts of NJ) restrict it.",
};

/**
 * Get jurisdiction rules for a given state and optional county.
 *
 * Resolution order:
 *   1. Exact state + county match
 *   2. State-level fallback (first entry in state array)
 *   3. National fallback (never returns null)
 *
 * Always returns a usable rule so downstream code (deadline calc, viability
 * scoring, filing strategy) has consistent inputs across all 50 states.
 */
export function getJurisdictionRules(state: string, county?: string): JurisdictionRule {
  const stateRules = jurisdictionRules[state.toUpperCase()];
  if (!stateRules || stateRules.length === 0) {
    return { ...NATIONAL_FALLBACK, state: state ? state.toUpperCase() : "US" };
  }

  if (county) {
    const exact = stateRules.find((r) => r.county?.toLowerCase() === county.toLowerCase());
    if (exact) return exact;
  }

  // State-level fallback: the first entry, but mark it as state-default if
  // the caller asked for a specific county we don't have.
  const stateDefault = stateRules[0];
  if (county && stateDefault.county && stateDefault.county.toLowerCase() !== county.toLowerCase()) {
    return {
      ...stateDefault,
      county: undefined,
      notes:
        `${stateDefault.county}-specific data used as ${state.toUpperCase()} state fallback ` +
        `because ${county} is not in our jurisdiction database. ${stateDefault.notes}`,
    };
  }
  return stateDefault;
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
  // getJurisdictionRules now always returns a rule (national fallback when
  // the state isn't in our database), so we never need a null check.
  const rules = getJurisdictionRules(state, county);
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
  // National fallback ensures we always have a rule.
  const rules = getJurisdictionRules(state, county);

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
