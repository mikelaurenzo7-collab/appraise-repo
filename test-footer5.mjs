import PDFDocument from "pdfkit";
import fs from "fs";
import { execSync } from "child_process";

const LM = 60, RM = 60, BM = 70, TM = 55;

// Approach: Increase bottom margin so content never reaches footer zone,
// then use addContent to write footer text directly to the page content stream
async function test() {
  return new Promise((resolve) => {
    // Use a large bottom margin so auto-pagination kicks in BEFORE the footer zone
    const doc = new PDFDocument({ size: "LETTER", margins: { top: TM, bottom: BM + 30, left: LM, right: RM } });
    const ws = fs.createWriteStream("/tmp/test_fix5.pdf");
    doc.pipe(ws);
    
    for (let page = 1; page <= 5; page++) {
      if (page > 1) doc.addPage();
      
      // Content
      doc.fontSize(14).fillColor("#000").text(`Page ${page} Content`, LM, TM);
      doc.fontSize(10).text("Lorem ipsum dolor sit amet.", LM, TM + 30, { width: 400 });
      
      // Footer using low-level page content stream
      const pageW = doc.page.width;
      const footerY = doc.page.height - BM + 15;
      
      // Gold line
      doc.save();
      doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
      doc.restore();
      
      // Use addContent to write text directly to PDF content stream
      // This bypasses the text flow engine entirely
      const leftText = `Report #TEST`;
      const rightText = `Page ${page}`;
      const centerText = "CONFIDENTIAL";
      
      // Set font and draw text using PDF operators directly
      doc.save();
      doc.addContent("BT");
      doc.addContent(`/F1 7 Tf`);  // Helvetica 7pt
      doc.addContent(`0.392 0.459 0.545 rg`); // MUTED color
      doc.addContent(`${LM} ${doc.page.height - footerY - 6} Td`);
      doc.addContent(`(${leftText}) Tj`);
      doc.addContent("ET");
      doc.restore();
    }
    
    doc.end();
    ws.on("finish", () => {
      const info = execSync("pdfinfo /tmp/test_fix5.pdf 2>&1").toString();
      const pages = info.match(/Pages:\s+(\d+)/);
      console.log(`Low-level approach pages: ${pages ? pages[1] : "unknown"}`);
      resolve();
    });
  });
}

// Simpler approach: just don't add footer text, only the gold line
async function testNoText() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const ws = fs.createWriteStream("/tmp/test_nofootertext.pdf");
    doc.pipe(ws);
    
    for (let page = 1; page <= 5; page++) {
      if (page > 1) doc.addPage();
      doc.fontSize(14).fillColor("#000").text(`Page ${page} Content`, LM, TM);
      
      // Only draw the gold line, no text
      const pageW = doc.page.width;
      const footerY = doc.page.height - BM + 15;
      doc.save();
      doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
      doc.restore();
    }
    
    doc.end();
    ws.on("finish", () => {
      const info = execSync("pdfinfo /tmp/test_nofootertext.pdf 2>&1").toString();
      const pages = info.match(/Pages:\s+(\d+)/);
      console.log(`No footer text pages: ${pages ? pages[1] : "unknown"}`);
      resolve();
    });
  });
}

// Test: use height option to constrain text
async function testHeight() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const ws = fs.createWriteStream("/tmp/test_height.pdf");
    doc.pipe(ws);
    
    for (let page = 1; page <= 5; page++) {
      if (page > 1) doc.addPage();
      doc.fontSize(14).fillColor("#000").text(`Page ${page} Content`, LM, TM);
      
      const pageW = doc.page.width;
      const footerY = doc.page.height - BM + 15;
      doc.save();
      doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
      doc.fontSize(7).fillColor("#64748b").font("Helvetica");
      // Add height constraint to prevent overflow
      doc.text(`Report #TEST`, LM, footerY + 6, { width: (pageW - LM - RM) / 2, height: 10, lineBreak: false });
      doc.text(`Page ${page}`, LM + (pageW - LM - RM) / 2, footerY + 6, { width: (pageW - LM - RM) / 2, height: 10, align: "right", lineBreak: false });
      doc.fontSize(6).fillColor("#94a3b8")
        .text("CONFIDENTIAL", LM, footerY + 18, { width: pageW - LM - RM, height: 10, align: "center", lineBreak: false });
      doc.restore();
    }
    
    doc.end();
    ws.on("finish", () => {
      const info = execSync("pdfinfo /tmp/test_height.pdf 2>&1").toString();
      const pages = info.match(/Pages:\s+(\d+)/);
      console.log(`Height constraint pages: ${pages ? pages[1] : "unknown"}`);
      resolve();
    });
  });
}

await testNoText();
await testHeight();
await test();
