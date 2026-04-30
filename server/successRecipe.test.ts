import { describe, expect, it } from "vitest";
import {
  buildSuccessRecipe,
  formatSuccessRecipePrompt,
} from "./services/successRecipe";
import type { PropertyData } from "./services/propertyDataAggregator";

const baseProperty: PropertyData = {
  address: "123 Main St",
  city: "Houston",
  state: "TX",
  county: "Harris",
  assessedValue: 500_000,
  marketValue: 420_000,
  squareFeet: 2_100,
  comparableSales: [
    {
      address: "125 Main St",
      salePrice: 415_000,
      saleDate: "2026-01-15",
      squareFeet: 2_050,
      similarity: 85,
      source: "rentcast",
    },
    {
      address: "127 Main St",
      salePrice: 425_000,
      saleDate: "2026-02-15",
      squareFeet: 2_120,
      similarity: 82,
      source: "rentcast",
    },
    {
      address: "129 Main St",
      salePrice: 430_000,
      saleDate: "2026-03-15",
      squareFeet: 2_150,
      similarity: 80,
      source: "rentcast",
    },
  ],
  source: "test",
};

describe("success recipes", () => {
  it("builds a county- and scenario-specific appraisal recipe", () => {
    const recipe = buildSuccessRecipe(
      baseProperty,
      "residential",
      "recently_purchased"
    );

    expect(recipe.jurisdiction).toBe("Harris County, TX");
    expect(recipe.scenario).toBe("Recently Purchased");
    expect(recipe.countyTactics.some(t => /MLS data/i.test(t))).toBe(true);
    expect(
      recipe.evidenceChecklist.some(item =>
        /purchase price|strongest evidence/i.test(item)
      )
    ).toBe(true);
    expect(recipe.filingRecommendation.method).toBe("poa");
    expect(
      recipe.viabilitySignals.some(signal => /meets threshold/i.test(signal))
    ).toBe(true);
    expect(recipe.promptContext).toContain("COUNTY + SCENARIO SUCCESS RECIPE");
  });

  it("falls back for counties not explicitly modeled while preserving useful rules", () => {
    const recipe = buildSuccessRecipe(
      { ...baseProperty, county: "Wakanda" },
      "multi-family",
      "rental_property"
    );

    expect(recipe.jurisdiction).toBe("TX statewide / county fallback");
    expect(
      recipe.valuationFocus.some(focus => /income capitalization/i.test(focus))
    ).toBe(true);
    expect(recipe.riskControls.some(risk => /fallback/i.test(risk))).toBe(true);
    expect(recipe.evidenceChecklist.some(item => /Rent roll/i.test(item))).toBe(
      true
    );
  });

  it("uses pro-se when jurisdiction rules disallow POA", () => {
    const recipe = buildSuccessRecipe(
      {
        ...baseProperty,
        state: "CA",
        county: "Los Angeles",
        assessedValue: 1_000_000,
        marketValue: 800_000,
      },
      "residential",
      "primary_residence"
    );

    expect(recipe.filingRecommendation.method).toBe("pro-se");
    expect(recipe.filingRecommendation.reasoning).toMatch(
      /Power of Attorney not allowed/i
    );
  });

  it("formats prompt context with all operational sections", () => {
    const recipe = buildSuccessRecipe(
      baseProperty,
      "land",
      "distressed_condition"
    );
    const prompt = formatSuccessRecipePrompt(recipe);

    expect(prompt).toContain("VALUATION FOCUS");
    expect(prompt).toContain("EVIDENCE CHECKLIST");
    expect(prompt).toContain("COUNTY TACTICS");
    expect(prompt).toContain("RISK CONTROLS");
    expect(prompt).toContain("VIABILITY SIGNALS");
  });
});
