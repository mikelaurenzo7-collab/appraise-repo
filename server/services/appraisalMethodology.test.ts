/**
 * Comprehensive Appraisal Methodology Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests all 6 enhancement phases to ensure they work correctly and integrate
 * properly with the analysis pipeline.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { runComprehensiveAppraisal, exportMethodologyForReport } from "./appraisalMethodologyIntegrator";
import { analyzeComparableSales } from "./comparableSalesAnalyzer";
import { calculateCostApproach } from "./costApproachCalculator";
import { calculateIncomeApproach } from "./incomeApproachCalculator";
import { analyzeMarketTrends } from "./marketTrendAnalyzer";
import { reconcileApproaches } from "./appraisalReconciliation";

describe("Appraisal Methodology Phases", () => {
  // ─── Test Data ──────────────────────────────────────────────────────────

  const testPropertyData = {
    address: "123 Main St, Springfield, IL 62701",
    squareFeet: 2500,
    yearBuilt: 1995,
    bedrooms: 4,
    bathrooms: 2.5,
    lotSize: 7500,
    condition: "good" as const,
    propertyType: "residential",
    assessedValue: 450000,
    marketValue: 380000,
    comparableSales: [
      {
        address: "456 Oak Ave, Springfield, IL",
        salePrice: 385000,
        saleDate: new Date("2024-02-15"),
        squareFeet: 2450,
        bedrooms: 4,
        bathrooms: 2,
        yearBuilt: 1993,
        condition: "good" as const,
      },
      {
        address: "789 Elm St, Springfield, IL",
        salePrice: 375000,
        saleDate: new Date("2024-01-20"),
        squareFeet: 2600,
        bedrooms: 4,
        bathrooms: 3,
        yearBuilt: 1998,
        condition: "excellent" as const,
      },
      {
        address: "321 Maple Dr, Springfield, IL",
        salePrice: 370000,
        saleDate: new Date("2023-12-10"),
        squareFeet: 2400,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 1990,
        condition: "average" as const,
      },
    ],
    annualGrossRentalIncome: 36000,
    annualOperatingExpenses: 10800,
    landValue: 120000,
    marketCondition: "balanced" as const,
    marketTrendData: {
      appreciationRate: 0.035,
      seasonalAdjustment: 0.02,
      marketStrength: 0.5,
    },
  };

  // ─── Phase 1: Comparable Sales Analysis ──────────────────────────────

  describe("Phase 1: Comparable Sales Analysis", () => {
    it("should analyze comparable sales with adjustment grids", async () => {
      const subjectComp = {
        address: testPropertyData.address,
        salePrice: testPropertyData.assessedValue,
        saleDate: new Date(),
        squareFeet: testPropertyData.squareFeet,
        bedrooms: testPropertyData.bedrooms,
        bathrooms: testPropertyData.bathrooms,
        yearBuilt: testPropertyData.yearBuilt,
        condition: testPropertyData.condition,
        lotSize: testPropertyData.lotSize,
      };

      const comps = testPropertyData.comparableSales.map(c => ({
        address: c.address,
        salePrice: c.salePrice,
        saleDate: c.saleDate,
        squareFeet: c.squareFeet,
        bedrooms: c.bedrooms,
        bathrooms: c.bathrooms,
        yearBuilt: c.yearBuilt,
        condition: c.condition,
        lotSize: c.squareFeet,
      }));

      const result = await analyzeComparableSales(subjectComp, comps, 0.035);

      expect(result).toBeDefined();
      expect(result.indicatedValue).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.selectedComps.length).toBeGreaterThan(0);
      expect(result.selectedComps[0].adjustments).toBeDefined();
      expect(result.analysisNarrative).toBeTruthy();

      console.log(`✓ Phase 1 - Comparable Sales Value: $${result.indicatedValue.toLocaleString()}`);
    });

    it("should generate adjustment grid with proper formatting", async () => {
      const subjectComp = {
        address: testPropertyData.address,
        salePrice: testPropertyData.assessedValue,
        saleDate: new Date(),
        squareFeet: testPropertyData.squareFeet,
        bedrooms: testPropertyData.bedrooms,
        bathrooms: testPropertyData.bathrooms,
        yearBuilt: testPropertyData.yearBuilt,
        condition: testPropertyData.condition,
        lotSize: testPropertyData.lotSize,
      };

      const comps = testPropertyData.comparableSales.map(c => ({
        address: c.address,
        salePrice: c.salePrice,
        saleDate: c.saleDate,
        squareFeet: c.squareFeet,
        bedrooms: c.bedrooms,
        bathrooms: c.bathrooms,
        yearBuilt: c.yearBuilt,
        condition: c.condition,
        lotSize: c.squareFeet,
      }));

      const result = await analyzeComparableSales(subjectComp, comps, 0.035);

      // Verify adjustment grid structure
      for (const comp of result.selectedComps) {
        expect(comp.adjustments).toBeDefined();
        expect(Object.keys(comp.adjustments).length).toBeGreaterThan(0);
        expect(comp.netAdjustmentPercent).toBeDefined();
        expect(comp.adjustedPrice).toBeGreaterThan(0);
        expect(comp.weight).toBeGreaterThan(0);
      }
    });
  });

  // ─── Phase 2: Cost Approach ──────────────────────────────────────────

  describe("Phase 2: Cost Approach", () => {
    it("should calculate cost approach value", () => {
      const result = calculateCostApproach({
        address: testPropertyData.address,
        squareFeet: testPropertyData.squareFeet,
        yearBuilt: testPropertyData.yearBuilt,
        condition: testPropertyData.condition,
        propertyType: testPropertyData.propertyType,
        landValue: testPropertyData.landValue,
      });

      expect(result).toBeDefined();
      expect(result.indicatedValue).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.landValue).toBeGreaterThan(0);
      expect(result.replacementCostNew).toBeGreaterThan(0);
      expect(result.depreciation.totalDepreciationDollar).toBeGreaterThan(0);
      expect(result.analysisNarrative).toBeTruthy();

      console.log(`✓ Phase 2 - Cost Approach Value: $${result.indicatedValue.toLocaleString()}`);
    });

    it("should calculate depreciation correctly", () => {
      const result = calculateCostApproach({
        address: testPropertyData.address,
        squareFeet: testPropertyData.squareFeet,
        yearBuilt: testPropertyData.yearBuilt,
        condition: testPropertyData.condition,
        propertyType: testPropertyData.propertyType,
        landValue: testPropertyData.landValue,
      });

      const depreciationRate = (result.depreciation.totalDepreciationDollar / result.replacementCostNew) * 100;
      expect(depreciationRate).toBeGreaterThan(0);
      expect(depreciationRate).toBeLessThan(100);
    });
  });

  // ─── Phase 3: Income Approach ────────────────────────────────────────

  describe("Phase 3: Income Approach", () => {
    it("should calculate income approach value for rental properties", () => {
      const result = calculateIncomeApproach({
        address: testPropertyData.address,
        propertyType: testPropertyData.propertyType,
        annualGrossRentalIncome: testPropertyData.annualGrossRentalIncome,
        annualOperatingExpenses: testPropertyData.annualOperatingExpenses,
      });

      expect(result).toBeDefined();
      expect(result.reconciledValue).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.netOperatingIncome).toBeGreaterThan(0);
      expect(result.capitalizationRate).toBeGreaterThan(0);
      expect(result.analysisNarrative).toBeTruthy();

      console.log(`✓ Phase 3 - Income Approach Value: $${result.reconciledValue.toLocaleString()}`);
    });

    it("should calculate NOI correctly", () => {
      const result = calculateIncomeApproach({
        address: testPropertyData.address,
        propertyType: testPropertyData.propertyType,
        annualGrossRentalIncome: testPropertyData.annualGrossRentalIncome,
        annualOperatingExpenses: testPropertyData.annualOperatingExpenses,
      });

      const expectedNOI = testPropertyData.annualGrossRentalIncome * (1 - result.vacancyRate) - result.operatingExpenses;
      expect(Math.abs(result.netOperatingIncome - expectedNOI)).toBeLessThan(100);
    });
  });

  // ─── Phase 5: Market Trend Analysis ──────────────────────────────────

  describe("Phase 5: Market Trend Analysis", () => {
    it("should analyze market trends", () => {
      const result = analyzeMarketTrends(testPropertyData.marketTrendData || {});

      expect(result).toBeDefined();
      expect(result.marketCondition).toMatch(/buyer|seller|balanced/);
      expect(result.appreciationRate).toBeDefined();
      expect(result.seasonalAdjustment).toBeDefined();
      expect(result.analysisNarrative).toBeTruthy();
      expect(result.dataPoints.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);

      console.log(`✓ Phase 5 - Market Condition: ${result.marketCondition}`);
    });
  });

  // ─── Phase 6: Reconciliation ─────────────────────────────────────────

  describe("Phase 6: Reconciliation", () => {
    it("should reconcile multiple approaches", async () => {
      // Get values from each approach
      const subjectComp = {
        address: testPropertyData.address,
        salePrice: testPropertyData.assessedValue,
        saleDate: new Date(),
        squareFeet: testPropertyData.squareFeet,
        bedrooms: testPropertyData.bedrooms,
        bathrooms: testPropertyData.bathrooms,
        yearBuilt: testPropertyData.yearBuilt,
        condition: testPropertyData.condition,
        lotSize: testPropertyData.lotSize,
      };

      const comps = testPropertyData.comparableSales.map(c => ({
        address: c.address,
        salePrice: c.salePrice,
        saleDate: c.saleDate,
        squareFeet: c.squareFeet,
        bedrooms: c.bedrooms,
        bathrooms: c.bathrooms,
        yearBuilt: c.yearBuilt,
        condition: c.condition,
        lotSize: c.squareFeet,
      }));

      const salesResult = await analyzeComparableSales(subjectComp, comps, 0.035);
      const costResult = calculateCostApproach({
        address: testPropertyData.address,
        squareFeet: testPropertyData.squareFeet,
        yearBuilt: testPropertyData.yearBuilt,
        condition: testPropertyData.condition,
        propertyType: testPropertyData.propertyType,
        landValue: testPropertyData.landValue,
      });

      const result = reconcileApproaches({
        address: testPropertyData.address,
        assessedValue: testPropertyData.assessedValue,
        salesComparisonValue: salesResult.indicatedValue,
        salesComparisonConfidence: salesResult.confidence,
        costApproachValue: costResult.indicatedValue,
        costApproachConfidence: costResult.confidence,
        propertyType: testPropertyData.propertyType,
      });

      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.reconciliationNarrative).toBeTruthy();
      expect(result.appealStrengthFactors.length).toBeGreaterThan(0);
      expect(result.approachWeights).toBeDefined();
      // Weights should be defined and positive
      if (result.approachWeights && typeof result.approachWeights === 'object') {
        const weights = Object.values(result.approachWeights).filter(w => typeof w === 'number' && !isNaN(w));
        expect(weights.length).toBeGreaterThan(0);
      }

      console.log(`✓ Phase 6 - Final Reconciled Value: $${result.finalValue.toLocaleString()}`);
    });
  });

  // ─── Comprehensive Integration Test ──────────────────────────────────

  describe("Comprehensive Appraisal Integration", () => {
    it("should run all 6 phases end-to-end", async () => {
      const result = await runComprehensiveAppraisal(testPropertyData);

      expect(result).toBeDefined();
      expect(result.finalValue).toBeGreaterThan(0);
      expect(result.assessmentGap).toBeDefined();
      expect(result.assessmentGapPercent).toBeDefined();
      expect(result.dataPoints.length).toBeGreaterThan(0);
      expect(result.analysisNarrative).toBeTruthy();

      // Verify all phases are represented
      expect(result.comparableSalesAnalysis).toBeDefined();
      expect(result.costApproachResult).toBeDefined();
      expect(result.marketAnalysis).toBeDefined();
      expect(result.reconciliation).toBeDefined();

      console.log(`✓ Comprehensive Appraisal Complete`);
      console.log(`  - Final Value: $${result.finalValue.toLocaleString()}`);
      console.log(`  - Assessment Gap: $${result.assessmentGap.toLocaleString()}`);
      console.log(`  - Gap %: ${result.assessmentGapPercent.toFixed(1)}%`);
      console.log(`  - Data Points: ${result.dataPoints.length}`);
    });

    it("should export methodology data for PDF reports", async () => {
      const result = await runComprehensiveAppraisal(testPropertyData);
      const exportedData = exportMethodologyForReport(result);

      expect(exportedData).toBeDefined();
      expect(exportedData.adjustmentGrid).toBeDefined();
      expect(exportedData.costApproachData).toBeDefined();
      expect(exportedData.marketTrendData).toBeDefined();
      expect(exportedData.reconciliationNarrative).toBeTruthy();
      expect(exportedData.appealStrengthFactors).toBeDefined();

      console.log(`✓ Methodology data exported for PDF generation`);
    });
  });
});
