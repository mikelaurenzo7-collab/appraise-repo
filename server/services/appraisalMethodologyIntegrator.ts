/**
 * Appraisal Methodology Integrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates all six enhancement phases into a unified analysis pipeline:
 * 1. Advanced Comparable Sales Analysis with adjustment grids
 * 2. Cost Approach (replacement cost & depreciation)
 * 3. Income Approach (NOI & capitalization)
 * 4. Photo Analysis & Cost-to-Cure (already integrated)
 * 5. Market Trend Analysis & Time Adjustments
 * 6. Expert-Level Reconciliation & Narrative
 *
 * Returns comprehensive methodology data for PDF report generation.
 */

import { analyzeComparableSales, type ComparableSalesAnalysis, type AdjustmentGrid } from "./comparableSalesAnalyzer";
import { calculateCostApproach, type CostApproachResult } from "./costApproachCalculator";
import { calculateIncomeApproach, type IncomeApproachResult } from "./incomeApproachCalculator";
import { analyzeMarketTrends, type MarketTrendData, type MarketAnalysisResult } from "./marketTrendAnalyzer";
import { reconcileApproaches, type ReconciliationResult } from "./appraisalReconciliation";
import { scopedLogger } from "../_core/logger";

const log = scopedLogger("AppraisalMethodology");

export interface PropertyDataForMethodology {
  address: string;
  squareFeet: number;
  yearBuilt: number;
  bedrooms: number;
  bathrooms: number;
  lotSize?: number;
  condition: "excellent" | "good" | "average" | "fair" | "poor";
  propertyType: string;
  assessedValue: number;
  marketValue?: number;
  comparableSales?: Array<{
    address: string;
    salePrice: number;
    saleDate: Date;
    squareFeet: number;
    bedrooms: number;
    bathrooms: number;
    yearBuilt: number;
    condition?: string;
    pricePerSqft?: number;
  }>;
  annualGrossRentalIncome?: number;
  annualOperatingExpenses?: number;
  landValue?: number;
  marketCondition?: "buyer" | "seller" | "balanced";
  marketTrendData?: MarketTrendData;
}

export interface ComprehensiveAppraisalResult {
  // Phase 1: Comparable Sales Analysis
  comparableSalesAnalysis?: ComparableSalesAnalysis;
  
  // Phase 2: Cost Approach
  costApproachResult?: CostApproachResult;
  
  // Phase 3: Income Approach
  incomeApproachResult?: IncomeApproachResult;
  
  // Phase 5: Market Trends
  marketAnalysis?: MarketAnalysisResult;
  
  // Phase 6: Reconciliation
  reconciliation?: ReconciliationResult;
  
  // Summary
  finalValue: number;
  assessmentGap: number;
  assessmentGapPercent: number;
  recommendedValue: number;
  analysisNarrative: string;
  dataPoints: string[];
  warnings: string[];
}

/**
 * Main orchestration function — runs all methodology phases
 */
export async function runComprehensiveAppraisal(
  propertyData: PropertyDataForMethodology
): Promise<ComprehensiveAppraisalResult> {
  const warnings: string[] = [];
  const dataPoints: string[] = [];
  
  log.info(`[AppraisalMethodology] Starting comprehensive appraisal for ${propertyData.address}`);
  
  // ─── PHASE 1: COMPARABLE SALES ANALYSIS ────────────────────────────────────
  let comparableSalesAnalysis: ComparableSalesAnalysis | undefined;
  try {
    if (propertyData.comparableSales && propertyData.comparableSales.length > 0) {
      const marketTrendAdjustment = propertyData.marketTrendData?.appreciationRate || 0.035;
      
      comparableSalesAnalysis = await analyzeComparableSales(
        {
          address: propertyData.address,
          salePrice: propertyData.assessedValue,
          saleDate: new Date(),
          squareFeet: propertyData.squareFeet,
          bedrooms: propertyData.bedrooms,
          bathrooms: propertyData.bathrooms,
          yearBuilt: propertyData.yearBuilt,
          condition: propertyData.condition,
          lotSize: propertyData.lotSize,
        },
        propertyData.comparableSales.map(c => ({
          address: c.address,
          salePrice: c.salePrice,
          saleDate: new Date(c.saleDate),
          squareFeet: c.squareFeet,
          bedrooms: c.bedrooms,
          bathrooms: c.bathrooms,
          yearBuilt: c.yearBuilt,
          condition: (c.condition || "average") as "excellent" | "good" | "average" | "fair" | "poor",
          lotSize: c.squareFeet,
        })),
        marketTrendAdjustment
      );
      
      log.info(`[AppraisalMethodology] Phase 1 complete — Sales Comparison Value: $${comparableSalesAnalysis.indicatedValue.toLocaleString()}`);
      dataPoints.push(`Phase 1 - Comparable Sales Analysis: $${comparableSalesAnalysis.indicatedValue.toLocaleString()}`);
    }
  } catch (err) {
    log.warn("[AppraisalMethodology] Phase 1 (Comparable Sales) failed:", { err: (err as Error ).message });
    warnings.push(`Comparable sales analysis failed: ${(err as Error).message}`);
  }
  
  // ─── PHASE 2: COST APPROACH ────────────────────────────────────────────────
  let costApproachResult: CostApproachResult | undefined;
  try {
    const landValue = propertyData.landValue || (propertyData.assessedValue * 0.25); // Assume 25% land value
    
    costApproachResult = calculateCostApproach({
      address: propertyData.address,
      squareFeet: propertyData.squareFeet,
      yearBuilt: propertyData.yearBuilt,
      condition: propertyData.condition,
      propertyType: propertyData.propertyType,
      landValue: Math.round(landValue),
    });
    
    log.info(`[AppraisalMethodology] Phase 2 complete — Cost Approach Value: $${costApproachResult.indicatedValue.toLocaleString()}`);
    dataPoints.push(`Phase 2 - Cost Approach: $${costApproachResult.indicatedValue.toLocaleString()}`);
  } catch (err) {
    log.warn("[AppraisalMethodology] Phase 2 (Cost Approach) failed:", { err: (err as Error ).message });
    warnings.push(`Cost approach calculation failed: ${(err as Error).message}`);
  }
  
  // ─── PHASE 3: INCOME APPROACH ──────────────────────────────────────────────
  let incomeApproachResult: IncomeApproachResult | undefined;
  try {
    if (propertyData.annualGrossRentalIncome && propertyData.annualGrossRentalIncome > 0) {
      incomeApproachResult = calculateIncomeApproach({
        address: propertyData.address,
        propertyType: propertyData.propertyType,
        annualGrossRentalIncome: propertyData.annualGrossRentalIncome,
        annualOperatingExpenses: propertyData.annualOperatingExpenses,
      });
      
      log.info(`[AppraisalMethodology] Phase 3 complete — Income Approach Value: $${incomeApproachResult.reconciledValue.toLocaleString()}`);
      dataPoints.push(`Phase 3 - Income Approach: $${incomeApproachResult.reconciledValue.toLocaleString()}`);
    }
  } catch (err) {
    log.warn("[AppraisalMethodology] Phase 3 (Income Approach) failed:", { err: (err as Error ).message });
    warnings.push(`Income approach calculation failed: ${(err as Error).message}`);
  }
  
  // ─── PHASE 5: MARKET TREND ANALYSIS ────────────────────────────────────────
  let marketAnalysis: MarketAnalysisResult | undefined;
  try {
    marketAnalysis = analyzeMarketTrends(propertyData.marketTrendData || {});
    log.info(`[AppraisalMethodology] Phase 5 complete — Market Condition: ${marketAnalysis.marketCondition}`);
    dataPoints.push(`Phase 5 - Market Analysis: ${marketAnalysis.marketCondition}'s market`);
  } catch (err) {
    log.warn("[AppraisalMethodology] Phase 5 (Market Trends) failed:", { err: (err as Error ).message });
    warnings.push(`Market trend analysis failed: ${(err as Error).message}`);
  }
  
  // ─── PHASE 6: RECONCILIATION ──────────────────────────────────────────────
  let reconciliation: ReconciliationResult | undefined;
  try {
    reconciliation = reconcileApproaches({
      address: propertyData.address,
      assessedValue: propertyData.assessedValue,
      salesComparisonValue: comparableSalesAnalysis?.indicatedValue,
      salesComparisonConfidence: comparableSalesAnalysis?.confidence,
      costApproachValue: costApproachResult?.indicatedValue,
      costApproachConfidence: costApproachResult?.confidence,
      incomeApproachValue: incomeApproachResult?.reconciledValue,
      incomeApproachConfidence: incomeApproachResult?.confidence,
      propertyType: propertyData.propertyType,
      marketCondition: marketAnalysis?.marketCondition,
    });
    
    log.info(`[AppraisalMethodology] Phase 6 complete — Final Reconciled Value: $${reconciliation.finalValue.toLocaleString()}`);
    dataPoints.push(`Phase 6 - Reconciliation: $${reconciliation.finalValue.toLocaleString()}`);
  } catch (err) {
    log.warn("[AppraisalMethodology] Phase 6 (Reconciliation) failed:", { err: (err as Error ).message });
    warnings.push(`Reconciliation failed: ${(err as Error).message}`);
  }
  
  // ─── DETERMINE FINAL VALUE ────────────────────────────────────────────────
  let finalValue = propertyData.marketValue || propertyData.assessedValue;
  let recommendedValue = finalValue;
  
  if (reconciliation) {
    finalValue = reconciliation.finalValue;
    recommendedValue = reconciliation.finalValue;
  } else if (comparableSalesAnalysis) {
    finalValue = comparableSalesAnalysis.indicatedValue;
    recommendedValue = finalValue;
  } else if (costApproachResult) {
    finalValue = costApproachResult.indicatedValue;
    recommendedValue = finalValue;
  }
  
  const assessmentGap = propertyData.assessedValue - finalValue;
  const assessmentGapPercent = propertyData.assessedValue > 0
    ? (assessmentGap / propertyData.assessedValue) * 100
    : 0;
  
  // ─── GENERATE COMPREHENSIVE NARRATIVE ──────────────────────────────────────
  const analysisNarrative = generateComprehensiveNarrative(
    propertyData,
    comparableSalesAnalysis,
    costApproachResult,
    incomeApproachResult,
    marketAnalysis,
    reconciliation,
    finalValue,
    assessmentGap
  );
  
  log.info(`[AppraisalMethodology] Comprehensive appraisal complete — Final Value: $${finalValue.toLocaleString()}, Gap: $${assessmentGap.toLocaleString()}`);
  
  return {
    comparableSalesAnalysis,
    costApproachResult,
    incomeApproachResult,
    marketAnalysis,
    reconciliation,
    finalValue,
    assessmentGap,
    assessmentGapPercent,
    recommendedValue,
    analysisNarrative,
    dataPoints,
    warnings,
  };
}

// ─── NARRATIVE GENERATION ──────────────────────────────────────────────────────

function generateComprehensiveNarrative(
  propertyData: PropertyDataForMethodology,
  sales?: ComparableSalesAnalysis,
  cost?: CostApproachResult,
  income?: IncomeApproachResult,
  market?: MarketAnalysisResult,
  reconciliation?: ReconciliationResult,
  finalValue?: number,
  assessmentGap?: number
): string {
  let narrative = `## Comprehensive Appraisal Analysis\n\n`;
  
  narrative += `This appraisal employs a multi-approach USPAP-compliant methodology to determine the market value of the subject property at ${propertyData.address}.\n\n`;
  
  // Phase 1
  if (sales) {
    narrative += `### Phase 1: Comparable Sales Analysis\n`;
    narrative += `${sales.analysisNarrative}\n\n`;
  }
  
  // Phase 2
  if (cost) {
    narrative += `### Phase 2: Cost Approach\n`;
    narrative += `${cost.analysisNarrative}\n\n`;
  }
  
  // Phase 3
  if (income) {
    narrative += `### Phase 3: Income Approach\n`;
    narrative += `${income.analysisNarrative}\n\n`;
  }
  
  // Phase 5
  if (market) {
    narrative += `### Phase 5: Market Trend Analysis\n`;
    narrative += `${market.analysisNarrative}\n\n`;
  }
  
  // Phase 6
  if (reconciliation) {
    narrative += `### Phase 6: Reconciliation & Final Value\n`;
    narrative += `${reconciliation.reconciliationNarrative}\n\n`;
    
    if (reconciliation.appealStrengthFactors.length > 0) {
      narrative += `**Appeal Strength Factors:**\n`;
      reconciliation.appealStrengthFactors.forEach(factor => {
        narrative += `- ${factor}\n`;
      });
      narrative += `\n`;
    }
    
    if (reconciliation.expertObservations.length > 0) {
      narrative += `**Expert Observations:**\n`;
      reconciliation.expertObservations.forEach(obs => {
        narrative += `- ${obs}\n`;
      });
      narrative += `\n`;
    }
  }
  
  // Summary
  if (finalValue && assessmentGap) {
    narrative += `### Summary\n`;
    narrative += `**Indicated Market Value:** $${finalValue.toLocaleString()}\n`;
    narrative += `**Current Assessment:** $${propertyData.assessedValue.toLocaleString()}\n`;
    narrative += `**Assessment Gap:** $${assessmentGap.toLocaleString()} (${((assessmentGap / propertyData.assessedValue) * 100).toFixed(1)}%)\n`;
  }
  
  return narrative.trim();
}

/**
 * Export methodology data for PDF report generation
 */
export function exportMethodologyForReport(result: ComprehensiveAppraisalResult) {
  return {
    adjustmentGrid: result.comparableSalesAnalysis?.selectedComps.map(comp => ({
      compAddress: comp.compAddress,
      compSalePrice: comp.compSalePrice,
      compSaleDate: comp.compSaleDate.toISOString().split("T")[0],
      adjustments: comp.adjustments,
      netAdjustmentPercent: comp.netAdjustmentPercent,
      netAdjustmentDollar: comp.netAdjustmentDollar,
      adjustedPrice: comp.adjustedPrice,
      pricePerSqftAdjusted: comp.pricePerSqftAdjusted,
      weight: comp.weight,
      confidence: comp.confidence,
    })),
    costApproachData: result.costApproachResult ? {
      landValue: result.costApproachResult.landValue,
      replacementCostNew: result.costApproachResult.replacementCostNew,
      costPerSquareFoot: result.costApproachResult.costPerSquareFoot,
      buildingAge: result.costApproachResult.buildingAge,
      effectiveAge: result.costApproachResult.effectiveAge,
      depreciation: result.costApproachResult.depreciation,
      depreciatedBuildingValue: result.costApproachResult.depreciatedBuildingValue,
      indicatedValue: result.costApproachResult.indicatedValue,
      confidence: result.costApproachResult.confidence,
    } : undefined,
    incomeApproachData: result.incomeApproachResult ? {
      grossPotentialIncome: result.incomeApproachResult.grossPotentialIncome,
      vacancyRate: result.incomeApproachResult.vacancyRate,
      vacancyLoss: result.incomeApproachResult.vacancyLoss,
      effectiveGrossIncome: result.incomeApproachResult.effectiveGrossIncome,
      operatingExpenseRatio: result.incomeApproachResult.operatingExpenseRatio,
      operatingExpenses: result.incomeApproachResult.operatingExpenses,
      netOperatingIncome: result.incomeApproachResult.netOperatingIncome,
      capitalizationRate: result.incomeApproachResult.capitalizationRate,
      incomeApproachValue: result.incomeApproachResult.incomeApproachValue,
      reconciledValue: result.incomeApproachResult.reconciledValue,
      confidence: result.incomeApproachResult.confidence,
    } : undefined,
    marketTrendData: result.marketAnalysis ? {
      marketCondition: result.marketAnalysis.marketCondition,
      appreciationRate: result.marketAnalysis.appreciationRate,
      seasonalAdjustment: result.marketAnalysis.seasonalAdjustment,
      marketStrength: result.marketAnalysis.marketStrength,
      dataPoints: result.marketAnalysis.dataPoints,
      recommendations: result.marketAnalysis.recommendations,
    } : undefined,
    reconciliationNarrative: result.reconciliation?.reconciliationNarrative,
    appealStrengthFactors: result.reconciliation?.appealStrengthFactors,
    expertObservations: result.reconciliation?.expertObservations,
    approachWeights: result.reconciliation?.approachWeights,
    confidenceLevel: result.reconciliation?.confidenceLevel,
  };
}
