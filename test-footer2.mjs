import PDFDocument from "pdfkit";
import fs from "fs";

const LM = 60;
const RM = 60;
const BM = 70;
const TM = 55;

// Test 1: Using doc.text with lineBreak: false
console.log("=== Test 1: lineBreak: false ===");
{
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  doc.pipe(fs.createWriteStream("/tmp/test1.pdf"));
  
  doc.fontSize(14).text("Page 1 Content", LM, TM);
  
  // Footer
  const pageW = doc.page.width;
  const footerY = doc.page.height - BM + 15;
  doc.save();
  doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
  doc.fontSize(7).fillColor("#64748b").font("Helvetica");
  doc.text("Report #TEST", LM, footerY + 6, { width: (pageW - LM - RM) / 2, lineBreak: false });
  doc.text("Page 1", LM + (pageW - LM - RM) / 2, footerY + 6, { width: (pageW - LM - RM) / 2, align: "right", lineBreak: false });
  doc.fontSize(6).fillColor("#94a3b8")
    .text("CONFIDENTIAL", LM, footerY + 18, { width: pageW - LM - RM, align: "center", lineBreak: false });
  doc.restore();
  
  doc.addPage();
  doc.fontSize(14).text("Page 2 Content", LM, TM);
  doc.end();
  
  await new Promise(r => doc.on("end", r));
}

// Test 2: Using doc._font.encode + page.write directly (no doc.text)
console.log("=== Test 2: Manual positioning approach ===");
{
  const doc = new PDFDocument({ size: "LETTER", margin: 50, bufferPages: true });
  doc.pipe(fs.createWriteStream("/tmp/test2.pdf"));
  
  doc.fontSize(14).text("Page 1 Content", LM, TM);
  doc.addPage();
  doc.fontSize(14).text("Page 2 Content", LM, TM);
  doc.addPage();
  doc.fontSize(14).text("Page 3 Content", LM, TM);
  
  // Now go back and add footers to all pages using buffered pages
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const pageW = doc.page.width;
    const footerY = doc.page.height - BM + 15;
    doc.save();
    doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
    doc.fontSize(7).fillColor("#64748b").font("Helvetica");
    doc.text(`Report #TEST`, LM, footerY + 6, { width: (pageW - LM - RM) / 2, lineBreak: false });
    doc.text(`Page ${i + 1}`, LM + (pageW - LM - RM) / 2, footerY + 6, { width: (pageW - LM - RM) / 2, align: "right", lineBreak: false });
    doc.fontSize(6).fillColor("#94a3b8")
      .text("CONFIDENTIAL", LM, footerY + 18, { width: pageW - LM - RM, align: "center", lineBreak: false });
    doc.restore();
  }
  
  doc.end();
  await new Promise(r => doc.on("end", r));
}

// Check page counts
import { execSync } from "child_process";
console.log("\nTest 1 pages:", execSync("pdfinfo /tmp/test1.pdf 2>&1 | grep Pages").toString().trim());
console.log("Test 2 pages:", execSync("pdfinfo /tmp/test2.pdf 2>&1 | grep Pages").toString().trim());
