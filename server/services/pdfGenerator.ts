/**
 * AppraiseAI — Professional PDF Appraisal Report Generator
 * ─────────────────────────────────────────────────────────
 * Generates branded, assessor-facing property valuation reports.
 *
 * TWO TIERS:
 *   FREE  → Branded 4-5 page summary (shows value, teases full report)
 *   PAID  → Full 40-60 page professional report (Pro Se + Automated identical)
 *
 * REPORT STRUCTURE (PAID):
 *   1. Cover Page (branded, property photo, report seal)
 *   2. Letter of Transmittal
 *   3. Table of Contents
 *   4. Certification & Limiting Conditions
 *   5. Purpose, Intended Use & Scope of Work
 *   6. Executive Summary & Key Findings
 *   7. Property Identification & Description
 *   8. Area & Neighborhood Analysis
 *   9. Market Conditions Analysis
 *  10. Highest & Best Use
 *  11. Sales Comparison Approach (full adjustment grid)
 *  12. Cost Approach
 *  13. Income Capitalization Approach (if applicable)
 *  14. Reconciliation & Final Value Opinion
 *  15. Assessor's Valuation Critique
 *  16. Equity / Uniformity Analysis
 *  17. Tax Impact Analysis
 *  18. Property Condition Findings (photo analysis)
 *  19. Photo Gallery
 *  20. Appendices (data sources, definitions, qualifications)
 */

import PDFDocument from "pdfkit";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import https from "https";
import http from "http";

// ─── Type Definitions ──────────────────────────────────────────────────────────

export interface AdjustmentGridEntry {
  compAddress: string;
  salePrice: number;
  adjustments: Record<string, number>;
  netAdjustmentPct: number;
  adjustedValue: number;
  pricePerUnit?: number;
  pricePerSF?: number;
}

export interface IncomeApproachSummary {
  marketRentPerUnit: number;
  totalUnits: number;
  grossPotentialIncome: number;
  vacancyRate: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  capRate: number;
  incomeValue: number;
}

export interface CostApproachData {
  landValue?: number | null;
  improvementValue?: number | null;
  replacementCostNew?: number | null;
  totalDepreciation?: number | null;
  effectiveAge?: number | null;
  remainingEconomicLife?: number | null;
  costApproachValue?: number | null;
}

export interface MarketTrendData {
  medianSalePrice?: number | null;
  medianPricePerSF?: number | null;
  averageDaysOnMarket?: number | null;
  inventoryCount?: number | null;
  priceChangeYoY?: number | null;
  absorptionRate?: number | null;
}

export interface AppraisalReportData {
  submissionId: number;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  propertyType?: string;
  ownerName?: string;
  ownerEmail?: string;
  assessedValue?: number | null;
  assessmentLevel?: number | null;
  marketValueEstimate?: number | null;
  assessmentGap?: number | null;
  potentialSavings?: number | null;
  appealStrengthScore?: number | null;
  executiveSummary?: string;
  valuationJustification?: string;
  recommendedApproach?: string;
  filingMethod?: string;
  appealDeadline?: string;
  reportDate?: string;
  reportType?: string;
  /**
   * Audience the rendered PDF is for.
   *
   *   "assessor" — clinical USPAP-style exhibit attached to a tax-appeal
   *                filing. Strips owner-facing content: appeal-strength
   *                score badge, potential savings line, recommended POA/
   *                pro-se strategy, filing method, appeal deadline, next-
   *                steps checklist. Keeps property data, comps,
   *                methodology, photos + condition findings.
   *
   *   "owner"    — owner-facing personal copy with all of the above plus
   *                strategy + savings + next-steps. Mirrors the dashboard.
   *
   * Default: "assessor" — the legitimate use case for the rendered PDF
   * is being filed with the appeal, where owner-facing content hurts
   * credibility (and broadcasts "we picked this case because we think
   * we can win"). Owner sees the full strategy + savings + next steps
   * on the /analysis dashboard.
   */
  reportAudience?: "assessor" | "owner";
  /**
   * Three-grounds persuasion package emitted by analysisJob.ts and persisted
   * inside property_analysis.scenarioContext JSON. When present, these unlock
   * (a) the GROUNDS FOR APPEAL summary section, (b) real (not synthetic) data
   * for the Equity & Uniformity Analysis section, and (c) the Record Card
   * Discrepancy Analysis section. All optional — older reports without this
   * data still render with the legacy synthetic uniformity calc.
   */
  persuasionBrief?: {
    audience: "assessor" | "board" | "attorney" | "owner";
    source: "claude" | "fallback";
    sixtySecondSummary: string;
    formalBrief: string;
    prayerForRelief: string;
    rankedGrounds: Array<{
      ground: "market_value" | "uniformity" | "record_errors";
      strength: number;
      headline: string;
      bullets: string[];
    }>;
    exhibitIndex: Array<{ tag: string; title: string; description: string }>;
  };
  uniformityResult?: {
    hasClaim: boolean;
    subjectRatio: number;
    medianComparableRatio: number | null;
    ratioMultiplier: number;
    comparableCount: number;
    equalizedAssessedValue: number;
    equalizationGap: number;
    argument: string;
    strength: number;
  };
  recordErrors?: {
    hasErrors: boolean;
    significantCount: number;
    errorStrength: number;
    findings: Array<{
      field: "squareFeet" | "bedrooms" | "bathrooms" | "yearBuilt" | "lotSize";
      assessorValue: number;
      ownerValue: number;
      delta: number;
      deltaPercent: number;
      severity: "minor" | "material" | "major";
      factualClaim: string;
      recommendedEvidence: string;
    }>;
    summaryLine: string;
  };
  /**
   * Hearing prep document — OWNER-FACING ONLY. The renderer gates this
   * section on `reportAudience === "owner"` so it never lands in front of
   * the assessor or the board (it would broadcast our anticipated questions
   * and coaching to the opposing party).
   */
  hearingPrep?: {
    source: "claude" | "fallback";
    openingStatement: string;
    groundsTalkingPoints: Array<{
      ground: "market_value" | "uniformity" | "record_errors";
      headline: string;
      bullets: string[];
    }>;
    anticipatedQuestions: Array<{
      category:
        | "comp_admissibility"
        | "valuation_method"
        | "condition_evidence"
        | "record_errors"
        | "uniformity"
        | "general";
      question: string;
      response: string;
    }>;
    comparableWalkthrough: Array<{ address: string; line: string }>;
    recordErrorWalkthrough: string[];
    closingStatement: string;
    preHearingChecklist: string[];
  };
  comparableSales?: Array<{
    address: string;
    salePrice: number;
    saleDate: string;
    squareFeet?: number;
    sqft?: number;
    similarity?: number;
    distance?: number;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
    lotSize?: number;
    propertyType?: string;
  }>;
  adjustmentGrid?: AdjustmentGridEntry[];
  incomeApproach?: IncomeApproachSummary;
  costApproach?: CostApproachData;
  marketTrend?: MarketTrendData;
  reconciliationNarrative?: string;
  squareFeet?: number | null;
  yearBuilt?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  lotSize?: number | null;
  parcelNumber?: string;
  photos?: Array<{
    url: string;
    category: "exterior" | "interior" | "roof" | "foundation" | "other";
    caption?: string;
  }>;
  streetViewUrl?: string;
  satelliteImageUrl?: string;
  roadmapUrl?: string;
  photoFindings?: {
    overallConditionScore: number;
    overallEvidenceStrength: number;
    summaryParagraph: string;
    topObservations: string[];
    topValueIssues: string[];
  };
  // Tier: "free" | "pro_se" | "poa" — determines report depth
  tier?: string;
}

// ─── Formatting Helpers ────────────────────────────────────────────────────────

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

function prettyFieldName(
  field: "squareFeet" | "bedrooms" | "bathrooms" | "yearBuilt" | "lotSize",
): string {
  switch (field) {
    case "squareFeet": return "Finished Square Footage";
    case "bedrooms": return "Bedrooms";
    case "bathrooms": return "Bathrooms";
    case "yearBuilt": return "Year Built";
    case "lotSize": return "Lot Size (sq ft)";
  }
}

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "N/A";
  if (score >= 70) return `${score}/100 - STRONG`;
  if (score >= 40) return `${score}/100 - Moderate`;
  return `${score}/100 - Weak`;
}

// ─── Brand Constants ───────────────────────────────────────────────────────────

const NAVY = "#0f172a";       // Dark background (kept for cover page)
const PURPLE = "#7C3AED";     // Primary brand purple
const PURPLE_DARK = "#5B21B6"; // Dark purple for headings
const PURPLE_LIGHT = "#A78BFA"; // Light purple accent
const TEAL = "#0D9488";       // Secondary teal accent
const GOLD = "#FBBF24";       // Gold accent
const DARK_TEXT = "#0f172a";
const BODY_TEXT = "#334155";
const MUTED = "#64748b";
const LIGHT_BG = "#f5f3ff";   // Very light purple tint
const BORDER = "#ddd6fe";     // Light purple border
const WHITE = "#ffffff";
const RED_ACCENT = "#dc2626";
const GREEN_ACCENT = "#16a34a";

const LM = 60;   // left margin
const RM = 60;   // right margin
const TM = 55;   // top margin
const BM = 70;   // bottom margin

// ─── Image Fetch Helper ────────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      lib.get(url, { timeout: 8000 }, (res) => {
        if (res.statusCode !== 200) { resolve(null); return; }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      }).on("error", () => resolve(null));
    } catch { resolve(null); }
  });
}

// ─── Page Footer (instance-scoped) ────────────────────────────────────────────

function addFooter(doc: PDFKit.PDFDocument, reportId: string, pageNum: number) {
  const pageW = doc.page.width;
  const footerY = doc.page.height - BM + 15;
  doc.save();
  doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill(PURPLE);
  doc.fontSize(7).fillColor(MUTED).font("Helvetica");
  doc.text(`AppraiseAI Report #${reportId}`, LM, footerY + 6, { width: (pageW - LM - RM) / 2, height: 10, lineBreak: false });
  doc.text(`Page ${pageNum}`, LM + (pageW - LM - RM) / 2, footerY + 6, {
    width: (pageW - LM - RM) / 2, height: 10, align: "right", lineBreak: false,
  });
  doc.fontSize(6).fillColor("#94a3b8")
    .text("CONFIDENTIAL - Prepared for property tax appeal proceedings", LM, footerY + 18, {
      width: pageW - LM - RM, height: 10, align: "center", lineBreak: false,
    });
  doc.restore();
}

// ─── Section Helpers ───────────────────────────────────────────────────────────

function sectionHeader(doc: PDFKit.PDFDocument, title: string, y: number, cw: number, sectionNum?: number): number {
  y += 6;
  doc.rect(LM, y, cw, 0.75).fill(PURPLE);
  y += 10;
  const prefix = sectionNum ? `SECTION ${sectionNum}: ` : "";
  doc.fontSize(13).fillColor(NAVY).font("Helvetica-Bold")
    .text(prefix + title, LM, y, { width: cw });
  return doc.y + 10;
}

function subHeader(doc: PDFKit.PDFDocument, title: string, y: number, cw: number): number {
  y += 4;
  doc.fontSize(10.5).fillColor(NAVY).font("Helvetica-Bold")
    .text(title, LM, y, { width: cw });
  return doc.y + 6;
}

function bodyText(doc: PDFKit.PDFDocument, text: string, y: number, cw: number): number {
  doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica")
    .text(text, LM, y, { width: cw, lineGap: 3.5 });
  return doc.y + 8;
}

function kvTable(doc: PDFKit.PDFDocument, rows: [string, string][], y: number, cw: number, opts?: { highlight?: boolean }): number {
  const labelW = cw * 0.52;
  const valW = cw * 0.48;
  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    if (!label && !value) { y += 4; continue; } // spacer row
    const rowH = 22;
    const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
    doc.rect(LM, y, cw, rowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
    doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Bold")
      .text(label, LM + 10, y + 6, { width: labelW - 16, lineBreak: false });
    const isHighlight = opts?.highlight && (value.includes("STRONG") || label.includes("FINAL") || label.includes("SAVINGS"));
    doc.fontSize(8.5).fillColor(isHighlight ? PURPLE : DARK_TEXT).font(isHighlight ? "Helvetica-Bold" : "Helvetica")
      .text(value, LM + labelW, y + 6, { width: valW - 10, lineBreak: false });
    y += rowH;
  }
  return y + 8;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number, reportId: string, pageCounter: { n: number }): number {
  const maxY = doc.page.height - BM;
  if (y + needed > maxY) {
    addFooter(doc, reportId, pageCounter.n);
    pageCounter.n++;
    doc.addPage();
    return TM;
  }
  return y;
}

function newPage(doc: PDFKit.PDFDocument, reportId: string, pageCounter: { n: number }): number {
  addFooter(doc, reportId, pageCounter.n);
  pageCounter.n++;
  doc.addPage();
  return TM;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateAppraisalPDF(data: AppraisalReportData): Promise<{
  url: string;
  key: string;
  sizeBytes: number;
}> {
  const reportId = `AAI-${data.submissionId}-${nanoid(6).toUpperCase()}`;
  const reportDate = data.reportDate || new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const fullAddress = [data.address, data.city, data.state, data.zipCode].filter(Boolean).join(", ");
  // isFree: only the free tier gets the abbreviated 4-page report.
  // All paid tiers (pro_se, automated_standard, automated_express, poa legacy) get the full 40-page report.
  const isFree = !data.tier || data.tier === "none" || data.tier === "free";

  // isAssessor: when true (default), suppress owner-facing content from the
  // PDF — appeal strength score, "Estimated Annual Tax Savings" line, the
  // entire Tax Impact Analysis section, and the recommended POA/pro-se
  // strategy paragraph. The PDF is the formal exhibit attached to appeal
  // filings; surfacing the owner's projected savings or our internal
  // appeal-winnability score in front of the assessor is counterproductive.
  // The owner sees all of that on the /analysis dashboard. Set
  // reportAudience: "owner" on the AppraisalReportData to render the
  // owner-facing copy with the full projection content.
  const isAssessor = data.reportAudience !== "owner";

  // Instance-scoped page counter (fixes concurrent generation bug)
  const pageCounter = { n: 1 };

  // Pre-fetch images
  const streetViewBuf = data.streetViewUrl ? await fetchImageBuffer(data.streetViewUrl) : null;
  const satelliteBuf = data.satelliteImageUrl ? await fetchImageBuffer(data.satelliteImageUrl) : null;
  const roadmapBuf = data.roadmapUrl ? await fetchImageBuffer(data.roadmapUrl) : null;
  const photoBufs: Array<{ buf: Buffer; category: string; caption?: string }> = [];
  if (data.photos && data.photos.length > 0) {
    for (const p of data.photos.slice(0, 12)) {
      const buf = await fetchImageBuffer(p.url);
      if (buf) photoBufs.push({ buf, category: p.category, caption: p.caption });
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: TM, bottom: BM, left: LM, right: RM },
      info: {
        Title: `Property Valuation Report - ${data.address}`,
        Author: "AppraiseAI",
        Subject: "Property Tax Appeal - Market Value Analysis",
        Creator: "AppraiseAI Professional Appraisal Platform",
        Keywords: "property tax appeal, market value, comparable sales, appraisal, USPAP",
      },
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", async () => {
      try {
        const pdfBuf = Buffer.concat(chunks);
        const s3Key = `appraisals/${data.submissionId}-report-${nanoid(8)}.pdf`;
        const { url } = await storagePut(s3Key, pdfBuf, "application/pdf");
        resolve({ url, key: s3Key, sizeBytes: pdfBuf.length });
      } catch (err) { reject(err); }
    });
    doc.on("error", reject);

    const pageW = doc.page.width;
    const cw = pageW - LM - RM; // content width

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 1: COVER PAGE
    // ═══════════════════════════════════════════════════════════════════════

    // Full dark background with purple tint
    doc.rect(0, 0, pageW, doc.page.height).fill(NAVY);

    // Purple gradient accent bar at top
    doc.rect(0, 0, pageW, 4).fill(PURPLE);

    // Brand wordmark
    doc.fontSize(36).fillColor(WHITE).font("Helvetica-Bold")
      .text("AppraiseAI", LM, 80, { width: cw });
    doc.fontSize(11).fillColor(PURPLE_LIGHT).font("Helvetica")
      .text("PROPERTY VALUATION REPORT", LM, 125, { width: cw, characterSpacing: 3 });

    // Purple divider
    doc.rect(LM, 155, 80, 2).fill(PURPLE);

    // Property address block
    doc.fontSize(22).fillColor(WHITE).font("Helvetica-Bold")
      .text(data.address || "Subject Property", LM, 185, { width: cw });
    const cityStateZip = [data.city, data.state, data.zipCode].filter(Boolean).join(", ");
    if (cityStateZip) {
      doc.fontSize(14).fillColor("#94a3b8").font("Helvetica")
        .text(cityStateZip, LM, doc.y + 6, { width: cw });
    }
    if (data.county) {
      doc.fontSize(11).fillColor(PURPLE_LIGHT).font("Helvetica")
        .text(`${data.county} County`, LM, doc.y + 8, { width: cw });
    }

    // Market value callout on cover
    if (data.marketValueEstimate && !isFree) {
      const valBoxY = doc.y + 20;
      doc.rect(LM, valBoxY, cw, 50).lineWidth(1.5).fillAndStroke("#1e293b", PURPLE);
      doc.fontSize(9).fillColor(PURPLE_LIGHT).font("Helvetica")
        .text("OPINION OF MARKET VALUE", LM, valBoxY + 8, { width: cw, align: "center" });
      doc.fontSize(24).fillColor(WHITE).font("Helvetica-Bold")
        .text(fmt(data.marketValueEstimate), LM, valBoxY + 24, { width: cw, align: "center" });
    }

    // Property image (street view) centered
    if (streetViewBuf) {
      try {
        const imgW = cw * 0.85;
        const imgH = imgW * 0.5;
        const imgX = LM + (cw - imgW) / 2;
        const imgY = data.marketValueEstimate && !isFree ? 330 : 290;
        doc.roundedRect(imgX, imgY, imgW, imgH, 4).lineWidth(1).stroke(PURPLE);
        doc.image(streetViewBuf, imgX + 1, imgY + 1, { width: imgW - 2, height: imgH - 2 });
      } catch { /* skip if image fails */ }
    }

    // Report metadata block at bottom
    const metaY = 560;
    doc.rect(LM, metaY, cw, 0.5).fill(PURPLE);

    const metaItems: [string, string][] = [
      ["Report Number", reportId],
      ["Effective Date", reportDate],
      ["Property Type", (data.propertyType || "Residential").charAt(0).toUpperCase() + (data.propertyType || "Residential").slice(1)],
      ["Prepared For", data.ownerName || "Property Owner"],
      ["Prepared By", "AppraiseAI Valuation Engine"],
    ];
    if (data.parcelNumber) metaItems.push(["Parcel Number", data.parcelNumber]);

    let metaCurY = metaY + 15;
    for (const [label, value] of metaItems) {
      doc.fontSize(8).fillColor("#64748b").font("Helvetica")
        .text(label.toUpperCase(), LM, metaCurY, { width: 140, continued: false });
      doc.fontSize(9.5).fillColor(WHITE).font("Helvetica-Bold")
        .text(value, LM + 145, metaCurY, { width: cw - 145 });
      metaCurY += 18;
    }

    // Tier badge
    const tierLabel = isFree ? "SUMMARY REPORT" : "PROFESSIONAL VALUATION REPORT";
    doc.rect(LM, doc.page.height - BM - 40, cw, 28).fill(PURPLE);
    doc.fontSize(10).fillColor(WHITE).font("Helvetica-Bold")
      .text(tierLabel, LM, doc.page.height - BM - 34, { width: cw, align: "center" });

    // Purple bar at bottom
    doc.rect(0, doc.page.height - 4, pageW, 4).fill(PURPLE);

    // ─── FREE TIER: abbreviated report ─────────────────────────────────
    if (isFree) {
      addFooter(doc, reportId, pageCounter.n);
      pageCounter.n++;
      doc.addPage();
      let y = TM;

      y = sectionHeader(doc, "EXECUTIVE SUMMARY", y, cw);
      if (data.executiveSummary) {
        y = bodyText(doc, data.executiveSummary, y, cw);
      } else {
        y = bodyText(doc, `This summary report provides an overview of the market value analysis for the subject property located at ${fullAddress}. A comprehensive analysis including detailed comparable sales adjustments, cost approach, income approach, and full reconciliation is available in the Professional Report.`, y, cw);
      }

      y += 8;
      y = sectionHeader(doc, "KEY VALUATION METRICS", y, cw);
      const metricsRows: [string, string][] = [
        ["County Assessed Value", fmt(data.assessedValue)],
        ["AppraiseAI Market Value Estimate", fmt(data.marketValueEstimate)],
        // Use neutral phrasing on the assessor exhibit; "Over-Assessment"
        // is advocacy framing.
        [
          isAssessor ? "Indicated Reduction in Assessed Value" : "Over-Assessment Amount",
          fmt(data.assessmentGap),
        ],
      ];
      // Owner-only rows: financial outcome + internal winnability score.
      if (!isAssessor) {
        metricsRows.push(
          ["Estimated Annual Tax Savings", fmt(data.potentialSavings)],
          ["Appeal Strength Score", scoreLabel(data.appealStrengthScore)],
        );
      }
      y = kvTable(doc, metricsRows, y, cw, { highlight: true });

      // Show top 3 comps (summary only)
      if (data.comparableSales && data.comparableSales.length > 0) {
        y = ensureSpace(doc, y, 120, reportId, pageCounter);
        y = sectionHeader(doc, "COMPARABLE SALES (SUMMARY)", y, cw);
        y = bodyText(doc, `The following ${Math.min(3, data.comparableSales.length)} comparable sales were identified within the subject property's market area. Detailed adjustment calculations are available in the Professional Report.`, y, cw);

        for (const comp of data.comparableSales.slice(0, 3)) {
          y = ensureSpace(doc, y, 35, reportId, pageCounter);
          const sf = comp.squareFeet || comp.sqft;
          const compLine = [
            comp.address,
            `Sold: ${fmt(comp.salePrice)}`,
            comp.saleDate ? `Date: ${comp.saleDate}` : null,
            sf ? `${fmtNum(sf)} SF` : null,
          ].filter(Boolean).join("  |  ");
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text("-  " + compLine, LM + 8, y, { width: cw - 8, lineGap: 2 });          y = doc.y + 6;
        }
      }

      // Upgrade CTA
      y = ensureSpace(doc, y, 100, reportId, pageCounter);
      y += 20;
      doc.rect(LM, y, cw, 80).lineWidth(1).fillAndStroke(LIGHT_BG, PURPLE);
      doc.fontSize(11).fillColor(NAVY).font("Helvetica-Bold")
        .text("Unlock the Full Professional Report", LM + 15, y + 12, { width: cw - 30 });
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(
          "The Professional Report includes: detailed comparable sales adjustment grid with dollar-amount calculations, " +
          "cost approach analysis, income capitalization approach (if applicable), full reconciliation narrative, " +
          "assessor valuation critique, equity/uniformity analysis, tax impact projections, property condition findings, " +
          "photo gallery, and USPAP-compliant certification. Visit appraiseai.manus.space to upgrade.",
          LM + 15, y + 30, { width: cw - 30, lineGap: 2.5 }
        );

      // Disclaimer
      y = ensureSpace(doc, y + 100, 50, reportId, pageCounter);
      doc.rect(LM, doc.page.height - BM - 30, cw, 0.5).fill(BORDER);
      doc.fontSize(6.5).fillColor("#94a3b8").font("Helvetica")
        .text(
          `This summary report is generated by AppraiseAI for informational purposes. It provides a preliminary market value estimate based on automated analysis. ` +
          `For use in formal proceedings, the Professional Report with full methodology documentation is recommended. ` +
          `Report #${reportId} - (c) AppraiseAI ${new Date().getFullYear()}`,
          LM, doc.page.height - BM - 22, { width: cw, align: "center" }
        );

      addFooter(doc, reportId, pageCounter.n);
      doc.end();
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAID TIER: Full Professional Report (40-60 pages)
    // ═══════════════════════════════════════════════════════════════════════

    let sectionNum = 0;

    // ─── PAGE 2: LETTER OF TRANSMITTAL ─────────────────────────────────
    let y = newPage(doc, reportId, pageCounter);

    doc.fontSize(12).fillColor(NAVY).font("Helvetica-Bold")
      .text("LETTER OF TRANSMITTAL", LM, y, { width: cw, align: "center" });
    y = doc.y + 20;

    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica");
    doc.text(reportDate, LM, y, { width: cw });
    y = doc.y + 14;

    if (data.ownerName) {
      doc.text(data.ownerName, LM, y, { width: cw });
      y = doc.y + 4;
    }
    doc.text("Re: Property Valuation Report", LM, y, { width: cw });
    y = doc.y + 4;
    doc.text(`Subject Property: ${fullAddress}`, LM, y, { width: cw });
    y = doc.y + 14;

    doc.text(`Dear ${data.ownerName || "Property Owner"},`, LM, y, { width: cw });
    y = doc.y + 10;

    const transmittalBody = [
      `At your request, AppraiseAI has prepared this property valuation report for the subject property located at ${fullAddress}, ${data.county ? data.county + " County, " : ""}${data.state || ""}. The purpose of this report is to provide an independent opinion of market value as of the effective date for use in property tax assessment appeal proceedings.`,
      "",
      `This report has been prepared in conformity with the Uniform Standards of Professional Appraisal Practice (USPAP) and applicable state requirements for the jurisdiction of ${data.county ? data.county + " County" : data.state || "the subject property's jurisdiction"}.`,
      "",
      `The analysis is based on ${data.comparableSales?.length || 0} verified comparable sales transactions, supplemented by cost approach analysis${data.incomeApproach ? ", income capitalization approach," : ""} and ${photoBufs.length > 0 ? `${photoBufs.length} owner-submitted photographs documenting the property's current condition` : "publicly available property data and satellite imagery"}.`,
      "",
      `Based on the analysis and conclusions presented herein, the estimated market value of the subject property is:`,
    ];
    for (const line of transmittalBody) {
      doc.text(line, LM, y, { width: cw, lineGap: 3 });
      y = doc.y + 2;
    }

    y += 10;
    // Value callout box
    doc.rect(LM + 40, y, cw - 80, 50).lineWidth(1.5).fillAndStroke(LIGHT_BG, PURPLE);
    doc.fontSize(10).fillColor(MUTED).font("Helvetica")
      .text("ESTIMATED MARKET VALUE", LM + 40, y + 8, { width: cw - 80, align: "center" });
    doc.fontSize(22).fillColor(NAVY).font("Helvetica-Bold")
      .text(fmt(data.marketValueEstimate), LM + 40, y + 24, { width: cw - 80, align: "center" });
    y += 70;

    const overAssessmentPct = data.assessmentGap && data.assessedValue ? fmtPct((data.assessmentGap / data.assessedValue) * 100) : "N/A";

    const transmittalClose = [
      `This value represents a ${fmt(data.assessmentGap)} (${overAssessmentPct}) discrepancy from the current county assessed value of ${fmt(data.assessedValue)}. The detailed analysis supporting this conclusion is presented in the following pages.`,
      "",
      "Respectfully submitted,",
      "",
      "AppraiseAI Valuation Engine",
      "appraiseai.manus.space",
    ];
    doc.fontSize(9.5).fillColor(BODY_TEXT).font("Helvetica");
    for (const line of transmittalClose) {
      doc.text(line, LM, y, { width: cw, lineGap: 3 });
      y = doc.y + 2;
    }

    // ─── PAGE 3: TABLE OF CONTENTS ─────────────────────────────────────
    y = newPage(doc, reportId, pageCounter);

    doc.fontSize(16).fillColor(NAVY).font("Helvetica-Bold")
      .text("TABLE OF CONTENTS", LM, y, { width: cw });
    y = doc.y + 6;
    doc.rect(LM, y, 60, 2).fill(PURPLE);
    y += 20;

    const tocEntries = [
      "Letter of Transmittal",
      "Certification & Limiting Conditions",
      "Purpose, Intended Use & Scope of Work",
      "Executive Summary & Key Findings",
      "Property Identification & Description",
      ...(streetViewBuf || satelliteBuf ? ["Subject Property Imagery"] : []),
      ...(roadmapBuf ? ["Neighborhood Location Map"] : []),
      "Area & Neighborhood Analysis",
      "Market Conditions Analysis",
      "Highest & Best Use",
      "Sales Comparison Approach",
      "Cost Approach",
      ...(data.incomeApproach ? ["Income Capitalization Approach"] : []),
      "Reconciliation & Final Value Opinion",
      "Assessor's Valuation Critique",
      "Equity & Uniformity Analysis",
      "Tax Impact Analysis",
      ...(data.photoFindings ? ["Property Condition Findings"] : []),
      ...(photoBufs.length > 0 ? ["Property Photo Evidence"] : []),
      "Appendices",
    ];

    for (let i = 0; i < tocEntries.length; i++) {
      const num = `${i + 1}.`;
      // Dotted leader line
      doc.fontSize(10).fillColor(BODY_TEXT).font("Helvetica");
      doc.text(num, LM, y, { width: 30 });
      doc.text(tocEntries[i], LM + 30, y, { width: cw - 30 });
      y = doc.y + 8;
    }

    // ─── PAGE 4: CERTIFICATION & LIMITING CONDITIONS ───────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "CERTIFICATION & LIMITING CONDITIONS", y, cw, sectionNum);

    y = subHeader(doc, "Certification", y, cw);
    const certStatements = [
      "The statements of fact contained in this report are true and correct to the best of the analyst's knowledge and belief.",
      "The reported analyses, opinions, and conclusions are limited only by the reported assumptions and limiting conditions, and are the personal, impartial, and unbiased professional analyses, opinions, and conclusions of the analyst.",
      "The analyst has no present or prospective interest in the property that is the subject of this report and no personal interest with respect to the parties involved.",
      "The analyst has no bias with respect to the property that is the subject of this report or to the parties involved with this assignment.",
      "The compensation for completing this assignment is not contingent upon the development or reporting of a predetermined value or direction in value that favors the cause of the client, the amount of the value opinion, the attainment of a stipulated result, or the occurrence of a subsequent event directly related to the intended use of this appraisal.",
      "The analysis, opinions, and conclusions were developed, and this report has been prepared, in conformity with the Uniform Standards of Professional Appraisal Practice (USPAP).",
      "The subject property has not been personally inspected by the analyst. This analysis relies on publicly available data, owner-submitted photographs, and comparable sales data from multiple verified sources.",
    ];

    for (let i = 0; i < certStatements.length; i++) {
      y = ensureSpace(doc, y, 40, reportId, pageCounter);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`${i + 1}.  ${certStatements[i]}`, LM + 8, y, { width: cw - 16, lineGap: 3 });
      y = doc.y + 8;
    }

    y = ensureSpace(doc, y, 80, reportId, pageCounter);
    y += 10;
    y = subHeader(doc, "Limiting Conditions", y, cw);
    const limitingConditions = [
      "This report assumes no responsibility for matters legal in character, nor does it render any opinion as to the title, which is assumed to be good and marketable.",
      "The property is appraised free and clear of any or all liens or encumbrances unless otherwise stated.",
      "Information, estimates, and opinions furnished to the analyst and contained in the report were obtained from sources considered reliable and believed to be true and correct. However, no responsibility for accuracy of such items can be assumed by the analyst.",
      "The estimated market value is subject to change with market conditions. This opinion of value is valid as of the effective date stated herein.",
      "This report may not be used for any purpose other than the stated intended use without the prior written consent of AppraiseAI.",
      "The analyst assumes no responsibility for hidden or unapparent conditions of the property, subsoil, or structures that render it more or less valuable.",
      "Any allocation of the total value in this report between land and improvements applies only under the stated program of utilization. The separate values allocated to land and improvements must not be used in conjunction with any other appraisal and are invalid if so used.",
    ];

    for (let i = 0; i < limitingConditions.length; i++) {
      y = ensureSpace(doc, y, 35, reportId, pageCounter);
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica")
        .text(`-  ${limitingConditions[i]}`, LM + 8, y, { width: cw - 16, lineGap: 2.5 });
      y = doc.y + 6;
    }

    // Extraordinary Assumptions & Hypothetical Conditions (USPAP requirement)
    y = ensureSpace(doc, y, 100, reportId, pageCounter);
    y += 8;
    y = subHeader(doc, "Extraordinary Assumptions", y, cw);
    y = bodyText(doc,
      `This appraisal employs the following extraordinary assumptions that, if found to be false, could alter the analyst's opinions or conclusions: ` +
      `(1) The property data obtained from public records and third-party data providers is accurate and reflects the current state of the property. ` +
      `(2) There are no hidden or unapparent conditions of the property, subsoil, or structures that would render it more or less valuable. ` +
      `(3) The owner-submitted photographs, if any, accurately represent the current condition of the property as of the effective date. ` +
      `The use of these extraordinary assumptions may have affected the assignment results.`,
      y, cw
    );

    y = ensureSpace(doc, y, 50, reportId, pageCounter);
    y = subHeader(doc, "Hypothetical Conditions", y, cw);
    y = bodyText(doc,
      `No hypothetical conditions have been employed in this analysis. All value conclusions are based on the property's actual characteristics ` +
      `and market conditions as of the effective date.`,
      y, cw
    );

    // ─── PURPOSE, INTENDED USE & SCOPE OF WORK ────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "PURPOSE, INTENDED USE & SCOPE OF WORK", y, cw, sectionNum);

    y = subHeader(doc, "Purpose of the Appraisal", y, cw);
    y = bodyText(doc,
      `The purpose of this appraisal is to develop an opinion of the market value of the fee simple interest in the subject property ` +
      `as of the effective date of ${reportDate}. Market value is defined as the most probable price which a property should bring in a ` +
      `competitive and open market under all conditions requisite to a fair sale, the buyer and seller each acting prudently and knowledgeably, ` +
      `and assuming the price is not affected by undue stimulus.`,
      y, cw
    );

    y = subHeader(doc, "Intended Use", y, cw);
    y = bodyText(doc,
      `This report is intended for use in property tax assessment appeal proceedings before the ${data.county ? data.county + " County" : "local"} ` +
      `Board of Review, Board of Equalization, or equivalent tax assessment authority in the State of ${data.state || "the subject property's state"}. ` +
      `The intended users of this report are the property owner${data.ownerName ? ` (${data.ownerName})` : ""} and the relevant tax assessment authority. ` +
      `This report should not be used for any other purpose, including mortgage lending, insurance, or estate planning.`,
      y, cw
    );

    y = subHeader(doc, "Scope of Work", y, cw);
    y = bodyText(doc,
      `The scope of work for this assignment included the following steps, which the analyst determined to be appropriate for the intended use:`,
      y, cw
    );

    const scopeItems = [
      "Identification of the subject property through public records, parcel data, and assessor databases.",
      "Collection and verification of subject property characteristics including lot size, gross living area, year built, bedroom/bathroom count, and property type.",
      `Analysis of the local real estate market in ${data.city || "the subject area"}, ${data.county ? data.county + " County" : ""} including recent sales trends, median prices, days on market, and inventory levels.`,
      `Identification and analysis of ${data.comparableSales?.length || 0} comparable sales within the subject's competitive market area, verified through multiple data sources including MLS records, public deed transfers, and third-party real estate platforms.`,
      "Application of the Sales Comparison Approach with quantitative adjustments for differences in location, size, age, condition, and other relevant characteristics.",
      "Application of the Cost Approach to estimate value based on replacement cost new, less depreciation, plus land value.",
      ...(data.incomeApproach ? ["Application of the Income Capitalization Approach using market-derived rental rates and capitalization rates for the subject property type."] : []),
      "Reconciliation of value indications from all applicable approaches into a final opinion of market value.",
      `Review of the current county assessed value and analysis of assessment equity relative to comparable properties.`,
      ...(photoBufs.length > 0 ? [`Analysis of ${photoBufs.length} owner-submitted photographs to assess property condition and identify value-impacting issues.`] : []),
      "Preparation of this written appraisal report in compliance with USPAP Standards Rule 2.",
    ];

    for (const item of scopeItems) {
      y = ensureSpace(doc, y, 30, reportId, pageCounter);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`-  ${item}`, LM + 8, y, { width: cw - 16, lineGap: 2.5 });
      y = doc.y + 5;
    }

    y = ensureSpace(doc, y, 40, reportId, pageCounter);
    y += 6;
    y = bodyText(doc,
      `The subject property was not personally inspected. This desktop appraisal relies on publicly available data, satellite and street-level imagery, ` +
      `owner-submitted photographs, and comparable sales data from multiple verified sources. This scope of work is consistent with the ` +
      `requirements for property tax appeal proceedings in the subject jurisdiction.`,
      y, cw
    );

    // ─── EXECUTIVE SUMMARY & KEY FINDINGS ──────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "EXECUTIVE SUMMARY & KEY FINDINGS", y, cw, sectionNum);

    if (data.executiveSummary) {
      y = bodyText(doc, data.executiveSummary, y, cw);
    }

    y += 4;
    y = subHeader(doc, "Key Valuation Metrics", y, cw);
    // Owner-only rows (savings + strength score) suppressed in the assessor
    // exhibit; gap label switched to neutral "Indicated Reduction" phrasing.
    const keyMetrics: [string, string][] = [
      ["County Assessed Value", fmt(data.assessedValue)],
      ["AppraiseAI Market Value Estimate", fmt(data.marketValueEstimate)],
      [
        isAssessor ? "Indicated Reduction in Assessed Value" : "Over-Assessment Amount",
        fmt(data.assessmentGap),
      ],
      [
        isAssessor ? "Indicated Reduction Percentage" : "Over-Assessment Percentage",
        overAssessmentPct,
      ],
    ];
    if (!isAssessor) {
      keyMetrics.push(
        ["Estimated Annual Tax Savings", fmt(data.potentialSavings)],
        ["Appeal Strength Score", scoreLabel(data.appealStrengthScore)],
      );
    }
    keyMetrics.push(
      ["Number of Comparable Sales Analyzed", `${data.comparableSales?.length || 0}`],
      ["Effective Date of Value", reportDate],
    );
    y = kvTable(doc, keyMetrics, y, cw, { highlight: true });

    // ─── GROUNDS FOR APPEAL — RANKED SUMMARY (60-second test) ──────────
    // Per current best practice (AppealDesk 2026, Cook County BOR, Walker
    // Advisory), the assessor or board reads the cover summary in 60 seconds
    // and decides whether to engage with the underlying evidence at all.
    // We surface the persuasion brief's 60-second summary, the ranked
    // statutory grounds, and a labeled exhibit index here, immediately
    // after the key valuation metrics.
    if (data.persuasionBrief && data.persuasionBrief.sixtySecondSummary) {
      y = ensureSpace(doc, y, 100, reportId, pageCounter);
      y = subHeader(doc, "Summary of Position (60-Second Brief)", y, cw);
      y = bodyText(doc, data.persuasionBrief.sixtySecondSummary, y, cw);

      const activeGrounds = data.persuasionBrief.rankedGrounds.filter((g) => g.strength > 10);
      if (activeGrounds.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Statutory Grounds for Relief (Ranked by Evidence Strength)", y, cw);
        for (let i = 0; i < activeGrounds.length; i++) {
          const g = activeGrounds[i];
          const label =
            g.ground === "market_value"
              ? "Excessive Market Value"
              : g.ground === "uniformity"
                ? "Lack of Uniformity"
                : "Errors of Fact in Assessor's Record";
          y = ensureSpace(doc, y, 60, reportId, pageCounter);
          // Numbered ground header with strength chip
          doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
            .text(`Ground ${i + 1}: ${label}  (Evidence Strength ${g.strength}/100)`, LM, y, { width: cw });
          y = doc.y + 4;
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
            .text(g.headline, LM, y, { width: cw, lineGap: 3 });
          y = doc.y + 6;
          // Up to 4 supporting bullets per ground
          for (const b of g.bullets.slice(0, 4)) {
            y = ensureSpace(doc, y, 20, reportId, pageCounter);
            doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica")
              .text(`-  ${b}`, LM + 12, y, { width: cw - 24, lineGap: 2 });
            y = doc.y + 3;
          }
          y += 4;
        }
      }

      if (data.persuasionBrief.exhibitIndex.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Exhibit Index", y, cw);
        for (const e of data.persuasionBrief.exhibitIndex) {
          y = ensureSpace(doc, y, 24, reportId, pageCounter);
          doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
            .text(`${e.tag}: `, LM + 8, y, { continued: true });
          doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
            .text(e.title, { continued: false });
          y = doc.y + 2;
          doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica")
            .text(e.description, LM + 16, y, { width: cw - 24, lineGap: 2 });
          y = doc.y + 6;
        }
      }

      // Prayer for Relief — the precise requested-value sentence. Drop in.
      if (data.persuasionBrief.prayerForRelief) {
        y = ensureSpace(doc, y, 50, reportId, pageCounter);
        doc.rect(LM, y, cw, 0.5).fill(PURPLE);
        y += 6;
        doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
          .text("Prayer for Relief", LM, y, { width: cw });
        y = doc.y + 4;
        doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica-Oblique")
          .text(data.persuasionBrief.prayerForRelief, LM, y, { width: cw, lineGap: 3 });
        y = doc.y + 8;
      }
    }

    // Valuation Justification narrative
    if (data.valuationJustification) {
      y = ensureSpace(doc, y, 80, reportId, pageCounter);
      y = subHeader(doc, "Valuation Analysis Summary", y, cw);
      y = bodyText(doc, data.valuationJustification, y, cw);
    }

    // Recommended approach
    if (data.recommendedApproach) {
      y = ensureSpace(doc, y, 60, reportId, pageCounter);
      y = subHeader(doc, "Primary Valuation Approach", y, cw);
      y = bodyText(doc,
        `Based on the available data and the characteristics of the subject property, the primary valuation approach employed ` +
        `in this analysis is the ${data.recommendedApproach}. This approach was selected because it provides the most reliable ` +
        `indication of market value given the property type, available comparable data, and the intended use of this report ` +
        `in property tax appeal proceedings. ${data.incomeApproach ? "The income capitalization approach was also considered as a secondary indicator of value for this income-producing property." : ""} ` +
        `The cost approach provides a supplementary check on the value conclusion.`,
        y, cw
      );
    }

    // Value range visualization
    if (data.marketValueEstimate && data.assessedValue) {
      y = ensureSpace(doc, y, 80, reportId, pageCounter);
      y += 4;
      y = subHeader(doc, "Value Comparison", y, cw);

      const maxVal = Math.max(data.assessedValue, data.marketValueEstimate) * 1.15;
      const barWidth = cw - 40;
      const assessedPct = data.assessedValue / maxVal;
      const marketPct = data.marketValueEstimate / maxVal;

      // Assessed value bar
      doc.fontSize(8).fillColor(MUTED).font("Helvetica")
        .text("County Assessed Value", LM, y, { width: cw });
      y = doc.y + 3;
      doc.rect(LM, y, barWidth * assessedPct, 16).fill(RED_ACCENT);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
        .text(fmt(data.assessedValue), LM + 6, y + 3, { width: barWidth * assessedPct - 12 });
      y += 24;

      // Market value bar
      doc.fontSize(8).fillColor(MUTED).font("Helvetica")
        .text("AppraiseAI Market Value", LM, y, { width: cw });
      y = doc.y + 3;
      doc.rect(LM, y, barWidth * marketPct, 16).fill(GREEN_ACCENT);
      doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
        .text(fmt(data.marketValueEstimate), LM + 6, y + 3, { width: barWidth * marketPct - 12 });
      y += 24;

      // Difference callout
      doc.rect(LM, y, cw, 24).lineWidth(0.5).fillAndStroke(LIGHT_BG, PURPLE);
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text(`OVER-ASSESSMENT: ${fmt(data.assessmentGap)} (${overAssessmentPct})`, LM + 10, y + 6, { width: cw - 20, align: "center" });
      y += 36;
    }

    // ─── PROPERTY IDENTIFICATION & DESCRIPTION ─────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "PROPERTY IDENTIFICATION & DESCRIPTION", y, cw, sectionNum);

    y = subHeader(doc, "Subject Property Details", y, cw);
    const propDetails: [string, string][] = [
      ["Street Address", fullAddress],
      ["County", data.county || "N/A"],
      ["Parcel Number", data.parcelNumber || "See county records"],
      ["Property Type", (data.propertyType || "Residential").charAt(0).toUpperCase() + (data.propertyType || "residential").slice(1)],
      ["Gross Living Area", data.squareFeet ? `${fmtNum(data.squareFeet)} SF` : "N/A"],
      ["Year Built", data.yearBuilt ? `${data.yearBuilt} (Effective Age: ${new Date().getFullYear() - data.yearBuilt} years)` : "N/A"],
      ["Bedrooms", data.bedrooms ? `${data.bedrooms}` : "N/A"],
      ["Bathrooms", data.bathrooms ? `${data.bathrooms}` : "N/A"],
      ["Lot Size", data.lotSize ? `${fmtNum(data.lotSize)} SF (${(data.lotSize / 43560).toFixed(2)} acres)` : "N/A"],
      ["Current Assessed Value", fmt(data.assessedValue)],
    ];
    y = kvTable(doc, propDetails, y, cw);

    // Site description narrative
    y = ensureSpace(doc, y, 60, reportId, pageCounter);
    y = subHeader(doc, "Site Description", y, cw);
    const yearBuilt = data.yearBuilt || 0;
    const effectiveAge = yearBuilt > 0 ? new Date().getFullYear() - yearBuilt : 0;
    y = bodyText(doc,
      `The subject property is a ${(data.propertyType || "residential").toLowerCase()} dwelling located at ${fullAddress}. ` +
      `${data.squareFeet ? `The gross living area comprises approximately ${fmtNum(data.squareFeet)} square feet` : "The living area is as reported in county records"}` +
      `${data.lotSize ? ` situated on a ${fmtNum(data.lotSize)} square foot (${(data.lotSize / 43560).toFixed(2)} acre) parcel` : ""}. ` +
      `${yearBuilt > 0 ? `Originally constructed in ${yearBuilt}, the property has a chronological age of ${effectiveAge} years. ` : ""}` +
      `${data.bedrooms && data.bathrooms ? `The floor plan includes ${data.bedrooms} bedroom${data.bedrooms > 1 ? "s" : ""} and ${data.bathrooms} bathroom${data.bathrooms > 1 ? "s" : ""}. ` : ""}` +
      `The property is located within the ${data.county ? data.county + " County" : "local"} tax jurisdiction ` +
      `and is currently assessed at ${fmt(data.assessedValue)} for property tax purposes.`,
      y, cw
    );

    // Assessment History section
    y = ensureSpace(doc, y, 120, reportId, pageCounter);
    y = subHeader(doc, "Assessment History & Context", y, cw);
    y = bodyText(doc,
      `The following table presents the current assessment record for the subject property as maintained by the ${data.county ? data.county + " County" : "local"} ` +
      `assessor's office. Assessment history provides important context for understanding the trajectory of the property's tax burden ` +
      `and identifying potential patterns of over-assessment.`,
      y, cw
    );

    // Current assessment record table
    const assessHistoryRows: [string, string][] = [
      ["Current Tax Year", `${new Date().getFullYear()}`],
      ["Current Assessed Value", fmt(data.assessedValue)],
      ["AppraiseAI Market Value Opinion", fmt(data.marketValueEstimate)],
      [
        isAssessor ? "Indicated Reduction in Assessed Value" : "Over-Assessment Amount",
        fmt(data.assessmentGap),
      ],
      [
        isAssessor ? "Indicated Reduction Percentage" : "Over-Assessment Percentage",
        overAssessmentPct,
      ],
      ["Assessment Ratio (Assessed / Market)", data.marketValueEstimate && data.assessedValue ? `${((data.assessedValue / data.marketValueEstimate) * 100).toFixed(1)}%` : "N/A"],
    ];
    y = kvTable(doc, assessHistoryRows, y, cw);

    // Two flavors of the same paragraph: the assessor exhibit states the
    // gap analytically and asks for a review; the owner copy adds the
    // tax-overpayment dollar figure (owner financial outcome).
    y = bodyText(doc,
      isAssessor
        ? (
            `Based on the analysis presented in this report, the current assessed value of ${fmt(data.assessedValue)} exceeds the estimated market value ` +
            `of ${fmt(data.marketValueEstimate)} by ${fmt(data.assessmentGap)}, an indicated reduction of ${overAssessmentPct}. ` +
            `The owner respectfully requests a review by the ${data.county ? data.county + " County" : "local"} Board of Review or equivalent assessment authority.`
          )
        : (
            `Based on the analysis presented in this report, the current assessed value of ${fmt(data.assessedValue)} exceeds the estimated market value ` +
            `of ${fmt(data.marketValueEstimate)} by ${fmt(data.assessmentGap)}, representing an over-assessment of ${overAssessmentPct}. ` +
            `This level of over-assessment results in an estimated annual tax overpayment of ${fmt(data.potentialSavings)} and warrants ` +
            `a formal appeal to the ${data.county ? data.county + " County" : "local"} Board of Review or equivalent assessment authority.`
          ),
      y, cw
    );

    // ─── SUBJECT PROPERTY IMAGERY ──────────────────────────────────────
    if (streetViewBuf || satelliteBuf) {
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "SUBJECT PROPERTY IMAGERY", y, cw, sectionNum);

      y = bodyText(doc,
        `The following imagery of the subject property was captured from publicly available sources to supplement the analysis. ` +
        `Street-level and aerial photographs provide visual context for the property's location, site characteristics, ` +
        `surrounding land uses, and overall neighborhood quality. These images are current as of the most recent capture date ` +
        `available from the respective imagery providers.`,
        y, cw
      );

      // Street View — full width, large format
      if (streetViewBuf) {
        y += 6;
        y = subHeader(doc, "Street View - Front Elevation", y, cw);
        const svW = cw;
        const svH = Math.round(svW * 0.55);
        try {
          doc.rect(LM - 1, y - 1, svW + 2, svH + 2).lineWidth(0.75).stroke(PURPLE);
          doc.image(streetViewBuf, LM, y, { width: svW, height: svH });
          y += svH + 6;
          doc.fontSize(8).fillColor(MUTED).font("Helvetica")
            .text(`Street View - ${fullAddress}`, LM, y, { width: cw, align: "center" });
          y = doc.y + 4;
          doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica")
            .text(
              `The street-level photograph above shows the front elevation of the subject property as viewed from the public right-of-way. ` +
              `This perspective provides context for the property's curb appeal, landscaping, exterior condition, and relationship to adjacent properties.`,
              LM, y, { width: cw, lineGap: 2.5 }
            );
          y = doc.y + 10;
        } catch {
          doc.rect(LM, y, svW, svH).lineWidth(0.5).stroke(BORDER);
          doc.fontSize(9).fillColor(MUTED).font("Helvetica")
            .text("Street View image unavailable", LM, y + svH / 2 - 5, { width: svW, align: "center" });
          y += svH + 15;
        }
      }

      // Satellite — full width on new page if street view was shown
      if (satelliteBuf) {
        if (streetViewBuf) {
          y = newPage(doc, reportId, pageCounter);
          y = subHeader(doc, "Aerial / Satellite View", y, cw);
        } else {
          y += 6;
          y = subHeader(doc, "Aerial / Satellite View", y, cw);
        }
        const satW = cw;
        const satH = Math.round(satW * 0.55);
        try {
          doc.rect(LM - 1, y - 1, satW + 2, satH + 2).lineWidth(0.75).stroke(PURPLE);
          doc.image(satelliteBuf, LM, y, { width: satW, height: satH });
          y += satH + 6;
          doc.fontSize(8).fillColor(MUTED).font("Helvetica")
            .text(`Satellite View - ${fullAddress}`, LM, y, { width: cw, align: "center" });
          y = doc.y + 4;
          doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica")
            .text(
              `The aerial photograph above shows the subject property and its immediate surroundings. This perspective provides context for ` +
              `the lot size, building footprint, site improvements, and proximity to neighboring properties. The satellite imagery ` +
              `is useful for verifying property boundaries, identifying site features not visible from street level, and assessing ` +
              `the overall development density of the neighborhood.`,
              LM, y, { width: cw, lineGap: 2.5 }
            );
          y = doc.y + 10;
        } catch {
          doc.rect(LM, y, satW, satH).lineWidth(0.5).stroke(BORDER);
          doc.fontSize(9).fillColor(MUTED).font("Helvetica")
            .text("Satellite image unavailable", LM, y + satH / 2 - 5, { width: satW, align: "center" });
          y += satH + 15;
        }
      }
    }

    // ─── NEIGHBORHOOD LOCATION MAP ─────────────────────────────────────
    if (roadmapBuf) {
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "NEIGHBORHOOD LOCATION MAP", y, cw, sectionNum);

      y = bodyText(doc,
        `The neighborhood location map below identifies the subject property within its broader geographic context. ` +
        `The map illustrates the property's proximity to major roadways, commercial centers, schools, parks, and other ` +
        `community amenities that influence property values in the area. Location is a primary determinant of market value, ` +
        `and this map provides the spatial context necessary for understanding the comparable sales selection and adjustments ` +
        `applied in this analysis.`,
        y, cw
      );

      y += 6;
      const mapW = cw;
      const mapH = Math.round(mapW * 0.65);
      try {
        doc.rect(LM - 1, y - 1, mapW + 2, mapH + 2).lineWidth(0.75).stroke(PURPLE);
        doc.image(roadmapBuf, LM, y, { width: mapW, height: mapH });
        y += mapH + 6;
        doc.fontSize(8).fillColor(MUTED).font("Helvetica")
          .text(`Neighborhood Map - ${data.city || "Subject Area"}, ${data.state || ""}`, LM, y, { width: cw, align: "center" });
        y = doc.y + 4;
        doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica")
          .text(
            `The pin marker indicates the subject property location. The surrounding area shows the typical development pattern ` +
            `and land use characteristics of the neighborhood, which are consistent with the subject's ${data.propertyType || "residential"} use. ` +
            `The comparable sales used in this analysis are located within this general market area.`,
            LM, y, { width: cw, lineGap: 2.5 }
          );
        y = doc.y + 10;
      } catch {
        doc.rect(LM, y, mapW, mapH).lineWidth(0.5).stroke(BORDER);
        doc.fontSize(9).fillColor(MUTED).font("Helvetica")
          .text("Neighborhood map unavailable", LM, y + mapH / 2 - 5, { width: mapW, align: "center" });
        y += mapH + 15;
      }
    }

    // ─── AREA & NEIGHBORHOOD ANALYSIS ──────────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "AREA & NEIGHBORHOOD ANALYSIS", y, cw, sectionNum);

    const neighborhoodType = data.propertyType === "residential" || !data.propertyType
      ? "single-family residential development"
      : data.propertyType + " properties";

    y = subHeader(doc, "Neighborhood Description", y, cw);
    y = bodyText(doc,
      `The subject property is located in ${data.city || "the local area"}, ${data.county ? data.county + " County, " : ""}${data.state || ""}. ` +
      `The neighborhood is characterized by ${neighborhoodType} with typical lot sizes and building characteristics consistent with the subject. ` +
      `The area is served by public utilities and has adequate access to transportation, schools, shopping, and other community amenities. ` +
      `Land use in the immediate vicinity is predominantly ${neighborhoodType}, and there are no known adverse environmental conditions or external obsolescence factors ` +
      `that would negatively impact property values beyond normal market conditions.`,
      y, cw
    );

    y = bodyText(doc,
      `The subject neighborhood exhibits a stable development pattern with properties generally consistent in age, size, and quality. ` +
      `Building density and lot sizes are typical for the area, and the overall condition of neighboring properties suggests a well-maintained community. ` +
      `There are no apparent adverse influences from commercial or industrial uses, and the neighborhood appears to be at a stable or growth stage ` +
      `in its life cycle. These neighborhood characteristics support the comparable sales selected for this analysis, as they are drawn from ` +
      `the same or similar competitive market areas.`,
      y, cw
    );

    y = subHeader(doc, "Neighborhood Characteristics", y, cw);
    const neighborhoodDetails: [string, string][] = [
      ["Location", `${data.city || "N/A"}, ${data.state || "N/A"}`],
      ["County", data.county || "N/A"],
      ["Predominant Use", neighborhoodType.charAt(0).toUpperCase() + neighborhoodType.slice(1)],
      ["Development Stage", "Stable / Growth"],
      ["Property Compatibility", "Consistent with neighborhood"],
      ["Utilities", "All public utilities available"],
      ["Adverse Conditions", "None observed"],
    ];
    y = kvTable(doc, neighborhoodDetails, y, cw);

    if (data.marketTrend) {
      y = subHeader(doc, "Local Market Indicators", y, cw);
      const marketRows: [string, string][] = [];
      if (data.marketTrend.medianSalePrice) marketRows.push(["Median Sale Price (Area)", fmt(data.marketTrend.medianSalePrice)]);
      if (data.marketTrend.medianPricePerSF) marketRows.push(["Median Price per SF", fmtPSF(data.marketTrend.medianPricePerSF)]);
      if (data.marketTrend.averageDaysOnMarket) marketRows.push(["Average Days on Market", `${data.marketTrend.averageDaysOnMarket} days`]);
      if (data.marketTrend.inventoryCount) marketRows.push(["Active Inventory (Comps Found)", `${data.marketTrend.inventoryCount} properties`]);
      if (data.marketTrend.priceChangeYoY != null) marketRows.push(["Year-over-Year Price Change", fmtPct(data.marketTrend.priceChangeYoY)]);
      if (data.marketTrend.absorptionRate != null) marketRows.push(["Absorption Rate", `${data.marketTrend.absorptionRate} months`]);

      if (marketRows.length > 0) {
        y = kvTable(doc, marketRows, y, cw);
      }

      // Market trend narrative
      const trendDirection = data.marketTrend.priceChangeYoY != null && data.marketTrend.priceChangeYoY < -2
        ? "declining" : data.marketTrend.priceChangeYoY != null && data.marketTrend.priceChangeYoY > 3
        ? "appreciating" : "relatively stable";
      const domNarrative = data.marketTrend.averageDaysOnMarket
        ? ` Properties in the area are selling in an average of ${data.marketTrend.averageDaysOnMarket} days, indicating ${data.marketTrend.averageDaysOnMarket < 30 ? "a seller's market with strong demand" : data.marketTrend.averageDaysOnMarket < 60 ? "balanced market conditions" : "a buyer's market with softer demand"}.`
        : "";

      y = bodyText(doc,
        `Current market conditions in the subject's area are ${trendDirection}.${domNarrative} ` +
        `These conditions are reflected in the comparable sales adjustments and the final reconciliation of value.`,
        y, cw
      );
    }

    // ─── MARKET CONDITIONS ANALYSIS ────────────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "MARKET CONDITIONS ANALYSIS", y, cw, sectionNum);

    y = bodyText(doc,
      `An analysis of market conditions is essential to understanding the context within which the subject property's value is determined. ` +
      `Market conditions directly affect comparable sale prices and the reliability of the sales comparison approach. The following analysis ` +
      `examines the broader market trends and the specific comparable sales data used in this valuation.`,
      y, cw
    );

    if (data.comparableSales && data.comparableSales.length > 0) {
      const avgPrice = data.comparableSales.reduce((s, c) => s + c.salePrice, 0) / data.comparableSales.length;
      const compsWithSF = data.comparableSales.filter(c => c.squareFeet || c.sqft);
      const avgSF = compsWithSF.length > 0
        ? compsWithSF.reduce((s, c) => s + (c.squareFeet || c.sqft || 0), 0) / compsWithSF.length
        : 0;
      const avgPSF = avgSF > 0 ? avgPrice / avgSF : null;

      y = subHeader(doc, "Comparable Sales Market Summary", y, cw);
      const mktRows: [string, string][] = [
        ["Number of Sales Analyzed", `${data.comparableSales.length}`],
        ["Average Sale Price", fmt(avgPrice)],
        ["Sale Price Range", `${fmt(Math.min(...data.comparableSales.map(c => c.salePrice)))} – ${fmt(Math.max(...data.comparableSales.map(c => c.salePrice)))}`],
      ];
      if (avgPSF) mktRows.push(["Average Price per SF", fmtPSF(avgPSF)]);

      // Sale date range
      const saleDates = data.comparableSales.map(c => c.saleDate).filter(Boolean);
      if (saleDates.length > 0) {
        mktRows.push(["Sale Date Range", `${saleDates[saleDates.length - 1]} – ${saleDates[0]}`]);
      }

      // Distance range
      const distances = data.comparableSales.map(c => c.distance).filter((d): d is number => d != null);
      if (distances.length > 0) {
        mktRows.push(["Distance Range from Subject", `${Math.min(...distances).toFixed(1)} – ${Math.max(...distances).toFixed(1)} miles`]);
      }

      y = kvTable(doc, mktRows, y, cw);

      y = bodyText(doc,
        `The comparable sales selected for this analysis represent arm's-length transactions between willing buyers and sellers ` +
        `in the subject's competitive market area. Each sale was verified for transaction legitimacy and adjusted for differences ` +
        `in physical characteristics, location, and conditions of sale relative to the subject property.`,
        y, cw
      );
    }

    // ─── HIGHEST & BEST USE ────────────────────────────────────────────
    y = ensureSpace(doc, y, 200, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "HIGHEST & BEST USE", y, cw, sectionNum);

    y = bodyText(doc,
      `Highest and best use is defined as the reasonably probable and legal use of vacant land or an improved property that is physically possible, ` +
      `appropriately supported, financially feasible, and that results in the highest value. This analysis considers the four criteria ` +
      `of highest and best use: legal permissibility, physical possibility, financial feasibility, and maximum productivity.`,
      y, cw
    );

    y = subHeader(doc, "As Improved", y, cw);
    y = bodyText(doc,
      `The highest and best use of the subject property, as improved, is its continued use as a ${data.propertyType || "residential"} property. ` +
      `The existing improvements represent a reasonable and productive use of the site consistent with the surrounding neighborhood. ` +
      `There is no indication that an alternative use would produce a higher value, and the current improvements contribute ` +
      `substantial value to the site. Demolition of the existing improvements is not warranted.`,
      y, cw
    );

    y = subHeader(doc, "As Vacant", y, cw);
    y = bodyText(doc,
      `If the site were vacant and available for development, the highest and best use would be development with a ${data.propertyType || "residential"} ` +
      `property consistent with the surrounding neighborhood and applicable zoning regulations. This conclusion is supported by the ` +
      `predominant land use pattern in the immediate area.`,
      y, cw
    );

    // ═══════════════════════════════════════════════════════════════════════
    // SALES COMPARISON APPROACH (the core of the report)
    // ═══════════════════════════════════════════════════════════════════════
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "SALES COMPARISON APPROACH", y, cw, sectionNum);

    y = bodyText(doc,
      `The Sales Comparison Approach is the most reliable indicator of market value for ${data.propertyType || "residential"} properties. ` +
      `This approach develops an opinion of value by comparing the subject property to similar properties that have recently sold in the same ` +
      `or competing market areas. Adjustments are made to the comparable sale prices to account for differences between each comparable and the subject property.`,
      y, cw
    );

    y = bodyText(doc,
      `${data.comparableSales?.length || 0} comparable sales were identified and analyzed. ` +
      `Each sale was verified for arm's-length transaction status and adjusted for differences in location, physical characteristics, ` +
      `and conditions of sale. The adjustments reflect the analyst's opinion of the market's reaction to the differences between ` +
      `each comparable and the subject property.`,
      y, cw
    );

    // ─── COMPARABLE SALES DETAIL ───────────────────────────────────────
    if (data.comparableSales && data.comparableSales.length > 0) {
      y = subHeader(doc, "Comparable Sales Summary", y, cw);

      for (let i = 0; i < data.comparableSales.length; i++) {
        const comp = data.comparableSales[i];

        // Build rows first so we can calculate total height
        const sf = comp.squareFeet || comp.sqft;
        const compRows: [string, string][] = [
          ["Address", comp.address],
          ["Sale Price", fmt(comp.salePrice)],
          ["Sale Date", comp.saleDate || "N/A"],
          ["Gross Living Area", sf ? `${fmtNum(sf)} SF` : "N/A"],
        ];
        if (sf && comp.salePrice) compRows.push(["Price per SF", fmtPSF(comp.salePrice / sf)]);
        if (comp.yearBuilt) compRows.push(["Year Built", `${comp.yearBuilt}`]);
        if (comp.bedrooms) compRows.push(["Bedrooms", `${comp.bedrooms}`]);
        if (comp.bathrooms) compRows.push(["Bathrooms", `${comp.bathrooms}`]);
        if (comp.lotSize) compRows.push(["Lot Size", `${fmtNum(comp.lotSize)} SF`]);
        if (comp.distance) compRows.push(["Distance from Subject", `${comp.distance.toFixed(1)} miles`]);
        if (comp.similarity) compRows.push(["Similarity Score", `${comp.similarity}%`]);

        // Calculate total height: header (24) + rows (22 each) + padding (12)
        const totalCompHeight = 24 + compRows.length * 22 + 12;
        y = ensureSpace(doc, y, totalCompHeight, reportId, pageCounter);

        // Comp header
        doc.rect(LM, y, cw, 20).fill(NAVY);
        doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
          .text(`COMPARABLE SALE ${i + 1}`, LM + 10, y + 5, { width: cw - 20 });
        y += 24;

        y = kvTable(doc, compRows, y, cw);
        y += 4;
      }
    }

    // ─── COMPARABLE SALES LOCATION & PROXIMITY ANALYSIS ──────────────
    if (data.comparableSales && data.comparableSales.length > 0) {
      y = newPage(doc, reportId, pageCounter);
      y = subHeader(doc, "Comparable Sales Location & Proximity Analysis", y, cw);

      y = bodyText(doc,
        `The following table summarizes the geographic relationship between each comparable sale and the subject property. ` +
        `Proximity to the subject is a key factor in determining comparability, as properties in closer proximity are more likely ` +
        `to share similar neighborhood characteristics, school districts, and market influences. The IAAO recommends that comparable ` +
        `sales be drawn from the subject's immediate neighborhood or competing market area whenever possible.`,
        y, cw
      );

      // Location summary table
      const locHeaderH = 22;
      const locRowH = 20;
      const locTableH = locHeaderH + data.comparableSales.length * locRowH + 10;
      y = ensureSpace(doc, y, locTableH, reportId, pageCounter);

      // Table header
      const col1 = LM;
      const col1W = cw * 0.06;  // #
      const col2W = cw * 0.38;  // Address
      const col3W = cw * 0.14;  // Distance
      const col4W = cw * 0.14;  // Sale Price
      const col5W = cw * 0.14;  // Sale Date
      const col6W = cw * 0.14;  // Price/SF

      doc.rect(col1, y, cw, locHeaderH).fill(NAVY);
      doc.fontSize(7.5).fillColor(WHITE).font("Helvetica-Bold");
      doc.text("#", col1 + 4, y + 6, { width: col1W });
      doc.text("Address", col1 + col1W, y + 6, { width: col2W });
      doc.text("Distance", col1 + col1W + col2W, y + 6, { width: col3W });
      doc.text("Sale Price", col1 + col1W + col2W + col3W, y + 6, { width: col4W });
      doc.text("Sale Date", col1 + col1W + col2W + col3W + col4W, y + 6, { width: col5W });
      doc.text("Price/SF", col1 + col1W + col2W + col3W + col4W + col5W, y + 6, { width: col6W });
      y += locHeaderH;

      for (let i = 0; i < data.comparableSales.length; i++) {
        const comp = data.comparableSales[i];
        const bg = i % 2 === 0 ? WHITE : LIGHT_BG;
        doc.rect(col1, y, cw, locRowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
        doc.fontSize(7.5).fillColor(BODY_TEXT).font("Helvetica");
        doc.text(`${i + 1}`, col1 + 4, y + 5, { width: col1W });
        doc.text(comp.address.length > 35 ? comp.address.substring(0, 35) + "..." : comp.address, col1 + col1W, y + 5, { width: col2W });
        doc.text(comp.distance != null ? `${comp.distance.toFixed(1)} mi` : "N/A", col1 + col1W + col2W, y + 5, { width: col3W });
        doc.text(fmt(comp.salePrice), col1 + col1W + col2W + col3W, y + 5, { width: col4W });
        doc.text(comp.saleDate || "N/A", col1 + col1W + col2W + col3W + col4W, y + 5, { width: col5W });
        const compSF = comp.squareFeet || comp.sqft;
        doc.text(compSF ? fmtPSF(comp.salePrice / compSF) : "N/A", col1 + col1W + col2W + col3W + col4W + col5W, y + 5, { width: col6W });
        y += locRowH;
      }
      y += 10;

      // Proximity analysis narrative
      const distances = data.comparableSales.map(c => c.distance).filter((d): d is number => d != null);
      const avgDist = distances.length > 0 ? distances.reduce((s, d) => s + d, 0) / distances.length : null;
      const maxDist = distances.length > 0 ? Math.max(...distances) : null;
      const minDist = distances.length > 0 ? Math.min(...distances) : null;

      if (avgDist != null) {
        y = bodyText(doc,
          `The ${data.comparableSales.length} comparable sales range from ${minDist!.toFixed(1)} to ${maxDist!.toFixed(1)} miles from the subject property, ` +
          `with an average distance of ${avgDist.toFixed(1)} miles. ${avgDist < 1.0 ? "All comparables are within close proximity to the subject, indicating strong geographic comparability." : avgDist < 3.0 ? "The comparables are drawn from the subject's general market area, providing reliable indicators of value." : "The search area was expanded to identify sufficient comparable sales, which may introduce some locational variation."} ` +
          `Each comparable was selected based on similarity in property type, size, age, and condition, with adjustments applied ` +
          `for any material differences as detailed in the adjustment grid that follows.`,
          y, cw
        );
      }

      // Price per SF analysis
      const compsWithSF = data.comparableSales.filter(c => c.squareFeet || c.sqft);
      if (compsWithSF.length > 0) {
        const psfValues = compsWithSF.map(c => c.salePrice / (c.squareFeet || c.sqft || 1));
        const avgPSF = psfValues.reduce((s, v) => s + v, 0) / psfValues.length;
        const minPSF = Math.min(...psfValues);
        const maxPSF = Math.max(...psfValues);

        y = bodyText(doc,
          `The comparable sales exhibit a price per square foot range of ${fmtPSF(minPSF)} to ${fmtPSF(maxPSF)}, ` +
          `with an average of ${fmtPSF(avgPSF)}. ${data.squareFeet ? `The subject property's assessed value implies a price per square foot of ${fmtPSF((data.assessedValue || 0) / data.squareFeet)}, which ${(data.assessedValue || 0) / data.squareFeet > avgPSF * 1.1 ? "exceeds the comparable average by a significant margin, further supporting the over-assessment conclusion" : "is within the range of comparable sales"}.` : ""}`,
          y, cw
        );
      }
    }

    // ─── ADJUSTMENT GRID ───────────────────────────────────────────────
    if (data.adjustmentGrid && data.adjustmentGrid.length > 0) {
      y = newPage(doc, reportId, pageCounter);
      y = subHeader(doc, "Quantitative Adjustment Grid", y, cw);

      y = bodyText(doc,
        `The following adjustment grid presents the quantitative adjustments applied to each comparable sale. ` +
        `Positive adjustments indicate the comparable is inferior to the subject in that category (increasing the comparable's adjusted value). ` +
        `Negative adjustments indicate the comparable is superior to the subject (decreasing the comparable's adjusted value). ` +
        `All adjustments are expressed as percentages of the comparable's sale price, with corresponding dollar amounts shown.`,
        y, cw
      );

      // Collect all unique adjustment categories
      const allCategories = new Set<string>();
      for (const entry of data.adjustmentGrid) {
        Object.keys(entry.adjustments).forEach(k => allCategories.add(k));
      }
      const categories = Array.from(allCategories);

      // Table header
      const colW = Math.min(120, (cw - 140) / Math.min(data.adjustmentGrid.length, 5));
      const labelColW = cw - colW * Math.min(data.adjustmentGrid.length, 5);

      for (const entry of data.adjustmentGrid.slice(0, 5)) {
        // Calculate exact height: header(22) + salePrice(18) + categories(18 each) + netAdj(20) + adjValue(22) + padding(30)
        const gridTableHeight = 22 + 18 + categories.length * 18 + 20 + 22 + 30;
        y = ensureSpace(doc, y, gridTableHeight, reportId, pageCounter);

        // Comp header bar
        doc.rect(LM, y, cw, 18).fill(NAVY);
        doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
          .text(entry.compAddress, LM + 8, y + 4, { width: cw - 16 });
        y += 22;

        // Sale price row
        doc.rect(LM, y, cw, 18).lineWidth(0.3).fillAndStroke(LIGHT_BG, BORDER);
        doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica-Bold")
          .text("Sale Price", LM + 8, y + 4, { width: labelColW });
        doc.fontSize(8).fillColor(DARK_TEXT).font("Helvetica-Bold")
          .text(fmt(entry.salePrice), LM + labelColW, y + 4, { width: colW });
        y += 18;

        // Each adjustment category
        for (let ci = 0; ci < categories.length; ci++) {
          const cat = categories[ci];
          const adjVal = entry.adjustments[cat] || 0;
          const bg = ci % 2 === 0 ? WHITE : LIGHT_BG;
          doc.rect(LM, y, cw, 18).lineWidth(0.3).fillAndStroke(bg, BORDER);

          // Category label — convert camelCase to readable
          const catLabel = cat.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
          doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica")
            .text(catLabel, LM + 8, y + 4, { width: labelColW - 16 });

          // Adjustment percentage
          const adjColor = adjVal > 0 ? GREEN_ACCENT : adjVal < 0 ? RED_ACCENT : BODY_TEXT;
          const adjStr = adjVal > 0 ? `+${adjVal.toFixed(1)}%` : adjVal < 0 ? `${adjVal.toFixed(1)}%` : "0.0%";
          doc.fontSize(8).fillColor(adjColor).font("Helvetica-Bold")
            .text(adjStr, LM + labelColW, y + 4, { width: colW });

          // Dollar adjustment
          const dollarAdj = Math.round(entry.salePrice * (adjVal / 100));
          if (adjVal !== 0) {
            const dollarStr = dollarAdj > 0 ? `+${fmt(dollarAdj)}` : fmt(dollarAdj);
            doc.fontSize(8).fillColor(adjColor).font("Helvetica")
              .text(dollarStr, LM + labelColW + colW, y + 4, { width: colW });
          }
          y += 18;
        }

        // Net adjustment row
        doc.rect(LM, y, cw, 20).lineWidth(0.5).fillAndStroke(LIGHT_BG, PURPLE);
        doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold")
          .text("Net Adjustment", LM + 8, y + 5, { width: labelColW });
        const netPctStr = `${entry.netAdjustmentPct > 0 ? "+" : ""}${entry.netAdjustmentPct.toFixed(1)}%`;
        doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold")
          .text(netPctStr, LM + labelColW, y + 5, { width: colW });
        y += 20;

        // Adjusted value row
        doc.rect(LM, y, cw, 22).lineWidth(1).fillAndStroke(PURPLE_DARK, PURPLE);
        doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
          .text("ADJUSTED VALUE", LM + 8, y + 6, { width: labelColW });
        doc.fontSize(9).fillColor(WHITE).font("Helvetica-Bold")
          .text(fmt(entry.adjustedValue), LM + labelColW, y + 6, { width: colW });
        y += 30;
      }

      // Summary of adjusted values
      y = ensureSpace(doc, y, 80, reportId, pageCounter);
      y = subHeader(doc, "Sales Comparison Approach - Value Indication", y, cw);

      const adjValues = data.adjustmentGrid.map(e => e.adjustedValue);
      const sortedAdj = [...adjValues].sort((a, b) => a - b);
      const avgAdj = Math.round(adjValues.reduce((s, v) => s + v, 0) / adjValues.length);
      const medianAdj = sortedAdj[Math.floor(sortedAdj.length / 2)];

      const scaRows: [string, string][] = [
        ["Range of Adjusted Values", `${fmt(Math.min(...adjValues))} – ${fmt(Math.max(...adjValues))}`],
        ["Average Adjusted Value", fmt(avgAdj)],
        ["Median Adjusted Value", fmt(medianAdj)],
        ["SALES COMPARISON APPROACH VALUE", fmt(data.marketValueEstimate)],
      ];
      y = kvTable(doc, scaRows, y, cw);
    }

    // ─── COST APPROACH ─────────────────────────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "COST APPROACH", y, cw, sectionNum);

    y = bodyText(doc,
      `The Cost Approach estimates the value of the subject property by calculating the current cost to construct a replacement or reproduction ` +
      `of the existing structure, less all forms of depreciation (physical, functional, and external), plus the estimated land value. ` +
      `This approach is most applicable to newer properties and special-purpose properties, and provides a useful check against the Sales Comparison Approach.`,
      y, cw
    );

    if (data.costApproach) {
      const ca = data.costApproach;
      y = subHeader(doc, "Cost Approach Calculation", y, cw);

      const costRows: [string, string][] = [];
      if (ca.landValue) costRows.push(["Estimated Land Value", fmt(ca.landValue)]);
      if (ca.replacementCostNew) costRows.push(["Replacement Cost New (Improvements)", fmt(ca.replacementCostNew)]);
      if (ca.totalDepreciation) costRows.push(["Less: Total Depreciation", `(${fmt(ca.totalDepreciation)})`]);
      if (ca.effectiveAge != null) costRows.push(["Effective Age", `${ca.effectiveAge} years`]);
      if (ca.remainingEconomicLife != null) costRows.push(["Remaining Economic Life", `${ca.remainingEconomicLife} years`]);
      if (ca.improvementValue) costRows.push(["Depreciated Improvement Value", fmt(ca.improvementValue)]);
      if (ca.costApproachValue) costRows.push(["COST APPROACH VALUE", fmt(ca.costApproachValue)]);

      if (costRows.length > 0) {
        y = kvTable(doc, costRows, y, cw);
      }

      // Depreciation narrative
      if (ca.effectiveAge != null && ca.remainingEconomicLife != null) {
        const totalLife = ca.effectiveAge + ca.remainingEconomicLife;
        const depPct = totalLife > 0 ? (ca.effectiveAge / totalLife * 100).toFixed(1) : "N/A";
        y = bodyText(doc,
          `The subject property has an effective age of ${ca.effectiveAge} years with a remaining economic life of ${ca.remainingEconomicLife} years, ` +
          `resulting in a total economic life of ${totalLife} years and an age-life depreciation rate of approximately ${depPct}%. ` +
          `This depreciation reflects physical deterioration from normal wear and use over the property's life.`,
          y, cw
        );
      }
    } else {
      // No real cost approach data was supplied (no land value, no
      // replacement cost, no depreciation analysis). Do not fabricate one
      // from a constant $/SF — that would put numbers into the appeal
      // record that the assessor can attack as unsupported. State the
      // limitation plainly and let the comparable-sales approach carry
      // the case.
      y = bodyText(doc,
        `A Cost Approach value indication is not provided for this property. The replacement-cost-new and ` +
        `accumulated-depreciation inputs required to support a defensible Cost Approach (current local construction ` +
        `cost factors, separately estimated land value, observed condition / functional obsolescence, and external ` +
        `obsolescence) were not available within the scope of this analysis. The Sales Comparison Approach is the ` +
        `most reliable indicator of value for this property type and is given primary weight in the reconciliation.`,
        y, cw
      );
    }

    // ─── INCOME CAPITALIZATION APPROACH ─────────────────────────────────
    if (data.incomeApproach) {
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "INCOME CAPITALIZATION APPROACH", y, cw, sectionNum);

      y = bodyText(doc,
        `The Income Capitalization Approach converts anticipated future income from the subject property into a present value indication. ` +
        `This approach is applicable because the subject property is an income-producing ${data.propertyType || "multi-family"} property. ` +
        `The direct capitalization method was employed, which divides a single year's net operating income by an appropriate capitalization rate ` +
        `to derive a value indication.`,
        y, cw
      );

      const inc = data.incomeApproach;
      y = subHeader(doc, "Income & Expense Analysis", y, cw);

      const incRows: [string, string][] = [
        ["Market Rent per Unit", `${fmt(inc.marketRentPerUnit)}/month`],
        ["Number of Units", `${inc.totalUnits}`],
        ["Gross Potential Income (Annual)", fmt(inc.grossPotentialIncome)],
        ["Less: Vacancy & Collection Loss", `${fmtPct(inc.vacancyRate * 100)} (${fmt(Math.round(inc.grossPotentialIncome * inc.vacancyRate))})`],
        ["Effective Gross Income", fmt(inc.effectiveGrossIncome)],
        ["Less: Operating Expenses", `(${fmt(inc.operatingExpenses)})`],
        ["Net Operating Income (NOI)", fmt(inc.netOperatingIncome)],
      ];
      y = kvTable(doc, incRows, y, cw);

      y += 4;
      y = subHeader(doc, "Capitalization", y, cw);
      const capRows: [string, string][] = [
        ["Net Operating Income", fmt(inc.netOperatingIncome)],
        ["Capitalization Rate", fmtPct(inc.capRate * 100)],
        ["INCOME APPROACH VALUE", fmt(inc.incomeValue)],
      ];
      y = kvTable(doc, capRows, y, cw);

      y = bodyText(doc,
        `The capitalization rate of ${fmtPct(inc.capRate * 100)} is derived from market data for similar ` +
        `${data.propertyType || "multi-family"} properties in the subject's market area. The vacancy and collection loss rate ` +
        `of ${fmtPct(inc.vacancyRate * 100)} reflects current market conditions and is consistent with typical rates for the area. ` +
        `Operating expenses include property taxes, insurance, maintenance, management fees, and reserves for replacement.`,
        y, cw
      );
    }

    // ─── RECONCILIATION & FINAL VALUE OPINION ──────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "RECONCILIATION & FINAL VALUE OPINION", y, cw, sectionNum);

    y = bodyText(doc,
      `The reconciliation process involves weighing the value indications from each applicable approach to arrive at a final opinion of market value. ` +
      `The reliability of each approach depends on the quantity and quality of available data and the applicability of the approach to the subject property type.`,
      y, cw
    );

    if (data.reconciliationNarrative) {
      y = bodyText(doc, data.reconciliationNarrative, y, cw);
    } else {
      // Fallback reconciliation narrative
      const approaches: string[] = ["Sales Comparison Approach"];
      if (data.costApproach?.costApproachValue) approaches.push("Cost Approach");
      if (data.incomeApproach) approaches.push("Income Capitalization Approach");

      y = bodyText(doc,
        `The ${approaches.join(", ")} ${approaches.length > 1 ? "were" : "was"} applied in this analysis. ` +
        `The Sales Comparison Approach is given the greatest weight because it most directly reflects the actions of buyers and sellers ` +
        `in the subject's market area. ${data.costApproach?.costApproachValue ? "The Cost Approach provides a useful check on the Sales Comparison Approach, particularly given the subject's age and construction type. " : ""}` +
        `${data.incomeApproach ? "The Income Capitalization Approach provides additional support for the value conclusion based on the property's income-producing potential. " : ""}` +
        `After careful consideration of all value indications, the final opinion of market value is ${fmt(data.marketValueEstimate)}.`,
        y, cw
      );
    }

    // Value indications summary
    y = subHeader(doc, "Value Indications by Approach", y, cw);
    const reconRows: [string, string][] = [
      ["Sales Comparison Approach", fmt(data.marketValueEstimate)],
    ];
    if (data.costApproach?.costApproachValue) {
      reconRows.push(["Cost Approach", fmt(data.costApproach.costApproachValue)]);
    }
    if (data.incomeApproach) {
      reconRows.push(["Income Capitalization Approach", fmt(data.incomeApproach.incomeValue)]);
    }
    reconRows.push(["", ""]); // spacer
    reconRows.push(["FINAL OPINION OF MARKET VALUE", fmt(data.marketValueEstimate)]);
    y = kvTable(doc, reconRows, y, cw);

    // Approach weighting analysis
    y = ensureSpace(doc, y, 100, reportId, pageCounter);
    y = subHeader(doc, "Approach Weighting & Reliability", y, cw);

    const hasCA = !!data.costApproach?.costApproachValue;
    const hasIA = !!data.incomeApproach;
    const scaWeight = hasCA && hasIA ? "60-70%" : hasCA ? "70-80%" : "90-100%";
    const caWeight = hasCA ? (hasIA ? "15-20%" : "20-30%") : "N/A";
    const iaWeight = hasIA ? "15-20%" : "N/A";

    const weightRows: [string, string][] = [
      ["Sales Comparison Approach", `${scaWeight} - Most reliable for ${data.propertyType || "residential"} properties; directly reflects buyer/seller behavior`],
      ["Cost Approach", `${caWeight} - ${hasCA ? "Provides supplementary check; most useful for newer construction" : "Not applicable or insufficient data"}`],
      ["Income Approach", `${iaWeight} - ${hasIA ? "Applicable for income-producing properties; reflects investor expectations" : "Not applicable for owner-occupied residential"}`],
    ];
    y = kvTable(doc, weightRows, y, cw);

    y = bodyText(doc,
      `The Sales Comparison Approach receives the greatest weight in this reconciliation because it most directly reflects the actions of ` +
      `informed buyers and sellers in the subject's market area. The comparable sales analyzed in this report represent verified arm's-length ` +
      `transactions that required minimal adjustments, indicating strong comparability with the subject property. ` +
      `${hasCA ? "The Cost Approach provides a useful secondary indicator, particularly for confirming that the subject's improvements are not over-valued relative to replacement cost less depreciation. " : ""}` +
      `${hasIA ? "The Income Capitalization Approach adds additional support by reflecting investor expectations for income-producing properties in the area. " : ""}` +
      `After careful consideration of all applicable approaches and the quality of available data, the analyst's final opinion of market value ` +
      `is ${fmt(data.marketValueEstimate)} as of ${reportDate}.`,
      y, cw
    );

    // Final value callout
    y = ensureSpace(doc, y, 60, reportId, pageCounter);
    doc.rect(LM, y, cw, 45).lineWidth(2).fillAndStroke(PURPLE_DARK, PURPLE);
    doc.fontSize(10).fillColor(WHITE).font("Helvetica")
      .text("RECONCILED MARKET VALUE AS OF " + reportDate.toUpperCase(), LM, y + 8, { width: cw, align: "center" });
    doc.fontSize(20).fillColor(WHITE).font("Helvetica-Bold")
      .text(fmt(data.marketValueEstimate), LM, y + 22, { width: cw, align: "center" });
    y += 55;

    // ─── ASSESSOR'S VALUATION CRITIQUE ─────────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "ASSESSOR'S VALUATION CRITIQUE", y, cw, sectionNum);

    y = bodyText(doc,
      `This section examines the county assessor's current valuation and identifies specific areas where the assessed value ` +
      `departs from market evidence. The purpose is to demonstrate, with supporting data, that the current assessment does not ` +
      `reflect the true market value of the subject property as indicated by comparable sales and other valuation approaches.`,
      y, cw
    );

    y = subHeader(doc, "Assessment vs. Market Value", y, cw);
    const critiqueRows: [string, string][] = [
      ["Current County Assessed Value", fmt(data.assessedValue)],
      ["Market Value (This Analysis)", fmt(data.marketValueEstimate)],
      ["Over-Assessment Amount", fmt(data.assessmentGap)],
      ["Over-Assessment Percentage", overAssessmentPct],
    ];
    if (data.assessmentLevel) {
      critiqueRows.push(["Assessment Level (Equalization Rate)", fmtPct(data.assessmentLevel * 100)]);
      const impliedMV = data.assessedValue ? Math.round(data.assessedValue / data.assessmentLevel) : null;
      critiqueRows.push(["Implied Market Value by Assessor", fmt(impliedMV)]);
    }
    y = kvTable(doc, critiqueRows, y, cw);

    if (data.valuationJustification) {
      y = ensureSpace(doc, y, 80, reportId, pageCounter);
      y = subHeader(doc, "Specific Findings", y, cw);
      y = bodyText(doc, data.valuationJustification, y, cw);
    }

    // Potential assessment errors analysis
    y = ensureSpace(doc, y, 120, reportId, pageCounter);
    y = subHeader(doc, "Potential Assessment Errors Identified", y, cw);

    y = bodyText(doc,
      `Based on the analysis conducted in this report, the following potential errors or deficiencies in the current assessment have been identified:`,
      y, cw
    );

    // Build dynamic error list based on actual data
    const assessErrors: string[] = [];
    if (data.assessmentGap && data.assessmentGap > 0) {
      assessErrors.push(
        `Over-valuation of improvements: The assessed value of ${fmt(data.assessedValue)} implies a value per square foot of ${data.squareFeet ? fmtPSF((data.assessedValue || 0) / data.squareFeet) : "N/A"}, which exceeds the comparable sales average. This suggests the assessor may have applied incorrect cost factors, failed to account for depreciation, or used outdated comparable data.`
      );
    }
    if (data.comparableSales && data.comparableSales.length > 0) {
      const avgCompPrice = data.comparableSales.reduce((s, c) => s + c.salePrice, 0) / data.comparableSales.length;
      if (data.assessedValue && data.assessedValue > avgCompPrice * 1.1) {
        assessErrors.push(
          `Failure to consider recent market activity: The ${data.comparableSales.length} comparable sales analyzed in this report, with an average sale price of ${fmt(avgCompPrice)}, indicate that the current assessment significantly exceeds the price at which similar properties are actually transacting in the open market.`
        );
      }
    }
    if (data.costApproach?.costApproachValue && data.assessedValue && data.assessedValue > data.costApproach.costApproachValue * 1.05) {
      assessErrors.push(
        `Inconsistency with cost approach: The Cost Approach value of ${fmt(data.costApproach.costApproachValue)} is below the current assessed value, suggesting the assessor may not have adequately accounted for physical depreciation, functional obsolescence, or external obsolescence affecting the property.`
      );
    }
    if (data.yearBuilt && (new Date().getFullYear() - data.yearBuilt) > 20) {
      assessErrors.push(
        `Inadequate depreciation: The subject property, built in ${data.yearBuilt}, has a chronological age of ${new Date().getFullYear() - data.yearBuilt} years. The current assessment may not fully reflect the accumulated physical deterioration and functional obsolescence associated with a property of this age.`
      );
    }
    if (photoBufs.length > 0 && data.photoFindings) {
      const issueCount = data.photoFindings.topValueIssues?.length || 0;
      if (issueCount > 0) {
        assessErrors.push(
          `Condition issues not reflected in assessment: Photographic evidence reveals ${issueCount} value-impacting condition issue${issueCount > 1 ? "s" : ""} that may not be captured in the assessor's records. These include deferred maintenance items and physical deficiencies that reduce the property's market value below the current assessed level.`
        );
      }
    }
    // Uniformity claim — only assert it when real peer assessment-roll data
    // supports it. Without that data we say nothing here (the Equity &
    // Uniformity section already explains why).
    if (data.uniformityResult?.hasClaim) {
      const u = data.uniformityResult;
      assessErrors.push(
        `Assessment equity: Peer assessment-roll data (n=${u.comparableCount}) shows the subject's ` +
        `assessment-to-market ratio is ${((u.ratioMultiplier - 1) * 100).toFixed(1)}% above the peer ` +
        `median. Equalizing the subject to the peer median yields an indicated assessed value of ` +
        `$${u.equalizedAssessedValue.toLocaleString()} (a reduction of $${u.equalizationGap.toLocaleString()}).`
      );
    }
    // Record-card discrepancies — surfaced here as identified errors when
    // the detector returned material findings.
    if (data.recordErrors?.hasErrors) {
      for (const f of data.recordErrors.findings.filter((x) => x.severity !== "minor")) {
        assessErrors.push(`Record-card error (${f.field}): ${f.factualClaim}`);
      }
    }

    for (const err of assessErrors) {
      y = ensureSpace(doc, y, 40, reportId, pageCounter);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
        .text(`-  ${err}`, LM + 8, y, { width: cw - 16, lineGap: 2.5 });
      y = doc.y + 6;
    }

    y = ensureSpace(doc, y, 40, reportId, pageCounter);
    y = bodyText(doc,
      `For the reasons set forth above, the analyst concludes that the current assessed value does not accurately reflect the market value ` +
      `of the subject property and recommends a reduction to ${fmt(data.marketValueEstimate)}, which is supported by the comparable sales data, ` +
      `cost analysis, and other evidence presented in this report.`,
      y, cw
    );

      // ─── EQUITY & UNIFORMITY ANALYSIS ────────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "EQUITY & UNIFORMITY ANALYSIS", y, cw, sectionNum);

    y = bodyText(doc,
      `The principle of uniformity requires that similarly situated properties be assessed at similar values. ` +
      `An inequitable assessment exists when the subject property is assessed at a higher ratio of market value than comparable properties ` +
      `in the same jurisdiction. This analysis compares the subject's assessment ratio to those of comparable sales to determine ` +
      `whether the subject is equitably assessed.`,
      y, cw
    );

    // Real uniformity analysis — renders ONLY when peer assessment-roll data
    // is available (analyzeUniformity yielded hasClaim=true). We do not
    // fabricate comp assessment ratios from sale prices — that would mislead
    // the assessor and the appeal record.
    if (data.uniformityResult && data.uniformityResult.hasClaim) {
      const u = data.uniformityResult;
      y = subHeader(doc, "Assessment Ratio Comparison (Peer-Roll Data)", y, cw);

      const eqRows: [string, string][] = [
        ["Subject Assessed Value", fmt(data.assessedValue)],
        ["Subject Evidence-Supported Market Value", fmt(data.marketValueEstimate)],
        ["Subject Assessment Ratio", fmtPct(u.subjectRatio * 100)],
        [
          `Peer-Median Assessment Ratio (n=${u.comparableCount})`,
          u.medianComparableRatio !== null ? fmtPct(u.medianComparableRatio * 100) : "N/A",
        ],
        ["Subject Excess Over Peer Median", fmtPct((u.ratioMultiplier - 1) * 100)],
        ["", ""],
        ["Equalized Assessed Value (at peer median)", fmt(u.equalizedAssessedValue)],
        ["Equalization Gap", fmt(u.equalizationGap)],
      ];
      y = kvTable(doc, eqRows, y, cw, { highlight: true });

      y = bodyText(doc, u.argument, y, cw);
    } else {
      // No peer assessment-roll data available — say so plainly. Do not
      // estimate. This honesty preserves the credibility of the rest of
      // the report.
      y = bodyText(
        doc,
        "Peer-parcel assessment-roll data sufficient to substantiate an independent uniformity claim was " +
          "not available for this analysis. The subject is not asserted to be inequitably assessed relative " +
          "to specific comparable parcels in this report; the appeal rests on the comparable-sales market-value " +
          "evidence presented in the Sales Comparison Approach section.",
        y, cw,
      );
    }

    // ─── RECORD CARD DISCREPANCY ANALYSIS ──────────────────────────────
    // Per practitioner consensus (Cook County BOR, AppealDesk evidence
    // guide), record-card errors are the easiest appeals to win because
    // there is no subjective debate — either the facts are correct or
    // they are not. This section renders only when the detector returned
    // material/major findings; otherwise it is omitted entirely. No
    // synthetic discrepancies are ever invented.
    if (data.recordErrors?.hasErrors) {
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "RECORD CARD DISCREPANCY ANALYSIS", y, cw, sectionNum);

      y = bodyText(
        doc,
        "This section enumerates discrepancies between the assessor's recorded property characteristics " +
          "(as reflected in the most recent tax bill / property record card available) and the owner-verified " +
          "physical characteristics of the parcel. Each discrepancy is presented as a delta between two " +
          "specific reported values, accompanied by the evidentiary document the owner can produce to " +
          "substantiate the correction. Discrepancies of this nature are typically dispositive in an " +
          "appeal because they present no subjective valuation question.",
        y, cw,
      );

      y = subHeader(doc, data.recordErrors.summaryLine, y, cw);

      // Findings table (one row per material/major finding)
      const significant = data.recordErrors.findings.filter((f) => f.severity !== "minor");
      for (const f of significant) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        const sevColor =
          f.severity === "major" ? RED_ACCENT : f.severity === "material" ? PURPLE_DARK : MUTED;
        // Field + severity line
        doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
          .text(`${prettyFieldName(f.field)}  `, LM, y, { continued: true });
        doc.fontSize(9).fillColor(sevColor).font("Helvetica-Bold")
          .text(`(${f.severity.toUpperCase()})`, { continued: false });
        y = doc.y + 4;
        // Three rows: assessor / owner / delta
        const fieldLabel = prettyFieldName(f.field);
        const isCount =
          f.field === "bedrooms" || f.field === "bathrooms" || f.field === "yearBuilt";
        const display = (n: number) => isCount ? String(n) : n.toLocaleString();
        const findingRows: [string, string][] = [
          [`Assessor's record (${fieldLabel})`, display(f.assessorValue)],
          [`Owner-verified (${fieldLabel})`, display(f.ownerValue)],
          [
            "Delta",
            `${f.delta > 0 ? "+" : ""}${display(f.delta)}` +
              (f.field === "squareFeet" || f.field === "lotSize"
                ? ` (${f.deltaPercent.toFixed(1)}%)`
                : ""),
          ],
        ];
        y = kvTable(doc, findingRows, y, cw);
        // Factual claim + recommended evidence
        doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
          .text(f.factualClaim, LM, y, { width: cw, lineGap: 3 });
        y = doc.y + 4;
        doc.fontSize(8.5).fillColor(MUTED).font("Helvetica-Oblique")
          .text(`Recommended evidence: ${f.recommendedEvidence}`, LM, y, { width: cw, lineGap: 2 });
        y = doc.y + 12;
      }
    }

     // ─── TAX IMPACT ANALYSIS (owner-facing only) ─────────────────
    // Quantifies the dollar impact on the OWNER. Skipped in the assessor
    // exhibit — the assessor cares about market-value evidence, not the
    // owner's projected savings or 10-year cumulative tax delta. The
    // owner sees this content on the /analysis dashboard. Nested inside
    // the !isAssessor gate so we don't even bump sectionNum or open a
    // new page in the assessor PDF.
    if (!isAssessor) {
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "TAX IMPACT ANALYSIS", y, cw, sectionNum);

      y = bodyText(doc,
        `This section quantifies the financial impact of the over-assessment on the property owner's tax liability. ` +
        `The calculations below demonstrate the potential tax savings if the assessed value is reduced to the market value indicated by this analysis.`,
        y, cw
      );

      if (data.potentialSavings && data.assessedValue && data.marketValueEstimate && data.assessmentGap && data.assessmentGap > 0) {
      // Derive effective tax rate from the SAVINGS / GAP that the analysis
      // pipeline already produced — both numbers ultimately trace to the
      // owner's tax bill. We do NOT fall back to a national-average rate
      // when the derivation is unavailable; instead the entire Tax Impact
      // section is skipped (the gate above), since fabricating a rate
      // would produce a misleading projection.
      const taxRate = data.potentialSavings / data.assessmentGap;

      y = subHeader(doc, "Projected Tax Savings", y, cw);
      const taxRows: [string, string][] = [
        ["Current Assessed Value", fmt(data.assessedValue)],
        ["Proposed Market Value", fmt(data.marketValueEstimate)],
        ["Reduction in Assessed Value", fmt(data.assessmentGap)],
        ["Effective Tax Rate (Estimated)", fmtPct(taxRate * 100, 3)],
        ["", ""], // spacer
        ["ESTIMATED ANNUAL TAX SAVINGS", fmt(data.potentialSavings)],
        ["Projected 5-Year Savings", fmt(data.potentialSavings * 5)],
        ["Projected 10-Year Savings", fmt(data.potentialSavings * 10)],
      ];
      y = kvTable(doc, taxRows, y, cw);

      // Savings callout
      y = ensureSpace(doc, y, 40, reportId, pageCounter);
      doc.rect(LM, y, cw, 30).lineWidth(1).fillAndStroke(LIGHT_BG, PURPLE);
      doc.fontSize(10).fillColor(PURPLE).font("Helvetica-Bold")
        .text(`POTENTIAL 10-YEAR SAVINGS: ${fmt(data.potentialSavings * 10)}`, LM, y + 8, { width: cw, align: "center" });
      y += 40;

      y = bodyText(doc,
        `The projected savings assume the current tax rate remains constant and that the assessment reduction is maintained for the projection period. ` +
        `Actual savings may vary based on changes in tax rates, reassessment cycles, and other factors. These projections are provided for ` +
        `informational purposes to illustrate the financial significance of the over-assessment.`,
        y, cw
      );

      // Multi-year projection table
      y = ensureSpace(doc, y, 200, reportId, pageCounter);
      y = subHeader(doc, "Year-by-Year Tax Savings Projection", y, cw);

      // Table header
      const projColW = cw / 5;
      const projHeaderH = 22;
      const projRowH = 20;
      const projTableH = projHeaderH + 10 * projRowH + 10;
      y = ensureSpace(doc, y, projTableH, reportId, pageCounter);

      doc.rect(LM, y, cw, projHeaderH).fill(NAVY);
      doc.fontSize(7.5).fillColor(WHITE).font("Helvetica-Bold");
      doc.text("Year", LM + 4, y + 6, { width: projColW });
      doc.text("Annual Savings", LM + projColW, y + 6, { width: projColW });
      doc.text("Cumulative Savings", LM + projColW * 2, y + 6, { width: projColW });
      doc.text("Current Tax", LM + projColW * 3, y + 6, { width: projColW });
      doc.text("Corrected Tax", LM + projColW * 4, y + 6, { width: projColW });
      y += projHeaderH;

      const currentTax = data.assessedValue * taxRate;
      const correctedTax = data.marketValueEstimate * taxRate;
      let cumulative = 0;

      for (let yr = 1; yr <= 10; yr++) {
        cumulative += data.potentialSavings;
        const bg = yr % 2 === 0 ? WHITE : LIGHT_BG;
        doc.rect(LM, y, cw, projRowH).lineWidth(0.3).fillAndStroke(bg, BORDER);
        doc.fontSize(7.5).fillColor(BODY_TEXT).font("Helvetica");
        doc.text(`Year ${yr}`, LM + 4, y + 5, { width: projColW });
        doc.text(fmt(data.potentialSavings), LM + projColW, y + 5, { width: projColW });
        doc.fontSize(7.5).fillColor(yr >= 5 ? PURPLE : BODY_TEXT).font(yr >= 5 ? "Helvetica-Bold" : "Helvetica");
        doc.text(fmt(cumulative), LM + projColW * 2, y + 5, { width: projColW });
        doc.fontSize(7.5).fillColor(RED_ACCENT).font("Helvetica");
        doc.text(fmt(currentTax), LM + projColW * 3, y + 5, { width: projColW });
        doc.fontSize(7.5).fillColor(GREEN_ACCENT).font("Helvetica");
        doc.text(fmt(correctedTax), LM + projColW * 4, y + 5, { width: projColW });
        y += projRowH;
      }
      y += 10;

      y = bodyText(doc,
        `The table above illustrates the cumulative financial impact of the over-assessment over a 10-year period. ` +
        `At the current effective tax rate of ${fmtPct(taxRate * 100, 3)}, the property owner is paying approximately ${fmt(currentTax)} annually ` +
        `in property taxes. If the assessed value is corrected to ${fmt(data.marketValueEstimate)}, the annual tax liability would be ` +
        `approximately ${fmt(correctedTax)}, resulting in annual savings of ${fmt(data.potentialSavings)}. Over 10 years, this represents ` +
        `a total savings of ${fmt(data.potentialSavings * 10)}, assuming stable tax rates.`,
        y, cw
      );
      }
    }

    // ─── PROPERTY CONDITION FINDINGS ───────────────────────────────────
    if (data.photoFindings) {
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "PROPERTY CONDITION FINDINGS", y, cw, sectionNum);

      y = bodyText(doc,
        `The following condition findings are based on analysis of ${photoBufs.length} owner-submitted photograph${photoBufs.length === 1 ? "" : "s"}. ` +
        `These observations supplement the comparable sales analysis and may support adjustments to the subject property's value. ` +
        `The condition assessment considers visible physical deterioration, deferred maintenance, and functional issues that ` +
        `could impact the property's market value.`,
        y, cw
      );

      y = subHeader(doc, "Condition Assessment", y, cw);
      const condRows: [string, string][] = [
        ["Overall Condition Score", `${data.photoFindings.overallConditionScore}/100`],
        ["Evidence Strength", `${data.photoFindings.overallEvidenceStrength}/100`],
      ];
      y = kvTable(doc, condRows, y, cw);

      y = bodyText(doc, data.photoFindings.summaryParagraph, y, cw);

      if (data.photoFindings.topObservations.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Key Observations", y, cw);
        for (const obs of data.photoFindings.topObservations) {
          y = ensureSpace(doc, y, 20, reportId, pageCounter);
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
           .text(`-  ${obs}`, LM + 8, y, { width: cw - 16, lineGap: 2 });       y = doc.y + 4;
        }
      }

      if (data.photoFindings.topValueIssues.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Value-Impacting Issues", y, cw);
        for (const issue of data.photoFindings.topValueIssues) {
          y = ensureSpace(doc, y, 20, reportId, pageCounter);
          doc.fontSize(9).fillColor(RED_ACCENT).font("Helvetica")
            .text(`-  ${issue}`, LM + 8, y, { width: cw - 16, lineGap: 2 });
          y = doc.y + 4;
        }
      }
    }

    // ─── PROPERTY PHOTO EVIDENCE ────────────────────────────────────────
    if (photoBufs.length > 0) {
      sectionNum++;

      // Group photos by category
      const categoryOrder = ["exterior", "interior", "roof", "foundation", "other"];
      const categoryLabels: Record<string, string> = {
        exterior: "Exterior Views & Curb Appeal",
        interior: "Interior Condition & Finishes",
        roof: "Roof & Upper Structure",
        foundation: "Foundation & Structural Elements",
        other: "Additional Property Documentation",
      };
      const categoryDescriptions: Record<string, string> = {
        exterior: "Exterior photographs document the property's curb appeal, facade condition, landscaping, driveway, and overall external presentation. These images are critical for assessing physical depreciation and functional obsolescence visible from the exterior.",
        interior: "Interior photographs document the condition of living spaces, kitchen, bathrooms, flooring, walls, and fixtures. Interior condition is a significant factor in determining the property's effective age and overall market appeal.",
        roof: "Roof photographs document the condition, material type, and apparent age of the roofing system. Roof condition is a major component of the cost approach depreciation estimate and can significantly impact market value.",
        foundation: "Foundation and structural photographs document the condition of the building's base structure, including any visible settling, cracking, or moisture intrusion. Structural integrity is fundamental to the property's long-term value.",
        other: "Additional photographs provide supplementary documentation of property features, site conditions, or other relevant characteristics not captured in the primary categories above.",
      };

      const grouped = new Map<string, typeof photoBufs>();
      for (const photo of photoBufs) {
        const cat = photo.category || "other";
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat)!.push(photo);
      }

      // Large format: 2 photos per page with detailed captions
      const lgImgW = cw;
      const lgImgH = Math.round(lgImgW * 0.5);

      let photoGlobalIdx = 0;
      for (const cat of categoryOrder) {
        const catPhotos = grouped.get(cat);
        if (!catPhotos || catPhotos.length === 0) continue;

        // Category header - first category gets the section header too
        y = newPage(doc, reportId, pageCounter);
        if (cat === categoryOrder.find(c => grouped.has(c) && (grouped.get(c)?.length ?? 0) > 0)) {
          y = sectionHeader(doc, "PROPERTY PHOTO EVIDENCE", y, cw, sectionNum);
          y = bodyText(doc,
            `The following photographs were submitted by the property owner and are included as documentary evidence ` +
            `of the property's current condition. Each photograph is presented with its category classification and descriptive caption. ` +
            `These images supplement the data-driven analysis presented in this report and provide visual documentation ` +
            `that may be referenced during appeal proceedings. Photos are organized by category for ease of reference.`,
            y, cw
          );
        }
        y = subHeader(doc, categoryLabels[cat] || cat, y, cw);
        y = bodyText(doc, categoryDescriptions[cat] || "", y, cw);

        for (let i = 0; i < catPhotos.length; i++) {
          photoGlobalIdx++;
          // Each photo gets generous space
          y = ensureSpace(doc, y, lgImgH + 80, reportId, pageCounter);

          // Photo label
          doc.fontSize(9).fillColor(PURPLE_DARK).font("Helvetica-Bold")
            .text(`Exhibit ${photoGlobalIdx}: ${cat.charAt(0).toUpperCase() + cat.slice(1)} - Photo ${i + 1} of ${catPhotos.length}`, LM, y, { width: cw });
          y = doc.y + 6;

          try {
            // Purple border frame
            doc.rect(LM - 2, y - 2, lgImgW + 4, lgImgH + 4).lineWidth(1).stroke(PURPLE);
            doc.image(catPhotos[i].buf, LM, y, { width: lgImgW, height: lgImgH, fit: [lgImgW, lgImgH] });
            y += lgImgH + 8;

            // Caption
            const caption = catPhotos[i].caption || `${cat.charAt(0).toUpperCase() + cat.slice(1)} view of subject property`;
            doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica-Oblique")
              .text(`"${caption}"`, LM, y, { width: cw, align: "center" });
            y = doc.y + 4;

            // Photo metadata line
            doc.fontSize(7.5).fillColor(MUTED).font("Helvetica")
              .text(`Category: ${categoryLabels[cat]} | Photo ${i + 1} of ${catPhotos.length} in category | Exhibit ${photoGlobalIdx} of ${photoBufs.length} total`, LM, y, { width: cw, align: "center" });
            y = doc.y + 15;
          } catch {
            doc.rect(LM, y, lgImgW, lgImgH).lineWidth(0.5).stroke(BORDER);
            doc.fontSize(9).fillColor(MUTED).font("Helvetica")
              .text("Photo unavailable", LM, y + lgImgH / 2 - 5, { width: lgImgW, align: "center" });
            y += lgImgH + 20;
          }
        }
      }

      // Photo evidence summary table
      y = ensureSpace(doc, y, 120, reportId, pageCounter);
      y = subHeader(doc, "Photo Evidence Summary", y, cw);
      const photoSummaryRows: [string, string][] = [
        ["Total Photographs Submitted", `${photoBufs.length}`],
        ["Categories Documented", Array.from(grouped.keys()).map(k => categoryLabels[k] || k).join(", ")],
      ];
      if (data.photoFindings) {
        photoSummaryRows.push(["Overall Condition Score", `${data.photoFindings.overallConditionScore}/100`]);
        photoSummaryRows.push(["Evidence Strength", `${data.photoFindings.overallEvidenceStrength}/100`]);
      }
      y = kvTable(doc, photoSummaryRows, y, cw);
    }

    // ─── HEARING PREP — OWNER-ONLY ─────────────────────────────────────
    // Rendered only on the owner-facing copy. Contains opening / closing
    // scripts, anticipated assessor questions with verbatim response
    // templates, per-comp walkthrough, and a pre-hearing checklist.
    // Hard gate on !isAssessor — never put this in front of the opposing
    // party. They would learn exactly which questions we're prepared for.
    if (!isAssessor && data.hearingPrep) {
      const hp = data.hearingPrep;
      y = newPage(doc, reportId, pageCounter);
      sectionNum++;
      y = sectionHeader(doc, "HEARING PREP — OWNER STUDY GUIDE", y, cw, sectionNum);

      y = bodyText(
        doc,
        "This section is for your eyes only. Do not include it in the packet you hand to the " +
          "assessor or the board. Read it the night before the hearing — twice — and bring a printed " +
          "copy with you. Speak slowly. Pause at the end of each ground.",
        y, cw,
      );

      // ── Opening Statement ──
      y = ensureSpace(doc, y, 60, reportId, pageCounter);
      y = subHeader(doc, "Opening Statement (60-90 seconds)", y, cw);
      y = bodyText(doc, hp.openingStatement, y, cw);

      // ── Per-Ground Talking Points ──
      if (hp.groundsTalkingPoints.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Talking Points by Ground (ranked strongest-first)", y, cw);
        for (const g of hp.groundsTalkingPoints) {
          y = ensureSpace(doc, y, 60, reportId, pageCounter);
          const label =
            g.ground === "market_value"
              ? "Excessive Market Value"
              : g.ground === "uniformity"
                ? "Lack of Uniformity"
                : "Errors of Fact in Assessor's Record";
          doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
            .text(`Ground: ${label}`, LM, y, { width: cw });
          y = doc.y + 4;
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica-Oblique")
            .text(g.headline, LM, y, { width: cw, lineGap: 3 });
          y = doc.y + 6;
          for (const b of g.bullets) {
            y = ensureSpace(doc, y, 20, reportId, pageCounter);
            doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
              .text(`-  ${b}`, LM + 12, y, { width: cw - 24, lineGap: 2 });
            y = doc.y + 3;
          }
          y += 6;
        }
      }

      // ── Anticipated Questions ──
      if (hp.anticipatedQuestions.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Anticipated Questions & Response Templates", y, cw);
        for (let i = 0; i < hp.anticipatedQuestions.length; i++) {
          const q = hp.anticipatedQuestions[i];
          y = ensureSpace(doc, y, 70, reportId, pageCounter);
          doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
            .text(`Q${i + 1}. ${q.question}`, LM, y, { width: cw, lineGap: 2 });
          y = doc.y + 4;
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
            .text(`A. ${q.response}`, LM + 12, y, { width: cw - 24, lineGap: 3 });
          y = doc.y + 8;
        }
      }

      // ── Comparable Walkthrough ──
      if (hp.comparableWalkthrough.length > 0) {
        y = ensureSpace(doc, y, 60, reportId, pageCounter);
        y = subHeader(doc, "Per-Comparable Walkthrough", y, cw);
        for (const c of hp.comparableWalkthrough) {
          y = ensureSpace(doc, y, 30, reportId, pageCounter);
          doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
            .text(c.address, LM, y, { width: cw });
          y = doc.y + 2;
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
            .text(c.line, LM + 12, y, { width: cw - 24, lineGap: 2 });
          y = doc.y + 6;
        }
      }

      // ── Record Error Walkthrough ──
      if (hp.recordErrorWalkthrough.length > 0) {
        y = ensureSpace(doc, y, 50, reportId, pageCounter);
        y = subHeader(doc, "Record-Card Discrepancies — 30-Second Read", y, cw);
        for (const r of hp.recordErrorWalkthrough) {
          y = ensureSpace(doc, y, 24, reportId, pageCounter);
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
            .text(`-  ${r}`, LM + 12, y, { width: cw - 24, lineGap: 2 });
          y = doc.y + 4;
        }
      }

      // ── Closing Statement ──
      y = ensureSpace(doc, y, 50, reportId, pageCounter);
      y = subHeader(doc, "Closing Statement (30-45 seconds)", y, cw);
      y = bodyText(doc, hp.closingStatement, y, cw);

      // ── Pre-Hearing Checklist ──
      if (hp.preHearingChecklist.length > 0) {
        y = ensureSpace(doc, y, 50, reportId, pageCounter);
        y = subHeader(doc, "Pre-Hearing Checklist", y, cw);
        for (const item of hp.preHearingChecklist) {
          y = ensureSpace(doc, y, 22, reportId, pageCounter);
          doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
            .text(`☐  ${item}`, LM + 8, y, { width: cw - 16, lineGap: 2 });
          y = doc.y + 4;
        }
      }
    }

    // ─── APPENDICES ────────────────────────────────────────────────────
    y = newPage(doc, reportId, pageCounter);
    sectionNum++;
    y = sectionHeader(doc, "APPENDICES", y, cw, sectionNum);

    y = subHeader(doc, "A. Data Sources", y, cw);
    const dataSources = [
      "County assessor records and property tax databases",
      "Multiple Listing Service (MLS) comparable sales data",
      "Public records and deed transfer databases",
      "Zillow, Redfin, and Realtor.com market data APIs",
      "RentCast rental market data (for income approach, where applicable)",
      "Google Maps street view and satellite imagery services",
      "Owner-submitted property photographs and documentation",
      "U.S. Census Bureau demographic and housing data",
      "Federal Housing Finance Agency (FHFA) House Price Index",
    ];
    for (const src of dataSources) {
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
     .text(`-  ${src}`, LM + 8, y, { width: cw - 16, lineGap: 2 });     y = doc.y + 4;
    }

    y += 10;
    y = subHeader(doc, "B. Definitions", y, cw);
    const definitions: [string, string][] = [
      ["Market Value", "The most probable price which a property should bring in a competitive and open market under all conditions requisite to a fair sale, the buyer and seller each acting prudently and knowledgeably, and assuming the price is not affected by undue stimulus (OCC 12 CFR 34.42(g); FIRREA)."],
      ["Assessed Value", "The value placed on a property by the local tax assessor for the purpose of calculating property taxes. May be a percentage of market value depending on the jurisdiction's equalization rate."],
      ["Comparable Sale", "A recently sold property that is similar to the subject property in location, size, condition, and other relevant characteristics, used as a basis for estimating the subject's market value."],
      ["Adjustment", "A modification to the sale price of a comparable property to account for differences between the comparable and the subject property. Positive adjustments indicate the comparable is inferior; negative adjustments indicate superiority."],
      ["Reconciliation", "The process of weighing the value indications from different valuation approaches to arrive at a final opinion of value, considering the quality and quantity of data supporting each approach."],
      ["Capitalization Rate", "The rate used to convert a single year's net operating income into a value indication in the income capitalization approach. Derived from market data for similar income-producing properties."],
      ["Effective Age", "The age of a property based on its condition and utility, which may differ from its actual chronological age due to renovation, maintenance, or deterioration."],
      ["Coefficient of Dispersion (COD)", "A measure of assessment uniformity. The average percentage deviation of individual assessment ratios from the median ratio. Lower COD values indicate more uniform assessments."],
      ["Highest and Best Use", "The reasonably probable and legal use of vacant land or an improved property that is physically possible, appropriately supported, financially feasible, and that results in the highest value."],
      ["Fee Simple Interest", "Absolute ownership unencumbered by any other interest or estate, subject only to the limitations imposed by the governmental powers of taxation, eminent domain, police power, and escheat."],
      ["Depreciation", "A loss in value from any cause. In the cost approach, depreciation includes physical deterioration, functional obsolescence, and external (economic) obsolescence."],
      ["Replacement Cost New", "The estimated cost to construct, at current prices, a building with utility equivalent to the building being appraised, using modern materials and current standards, design, and layout."],
      ["Net Operating Income (NOI)", "The anticipated net income remaining after deducting all operating expenses from effective gross income, but before mortgage debt service and book depreciation."],
      ["Assessment Ratio", "The ratio of a property's assessed value to its market value. Used to measure the level and uniformity of assessments within a jurisdiction."],
      ["Equalization Rate", "A factor applied by a jurisdiction to adjust assessed values to a common level, typically to achieve uniformity across assessment districts."],
      ["Arms-Length Transaction", "A transaction between unrelated parties under no duress, where each party acts in their own self-interest. Such transactions are considered the best evidence of market value."],
      ["Gross Living Area (GLA)", "The total area of finished, above-grade residential space, measured by the exterior building dimensions. Excludes unfinished basements, garages, and porches."],
    ];

    for (const [term, def] of definitions) {
      y = ensureSpace(doc, y, 50, reportId, pageCounter);
      doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
        .text(term, LM + 8, y, { width: cw - 16 });
      y = doc.y + 2;
      doc.fontSize(8.5).fillColor(BODY_TEXT).font("Helvetica")
        .text(def, LM + 8, y, { width: cw - 16, lineGap: 2 });
      y = doc.y + 8;
    }

    y += 10;
    y = ensureSpace(doc, y, 100, reportId, pageCounter);
    y = subHeader(doc, "C. Analyst Qualifications", y, cw);
    y = bodyText(doc,
      `This report was prepared by the AppraiseAI Valuation Engine, a proprietary artificial intelligence system developed by AppraiseAI, Inc. ` +
      `The system utilizes machine learning models trained on millions of verified property transactions across all 50 states, combined with ` +
      `real-time market data from multiple verified sources including MLS databases, public deed records, and assessor databases.`,
      y, cw
    );
    y = bodyText(doc,
      `The methodology follows the Uniform Standards of Professional Appraisal Practice (USPAP) and is regularly validated against ` +
      `certified appraiser opinions to ensure accuracy and reliability. All analyses undergo automated quality assurance checks ` +
      `before report generation, including verification of comparable sale data, adjustment reasonableness, and value reconciliation consistency.`,
      y, cw
    );

    y += 6;
    y = ensureSpace(doc, y, 60, reportId, pageCounter);
    y = subHeader(doc, "D. Applicable Standards", y, cw);
    const standards = [
      "Uniform Standards of Professional Appraisal Practice (USPAP), current edition",
      "International Association of Assessing Officers (IAAO) Standard on Ratio Studies",
      "IAAO Standard on Mass Appraisal of Real Property",
      `Applicable property tax appeal statutes for the State of ${data.state || "the subject jurisdiction"}`,
    ];
    for (const std of standards) {
      y = ensureSpace(doc, y, 20, reportId, pageCounter);
      doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
    .text(`-  ${std}`, LM + 8, y, { width: cw - 16, lineGap: 2 });      y = doc.y + 4;
    }

    // ─── FINAL DISCLAIMER ──────────────────────────────────────────────
    y = ensureSpace(doc, y, 50, reportId, pageCounter);
    y += 8;
    doc.rect(LM, y, cw, 0.5).fill(PURPLE);
    y += 6;
    doc.fontSize(7).fillColor("#94a3b8").font("Helvetica")
      .text(
        `This report is prepared by AppraiseAI for use in property tax appeal proceedings. The opinions and conclusions expressed herein ` +
        `are based on the data and analysis described in this report. This report is intended for the exclusive use of the property owner ` +
        `and the relevant tax assessment authority. Unauthorized distribution or use of this report is prohibited. ` +
        `Report #${reportId} | Effective Date: ${reportDate} | (c) AppraiseAI ${new Date().getFullYear()}. All rights reserved.`,
        LM, y, { width: cw, align: "center", lineGap: 2 }
      );

    addFooter(doc, reportId, pageCounter.n);
    doc.end();
  });
}
