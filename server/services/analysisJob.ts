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
import { analyzeProperty, computeCompPriceBand } from "./appraisalAnalyzer";
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
import { runPropertyResearch } from "./webResearch";
import { getJurisdictionRule } from "../db-jurisdiction-helpers";
import { capturePropertyImagery } from "../_core/streetViewCapture";
import {
  getScenarioContext,
  calculateScenarioAdjustedValue,
  calculateScenarioAppealStrength,
  calculateScenarioTaxSavings,
  generateScenarioPromptContext,
  getScenarioApproachOverride,
  applyCompFilterStrategy,
  type UserScenario,
} from "./scenarioValuation";
import { broadcastAnalysisUpdate } from "../_core/sseBroadcaster";
import { sendAnalysisConfirmationEmail } from "../_core/emailService";
import { analyzeUniformity } from "./uniformityAnalyzer";
import { detectRecordErrors } from "./recordErrorDetector";
import {
  generateAssessorPersuasionBrief,
  type BriefAudience,
  type PersuasionBrief,
} from "./assessorPersuasionBrief";

// Prevent duplicate concurrent jobs for the same submission
const activeJobs = new Set<number>();

/**
 * Queue a background analysis job with optional delay.
 * Safe to call multiple times — duplicate jobs are silently dropped.
 *
 * On Vercel (serverless) we cannot rely on setTimeout — the function may
 * exit before it fires. Instead we mark the submission as "pending" and
 * let the /api/cron?task=process-analysis endpoint pick it up.
 * On long-running runtimes (local dev / self-host) we still kick off the
 * in-process timeout for the snappiest user experience.
 */
export function queueAnalysisJob(submissionId: number, delayMs = 1000): void {
  if (activeJobs.has(submissionId)) {
    console.log(`[AnalysisJob] Job ${submissionId} already queued/running — skipping duplicate`);
    return;
  }

  // Always ensure DB state reflects "queued" so the cron can recover the
  // job if the in-process scheduler never gets to fire (Vercel cold start
  // exits, local crash, etc.). Best-effort — don't block the request.
  void (async () => {
    try {
      const { updatePropertySubmission, getPropertySubmissionById } = await import("../db");
      const submission = await getPropertySubmissionById(submissionId);
      if (submission && submission.status !== "analyzing" && submission.status !== "analyzed") {
        await updatePropertySubmission(submissionId, { status: "pending" });
      }
    } catch (err) {
      console.error(`[AnalysisJob] Failed to mark #${submissionId} pending:`, err);
    }
  })();

  // On Vercel we don't try to run analysis in-process — the function will
  // exit before LLM calls finish. Cron will pick it up within ~30s.
  if (process.env.VERCEL === "1") {
    console.log(`[AnalysisJob] #${submissionId} queued for cron pickup (Vercel serverless)`);
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

    const county = submission.county || "Unknown";

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

    // ── Steps 1 + 2 + photo fetch run in PARALLEL ────────────────────────────
    // All three are independent of each other:
    //   • classifyPropertyType    — needs only submission.{address, sqft, beds, baths}
    //   • aggregatePropertyData   — needs only submission.{address, city, state}
    //   • getSubmissionPhotos     — DB read, no LLM
    // Running them concurrently shaves the LLM classification round-trip (~3-5s)
    // off the critical path.
    broadcastAnalysisUpdate(submissionId, "step", {
      step: "api_aggregation_started",
      message: "Classifying property type, fetching data, and loading photos in parallel...",
    });

    const [llmType, propertyData, photosForAnalysis] = await Promise.all([
      classifyPropertyType(
        submission.address,
        submission.squareFeet || undefined,
        submission.bedrooms || undefined,
        submission.bathrooms || undefined,
      ).catch(() => "unknown" as const),
      aggregatePropertyData(submission.address, submission.city || "", submission.state || ""),
      getSubmissionPhotos(submissionId).catch(() => []),
    ]);

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

    // ── Step 2.5: Claude dual-capability research (non-blocking, best-effort) ──────────────
    // Claude Sonnet with web_search_20250305 synthesizes live market intelligence:
    // assessor overvaluation evidence, comparable sales, market trends, neighborhood
    // distress, zoning issues, and prior appeal outcomes in the same county.
    let researchInsights = undefined;

    // Run Claude research only — photos are analyzed in the dedicated pre-analysis
    // step below so we don't pay for duplicate vision calls.
    const [researchResult] = await Promise.allSettled([
      Promise.race([
        runPropertyResearch({
          address: submission.address,
          city: submission.city || "",
          state: submission.state || "",
          county: propertyData.county || submission.county || "",
          propertyType,
          assessedValue: propertyData.assessedValue,
        }),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 30000)),
      ]),
    ]);

    if (researchResult.status === "fulfilled" && researchResult.value) {
      researchInsights = researchResult.value;
      const sourceCount = researchInsights.reduce((sum, i) => sum + i.results.length, 0);
      console.log(`[AnalysisJob] ✓ Claude research complete — ${researchInsights.length} scenarios, ${sourceCount} grounded sources`);
      await persistActivityLog({
        submissionId,
        type: "api_aggregation_complete",
        actor: "system",
        description: `Claude web-search intelligence complete — ${researchInsights.length} research scenarios with ${sourceCount} live sources (overvaluation evidence, comps, market trends, neighborhood distress, zoning, appeal outcomes)`,
        status: "success",
      });
    } else if (researchResult.status === "rejected") {
      console.warn("[AnalysisJob] Claude research failed (non-critical):", (researchResult.reason as Error)?.message);
    }
    // ── Step 3: Get jurisdiction rules ───────────────────────────────────────
    const state = submission.state || "";
    const jurisdictionRules = await getJurisdictionRule(state, county);

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

    // ── Step 4 + 4c: LLM appraisal analysis AND photo analysis in PARALLEL ───
    // The two LLM stages are independent — appraisal needs propertyData and
    // propertyType (already resolved); photo analysis needs only the photos
    // (already loaded). Running them concurrently overlaps the slowest step
    // in the pipeline: instead of (analyze → photos), we wait max(analyze,
    // photos). On submissions with photos this saves 10-30s wall-clock.
    await persistActivityLog({
      submissionId,
      type: "llm_analysis_started",
      actor: "system",
      description:
        "LLM appraisal analysis running — USPAP-aligned, scenario-aware methodology" +
        (photosForAnalysis.length > 0
          ? ` (running concurrently with ${photosForAnalysis.length} photo analyses)`
          : ""),
      status: "success",
    });
    if (photosForAnalysis.length > 0) {
      broadcastAnalysisUpdate(submissionId, "step", {
        step: "photo_analysis_started",
        message: `Analyzing ${photosForAnalysis.length} photo${photosForAnalysis.length === 1 ? "" : "s"} for condition evidence...`,
        photoCount: photosForAnalysis.length,
      });
    }

    // Apply the scenario's comp-filter strategy to the raw comp set BEFORE
    // the LLM sees it. Without this, the scenario filters were pure config
    // that nothing read; the LLM saw the same unfiltered comps regardless
    // of scenario. Now: a "primary_residence" run drops foreclosure-y
    // outliers and old comps, a "distressed_condition" run keeps them,
    // a "recently_purchased" run widens the window to 24 months. This makes
    // the scenario knobs do real work.
    const rawComps = propertyData.comparableSales ?? [];
    const filteredComps = applyCompFilterStrategy(rawComps, scenarioContext.compFilterStrategy);
    const filteredPropertyData = {
      ...propertyData,
      comparableSales: filteredComps.length > 0 ? filteredComps : rawComps, // fail-safe: don't analyze with zero comps
    };
    if (rawComps.length !== filteredComps.length && filteredComps.length > 0) {
      console.log(
        `[AnalysisJob] #${submissionId} comp filter applied (${userScenario}): ${rawComps.length} → ${filteredComps.length}`,
      );
    }

    // ── Pre-analysis: run photos concurrently, then feed into LLM ───────────
    // Photos are analyzed FIRST so their full context (USPAP ratings, assessor
    // blind spots, functional obsolescence) is available when analyzeProperty
    // builds its prompt. The tax bill data is pulled from the submission record.
    const [photoSummaryForPrompt, taxBillDataForPrompt] = await Promise.all([
      photosForAnalysis.length > 0
        ? analyzePropertyPhotos(photosForAnalysis).catch((err) => {
            console.warn(`[AnalysisJob] Photo pre-analysis failed:`, (err as Error).message);
            return null;
          })
        : Promise.resolve(null as PhotoAnalysisSummary | null),
      // Load tax bill OCR data from submission record (uploaded during GetStarted flow)
      Promise.resolve(
        submission.taxBillData
          ? (() => { try { return JSON.parse(submission.taxBillData as string) as Record<string, unknown>; } catch { return null; } })()
          : null
      ),
    ]);

    if (photoSummaryForPrompt) {
      broadcastAnalysisUpdate(submissionId, "step", {
        step: "photo_analysis_complete_pre",
        photoCount: photoSummaryForPrompt.findings.length,
        conditionScore: photoSummaryForPrompt.overallConditionScore,
        assessorBlindSpots: photoSummaryForPrompt.assessorBlindSpotItems.length,
      });
    }

    const [analysis, photoSummaryParallel] = await Promise.all([
      // Pass photoContext + taxBillData so Claude has the full evidence package
      // when producing the valuation narrative and appeal-strength score.
      analyzeProperty(filteredPropertyData, propertyType, userScenario, photoSummaryForPrompt, taxBillDataForPrompt),
      // photoSummaryParallel re-uses the already-computed result (no duplicate API call)
      Promise.resolve(photoSummaryForPrompt),
    ]);

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

    // Effective tax rate — sourced (in priority order) from:
    //   1. Tax bill OCR effectiveTaxRate field (most authoritative)
    //   2. Owner-supplied taxRateOverride on the submission
    //   3. Tax bill annualTaxAmount / assessedValue (derived from real
    //      values when both are present)
    //   4. null — the projection is unavailable; we DO NOT fall back to a
    //      national-average rate because that would put a misleading dollar
    //      figure into the owner-facing report.
    const taxBillRaw = (taxBillDataForPrompt ?? {}) as Record<string, unknown>;
    const taxBillNum = (k: string): number | null => {
      const v = taxBillRaw[k];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
      if (typeof v === "string") {
        const cleaned = Number(v.replace(/[^0-9.\-]/g, ""));
        return Number.isFinite(cleaned) && cleaned > 0 ? cleaned : null;
      }
      return null;
    };
    const billRate = taxBillNum("effectiveTaxRate");
    const overrideRate = submission.taxRateOverride ? Number(submission.taxRateOverride) : null;
    const billAssessed = taxBillNum("currentAssessedValue");
    const billAnnualTax = taxBillNum("annualTaxAmount");
    const derivedRate = billAssessed && billAnnualTax ? billAnnualTax / billAssessed : null;
    const realEffectiveTaxRate: number | null =
      (billRate && billRate > 0 && billRate < 1 ? billRate : null) ??
      (overrideRate && overrideRate > 0 && overrideRate < 1 ? overrideRate : null) ??
      (derivedRate && derivedRate > 0 && derivedRate < 1 ? derivedRate : null) ??
      null;

    const scenarioTaxSavings = calculateScenarioTaxSavings(
      Math.max(0, scenarioAdjustedGap),
      userScenario,
      realEffectiveTaxRate,
    );

    // Override recommended approach based on scenario
    const approachOverride = getScenarioApproachOverride(userScenario, scenarioAppealStrength);
    const finalApproach = approachOverride || analysis.recommendedApproach;

    // ── Step 4c finalize: roll the (already-completed) photo analysis into
    //                     the post-scenario appeal-strength score ─────────────
    const photoSummary: PhotoAnalysisSummary | null = photoSummaryParallel;
    let appealStrengthAfterPhotos = scenarioAppealStrength;
    if (photoSummary && photoSummary.findings.length > 0) {
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
          uspapRatings: photoSummary.uspapRatings,
          assessorBlindSpotItems: photoSummary.assessorBlindSpotItems,
          functionalObsolescenceItems: photoSummary.functionalObsolescenceItems,
          summaryParagraph: photoSummary.summaryParagraph,
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

    await persistActivityLog({
      submissionId,
      type: "scenario_adjustments_applied",
      actor: "system",
      description: `Scenario adjustments applied — value: $${scenarioAdjustedValue.toLocaleString()}, strength: ${scenarioAppealStrength}/100, savings: ${scenarioTaxSavings !== null ? `$${scenarioTaxSavings.toLocaleString()}/yr` : "(unavailable — no tax-bill rate)"}`,
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
      description: `Claude analysis complete — appeal strength: ${scenarioAppealStrength}/100, potential savings: $${scenarioTaxSavings?.toLocaleString() ?? "N/A"}, approach: ${finalApproach}${photoSummary ? `, condition: ${photoSummary.overallConditionScore}/100` : ""}`,
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

    // ── Step 4d: Three-grounds persuasion pipeline ──────────────────────────
    // Per current best practice (AppealDesk 2026, Cook County BOR, Walker
    // Advisory), the strongest appeals lead with whichever of three statutory
    // grounds is best supported by the data: (a) excessive market value,
    // (b) lack of uniformity, or (c) errors of fact in the assessor's record.
    // We compute the three independently and let the persuasion brief rank.
    const subjectMarketValue = scenarioAdjustedValue;
    const subjectAssessedValue = propertyData.assessedValue || 0;

    // (b) UNIFORMITY: subject's assessment ratio vs. peer parcels.
    // Today most aggregator comps don't carry assessed-value data, so the
    // analyzer correctly produces hasUniformityClaim=false and we say nothing
    // (the brief lead with market-value instead). When the data layer starts
    // returning comp assessed values, this immediately becomes a real second
    // ground without further wiring.
    const uniformity = analyzeUniformity(
      subjectAssessedValue,
      subjectMarketValue,
      filteredPropertyData.comparableSales ?? [],
      // No assessor lookup wired yet; comps without ratios are simply ignored.
      undefined,
    );

    // (c) RECORD ERRORS: assessor record (tax bill OCR + aggregator) vs.
    // the owner-verified submission record. Discrepancies are deterministic
    // and uncontestable — easiest wins per practitioner consensus.
    const tb = (taxBillDataForPrompt ?? {}) as Record<string, unknown>;
    const taxBillNumber = (key: string): number | undefined => {
      const v = tb[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const cleaned = Number(v.replace(/[^0-9.\-]/g, ""));
        return Number.isFinite(cleaned) ? cleaned : undefined;
      }
      return undefined;
    };
    const recordErrors = detectRecordErrors(
      {
        squareFeet: propertyData.squareFeet ?? null,
        bedrooms: propertyData.bedrooms ?? null,
        bathrooms: propertyData.bathrooms ?? null,
        yearBuilt: propertyData.yearBuilt ?? null,
        lotSize: propertyData.lotSize ?? null,
      },
      {
        squareFeet: submission.squareFeet ?? taxBillNumber("squareFeet") ?? null,
        bedrooms: submission.bedrooms ?? null,
        bathrooms: submission.bathrooms ?? null,
        yearBuilt: submission.yearBuilt ?? null,
        lotSize: submission.lotSize ?? null,
      },
    );

    if (uniformity.hasUniformityClaim || recordErrors.hasErrors) {
      await persistActivityLog({
        submissionId,
        type: "three_grounds_evaluated",
        actor: "system",
        description:
          `Three-grounds analysis: ${uniformity.hasUniformityClaim ? `uniformity gap ${((uniformity.ratioMultiplier - 1) * 100).toFixed(1)}%` : "no uniformity data"}; ` +
          `${recordErrors.hasErrors ? `${recordErrors.significantCount} record discrepancy/ies` : "no record errors"}.`,
        metadata: JSON.stringify({
          uniformityStrength: uniformity.uniformityStrength,
          uniformityRatioMultiplier: uniformity.ratioMultiplier,
          uniformityComparableCount: uniformity.comparableCount,
          recordErrorStrength: recordErrors.errorStrength,
          recordErrorCount: recordErrors.significantCount,
        }),
        status: "success",
      });
    }

    // (d) Persuasion brief — audience-aware. Resolves report_preferences
    // target audience when available; defaults to "board" otherwise. Wrapped
    // in try/catch so a brief failure never blocks the analysis pipeline.
    let persuasionBrief: PersuasionBrief | null = null;
    try {
      const audience: BriefAudience = await resolveBriefAudience(submissionId);
      const requestedAssessedValue = subjectMarketValue;
      // Use the same real-rate sourcing chain as the savings calc — never
      // fall back to a US-average constant. The brief generator handles
      // null by suppressing the savings figure rather than fabricating one.
      const effectiveTaxRate = realEffectiveTaxRate;
      const photoFindingsForBrief =
        photoSummary?.topValueIssues?.slice(0, 5) ?? [];
      const obsolescenceForBrief =
        photoSummary?.functionalObsolescenceItems?.slice(0, 5) ?? [];
      const compSummaries = (filteredPropertyData.comparableSales ?? [])
        .slice(0, 5)
        .map((c) => {
          const ppsf =
            c.squareFeet && c.salePrice
              ? Math.round(c.salePrice / c.squareFeet)
              : null;
          return `${c.address}: $${c.salePrice.toLocaleString()}${
            c.squareFeet ? ` (${c.squareFeet.toLocaleString()} sqft${ppsf ? `, $${ppsf}/sqft` : ""})` : ""
          }${c.saleDate ? `, sold ${c.saleDate}` : ""}`;
        });

      persuasionBrief = await generateAssessorPersuasionBrief({
        audience,
        propertyAddress: `${submission.address}${submission.city ? `, ${submission.city}` : ""}${submission.state ? `, ${submission.state}` : ""}`,
        parcelId:
          (taxBillNumber("apn") as unknown as string | undefined) ??
          ((tb.apn as string | undefined) ?? null),
        taxYear:
          (taxBillNumber("taxYear") as number | undefined) ?? new Date().getFullYear(),
        jurisdiction: `${propertyData.county ?? submission.county ?? "Unknown County"}, ${submission.state ?? ""}`.trim(),
        currentAssessedValue: subjectAssessedValue,
        requestedAssessedValue,
        evidenceSupportedMarketValue: subjectMarketValue,
        effectiveTaxRate,
        estimatedAnnualSavings: scenarioTaxSavings,
        comparableSummaries: compSummaries,
        uniformity,
        recordErrors,
        photoFindings: photoFindingsForBrief,
        functionalObsolescence: obsolescenceForBrief,
        appealDeadline: undefined, // populated downstream when known
      });

      await persistActivityLog({
        submissionId,
        type: "persuasion_brief_generated",
        actor: "system",
        description: `Audience-aware persuasion brief generated (${persuasionBrief.audience}, source: ${persuasionBrief.source}). Strongest ground: ${persuasionBrief.rankedGrounds[0]?.ground ?? "n/a"}.`,
        metadata: JSON.stringify({
          audience: persuasionBrief.audience,
          source: persuasionBrief.source,
          strongestGround: persuasionBrief.rankedGrounds[0]?.ground,
          grounds: persuasionBrief.rankedGrounds.map((g) => ({
            ground: g.ground,
            strength: g.strength,
          })),
        }),
        status: "success",
      });
    } catch (briefErr) {
      console.warn(
        "[AnalysisJob] Persuasion brief generation failed (non-fatal):",
        (briefErr as Error).message,
      );
    }

    // ── Step 5: Generate appeal strategy ─────────────────────────────────────
    const { generateAppealStrategy } = await import("./appealStrategy");
    const appealStrategy = await generateAppealStrategy(
      state,
      propertyData.county || submission.county || undefined,
      propertyType,
      propertyData.assessedValue || 0,
      scenarioAdjustedValue,
      new Date(),
      userScenario
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
        lightboxData: JSON.stringify(propertyData), // Legacy column name — stores aggregated property data
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
          ...(uniformity.hasUniformityClaim
            ? [
                `Statutory ground — Lack of Uniformity: subject assessed ${((uniformity.ratioMultiplier - 1) * 100).toFixed(1)}% above peer-median ratio (${uniformity.comparableCount} parcels analyzed). Equalized value $${uniformity.equalizedAssessedValue.toLocaleString()}.`,
              ]
            : []),
          ...(recordErrors.hasErrors
            ? [
                `Statutory ground — Errors of Fact: ${recordErrors.significantCount} field-level discrepancy/ies in assessor record card.`,
                ...recordErrors.findings
                  .filter((f) => f.severity !== "minor")
                  .slice(0, 3)
                  .map((f) => `Record discrepancy (${f.field}): ${f.factualClaim}`),
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
          // ── Three-grounds persuasion package (read by PDF + delivery) ──
          uniformity: {
            hasClaim: uniformity.hasUniformityClaim,
            subjectRatio: uniformity.subjectAssessmentRatio,
            medianComparableRatio: uniformity.medianComparableRatio,
            ratioMultiplier: uniformity.ratioMultiplier,
            comparableCount: uniformity.comparableCount,
            equalizedAssessedValue: uniformity.equalizedAssessedValue,
            equalizationGap: uniformity.equalizationGap,
            argument: uniformity.uniformityArgument,
            strength: uniformity.uniformityStrength,
          },
          recordErrors: {
            hasErrors: recordErrors.hasErrors,
            significantCount: recordErrors.significantCount,
            errorStrength: recordErrors.errorStrength,
            findings: recordErrors.findings,
            summaryLine: recordErrors.summaryLine,
          },
          persuasionBrief: persuasionBrief
            ? {
                audience: persuasionBrief.audience,
                source: persuasionBrief.source,
                sixtySecondSummary: persuasionBrief.sixtySecondSummary,
                formalBrief: persuasionBrief.formalBrief,
                prayerForRelief: persuasionBrief.prayerForRelief,
                rankedGrounds: persuasionBrief.rankedGrounds,
                exhibitIndex: persuasionBrief.exhibitIndex,
              }
            : null,
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
        // Detailed valuation data for professional report generation
        adjustmentGrid: analysis.adjustmentGrid ? JSON.stringify(analysis.adjustmentGrid) : null,
        incomeApproachData: analysis.incomeApproach ? JSON.stringify(analysis.incomeApproach) : null,
        costApproachData: JSON.stringify({
          landValue: (propertyData as any).landValue || null,
          improvementValue: (propertyData as any).improvementValue || null,
          replacementCostNew: (propertyData as any).replacementCostNew || null,
          totalDepreciation: (propertyData as any).totalDepreciation || null,
          effectiveAge: propertyData.yearBuilt ? (new Date().getFullYear() - propertyData.yearBuilt) : null,
          remainingEconomicLife: propertyData.yearBuilt ? Math.max(0, 75 - (new Date().getFullYear() - propertyData.yearBuilt)) : null,
          costApproachValue: (propertyData as any).costApproachValue || null,
        }),
        marketTrendData: JSON.stringify({
          medianSalePrice: propertyData.marketValue || null,
          medianPricePerSF: propertyData.squareFeet && propertyData.marketValue
            ? Math.round(propertyData.marketValue / propertyData.squareFeet)
            : null,
          averageDaysOnMarket: propertyData.comparableSales?.length
            ? Math.round(propertyData.comparableSales.reduce((s, c) => s + (c.daysOnMarket || 0), 0) / propertyData.comparableSales.length)
            : null,
          inventoryCount: propertyData.comparableSales?.length || null,
          priceChangeYoY: null, // Populated by web research if available
          absorptionRate: null, // Populated by web research if available
        }),
        reconciliationNarrative: analysis.valuationJustification || null,
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
      // Low/high market-value range — derived from the real comparable-
      // sales price band when available (Q1 and Q3 of $/sqft × subject
      // sqft). When the comp set is too small or sqft is missing we leave
      // both null instead of fabricating a ±8% confidence interval.
      ...(() => {
        const band = computeCompPriceBand(filteredPropertyData);
        if (band && propertyData.squareFeet && propertyData.squareFeet > 0) {
          return {
            estimatedMarketValueLow: Math.round(band.q1Ppsf * propertyData.squareFeet),
            estimatedMarketValueHigh: Math.round(band.q3Ppsf * propertyData.squareFeet),
          };
        }
        return {
          estimatedMarketValueLow: undefined,
          estimatedMarketValueHigh: undefined,
        };
      })(),
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
      content: `Property: ${submission.address}\nScenario: ${scenarioContext.scenarioLabel}\n\nMarket Value: $${scenarioAdjustedValue.toLocaleString()}\nAssessed Value: $${propertyData.assessedValue?.toLocaleString() ?? "N/A"}\nAssessment Gap: $${scenarioAdjustedGap.toLocaleString()}\nAppeal Strength: ${appealStrengthAfterPhotos}/100\nPotential Savings: ${scenarioTaxSavings !== null ? `$${scenarioTaxSavings.toLocaleString()}/yr` : "(unavailable — upload tax bill for projection)"}\nApproach: ${finalApproach.toUpperCase()}\nFiling: ${submission.filingMethod || "POA"}\nDeadline: ${appealDeadline?.toLocaleDateString() ?? "TBD"}\nUrgency: ${scenarioContext.appealStrengthModifiers.urgencyLevel.toUpperCase()}\n\nView: /analysis?id=${submissionId}`,
    }).catch((err: unknown) => console.error("[AnalysisJob] Failed to notify owner:", err));
    // Queue report generation (24-hour SLA)

    // ── Step 9b: Send user email confirmation ────────────────────────────────
    if (submission.email) {
      sendAnalysisConfirmationEmail({
        userEmail: submission.email,
        userName: submission.email.split("@")[0],
        propertyAddress: submission.address,
        appealStrengthScore: appealStrengthAfterPhotos,
      }).catch((err: unknown) => console.error("[AnalysisJob] Email send failed:", err));
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

    // Mark as error so the submission is not re-triggered in an infinite loop.
    // The user or admin can manually re-queue if needed. If the status update
    // ITSELF fails (DB hiccup, lost connection), the submission stays
    // "analyzing" forever and the user sees a stuck spinner — log the
    // failure so ops can detect and recover instead of silently swallowing.
    try {
      await updatePropertySubmission(submissionId, { status: "error" });
    } catch (statusErr) {
      console.error(
        `[AnalysisJob] CRITICAL: failed to mark submission ${submissionId} as errored — ` +
        `submission may appear stuck in "analyzing" until manually re-queued. ` +
        `Original analysis error: ${errMsg}. Status-update error: ${(statusErr as Error).message}`,
      );
    }
  } finally {
    activeJobs.delete(submissionId);
  }
}

/**
 * Resolve the audience for the persuasion brief. Reads report_preferences
 * when set; defaults to "board" otherwise (the safest middle-ground tone).
 *
 * The DB query is best-effort — never blocks the analysis pipeline. If the
 * query fails or no preference exists, we fall back to "board".
 */
async function resolveBriefAudience(submissionId: number): Promise<BriefAudience> {
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return "board";
    const { reportPreferences } = await import("../../drizzle/schema.pg");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ targetAudience: reportPreferences.targetAudience })
      .from(reportPreferences)
      .where(eq(reportPreferences.submissionId, submissionId))
      .limit(1);
    const a = rows[0]?.targetAudience;
    if (a === "assessor" || a === "board" || a === "attorney" || a === "owner") {
      return a;
    }
    return "board";
  } catch {
    return "board";
  }
}
