/**
 * Analysis Job — Full Pipeline Orchestrator
 * 1. Classify property type (LLM + heuristic fallback)
 * 2. Aggregate data from Lightbox, RentCast, ReGRID, AttomData (with DB caching)
 * 3. Run USPAP-aligned LLM appraisal analysis
 * 4. Score appeal strength + generate jurisdiction-aware strategy
 * 5. Persist results to DB
 * 6. Write persistent activity logs for full audit trail
 * 7. Notify owner
 */

import { classifyPropertyType, classifyByAddressPattern } from "./propertyClassifier";
import { aggregatePropertyData } from "./propertyDataAggregator";
import { analyzeProperty } from "./appraisalAnalyzer";
import { analyzePropertyPhotos, type PhotoAnalysisSummary } from "./photoAnalyzer";
import {
  createPropertyAnalysis,
  updatePropertySubmission,
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  getSubmissionPhotos,
  persistActivityLog,
} from "../db";
import { notifyOwner } from "../_core/notification";
import { getJurisdictionRules } from "../data/jurisdictionRules";
import {
  getScenarioContext,
  calculateScenarioAdjustedValue,
  calculateScenarioAppealStrength,
  calculateScenarioTaxSavings,
  generateScenarioPromptContext,
  getScenarioApproachOverride,
  type UserScenario,
} from "./scenarioValuation";
import { sendAnalysisConfirmationEmail } from "../_core/emailService";
import { broadcastAnalysisUpdate } from "../_core/sseBroadcaster";

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
    broadcastAnalysisUpdate(submissionId, "status", { status: "analyzing", message: "Starting AI analysis pipeline..." });

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
    broadcastAnalysisUpdate(submissionId, "step", { step: "property_classified", propertyType });

    // ── Step 2: Aggregate data from all 4 APIs ───────────────────────────────
    await persistActivityLog({
      submissionId,
      type: "api_aggregation_started",
      actor: "system",
      description: "Querying Lightbox, RentCast, ReGRID, and AttomData in parallel",
      status: "success",
    });
    broadcastAnalysisUpdate(submissionId, "step", { step: "api_aggregation_started", message: "Fetching property data from 4 sources..." });

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
    broadcastAnalysisUpdate(submissionId, "step", {
      step: "api_aggregation_complete",
      assessedValue: propertyData.assessedValue,
      marketValue: propertyData.marketValue,
      comparablesFound: propertyData.comparableSales?.length ?? 0,
    });

    // ── Step 3: Get jurisdiction rules ───────────────────────────────────────
    const state = submission.state || "";
    const jurisdictionRules = getJurisdictionRules(state);

    // ── Step 3b: Load scenario context ───────────────────────────────────────
    const userScenario = (submission.userScenario || "none") as UserScenario;
    const scenarioContext = getScenarioContext(userScenario);

    await persistActivityLog({
      submissionId,
      type: "scenario_loaded",
      actor: "system",
      description: `Scenario-aware analysis: ${scenarioContext.scenarioLabel}`,
      metadata: JSON.stringify({
        scenario: userScenario,
        scenarioLabel: scenarioContext.scenarioLabel,
        urgency: scenarioContext.appealStrengthModifiers.urgencyLevel,
      }),
      status: "success",
    });

    // ── Step 4: LLM analysis (scenario-aware) ────────────────────────────────
    await persistActivityLog({
      submissionId,
      type: "llm_analysis_started",
      actor: "system",
      description: "LLM appraisal analysis running — USPAP-aligned, scenario-aware methodology",
      status: "success",
    });

    const analysis = await analyzeProperty(propertyData, propertyType);

    // ── Step 4b: Apply scenario adjustments ──────────────────────────────────
    const scenarioAdjustedValue = calculateScenarioAdjustedValue(
      analysis.marketValueEstimate,
      userScenario,
      propertyData
    );

    const scenarioAdjustedGap = (propertyData.assessedValue || 0) - scenarioAdjustedValue;
    const scenarioGapPercent = propertyData.assessedValue
      ? (scenarioAdjustedGap / propertyData.assessedValue) * 100
      : 0;

    const scenarioAppealStrength = calculateScenarioAppealStrength(
      analysis.appealStrengthScore,
      scenarioGapPercent,
      userScenario
    );

    const scenarioTaxSavings = calculateScenarioTaxSavings(
      Math.max(0, scenarioAdjustedGap),
      userScenario,
      0.012 // Default US average tax rate; jurisdiction-specific rates can be added to JurisdictionRule
    );

    // Override recommended approach based on scenario
    const approachOverride = getScenarioApproachOverride(userScenario, scenarioAppealStrength);
    const finalApproach = approachOverride || analysis.recommendedApproach;

    // ── Step 4c: Photo condition analysis (additive, never blocking) ─────────
    let photoSummary: PhotoAnalysisSummary | null = null;
    let appealStrengthAfterPhotos = scenarioAppealStrength;
    try {
      const photos = await getSubmissionPhotos(submissionId);
      if (photos.length > 0) {
        broadcastAnalysisUpdate(submissionId, "step", {
          step: "photo_analysis_started",
          message: `Analyzing ${photos.length} photo${photos.length === 1 ? "" : "s"} for condition evidence...`,
          photoCount: photos.length,
        });
        photoSummary = await analyzePropertyPhotos(photos);
        if (photoSummary.findings.length > 0) {
          appealStrengthAfterPhotos = Math.max(
            0,
            Math.min(100, scenarioAppealStrength + photoSummary.appealStrengthDelta),
          );
          await persistActivityLog({
            submissionId,
            type: "photo_analysis_complete",
            actor: "system",
            description: `Photo analysis complete — ${photoSummary.findings.length} photo${photoSummary.findings.length === 1 ? "" : "s"} analyzed, condition: ${photoSummary.overallConditionScore}/100, appeal-strength delta: ${photoSummary.appealStrengthDelta >= 0 ? "+" : ""}${photoSummary.appealStrengthDelta}`,
            metadata: JSON.stringify({
              photoCount: photoSummary.findings.length,
              overallConditionScore: photoSummary.overallConditionScore,
              overallEvidenceStrength: photoSummary.overallEvidenceStrength,
              appealStrengthDelta: photoSummary.appealStrengthDelta,
              topObservations: photoSummary.topObservations,
              topValueIssues: photoSummary.topValueIssues,
            }),
            status: "success",
          });
          broadcastAnalysisUpdate(submissionId, "step", {
            step: "photo_analysis_complete",
            photoCount: photoSummary.findings.length,
            conditionScore: photoSummary.overallConditionScore,
            appealStrengthDelta: photoSummary.appealStrengthDelta,
          });
        }
      }
    } catch (err) {
      console.warn(`[AnalysisJob] Photo analysis failed (non-blocking) for #${submissionId}:`, (err as Error).message);
    }

    await persistActivityLog({
      submissionId,
      type: "scenario_adjustments_applied",
      actor: "system",
      description: `Scenario adjustments applied — value: $${scenarioAdjustedValue.toLocaleString()}, strength: ${scenarioAppealStrength}/100, savings: $${scenarioTaxSavings.toLocaleString()}/yr`,
      metadata: JSON.stringify({
        baseMarketValue: analysis.marketValueEstimate,
        scenarioAdjustedValue,
        baseAppealStrength: analysis.appealStrengthScore,
        scenarioAppealStrength,
        baseSavings: analysis.potentialSavings,
        scenarioTaxSavings,
        finalApproach,
        scenario: userScenario,
      }),
      status: "success",
    });

    await persistActivityLog({
      submissionId,
      type: "llm_analysis_complete",
      actor: "system",
      description: `LLM analysis complete — appeal strength: ${scenarioAppealStrength}/100, potential savings: $${scenarioTaxSavings.toLocaleString() ?? "N/A"}, approach: ${finalApproach}`,
      metadata: JSON.stringify({
        appealStrengthScore: scenarioAppealStrength,
        potentialSavings: scenarioTaxSavings,
        marketValueEstimate: scenarioAdjustedValue,
        assessmentGap: scenarioAdjustedGap,
        recommendedApproach: finalApproach,
        scenario: userScenario,
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
      scenarioAdjustedValue,
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

    // ── Step 7: Persist analysis record (with scenario context) ──────────────
    const existingAnalysis = await getPropertyAnalysisBySubmissionId(submissionId);
    if (!existingAnalysis) {
      await createPropertyAnalysis({
        submissionId,
        lightboxData: JSON.stringify(propertyData),
        rentcastData: JSON.stringify(propertyData.rentalComps || []),
        regrindData: JSON.stringify(propertyData),
        attomData: JSON.stringify(propertyData),
        comparableSales: JSON.stringify(propertyData.comparableSales || []),
        marketValueEstimate: scenarioAdjustedValue,
        assessmentGap: scenarioAdjustedGap,
        appealStrengthFactors: JSON.stringify([
          ...analysis.appealStrengthFactors,
          `Scenario: ${scenarioContext.scenarioLabel}`,
          ...scenarioContext.userAdvocacyPoints.slice(0, 2),
          ...(photoSummary && photoSummary.findings.length > 0
            ? [
                `Photo evidence: ${photoSummary.findings.length} photo${photoSummary.findings.length === 1 ? "" : "s"} analyzed (condition ${photoSummary.overallConditionScore}/100)`,
                ...photoSummary.topValueIssues.slice(0, 3).map(i => `Photo observation: ${i}`),
              ]
            : []),
        ]),
        recommendedApproach: finalApproach,
        executiveSummary: analysis.executiveSummary,
        valuationJustification:
          `${analysis.valuationJustification}\n\nScenario Context (${scenarioContext.scenarioLabel}): ${scenarioContext.narrativeTemplate}` +
          (photoSummary && photoSummary.findings.length > 0
            ? `\n\nProperty Condition Evidence: ${photoSummary.summaryParagraph}`
            : ""),
        nextSteps: JSON.stringify(appealStrategy?.nextActions || analysis.nextSteps),
        scenarioContext: JSON.stringify({
          scenario: userScenario,
          scenarioLabel: scenarioContext.scenarioLabel,
          urgencyLevel: scenarioContext.appealStrengthModifiers.urgencyLevel,
          adjustments: scenarioContext.valuationAdjustments,
        }),
        valuationApproachWeights: JSON.stringify({
          market: scenarioContext.valuationAdjustments.marketApproachWeight,
          income: scenarioContext.valuationAdjustments.incomeApproachWeight,
          cost: scenarioContext.valuationAdjustments.costApproachWeight,
        }),
        compQualityBreakdown: JSON.stringify({
          totalComps: propertyData.comparableSales?.length ?? 0,
          filteredComps: propertyData.comparableSales?.length ?? 0,
          strategy: scenarioContext.compFilterStrategy,
        }),
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
      marketValue: scenarioAdjustedValue,
      estimatedMarketValueLow: Math.round(scenarioAdjustedValue * 0.92),
      estimatedMarketValueHigh: Math.round(scenarioAdjustedValue * 1.08),
      potentialSavings: scenarioTaxSavings,
      appealStrengthScore: appealStrengthAfterPhotos,
      confidenceScore: Math.round(scenarioContext.appealStrengthModifiers.evidenceStrengthMultiplier * 80),
      compQualityScore: Math.round(scenarioContext.valuationAdjustments.marketApproachWeight * 100),
      county: propertyData.county || undefined,
      squareFeet: propertyData.squareFeet,
      yearBuilt: propertyData.yearBuilt,
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      appealDeadline: appealDeadline,
    });

    const durationMs = Date.now() - startTime;
    const strengthLabel =
      appealStrengthAfterPhotos >= 70 ? "STRONG appeal candidate" :
      appealStrengthAfterPhotos >= 40 ? "Moderate appeal potential" : "Low appeal potential";

    await persistActivityLog({
      submissionId,
      type: "analysis_complete",
      actor: "system",
      description: `Pipeline complete in ${(durationMs / 1000).toFixed(1)}s — ${strengthLabel}`,
      metadata: JSON.stringify({
        durationMs,
        appealStrengthScore: appealStrengthAfterPhotos,
        potentialSavings: scenarioTaxSavings,
        propertyType: normalizedType,
        appealDeadline: appealDeadline?.toISOString(),
        photoAnalysis: photoSummary && photoSummary.findings.length > 0
          ? {
              photoCount: photoSummary.findings.length,
              conditionScore: photoSummary.overallConditionScore,
              appealStrengthDelta: photoSummary.appealStrengthDelta,
            }
          : null,
      }),
      status: "success",
      durationMs,
    });    broadcastAnalysisUpdate(submissionId, "complete", {
      status: "analyzed",
      appealStrengthScore: appealStrengthAfterPhotos,
      potentialSavings: scenarioTaxSavings,
      marketValueEstimate: scenarioAdjustedValue,
      assessmentGap: scenarioAdjustedGap,
      scenario: userScenario,
      durationMs,
    });
    // ── Step 9: Notify owner ──────────────────────────────────────────────────
    await notifyOwner({
      title: `Analysis Complete — ${strengthLabel} (${scenarioContext.scenarioLabel})`,
      content: `Property: ${submission.address}\nScenario: ${scenarioContext.scenarioLabel}\n\nMarket Value: $${scenarioAdjustedValue.toLocaleString()}\nAssessed Value: $${propertyData.assessedValue?.toLocaleString() ?? "N/A"}\nAssessment Gap: $${scenarioAdjustedGap.toLocaleString()}\nAppeal Strength: ${appealStrengthAfterPhotos}/100\nPotential Savings: $${scenarioTaxSavings.toLocaleString()}/yr\nApproach: ${finalApproach.toUpperCase()}\nFiling: ${submission.filingMethod || "POA"}\nDeadline: ${appealDeadline?.toLocaleDateString() ?? "TBD"}\nUrgency: ${scenarioContext.appealStrengthModifiers.urgencyLevel.toUpperCase()}\n\nView: /analysis?id=${submissionId}`,
    }).catch((err: unknown) => console.error("[AnalysisJob] Failed to notify owner:", err));
    // Queue report generation (24-hour SLA)

    // ── Step 9b: Send user email confirmation ────────────────────────────────
    if (submission.email) {
      await sendAnalysisConfirmationEmail({
        userEmail: submission.email,
        userName: submission.email.split("@")[0],
        propertyAddress: submission.address,
        appealStrengthScore: appealStrengthAfterPhotos,
      }).catch((err: unknown) => console.error("[AnalysisJob] Failed to send confirmation email:", err));
    }

    console.log(`[AnalysisJob] ✓ Completed #${submissionId} in ${durationMs}ms — score: ${appealStrengthAfterPhotos}/100, scenario: ${userScenario}`);

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
