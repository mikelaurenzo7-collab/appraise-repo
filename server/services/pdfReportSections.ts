/**
 * Enhanced PDF Report Sections
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders all 6 appraisal methodology phases as professional PDF sections.
 * Integrates into pdfGenerator.ts for comprehensive USPAP-compliant reports.
 */

import PDFKit from "pdfkit";

// ─── Type Definitions ──────────────────────────────────────────────────────

export interface AdjustmentGridEntry {
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
}

export interface CostApproachData {
  landValue: number;
  replacementCostNew: number;
  costPerSquareFoot: number;
  buildingAge: number;
  effectiveAge: number;
  depreciation: number;
  depreciatedBuildingValue: number;
  indicatedValue: number;
  confidence: number;
}

export interface IncomeApproachData {
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
}

export interface MarketTrendData {
  marketCondition: "buyer" | "seller" | "balanced";
  appreciationRate: number;
  seasonalAdjustment: number;
  marketStrength: number;
  dataPoints: string[];
  recommendations: string[];
}

export interface ReconciliationData {
  reconciliationNarrative: string;
  appealStrengthFactors: string[];
  expertObservations: string[];
  approachWeights: {
    salesComparison: number;
    costApproach: number;
    incomeApproach: number;
  };
  confidenceLevel: string;
}

// ─── Color Palette ────────────────────────────────────────────────────────

const NAVY = "#0f172a";
const PURPLE = "#7C3AED";
const PURPLE_DARK = "#5B21B6";
const TEAL = "#0D9488";
const GOLD = "#FBBF24";
const DARK_TEXT = "#0f172a";
const BODY_TEXT = "#334155";
const MUTED = "#64748b";
const LIGHT_BG = "#f5f3ff";
const BORDER = "#ddd6fe";
const WHITE = "#ffffff";
const RED_ACCENT = "#dc2626";
const GREEN_ACCENT = "#16a34a";
const BLUE_ACCENT = "#2563eb";

const LM = 60;
const RM = 60;
const TM = 55;
const BM = 70;

// ─── Formatting Helpers ────────────────────────────────────────────────────

function fmt(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return "$" + val.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtNum(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return val.toLocaleString("en-US");
}

function fmtPct(val: number | null | undefined, decimals = 1): string {
  if (val == null) return "N/A";
  return val.toFixed(decimals) + "%";
}

function fmtPSF(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return "$" + val.toFixed(2) + "/SF";
}

// ─── PDF Section Rendering Functions ────────────────────────────────────────

/**
 * PHASE 1: Advanced Comparable Sales Analysis with Adjustment Grids
 */
export function renderPhase1ComparableSalesAnalysis(
  doc: PDFKit.PDFDocument,
  y: number,
  cw: number,
  adjustmentGrid: AdjustmentGridEntry[] | undefined,
  reportId: string,
  pageCounter: { n: number }
): number {
  if (!adjustmentGrid || adjustmentGrid.length === 0) return y;

  // Helper functions (copied from pdfGenerator context)
  function ensureSpace(needed: number): number {
    const maxY = doc.page.height - BM;
    if (y + needed > maxY) {
      addFooter(doc, reportId, pageCounter.n);
      pageCounter.n++;
      doc.addPage();
      return TM;
    }
    return y;
  }

  function newPage(): number {
    addFooter(doc, reportId, pageCounter.n);
    pageCounter.n++;
    doc.addPage();
    return TM;
  }

  function sectionHeader(title: string): number {
    y = ensureSpace(40);
    doc.fontSize(14).fillColor(PURPLE_DARK).font("Helvetica-Bold")
      .text(title, LM, y, { width: cw });
    y = doc.y + 12;
    doc.rect(LM, y, cw, 2).fill(GOLD);
    y += 8;
    return y;
  }

  function subHeader(title: string): number {
    y = ensureSpace(30);
    doc.fontSize(11).fillColor(NAVY).font("Helvetica-Bold")
      .text(title, LM, y, { width: cw });
    y = doc.y + 8;
    return y;
  }

  function bodyText(text: string): number {
    y = ensureSpace(40);
    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica")
      .text(text, LM, y, { width: cw, lineGap: 3.5 });
    y = doc.y + 8;
    return y;
  }

  function kvTable(rows: [string, string][]): number {
    const labelW = cw * 0.52;
    const valW = cw * 0.48;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (!label && !value) { y += 4; continue; }
      const rowH = 22;
      const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
      doc.rect(LM, y, cw, rowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Bold")
        .text(label, LM + 10, y + 6, { width: labelW - 16, lineBreak: false });
      doc.fontSize(8.5).fillColor(DARK_TEXT).font("Helvetica")
        .text(value, LM + labelW, y + 6, { width: valW - 10, lineBreak: false });
      y += rowH;
    }
    return y + 8;
  }

  // ─── PHASE 1 SECTION ──────────────────────────────────────────────────

  y = newPage();
  y = sectionHeader("PHASE 1: ADVANCED COMPARABLE SALES ANALYSIS");

  y = bodyText(
    `This phase employs a sophisticated comparable sales analysis using multiple comparable properties ` +
    `with detailed quantitative adjustments for physical characteristics, location, condition, and market factors. ` +
    `Each comparable is weighted based on similarity and data quality to derive a reliable sales comparison value.`
  );

  y = subHeader("Adjustment Grid Summary");

  // Summary statistics
  const avgAdjustment = adjustmentGrid.reduce((s, e) => s + e.netAdjustmentPercent, 0) / adjustmentGrid.length;
  const avgConfidence = adjustmentGrid.reduce((s, e) => s + e.confidence, 0) / adjustmentGrid.length;
  const weightedValue = adjustmentGrid.reduce((s, e) => s + (e.adjustedPrice * e.weight), 0) / adjustmentGrid.reduce((s, e) => s + e.weight, 0);

  const summaryRows: [string, string][] = [
    ["Number of Comparables", `${adjustmentGrid.length}`],
    ["Average Net Adjustment", fmtPct(avgAdjustment)],
    ["Average Confidence Score", fmtPct(avgConfidence)],
    ["Weighted Adjusted Value", fmt(Math.round(weightedValue))],
    ["Range of Adjusted Values", `${fmt(Math.min(...adjustmentGrid.map(e => e.adjustedPrice)))} – ${fmt(Math.max(...adjustmentGrid.map(e => e.adjustedPrice)))}`],
  ];
  y = kvTable(summaryRows);

  // Render each comparable's adjustment grid
  for (let i = 0; i < Math.min(adjustmentGrid.length, 3); i++) {
    const comp = adjustmentGrid[i];
    y = ensureSpace(200);

    // Comp header
    doc.rect(LM, y, cw, 20).fill(NAVY);
    doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
      .text(`COMPARABLE ${i + 1}: ${comp.compAddress}`, LM + 10, y + 5, { width: cw - 20 });
    y += 24;

    // Sale price
    doc.rect(LM, y, cw, 18).lineWidth(0.3).fillAndStroke(LIGHT_BG, BORDER);
    doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica-Bold")
      .text("Sale Price", LM + 8, y + 4, { width: cw * 0.6 });
    doc.fontSize(8).fillColor(DARK_TEXT).font("Helvetica-Bold")
      .text(fmt(comp.compSalePrice), LM + cw * 0.6, y + 4, { width: cw * 0.4 - 8 });
    y += 18;

    // Adjustments
    const adjustmentKeys = Object.keys(comp.adjustments);
    for (const key of adjustmentKeys) {
      const adj = comp.adjustments[key];
      const bg = adjustmentKeys.indexOf(key) % 2 === 0 ? WHITE : LIGHT_BG;
      doc.rect(LM, y, cw, 18).lineWidth(0.3).fillAndStroke(bg, BORDER);

      const keyLabel = key.replace(/([A-Z])/g, " $1").trim();
      doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica")
        .text(keyLabel, LM + 8, y + 4, { width: cw * 0.4 });

      const adjColor = adj.percent > 0 ? GREEN_ACCENT : adj.percent < 0 ? RED_ACCENT : BODY_TEXT;
      const adjStr = adj.percent > 0 ? `+${adj.percent.toFixed(1)}%` : `${adj.percent.toFixed(1)}%`;
      doc.fontSize(8).fillColor(adjColor).font("Helvetica-Bold")
        .text(adjStr, LM + cw * 0.4, y + 4, { width: cw * 0.3 });

      const dollarStr = adj.dollars > 0 ? `+${fmt(adj.dollars)}` : fmt(adj.dollars);
      doc.fontSize(8).fillColor(adjColor).font("Helvetica")
        .text(dollarStr, LM + cw * 0.7, y + 4, { width: cw * 0.3 - 8 });
      y += 18;
    }

    // Net adjustment and adjusted price
    y += 2;
    doc.rect(LM, y, cw, 20).lineWidth(0.5).fillAndStroke(LIGHT_BG, PURPLE);
    doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold")
      .text("Net Adjustment", LM + 8, y + 5, { width: cw * 0.6 });
    doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold")
      .text(fmtPct(comp.netAdjustmentPercent), LM + cw * 0.6, y + 5, { width: cw * 0.4 - 8 });
    y += 20;

    doc.rect(LM, y, cw, 22).lineWidth(1).fillAndStroke(PURPLE_DARK, PURPLE);
    doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
      .text("ADJUSTED VALUE", LM + 8, y + 6, { width: cw * 0.6 });
    doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
      .text(fmt(comp.adjustedPrice), LM + cw * 0.6, y + 6, { width: cw * 0.4 - 8 });
    y += 28;
  }

  return y;
}

/**
 * PHASE 2: Cost Approach Implementation
 */
export function renderPhase2CostApproach(
  doc: PDFKit.PDFDocument,
  y: number,
  cw: number,
  costData: CostApproachData | undefined,
  reportId: string,
  pageCounter: { n: number }
): number {
  if (!costData) return y;

  function ensureSpace(needed: number): number {
    const maxY = doc.page.height - BM;
    if (y + needed > maxY) {
      addFooter(doc, reportId, pageCounter.n);
      pageCounter.n++;
      doc.addPage();
      return TM;
    }
    return y;
  }

  function newPage(): number {
    addFooter(doc, reportId, pageCounter.n);
    pageCounter.n++;
    doc.addPage();
    return TM;
  }

  function sectionHeader(title: string): number {
    y = ensureSpace(40);
    doc.fontSize(14).fillColor(PURPLE_DARK).font("Helvetica-Bold")
      .text(title, LM, y, { width: cw });
    y = doc.y + 12;
    doc.rect(LM, y, cw, 2).fill(GOLD);
    y += 8;
    return y;
  }

  function bodyText(text: string): number {
    y = ensureSpace(40);
    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica")
      .text(text, LM, y, { width: cw, lineGap: 3.5 });
    y = doc.y + 8;
    return y;
  }

  function kvTable(rows: [string, string][]): number {
    const labelW = cw * 0.52;
    const valW = cw * 0.48;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (!label && !value) { y += 4; continue; }
      const rowH = 22;
      const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
      doc.rect(LM, y, cw, rowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Bold")
        .text(label, LM + 10, y + 6, { width: labelW - 16, lineBreak: false });
      doc.fontSize(8.5).fillColor(DARK_TEXT).font("Helvetica")
        .text(value, LM + labelW, y + 6, { width: valW - 10, lineBreak: false });
      y += rowH;
    }
    return y + 8;
  }

  // ─── PHASE 2 SECTION ──────────────────────────────────────────────────

  y = newPage();
  y = sectionHeader("PHASE 2: COST APPROACH");

  y = bodyText(
    `The Cost Approach estimates value by calculating the current cost to construct a replacement structure, ` +
    `less all forms of depreciation (physical, functional, and external), plus land value. ` +
    `This approach provides a useful check against the sales comparison approach and is particularly relevant for newer properties.`
  );

  const costRows: [string, string][] = [
    ["Estimated Land Value", fmt(costData.landValue)],
    ["Replacement Cost New (Improvements)", fmt(costData.replacementCostNew)],
    ["Cost per Square Foot", fmtPSF(costData.costPerSquareFoot)],
    ["Building Age", `${costData.buildingAge} years`],
    ["Effective Age", `${costData.effectiveAge} years`],
    ["Total Depreciation", fmt(costData.depreciation)],
    ["Depreciation Rate", fmtPct((costData.depreciation / costData.replacementCostNew) * 100)],
    ["Depreciated Building Value", fmt(costData.depreciatedBuildingValue)],
    ["", ""],
    ["COST APPROACH INDICATED VALUE", fmt(costData.indicatedValue)],
    ["Confidence Level", fmtPct(costData.confidence)],
  ];
  y = kvTable(costRows);

  y = bodyText(
    `The depreciation analysis reflects physical deterioration based on the property's effective age and condition, ` +
    `functional obsolescence related to design and utility, and external obsolescence from market and neighborhood factors. ` +
    `The cost approach value of ${fmt(costData.indicatedValue)} provides important corroboration for the final value opinion.`
  );

  return y;
}

/**
 * PHASE 3: Income Approach for Rental Properties
 */
export function renderPhase3IncomeApproach(
  doc: PDFKit.PDFDocument,
  y: number,
  cw: number,
  incomeData: IncomeApproachData | undefined,
  reportId: string,
  pageCounter: { n: number }
): number {
  if (!incomeData) return y;

  function ensureSpace(needed: number): number {
    const maxY = doc.page.height - BM;
    if (y + needed > maxY) {
      addFooter(doc, reportId, pageCounter.n);
      pageCounter.n++;
      doc.addPage();
      return TM;
    }
    return y;
  }

  function newPage(): number {
    addFooter(doc, reportId, pageCounter.n);
    pageCounter.n++;
    doc.addPage();
    return TM;
  }

  function sectionHeader(title: string): number {
    y = ensureSpace(40);
    doc.fontSize(14).fillColor(PURPLE_DARK).font("Helvetica-Bold")
      .text(title, LM, y, { width: cw });
    y = doc.y + 12;
    doc.rect(LM, y, cw, 2).fill(GOLD);
    y += 8;
    return y;
  }

  function bodyText(text: string): number {
    y = ensureSpace(40);
    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica")
      .text(text, LM, y, { width: cw, lineGap: 3.5 });
    y = doc.y + 8;
    return y;
  }

  function kvTable(rows: [string, string][]): number {
    const labelW = cw * 0.52;
    const valW = cw * 0.48;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (!label && !value) { y += 4; continue; }
      const rowH = 22;
      const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
      doc.rect(LM, y, cw, rowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Bold")
        .text(label, LM + 10, y + 6, { width: labelW - 16, lineBreak: false });
      doc.fontSize(8.5).fillColor(DARK_TEXT).font("Helvetica")
        .text(value, LM + labelW, y + 6, { width: valW - 10, lineBreak: false });
      y += rowH;
    }
    return y + 8;
  }

  // ─── PHASE 3 SECTION ──────────────────────────────────────────────────

  y = newPage();
  y = sectionHeader("PHASE 3: INCOME CAPITALIZATION APPROACH");

  y = bodyText(
    `The Income Capitalization Approach is applicable to income-producing properties. ` +
    `This approach estimates value based on the net operating income (NOI) the property generates, ` +
    `capitalized at an appropriate rate derived from comparable income-producing properties.`
  );

  const incomeRows: [string, string][] = [
    ["Gross Potential Income", fmt(incomeData.grossPotentialIncome)],
    ["Vacancy Rate", fmtPct(incomeData.vacancyRate)],
    ["Vacancy Loss", fmt(incomeData.vacancyLoss)],
    ["Effective Gross Income", fmt(incomeData.effectiveGrossIncome)],
    ["", ""],
    ["Operating Expense Ratio", fmtPct(incomeData.operatingExpenseRatio)],
    ["Operating Expenses", fmt(incomeData.operatingExpenses)],
    ["Net Operating Income", fmt(incomeData.netOperatingIncome)],
    ["", ""],
    ["Capitalization Rate", fmtPct(incomeData.capitalizationRate)],
    ["Income Approach Value", fmt(incomeData.incomeApproachValue)],
    ["Reconciled Value", fmt(incomeData.reconciledValue)],
    ["Confidence Level", fmtPct(incomeData.confidence)],
  ];
  y = kvTable(incomeRows);

  y = bodyText(
    `The capitalization rate of ${fmtPct(incomeData.capitalizationRate)} was derived from analysis of comparable ` +
    `income-producing properties in the subject's market area. The income approach value of ${fmt(incomeData.reconciledValue)} ` +
    `represents the present value of the income stream the property generates.`
  );

  return y;
}

/**
 * PHASE 5: Market Trend Analysis
 */
export function renderPhase5MarketTrends(
  doc: PDFKit.PDFDocument,
  y: number,
  cw: number,
  marketData: MarketTrendData | undefined,
  reportId: string,
  pageCounter: { n: number }
): number {
  if (!marketData) return y;

  function ensureSpace(needed: number): number {
    const maxY = doc.page.height - BM;
    if (y + needed > maxY) {
      addFooter(doc, reportId, pageCounter.n);
      pageCounter.n++;
      doc.addPage();
      return TM;
    }
    return y;
  }

  function newPage(): number {
    addFooter(doc, reportId, pageCounter.n);
    pageCounter.n++;
    doc.addPage();
    return TM;
  }

  function sectionHeader(title: string): number {
    y = ensureSpace(40);
    doc.fontSize(14).fillColor(PURPLE_DARK).font("Helvetica-Bold")
      .text(title, LM, y, { width: cw });
    y = doc.y + 12;
    doc.rect(LM, y, cw, 2).fill(GOLD);
    y += 8;
    return y;
  }

  function bodyText(text: string): number {
    y = ensureSpace(40);
    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica")
      .text(text, LM, y, { width: cw, lineGap: 3.5 });
    y = doc.y + 8;
    return y;
  }

  function kvTable(rows: [string, string][]): number {
    const labelW = cw * 0.52;
    const valW = cw * 0.48;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (!label && !value) { y += 4; continue; }
      const rowH = 22;
      const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
      doc.rect(LM, y, cw, rowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Bold")
        .text(label, LM + 10, y + 6, { width: labelW - 16, lineBreak: false });
      doc.fontSize(8.5).fillColor(DARK_TEXT).font("Helvetica")
        .text(value, LM + labelW, y + 6, { width: valW - 10, lineBreak: false });
      y += rowH;
    }
    return y + 8;
  }

  // ─── PHASE 5 SECTION ──────────────────────────────────────────────────

  y = newPage();
  y = sectionHeader("PHASE 5: MARKET TREND ANALYSIS");

  y = bodyText(
    `Market trend analysis examines the broader economic and real estate market conditions affecting the subject property's value. ` +
    `This includes appreciation/depreciation rates, market strength, seasonal adjustments, and absorption rates. ` +
    `These factors are reflected in the comparable sales adjustments and the final value reconciliation.`
  );

  const marketRows: [string, string][] = [
    ["Market Condition", marketData.marketCondition.charAt(0).toUpperCase() + marketData.marketCondition.slice(1) + "'s Market"],
    ["Annual Appreciation Rate", fmtPct(marketData.appreciationRate)],
    ["Seasonal Adjustment", fmtPct(marketData.seasonalAdjustment)],
    ["Market Strength Index", fmtPct(marketData.marketStrength)],
  ];
  y = kvTable(marketRows);

  if (marketData.dataPoints && marketData.dataPoints.length > 0) {
    y = ensureSpace(60);
    doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
      .text("Market Data Points:", LM, y, { width: cw });
    y = doc.y + 8;

    for (const point of marketData.dataPoints.slice(0, 5)) {
      y = ensureSpace(20);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`• ${point}`, LM + 12, y, { width: cw - 24 });
      y = doc.y + 4;
    }
  }

  if (marketData.recommendations && marketData.recommendations.length > 0) {
    y = ensureSpace(60);
    doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
      .text("Market Recommendations:", LM, y, { width: cw });
    y = doc.y + 8;

    for (const rec of marketData.recommendations.slice(0, 3)) {
      y = ensureSpace(20);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`• ${rec}`, LM + 12, y, { width: cw - 24 });
      y = doc.y + 4;
    }
  }

  return y;
}

/**
 * PHASE 6: Expert-Level Reconciliation & Narrative
 */
export function renderPhase6Reconciliation(
  doc: PDFKit.PDFDocument,
  y: number,
  cw: number,
  reconciliationData: ReconciliationData | undefined,
  reportId: string,
  pageCounter: { n: number }
): number {
  if (!reconciliationData) return y;

  function ensureSpace(needed: number): number {
    const maxY = doc.page.height - BM;
    if (y + needed > maxY) {
      addFooter(doc, reportId, pageCounter.n);
      pageCounter.n++;
      doc.addPage();
      return TM;
    }
    return y;
  }

  function newPage(): number {
    addFooter(doc, reportId, pageCounter.n);
    pageCounter.n++;
    doc.addPage();
    return TM;
  }

  function sectionHeader(title: string): number {
    y = ensureSpace(40);
    doc.fontSize(14).fillColor(PURPLE_DARK).font("Helvetica-Bold")
      .text(title, LM, y, { width: cw });
    y = doc.y + 12;
    doc.rect(LM, y, cw, 2).fill(GOLD);
    y += 8;
    return y;
  }

  function bodyText(text: string): number {
    y = ensureSpace(40);
    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica")
      .text(text, LM, y, { width: cw, lineGap: 3.5 });
    y = doc.y + 8;
    return y;
  }

  function kvTable(rows: [string, string][]): number {
    const labelW = cw * 0.52;
    const valW = cw * 0.48;
    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];
      if (!label && !value) { y += 4; continue; }
      const rowH = 22;
      const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
      doc.rect(LM, y, cw, rowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Bold")
        .text(label, LM + 10, y + 6, { width: labelW - 16, lineBreak: false });
      doc.fontSize(8.5).fillColor(DARK_TEXT).font("Helvetica")
        .text(value, LM + labelW, y + 6, { width: valW - 10, lineBreak: false });
      y += rowH;
    }
    return y + 8;
  }

  // ─── PHASE 6 SECTION ──────────────────────────────────────────────────

  y = newPage();
  y = sectionHeader("PHASE 6: RECONCILIATION & FINAL VALUE OPINION");

  y = bodyText(reconciliationData.reconciliationNarrative);

  // Approach weights
  y = ensureSpace(60);
  doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
    .text("Approach Weighting:", LM, y, { width: cw });
  y = doc.y + 8;

  const weightRows: [string, string][] = [
    ["Sales Comparison Approach Weight", fmtPct(reconciliationData.approachWeights.salesComparison)],
    ["Cost Approach Weight", fmtPct(reconciliationData.approachWeights.costApproach)],
    ["Income Approach Weight", fmtPct(reconciliationData.approachWeights.incomeApproach)],
    ["Confidence Level", reconciliationData.confidenceLevel],
  ];
  y = kvTable(weightRows);

  // Appeal strength factors
  if (reconciliationData.appealStrengthFactors && reconciliationData.appealStrengthFactors.length > 0) {
    y = ensureSpace(60);
    doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
      .text("Appeal Strength Factors:", LM, y, { width: cw });
    y = doc.y + 8;

    for (const factor of reconciliationData.appealStrengthFactors.slice(0, 8)) {
      y = ensureSpace(20);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`✓ ${factor}`, LM + 12, y, { width: cw - 24 });
      y = doc.y + 4;
    }
  }

  // Expert observations
  if (reconciliationData.expertObservations && reconciliationData.expertObservations.length > 0) {
    y = ensureSpace(60);
    doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
      .text("Expert Observations:", LM, y, { width: cw });
    y = doc.y + 8;

    for (const obs of reconciliationData.expertObservations.slice(0, 5)) {
      y = ensureSpace(20);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`• ${obs}`, LM + 12, y, { width: cw - 24 });
      y = doc.y + 4;
    }
  }

  return y;
}

// ─── Helper function (stub for footer) ────────────────────────────────────

function addFooter(doc: PDFKit.PDFDocument, reportId: string, pageNum: number): void {
  const y = doc.page.height - 40;
  doc.fontSize(7).fillColor(MUTED).font("Helvetica")
    .text(`${reportId} | Page ${pageNum}`, LM, y, { width: doc.page.width - LM - RM, align: "center" });
}
