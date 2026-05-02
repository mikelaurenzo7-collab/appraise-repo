/**
 * ────────────────────────────────────────────────────────────────────────────
 * Appeal Strength Scoring Engine (Expert Appraiser Edition)
 * ────────────────────────────────────────────────────────────────────────────
 * Analyzes property data and generates success probability predictions.
 *
 * ENHANCED SCORING FACTORS:
 *   1. Comparable Sales Quality (25%) — number, recency, source diversity
 *   2. Assessment Gap Magnitude (25%) — dollar gap AND percentage gap
 *   3. Evidence Quality (15%) — photo evidence, condition documentation
 *   4. Market Conditions (15%) — declining prices, high DOM, distressed sales
 *   5. County-Specific Factors (10%) — historical win rates, board tendencies
 *   6. Property Type Match (10%) — appeal success by property category
 *
 * Philosophy: Score generously where data supports the homeowner's case.
 * An over-assessed property with strong comps and photo evidence should
 * score 80+, not 60.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { appealOutcomes, propertySubmissions, propertyAnalysis } from "../../drizzle/schema.pg";

export interface AppealStrengthScore {
  overallScore: number; // 0-100
  successProbability: number; // 0-1 (0-100%)
  confidenceLevel: "high" | "medium" | "low";
  factors: ScoreFactor[];
  recommendation: string;
  riskFactors: string[];
  strengthFactors: string[];
  historicalWinRate: number; // 0-1
  /**
   * Estimated annual tax-savings range. `null` when no real effective
   * tax rate can be derived (no tax bill on file, no jurisdiction-derived
   * rate). Callers must display "Range unavailable" rather than fabricate
   * a fallback figure.
   */
  estimatedSavingsRange: {
    min: number;
    max: number;
  } | null;
}

export interface ScoreFactor {
  name: string;
  weight: number; // 0-1
  score: number; // 0-100
  impact: number; // -50 to +50 (contribution to overall score)
  explanation: string;
}

/**
 * Calculate appeal strength score for a property submission
 */
export async function calculateAppealStrengthScore(
  submissionId: number
): Promise<AppealStrengthScore> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Get submission and analysis data
    const submission = await db
      .select()
      .from(propertySubmissions)
      .where(eq(propertySubmissions.id, submissionId))
      .limit(1);

    if (!submission.length) {
      throw new Error("Submission not found");
    }

    const analysis = await db
      .select()
      .from(propertyAnalysis)
      .where(eq(propertyAnalysis.submissionId, submissionId))
      .limit(1);

    if (!analysis.length) {
      throw new Error("Analysis not found");
    }

    const sub = submission[0];
    const ana = analysis[0];

    // Parse stored data for deeper analysis
    let comparableSales: any[] = [];
    try { comparableSales = JSON.parse(ana.comparableSales || "[]"); } catch { /* empty */ }

    // Calculate individual factors
    const factors: ScoreFactor[] = [];

    // ── 1. Comparable Sales Quality (25% weight) ────────────────────────────
    const compQualityScore = calculateCompQualityScore(
      comparableSales,
      sub.assessedValue,
      ana.marketValueEstimate
    );
    factors.push({
      name: "Comparable Sales Quality",
      weight: 0.25,
      score: compQualityScore.score,
      impact: (compQualityScore.score - 50) * 0.25,
      explanation: compQualityScore.explanation,
    });

    // ── 2. Assessment Gap Magnitude (25% weight) ────────────────────────────
    const gapScore = calculateAssessmentGapScore(ana.assessmentGap, sub.assessedValue);
    factors.push({
      name: "Assessment Gap",
      weight: 0.25,
      score: gapScore.score,
      impact: (gapScore.score - 50) * 0.25,
      explanation: gapScore.explanation,
    });

    // ── 3. Evidence Quality (15% weight) ────────────────────────────────────
    const evidenceScore = calculateEvidenceQualityScore(sub, ana);
    factors.push({
      name: "Evidence Quality",
      weight: 0.15,
      score: evidenceScore.score,
      impact: (evidenceScore.score - 50) * 0.15,
      explanation: evidenceScore.explanation,
    });

    // ── 4. Market Conditions (15% weight) ───────────────────────────────────
    const marketScore = calculateMarketConditionsScore(comparableSales, sub.assessedValue);
    factors.push({
      name: "Market Conditions",
      weight: 0.15,
      score: marketScore.score,
      impact: (marketScore.score - 50) * 0.15,
      explanation: marketScore.explanation,
    });

    // ── 5. County-Specific Factors (10% weight) ─────────────────────────────
    const countyScore = await calculateCountyFactorsScore(sub.county);
    factors.push({
      name: "County Factors",
      weight: 0.1,
      score: countyScore,
      impact: (countyScore - 50) * 0.1,
      explanation: `${sub.county || "Unknown"} county appeal environment`,
    });

    // ── 6. Property Type Match (10% weight) ─────────────────────────────────
    const propertyTypeScore = calculatePropertyTypeScore(sub.propertyType);
    factors.push({
      name: "Property Type",
      weight: 0.1,
      score: propertyTypeScore,
      impact: (propertyTypeScore - 50) * 0.1,
      explanation: `${sub.propertyType || "Unknown"} properties in this market`,
    });

    // Calculate overall score
    const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
    const overallScore = Math.max(0, Math.min(100, 50 + totalImpact));

    // Get historical win rate for this county and property type
    const historicalWinRate = await getHistoricalWinRate(sub.county, sub.propertyType);

    // Calculate success probability (blend of score and historical data)
    // Weight our score more heavily since it's based on actual property data
    const successProbability = Math.max(
      0,
      Math.min(1, (overallScore / 100) * 0.7 + historicalWinRate * 0.3)
    );

    // Determine confidence level
    const confidenceLevel = getConfidenceLevel(overallScore, comparableSales.length, historicalWinRate);

    // Identify strength and risk factors
    const strengthFactors = factors.filter((f) => f.score > 60).map((f) => f.name);
    const riskFactors = factors.filter((f) => f.score < 40).map((f) => f.name);

    // Calculate estimated savings range — more aggressive for strong cases
    // Pass the analysis row's real `potentialSavings` so calculateSavingsRange
    // can DERIVE the implied effective tax rate from real numbers instead
    // of a national-average constant.
    const estimatedSavingsRange = calculateSavingsRange(
      ana.assessmentGap,
      successProbability,
      sub.potentialSavings,
    );

    // Generate advocacy-oriented recommendation
    const recommendation = generateRecommendation(overallScore, successProbability, riskFactors, strengthFactors, ana.assessmentGap);

    return {
      overallScore: Math.round(overallScore),
      successProbability: Math.round(successProbability * 100) / 100,
      confidenceLevel,
      factors,
      recommendation,
      riskFactors,
      strengthFactors,
      historicalWinRate,
      estimatedSavingsRange,
    };
  } catch (error) {
    console.error("[Appeal Strength Scoring Error]", error);
    throw error;
  }
}

// ─── SCORING FUNCTIONS ──────────────────────────────────────────────────────

/**
 * Score comparable sales quality — considers count, recency, source diversity,
 * and how many sold below the assessed value (direct over-assessment evidence).
 */
function calculateCompQualityScore(
  comps: any[],
  assessedValue: number | null,
  marketValue: number | null
): { score: number; explanation: string } {
  if (!comps || comps.length === 0) {
    return { score: 35, explanation: "No comparable sales data — limited evidence for appeal" };
  }

  let score = 40; // Base score with comps available
  const details: string[] = [];

  // Number of comps (more = stronger evidence)
  if (comps.length >= 10) { score += 15; details.push(`${comps.length} comps available (excellent)`); }
  else if (comps.length >= 5) { score += 10; details.push(`${comps.length} comps available (good)`); }
  else if (comps.length >= 3) { score += 5; details.push(`${comps.length} comps available (adequate)`); }

  // Comps below assessed value (direct evidence of over-assessment)
  if (assessedValue) {
    const belowAssessed = comps.filter((c: any) => c.salePrice && c.salePrice < assessedValue);
    const pctBelow = belowAssessed.length / comps.length;
    if (pctBelow >= 0.7) { score += 20; details.push(`${belowAssessed.length}/${comps.length} sold below assessed value`); }
    else if (pctBelow >= 0.5) { score += 15; details.push(`${belowAssessed.length}/${comps.length} sold below assessed value`); }
    else if (pctBelow >= 0.3) { score += 8; details.push(`${belowAssessed.length}/${comps.length} sold below assessed value`); }
  }

  // Source diversity (Redfin + RentCast = stronger than single source)
  const sources = new Set(comps.map((c: any) => c.source).filter(Boolean));
  if (sources.size >= 2) { score += 10; details.push(`Data from ${sources.size} independent sources`); }

  // Comps with photos (visual evidence for appeal boards)
  const withPhotos = comps.filter((c: any) => c.photoUrl);
  if (withPhotos.length >= 3) { score += 5; details.push(`${withPhotos.length} comps with photo evidence`); }

  // Assessment vs market value ratio
  if (assessedValue && marketValue && assessedValue > marketValue) {
    const overPct = ((assessedValue - marketValue) / assessedValue) * 100;
    if (overPct > 15) { score += 10; details.push(`Market value ${overPct.toFixed(0)}% below assessed`); }
    else if (overPct > 5) { score += 5; details.push(`Market value ${overPct.toFixed(0)}% below assessed`); }
  }

  return { score: Math.min(100, score), explanation: details.join(". ") || "Comparable sales analysis complete" };
}

/**
 * Score assessment gap — considers both dollar amount AND percentage.
 * A $50K gap on a $200K home (25%) is stronger than $50K on a $2M home (2.5%).
 */
function calculateAssessmentGapScore(
  assessmentGap: number | null,
  assessedValue: number | null
): { score: number; explanation: string } {
  if (!assessmentGap || assessmentGap <= 0) {
    return { score: 25, explanation: "No over-assessment detected from available data" };
  }

  let score = 40; // Base score with positive gap

  // Dollar gap scoring
  if (assessmentGap > 200000) score += 20;
  else if (assessmentGap > 100000) score += 17;
  else if (assessmentGap > 50000) score += 14;
  else if (assessmentGap > 25000) score += 10;
  else if (assessmentGap > 10000) score += 7;
  else score += 3;

  // Percentage gap scoring (more important for boards)
  if (assessedValue && assessedValue > 0) {
    const gapPct = (assessmentGap / assessedValue) * 100;
    if (gapPct > 25) score += 25;
    else if (gapPct > 15) score += 20;
    else if (gapPct > 10) score += 15;
    else if (gapPct > 5) score += 10;
    else score += 3;

    return {
      score: Math.min(100, score),
      explanation: `Over-assessed by $${assessmentGap.toLocaleString()} (${gapPct.toFixed(1)}% above market value)`,
    };
  }

  return {
    score: Math.min(100, score),
    explanation: `Over-assessed by $${assessmentGap.toLocaleString()}`,
  };
}

/**
 * Score evidence quality — photo documentation, condition notes, and
 * data completeness all strengthen an appeal case.
 */
function calculateEvidenceQualityScore(
  sub: any,
  ana: any
): { score: number; explanation: string } {
  let score = 45; // Base score
  const details: string[] = [];

  // Photo evidence (assessors can't see inside — photos are powerful)
  const hasPhotos = sub.photoUrls || sub.photos;
  if (hasPhotos) {
    try {
      const photos = typeof hasPhotos === "string" ? JSON.parse(hasPhotos) : hasPhotos;
      if (Array.isArray(photos) && photos.length > 0) {
        if (photos.length >= 10) { score += 25; details.push(`${photos.length} property photos uploaded (excellent documentation)`); }
        else if (photos.length >= 5) { score += 18; details.push(`${photos.length} property photos uploaded (good documentation)`); }
        else { score += 10; details.push(`${photos.length} property photos uploaded`); }
      }
    } catch { /* non-critical */ }
  } else {
    details.push("No property photos — uploading condition photos would strengthen the case significantly");
  }

  // Condition notes from user
  if (sub.conditionNotes || sub.notes) {
    score += 8;
    details.push("Owner-provided condition notes available");
  }

  // Data completeness from analysis
  if (ana.executiveSummary && ana.valuationJustification) {
    score += 7;
    details.push("Full analysis with executive summary and valuation justification");
  }

  // Comparable sales with photos (visual evidence for boards)
  let compsWithPhotos = 0;
  try {
    const comps = JSON.parse(ana.comparableSales || "[]");
    compsWithPhotos = comps.filter((c: any) => c.photoUrl).length;
    if (compsWithPhotos >= 5) { score += 10; details.push(`${compsWithPhotos} comparable sales with photo evidence`); }
    else if (compsWithPhotos >= 2) { score += 5; details.push(`${compsWithPhotos} comparable sales with photos`); }
  } catch { /* non-critical */ }

  return { score: Math.min(100, score), explanation: details.join(". ") || "Evidence quality assessed" };
}

/**
 * Score market conditions — declining prices, high DOM, and distressed sales
 * all support the argument that the assessment is stale or inflated.
 */
function calculateMarketConditionsScore(
  comps: any[],
  assessedValue: number | null
): { score: number; explanation: string } {
  if (!comps || comps.length < 3) {
    return { score: 50, explanation: "Insufficient data to assess market conditions" };
  }

  let score = 50; // Neutral base
  const details: string[] = [];

  // Check for declining price trend
  const recentComps = comps.filter((c: any) => {
    if (!c.saleDate) return false;
    const daysAgo = Math.floor((Date.now() - new Date(c.saleDate).getTime()) / 86400000);
    return daysAgo <= 180;
  });

  if (recentComps.length >= 3) {
    const avgRecent = recentComps.reduce((s: number, c: any) => s + (c.salePrice || 0), 0) / recentComps.length;
    const avgAll = comps.reduce((s: number, c: any) => s + (c.salePrice || 0), 0) / comps.length;
    if (avgRecent < avgAll * 0.95) {
      score += 15;
      details.push("Recent sales show declining price trend — assessment may be based on stale data");
    }
  }

  // High days on market = weak demand
  const compsWithDOM = comps.filter((c: any) => c.daysOnMarket !== undefined);
  if (compsWithDOM.length >= 3) {
    const avgDOM = compsWithDOM.reduce((s: number, c: any) => s + (c.daysOnMarket || 0), 0) / compsWithDOM.length;
    if (avgDOM > 60) { score += 15; details.push(`Average ${Math.round(avgDOM)} days on market — significantly weak demand`); }
    else if (avgDOM > 45) { score += 10; details.push(`Average ${Math.round(avgDOM)} days on market — below-average demand`); }
    else if (avgDOM > 30) { score += 5; details.push(`Average ${Math.round(avgDOM)} days on market`); }
  }

  // Majority of comps below assessed value = systemic over-assessment
  if (assessedValue) {
    const belowAssessed = comps.filter((c: any) => c.salePrice && c.salePrice < assessedValue);
    if (belowAssessed.length > comps.length * 0.6) {
      score += 15;
      details.push(`${Math.round((belowAssessed.length / comps.length) * 100)}% of comparable sales below assessed value — suggests area-wide over-assessment`);
    }
  }

  return { score: Math.min(100, score), explanation: details.join(". ") || "Market conditions assessed" };
}

/**
 * Calculate county-specific factors score
 */
async function calculateCountyFactorsScore(county: string | null): Promise<number> {
  if (!county) return 50;

  // County-specific appeal environment scores
  // Higher = more favorable appeal environment for homeowners
  const countyFactors: Record<string, number> = {
    // Texas — strong appeal rights, informal hearings, ARB process
    "Travis County": 78,
    "Harris County": 72,
    "Dallas County": 75,
    "Tarrant County": 73,
    "Bexar County": 74,
    "Collin County": 72,
    "Denton County": 71,
    "Williamson County": 76,
    // Illinois — Cook County has formal appeal process
    "Cook County": 65,
    "DuPage County": 68,
    "Lake County": 67,
    "Will County": 66,
    // New Jersey — strong appeal rights, Tax Court option
    "Bergen County": 70,
    "Essex County": 68,
    "Morris County": 69,
    "Middlesex County": 67,
    // New York — SCAR process, formal hearings
    "New York County": 60,
    "Kings County": 62,
    "Nassau County": 65,
    "Westchester County": 63,
    // Florida — VAB process
    "Miami-Dade County": 68,
    "Broward County": 67,
    "Palm Beach County": 66,
    "Hillsborough County": 65,
    // California — formal assessment appeals board
    "Los Angeles County": 58,
    "San Francisco County": 60,
    "San Diego County": 62,
    "Orange County": 61,
    // Arizona
    "Maricopa County": 70,
    "Pima County": 68,
    // Georgia
    "Fulton County": 72,
    "DeKalb County": 70,
    "Gwinnett County": 69,
  };

  return countyFactors[county] || 55; // Default slightly above neutral — most counties allow appeals
}

/**
 * Calculate property type score
 */
function calculatePropertyTypeScore(propertyType: string | null): number {
  const typeScores: Record<string, number> = {
    residential: 72, // Most common, best appeal data, boards are sympathetic to homeowners
    "multi-family": 75, // Good appeal prospects, income approach often favors owner
    commercial: 68, // More complex but income approach can be favorable
    industrial: 62, // Specialized — functional obsolescence arguments are strong
    agricultural: 58, // Agricultural use valuation can be very favorable
    land: 55, // Highly variable, fewer comps
    unknown: 50,
  };

  return typeScores[propertyType || "unknown"] || 55;
}

/**
 * Get historical win rate for county and property type
 */
async function getHistoricalWinRate(
  county: string | null,
  propertyType: string | null
): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0.55; // Slightly optimistic default

    const outcomes = await db
      .select()
      .from(appealOutcomes)
      .where(
        and(
          county ? eq(appealOutcomes.county, county) : undefined,
          eq(appealOutcomes.outcome, "won")
        )
      );

    const totalOutcomes = await db
      .select()
      .from(appealOutcomes)
      .where(county ? eq(appealOutcomes.county, county) : undefined);

    if (totalOutcomes.length === 0) return 0.55; // Optimistic default — national average is ~40-60%

    return outcomes.length / totalOutcomes.length;
  } catch (error) {
    console.error("[Historical Win Rate Error]", error);
    return 0.55;
  }
}

/**
 * Determine confidence level — considers data quality, not just score
 */
function getConfidenceLevel(
  score: number,
  compCount: number,
  historicalWinRate: number
): "high" | "medium" | "low" {
  // High confidence: strong score + good data + reasonable history
  if (score > 70 && compCount >= 5 && historicalWinRate > 0.4) return "high";
  if (score > 75 && compCount >= 3) return "high";

  // Medium confidence: moderate score or decent data
  if (score > 50 && compCount >= 3) return "medium";
  if (score > 60) return "medium";

  // Low confidence: weak score or insufficient data
  return "low";
}

/**
 * Calculate estimated savings range — more aggressive for strong cases.
 *
 * Returns `null` when no real effective tax rate can be derived. We do
 * NOT fall back to a US-average constant because a fabricated dollar
 * range in front of the owner (or board) is misleading. The caller
 * should display "Estimated range unavailable — upload tax bill" in
 * that case.
 *
 * The rate is derived from the analysis row's existing potentialSavings
 * and assessmentGap fields (both set from real tax-bill data upstream
 * by analysisJob.ts).
 */
function calculateSavingsRange(
  assessmentGap: number | null,
  successProbability: number,
  assessedPotentialSavings: number | null,
): { min: number; max: number } | null {
  if (!assessmentGap || assessmentGap <= 0) {
    return null;
  }
  if (!assessedPotentialSavings || assessedPotentialSavings <= 0) {
    return null;
  }
  // Implied effective tax rate from the analysis pipeline's already-
  // computed savings / gap (both ultimately tied to the owner's tax bill).
  const impliedRate = assessedPotentialSavings / assessmentGap;
  if (!Number.isFinite(impliedRate) || impliedRate <= 0 || impliedRate >= 1) {
    return null;
  }

  // For strong cases (high probability), expect larger reductions.
  // Boards typically reduce by 30-80% of the gap depending on evidence quality.
  const minReductionPct = successProbability > 0.7 ? 0.4 : successProbability > 0.5 ? 0.3 : 0.2;
  const maxReductionPct = successProbability > 0.7 ? 0.8 : successProbability > 0.5 ? 0.6 : 0.4;

  return {
    min: Math.round(assessmentGap * minReductionPct * impliedRate),
    max: Math.round(assessmentGap * maxReductionPct * impliedRate),
  };
}

/**
 * Generate advocacy-oriented recommendation text
 */
function generateRecommendation(
  score: number,
  probability: number,
  riskFactors: string[],
  strengthFactors: string[],
  assessmentGap: number | null
): string {
  const gapStr = assessmentGap ? `$${assessmentGap.toLocaleString()}` : "an undetermined amount";

  if (score > 75 && probability > 0.65) {
    return `Excellent appeal candidate. The data strongly supports that your property is over-assessed by ${gapStr}. Key strengths: ${strengthFactors.join(", ")}. We recommend filing immediately — the evidence package is compelling and appeal boards respond well to data-backed cases like this.`;
  }

  if (score > 60 && probability > 0.5) {
    return `Strong appeal candidate. Your property appears over-assessed by ${gapStr}, with solid supporting evidence from ${strengthFactors.join(", ")}. ${riskFactors.length > 0 ? `To strengthen your case further, address: ${riskFactors.join(", ")}.` : ""} Filing an appeal is recommended — the potential savings justify the effort.`;
  }

  if (score > 45) {
    return `Viable appeal candidate. While the case has some favorable elements (${strengthFactors.join(", ")}), it could be strengthened. ${riskFactors.length > 0 ? `Key areas to improve: ${riskFactors.join(", ")}.` : ""} Uploading property photos showing any condition issues, deferred maintenance, or damage would significantly boost your appeal strength.`;
  }

  return `The data currently shows limited grounds for appeal, but this doesn't mean your assessment is accurate. Property photos showing condition issues, needed repairs, or neighborhood factors that assessors may have missed can change the picture entirely. Upload photos and any documentation of needed repairs to get an updated analysis.`;
}

/**
 * Format score for display
 */
export function formatAppealScore(score: AppealStrengthScore): string {
  return `
Appeal Strength Score: ${score.overallScore}/100
Success Probability: ${(score.successProbability * 100).toFixed(1)}%
Confidence: ${score.confidenceLevel.toUpperCase()}

${score.recommendation}

${
  score.estimatedSavingsRange
    ? `Estimated Annual Savings: $${score.estimatedSavingsRange.min.toLocaleString()} - $${score.estimatedSavingsRange.max.toLocaleString()}`
    : "Estimated Annual Savings: not available — upload your tax bill so the projection can be derived from your actual effective tax rate."
}
  `;
}
