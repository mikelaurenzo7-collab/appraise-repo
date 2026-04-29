/**
 * PDF Enhancement Integration
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the injection of all 6 appraisal methodology phases into the
 * PDF report generation pipeline.
 *
 * This module:
 * 1. Loads comprehensive appraisal data from the analysis record
 * 2. Renders all 6 methodology phases as professional PDF sections
 * 3. Integrates seamlessly into the existing pdfGenerator.ts workflow
 */

import PDFKit from "pdfkit";
import {
  renderPhase1ComparableSalesAnalysis,
  renderPhase2CostApproach,
  renderPhase3IncomeApproach,
  renderPhase5MarketTrends,
  renderPhase6Reconciliation,
  type AdjustmentGridEntry,
  type CostApproachData,
  type IncomeApproachData,
  type MarketTrendData,
  type ReconciliationData,
} from "./pdfReportSections";

export interface ComprehensiveAppraisalData {
  // Phase 1: Comparable Sales
  adjustmentGrid?: Array<{
    compAddress: string;
    compSalePrice: number;
    compSaleDate: string;
    adjustments: Record<string, { percent: number; dollars: number }>;
    netAdjustmentPercent: number;
    netAdjustmentDollar: number;
    adjustedPrice: number;
    pricePerSqftAdjusted: number;
    weight: number;
    confidence: number;
  }>;

  // Phase 2: Cost Approach
  costApproach?: {
    landValue: number;
    replacementCostNew: number;
    costPerSquareFoot: number;
    buildingAge: number;
    effectiveAge: number;
    depreciation: number;
    depreciatedBuildingValue: number;
    indicatedValue: number;
    confidence: number;
  };

  // Phase 3: Income Approach
  incomeApproach?: {
    grossPotentialIncome: number;
    vacancyRate: number;
    vacancyLoss: number;
    effectiveGrossIncome: number;
    operatingExpenseRatio: number;
    operatingExpenses: number;
    netOperatingIncome: number;
    capitalizationRate: number;
    incomeApproachValue: number;
    reconciledValue: number;
    confidence: number;
  };

  // Phase 5: Market Trends
  marketTrends?: {
    marketCondition: "buyer" | "seller" | "balanced";
    appreciationRate: number;
    seasonalAdjustment: number;
    marketStrength: number;
    dataPoints: string[];
    recommendations: string[];
  };

  // Phase 6: Reconciliation
  reconciliation?: {
    reconciliationNarrative: string;
    appealStrengthFactors: string[];
    expertObservations: string[];
    approachWeights: {
      salesComparison: number;
      costApproach: number;
      incomeApproach: number;
    };
    confidenceLevel: string;
  };
}

/**
 * Main integration function — injects all 6 phases into PDF generation
 * Call this after the standard PDF sections (market conditions, HBU, etc.)
 * and before the reconciliation section
 */
export async function injectAllMethodologyPhasesIntoPDF(
  doc: PDFKit.PDFDocument,
  y: number,
  cw: number,
  appraisalData: ComprehensiveAppraisalData,
  reportId: string,
  pageCounter: { n: number }
): Promise<number> {
  console.log(`[PDFEnhancement] Injecting all 6 methodology phases into report ${reportId}`);

  try {
    // Phase 1: Advanced Comparable Sales Analysis
    if (appraisalData.adjustmentGrid && appraisalData.adjustmentGrid.length > 0) {
      console.log(`[PDFEnhancement] Rendering Phase 1 with ${appraisalData.adjustmentGrid.length} comparables`);
      y = renderPhase1ComparableSalesAnalysis(
        doc,
        y,
        cw,
        appraisalData.adjustmentGrid,
        reportId,
        pageCounter
      );
    }

    // Phase 2: Cost Approach
    if (appraisalData.costApproach) {
      console.log(`[PDFEnhancement] Rendering Phase 2 - Cost Approach Value: $${appraisalData.costApproach.indicatedValue.toLocaleString()}`);
      y = renderPhase2CostApproach(
        doc,
        y,
        cw,
        appraisalData.costApproach,
        reportId,
        pageCounter
      );
    }

    // Phase 3: Income Approach
    if (appraisalData.incomeApproach) {
      console.log(`[PDFEnhancement] Rendering Phase 3 - Income Approach Value: $${appraisalData.incomeApproach.reconciledValue.toLocaleString()}`);
      y = renderPhase3IncomeApproach(
        doc,
        y,
        cw,
        appraisalData.incomeApproach,
        reportId,
        pageCounter
      );
    }

    // Phase 5: Market Trend Analysis
    if (appraisalData.marketTrends) {
      console.log(`[PDFEnhancement] Rendering Phase 5 - Market Condition: ${appraisalData.marketTrends.marketCondition}`);
      y = renderPhase5MarketTrends(
        doc,
        y,
        cw,
        appraisalData.marketTrends,
        reportId,
        pageCounter
      );
    }

    // Phase 6: Reconciliation & Final Value
    if (appraisalData.reconciliation) {
      console.log(`[PDFEnhancement] Rendering Phase 6 - Reconciliation with ${appraisalData.reconciliation.appealStrengthFactors.length} strength factors`);
      y = renderPhase6Reconciliation(
        doc,
        y,
        cw,
        appraisalData.reconciliation,
        reportId,
        pageCounter
      );
    }

    console.log(`[PDFEnhancement] All 6 phases successfully injected into PDF`);
  } catch (err) {
    console.error(`[PDFEnhancement] Error injecting methodology phases:`, (err as Error).message);
    throw err;
  }

  return y;
}

/**
 * Parse comprehensive appraisal data from JSON-persisted analysis record
 * This function safely extracts and validates all methodology data
 */
export function parseComprehensiveAppraisalFromAnalysis(analysis: {
  adjustmentGrid?: string | null;
  costApproachData?: string | null;
  incomeApproachData?: string | null;
  marketTrendData?: string | null;
  reconciliationNarrative?: string | null;
}): ComprehensiveAppraisalData {
  const data: ComprehensiveAppraisalData = {};

  try {
    if (analysis.adjustmentGrid) {
      data.adjustmentGrid = JSON.parse(analysis.adjustmentGrid);
    }
  } catch (err) {
    console.warn("[PDFEnhancement] Failed to parse adjustmentGrid:", (err as Error).message);
  }

  try {
    if (analysis.costApproachData) {
      data.costApproach = JSON.parse(analysis.costApproachData);
    }
  } catch (err) {
    console.warn("[PDFEnhancement] Failed to parse costApproachData:", (err as Error).message);
  }

  try {
    if (analysis.incomeApproachData) {
      data.incomeApproach = JSON.parse(analysis.incomeApproachData);
    }
  } catch (err) {
    console.warn("[PDFEnhancement] Failed to parse incomeApproachData:", (err as Error).message);
  }

  try {
    if (analysis.marketTrendData) {
      data.marketTrends = JSON.parse(analysis.marketTrendData);
    }
  } catch (err) {
    console.warn("[PDFEnhancement] Failed to parse marketTrendData:", (err as Error).message);
  }

  try {
    if (analysis.reconciliationNarrative) {
      // Reconciliation data is stored as a JSON object with narrative, factors, observations, weights, confidence
      const reconcData = JSON.parse(analysis.reconciliationNarrative);
      data.reconciliation = reconcData;
    }
  } catch (err) {
    console.warn("[PDFEnhancement] Failed to parse reconciliationNarrative:", (err as Error).message);
  }

  return data;
}

/**
 * Build comprehensive appraisal data object from raw methodology results
 * Used during analysis pipeline to structure data for persistence
 */
export function buildComprehensiveAppraisalData(
  adjustmentGridData?: any,
  costApproachData?: any,
  incomeApproachData?: any,
  marketTrendData?: any,
  reconciliationData?: any
): ComprehensiveAppraisalData {
  return {
    adjustmentGrid: adjustmentGridData,
    costApproach: costApproachData,
    incomeApproach: incomeApproachData,
    marketTrends: marketTrendData,
    reconciliation: reconciliationData,
  };
}
