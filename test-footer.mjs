import PDFDocument from "pdfkit";
import { Writable } from "stream";

// Minimal reproduction of the footer bug
const doc = new PDFDocument({ size: "LETTER", margin: 50 });

// Collect output
const chunks = [];
doc.pipe(new Writable({
  write(chunk, enc, cb) { chunks.push(chunk); cb(); }
}));

const LM = 60;
const RM = 60;
const BM = 70;
const TM = 55;

function addFooter(doc, reportId, pageNum) {
  const pageW = doc.page.width;
  const footerY = doc.page.height - BM + 15;
  doc.save();
  doc.rect(LM, footerY, pageW - LM - RM, 0.5).fill("#b8952c");
  doc.fontSize(7).fillColor("#64748b").font("Helvetica");
  doc.text(`Report #${reportId}`, LM, footerY + 6, { width: (pageW - LM - RM) / 2, lineBreak: false });
  doc.text(`Page ${pageNum}`, LM + (pageW - LM - RM) / 2, footerY + 6, {
    width: (pageW - LM - RM) / 2, align: "right", lineBreak: false,
  });
  doc.fontSize(6).fillColor("#94a3b8")
    .text("CONFIDENTIAL", LM, footerY + 18, {
      width: pageW - LM - RM, align: "center", lineBreak: false,
    });
  doc.restore();
}

// Page 1: some content
doc.fontSize(14).text("Page 1 Content", LM, TM);

// Add footer and new page
addFooter(doc, "TEST", 1);
doc.addPage();

// Page 2: some content
doc.fontSize(14).text("Page 2 Content", LM, TM);
addFooter(doc, "TEST", 2);

doc.end();

doc.on("end", () => {
  const buf = Buffer.concat(chunks);
  // Count pages by looking for /Type /Page in the PDF
  const str = buf.toString("latin1");
  const pageCount = (str.match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`Total pages: ${pageCount}`);
  console.log(`Buffer size: ${buf.length} bytes`);
});
