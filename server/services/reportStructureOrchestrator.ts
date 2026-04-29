/**
 * Report Structure Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Intelligently orchestrates the report flow, determining which sections to
 * include based on data availability and confidence levels. Implements the
 * strategic evidence-methodology flow.
 */

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  visible: boolean;
  confidence: number;
  reason?: string; // Why section is hidden
}

export interface ReportStructure {
  sections: ReportSection[];
  totalPages: number;
  hasUserEvidence: boolean;
  hasMultipleApproaches: boolean;
  primaryApproach: string;
  reportType: "simple" | "standard" | "comprehensive";
}

export interface AnalysisDataForReporting {
  // User Evidence
  userPhotos?: Array<{ url: string; caption: string; costToCure?: number }>;
  photoAnalysisConfidence?: number;
  totalCostToCure?: number;

  // Market Data
  marketTrendData?: {
    marketCondition: string;
    appreciationRate: number;
    dataPoints: string[];
  };
  marketConfidence?: number;

  // Comparable Sales
  adjustmentGrid?: Array<{
    compAddress: string;
    adjustedPrice: number;
    confidence: number;
  }>;
  comparableConfidence?: number;
  comparableCount?: number;

  // Cost Approach
  costApproachData?: {
    indicatedValue: number;
    confidence: number;
  };

  // Income Approach
  incomeApproachData?: {
    reconciledValue: number;
    confidence: number;
  };

  // Assessment Info
  assessedValue: number;
  propertyType: string;
  isIncomeProducing?: boolean;
}

// ─── SECTION DEFINITIONS ──────────────────────────────────────────────────────

const REPORT_SECTIONS = {
  EXECUTIVE_SUMMARY: {
    id: "executive_summary",
    title: "Executive Summary & Overview",
    order: 1,
    alwaysShow: true,
    minConfidence: 0,
  },
  USER_EVIDENCE: {
    id: "user_evidence",
    title: "User-Provided Evidence & Photo Analysis",
    order: 2,
    alwaysShow: false,
    minConfidence: 0.5,
    requiresData: ["userPhotos"],
  },
  MARKET_CONTEXT: {
    id: "market_context",
    title: "Market Context & Trends",
    order: 3,
    alwaysShow: false,
    minConfidence: 0.5,
    requiresData: ["marketTrendData"],
  },
  COMPARABLE_SALES: {
    id: "comparable_sales",
    title: "Comparable Sales Analysis",
    order: 4,
    alwaysShow: false,
    minConfidence: 0.5,
    requiresData: ["adjustmentGrid"],
    minCount: 3,
  },
  COST_APPROACH: {
    id: "cost_approach",
    title: "Cost Approach Valuation",
    order: 5,
    alwaysShow: false,
    minConfidence: 0.4,
    requiresData: ["costApproachData"],
  },
  INCOME_APPROACH: {
    id: "income_approach",
    title: "Income Capitalization Approach",
    order: 6,
    alwaysShow: false,
    minConfidence: 0.4,
    requiresData: ["incomeApproachData"],
    onlyIfIncomeProducing: true,
  },
  RECONCILIATION: {
    id: "reconciliation",
    title: "Reconciliation & Final Value Opinion",
    order: 7,
    alwaysShow: false,
    minConfidence: 0.5,
    requiresMultipleApproaches: true,
  },
  APPEAL_SUMMARY: {
    id: "appeal_summary",
    title: "Appeal Summary & Next Steps",
    order: 8,
    alwaysShow: true,
    minConfidence: 0,
  },
};

// ─── MAIN ORCHESTRATION FUNCTION ──────────────────────────────────────────────

/**
 * Determines which sections to include in the report based on data availability
 * and confidence levels. Returns a structured report plan.
 */
export function orchestrateReportStructure(
  analysisData: AnalysisDataForReporting
): ReportStructure {
  const sections: ReportSection[] = [];
  const sectionKeys = Object.keys(REPORT_SECTIONS) as Array<keyof typeof REPORT_SECTIONS>;

  // Evaluate each section
  for (const key of sectionKeys) {
    const sectionDef = REPORT_SECTIONS[key];
    const evaluation = evaluateSection(sectionDef, analysisData);
    sections.push(evaluation);
  }

  // Sort by order
  sections.sort((a, b) => a.order - b.order);

  // Determine report type
  const visibleSections = sections.filter(s => s.visible);
  const reportType = determineReportType(visibleSections, analysisData);

  // Count approaches
  const approachCount = countValidApproaches(analysisData);

  return {
    sections,
    totalPages: estimatePageCount(visibleSections),
    hasUserEvidence: !!analysisData.userPhotos && analysisData.userPhotos.length > 0,
    hasMultipleApproaches: approachCount >= 2,
    primaryApproach: determinePrimaryApproach(analysisData),
    reportType,
  };
}

// ─── SECTION EVALUATION ────────────────────────────────────────────────────────

function evaluateSection(
  sectionDef: any,
  analysisData: AnalysisDataForReporting
): ReportSection {
  // Always show sections
  if (sectionDef.alwaysShow) {
    return {
      id: sectionDef.id,
      title: sectionDef.title,
      order: sectionDef.order,
      visible: true,
      confidence: 1.0,
    };
  }

  // Check required data
  if (sectionDef.requiresData) {
    for (const dataKey of sectionDef.requiresData) {
      if (!analysisData[dataKey as keyof AnalysisDataForReporting]) {
        return {
          id: sectionDef.id,
          title: sectionDef.title,
          order: sectionDef.order,
          visible: false,
          confidence: 0,
          reason: `Missing required data: ${dataKey}`,
        };
      }
    }
  }

  // Check minimum count
  if (sectionDef.minCount) {
    const dataKey = sectionDef.requiresData?.[0];
    if (dataKey) {
      const data = analysisData[dataKey as keyof AnalysisDataForReporting];
      if (Array.isArray(data) && data.length < sectionDef.minCount) {
        return {
          id: sectionDef.id,
          title: sectionDef.title,
          order: sectionDef.order,
          visible: false,
          confidence: 0,
          reason: `Insufficient data: ${data.length} items, need ${sectionDef.minCount}`,
        };
      }
    }
  }

  // Check income-producing requirement
  if (sectionDef.onlyIfIncomeProducing && !analysisData.isIncomeProducing) {
    return {
      id: sectionDef.id,
      title: sectionDef.title,
      order: sectionDef.order,
      visible: false,
      confidence: 0,
      reason: "Property is not income-producing",
    };
  }

  // Check multiple approaches requirement
  if (sectionDef.requiresMultipleApproaches) {
    const approachCount = countValidApproaches(analysisData);
    if (approachCount < 2) {
      return {
        id: sectionDef.id,
        title: sectionDef.title,
        order: sectionDef.order,
        visible: false,
        confidence: 0,
        reason: `Only ${approachCount} approach(es) available, need 2+`,
      };
    }
  }

  // Check confidence level
  const confidence = getConfidenceForSection(sectionDef.id, analysisData);
  if (confidence < sectionDef.minConfidence) {
    return {
      id: sectionDef.id,
      title: sectionDef.title,
      order: sectionDef.order,
      visible: false,
      confidence,
      reason: `Low confidence: ${(confidence * 100).toFixed(0)}% < ${(sectionDef.minConfidence * 100).toFixed(0)}%`,
    };
  }

  // Section passes all checks
  return {
    id: sectionDef.id,
    title: sectionDef.title,
    order: sectionDef.order,
    visible: true,
    confidence,
  };
}

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function getConfidenceForSection(sectionId: string, data: AnalysisDataForReporting): number {
  switch (sectionId) {
    case "user_evidence":
      return data.photoAnalysisConfidence ?? 0;
    case "market_context":
      return data.marketConfidence ?? 0;
    case "comparable_sales":
      return data.comparableConfidence ?? 0;
    case "cost_approach":
      return data.costApproachData?.confidence ?? 0;
    case "income_approach":
      return data.incomeApproachData?.confidence ?? 0;
    default:
      return 1.0;
  }
}

function countValidApproaches(data: AnalysisDataForReporting): number {
  let count = 0;
  if (data.adjustmentGrid && data.adjustmentGrid.length >= 3) count++;
  if (data.costApproachData && data.costApproachData.indicatedValue > 0) count++;
  if (data.incomeApproachData && data.incomeApproachData.reconciledValue > 0) count++;
  return count;
}

function determinePrimaryApproach(data: AnalysisDataForReporting): string {
  // For residential with good comps, sales comparison is primary
  if (data.adjustmentGrid && data.adjustmentGrid.length >= 3 && !data.isIncomeProducing) {
    return "Sales Comparison";
  }

  // For income properties, income approach is primary
  if (data.isIncomeProducing && data.incomeApproachData) {
    return "Income Approach";
  }

  // For limited data, cost approach
  if (data.costApproachData) {
    return "Cost Approach";
  }

  return "Multiple Approaches";
}

function determineReportType(
  sections: ReportSection[],
  data: AnalysisDataForReporting
): "simple" | "standard" | "comprehensive" {
  const visibleCount = sections.filter(s => s.visible).length;

  if (visibleCount <= 3) {
    return "simple";
  } else if (visibleCount <= 5) {
    return "standard";
  } else {
    return "comprehensive";
  }
}

function estimatePageCount(sections: ReportSection[]): number {
  // Base: 2 pages for cover/executive summary
  let pages = 2;

  for (const section of sections) {
    switch (section.id) {
      case "user_evidence":
        pages += 2; // Photos take space
        break;
      case "market_context":
        pages += 1;
        break;
      case "comparable_sales":
        pages += 3; // Adjustment grids take space
        break;
      case "cost_approach":
        pages += 2;
        break;
      case "income_approach":
        pages += 2;
        break;
      case "reconciliation":
        pages += 2;
        break;
      case "appeal_summary":
        pages += 1;
        break;
    }
  }

  return pages;
}

// ─── TABLE OF CONTENTS GENERATION ──────────────────────────────────────────────

export function generateTableOfContents(
  structure: ReportStructure,
  pageMap: Map<string, number>
): string {
  const toc: string[] = ["TABLE OF CONTENTS\n"];

  let pageNumber = 1;
  for (const section of structure.sections) {
    if (section.visible) {
      toc.push(`${section.title.padEnd(50)} Page ${pageNumber}`);
      pageNumber += estimateSectionPages(section.id);
    }
  }

  return toc.join("\n");
}

function estimateSectionPages(sectionId: string): number {
  const pageEstimates: Record<string, number> = {
    executive_summary: 1,
    user_evidence: 2,
    market_context: 1,
    comparable_sales: 3,
    cost_approach: 2,
    income_approach: 2,
    reconciliation: 2,
    appeal_summary: 1,
  };
  return pageEstimates[sectionId] || 1;
}

// ─── VISIBILITY FLAGS FOR PDF RENDERING ────────────────────────────────────────

export function getSectionVisibilityFlags(structure: ReportStructure): Record<string, boolean> {
  const flags: Record<string, boolean> = {};

  for (const section of structure.sections) {
    flags[section.id] = section.visible;
  }

  return flags;
}

// ─── REPORTING FUNCTIONS ──────────────────────────────────────────────────────

export function logReportStructure(structure: ReportStructure, reportId: string): void {
  console.log(`\n[ReportStructure] Report ${reportId}`);
  console.log(`  Type: ${structure.reportType}`);
  console.log(`  Estimated Pages: ${structure.totalPages}`);
  console.log(`  Primary Approach: ${structure.primaryApproach}`);
  console.log(`  Multiple Approaches: ${structure.hasMultipleApproaches}`);
  console.log(`  User Evidence: ${structure.hasUserEvidence}`);
  console.log(`\n  Sections:`);

  for (const section of structure.sections) {
    const status = section.visible ? "✓ SHOW" : "✗ HIDE";
    const confidence = section.visible ? `(${(section.confidence * 100).toFixed(0)}%)` : `(${section.reason})`;
    console.log(`    ${status} - ${section.title} ${confidence}`);
  }

  console.log("");
}
