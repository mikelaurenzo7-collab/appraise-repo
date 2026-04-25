/**
 * Analysis Job — Full Pipeline Orchestrator
 * 1. Classify property type (LLM + heuristic fallback)
 * 2. Aggregate data from RentCast, ReGRID, AttomData (with DB caching)
 * 3. Run USPAP-aligned LLM appraisal analysis
 * 4. Score appeal strength + generate jurisdiction-aware strategy
 * 5. Persist results to DB
 * 6. Write persistent activity logs for full audit trail
 * 7. Notify owner
 */

import { classifyPropertyType, classifyByAddressPattern } from "./propertyClassifier";
import { aggregatePropertyData } from "./propertyDataAggregator";
import { analyzeProperty } from "./appraisalAnalyzer";
import {
  createPropertyAnalysis,
  updatePropertySubmission,
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  persistActivityLog,
} from "../db";
import { notifyOwner } from "../_core/notification";
import { runPropertyResearch } from "./serperSearch";
import { getJurisdictionRules } from "../data/jurisdictionRules";
import { capturePropertyImagery } from "../_core/streetViewCapture";

// Prevent duplicate concurrent jobs for the same submission
const activeJobs = new Set<number>();

/**
 * Queue a background analysis job with optional delay.
 * Safe to call multiple times — duplicate jobs are silently dropped.
 */
export function queueAnalysisJob(submissionId: number, delayMs = 1000): void {
  if (activeJobs.has(submissionId)) {
    console.log(`[AnalysisJob] Job ${submissionId} already queued/running — skipping duplicate`);
    return;
  }
  setTimeout(() => {
    analyzePropertySubmission(submissionId).catch((err: unknown) => {
      console.error(`[AnalysisJob] Unhandled error for submission ${submissionId}:`, err);
    });
  }, delayMs);
}

export async function analyzePropertySubmission(submissionId: number): Promise<void> {
  if (activeJobs.has(submissionId)) return;
  activeJobs.add(submissionId);
  const startTime = Date.now();

  try {
    const submission = await getPropertySubmissionById(submissionId);
    if (!submission) {
      console.error(`[AnalysisJob] Submission ${submissionId} not found`);
      return;
    }

    console.log(`[AnalysisJob] Starting analysis for #${submissionId} — ${submission.address}`);

    // ── Mark as analyzing ────────────────────────────────────────────────────
    await updatePropertySubmission(submissionId, { status: "analyzing" });
    await persistActivityLog({
      submissionId,
      type: "analysis_started",
      actor: "system",
      description: `AI analysis pipeline started for ${submission.address}`,
      status: "success",
    });

    // ── Step 1: Classify property type ───────────────────────────────────────
    const llmType = await classifyPropertyType(
      submission.address,
      submission.squareFeet || undefined,
      submission.bedrooms || undefined,
      submission.bathrooms || undefined
    );
    const propertyType = llmType !== "unknown" ? llmType : classifyByAddressPattern(submission.address);

    await persistActivityLog({
      submissionId,
      type: "property_classified",
      actor: "system",
      description: `Property classified as: ${propertyType}`,
      metadata: JSON.stringify({ propertyType, llmType }),
      status: "success",
    });

    // ── Step 1b: Capture Google Maps imagery (fire-and-forget) ──────────────
    // Non-blocking — imagery is captured in the background while analysis runs.
    // Results are written to the DB when ready (usually within 5-10 seconds).
    capturePropertyImagery(submission.address).then(async (imagery) => {
      const imgUpdate: Record<string, string> = {};
      if (imagery.streetViewFront) imgUpdate.streetViewUrl = imagery.streetViewFront;
      if (imagery.satellite) imgUpdate.satelliteUrl = imagery.satellite;
      if (imagery.roadmap) imgUpdate.roadmapUrl = imagery.roadmap;
      if (imagery.geocoded?.lat) imgUpdate.lat = String(imagery.geocoded.lat);
      if (imagery.geocoded?.lng) imgUpdate.lng = String(imagery.geocoded.lng);
      if (Object.keys(imgUpdate).length > 0) {
        await updatePropertySubmission(submissionId, imgUpdate as any).catch(() => {});
        console.log(`[AnalysisJob] ✓ Imagery captured for #${submissionId} (${Object.keys(imgUpdate).join(", ")})`);
      }
    }).catch((err: unknown) => {
      console.warn(`[AnalysisJob] Imagery capture failed for #${submissionId} (non-critical):`, err instanceof Error ? err.message : err);
    });

    // ── Step 2: Aggregate data from all 4 APIs ───────────────────────────────
    await persistActivityLog({
      submissionId,
      type: "api_aggregation_started",
      actor: "system",
      description: "Querying RentCast, Realie, and AttomData in parallel",
      status: "success",
    });

    const propertyData = await aggregatePropertyData(
      submission.address,
      submission.city || "",
      submission.state || ""
    );

    await persistActivityLog({
      submissionId,
      type: "api_aggregation_complete",
      actor: "system",
      description: `Data aggregated — assessed: $${propertyData.assessedValue?.toLocaleString() ?? "N/A"}, market: $${propertyData.marketValue?.toLocaleString() ?? "N/A"}, ${propertyData.comparableSales?.length ?? 0} comps found`,
      metadata: JSON.stringify({
        assessedValue: propertyData.assessedValue,
        marketValue: propertyData.marketValue,
        squareFeet: propertyData.squareFeet,
        comparablesFound: propertyData.comparableSales?.length ?? 0,
        source: propertyData.source,
      }),
      status: "success",
    });

    // ── Step 2.5: Run Serper web research in parallel (non-blocking, best-effort) ──────────
    // Fires 6 scenario-specific Google searches to ground the LLM analysis in
    // current market data: assessor overvaluation, comps, market trends, zoning,
    // neighborhood distress, and prior appeal outcomes in the same county.
    let serperInsights = undefined;
    try {
      serperInsights = await Promise.race([
        runPropertyResearch({
          address: submission.address,
          city: submission.city || "",
          state: submission.state || "",
          county: propertyData.county || submission.county || "",
          propertyType,
          assessedValue: propertyData.assessedValue,
        }),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 15000)),
      ]);
      if (serperInsights) {
        const resultsCount = serperInsights.reduce((sum, i) => sum + i.results.length, 0);
        console.log(`[AnalysisJob] Serper research complete — ${serperInsights.length} scenarios, ${resultsCount} total results`);
        await persistActivityLog({
          submissionId,
          type: "api_aggregation_complete",
          actor: "system",
          description: `Web research complete — ${serperInsights.length} search scenarios, ${resultsCount} results (assessor overvaluation, comps, market trends, zoning, distress, appeal outcomes)`,
          status: "success",
        });
      }
    } catch (err) {
      console.warn("[AnalysisJob] Serper research failed (non-critical):", (err as Error).message);
    }
    // ── Step 3: Get jurisdiction rules ───────────────────────────────────────
    const state = submission.state || "";
    const jurisdictionRules = getJurisdictionRules(state);

    // ── Step 4: LLM analysis ─────────────────────────────────────────────────
    await persistActivityLog({
      submissionId,
      type: "llm_analysis_started",
      actor: "system",
      description: "LLM appraisal analysis running — USPAP-aligned methodology",
      status: "success",
    });

    const analysis = await analyzeProperty(propertyData, propertyType, serperInsights);

    await persistActivityLog({
      submissionId,
      type: "llm_analysis_complete",
      actor: "system",
      description: `LLM analysis complete — appeal strength: ${analysis.appealStrengthScore}/100, potential savings: $${analysis.potentialSavings?.toLocaleString() ?? "N/A"}, approach: ${analysis.recommendedApproach}`,
      metadata: JSON.stringify({
        appealStrengthScore: analysis.appealStrengthScore,
        potentialSavings: analysis.potentialSavings,
        marketValueEstimate: analysis.marketValueEstimate,
        assessmentGap: analysis.assessmentGap,
        recommendedApproach: analysis.recommendedApproach,
      }),
      status: "success",
    });

    // ── Step 5: Generate appeal strategy ─────────────────────────────────────
    const { generateAppealStrategy } = await import("./appealStrategy");
    const appealStrategy = generateAppealStrategy(
      state,
      propertyData.county || submission.county || undefined,
      propertyType,
      propertyData.assessedValue || 0,
      propertyData.marketValue || analysis.marketValueEstimate || 0,
      new Date()
    );

    if (appealStrategy) {
      await persistActivityLog({
        submissionId,
        type: "appeal_strategy_generated",
        actor: "system",
        description: `Appeal strategy: ${appealStrategy.filingMethod} — ${appealStrategy.successProbability}% estimated success`,
        metadata: JSON.stringify({
          filingMethod: appealStrategy.filingMethod,
          successProbability: appealStrategy.successProbability,
          daysUntilDeadline: appealStrategy.daysUntilDeadline,
          nextActions: appealStrategy.nextActions?.slice(0, 3),
        }),
        status: "success",
      });
    }

    // ── Step 6: Calculate appeal deadline ────────────────────────────────────
    let appealDeadline: Date | undefined;
    if (jurisdictionRules?.appealDeadlineDays) {
      appealDeadline = new Date();
      appealDeadline.setDate(appealDeadline.getDate() + jurisdictionRules.appealDeadlineDays);
    }

    // ── Step 7: Persist analysis record ──────────────────────────────────────
    const existingAnalysis = await getPropertyAnalysisBySubmissionId(submissionId);
    if (!existingAnalysis) {
      await createPropertyAnalysis({
        submissionId,
        lightboxData: JSON.stringify(propertyData), // Legacy column name — stores aggregated property data
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
        nextSteps: JSON.stringify(appealStrategy?.nextActions || analysis.nextSteps),
      });
    }

    // ── Step 8: Update submission with all results ────────────────────────────
    const validTypes = ["residential", "multi-family", "commercial", "agricultural", "industrial", "land", "unknown"] as const;
    type ValidType = (typeof validTypes)[number];
    const normalizedType: ValidType = validTypes.includes(propertyType as ValidType) ? (propertyType as ValidType) : "unknown";

    await updatePropertySubmission(submissionId, {
      status: "analyzed",
      propertyType: normalizedType,
      assessedValue: propertyData.assessedValue,
      marketValue: propertyData.marketValue || analysis.marketValueEstimate,
      potentialSavings: analysis.potentialSavings,
      appealStrengthScore: analysis.appealStrengthScore,
      county: propertyData.county || undefined,
      squareFeet: propertyData.squareFeet,
      yearBuilt: propertyData.yearBuilt,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      appealDeadline: appealDeadline,
    });

    const durationMs = Date.now() - startTime;
    const strengthLabel =
      analysis.appealStrengthScore >= 70 ? "STRONG appeal candidate" :
      analysis.appealStrengthScore >= 40 ? "Moderate appeal potential" : "Low appeal potential";

    await persistActivityLog({
      submissionId,
      type: "analysis_complete",
      actor: "system",
      description: `Pipeline complete in ${(durationMs / 1000).toFixed(1)}s — ${strengthLabel}`,
      metadata: JSON.stringify({
        durationMs,
        appealStrengthScore: analysis.appealStrengthScore,
        potentialSavings: analysis.potentialSavings,
        propertyType: normalizedType,
        appealDeadline: appealDeadline?.toISOString(),
      }),
      status: "success",
      durationMs,
    });

    // ── Step 9: Notify owner ──────────────────────────────────────────────────
    await notifyOwner({
      title: `Analysis Complete — ${strengthLabel}`,
      content: `Property: ${submission.address}\n\nMarket Value: $${analysis.marketValueEstimate.toLocaleString()}\nAssessed Value: $${propertyData.assessedValue?.toLocaleString() ?? "N/A"}\nAssessment Gap: $${analysis.assessmentGap.toLocaleString()}\nAppeal Strength: ${analysis.appealStrengthScore}/100\nPotential Savings: $${analysis.potentialSavings?.toLocaleString() ?? "N/A"}/yr\nApproach: ${analysis.recommendedApproach.toUpperCase()}\nFiling: ${submission.filingMethod || "POA"}\nDeadline: ${appealDeadline?.toLocaleDateString() ?? "TBD"}\n\nView: /analysis?id=${submissionId}`,
    }).catch((err: unknown) => console.error("[AnalysisJob] Failed to notify owner:", err));
    // Queue report generation (24-hour SLA)

    console.log(`[AnalysisJob] ✓ Completed #${submissionId} in ${durationMs}ms — score: ${analysis.appealStrengthScore}/100`);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[AnalysisJob] ✗ Error for submission ${submissionId}:`, errMsg);

    await persistActivityLog({
      submissionId,
      type: "analysis_error",
      actor: "system",
      description: `Analysis pipeline failed: ${errMsg}`,
      metadata: JSON.stringify({ error: errMsg }),
      status: "error",
      durationMs: Date.now() - startTime,
    }).catch(() => {});

    // Reset to pending so it can be re-triggered
    await updatePropertySubmission(submissionId, { status: "pending" }).catch(() => {});
  } finally {
    activeJobs.delete(submissionId);
  }
}
