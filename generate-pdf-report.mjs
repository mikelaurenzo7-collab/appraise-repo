/**
 * Generate Professional PDF Report
 * Creates a branded, professional property tax appeal report
 */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create PDF document
const doc = new PDFDocument({
  size: "letter",
  margins: { top: 40, bottom: 40, left: 50, right: 50 },
});

// Output file
const outputPath = path.join(__dirname, "sample-report.pdf");
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Color scheme (AppraiseAI branding)
const colors = {
  primary: "#7C3AED", // Electric Purple
  accent: "#14B8A6", // Teal
  gold: "#F59E0B", // Gold
  dark: "#1F2937", // Dark Gray
  light: "#F3F4F6", // Light Gray
};

// Helper functions
function addHeader() {
  doc.fontSize(10).fillColor(colors.dark);
  doc.text("APPRAISEAI", { width: 200, align: "left" });
  doc.fontSize(8).fillColor("#666666");
  doc.text("Property Tax Appeal System", { width: 200, align: "left" });

  doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke(colors.primary);
  doc.moveDown(0.5);
}

function addTitle(text) {
  doc.fontSize(16).fillColor(colors.primary).font("Helvetica-Bold");
  doc.text(text, { align: "left" });
  doc.moveDown(0.3);
}

function addSubtitle(text) {
  doc.fontSize(12).fillColor(colors.dark).font("Helvetica-Bold");
  doc.text(text, { align: "left" });
  doc.moveDown(0.2);
}

function addSectionHeader(text) {
  doc.fontSize(11).fillColor(colors.primary).font("Helvetica-Bold");
  doc.text(text);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(colors.accent);
  doc.moveDown(0.3);
}

function addBodyText(text, size = 10) {
  doc.fontSize(size).fillColor(colors.dark).font("Helvetica");
  doc.text(text, { align: "left", width: 495 });
  doc.moveDown(0.2);
}

function addKeyMetric(label, value, color = colors.accent) {
  const y = doc.y;
  doc.fontSize(9).fillColor("#666666").font("Helvetica");
  doc.text(label, 50, y);
  doc.fontSize(14).fillColor(color).font("Helvetica-Bold");
  doc.text(value, 250, y);
  doc.moveDown(0.4);
}

function addTable(headers, rows) {
  const colWidth = 495 / headers.length;
  const rowHeight = 20;

  // Header
  doc.fontSize(9).fillColor("white").font("Helvetica-Bold");
  doc.rect(50, doc.y, 495, rowHeight).fill(colors.primary);

  let x = 50;
  headers.forEach((header) => {
    doc.text(header, x + 5, doc.y - rowHeight + 5, { width: colWidth - 10 });
    x += colWidth;
  });

  doc.moveDown(0.8);

  // Rows
  doc.fontSize(8).fillColor(colors.dark).font("Helvetica");
  rows.forEach((row, idx) => {
    const bgColor = idx % 2 === 0 ? colors.light : "white";
    doc.rect(50, doc.y, 495, rowHeight).fill(bgColor);

    x = 50;
    row.forEach((cell) => {
      doc.text(cell, x + 5, doc.y - rowHeight + 5, { width: colWidth - 10 });
      x += colWidth;
    });

    doc.moveDown(0.8);
  });

  doc.moveDown(0.2);
}

// PAGE 1: COVER & EXECUTIVE SUMMARY
addHeader();
doc.moveDown(1);

doc.fontSize(24).fillColor(colors.primary).font("Helvetica-Bold");
doc.text("PROPERTY TAX APPEAL REPORT", { align: "center" });
doc.moveDown(0.5);

doc.fontSize(14).fillColor(colors.dark).font("Helvetica");
doc.text("25 W050 Setauket Avenue", { align: "center" });
doc.text("Naperville, IL 60540", { align: "center" });
doc.moveDown(0.3);

doc.fontSize(10).fillColor("#666666").font("Helvetica");
doc.text("DuPage County Assessor's Office", { align: "center" });
doc.moveDown(1.5);

// Key metrics box
doc.rect(50, doc.y, 495, 100).stroke(colors.primary);
doc.moveDown(0.3);

doc.fontSize(10).fillColor(colors.primary).font("Helvetica-Bold");
doc.text("KEY FINDINGS", 60);
doc.moveDown(0.2);

addKeyMetric("Assessed Value:", "$425,000");
addKeyMetric("Fair Market Value:", "$385,000");
addKeyMetric("Over-Assessment:", "$40,000 (9.4%)");
addKeyMetric("Annual Tax Savings:", "$480 - $720");

doc.moveDown(0.5);
addSectionHeader("EXECUTIVE SUMMARY");

addBodyText(
  "This property has been significantly over-assessed by the DuPage County Assessor's Office. The current assessed value of $425,000 exceeds the fair market value by approximately $40,000 (9.4% over-assessment). This report demonstrates that a substantial reduction in assessed value is justified based on comparable sales analysis, current market conditions, and property-specific factors."
);

addBodyText(
  "The analysis presented herein is based on recent comparable sales data, current market conditions, and established appraisal principles. We have identified clear evidence that the subject property's assessment does not reflect its true market value."
);

doc.addPage();

// PAGE 2: COMPARABLE SALES ANALYSIS
addHeader();
doc.moveDown(0.5);

addSectionHeader("COMPARABLE SALES ANALYSIS");

addBodyText(
  "Recent sales of similar properties in the immediate area strongly support a market value of approximately $385,000. The following comparable properties were selected based on proximity, similarity, and recency of sale:"
);

doc.moveDown(0.3);

addTable(
  ["Property", "Sale Price", "Date", "$/SqFt", "Similarity"],
  [
    ["24 W050 Setauket Ave", "$380,000", "01/15/2024", "$120.63", "Adjacent"],
    ["26 W050 Setauket Ave", "$390,000", "02/20/2024", "$118.18", "Same St."],
    ["100 Knollwood Drive", "$375,000", "03/10/2024", "$120.97", "Nearby"],
  ]
);

addBodyText("Average Market Value: $381,667", 10);
doc.moveDown(0.2);
addBodyText("Subject Property Assessment: $425,000", 10);
doc.moveDown(0.2);
addBodyText("Discrepancy: $43,333 (11.3% over-assessed)", 10);

doc.moveDown(0.5);
addSectionHeader("PRICE PER SQUARE FOOT ANALYSIS");

addBodyText(
  "The subject property's price-per-square-foot assessment ($132.81) significantly exceeds comparable properties in the market ($120.31), representing a 10.4% premium with no justification."
);

doc.moveDown(0.3);

// Simple chart representation
doc.fontSize(9).fillColor(colors.dark).font("Helvetica-Bold");
doc.text("Price per Square Foot Comparison:");
doc.moveDown(0.2);

// Bar chart representation
const barY = doc.y;
doc.rect(50, barY, 300, 15).fill(colors.accent);
doc.fontSize(8).fillColor("white").text("Market Average: $120.31", 55, barY + 2);

doc.rect(50, barY + 20, 330, 15).fill(colors.gold);
doc.fontSize(8).fillColor("white").text("Subject Property: $132.81 (10.4% PREMIUM)", 55, barY + 22);

doc.moveDown(1.5);

addSectionHeader("MARKET ANALYSIS");

addBodyText(
  "The DuPage County real estate market has experienced a cooling trend over the past 12 months:"
);

doc.moveDown(0.2);
addKeyMetric("Year-over-Year Change:", "-2.5%", colors.gold);
addKeyMetric("Six-Month Change:", "-1.8%", colors.gold);
addKeyMetric("Market Status:", "Buyer's Market", colors.gold);

addBodyText(
  "The subject property was assessed during a period of higher market values. Current market conditions clearly support a lower valuation."
);

doc.addPage();

// PAGE 3: PROPERTY DETAILS & VALUATION
addHeader();
doc.moveDown(0.5);

addSectionHeader("PROPERTY CONDITION ASSESSMENT");

addBodyText("Subject Property Details:");
doc.moveDown(0.2);

const details = [
  ["Year Built:", "1998 (26 years old)"],
  ["Square Footage:", "3,200 sqft"],
  ["Lot Size:", "0.35 acres"],
  ["Bedrooms:", "4"],
  ["Bathrooms:", "2.5"],
  ["Overall Condition:", "Good"],
];

doc.fontSize(9).fillColor(colors.dark).font("Helvetica");
details.forEach(([label, value]) => {
  doc.text(`${label} ${value}`, { width: 495 });
  doc.moveDown(0.15);
});

doc.moveDown(0.3);

addSectionHeader("VALUATION JUSTIFICATION");

addBodyText(
  "Using the Sales Comparison Approach (most appropriate for residential properties):"
);

doc.moveDown(0.2);

addKeyMetric("Comparable Sales Average:", "$381,667");
addKeyMetric("Subject Property Assessed Value:", "$425,000");
addKeyMetric("Variance:", "$43,333 (11.3% over-assessment)");

addBodyText(
  "The subject property's assessed value cannot be justified by recent comparable sales, current market conditions, property condition, or market rates per square foot."
);

doc.moveDown(0.5);

addSectionHeader("RECOMMENDATION");

doc.rect(50, doc.y, 495, 60).fill(colors.light);
doc.moveDown(0.3);

doc.fontSize(11).fillColor(colors.primary).font("Helvetica-Bold");
doc.text("The assessed value should be reduced to approximately $385,000", 60);

doc.fontSize(9).fillColor(colors.dark).font("Helvetica");
doc.moveDown(0.2);
doc.text("This reduction would result in:", 60);
doc.moveDown(0.1);
doc.text("• Annual Tax Savings: $480 - $720", 60);
doc.text("• 40-Year Savings: $19,200 - $28,800", 60);
doc.text("• Contingency Fee (if applicable): $4,800 - $7,200", 60);

doc.moveDown(0.8);

addSectionHeader("CONCLUSION");

addBodyText(
  "The evidence presented in this report clearly demonstrates that the subject property has been over-assessed by the DuPage County Assessor's Office. A reduction to fair market value of approximately $385,000 is strongly supported by comparable sales data, current market analysis, and established appraisal principles."
);

addBodyText(
  "We recommend filing an appeal with the DuPage County Board of Review immediately to challenge this over-assessment. The deadline for filing an appeal is typically 30 days from the date of assessment notice."
);

doc.moveDown(0.5);

// Footer
doc.fontSize(8).fillColor("#999999").font("Helvetica");
doc.text("Report Generated: " + new Date().toLocaleDateString(), { align: "center" });
doc.text("AppraiseAI Property Tax Appeal System", { align: "center" });
doc.text("www.appraiseai.com | support@appraiseai.com", { align: "center" });

// Finalize PDF
doc.end();

stream.on("finish", () => {
  console.log(`✅ PDF Report Generated: ${outputPath}`);
  console.log(`📄 File Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log(`📊 Pages: 3`);
  console.log(`\nReport is ready for download!`);
});

stream.on("error", (err) => {
  console.error("Error generating PDF:", err);
});
