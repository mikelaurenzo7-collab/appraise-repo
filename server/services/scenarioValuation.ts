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

  // For distressed properties, also consider cost approach floor
  if (scenario === "distressed_condition" && propertyData.squareFeet) {
    const costFloor = propertyData.squareFeet * 60; // $60/sqft minimum for distressed
    adjustedValue = Math.max(adjustedValue, costFloor);
  }

  // For recently purchased, purchase price is the ceiling
  if (scenario === "recently_purchased" && propertyData.lastSalePrice) {
    adjustedValue = Math.min(adjustedValue, propertyData.lastSalePrice * 1.05); // Allow 5% market movement
  }

  // For rental properties, ensure income approach is considered
  if (scenario === "rental_property" && propertyData.rentalComps && propertyData.rentalComps.length > 0) {
    const avgRent = propertyData.rentalComps.reduce((sum, c) => sum + c.monthlyRent, 0) / propertyData.rentalComps.length;
    const annualRent = avgRent * 12;
    const noi = annualRent * 0.6; // 40% expense ratio
    const incomeValue = noi / 0.08; // 8% cap rate
    // Blend market and income approaches
    adjustedValue = adjustedValue * 0.5 + incomeValue * 0.5;
  }

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
 * Calculate scenario-adjusted tax savings
 */
export function calculateScenarioTaxSavings(
  assessmentGap: number,
  scenario: UserScenario,
  baseTaxRate: number = 0.012
): number {
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
