/**
 * AppraiseAI — PDF Generation Service
 * Calls the Python ReportLab script to generate professional appraisal PDFs,
 * then uploads to S3 and returns a public URL.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { nanoid } from "nanoid";
import { storagePut } from "../storage";

const execFileAsync = promisify(execFile);

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
  squareFeet?: number | null;
  yearBuilt?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  lotSize?: number | null;
  parcelNumber?: string;
}

export async function generateAppraisalPDF(data: AppraisalReportData): Promise<{
  url: string;
  key: string;
  sizeBytes: number;
}> {
  const id = nanoid(10);
  const inputPath = join(tmpdir(), `appraisal-input-${id}.json`);
  const outputPath = join(tmpdir(), `appraisal-report-${id}.pdf`);

  // Enrich data with defaults
  const reportData = {
    ...data,
    reportDate: data.reportDate || new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    }),
    reportType: data.reportType || "instant",
  };

  try {
    // Write input JSON
    await writeFile(inputPath, JSON.stringify(reportData, null, 2), "utf-8");

    // Call Python script
    const scriptPath = join(process.cwd(), "server/scripts/generate_pdf.py");
    const { stdout, stderr } = await execFileAsync("python3", [scriptPath, inputPath, outputPath], {
      timeout: 30_000, // 30 second timeout
    });

    if (stderr && !stderr.includes("UserWarning")) {
      console.warn("[PDF Generator] Python stderr:", stderr);
    }

    // Read generated PDF
    const { readFile } = await import("fs/promises");
    const pdfBuffer = await readFile(outputPath);

    // Upload to S3
    const s3Key = `appraisals/${data.submissionId}-report-${id}.pdf`;
    const { url } = await storagePut(s3Key, pdfBuffer, "application/pdf");

    return {
      url,
      key: s3Key,
      sizeBytes: pdfBuffer.length,
    };
  } finally {
    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
