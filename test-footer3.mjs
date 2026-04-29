import PDFDocument from "pdfkit";
import fs from "fs";
import { execSync } from "child_process";

const LM = 60, RM = 60, BM = 70, TM = 55;

// Test: bufferPages approach - add footers AFTER all content
async function testBufferedPages() {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50, bufferPages: true });
    const ws = fs.createWriteStream("/tmp/test_buffered.pdf");
    doc.pipe(ws);
    
    // Write 5 pages of content
    for (let i = 0; i < 5; i++) {
      if (i > 0) doc.addPage();
      doc.fontSize(14).text(`Page ${i + 1} Content`, LM, TM);
      doc.fontSize(10).text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.", LM, TM + 30, { width: 400 });
    }
    
    // Now add footers to ALL pages using switchToPage
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
    ws.on("finish", () => {
      const info = execSync("pdfinfo /tmp/test_buffered.pdf 2>&1").toString();
      console.log("Buffered pages approach:");
      console.log(info.split("\n").filter(l => l.includes("Pages") || l.includes("File size")).join("\n"));
      resolve();
    });
  });
}

await testBufferedPages();
console.log("Done!");
