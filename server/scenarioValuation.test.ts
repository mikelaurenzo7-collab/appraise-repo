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
  applyCompFilterStrategy,
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
        "senior_homestead",
        "veteran_disability",
        "financial_hardship",
        "mixed_use",
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
    it("getAllScenarios returns all 14 scenarios", () => {
      const all = getAllScenarios();
      expect(all).toHaveLength(14);
      expect(all[0]).toHaveProperty("value");
      expect(all[0]).toHaveProperty("label");
      expect(all[0]).toHaveProperty("description");
    });

    it("formatScenarioLabel returns human-readable labels", () => {
      expect(formatScenarioLabel("rental_property")).toBe("Rental Property / Investment");
      expect(formatScenarioLabel("recently_purchased")).toBe("Recently Purchased");
      expect(formatScenarioLabel("senior_homestead")).toBe("Senior / Retired (65+)");
      expect(formatScenarioLabel("veteran_disability")).toBe("Veteran or Disabled Owner");
    });
  });

  // ─── Coverage for the 4 scenarios added in the advocacy wave ────────────
  describe("New advocacy scenarios", () => {
    it("senior_homestead has 65+ tax-rate reduction baked in", () => {
      const ctx = getScenarioContext("senior_homestead");
      expect(ctx.taxRateAdjustment).toBeLessThan(1); // exemption-driven rate cut
      expect(ctx.userAdvocacyPoints.some((p) => /exemption|freeze|deferral/i.test(p))).toBe(true);
    });

    it("veteran_disability halves the effective rate", () => {
      const ctx = getScenarioContext("veteran_disability");
      expect(ctx.taxRateAdjustment).toBeLessThanOrEqual(0.5);
      expect(ctx.userAdvocacyPoints.some((p) => /veteran|disabled|exemption/i.test(p))).toBe(true);
    });

    it("financial_hardship marks urgency as critical", () => {
      const ctx = getScenarioContext("financial_hardship");
      expect(ctx.appealStrengthModifiers.urgencyLevel).toBe("critical");
    });

    it("mixed_use weights income approach heavily (40%)", () => {
      const ctx = getScenarioContext("mixed_use");
      expect(ctx.valuationAdjustments.incomeApproachWeight).toBeGreaterThanOrEqual(0.4);
    });

    it("getScenarioApproachOverride returns expected POA/pro-se for new scenarios", () => {
      // financial_hardship — always pro-se (lowest cost path)
      expect(getScenarioApproachOverride("financial_hardship", 80)).toBe("pro-se");
      expect(getScenarioApproachOverride("financial_hardship", 30)).toBe("pro-se");

      // veteran_disability — POA when strong, pro-se when weaker (still file)
      expect(getScenarioApproachOverride("veteran_disability", 60)).toBe("poa");
      expect(getScenarioApproachOverride("veteran_disability", 30)).toBe("pro-se");

      // senior_homestead — POA at >=50 to handle exemption + appeal stack
      expect(getScenarioApproachOverride("senior_homestead", 60)).toBe("poa");
      expect(getScenarioApproachOverride("senior_homestead", 40)).toBeNull();

      // mixed_use — POA at >=55 for misclassification
      expect(getScenarioApproachOverride("mixed_use", 60)).toBe("poa");
      expect(getScenarioApproachOverride("mixed_use", 40)).toBeNull();
    });

    it("calculateScenarioTaxSavings stays positive across every defined scenario", () => {
      for (const s of getAllScenarios()) {
        const v = calculateScenarioTaxSavings(50_000, s.value);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── applyCompFilterStrategy — locks in the comp-filter behavior that
  // was previously dormant config. ────────────────────────────────────────
  describe("applyCompFilterStrategy", () => {
    function comp(over: Partial<{ saleDate: string; similarity: number; salePrice: number; squareFeet: number }> = {}) {
      return {
        saleDate: over.saleDate ?? "2025-12-01",
        similarity: over.similarity,
        salePrice: over.salePrice ?? 400_000,
        squareFeet: over.squareFeet ?? 2_000,
      };
    }
    const primaryStrategy = getScenarioContext("primary_residence").compFilterStrategy;

    it("returns empty array on empty input", () => {
      expect(applyCompFilterStrategy([], primaryStrategy)).toEqual([]);
    });

    it("drops sales older than maxSaleAgeMonths", () => {
      const today = new Date();
      const inWindow = new Date(today); inWindow.setMonth(today.getMonth() - 3);
      const stale = new Date(today); stale.setMonth(today.getMonth() - 24); // primary = 12mo
      const out = applyCompFilterStrategy(
        [comp({ saleDate: inWindow.toISOString() }), comp({ saleDate: stale.toISOString() })],
        primaryStrategy,
      );
      expect(out.length).toBe(1);
    });

    it("keeps undated comps rather than dropping them silently", () => {
      const out = applyCompFilterStrategy([comp({ saleDate: "not-a-date" })], primaryStrategy);
      expect(out.length).toBe(1);
    });

    it("orders newest-first when preferRecentSales is true", () => {
      const old = comp({ saleDate: "2025-01-15" });
      const recent = comp({ saleDate: "2025-12-15" });
      const out = applyCompFilterStrategy([old, recent], primaryStrategy);
      expect(out[0]).toBe(recent);
    });

    it("drops similarity < 0.6 when requireSimilarCondition is true", () => {
      const out = applyCompFilterStrategy(
        [comp({ similarity: 0.4 }), comp({ similarity: 0.9 }), comp({ similarity: 0.65 })],
        primaryStrategy,
      );
      expect(out.every((c) => c.similarity === undefined || c.similarity >= 0.6)).toBe(true);
      expect(out.length).toBe(2);
    });

    it("trims top + bottom 10% outliers when distressed comps disallowed AND >5 comps", () => {
      const comps = [
        comp({ salePrice: 100_000 }),  // floor outlier
        ...Array.from({ length: 8 }, () => comp()), // 8 baseline
        comp({ salePrice: 1_600_000 }), // ceiling outlier
      ];
      const out = applyCompFilterStrategy(comps, primaryStrategy);
      const ppsfs = out.map((c) => c.salePrice / c.squareFeet);
      expect(Math.max(...ppsfs)).toBeLessThan(800);
      expect(Math.min(...ppsfs)).toBeGreaterThan(50);
    });

    it("KEEPS distressed comps for distressed_condition scenario", () => {
      const distressed = getScenarioContext("distressed_condition").compFilterStrategy;
      const comps = [
        ...Array.from({ length: 5 }, () => comp()),
        comp({ salePrice: 200_000 }), // half-price distressed
      ];
      const out = applyCompFilterStrategy(comps, distressed);
      expect(out.some((c) => c.salePrice === 200_000)).toBe(true);
    });

    it("recently_purchased uses an extended window (>=18 months)", () => {
      const recent = getScenarioContext("recently_purchased").compFilterStrategy;
      expect(recent.maxSaleAgeMonths).toBeGreaterThanOrEqual(18);
    });
  });
});
