/**
 * Batch Processing Service
 *
 * Handles bulk property submissions for portfolios and commercial clients.
 * Two processing modes:
 *  - `processBatch`             — sequential, real-time, Forge/Gemini path
 *  - `processBatchViaClaudeAPI` — async, ~50% cheaper via Anthropic Batch API
 *
 * Use `processBatchViaClaudeAPI` for portfolios of 10+ properties when the
 * caller can tolerate async results (returns a batchId to poll).
 */

// import { PropertySubmission } from "../../drizzle/schema";
import { analyzeProperty } from "./appraisalAnalyzer";
import { classifyPropertyType } from "./propertyClassifier";
import { aggregatePropertyData } from "./propertyDataAggregator";
import {
  isClaudeAvailable,
  submitClaudeBatch,
  pollClaudeBatch,
  type ClaudeBatchRequest,
} from "../_core/claude";
import { APPRAISAL_SYSTEM_PROMPT_EXPORT } from "./appraisalAnalyzer";

export interface BatchSubmissionRequest {
  clientId: string;
  clientName: string;
  properties: Array<{
    address: string;
    city: string;
    state: string;
    zipCode: string;
    county?: string;
    propertyType?: string;
    assessedValue?: number;
  }>;
  filingMethod: "poa" | "pro-se";
  contactEmail: string;
  contactPhone?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type AppraisalAnalysis = any;

export interface BatchProcessingResult {
  batchId: string;
  totalProperties: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  averageAnalysisTime: number;
  estimatedTotalSavings: number;
  properties: Array<{
    address: string;
    status: "success" | "failed" | "pending";
    error?: string;
    estimatedSavings?: number;
  }>;
}

/**
 * Process a batch of property submissions
 */
export async function processBatch(request: BatchSubmissionRequest): Promise<BatchProcessingResult> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const results: BatchProcessingResult = {
    batchId,
    totalProperties: request.properties.length,
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    averageAnalysisTime: 0,
    estimatedTotalSavings: 0,
    properties: [],
  };

  // Log batch start
  console.log(`[Batch] Batch processing started: ${request.clientName} - ${request.properties.length} properties (${batchId})`);

  // Process each property
  for (const prop of request.properties) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const propertyType = prop.propertyType || (await classifyPropertyType(prop.address)) || "residential";
      const aggregatedData = await aggregatePropertyData(
        prop.address,
        prop.city,
        prop.state
      );

      const analysis = await analyzeProperty({
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zipCode: prop.zipCode,
        county: prop.county,
        assessedValue: prop.assessedValue || aggregatedData.assessedValue || 0,
        aggregatedData: aggregatedData as any,
      } as any);

      const marketValue = aggregatedData.marketValue || aggregatedData.assessedValue || 0;
      const estimatedSavings = calculateEstimatedSavings(
        prop.assessedValue || aggregatedData.assessedValue || 0,
        marketValue
      );

      results.properties.push({
        address: prop.address,
        status: "success",
        estimatedSavings: Math.round(estimatedSavings),
      });

      results.successCount++;
      results.estimatedTotalSavings += estimatedSavings;
    } catch (error) {
      results.properties.push({
        address: prop.address,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        estimatedSavings: 0,
      });
      results.failureCount++;
    }

    results.processedCount++;
  }

  // Calculate average analysis time
  results.averageAnalysisTime = (Date.now() - startTime) / request.properties.length;

  // Log batch completion
  console.log(`[Batch] Batch processing completed: ${results.successCount}/${results.totalProperties} successful (${batchId})`);
  console.log(`[Batch] Estimated total savings: $${results.estimatedTotalSavings.toLocaleString()}`);

  return results;
}

/**
 * Calculate estimated annual savings based on overassessment
 */
function calculateEstimatedSavings(assessedValue: number, marketValue: number): number {
  if (assessedValue <= marketValue) return 0;

  const overassessment = assessedValue - marketValue;
  const overassessmentPercent = overassessment / assessedValue;

  // Assume average property tax rate of 1.2% and success rate of 50%
  const avgTaxRate = 0.012;
  const successRate = 0.5;

  return Math.round(overassessment * avgTaxRate * successRate);
}

/**
 * Generate batch summary report
 */
export function generateBatchSummary(result: BatchProcessingResult) {
  return {
    batchId: result.batchId,
    summary: {
      totalProperties: result.totalProperties,
      successfulAnalyses: result.successCount,
      failedAnalyses: result.failureCount,
      successRate: ((result.successCount / result.totalProperties) * 100).toFixed(1) + "%",
      averageAnalysisTimeMs: Math.round(result.averageAnalysisTime),
      estimatedTotalSavings: `$${result.estimatedTotalSavings.toLocaleString()}`,
    },
    properties: result.properties.map((p) => ({
      address: p.address,
      status: p.status,
      estimatedSavings: p.estimatedSavings ? `$${p.estimatedSavings.toLocaleString()}` : "N/A",
      error: p.error,
    })),
  };
}

// ---------------------------------------------------------------------------
// Anthropic Message Batches API — portfolio analysis at ~50% cost
// ---------------------------------------------------------------------------

export interface ClaudeBatchPortfolioResult {
  batchId: string;
  status: "submitted" | "completed" | "unavailable";
  /** Set once polling completes. */
  properties?: Array<{
    address: string;
    rawJson: string;
    error?: string;
  }>;
}

/**
 * Submit a portfolio of properties to the Anthropic Batch API for analysis.
 * ~50% cheaper than real-time calls; results arrive asynchronously.
 *
 * Pass `await: true` to block until the batch completes (up to 10 min).
 * Pass `await: false` (default) to return immediately with the batchId for
 * later polling via `pollClaudeBatch(batchId)` from `_core/claude`.
 *
 * Falls back to `{ status: "unavailable" }` when ANTHROPIC_API_KEY is not set.
 */
export async function processBatchViaClaudeAPI(
  request: BatchSubmissionRequest,
  options: { await?: boolean; pollTimeoutMs?: number } = {}
): Promise<ClaudeBatchPortfolioResult> {
  if (!isClaudeAvailable()) {
    return { batchId: "", status: "unavailable" };
  }

  const { await: shouldAwait = false, pollTimeoutMs = 600_000 } = options;

  // Build one batch request per property using the same prompt structure as
  // analyzeProperty(), so results parse identically.
  const requests: ClaudeBatchRequest[] = request.properties.map((prop, i) => {
    const dataSummary =
      `Property Address: ${prop.address}, ${prop.city}, ${prop.state} ${prop.zipCode}\n` +
      `Property Type: ${(prop.propertyType ?? "Residential").charAt(0).toUpperCase() + (prop.propertyType ?? "residential").slice(1)}\n` +
      `County: ${prop.county ?? "Unknown"}\n` +
      `Current Assessment: $${(prop.assessedValue ?? 0).toLocaleString()}\n`;

    return {
      customId: `prop_${i}_${prop.address.replace(/\s+/g, "_").slice(0, 40)}`,
      systemPrompt: APPRAISAL_SYSTEM_PROMPT_EXPORT,
      userMessage:
        `Analyze the following property for a potential property-tax appeal.\n\n` +
        dataSummary +
        `\nRespond ONLY with valid JSON matching the appraisal_analysis schema ` +
        `(marketValueEstimate, assessmentGap, assessmentGapPercent, appealStrengthScore, ` +
        `appealStrengthFactors, recommendedApproach, executiveSummary, valuationJustification, ` +
        `potentialSavings, nextSteps).`,
      maxTokens: 4096,
    };
  });

  const batchId = await submitClaudeBatch(requests);
  console.log(`[Batch] Claude Batch API submitted: ${batchId} (${requests.length} properties)`);

  if (!shouldAwait) {
    return { batchId, status: "submitted" };
  }

  // Block until the batch finishes, then map results back to addresses.
  const results = await pollClaudeBatch(batchId, { timeoutMs: pollTimeoutMs });
  const properties = requests.map((req) => {
    const hit = results.find((r) => r.customId === req.customId);
    return {
      address: req.userMessage.split("\n")[2]?.replace("Property Address: ", "") ?? req.customId,
      rawJson: hit?.text ?? "",
      error: hit?.error,
    };
  });

  console.log(`[Batch] Claude Batch API completed: ${batchId} (${results.length} results)`);

  return { batchId, status: "completed", properties };
}

/**
 * Validate batch submission request
 */
export function validateBatchRequest(request: BatchSubmissionRequest): string[] {
  const errors: string[] = [];

  if (!request.clientId) errors.push("Client ID is required");
  if (!request.clientName) errors.push("Client name is required");
  if (!request.contactEmail) errors.push("Contact email is required");
  if (!request.properties || request.properties.length === 0) errors.push("At least one property is required");
  if (request.properties.length > 1000) errors.push("Batch size cannot exceed 1000 properties");

  request.properties.forEach((prop, index) => {
    if (!prop.address) errors.push(`Property ${index + 1}: Address is required`);
    if (!prop.city) errors.push(`Property ${index + 1}: City is required`);
    if (!prop.state) errors.push(`Property ${index + 1}: State is required`);
    if (!prop.zipCode) errors.push(`Property ${index + 1}: ZIP code is required`);
  });

  return errors;
}
