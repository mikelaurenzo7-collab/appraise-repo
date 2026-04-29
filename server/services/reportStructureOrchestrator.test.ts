/**
 * Report Structure Orchestrator Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the intelligent report structure determination and null section filtering.
 */

import { describe, it, expect } from "vitest";
import {
  orchestrateReportStructure,
  getSectionVisibilityFlags,
  logReportStructure,
  type AnalysisDataForReporting,
} from "./reportStructureOrchestrator";

describe("Report Structure Orchestrator", () => {
  // ─── Test Data ──────────────────────────────────────────────────────────

  const baseResidentialData: AnalysisDataForReporting = {
    assessedValue: 450000,
    propertyType: "residential",
    isIncomeProducing: false,
  };

  const residentialWithPhotos: AnalysisDataForReporting = {
    ...baseResidentialData,
    userPhotos: [
      { url: "photo1.jpg", caption: "Roof damage", costToCure: 5000 },
      { url: "photo2.jpg", caption: "Foundation crack", costToCure: 8000 },
    ],
    photoAnalysisConfidence: 0.85,
    totalCostToCure: 13000,
  };

  const residentialWithComps: AnalysisDataForReporting = {
    ...residentialWithPhotos,
    adjustmentGrid: [
      { compAddress: "123 Oak St", adjustedPrice: 420000, confidence: 0.9 },
      { compAddress: "456 Elm St", adjustedPrice: 415000, confidence: 0.85 },
      { compAddress: "789 Maple St", adjustedPrice: 425000, confidence: 0.9 },
    ],
    comparableConfidence: 0.88,
    comparableCount: 3,
  };

  const residentialWithMarket: AnalysisDataForReporting = {
    ...residentialWithComps,
    marketTrendData: {
      marketCondition: "balanced",
      appreciationRate: 0.035,
      dataPoints: ["Median price: $420k", "DOM: 45 days", "Inventory: 12 homes"],
    },
    marketConfidence: 0.75,
  };

  const residentialWithCostApproach: AnalysisDataForReporting = {
    ...residentialWithMarket,
    costApproachData: {
      indicatedValue: 418000,
      confidence: 0.7,
    },
  };

  const incomeProperty: AnalysisDataForReporting = {
    assessedValue: 850000,
    propertyType: "duplex",
    isIncomeProducing: true,
    incomeApproachData: {
      reconciledValue: 780000,
      confidence: 0.8,
    },
    adjustmentGrid: [
      { compAddress: "100 Main St", adjustedPrice: 775000, confidence: 0.85 },
      { compAddress: "200 Main St", adjustedPrice: 785000, confidence: 0.9 },
      { compAddress: "300 Main St", adjustedPrice: 790000, confidence: 0.85 },
    ],
    comparableConfidence: 0.87,
    comparableCount: 3,
  };

  // ─── Test Cases ──────────────────────────────────────────────────────────

  describe("Scenario 1: Minimal Data (No Photos, No Comps)", () => {
    it("should show only executive summary and appeal summary", () => {
      const structure = orchestrateReportStructure(baseResidentialData);

      expect(structure.sections.length).toBeGreaterThan(0);

      const visibleSections = structure.sections.filter(s => s.visible);
      expect(visibleSections.length).toBe(2); // Executive summary + appeal summary

      expect(visibleSections[0].id).toBe("executive_summary");
      expect(visibleSections[1].id).toBe("appeal_summary");

      console.log(`✓ Scenario 1: Minimal data report type = ${structure.reportType}`);
    });

    it("should hide all methodology sections", () => {
      const structure = orchestrateReportStructure(baseResidentialData);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.user_evidence).toBe(false);
      expect(flags.market_context).toBe(false);
      expect(flags.comparable_sales).toBe(false);
      expect(flags.cost_approach).toBe(false);
      expect(flags.income_approach).toBe(false);
      expect(flags.reconciliation).toBe(false);
    });
  });

  describe("Scenario 2: Residential with Photos", () => {
    it("should include user evidence section", () => {
      const structure = orchestrateReportStructure(residentialWithPhotos);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.user_evidence).toBe(true);
      expect(flags.executive_summary).toBe(true);
      expect(flags.appeal_summary).toBe(true);

      console.log(`✓ Scenario 2: Photos included, report type = ${structure.reportType}`);
    });

    it("should have user evidence early in report", () => {
      const structure = orchestrateReportStructure(residentialWithPhotos);
      const visibleSections = structure.sections.filter(s => s.visible);

      const userEvidenceIndex = visibleSections.findIndex(s => s.id === "user_evidence");
      expect(userEvidenceIndex).toBeLessThan(4); // Should be early
    });
  });

  describe("Scenario 3: Residential with Good Comps", () => {
    it("should include comparable sales section", () => {
      const structure = orchestrateReportStructure(residentialWithComps);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.comparable_sales).toBe(true);
      expect(flags.user_evidence).toBe(true);
    });

    it("should have reconciliation when multiple approaches available", () => {
      const structure = orchestrateReportStructure(residentialWithCostApproach);
      const flags = getSectionVisibilityFlags(structure);

      // With comps + cost approach = 2 approaches
      expect(flags.reconciliation).toBe(true);
    });

    it("should be standard or comprehensive report type", () => {
      const structure = orchestrateReportStructure(residentialWithCostApproach);

      expect(["standard", "comprehensive"]).toContain(structure.reportType);
      console.log(`✓ Scenario 3: Full residential report type = ${structure.reportType}`);
    });
  });

  describe("Scenario 4: Income Property", () => {
    it("should include income approach section", () => {
      const structure = orchestrateReportStructure(incomeProperty);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.income_approach).toBe(true);
    });

    it("should identify as income-producing property", () => {
      const structure = orchestrateReportStructure(incomeProperty);

      expect(structure.primaryApproach).toMatch(/Income|Multiple/);
      expect(structure.hasMultipleApproaches).toBe(true);
    });

    it("should have multiple approaches for reconciliation", () => {
      const structure = orchestrateReportStructure(incomeProperty);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.reconciliation).toBe(true);
    });
  });

  describe("Scenario 5: Limited Comparable Data", () => {
    it("should hide comparable sales if < 3 comps", () => {
      const limitedComps: AnalysisDataForReporting = {
        ...baseResidentialData,
        adjustmentGrid: [
          { compAddress: "123 Oak St", adjustedPrice: 420000, confidence: 0.9 },
          { compAddress: "456 Elm St", adjustedPrice: 415000, confidence: 0.85 },
        ],
        comparableConfidence: 0.88,
        comparableCount: 2,
      };

      const structure = orchestrateReportStructure(limitedComps);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.comparable_sales).toBe(false);
    });
  });

  describe("Scenario 6: Low Confidence Data", () => {
    it("should hide sections with low confidence", () => {
      const lowConfidenceData: AnalysisDataForReporting = {
        ...baseResidentialData,
        marketTrendData: {
          marketCondition: "balanced",
          appreciationRate: 0.035,
          dataPoints: [],
        },
        marketConfidence: 0.3, // Below 0.5 threshold
      };

      const structure = orchestrateReportStructure(lowConfidenceData);
      const flags = getSectionVisibilityFlags(structure);

      expect(flags.market_context).toBe(false);
    });
  });

  describe("Report Type Determination", () => {
    it("should classify simple reports correctly", () => {
      const structure = orchestrateReportStructure(baseResidentialData);
      expect(structure.reportType).toBe("simple");
    });

    it("should classify standard reports correctly", () => {
      const structure = orchestrateReportStructure(residentialWithComps);
      expect(structure.reportType).toBe("standard");
    });

    it("should classify comprehensive reports correctly", () => {
      const structure = orchestrateReportStructure(residentialWithCostApproach);
      expect(structure.reportType).toBe("comprehensive");
    });
  });

  describe("Page Count Estimation", () => {
    it("should estimate reasonable page counts", () => {
      const simpleStructure = orchestrateReportStructure(baseResidentialData);
      expect(simpleStructure.totalPages).toBeGreaterThanOrEqual(2);
      expect(simpleStructure.totalPages).toBeLessThan(5);

      const comprehensiveStructure = orchestrateReportStructure(residentialWithCostApproach);
      expect(comprehensiveStructure.totalPages).toBeGreaterThan(simpleStructure.totalPages);
    });
  });

  describe("Section Ordering", () => {
    it("should maintain correct section order", () => {
      const structure = orchestrateReportStructure(residentialWithMarket);

      const visibleSections = structure.sections.filter(s => s.visible);
      for (let i = 1; i < visibleSections.length; i++) {
        expect(visibleSections[i].order).toBeGreaterThan(visibleSections[i - 1].order);
      }
    });

    it("should always put executive summary first", () => {
      const structure = orchestrateReportStructure(residentialWithCostApproach);
      const visibleSections = structure.sections.filter(s => s.visible);

      expect(visibleSections[0].id).toBe("executive_summary");
    });

    it("should always put appeal summary last", () => {
      const structure = orchestrateReportStructure(residentialWithCostApproach);
      const visibleSections = structure.sections.filter(s => s.visible);

      expect(visibleSections[visibleSections.length - 1].id).toBe("appeal_summary");
    });
  });

  describe("Evidence-First Narrative", () => {
    it("should place user evidence before methodology sections", () => {
      const structure = orchestrateReportStructure(residentialWithMarket);
      const visibleSections = structure.sections.filter(s => s.visible);

      const userEvidenceIdx = visibleSections.findIndex(s => s.id === "user_evidence");
      const comparableSalesIdx = visibleSections.findIndex(s => s.id === "comparable_sales");

      if (userEvidenceIdx >= 0 && comparableSalesIdx >= 0) {
        expect(userEvidenceIdx).toBeLessThan(comparableSalesIdx);
      }
    });

    it("should place market context before comparable sales", () => {
      const structure = orchestrateReportStructure(residentialWithMarket);
      const visibleSections = structure.sections.filter(s => s.visible);

      const marketIdx = visibleSections.findIndex(s => s.id === "market_context");
      const comparableIdx = visibleSections.findIndex(s => s.id === "comparable_sales");

      if (marketIdx >= 0 && comparableIdx >= 0) {
        expect(marketIdx).toBeLessThan(comparableIdx);
      }
    });
  });

  describe("Logging and Reporting", () => {
    it("should log report structure without errors", () => {
      const structure = orchestrateReportStructure(residentialWithCostApproach);

      expect(() => {
        logReportStructure(structure, "TEST-001");
      }).not.toThrow();
    });
  });
});
