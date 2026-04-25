/**
 * NATIONWIDE ASSESSMENT RULES & STRATEGIES
 * 
 * This module encodes expert knowledge of property tax assessment rules,
 * appeal procedures, and valuation strategies for all 50 states.
 * 
 * Used by: appraisalAnalyzer.ts (state-specific LLM prompts, assessment levels)
 *          analysisJob.ts (state-specific appeal strength scoring)
 *          serperSearch.ts (state-specific Serper query templates)
 */

export interface StateAssessmentRules {
  state: string;
  stateCode: string;
  assessmentLevel: number; // % of market value (0.1 = 10%)
  primaryValuationMethod: "sca" | "income" | "cost" | "hybrid"; // SCA = Sales Comparison
  keyStrategies: string[];
  appealChain: string[]; // Hierarchy of appeal bodies
  primaryAppealBody: string;
  typicalAppealDeadline: string; // e.g., "45 days from notice"
  serperQueryTemplate: string; // Template for state-specific Serper searches
  uspapNotes: string;
  multiunitStrategy?: string;
  commercialStrategy?: string;
}

// ─── ALL 50 STATES + DC ────────────────────────────────────────────────────────

export const STATE_RULES: Record<string, StateAssessmentRules> = {
  // ─── ALABAMA ──────────────────────────────────────────────────────────────
  AL: {
    state: "Alabama",
    stateCode: "AL",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Alabama assesses at 100% of market value — use comparable sales aggressively",
      "Emphasize recent sales below the assessed value",
      "County assessors often lag market changes — highlight declining neighborhood trends",
      "Physical condition and deferred maintenance are strong arguments",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "State Board of Equalization"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "45 days from assessment notice",
    serperQueryTemplate: "Alabama property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Alabama requires USPAP-compliant appraisals for formal appeals. Use three comparable sales minimum.",
  },

  // ─── ALASKA ───────────────────────────────────────────────────────────────
  AK: {
    state: "Alaska",
    stateCode: "AK",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Alaska has limited comparable sales — emphasize cost approach with heavy depreciation",
      "Remote location and access limitations reduce value significantly",
      "Seasonal market fluctuations are strong arguments for lower values",
      "Many properties are assessed based on outdated data — challenge with current market evidence",
    ],
    appealChain: ["Borough Assessor", "Borough Assessment Review Board", "Alaska Superior Court"],
    primaryAppealBody: "Borough Assessment Review Board",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Alaska property tax appeal {borough} assessment comparable sales {city}",
    uspapNotes: "Alaska assessments often lack current market data. Document all comparable sales found.",
  },

  // ─── ARIZONA ──────────────────────────────────────────────────────────────
  AZ: {
    state: "Arizona",
    stateCode: "AZ",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Arizona has active real estate markets — use recent sales aggressively",
      "Emphasize price per square foot comparisons",
      "Desert properties: highlight water access, utilities, and environmental constraints",
      "Phoenix/Tucson markets: use MLS data for strongest comps",
    ],
    appealChain: ["County Assessor", "County Board of Supervisors", "Arizona Tax Court"],
    primaryAppealBody: "County Board of Supervisors",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Arizona property tax assessment {county} county {city} comparable sales market value 2024",
    uspapNotes: "Arizona requires detailed comparable analysis. Use at least 3-5 recent sales.",
  },

  // ─── ARKANSAS ─────────────────────────────────────────────────────────────
  AR: {
    state: "Arkansas",
    stateCode: "AR",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Arkansas assessments are often outdated — emphasize recent market sales",
      "Rural properties: use per-acre comparisons and land value separately",
      "Agricultural property: separate land value from improvements",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "State Board of Equalization"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Arkansas property tax assessment {county} county comparable sales market value",
    uspapNotes: "Arkansas allows informal appeals. Document all comparable sales and market data.",
  },

  // ─── CALIFORNIA ───────────────────────────────────────────────────────────
  CA: {
    state: "California",
    stateCode: "CA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "California Prop 13: properties assessed at 1% of market value, but reassessed at sale",
      "Challenge Prop 13 assessments using comparable sales",
      "Use recent arm's-length sales in the same neighborhood",
      "Emphasize condition issues and deferred maintenance",
      "San Francisco Bay Area: use MLS data for strongest market evidence",
    ],
    appealChain: ["County Assessor", "Assessment Appeals Board", "Superior Court"],
    primaryAppealBody: "Assessment Appeals Board",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "California Prop 13 assessment {county} {city} comparable sales market value",
    uspapNotes: "California requires formal appraisals for Appeals Board. Use USPAP-compliant methodology.",
    multiunitStrategy: "For multifamily: use income approach as primary, reconcile with SCA using price per unit",
  },

  // ─── COLORADO ─────────────────────────────────────────────────────────────
  CO: {
    state: "Colorado",
    stateCode: "CO",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Colorado has strong real estate markets — use recent sales aggressively",
      "Mountain properties: emphasize elevation, access, and utility constraints",
      "Denver metro: use MLS data for strongest comparables",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Colorado Court of Appeals"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Colorado property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Colorado requires detailed comparable analysis. Emphasize recent sales within 6 months.",
  },

  // ─── CONNECTICUT ──────────────────────────────────────────────────────────
  CT: {
    state: "Connecticut",
    stateCode: "CT",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Connecticut has high property values — use recent sales aggressively",
      "Fairfield County: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["Assessor", "Board of Assessment Appeals", "Superior Court"],
    primaryAppealBody: "Board of Assessment Appeals",
    typicalAppealDeadline: "45 days from assessment notice",
    serperQueryTemplate: "Connecticut property tax assessment {county} {city} comparable sales market value",
    uspapNotes: "Connecticut requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── DELAWARE ─────────────────────────────────────────────────────────────
  DE: {
    state: "Delaware",
    stateCode: "DE",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Delaware has limited comparable sales — use cost approach with depreciation",
      "Wilmington area: use MLS data for strongest comparables",
      "Emphasize condition issues and functional obsolescence",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["County Assessor", "County Assessment Review Board", "Delaware Superior Court"],
    primaryAppealBody: "County Assessment Review Board",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Delaware property tax assessment {county} comparable sales market value",
    uspapNotes: "Delaware requires formal appraisals for appeals. Use USPAP methodology.",
  },

  // ─── FLORIDA ──────────────────────────────────────────────────────────────
  FL: {
    state: "Florida",
    stateCode: "FL",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Florida has active real estate markets — use recent sales aggressively",
      "Miami-Dade, Broward, Hillsborough: use MLS data for strongest comparables",
      "Homestead exemption: challenge assessments that don't reflect exemption",
      "Hurricane risk and insurance costs reduce value — use as adjustment",
      "Waterfront properties: emphasize environmental and flood risks",
    ],
    appealChain: ["County Property Appraiser", "Value Adjustment Board", "Florida Department of Revenue"],
    primaryAppealBody: "Value Adjustment Board",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Florida property tax assessment {county} {city} comparable sales market value homestead",
    uspapNotes: "Florida requires USPAP-compliant appraisals. Use recent sales within 6 months.",
    multiunitStrategy: "For multifamily: use income approach with conservative cap rates (8-10%)",
  },

  // ─── GEORGIA ──────────────────────────────────────────────────────────────
  GA: {
    state: "Georgia",
    stateCode: "GA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Georgia has active real estate markets — use recent sales aggressively",
      "Atlanta metro: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "Board of Equalization", "Georgia Superior Court"],
    primaryAppealBody: "Board of Equalization",
    typicalAppealDeadline: "45 days from assessment notice",
    serperQueryTemplate: "Georgia property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Georgia requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── HAWAII ───────────────────────────────────────────────────────────────
  HI: {
    state: "Hawaii",
    stateCode: "HI",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Hawaii has limited comparable sales — use cost approach with heavy depreciation",
      "Honolulu: use MLS data for strongest comparables",
      "Island properties: emphasize isolation, shipping costs, and limited market",
      "Agricultural land: separate land value from improvements",
    ],
    appealChain: ["County Assessor", "County Board of Review", "Hawaii Tax Appeal Court"],
    primaryAppealBody: "County Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Hawaii property tax assessment {county} {city} comparable sales market value",
    uspapNotes: "Hawaii requires formal appraisals. Document all comparable sales found.",
  },

  // ─── IDAHO ────────────────────────────────────────────────────────────────
  ID: {
    state: "Idaho",
    stateCode: "ID",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Idaho has active real estate markets — use recent sales aggressively",
      "Boise area: use MLS data for strongest comparables",
      "Rural properties: use per-acre comparisons",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Idaho Tax Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Idaho property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Idaho requires detailed comparable analysis. Use recent sales within 6 months.",
  },

  // ─── ILLINOIS ─────────────────────────────────────────────────────────────
  IL: {
    state: "Illinois",
    stateCode: "IL",
    assessmentLevel: 0.3333,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Illinois assesses at 33.33% of market value — CRITICAL: implied market value = assessed ÷ 0.3333",
      "Cook County: 10% residential (see COOK_COUNTY rules below)",
      "Chicago: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Use comparable sales below the ASSESSED value as direct evidence of over-assessment",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["County Assessor", "County Board of Review", "Illinois Property Tax Appeal Board"],
    primaryAppealBody: "County Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Illinois property tax assessment {county} county {city} comparable sales market value appeal",
    uspapNotes: "Illinois requires USPAP-compliant appraisals. Always calculate implied market value first.",
    multiunitStrategy: "For multifamily: use income approach with conservative cap rates (8-10%), reconcile with SCA",
    commercialStrategy: "For commercial: use income approach as primary, emphasize conservative rent projections",
  },

  // ─── INDIANA ──────────────────────────────────────────────────────────────
  IN: {
    state: "Indiana",
    stateCode: "IN",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Indiana has active real estate markets — use recent sales aggressively",
      "Indianapolis metro: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Review", "Indiana Tax Court"],
    primaryAppealBody: "County Board of Review",
    typicalAppealDeadline: "45 days from assessment notice",
    serperQueryTemplate: "Indiana property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Indiana requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── IOWA ─────────────────────────────────────────────────────────────────
  IA: {
    state: "Iowa",
    stateCode: "IA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Iowa has active agricultural and residential markets — use recent sales aggressively",
      "Des Moines area: use MLS data for strongest comparables",
      "Agricultural property: separate land value from improvements",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["County Assessor", "County Board of Review", "Iowa District Court"],
    primaryAppealBody: "County Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Iowa property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Iowa requires detailed comparable analysis. Use recent sales within 6 months.",
  },

  // ─── KANSAS ───────────────────────────────────────────────────────────────
  KS: {
    state: "Kansas",
    stateCode: "KS",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Kansas has active agricultural and residential markets — use recent sales aggressively",
      "Kansas City metro: use MLS data for strongest comparables",
      "Agricultural property: use per-acre comparisons",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["County Appraiser", "County Board of Equalization", "Kansas District Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Kansas property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Kansas requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── KENTUCKY ─────────────────────────────────────────────────────────────
  KY: {
    state: "Kentucky",
    stateCode: "KY",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Kentucky has active real estate markets — use recent sales aggressively",
      "Louisville/Lexington: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Assessment Appeals", "Kentucky Tax Court"],
    primaryAppealBody: "County Board of Assessment Appeals",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Kentucky property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Kentucky requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── LOUISIANA ────────────────────────────────────────────────────────────
  LA: {
    state: "Louisiana",
    stateCode: "LA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Louisiana has active real estate markets — use recent sales aggressively",
      "New Orleans/Baton Rouge: use MLS data for strongest comparables",
      "Hurricane risk and insurance costs reduce value — use as adjustment",
      "Flood zone properties: emphasize environmental and flood risks",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["Parish Assessor", "Parish Board of Review", "Louisiana Tax Commission"],
    primaryAppealBody: "Parish Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Louisiana property tax assessment {parish} parish {city} comparable sales market value",
    uspapNotes: "Louisiana requires USPAP-compliant appraisals. Use recent sales within 6 months.",
  },

  // ─── MAINE ────────────────────────────────────────────────────────────────
  ME: {
    state: "Maine",
    stateCode: "ME",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Maine has limited comparable sales — use cost approach with depreciation",
      "Portland area: use MLS data for strongest comparables",
      "Rural properties: use per-acre comparisons",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["Town Assessor", "Board of Assessment Review", "Maine Superior Court"],
    primaryAppealBody: "Board of Assessment Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Maine property tax assessment {county} {city} comparable sales market value",
    uspapNotes: "Maine requires formal appraisals. Document all comparable sales found.",
  },

  // ─── MARYLAND ─────────────────────────────────────────────────────────────
  MD: {
    state: "Maryland",
    stateCode: "MD",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Maryland has active real estate markets — use recent sales aggressively",
      "Baltimore/Washington DC metro: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Appeals", "Maryland Tax Court"],
    primaryAppealBody: "County Board of Appeals",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Maryland property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Maryland requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── MASSACHUSETTS ────────────────────────────────────────────────────────
  MA: {
    state: "Massachusetts",
    stateCode: "MA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Massachusetts has high property values — use recent sales aggressively",
      "Boston metro: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["Assessor", "Board of Assessors", "Appellate Tax Board"],
    primaryAppealBody: "Appellate Tax Board",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Massachusetts property tax assessment {county} {city} comparable sales market value",
    uspapNotes: "Massachusetts requires USPAP-compliant appraisals for Appellate Tax Board.",
  },

  // ─── MICHIGAN ─────────────────────────────────────────────────────────────
  MI: {
    state: "Michigan",
    stateCode: "MI",
    assessmentLevel: 0.5,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Michigan assesses at 50% of market value — implied market value = assessed ÷ 0.5",
      "Detroit metro: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["Township Assessor", "Board of Review", "Michigan Tax Tribunal"],
    primaryAppealBody: "Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Michigan property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Michigan requires USPAP-compliant appraisals. Calculate implied market value first.",
  },

  // ─── MINNESOTA ────────────────────────────────────────────────────────────
  MN: {
    state: "Minnesota",
    stateCode: "MN",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Minnesota has active real estate markets — use recent sales aggressively",
      "Minneapolis/St. Paul: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Review", "Minnesota Tax Court"],
    primaryAppealBody: "County Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Minnesota property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Minnesota requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── MISSISSIPPI ──────────────────────────────────────────────────────────
  MS: {
    state: "Mississippi",
    stateCode: "MS",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Mississippi has active real estate markets — use recent sales aggressively",
      "Jackson area: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["County Assessor", "County Board of Supervisors", "Mississippi Tax Commission"],
    primaryAppealBody: "County Board of Supervisors",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Mississippi property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Mississippi requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── MISSOURI ─────────────────────────────────────────────────────────────
  MO: {
    state: "Missouri",
    stateCode: "MO",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Missouri has active real estate markets — use recent sales aggressively",
      "St. Louis/Kansas City: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Missouri Tax Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Missouri property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Missouri requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── MONTANA ──────────────────────────────────────────────────────────────
  MT: {
    state: "Montana",
    stateCode: "MT",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Montana has limited comparable sales — use cost approach with depreciation",
      "Billings/Missoula: use MLS data for strongest comparables",
      "Rural properties: use per-acre comparisons",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Montana Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Montana property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Montana requires detailed comparable analysis. Use recent sales within 6 months.",
  },

  // ─── NEBRASKA ─────────────────────────────────────────────────────────────
  NE: {
    state: "Nebraska",
    stateCode: "NE",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Nebraska has active agricultural and residential markets — use recent sales aggressively",
      "Omaha/Lincoln: use MLS data for strongest comparables",
      "Agricultural property: use per-acre comparisons",
      "Challenge assessments based on outdated data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Nebraska Tax Equalization and Review Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Nebraska property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Nebraska requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── NEVADA ───────────────────────────────────────────────────────────────
  NV: {
    state: "Nevada",
    stateCode: "NV",
    assessmentLevel: 0.35,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Nevada assesses at 35% of market value — implied market value = assessed ÷ 0.35",
      "Las Vegas/Reno: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Nevada Tax Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Nevada property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Nevada requires USPAP-compliant appraisals. Calculate implied market value first.",
  },

  // ─── NEW HAMPSHIRE ────────────────────────────────────────────────────────
  NH: {
    state: "New Hampshire",
    stateCode: "NH",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "New Hampshire has active real estate markets — use recent sales aggressively",
      "Manchester/Nashua: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["Town Assessor", "Board of Tax and Land Appeals", "New Hampshire Superior Court"],
    primaryAppealBody: "Board of Tax and Land Appeals",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "New Hampshire property tax assessment {county} {city} comparable sales market value",
    uspapNotes: "New Hampshire requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── NEW JERSEY ───────────────────────────────────────────────────────────
  NJ: {
    state: "New Jersey",
    stateCode: "NJ",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "New Jersey has high property values — use recent sales aggressively",
      "Bergen/Hudson counties: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["Municipal Assessor", "County Board of Taxation", "New Jersey Tax Court"],
    primaryAppealBody: "County Board of Taxation",
    typicalAppealDeadline: "45 days from assessment notice",
    serperQueryTemplate: "New Jersey property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "New Jersey requires USPAP-compliant appraisals for Tax Court.",
  },

  // ─── NEW MEXICO ───────────────────────────────────────────────────────────
  NM: {
    state: "New Mexico",
    stateCode: "NM",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "New Mexico has active real estate markets — use recent sales aggressively",
      "Albuquerque/Santa Fe: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "New Mexico Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "New Mexico property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "New Mexico requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── NEW YORK ─────────────────────────────────────────────────────────────
  NY: {
    state: "New York",
    stateCode: "NY",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "New York has high property values — use recent sales aggressively",
      "NYC/Westchester: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["Town/City Assessor", "Board of Assessment Review", "New York Supreme Court"],
    primaryAppealBody: "Board of Assessment Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "New York property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "New York requires USPAP-compliant appraisals for Supreme Court appeals.",
  },

  // ─── NORTH CAROLINA ───────────────────────────────────────────────────────
  NC: {
    state: "North Carolina",
    stateCode: "NC",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "North Carolina has active real estate markets — use recent sales aggressively",
      "Charlotte/Raleigh: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "North Carolina Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "North Carolina property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "North Carolina requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── NORTH DAKOTA ─────────────────────────────────────────────────────────
  ND: {
    state: "North Dakota",
    stateCode: "ND",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "North Dakota has limited comparable sales — use cost approach with depreciation",
      "Bismarck/Fargo: use MLS data for strongest comparables",
      "Agricultural property: use per-acre comparisons",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "North Dakota Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "North Dakota property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "North Dakota requires detailed comparable analysis. Use recent sales within 6 months.",
  },

  // ─── OHIO ─────────────────────────────────────────────────────────────────
  OH: {
    state: "Ohio",
    stateCode: "OH",
    assessmentLevel: 0.35,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Ohio assesses at 35% of market value — implied market value = assessed ÷ 0.35",
      "Cleveland/Columbus: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Auditor", "County Board of Revision", "Ohio Board of Tax Appeals"],
    primaryAppealBody: "County Board of Revision",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Ohio property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Ohio requires USPAP-compliant appraisals. Calculate implied market value first.",
  },

  // ─── OKLAHOMA ─────────────────────────────────────────────────────────────
  OK: {
    state: "Oklahoma",
    stateCode: "OK",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Oklahoma has active real estate markets — use recent sales aggressively",
      "Oklahoma City/Tulsa: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Oklahoma Tax Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Oklahoma property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Oklahoma requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── OREGON ───────────────────────────────────────────────────────────────
  OR: {
    state: "Oregon",
    stateCode: "OR",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Oregon has active real estate markets — use recent sales aggressively",
      "Portland/Eugene: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Oregon Tax and Revenue Department"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Oregon property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Oregon requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── PENNSYLVANIA ─────────────────────────────────────────────────────────
  PA: {
    state: "Pennsylvania",
    stateCode: "PA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Pennsylvania has active real estate markets — use recent sales aggressively",
      "Philadelphia/Pittsburgh: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Assessment Appeals", "Pennsylvania Tax Court"],
    primaryAppealBody: "County Board of Assessment Appeals",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Pennsylvania property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Pennsylvania requires USPAP-compliant appraisals for Tax Court appeals.",
  },

  // ─── RHODE ISLAND ─────────────────────────────────────────────────────────
  RI: {
    state: "Rhode Island",
    stateCode: "RI",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Rhode Island has high property values — use recent sales aggressively",
      "Providence area: use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["Town Assessor", "Board of Tax Review", "Rhode Island Superior Court"],
    primaryAppealBody: "Board of Tax Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Rhode Island property tax assessment {city} comparable sales market value",
    uspapNotes: "Rhode Island requires USPAP-compliant appraisals for Superior Court appeals.",
  },

  // ─── SOUTH CAROLINA ───────────────────────────────────────────────────────
  SC: {
    state: "South Carolina",
    stateCode: "SC",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "South Carolina has active real estate markets — use recent sales aggressively",
      "Charleston/Columbia: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "South Carolina Tax Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "South Carolina property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "South Carolina requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── SOUTH DAKOTA ─────────────────────────────────────────────────────────
  SD: {
    state: "South Dakota",
    stateCode: "SD",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "South Dakota has limited comparable sales — use cost approach with depreciation",
      "Sioux Falls area: use MLS data for strongest comparables",
      "Agricultural property: use per-acre comparisons",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "South Dakota Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "South Dakota property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "South Dakota requires detailed comparable analysis. Use recent sales within 6 months.",
  },

  // ─── TENNESSEE ────────────────────────────────────────────────────────────
  TN: {
    state: "Tennessee",
    stateCode: "TN",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Tennessee has active real estate markets — use recent sales aggressively",
      "Nashville/Memphis: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Tennessee Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Tennessee property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Tennessee requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── TEXAS ────────────────────────────────────────────────────────────────
  TX: {
    state: "Texas",
    stateCode: "TX",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Texas has very active real estate markets — use recent sales aggressively",
      "Houston/Dallas/Austin: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
      "Use price per square foot comparisons effectively",
    ],
    appealChain: ["County Appraisal District", "Appraisal Review Board", "Texas Tax Court"],
    primaryAppealBody: "Appraisal Review Board",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Texas property tax assessment {county} county {city} comparable sales market value appraisal district",
    uspapNotes: "Texas requires USPAP-compliant appraisals for Tax Court appeals.",
    multiunitStrategy: "For multifamily: use income approach with conservative cap rates (8-10%)",
  },

  // ─── UTAH ─────────────────────────────────────────────────────────────────
  UT: {
    state: "Utah",
    stateCode: "UT",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Utah has active real estate markets — use recent sales aggressively",
      "Salt Lake City area: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Utah Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Utah property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Utah requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── VERMONT ──────────────────────────────────────────────────────────────
  VT: {
    state: "Vermont",
    stateCode: "VT",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Vermont has limited comparable sales — use cost approach with depreciation",
      "Burlington area: use MLS data for strongest comparables",
      "Rural properties: use per-acre comparisons",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["Town Assessor", "Board of Civil Authority", "Vermont Superior Court"],
    primaryAppealBody: "Board of Civil Authority",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Vermont property tax assessment {county} {city} comparable sales market value",
    uspapNotes: "Vermont requires formal appraisals. Document all comparable sales found.",
  },

  // ─── VIRGINIA ─────────────────────────────────────────────────────────────
  VA: {
    state: "Virginia",
    stateCode: "VA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Virginia has active real estate markets — use recent sales aggressively",
      "Northern Virginia/Richmond: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "Board of Supervisors", "Virginia Tax Court"],
    primaryAppealBody: "Board of Supervisors",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Virginia property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Virginia requires USPAP-compliant appraisals for Tax Court appeals.",
  },

  // ─── WASHINGTON ───────────────────────────────────────────────────────────
  WA: {
    state: "Washington",
    stateCode: "WA",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Washington has very active real estate markets — use recent sales aggressively",
      "Seattle/Tacoma: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Washington Tax Court"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Washington property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Washington requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── WEST VIRGINIA ────────────────────────────────────────────────────────
  WV: {
    state: "West Virginia",
    stateCode: "WV",
    assessmentLevel: 0.6,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "West Virginia assesses at 60% of market value — implied market value = assessed ÷ 0.6",
      "Charleston area: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["County Assessor", "County Commission", "West Virginia Tax Commission"],
    primaryAppealBody: "County Commission",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "West Virginia property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "West Virginia requires USPAP-compliant appraisals. Calculate implied market value first.",
  },

  // ─── WISCONSIN ────────────────────────────────────────────────────────────
  WI: {
    state: "Wisconsin",
    stateCode: "WI",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Wisconsin has active real estate markets — use recent sales aggressively",
      "Milwaukee/Madison: use MLS data for strongest comparables",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["Municipal Assessor", "Board of Review", "Wisconsin Tax Appeals Commission"],
    primaryAppealBody: "Board of Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Wisconsin property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Wisconsin requires USPAP-compliant appraisals for formal appeals.",
  },

  // ─── WYOMING ──────────────────────────────────────────────────────────────
  WY: {
    state: "Wyoming",
    stateCode: "WY",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "Wyoming has limited comparable sales — use cost approach with depreciation",
      "Cheyenne/Casper: use MLS data for strongest comparables",
      "Rural properties: use per-acre comparisons",
      "Challenge assessments based on stale data",
    ],
    appealChain: ["County Assessor", "County Board of Equalization", "Wyoming Tax Commission"],
    primaryAppealBody: "County Board of Equalization",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "Wyoming property tax assessment {county} county {city} comparable sales market value",
    uspapNotes: "Wyoming requires detailed comparable analysis. Use recent sales within 6 months.",
  },

  // ─── DISTRICT OF COLUMBIA ─────────────────────────────────────────────────
  DC: {
    state: "District of Columbia",
    stateCode: "DC",
    assessmentLevel: 1.0,
    primaryValuationMethod: "sca",
    keyStrategies: [
      "DC has very high property values — use recent sales aggressively",
      "Use MLS data for strongest market evidence",
      "Emphasize condition issues and deferred maintenance",
      "Challenge assessments based on outdated comparable sales",
    ],
    appealChain: ["DC Assessor", "Board of Equalization and Review", "DC Superior Court"],
    primaryAppealBody: "Board of Equalization and Review",
    typicalAppealDeadline: "30 days from assessment notice",
    serperQueryTemplate: "DC property tax assessment {city} comparable sales market value",
    uspapNotes: "DC requires USPAP-compliant appraisals for Superior Court appeals.",
  },
};

// ─── HELPER FUNCTION ──────────────────────────────────────────────────────────
export function getStateRules(stateCode: string): StateAssessmentRules | undefined {
  return STATE_RULES[stateCode.toUpperCase()];
}

export function getStateRulesByName(stateName: string): StateAssessmentRules | undefined {
  for (const rules of Object.values(STATE_RULES)) {
    if (rules.state.toLowerCase() === stateName.toLowerCase()) {
      return rules;
    }
  }
  return undefined;
}
