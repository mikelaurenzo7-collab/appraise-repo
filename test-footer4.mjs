import PDFDocument from "pdfkit";
import fs from "fs";
import { execSync } from "child_process";

const LM = 60, RM = 60, BM = 70, TM = 55;

// Test: Set doc.y before footer to prevent auto-pagination
async function test() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const ws = fs.createWriteStream("/tmp/test_fix.pdf");
    doc.pipe(ws);
    
    for (let page = 1; page <= 5; page++) {
      if (page > 1) doc.addPage();
      
      // Content
      doc.fontSize(14).fillColor("#000").text(`Page ${page} Content`, LM, TM);
      doc.fontSize(10).text("Lorem ipsum dolor sit amet.", LM, TM + 30, { width: 400 });
      
      // Footer - KEY: set doc.y to a safe position first
      const pageW = doc.page.width;
      const footerY = doc.page.height - BM + 15;
      
      doc.save();
      // Draw the gold line
      doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
      
      // CRITICAL: Reset doc.y to footerY so PDFKit doesn't think we're past the page
      doc.y = footerY;
      doc.x = LM;
      
      doc.fontSize(7).fillColor("#64748b").font("Helvetica");
      doc.text(`Report #TEST`, LM, footerY + 6, { width: (pageW - LM - RM) / 2, lineBreak: false });
      doc.text(`Page ${page}`, LM + (pageW - LM - RM) / 2, footerY + 6, { width: (pageW - LM - RM) / 2, align: "right", lineBreak: false });
      doc.fontSize(6).fillColor("#94a3b8")
        .text("CONFIDENTIAL — Prepared for property tax appeal proceedings", LM, footerY + 18, { width: pageW - LM - RM, align: "center", lineBreak: false });
      doc.restore();
    }
    
    doc.end();
    ws.on("finish", () => {
      const info = execSync("pdfinfo /tmp/test_fix.pdf 2>&1").toString();
      const pages = info.match(/Pages:\s+(\d+)/);
      console.log(`Pages: ${pages ? pages[1] : "unknown"}`);
      resolve();
    });
  });
}

await test();
