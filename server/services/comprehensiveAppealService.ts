/**
 * Comprehensive Appeal Service
 * Integrates: Deadline Calendar, Photo Analysis, Report Generation, User-Advocating AI
 */

import { invokeLLM } from "../_core/llm";
import { safeJsonParse } from "../_core/safeJson";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { propertySubmissions, propertyPhotos, propertyAnalysis, reportJobs } from "../../drizzle/schema.pg";

/**
 * PART 1: COUNTY DEADLINE CALENDAR
 */

export interface CountyDeadline {
  county: string;
  appealDeadline: Date;
  hearingDeadline: Date;
  decisionDeadline: Date;
  daysUntilAppealDeadline: number;
  status: "critical" | "urgent" | "normal" | "passed";
}

export const COUNTY_DEADLINES: Record<string, { appealDays: number; hearingDays: number; decisionDays: number }> = {
  "Travis County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "Harris County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "Dallas County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "Tarrant County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "Bexar County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "Cook County": { appealDays: 30, hearingDays: 90, decisionDays: 120 },
  "Miami-Dade County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "Los Angeles County": { appealDays: 60, hearingDays: 120, decisionDays: 180 },
  "New York County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
  "San Francisco County": { appealDays: 30, hearingDays: 60, decisionDays: 90 },
};

export function getCountyDeadlines(county: string, filedDate: Date): CountyDeadline {
  const deadlineConfig = COUNTY_DEADLINES[county] || COUNTY_DEADLINES["Travis County"];

  const appealDeadline = new Date(filedDate);
  appealDeadline.setDate(appealDeadline.getDate() + deadlineConfig.appealDays);

  const hearingDeadline = new Date(filedDate);
  hearingDeadline.setDate(hearingDeadline.getDate() + deadlineConfig.hearingDays);

  const decisionDeadline = new Date(filedDate);
  decisionDeadline.setDate(decisionDeadline.getDate() + deadlineConfig.decisionDays);

  const daysUntilAppealDeadline = Math.ceil(
    (appealDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  let status: "critical" | "urgent" | "normal" | "passed" = "normal";
  if (daysUntilAppealDeadline < 0) status = "passed";
  else if (daysUntilAppealDeadline <= 7) status = "critical";
  else if (daysUntilAppealDeadline <= 14) status = "urgent";

  return {
    county,
    appealDeadline,
    hearingDeadline,
    decisionDeadline,
    daysUntilAppealDeadline,
    status,
  };
}

/**
 * PART 2: AI PHOTO ANALYSIS & COST-TO-CURE
 */

export interface PhotoAnalysisResult {
  photoId: number;
  defects: Defect[];
  totalCostToCure: number;
  summary: string;
  recommendations: string[];
}

export interface Defect {
  type: string; // "structural", "cosmetic", "maintenance", "safety", "system"
  description: string;
  severity: "minor" | "moderate" | "major"; // 1-5 scale
  estimatedRepairCost: number;
  impact: string; // How this affects property value
}

export async function analyzePropertyPhotos(
  submissionId: number,
  photoUrls: string[]
): Promise<PhotoAnalysisResult[]> {
  const results: PhotoAnalysisResult[] = [];

  for (const photoUrl of photoUrls) {
    try {
      const analysis = await analyzePhotoWithAI(photoUrl);
      results.push(analysis);
    } catch (error) {
      console.error(`[Photo Analysis] Error analyzing ${photoUrl}:`, error);
    }
  }

  return results;
}

async function analyzePhotoWithAI(photoUrl: string): Promise<PhotoAnalysisResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional property inspector and real estate appraiser. Analyze the property photo and identify defects that would reduce property value. For each defect, provide:
1. Type (structural, cosmetic, maintenance, safety, system)
2. Description
3. Severity (minor, moderate, major)
4. Estimated repair cost
5. Impact on property value

Return as JSON with structure: { defects: [{type, description, severity, estimatedRepairCost, impact}], summary: string }`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this property photo for defects and cost-to-cure estimates.",
          },
          {
            type: "image_url",
            image_url: {
              url: photoUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "photo_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            defects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["minor", "moderate", "major"] },
                  estimatedRepairCost: { type: "number" },
                  impact: { type: "string" },
                },
                required: ["type", "description", "severity", "estimatedRepairCost", "impact"],
              },
            },
            summary: { type: "string" },
          },
          required: ["defects", "summary"],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Invalid LLM response");
  }

  // LLM output can be malformed (truncated, ill-formed, etc.). Parse safely
  // and validate the shape — surface a clear error rather than a cryptic
  // SyntaxError to the caller.
  const parsed = safeJsonParse<{ defects?: Defect[]; summary?: string } | null>(
    content, null, "comprehensiveAppealService.parseDefects",
  );
  if (!parsed || !Array.isArray(parsed.defects)) {
    throw new Error("LLM returned invalid defect analysis (no defects array)");
  }
  const totalCostToCure = parsed.defects.reduce(
    (sum: number, d: Defect) => sum + d.estimatedRepairCost,
    0
  );

  return {
    photoId: 0, // Will be set by caller
    defects: parsed.defects,
    totalCostToCure,
    summary: parsed.summary ?? "",
    recommendations: generatePhotoRecommendations(parsed.defects),
  };
}

function generatePhotoRecommendations(defects: Defect[]): string[] {
  const recommendations: string[] = [];

  const majorDefects = defects.filter((d) => d.severity === "major");
  if (majorDefects.length > 0) {
    recommendations.push(
      `Address ${majorDefects.length} major defects immediately - these significantly impact property value`
    );
  }

  const totalCost = defects.reduce((sum, d) => sum + d.estimatedRepairCost, 0);
  if (totalCost > 50000) {
    recommendations.push(
      `Total repair costs exceed $${totalCost.toLocaleString()} - use this in your appeal to justify lower valuation`
    );
  }

  const structuralDefects = defects.filter((d) => d.type === "structural");
  if (structuralDefects.length > 0) {
    recommendations.push(
      `Structural issues detected - prioritize professional inspection and documentation for appeal`
    );
  }

  return recommendations;
}

/**
 * PART 3: PROFESSIONAL REPORT GENERATION
 */

export interface ReportGenerationParams {
  submissionId: number;
  tone: "aggressive" | "balanced" | "conservative";
}

export async function generateProfessionalReport(
  params: ReportGenerationParams,
  photoAnalysisResults?: PhotoAnalysisResult[]
): Promise<{ reportUrl: string; pageCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Fetch all necessary data
  const submission = await db
    .select()
    .from(propertySubmissions)
    .where(eq(propertySubmissions.id, params.submissionId))
    .limit(1);

  if (!submission.length) throw new Error("Submission not found");

  const analysis = await db
    .select()
    .from(propertyAnalysis)
    .where(eq(propertyAnalysis.submissionId, params.submissionId))
    .limit(1);

  if (!analysis.length) throw new Error("Analysis not found");

  // Generate report content with user-advocating AI
  const reportContent = await generateUserAdvocatingReport(
    submission[0],
    analysis[0],
    params,
    photoAnalysisResults
  );

  // Store report in S3
  const reportBuffer = Buffer.from(reportContent);
  const { url: reportUrl } = await storagePut(
    `reports/${params.submissionId}-${Date.now()}.pdf`,
    reportBuffer,
    "application/pdf"
  );

  return {
    reportUrl,
    pageCount: Math.ceil(reportContent.length / 3000), // Rough estimate
  };
}

/**
 * PART 4: USER-ADVOCATING EVALUATION AI
 */

export async function generateUserAdvocatingReport(
  submission: any,
  analysis: any,
  params: ReportGenerationParams,
  photoAnalysisResults?: PhotoAnalysisResult[]
): Promise<string> {
  const aggressivenessLevel =
    params.tone === "aggressive"
      ? "extremely aggressive and strongly favor the property owner"
      : params.tone === "balanced"
        ? "balanced but lean toward the property owner's interests"
        : "conservative but still favor the property owner";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional property tax appeal expert writing a comprehensive report to support a property owner's tax appeal. 
        
Your analysis should be ${aggressivenessLevel}. Use every available fact to argue for a lower assessment.

The report should include:
1. Executive Summary (1-2 pages) - compelling case for reduction
2. Property Photos & Condition Assessment (3-8 pages) - IF photos provided, include with annotations showing defects and cost-to-cure. If no photos, skip this section.
3. Comparable Sales Analysis (3-5 pages) - show property is over-assessed
4. Market Analysis (2-3 pages) - demonstrate market trends support lower value
5. Valuation Justification (4-6 pages) - detailed explanation of why assessed value is wrong
6. Supporting Evidence (2-3 pages) - list all documents and data
7. Conclusion & Recommendations (1-2 pages) - clear call to action

TARGET 50-60 PAGES (MAXIMUM 80 PAGES).
Be specific, data-driven, and persuasive. Use professional language. Include property photos if provided.
Format as detailed markdown that can be converted to PDF.`,
      },
      {
        role: "user",
        content: `Generate a professional property tax appeal report for:

Property: ${submission.address}, ${submission.city}, ${submission.state} ${submission.zipCode}
Property Type: ${submission.propertyType}
Assessed Value: $${submission.assessedValue?.toLocaleString()}
Our Estimate: $${analysis.marketValueEstimate?.toLocaleString()}
Assessment Gap: $${analysis.assessmentGap?.toLocaleString()}
County: ${submission.county}

Analysis Data:
${analysis.executiveSummary || ""}
${analysis.valuationJustification || ""}

Photo Analysis Results:
${photoAnalysisResults ? JSON.stringify(photoAnalysisResults, null, 2) : "No photos provided - generate text-only report"}

Generate a comprehensive, persuasive report (TARGET 50-60 PAGES, MAX 80 PAGES) that maximizes the property owner's chances of winning their appeal. Include property photos with defect annotations if provided. If no photos, focus on comparable sales and market analysis.`,
      },
    ],
  });

  const reportContent = response.choices[0]?.message?.content;
  if (!reportContent || typeof reportContent !== "string") {
    throw new Error("Failed to generate report");
  }

  return reportContent;
}

/**
 * UTILITY: Format deadline calendar for display
 */
export function formatDeadlineCalendar(deadlines: CountyDeadline[]): string {
  const lines = [
    "# Property Tax Appeal Deadline Calendar\n",
    "| County | Appeal Deadline | Days Remaining | Status |",
    "|--------|-----------------|-----------------|--------|",
  ];

  for (const d of deadlines) {
    const statusEmoji =
      d.status === "critical"
        ? "🚨"
        : d.status === "urgent"
          ? "⚠️"
          : d.status === "passed"
            ? "❌"
            : "✅";

    lines.push(
      `| ${d.county} | ${d.appealDeadline.toLocaleDateString()} | ${d.daysUntilAppealDeadline} | ${statusEmoji} ${d.status.toUpperCase()} |`
    );
  }

  return lines.join("\n");
}
