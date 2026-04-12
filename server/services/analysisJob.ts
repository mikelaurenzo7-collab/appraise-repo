import { classifyPropertyType, classifyByAddressPattern } from "./propertyClassifier";
import { aggregatePropertyData } from "./propertyDataAggregator";
import { analyzeProperty } from "./appraisalAnalyzer";
import { createPropertyAnalysis, updatePropertySubmission, getPropertySubmissionById } from "../db";
import { notifyOwner } from "../_core/notification";
import type { PropertySubmission } from "../../drizzle/schema";

/**
 * Background job to analyze a property submission
 * Called asynchronously after user submits address
 */
export async function analyzePropertySubmission(submissionId: number): Promise<void> {
  try {
    console.log(`[AnalysisJob] Starting analysis for submission ${submissionId}`);

    // Get submission
    const submission = await getPropertySubmissionById(submissionId);
    if (!submission) {
      console.error(`[AnalysisJob] Submission ${submissionId} not found`);
      return;
    }

    // Update status to analyzing
    await updatePropertySubmission(submissionId, { status: "analyzing" });

    // Step 1: Classify property type
    console.log(`[AnalysisJob] Classifying property type...`);
    const propertyType = await classifyPropertyType(
      submission.address,
      submission.squareFeet || undefined,
      submission.bedrooms || undefined,
      submission.bathrooms || undefined
    );

    // Fallback to heuristic if LLM fails
    const finalPropertyType = propertyType !== "unknown" ? propertyType : classifyByAddressPattern(submission.address);

    // Step 2: Aggregate data from all APIs
    console.log(`[AnalysisJob] Aggregating property data from APIs...`);
    const propertyData = await aggregatePropertyData(
      submission.address,
      submission.city || "",
      submission.state || ""
    );

    // Step 3: Analyze with LLM
    console.log(`[AnalysisJob] Running LLM analysis...`);
    const analysis = await analyzeProperty(propertyData, finalPropertyType);

    // Step 4: Store analysis results
    console.log(`[AnalysisJob] Storing analysis results...`);
    const analysisRecord = await createPropertyAnalysis({
      submissionId,
      lightboxData: JSON.stringify(propertyData),
      rentcastData: JSON.stringify(propertyData.rentalComps || []),
      regrindData: JSON.stringify(propertyData),
      attomData: JSON.stringify(propertyData),
      comparableSales: JSON.stringify(propertyData.comparableSales || []),
      marketValueEstimate: analysis.marketValueEstimate,
      assessmentGap: analysis.assessmentGap,
      appealStrengthFactors: JSON.stringify(analysis.appealStrengthFactors),
      recommendedApproach: analysis.recommendedApproach,
      executiveSummary: analysis.executiveSummary,
      valuationJustification: analysis.valuationJustification,
      nextSteps: JSON.stringify(analysis.nextSteps),
    });

    // Step 5: Update submission with analysis results
    console.log(`[AnalysisJob] Updating submission with results...`);
    await updatePropertySubmission(submissionId, {
      status: "analyzed",
      propertyType: finalPropertyType,
      marketValue: analysis.marketValueEstimate,
      potentialSavings: analysis.potentialSavings,
      appealStrengthScore: analysis.appealStrengthScore,
      squareFeet: propertyData.squareFeet,
      yearBuilt: propertyData.yearBuilt,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      county: propertyData.county,
    });

    // Step 6: Notify owner of analysis completion
    console.log(`[AnalysisJob] Notifying owner...`);
    await notifyOwner({
      title: "Property Analysis Complete",
      content: `Analysis completed for ${submission.address}\n\nMarket Value: $${analysis.marketValueEstimate.toLocaleString()}\nAssessment Gap: $${analysis.assessmentGap.toLocaleString()}\nAppeal Strength: ${analysis.appealStrengthScore}/100\nRecommended: ${analysis.recommendedApproach.toUpperCase()}`,
    }).catch((err: unknown) => console.error("[AnalysisJob] Failed to notify owner:", err));

    console.log(`[AnalysisJob] Analysis complete for submission ${submissionId}`);
  } catch (error) {
    console.error(`[AnalysisJob] Error analyzing submission ${submissionId}:`, error);

    // Update status to error
    await updatePropertySubmission(submissionId, { status: "analyzed" }).catch((err: unknown) =>
      console.error("[AnalysisJob] Failed to update submission status:", err)
    );
  }
}

/**
 * Queue analysis job to run asynchronously
 * In production, this would use a job queue (Bull, RabbitMQ, etc)
 * For now, we'll use setTimeout to simulate async processing
 */
export function queueAnalysisJob(submissionId: number, delayMs: number = 1000): void {
  setTimeout(() => {
    analyzePropertySubmission(submissionId).catch((err: unknown) => {
      console.error(`[AnalysisJob] Unhandled error for submission ${submissionId}:`, err);
    });
  }, delayMs);
}
