import { describe, expect, it } from "vitest";
import {
  getScenarioContext,
  calculateScenarioAdjustedValue,
  calculateScenarioAppealStrength,
  calculateScenarioTaxSavings,
  generateScenarioPromptContext,
  getScenarioApproachOverride,
  getAllScenarios,
  formatScenarioLabel,
  type UserScenario,
} from "./services/scenarioValuation";
import type { PropertyData } from "./services/propertyDataAggregator";

describe("Scenario Valuation Engine", () => {
  const mockPropertyData: PropertyData = {
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    assessedValue: 400000,
    marketValue: 350000,
    squareFeet: 2000,
    yearBuilt: 2005,
    bedrooms: 3,
    bathrooms: 2,
    lastSalePrice: 340000,
    comparableSales: [
      { address: "124 Main St", salePrice: 345000, saleDate: "2024-01-15", squareFeet: 1950, similarity: 90, source: "rentcast" },
    ],
    rentalComps: [
      { address: "125 Main St", monthlyRent: 2200, bedrooms: 3, bathrooms: 2, squareFeet: 2000, source: "rentcast" },
    ],
    source: "test",
  };

  describe("getScenarioContext", () => {
    it("returns context for all valid scenarios", () => {
      const scenarios: UserScenario[] = [
        "primary_residence",
        "rental_property",
        "vacation_home",
        "inherited_property",
        "recently_purchased",
        "planning_to_sell",
        "distressed_condition",
        "new_construction",
        "recently_renovated",
        "none",
      ];
      scenarios.forEach((s) => {
        const ctx = getScenarioContext(s);
        expect(ctx.scenario).toBe(s);
        expect(ctx.scenarioLabel).toBeTruthy();
        expect(ctx.valuationAdjustments).toBeDefined();
        expect(ctx.appealStrengthModifiers).toBeDefined();
        expect(ctx.userAdvocacyPoints.length).toBeGreaterThan(0);
      });
    });

    it("returns default context for invalid scenario", () => {
      const ctx = getScenarioContext("invalid" as UserScenario);
      expect(ctx.scenario).toBe("none");
    });
  });

  describe("calculateScenarioAdjustedValue", () => {
    it("reduces value for distressed condition", () => {
      const adjusted = calculateScenarioAdjustedValue(350000, "distressed_condition", mockPropertyData);
      expect(adjusted).toBeLessThan(350000);
    });

    it("caps value near purchase price for recently purchased", () => {
      const adjusted = calculateScenarioAdjustedValue(400000, "recently_purchased", mockPropertyData);
      expect(adjusted).toBeLessThanOrEqual(357000); // 340k * 1.05
    });

    it("blends income approach for rental property", () => {
      const adjusted = calculateScenarioAdjustedValue(350000, "rental_property", mockPropertyData);
      // NOI = 2200 * 12 * 0.6 = 15840; value = 15840 / 0.08 = 198000
      // Blended: 350000 * 0.5 + 198000 * 0.5 = 274000
      expect(adjusted).toBeLessThan(350000);
    });

    it("returns floor for distressed with square footage", () => {
      const data = { ...mockPropertyData, squareFeet: 1000 };
      const adjusted = calculateScenarioAdjustedValue(50000, "distressed_condition", data);
      expect(adjusted).toBeGreaterThanOrEqual(60000); // 1000 * 60 floor
    });

    it("leaves primary residence value mostly unchanged", () => {
      const adjusted = calculateScenarioAdjustedValue(350000, "primary_residence", mockPropertyData);
      expect(adjusted).toBe(350000);
    });
  });

  describe("calculateScenarioAppealStrength", () => {
    it("boosts score for inherited property", () => {
      const score = calculateScenarioAppealStrength(50, 20, "inherited_property");
      expect(score).toBeGreaterThan(50);
    });

    it("significantly boosts recently purchased with large gap", () => {
      const score = calculateScenarioAppealStrength(50, 20, "recently_purchased");
      expect(score).toBeGreaterThan(70);
    });

    it("reduces score for recently renovated", () => {
      const score = calculateScenarioAppealStrength(50, 20, "recently_renovated");
      expect(score).toBeLessThan(50);
    });

    it("caps at 100", () => {
      const score = calculateScenarioAppealStrength(95, 30, "recently_purchased");
      expect(score).toBe(100);
    });

    it("floors at 0", () => {
      const score = calculateScenarioAppealStrength(5, 5, "recently_renovated");
      expect(score).toBe(0);
    });
  });

  describe("calculateScenarioTaxSavings", () => {
    it("calculates higher savings for rental properties", () => {
      const rental = calculateScenarioTaxSavings(50000, "rental_property");
      const primary = calculateScenarioTaxSavings(50000, "primary_residence");
      expect(rental).toBeGreaterThan(primary);
    });

    it("calculates highest savings for recently purchased", () => {
      const recent = calculateScenarioTaxSavings(50000, "recently_purchased");
      const none = calculateScenarioTaxSavings(50000, "none");
      expect(recent).toBeGreaterThan(none);
    });

    it("returns 0 for zero gap", () => {
      expect(calculateScenarioTaxSavings(0, "primary_residence")).toBe(0);
    });
  });

  describe("generateScenarioPromptContext", () => {
    it("includes scenario label and advocacy points", () => {
      const prompt = generateScenarioPromptContext("inherited_property", mockPropertyData);
      expect(prompt).toContain("Inherited Property");
      expect(prompt).toContain("USER ADVOCACY POINTS");
      expect(prompt).toContain("deferred maintenance");
    });

    it("includes purchase price for recently purchased", () => {
      const prompt = generateScenarioPromptContext("recently_purchased", mockPropertyData);
      expect(prompt).toContain("RECENT PURCHASE PRICE");
      expect(prompt).toContain("340,000");
    });

    it("includes rental data for rental property", () => {
      const prompt = generateScenarioPromptContext("rental_property", mockPropertyData);
      expect(prompt).toContain("RENTAL INCOME DATA");
    });
  });

  describe("getScenarioApproachOverride", () => {
    it("recommends POA for strong recently purchased case", () => {
      expect(getScenarioApproachOverride("recently_purchased", 75)).toBe("poa");
    });

    it("recommends POA for distressed condition with decent score", () => {
      expect(getScenarioApproachOverride("distressed_condition", 65)).toBe("poa");
    });

    it("returns null for moderate scenarios", () => {
      expect(getScenarioApproachOverride("primary_residence", 50)).toBeNull();
    });
  });

  describe("UI helpers", () => {
    it("getAllScenarios returns 10 scenarios", () => {
      const all = getAllScenarios();
      expect(all).toHaveLength(10);
      expect(all[0]).toHaveProperty("value");
      expect(all[0]).toHaveProperty("label");
      expect(all[0]).toHaveProperty("description");
    });

    it("formatScenarioLabel returns human-readable labels", () => {
      expect(formatScenarioLabel("rental_property")).toBe("Rental Property / Investment");
      expect(formatScenarioLabel("recently_purchased")).toBe("Recently Purchased");
    });
  });
});
