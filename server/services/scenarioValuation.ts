/**
 * Scenario-Aware Valuation Engine
 *
 * Adjusts property valuations based on the user's specific life scenario.
 * This is AppraiseAI's key differentiator — we don't just value properties,
 * we value them in the context of what the owner is going through.
 *
 * Scenarios affect:
 * 1. Valuation methodology weights (market vs income vs cost)
 * 2. Comparable selection criteria (distressed sales, recent purchases)
 * 3. Appeal strength scoring (some scenarios have stronger legal grounds)
 * 4. Recommended approach (POA vs pro-se vs not recommended)
 * 5. Tax savings estimates (some scenarios have different tax implications)
 */

import type { PropertyData } from "./propertyDataAggregator";

export type UserScenario =
  | "primary_residence"
  | "rental_property"
  | "vacation_home"
  | "inherited_property"
  | "recently_purchased"
  | "planning_to_sell"
  | "distressed_condition"
  | "new_construction"
  | "recently_renovated"
  | "senior_homestead"
  | "veteran_disability"
  | "financial_hardship"
  | "mixed_use"
  | "none";

export interface ScenarioContext {
  scenario: UserScenario;
  scenarioLabel: string;
  scenarioDescription: string;
  valuationAdjustments: ValuationAdjustments;
  appealStrengthModifiers: AppealStrengthModifiers;
  recommendedApproachOverride?: "poa" | "pro-se" | "not-recommended";
  taxRateAdjustment: number; // Multiplier on standard tax rate
  compFilterStrategy: CompFilterStrategy;
  narrativeTemplate: string;
  userAdvocacyPoints: string[];
}

export interface ValuationAdjustments {
  marketApproachWeight: number; // 0-1
  incomeApproachWeight: number; // 0-1
  costApproachWeight: number; // 0-1
  conditionAdjustment: number; // +/- percentage
  marketConditionsAdjustment: number; // +/- percentage
  timeAdjustmentMonths: number; // How many months to adjust comps
}

export interface AppealStrengthModifiers {
  baseModifier: number; // +/- points to appeal strength score
  legalGroundsBonus: number; // Extra points for strong legal grounds
  evidenceStrengthMultiplier: number; // Multiplier on evidence quality
  urgencyLevel: "low" | "medium" | "high" | "critical";
}

export interface CompFilterStrategy {
  excludeForeclosures: boolean;
  excludeShortSales: boolean;
  preferRecentSales: boolean; // Weight recent sales more heavily
  maxSaleAgeMonths: number;
  requireSimilarCondition: boolean;
  allowDistressedComps: boolean; // For distressed_condition scenario
}

// ─── SCENARIO DEFINITIONS ───────────────────────────────────────────────────

const scenarioDefinitions: Record<UserScenario, ScenarioContext> = {
  primary_residence: {
    scenario: "primary_residence",
    scenarioLabel: "Primary Residence",
    scenarioDescription:
      "Your home — where you live, raise your family, and build equity. Overassessment directly impacts your monthly budget.",
    valuationAdjustments: {
      marketApproachWeight: 0.85,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.15,
      conditionAdjustment: 0,
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 5,
      legalGroundsBonus: 0,
      evidenceStrengthMultiplier: 1.0,
      urgencyLevel: "medium",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "As your primary residence, this property's assessment should reflect fair market value based on comparable sales of similar homes in your neighborhood. Homestead exemptions may also apply.",
    userAdvocacyPoints: [
      "Primary residences often qualify for homestead exemptions that reduce taxable value",
      "Overassessment directly impacts your monthly mortgage escrow payments",
      "Most jurisdictions have strong protections for primary residence appeals",
      "You have the right to comparable sales data from your assessor's office",
    ],
  },

  rental_property: {
    scenario: "rental_property",
    scenarioLabel: "Rental Property / Investment",
    scenarioDescription:
      "Income-producing property. Assessment should reflect income potential, not just comparable sales.",
    valuationAdjustments: {
      marketApproachWeight: 0.4,
      incomeApproachWeight: 0.5,
      costApproachWeight: 0.1,
      conditionAdjustment: 0,
      marketConditionsAdjustment: -0.02, // Slight downward adjustment for investor sales
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 8,
      legalGroundsBonus: 5,
      evidenceStrengthMultiplier: 1.15,
      urgencyLevel: "medium",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: false, // Investor sales include distressed
      excludeShortSales: false,
      preferRecentSales: true,
      maxSaleAgeMonths: 18,
      requireSimilarCondition: false,
      allowDistressedComps: true,
    },
    narrativeTemplate:
      "As an income-producing rental property, valuation must consider both comparable sales AND income capitalization. Assessors often overvalue rentals by ignoring vacancy rates, maintenance costs, and tenant turnover.",
    userAdvocacyPoints: [
      "Income approach is legally required for income-producing properties in most jurisdictions",
      "You can deduct operating expenses, vacancy losses, and capital improvements",
      "Cap rates in your market may justify a lower valuation than sales comparables alone",
      "Rental properties are frequently overassessed because assessors use owner-occupied comps",
    ],
  },

  vacation_home: {
    scenario: "vacation_home",
    scenarioLabel: "Vacation / Second Home",
    scenarioDescription:
      "Secondary property with seasonal use patterns. Often assessed as if full-time occupied.",
    valuationAdjustments: {
      marketApproachWeight: 0.75,
      incomeApproachWeight: 0.15, // Short-term rental potential
      costApproachWeight: 0.1,
      conditionAdjustment: -0.03, // Seasonal wear
      marketConditionsAdjustment: -0.05, // Vacation markets more volatile
      timeAdjustmentMonths: 3,
    },
    appealStrengthModifiers: {
      baseModifier: 3,
      legalGroundsBonus: 0,
      evidenceStrengthMultiplier: 0.95,
      urgencyLevel: "low",
    },
    taxRateAdjustment: 1.1, // Often higher tax rate for non-primary
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 18,
      requireSimilarCondition: false,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "Vacation properties are frequently overassessed because assessors apply full-time occupancy standards. Seasonal use, off-market conditions, and higher insurance costs should be factored into valuation.",
    userAdvocacyPoints: [
      "Vacation homes often face higher assessment ratios than primary residences",
      "Seasonal depreciation and limited use patterns justify lower valuations",
      "Short-term rental restrictions may reduce market value",
      "You may qualify for agricultural or conservation exemptions if applicable",
    ],
  },

  inherited_property: {
    scenario: "inherited_property",
    scenarioLabel: "Inherited Property",
    scenarioDescription:
      "Property received through inheritance. Often assessed at stepped-up basis that doesn't reflect current condition or market reality.",
    valuationAdjustments: {
      marketApproachWeight: 0.7,
      incomeApproachWeight: 0.1,
      costApproachWeight: 0.2,
      conditionAdjustment: -0.05, // Often deferred maintenance
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 6,
    },
    appealStrengthModifiers: {
      baseModifier: 10,
      legalGroundsBonus: 8,
      evidenceStrengthMultiplier: 1.2,
      urgencyLevel: "high",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: false, // Estate sales comparable
      preferRecentSales: true,
      maxSaleAgeMonths: 18,
      requireSimilarCondition: false,
      allowDistressedComps: true, // Estate sales, as-is condition
    },
    narrativeTemplate:
      "Inherited properties are commonly overassessed because assessors fail to account for deferred maintenance, outdated systems, and the 'as-is' condition typical of estate properties. The stepped-up basis for tax purposes does not equal market value.",
    userAdvocacyPoints: [
      "Inherited properties often have deferred maintenance that reduces market value",
      "Stepped-up basis is for capital gains, not property tax assessment",
      "You have the right to an independent appraisal reflecting actual condition",
      "Many jurisdictions offer hardship exemptions for inherited properties",
      "Estate sale comparables are valid and often show lower values",
    ],
  },

  recently_purchased: {
    scenario: "recently_purchased",
    scenarioLabel: "Recently Purchased",
    scenarioDescription:
      "Property purchased within the last 1-2 years. The purchase price is the strongest evidence of market value.",
    valuationAdjustments: {
      marketApproachWeight: 0.9,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.1,
      conditionAdjustment: 0,
      marketConditionsAdjustment: 0.02, // Slight upward for market movement
      timeAdjustmentMonths: -6, // Use sales from purchase timeframe
    },
    appealStrengthModifiers: {
      baseModifier: 15,
      legalGroundsBonus: 10,
      evidenceStrengthMultiplier: 1.3,
      urgencyLevel: "high",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 24,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "A recent arm's-length purchase is the gold standard for market value evidence. If your assessment exceeds your purchase price, you have an exceptionally strong appeal — courts and boards consistently recognize purchase price as the best indicator of market value.",
    userAdvocacyPoints: [
      "Your purchase price is the strongest possible evidence of market value",
      "Courts consistently rule that recent arm's-length sales establish market value",
      "If assessed > purchase price, you have an automatic overassessment claim",
      "Closing documents, appraisal, and inspection reports are powerful evidence",
      "Many jurisdictions require assessment to equal purchase price after sale",
    ],
  },

  planning_to_sell: {
    scenario: "planning_to_sell",
    scenarioLabel: "Planning to Sell",
    scenarioDescription:
      "Preparing to list the property. Overassessment can deter buyers and reduce sale price.",
    valuationAdjustments: {
      marketApproachWeight: 0.9,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.1,
      conditionAdjustment: 0,
      marketConditionsAdjustment: -0.03, // List price often below assessment
      timeAdjustmentMonths: 3,
    },
    appealStrengthModifiers: {
      baseModifier: 5,
      legalGroundsBonus: 3,
      evidenceStrengthMultiplier: 1.1,
      urgencyLevel: "medium",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: false, // Active listings comparable
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "When planning to sell, an inflated assessment becomes a liability. Buyers factor property taxes into their monthly payment calculations, and high assessments can reduce your pool of qualified buyers or force a lower list price.",
    userAdvocacyPoints: [
      "High assessments reduce buyer pool — taxes factor into mortgage qualification",
      "You can use active listings and pending sales as comparable evidence",
      "A successful appeal before listing can be a selling point for buyers",
      "Pre-listing appraisal can serve dual purpose: appeal evidence + pricing guide",
    ],
  },

  distressed_condition: {
    scenario: "distressed_condition",
    scenarioLabel: "Distressed / Fixer-Upper",
    scenarioDescription:
      "Property in poor condition needing significant repairs. Assessed as if in average condition.",
    valuationAdjustments: {
      marketApproachWeight: 0.6,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.4,
      conditionAdjustment: -0.15, // Significant condition penalty
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 12,
      legalGroundsBonus: 10,
      evidenceStrengthMultiplier: 1.25,
      urgencyLevel: "high",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: false, // Distressed comps are relevant
      excludeShortSales: false,
      preferRecentSales: false,
      maxSaleAgeMonths: 24,
      requireSimilarCondition: false,
      allowDistressedComps: true,
    },
    narrativeTemplate:
      "Properties in distressed condition are systematically overassessed because assessors use mass-appraisal models that assume average condition. Your property's actual condition — requiring significant repairs — must be reflected in the valuation.",
    userAdvocacyPoints: [
      "Mass appraisal systems assume average condition — yours may be well below",
      "Repair estimates, contractor bids, and inspection reports are valid evidence",
      "Distressed sale comparables are legally admissible in most jurisdictions",
      "Photos documenting condition are powerful hearing evidence",
      "You have the right to request a physical inspection by the assessor",
    ],
  },

  new_construction: {
    scenario: "new_construction",
    scenarioLabel: "New Construction",
    scenarioDescription:
      "Recently built or under construction. Often assessed at completion value before full market testing.",
    valuationAdjustments: {
      marketApproachWeight: 0.5,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.5,
      conditionAdjustment: 0.05, // New = premium
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 0,
      legalGroundsBonus: 0,
      evidenceStrengthMultiplier: 0.9,
      urgencyLevel: "medium",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "New construction assessments are often based on builder costs rather than actual market value. Until the property has been tested in the resale market, the assessment may not reflect what buyers are actually paying for similar new homes.",
    userAdvocacyPoints: [
      "New construction is often assessed at cost, not market value",
      "Builder incentives and discounts reduce actual market value",
      "Comparable new construction sales in your development are the best evidence",
      "Phase-in assessments may be available in some jurisdictions",
      "You can request a pre-completion assessment review in many counties",
    ],
  },

  recently_renovated: {
    scenario: "recently_renovated",
    scenarioLabel: "Recently Renovated",
    scenarioDescription:
      "Property with recent improvements. Assessment may not reflect the value added by renovations, or may overvalue them.",
    valuationAdjustments: {
      marketApproachWeight: 0.8,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.2,
      conditionAdjustment: 0.08, // Renovation premium
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: -5, // Renovated = harder to claim overassessment
      legalGroundsBonus: 0,
      evidenceStrengthMultiplier: 0.9,
      urgencyLevel: "low",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "While renovations add value, assessors often overestimate the return on investment. Not all renovations increase market value dollar-for-dollar. The assessment should reflect what the market actually pays for renovated properties, not just the cost of improvements.",
    userAdvocacyPoints: [
      "Not all renovations increase market value dollar-for-dollar",
      "Assessors may use cost manuals that overstate renovation value",
      "Comparable renovated properties in your area set the true market value",
      "Permit records can be used to verify what was actually improved",
      "You can challenge the assessor's depreciation schedule for improvements",
    ],
  },

  senior_homestead: {
    scenario: "senior_homestead",
    scenarioLabel: "Senior / Retired (65+)",
    scenarioDescription:
      "Owner is 65 or older. Most jurisdictions offer senior exemptions, freezes, or deferrals that should be applied BEFORE any market-value appeal — and a parallel appeal still works alongside them.",
    valuationAdjustments: {
      marketApproachWeight: 0.85,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.15,
      conditionAdjustment: -0.02, // Older owners often have aging-in-place deferred maintenance
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 8,
      legalGroundsBonus: 5,
      evidenceStrengthMultiplier: 1.1,
      urgencyLevel: "high",
    },
    taxRateAdjustment: 0.85, // Senior exemptions typically reduce effective rate 10-25%
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "Senior homeowners are entitled to multiple stacked tax-relief mechanisms — exemptions, assessment freezes, deferral programs, and the standard market-value appeal. The exemptions reduce the rate; the appeal reduces the assessed base. Both should be pursued in parallel when the property is overassessed on the merits.",
    userAdvocacyPoints: [
      "Most states offer a senior homestead exemption ($10K–$50K assessed value reduction)",
      "Some states freeze the assessed value once you turn 65 (TX, IL, NJ have variants)",
      "Property tax deferral programs let you defer taxes until sale or estate (no interest in some states)",
      "Senior exemptions apply REGARDLESS of the appeal — pursue both",
      "Aging-in-place deferred maintenance is a legitimate condition factor in valuation",
      "You may qualify for a circuit-breaker credit if taxes exceed a % of household income",
    ],
  },

  veteran_disability: {
    scenario: "veteran_disability",
    scenarioLabel: "Veteran or Disabled Owner",
    scenarioDescription:
      "Owner is a veteran (especially disabled veteran) or otherwise disabled. Many states offer 100% exemption for permanently-disabled veterans; partial exemptions for others.",
    valuationAdjustments: {
      marketApproachWeight: 0.85,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.15,
      conditionAdjustment: -0.02,
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 10,
      legalGroundsBonus: 8,
      evidenceStrengthMultiplier: 1.15,
      urgencyLevel: "high",
    },
    taxRateAdjustment: 0.5, // Disabled veteran exemptions often eliminate or halve tax burden
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "Veterans and disabled homeowners qualify for substantial — sometimes total — property tax exemptions in most U.S. states. These exemptions are independent of the market-value appeal: file for the exemption (or verify it's currently applied) and run the appeal in parallel when the underlying assessment is also high.",
    userAdvocacyPoints: [
      "100%-disabled veterans qualify for a full property-tax exemption in most states (TX, FL, MI, IA, IL, etc.)",
      "Partially-disabled veterans qualify for a partial exemption tied to disability rating",
      "Disabled non-veteran homeowners often qualify for state-specific disability exemptions",
      "Surviving spouses of disabled veterans usually retain the exemption",
      "ADA-required modifications (ramps, lifts, etc.) generally do NOT increase taxable value",
      "Pursue exemption AND market-value appeal in parallel — they reduce different things",
    ],
  },

  financial_hardship: {
    scenario: "financial_hardship",
    scenarioLabel: "Financial Hardship",
    scenarioDescription:
      "Owner facing job loss, medical crisis, divorce, or other documented financial hardship. Many jurisdictions offer hardship deferrals, payment plans, or temporary reductions on top of any merits-based appeal.",
    valuationAdjustments: {
      marketApproachWeight: 0.8,
      incomeApproachWeight: 0.0,
      costApproachWeight: 0.2,
      conditionAdjustment: -0.05, // Often deferred maintenance during hardship
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 7,
      legalGroundsBonus: 5,
      evidenceStrengthMultiplier: 1.1,
      urgencyLevel: "critical",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: false, // Hardship comps can be relevant
      excludeShortSales: false,
      preferRecentSales: true,
      maxSaleAgeMonths: 18,
      requireSimilarCondition: false,
      allowDistressedComps: true,
    },
    narrativeTemplate:
      "Financial hardship doesn't directly change the property's fair market value, but it changes the urgency and the procedural options available. Pursue the merits-based appeal AND ask the assessor about hardship deferrals, payment plans, and circuit-breaker credits — these stack with a successful appeal.",
    userAdvocacyPoints: [
      "Many states offer hardship deferrals (postpone taxes, no foreclosure during hardship)",
      "Circuit-breaker credits cap property taxes as a % of household income (often 4-6%)",
      "Payment plans without penalty are available in most jurisdictions",
      "Senior + disability + hardship programs frequently STACK — apply for all you qualify for",
      "Document the hardship: medical bills, layoff notice, divorce decree, etc.",
      "Time is critical — file before delinquency triggers fees and lien proceedings",
    ],
  },

  mixed_use: {
    scenario: "mixed_use",
    scenarioLabel: "Mixed-Use Property",
    scenarioDescription:
      "Property combines residential + commercial use (e.g., live/work, storefront with apartment above, home with detached commercial outbuilding). Often misclassified or over-assessed because the commercial component is valued separately.",
    valuationAdjustments: {
      marketApproachWeight: 0.5,
      incomeApproachWeight: 0.4, // Income approach weighted heavily for the commercial portion
      costApproachWeight: 0.1,
      conditionAdjustment: 0,
      marketConditionsAdjustment: -0.03,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 10,
      legalGroundsBonus: 8,
      evidenceStrengthMultiplier: 1.2,
      urgencyLevel: "high",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: false,
      preferRecentSales: true,
      maxSaleAgeMonths: 18,
      requireSimilarCondition: false,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "Mixed-use properties are systematically misvalued because most assessors apply pure-residential or pure-commercial models without blending. The fair valuation requires weighting both approaches by use percentage, and many homestead exemptions still apply to the residential portion.",
    userAdvocacyPoints: [
      "Mixed-use requires a blended valuation: residential comps + income approach for commercial",
      "Homestead exemption usually still applies to the residential portion (verify with assessor)",
      "Square-footage allocation between uses must be documented (floor plan, business license)",
      "Assessor often classifies the WHOLE property as commercial — a costly misclassification",
      "Commercial portion's income must reflect actual rents and vacancy, not market peak",
    ],
  },

  none: {
    scenario: "none",
    scenarioLabel: "General Property Owner",
    scenarioDescription: "Standard property tax appeal analysis.",
    valuationAdjustments: {
      marketApproachWeight: 0.8,
      incomeApproachWeight: 0.1,
      costApproachWeight: 0.1,
      conditionAdjustment: 0,
      marketConditionsAdjustment: 0,
      timeAdjustmentMonths: 0,
    },
    appealStrengthModifiers: {
      baseModifier: 0,
      legalGroundsBonus: 0,
      evidenceStrengthMultiplier: 1.0,
      urgencyLevel: "medium",
    },
    taxRateAdjustment: 1.0,
    compFilterStrategy: {
      excludeForeclosures: true,
      excludeShortSales: true,
      preferRecentSales: true,
      maxSaleAgeMonths: 12,
      requireSimilarCondition: true,
      allowDistressedComps: false,
    },
    narrativeTemplate:
      "Standard property tax appeal analysis based on comparable sales, market conditions, and assessment accuracy.",
    userAdvocacyPoints: [
      "You have the right to appeal your assessment every year",
      "Comparable sales are the most persuasive evidence in most jurisdictions",
      "Most appeals are resolved without a formal hearing",
      "You can request your property's assessment record from the county",
    ],
  },
};

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * Get full scenario context for a given scenario type
 */
export function getScenarioContext(scenario: UserScenario): ScenarioContext {
  return scenarioDefinitions[scenario] || scenarioDefinitions.none;
}

/**
 * Apply a scenario's comp-filter strategy to a raw comparable-sales set.
 *
 * Without this, scenario `compFilterStrategy` was pure configuration that
 * nothing read — the LLM saw the same unfiltered comp set regardless of
 * scenario. This function makes the strategy real:
 *
 *   • maxSaleAgeMonths    — drops comps older than the window
 *   • preferRecentSales   — orders newest-first so the LLM weights them
 *   • requireSimilarCondition — drops low-similarity comps (<0.6)
 *   • allowDistressedComps — when false AND >5 comps remain, trims the
 *     top + bottom 10% as likely outliers (preserves the meaningful core)
 *
 * Arms-length filtering: when the upstream aggregator (currently RentCast)
 * tags a comp's transactionType as foreclosure / REO / short_sale / family /
 * auction, those comps are dropped from the valuation set when the
 * strategy says so. Boards routinely dismiss non-arm's-length comps as
 * "non-market," so including one is worse than including none. Comps
 * tagged "unknown" are kept (no false negatives on missing metadata).
 */
export function applyCompFilterStrategy<
  C extends {
    saleDate: string;
    similarity?: number;
    salePrice: number;
    squareFeet: number;
    transactionType?:
      | "arms_length"
      | "foreclosure"
      | "reo"
      | "short_sale"
      | "family_transfer"
      | "auction"
      | "unknown";
  },
>(comps: C[], strategy: CompFilterStrategy): C[] {
  if (!comps || comps.length === 0) return [];

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - strategy.maxSaleAgeMonths);

  let filtered = comps.filter((c) => {
    const saleDate = new Date(c.saleDate);
    if (Number.isNaN(saleDate.getTime())) return true; // keep undated rather than drop
    return saleDate >= cutoff;
  });

  if (strategy.requireSimilarCondition) {
    filtered = filtered.filter((c) => c.similarity === undefined || c.similarity >= 0.6);
  }

  // Arms-length filter — drops transactions the assessor would dismiss.
  // Foreclosure / REO / short sales are dropped when the strategy says
  // excludeForeclosures (most scenarios). Family transfers and auctions
  // are dropped whenever the strategy enforces arms-length, since both
  // categories are categorically non-market for assessment purposes.
  if (strategy.excludeForeclosures || !strategy.allowDistressedComps) {
    filtered = filtered.filter((c) => {
      const t = c.transactionType;
      if (t === "foreclosure" || t === "reo" || t === "auction") return false;
      if (strategy.excludeShortSales && t === "short_sale") return false;
      return true;
    });
  }
  // Family transfers are categorically non-arm's-length under any
  // strategy that filters comps; assessors will reject them on sight.
  filtered = filtered.filter((c) => c.transactionType !== "family_transfer");

  // Outlier trim: when distressed comps are not welcome AND we have enough
  // data to spare, drop the extremes of the price-per-sqft distribution.
  // This stops a single outlier from dragging the LLM's anchor.
  if (!strategy.allowDistressedComps && filtered.length > 5) {
    const ppsf = filtered
      .map((c) => ({ comp: c, ppsf: c.squareFeet > 0 ? c.salePrice / c.squareFeet : 0 }))
      .filter((x) => x.ppsf > 0)
      .sort((a, b) => a.ppsf - b.ppsf);
    const trim = Math.max(1, Math.floor(ppsf.length * 0.1));
    filtered = ppsf.slice(trim, ppsf.length - trim).map((x) => x.comp);
  }

  if (strategy.preferRecentSales) {
    filtered = [...filtered].sort((a, b) => {
      const at = new Date(a.saleDate).getTime();
      const bt = new Date(b.saleDate).getTime();
      return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
    });
  }

  return filtered;
}

/**
 * Calculate scenario-adjusted market value
 * Applies scenario-specific adjustments to the base market value estimate
 */
export function calculateScenarioAdjustedValue(
  baseMarketValue: number,
  scenario: UserScenario,
  propertyData: PropertyData
): number {
  const context = getScenarioContext(scenario);
  const adjustments = context.valuationAdjustments;

  let adjustedValue = baseMarketValue;

  // Apply condition adjustment
  adjustedValue *= 1 + adjustments.conditionAdjustment;

  // Apply market conditions adjustment
  adjustedValue *= 1 + adjustments.marketConditionsAdjustment;

  // RECENTLY-PURCHASED CEILING: USPAP best evidence is an arms-length
  // purchase. The owner cannot defensibly argue a market value materially
  // ABOVE a recent arms-length purchase price — but assessors and boards
  // routinely give a 3-5% allowance for normal market drift between sale
  // and assessment date. We cap at +5% of the actual lastSalePrice (a real
  // number, not a fabrication). The rationale is documentary: lastSalePrice
  // is in the public record; this is a defensible ceiling, not a synthetic
  // floor.
  if (scenario === "recently_purchased" && propertyData.lastSalePrice) {
    adjustedValue = Math.min(adjustedValue, propertyData.lastSalePrice * 1.05);
  }

  // NOTE: prior versions injected a $60/sqft "distressed-condition floor"
  // and a 50/50 income-approach blend computed from a 40% expense ratio
  // and 8% cap rate. Both have been removed because they put fabricated
  // numbers into the marketValueEstimate that lands in the appeal record.
  // The income approach for rental properties is handled by the LLM with
  // the actual comp / rental data; if the owner needs an explicit income-
  // approach valuation, the dedicated incomeApproachCalculator service is
  // wired through the methodology integrator.

  return Math.round(adjustedValue);
}

/**
 * Calculate scenario-adjusted appeal strength score
 */
export function calculateScenarioAppealStrength(
  baseScore: number,
  assessmentGapPercent: number,
  scenario: UserScenario
): number {
  const context = getScenarioContext(scenario);
  const modifiers = context.appealStrengthModifiers;

  let adjustedScore = baseScore + modifiers.baseModifier;

  // Legal grounds bonus for significant gaps
  if (assessmentGapPercent > 15) {
    adjustedScore += modifiers.legalGroundsBonus;
  }

  // Apply evidence strength multiplier
  adjustedScore *= modifiers.evidenceStrengthMultiplier;

  // Cap at 100
  return Math.min(100, Math.max(0, Math.round(adjustedScore)));
}

/**
 * Calculate scenario-adjusted tax savings.
 *
 * Returns `null` when the caller cannot supply a real effective tax rate
 * (e.g. no tax bill uploaded and no jurisdiction-derived rate available).
 * The pipeline must NOT fabricate savings from a national-average rate —
 * a misleading dollar figure in front of an owner or assessor is worse
 * than admitting the projection cannot be computed.
 *
 * @param assessmentGap  Indicated reduction in assessed value.
 * @param scenario       Owner scenario; affects expected-success multiplier.
 * @param baseTaxRate    Effective tax rate as a decimal (e.g. 0.022 for
 *                       2.2%). MUST come from the owner's tax bill, the
 *                       county / jurisdiction record, or other
 *                       primary-source data. Pass `null` when unavailable
 *                       and this function returns `null` to signal that
 *                       the projection is unavailable.
 */
export function calculateScenarioTaxSavings(
  assessmentGap: number,
  scenario: UserScenario,
  baseTaxRate: number | null,
): number | null {
  if (baseTaxRate === null || !Number.isFinite(baseTaxRate) || baseTaxRate <= 0 || baseTaxRate >= 1) {
    return null;
  }
  const context = getScenarioContext(scenario);
  const adjustedTaxRate = baseTaxRate * context.taxRateAdjustment;

  // Some scenarios have different success rate assumptions
  const successRateMultiplier: Record<UserScenario, number> = {
    primary_residence: 0.55,
    rental_property: 0.6,
    vacation_home: 0.45,
    inherited_property: 0.65,
    recently_purchased: 0.75,
    planning_to_sell: 0.5,
    distressed_condition: 0.7,
    new_construction: 0.4,
    recently_renovated: 0.35,
    senior_homestead: 0.7, // Exemptions stack with appeals; high overall savings probability
    veteran_disability: 0.8, // Exemptions are largely automatic; appeal layers on top
    financial_hardship: 0.6, // Hardship triggers more procedural pathways
    mixed_use: 0.65, // Misclassification appeals tend to succeed
    none: 0.5,
  };

  const annualSavings = assessmentGap * adjustedTaxRate;
  const expectedSavings = annualSavings * successRateMultiplier[scenario];

  return Math.round(expectedSavings);
}

/**
 * Generate scenario-specific LLM prompt context
 * This enriches the LLM prompt with scenario-aware guidance
 */
export function generateScenarioPromptContext(
  scenario: UserScenario,
  propertyData: PropertyData
): string {
  const context = getScenarioContext(scenario);

  return `
USER SCENARIO: ${context.scenarioLabel}
${context.scenarioDescription}

SCENARIO-SPECIFIC VALUATION GUIDANCE:
- Market Approach Weight: ${(context.valuationAdjustments.marketApproachWeight * 100).toFixed(0)}%
- Income Approach Weight: ${(context.valuationAdjustments.incomeApproachWeight * 100).toFixed(0)}%
- Cost Approach Weight: ${(context.valuationAdjustments.costApproachWeight * 100).toFixed(0)}%
- Condition Adjustment: ${(context.valuationAdjustments.conditionAdjustment * 100).toFixed(1)}%
- Market Conditions Adjustment: ${(context.valuationAdjustments.marketConditionsAdjustment * 100).toFixed(1)}%

COMPARABLE SALES FILTER STRATEGY:
- Exclude foreclosures: ${context.compFilterStrategy.excludeForeclosures}
- Exclude short sales: ${context.compFilterStrategy.excludeShortSales}
- Max sale age: ${context.compFilterStrategy.maxSaleAgeMonths} months
- Allow distressed comps: ${context.compFilterStrategy.allowDistressedComps}

USER ADVOCACY POINTS (incorporate into analysis):
${context.userAdvocacyPoints.map((p) => `- ${p}`).join("\n")}

NARRATIVE GUIDANCE:
${context.narrativeTemplate}

${propertyData.lastSalePrice && scenario === "recently_purchased" ? `RECENT PURCHASE PRICE: $${propertyData.lastSalePrice.toLocaleString()} — This is the strongest evidence of market value.` : ""}
${propertyData.rentalComps && scenario === "rental_property" ? `RENTAL INCOME DATA: ${propertyData.rentalComps.length} comparable rentals found` : ""}
`;
}

/**
 * Get recommended approach override based on scenario
 * Returns null if no override (use standard logic)
 */
export function getScenarioApproachOverride(
  scenario: UserScenario,
  appealStrengthScore: number
): "poa" | "pro-se" | "not-recommended" | null {
  const context = getScenarioContext(scenario);

  if (context.recommendedApproachOverride) {
    return context.recommendedApproachOverride;
  }

  // Scenario-specific logic
  if (scenario === "recently_purchased" && appealStrengthScore >= 70) {
    return "poa"; // Strong case, let us handle it
  }

  if (scenario === "distressed_condition" && appealStrengthScore >= 60) {
    return "poa"; // Complex case needs professional handling
  }

  if (scenario === "inherited_property" && appealStrengthScore >= 65) {
    return "poa"; // Emotional/time-sensitive, let us handle it
  }

  if (scenario === "rental_property" && appealStrengthScore >= 60) {
    return "poa"; // Income approach complexity
  }

  if (scenario === "veteran_disability") {
    // Whether the appeal succeeds or not, exemption filing alone is high-value;
    // we should always recommend filing — POA when the underlying assessment
    // also overstates value, pro-se when only the exemption needs filing.
    return appealStrengthScore >= 50 ? "poa" : "pro-se";
  }

  if (scenario === "senior_homestead" && appealStrengthScore >= 50) {
    return "poa"; // Senior + appeal stack benefits from professional handling
  }

  if (scenario === "financial_hardship") {
    // Hardship cases benefit from the pro-se path because owners often lack
    // funds for a contingency-fee POA up front; they need the lowest-cost route.
    return "pro-se";
  }

  if (scenario === "mixed_use" && appealStrengthScore >= 55) {
    return "poa"; // Misclassification appeals are technical
  }

  return null;
}

/**
 * Get urgency label and color for UI
 */
export function getUrgencyDisplay(urgency: "low" | "medium" | "high" | "critical"): {
  label: string;
  color: string;
  icon: string;
} {
  const displays = {
    low: { label: "Standard Timeline", color: "#10B981", icon: "clock" },
    medium: { label: "Recommended Soon", color: "#F59E0B", icon: "alert-circle" },
    high: { label: "Act Soon", color: "#F97316", icon: "alert-triangle" },
    critical: { label: "Urgent — File Immediately", color: "#EF4444", icon: "alert-octagon" },
  };
  return displays[urgency];
}

/**
 * Format scenario for display in UI
 */
export function formatScenarioLabel(scenario: UserScenario): string {
  return getScenarioContext(scenario).scenarioLabel;
}

/**
 * Get all available scenarios for UI dropdown
 */
export function getAllScenarios(): Array<{ value: UserScenario; label: string; description: string }> {
  return Object.values(scenarioDefinitions).map((ctx) => ({
    value: ctx.scenario,
    label: ctx.scenarioLabel,
    description: ctx.scenarioDescription,
  }));
}
