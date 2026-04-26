/**
 * AppraiseAI — PDF Generation Service
 * Uses PDFKit (Node.js) to generate professional appraisal report PDFs,
 * then uploads to S3 and returns a public URL.
 */

import PDFDocument from "pdfkit";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";
import https from "https";
import http from "http";

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
  nextSteps?: string;
  filingMethod?: string;
  appealDeadline?: string;
  reportDate?: string;
  reportType?: string;
  comparableSales?: Array<{
    address: string;
    salePrice: number;
    saleDate: string;
    squareFeet?: number;
    sqft?: number;
    similarity?: number;
  }>;
  adjustmentGrid?: AdjustmentGridEntry[];
  incomeApproach?: IncomeApproachSummary;
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
  // Optional photo-condition analysis findings, surfaced as a dedicated section
  // in the PDF. Provided by the photoAnalyzer service. When present, the PDF
  // renders a "Property Condition Findings" page before the photo gallery.
  photoFindings?: {
    overallConditionScore: number;
    overallEvidenceStrength: number;
    summaryParagraph: string;
    topObservations: string[];
    topValueIssues: string[];
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return "$" + val.toLocaleString("en-US");
}

function fmtNum(val: number | null | undefined): string {
  if (val == null) return "N/A";
  return val.toLocaleString("en-US");
}

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "N/A";
  if (score >= 70) return `${score}/100 — STRONG APPEAL`;
  if (score >= 40) return `${score}/100 — Moderate Appeal`;
  return `${score}/100 — Weak Appeal`;
}

// Brand colors
const NAVY = "#1a1a3e";
const GOLD = "#c9a84c";
const DARK_TEXT = "#1a1a3e";
const BODY_TEXT = "#333333";
const LIGHT_GRAY = "#f5f5f0";
const BORDER = "#e0ddd5";
const WHITE = "#ffffff";

// Layout constants
const LEFT_MARGIN = 55;
const RIGHT_MARGIN = 55;

// ─── PDF Builder ────────────────────────────────────────────────────────────

export async function generateAppraisalPDF(data: AppraisalReportData): Promise<{
  url: string;
  key: string;
  sizeBytes: number;
}> {
  const id = nanoid(10);
  const reportDate = data.reportDate || new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const fullAddress = [data.address, data.city, data.state, data.zipCode]
    .filter(Boolean)
    .join(", ");

  // Pre-fetch map images before entering the synchronous PDFKit Promise
  const streetViewBuffer = data.streetViewUrl ? await fetchImageBuffer(data.streetViewUrl) : null;
  const satelliteBuffer = data.satelliteImageUrl ? await fetchImageBuffer(data.satelliteImageUrl) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 60, bottom: 60, left: LEFT_MARGIN, right: RIGHT_MARGIN },
      info: {
        Title: `AppraiseAI Property Analysis — ${data.address}`,
        Author: "AppraiseAI",
        Subject: "Property Tax Appeal Analysis Report",
        Creator: "AppraiseAI Platform",
      },
      autoFirstPage: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const s3Key = `appraisals/${data.submissionId}-report-${id}.pdf`;
        const { url } = await storagePut(s3Key, pdfBuffer, "application/pdf");
        resolve({ url, key: s3Key, sizeBytes: pdfBuffer.length });
      } catch (err) {
        reject(err);
      }
    });
    doc.on("error", reject);

    const pageW = doc.page.width;
    const contentWidth = pageW - LEFT_MARGIN - RIGHT_MARGIN;

    // ─── COVER / HEADER ─────────────────────────────────────────────────
    doc.rect(0, 0, pageW, 120).fill(NAVY);
    doc.fontSize(28).fillColor(WHITE).font("Helvetica-Bold")
      .text("AppraiseAI", LEFT_MARGIN, 35, { width: contentWidth });
    doc.fontSize(11).fillColor(GOLD).font("Helvetica")
      .text("Property Tax Appeal Analysis Report", LEFT_MARGIN, 72, { width: contentWidth });
    doc.fontSize(9).fillColor("#aaaaaa")
      .text(reportDate, LEFT_MARGIN, 92, { width: contentWidth });

    // Gold accent line
    doc.rect(0, 120, pageW, 3).fill(GOLD);

    let curY = 145;

    // ─── PROPERTY SUMMARY BOX ───────────────────────────────────────────
    doc.rect(LEFT_MARGIN, curY, contentWidth, 85)
      .lineWidth(0.5).fillAndStroke(LIGHT_GRAY, BORDER);

    doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold")
      .text("SUBJECT PROPERTY", LEFT_MARGIN + 15, curY + 12, { width: contentWidth - 30 });
    doc.fontSize(14).fillColor(DARK_TEXT).font("Helvetica-Bold")
      .text(fullAddress, LEFT_MARGIN + 15, curY + 28, { width: contentWidth - 30 });

    const details = [
      `Type: ${data.propertyType || "residential"}`,
      data.squareFeet ? `${fmtNum(data.squareFeet)} sq ft` : null,
      data.yearBuilt ? `Built ${data.yearBuilt}` : null,
      data.bathrooms ? `${data.bathrooms} bath` : null,
      data.county ? `${data.county} County` : null,
    ].filter(Boolean);

    doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
      .text(details.join("  ·  "), LEFT_MARGIN + 15, curY + 55, { width: contentWidth - 30 });

    curY += 100;

    // ─── KEY METRICS TABLE ──────────────────────────────────────────────
    curY = renderSectionHeader(doc, "KEY METRICS", curY, contentWidth);

    const metricsData: [string, string][] = [
      ["County Assessed Value", fmt(data.assessedValue)],
      ["AI Market Value Estimate", fmt(data.marketValueEstimate)],
      ["Assessment Gap (Over-Assessment)", fmt(data.assessmentGap)],
      ["Potential Annual Tax Savings", fmt(data.potentialSavings)],
      ["Appeal Strength Score", scoreLabel(data.appealStrengthScore)],
    ];

    curY = renderTable(doc, metricsData, curY, contentWidth);

    // ─── EXECUTIVE SUMMARY ──────────────────────────────────────────────
    if (data.executiveSummary) {
      curY = ensureSpace(doc, curY, 120, contentWidth);
      curY = renderSectionHeader(doc, "EXECUTIVE SUMMARY", curY, contentWidth);
      doc.fontSize(10).fillColor(BODY_TEXT).font("Helvetica");
      doc.text(data.executiveSummary, LEFT_MARGIN, curY, {
        width: contentWidth, lineGap: 3,
      });
      curY = doc.y + 12;
    }

    // ─── VALUATION JUSTIFICATION ────────────────────────────────────────
    if (data.valuationJustification) {
      curY = ensureSpace(doc, curY, 120, contentWidth);
      curY = renderSectionHeader(doc, "VALUATION JUSTIFICATION", curY, contentWidth);
      doc.fontSize(10).fillColor(BODY_TEXT).font("Helvetica");
      doc.text(data.valuationJustification, LEFT_MARGIN, curY, {
        width: contentWidth, lineGap: 3,
      });
      curY = doc.y + 12;
    }

    // ─── INCOME CAPITALIZATION APPROACH (MULTIFAMILY) ──────────────────
    if (data.incomeApproach) {
      curY = ensureSpace(doc, curY, 120, contentWidth);
      curY = renderSectionHeader(doc, "INCOME CAPITALIZATION APPROACH", curY, contentWidth);

      const incomeData: [string, string][] = [
        ["Market Rent per Unit", fmt(data.incomeApproach.marketRentPerUnit) + "/month"],
        ["Total Units", fmtNum(data.incomeApproach.totalUnits)],
        ["Gross Potential Income", fmt(data.incomeApproach.grossPotentialIncome) + "/year"],
        ["Vacancy & Collection Loss", fmt(data.incomeApproach.vacancyRate * 100) + "%"],
        ["Effective Gross Income", fmt(data.incomeApproach.effectiveGrossIncome)],
        ["Operating Expenses", fmt(data.incomeApproach.operatingExpenses)],
        ["Net Operating Income", fmt(data.incomeApproach.netOperatingIncome)],
        ["Capitalization Rate", fmtNum(data.incomeApproach.capRate * 100) + "%"],
        ["INCOME APPROACH VALUE", fmt(data.incomeApproach.incomeValue)],
      ];
      curY = renderTable(doc, incomeData, curY, contentWidth);
    }

    // ─── ADJUSTMENT GRID ────────────────────────────────────────────────
    if (data.adjustmentGrid && data.adjustmentGrid.length > 0) {
      curY = ensureSpace(doc, curY, 120, contentWidth);
      curY = renderSectionHeader(doc, "QUANTITATIVE ADJUSTMENT GRID", curY, contentWidth);

      for (const entry of data.adjustmentGrid.slice(0, 5)) {
        curY = ensureSpace(doc, curY, 50, contentWidth);
        doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold")
          .text(entry.compAddress, LEFT_MARGIN, curY, { width: contentWidth });
        curY = doc.y + 4;

        const adjustLines = Object.entries(entry.adjustments)
          .map(([key, val]) => `${key}: ${val > 0 ? "+" : ""}${val}%`)
          .join("  ·  ");

        doc.fontSize(8).fillColor(BODY_TEXT).font("Helvetica")
          .text(`Adjustments: ${adjustLines}`, LEFT_MARGIN + 10, curY, { width: contentWidth - 10 });
        curY = doc.y + 3;

        const resultLine = `Net Adjustment: ${entry.netAdjustmentPct > 0 ? "+" : ""}${entry.netAdjustmentPct}%  →  Adjusted Value: ${fmt(entry.adjustedValue)}`;
        doc.fontSize(9).fillColor(GOLD).font("Helvetica-Bold")
          .text(resultLine, LEFT_MARGIN + 10, curY, { width: contentWidth - 10 });
        curY = doc.y + 6;
      }
    }

    // ─── PROPERTY IMAGERY ────────────────────────────────────────────────
    // Use pre-fetched buffers (fetched before entering the synchronous Promise)
    const preloadedImages: Array<{ label: string; buffer: Buffer | null }> = [
      { label: "Street View", buffer: streetViewBuffer },
      { label: "Aerial / Satellite View", buffer: satelliteBuffer },
    ].filter((i) => i.buffer !== null);

    if (preloadedImages.length > 0) {
      const validImages = preloadedImages;
      if (validImages.length > 0) {
        curY = ensureSpace(doc, curY, 240, contentWidth);
        curY = renderSectionHeader(doc, "PROPERTY LOCATION & IMAGERY", curY, contentWidth);

        const imgW = validImages.length === 2
          ? (contentWidth - 12) / 2   // side by side
          : contentWidth;              // full width if only one
        const imgH = Math.round(imgW * 0.5625); // 16:9 aspect ratio

        for (let i = 0; i < validImages.length; i++) {
          const { label, buffer } = validImages[i];
          const xPos = validImages.length === 2
            ? LEFT_MARGIN + i * (imgW + 12)
            : LEFT_MARGIN;

          try {
            doc.image(buffer!, xPos, curY, { width: imgW, height: imgH });
            // Caption below image
            doc.fontSize(7).fillColor("#888888").font("Helvetica")
              .text(label, xPos, curY + imgH + 3, { width: imgW, align: "center" });
          } catch {
            // If image fails to render, show placeholder text
            doc.rect(xPos, curY, imgW, imgH).lineWidth(0.5).stroke(BORDER);
            doc.fontSize(8).fillColor("#aaaaaa").font("Helvetica")
              .text(label + " (unavailable)", xPos, curY + imgH / 2 - 6, { width: imgW, align: "center" });
          }
        }
        curY += imgH + 20;
      }
    }

    // ─── COMPARABLE SALES ───────────────────────────────────────────────
    if (data.comparableSales && data.comparableSales.length > 0) {
      curY = ensureSpace(doc, curY, 100, contentWidth);
      curY = renderSectionHeader(doc, "COMPARABLE SALES ANALYSIS", curY, contentWidth);

      for (const comp of data.comparableSales) {
        curY = ensureSpace(doc, curY, 40, contentWidth);
        const compLine = [
          comp.address,
          `Sale: ${fmt(comp.salePrice)}`,
          comp.saleDate ? `Date: ${comp.saleDate}` : null,
          (comp.squareFeet || comp.sqft) ? `${fmtNum(comp.squareFeet || comp.sqft)} sqft` : null,
          comp.similarity ? `${comp.similarity}% match` : null,
        ].filter(Boolean).join("  ·  ");

        doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica")
          .text("•  " + compLine, LEFT_MARGIN, curY, { width: contentWidth, lineGap: 2 });
        curY = doc.y + 6;
      }
      curY += 6;
    }

    // ─── RECOMMENDED NEXT STEPS ─────────────────────────────────────────
    if (data.nextSteps) {
      curY = ensureSpace(doc, curY, 100, contentWidth);
      curY = renderSectionHeader(doc, "RECOMMENDED NEXT STEPS", curY, contentWidth);

      let steps: string[];
      try {
        const parsed = JSON.parse(data.nextSteps);
        steps = Array.isArray(parsed) ? parsed : [data.nextSteps];
      } catch {
        steps = data.nextSteps.split("\n").filter((s) => s.trim());
      }

      for (let i = 0; i < steps.length; i++) {
        curY = ensureSpace(doc, curY, 30, contentWidth);
        doc.fontSize(10).fillColor(BODY_TEXT).font("Helvetica")
          .text(`${i + 1}.  ${steps[i]}`, LEFT_MARGIN, curY, { width: contentWidth, lineGap: 2 });
        curY = doc.y + 6;
      }
      curY += 6;
    }

    // ─── FILING INFORMATION ─────────────────────────────────────────────
    if (data.filingMethod || data.appealDeadline) {
      curY = ensureSpace(doc, curY, 100, contentWidth);
      curY = renderSectionHeader(doc, "FILING INFORMATION", curY, contentWidth);

      const filingInfo: [string, string][] = [
        ["Filing Method", (data.filingMethod || "N/A").replace(/_/g, " ").toUpperCase()],
        ["Appeal Deadline", data.appealDeadline || "Contact your county assessor"],
        ["Submission ID", `#${data.submissionId}`],
        ["Report Generated", reportDate],
      ];
      curY = renderTable(doc, filingInfo, curY, contentWidth);
    }

    // ─── DISCLAIMER ──────────────────────────────────────────────────────
    curY = ensureSpace(doc, curY, 60, contentWidth);
    curY += 20;
    doc.rect(LEFT_MARGIN, curY, contentWidth, 0.5).fill(BORDER);
    curY += 10;
    doc.fontSize(7).fillColor("#999999").font("Helvetica")
      .text(
        "This report is generated by AppraiseAI for informational purposes. " +
        "It does not constitute a certified appraisal. For legal proceedings, request a certified report. " +
        `© AppraiseAI ${new Date().getFullYear()}`,
        LEFT_MARGIN, curY, { width: contentWidth, align: "center" }
      );

    doc.end();
  });
}

// ─── Image Fetch Helper ─────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      lib.get(url, (res) => {
        if (res.statusCode !== 200) { resolve(null); return; }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", () => resolve(null));
      }).on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}

// ─── Layout Helpers ─────────────────────────────────────────────────────────

function renderSectionHeader(
  doc: PDFKit.PDFDocument, title: string, y: number, contentWidth: number
): number {
  y += 8;
  doc.rect(LEFT_MARGIN, y, contentWidth, 0.5).fill(GOLD);
  y += 8;
  doc.fontSize(11).fillColor(NAVY).font("Helvetica-Bold")
    .text(title, LEFT_MARGIN, y, { width: contentWidth });
  return doc.y + 8;
}

function renderTable(
  doc: PDFKit.PDFDocument, rows: [string, string][], startY: number, contentWidth: number
): number {
  const labelColWidth = contentWidth * 0.52;
  const valueColWidth = contentWidth * 0.48;
  let y = startY;

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    const rowH = 24;
    const bgColor = i % 2 === 0 ? LIGHT_GRAY : WHITE;

    doc.rect(LEFT_MARGIN, y, contentWidth, rowH)
      .lineWidth(0.3).fillAndStroke(bgColor, BORDER);

    doc.fontSize(9).fillColor(BODY_TEXT).font("Helvetica-Bold")
      .text(label, LEFT_MARGIN + 12, y + 7, { width: labelColWidth - 20, lineBreak: false });

    // Highlight strong appeal scores in gold
    const isStrong = value.includes("STRONG");
    doc.fontSize(9).fillColor(isStrong ? GOLD : DARK_TEXT).font(isStrong ? "Helvetica-Bold" : "Helvetica")
      .text(value, LEFT_MARGIN + labelColWidth, y + 7, { width: valueColWidth - 12, lineBreak: false });

    y += rowH;
  }
  return y + 10;
}

function ensureSpace(
  doc: PDFKit.PDFDocument, curY: number, neededHeight: number, _contentWidth: number
): number {
  const maxY = doc.page.height - doc.page.margins.bottom - 50;
  if (curY + neededHeight > maxY) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return curY;
}
