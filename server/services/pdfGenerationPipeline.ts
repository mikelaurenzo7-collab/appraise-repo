/**
 * PDF Generation Pipeline
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the PDF generation process using the strategic report structure.
 * This wrapper integrates the report structure orchestrator with the PDF generator.
 */

import {
  orchestrateReportStructure,
  getSectionVisibilityFlags,
  logReportStructure,
  type AnalysisDataForReporting,
} from "./reportStructureOrchestrator";
import { generateAppraisalPDF, type AppraisalReportData } from "./pdfGenerator";

export interface PipelineContext {
  analysisData: AnalysisDataForReporting;
  reportData: AppraisalReportData;
  reportId: string;
  timestamp: Date;
}

/**
 * Main pipeline function: orchestrates report structure and generates PDF
 */
export async function generatePDFWithOrchestration(
  reportData: AppraisalReportData,
  analysisData: AnalysisDataForReporting
): Promise<{
  url: string;
  key: string;
  sizeBytes: number;
  reportStructure: ReturnType<typeof orchestrateReportStructure>;
  context: PipelineContext;
}> {
  const reportId = `AAI-${reportData.submissionId}-${Date.now()}`;
  const timestamp = new Date();

  console.log(`\n[PDFPipeline] Starting PDF generation for ${reportId}`);

  // Step 1: Orchestrate report structure
  console.log(`[PDFPipeline] Step 1: Orchestrating report structure...`);
  const reportStructure = orchestrateReportStructure(analysisData);
  logReportStructure(reportStructure, reportId);

  // Step 2: Prepare visibility flags for PDF generation
  console.log(`[PDFPipeline] Step 2: Preparing section visibility flags...`);
  const visibilityFlags = getSectionVisibilityFlags(reportStructure);

  // Step 3: Inject visibility flags into report data
  console.log(`[PDFPipeline] Step 3: Injecting visibility flags into report data...`);
  const enhancedReportData: AppraisalReportData = {
    ...reportData,
    // Add custom metadata for PDF generator
    _sectionVisibility: visibilityFlags,
    _reportStructure: reportStructure,
    _reportType: reportStructure.reportType,
  } as any;

  // Step 4: Generate PDF with orchestrated structure
  console.log(`[PDFPipeline] Step 4: Generating PDF...`);
  const pdfResult = await generateAppraisalPDF(enhancedReportData);

  // Step 5: Log completion
  const context: PipelineContext = {
    analysisData,
    reportData: enhancedReportData,
    reportId,
    timestamp,
  };

  console.log(`[PDFPipeline] ✓ PDF generation complete`);
  console.log(`[PDFPipeline]   - Report Type: ${reportStructure.reportType}`);
  console.log(`[PDFPipeline]   - Estimated Pages: ${reportStructure.totalPages}`);
  console.log(`[PDFPipeline]   - Sections Included: ${reportStructure.sections.filter(s => s.visible).length}`);
  console.log(`[PDFPipeline]   - File Size: ${(pdfResult.sizeBytes / 1024).toFixed(1)}KB`);
  console.log(`[PDFPipeline]   - URL: ${pdfResult.url}\n`);

  return {
    ...pdfResult,
    reportStructure,
    context,
  };
}

/**
 * Helper: Build analysis data from property analysis record
 */
export function buildAnalysisDataFromRecord(record: any): AnalysisDataForReporting {
  return {
    assessedValue: record.assessedValue,
    propertyType: record.propertyType,
    isIncomeProducing: record.isIncomeProducing,

    // User Evidence
    userPhotos: record.photos
      ? record.photos.map((p: any) => ({
          url: p.url,
          caption: p.caption,
          costToCure: p.costToCure,
        }))
      : undefined,
    photoAnalysisConfidence: record.photoAnalysisConfidence,
    totalCostToCure: record.totalCostToCure,

    // Market Data
    marketTrendData: record.marketTrendData ? JSON.parse(record.marketTrendData) : undefined,
    marketConfidence: record.marketConfidence,

    // Comparable Sales
    adjustmentGrid: record.adjustmentGrid ? JSON.parse(record.adjustmentGrid) : undefined,
    comparableConfidence: record.comparableConfidence,
    comparableCount: record.comparableCount,

    // Cost Approach
    costApproachData: record.costApproachData ? JSON.parse(record.costApproachData) : undefined,

    // Income Approach
    incomeApproachData: record.incomeApproachData ? JSON.parse(record.incomeApproachData) : undefined,
  };
}

/**
 * Helper: Validate analysis data completeness
 */
export function validateAnalysisData(data: AnalysisDataForReporting): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.assessedValue) errors.push("Missing assessed value");
  if (!data.propertyType) errors.push("Missing property type");

  // Data quality checks
  if (!data.userPhotos || data.userPhotos.length === 0) {
    warnings.push("No user photos provided");
  }

  if (!data.adjustmentGrid || data.adjustmentGrid.length < 3) {
    warnings.push("Insufficient comparable sales (< 3)");
  }

  if (!data.marketTrendData) {
    warnings.push("No market trend data available");
  }

  if (!data.costApproachData) {
    warnings.push("No cost approach data available");
  }

  if (data.isIncomeProducing && !data.incomeApproachData) {
    warnings.push("Income property but no income approach data");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper: Generate report summary for user
 */
export function generateReportSummary(
  structure: ReturnType<typeof orchestrateReportStructure>,
  analysisData: AnalysisDataForReporting
): string {
  const visibleSections = structure.sections.filter(s => s.visible);
  const sectionNames = visibleSections.map(s => s.title).join("\n  • ");

  return `
📊 Report Generated Successfully

Type: ${structure.reportType.toUpperCase()}
Pages: ~${structure.totalPages}
Primary Approach: ${structure.primaryApproach}

Sections Included:
  • ${sectionNames}

Assessment Gap: ${analysisData.assessedValue ? `$${(analysisData.assessedValue * 0.07).toLocaleString()}` : "N/A"}
`;
}
