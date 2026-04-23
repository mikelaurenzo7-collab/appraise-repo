/**
 * Appeal Strength Scoring Engine
 * Analyzes property data and generates success probability predictions
 * Based on comparable sales, market trends, county factors, and historical outcomes
 */

import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { appealOutcomes, propertySubmissions, propertyAnalysis } from "../../drizzle/schema";

export interface AppealStrengthScore {
  overallScore: number; // 0-100
  successProbability: number; // 0-1 (0-100%)
  confidenceLevel: "high" | "medium" | "low";
  factors: ScoreFactor[];
  recommendation: string;
  riskFactors: string[];
  strengthFactors: string[];
  historicalWinRate: number; // 0-1
  estimatedSavingsRange: {
    min: number;
    max: number;
  };
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

    // Calculate individual factors
    const factors: ScoreFactor[] = [];

    // 1. Comparable Sales Analysis (30% weight)
    const comparableSalesScore = calculateComparableSalesScore(
      sub.assessedValue,
      ana.marketValueEstimate
    );
    factors.push({
      name: "Comparable Sales Analysis",
      weight: 0.3,
      score: comparableSalesScore,
      impact: (comparableSalesScore - 50) * 0.3,
      explanation: `Market value ($${ana.marketValueEstimate?.toLocaleString() || "N/A"}) vs assessed value ($${sub.assessedValue?.toLocaleString() || "N/A"})`,
    });

    // 2. Assessment Gap (25% weight)
    const assessmentGapScore = calculateAssessmentGapScore(ana.assessmentGap);
    factors.push({
      name: "Assessment Gap",
      weight: 0.25,
      score: assessmentGapScore,
      impact: (assessmentGapScore - 50) * 0.25,
      explanation: `Assessment gap: $${ana.assessmentGap?.toLocaleString() || "0"}`,
    });

    // 3. Appeal Strength Factors (20% weight)
    const strengthFactorsScore = calculateStrengthFactorsScore(
      ana.appealStrengthFactors
    );
    factors.push({
      name: "Appeal Strength Factors",
      weight: 0.2,
      score: strengthFactorsScore,
      impact: (strengthFactorsScore - 50) * 0.2,
      explanation: `Identified ${ana.appealStrengthFactors ? "multiple" : "limited"} appeal strength factors`,
    });

    // 4. County-Specific Factors (15% weight)
    const countyFactorsScore = await calculateCountyFactorsScore(sub.county);
    factors.push({
      name: "County Factors",
      weight: 0.15,
      score: countyFactorsScore,
      impact: (countyFactorsScore - 50) * 0.15,
      explanation: `${sub.county} county appeal success rate and procedures`,
    });

    // 5. Property Type Match (10% weight)
    const propertyTypeScore = calculatePropertyTypeScore(sub.propertyType);
    factors.push({
      name: "Property Type",
      weight: 0.1,
      score: propertyTypeScore,
      impact: (propertyTypeScore - 50) * 0.1,
      explanation: `${sub.propertyType} properties in this market`,
    });

    // Calculate overall score
    const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
    const overallScore = Math.max(0, Math.min(100, 50 + totalImpact));

    // Get historical win rate for this county and property type
    const historicalWinRate = await getHistoricalWinRate(
      sub.county,
      sub.propertyType
    );

    // Calculate success probability (blend of score and historical data)
    const successProbability = Math.max(
      0,
      Math.min(1, (overallScore / 100) * 0.6 + historicalWinRate * 0.4)
    );

    // Determine confidence level
    const confidenceLevel = getConfidenceLevel(overallScore, historicalWinRate);

    // Identify strength and risk factors
    const strengthFactors = factors
      .filter((f) => f.score > 65)
      .map((f) => f.name);
    const riskFactors = factors
      .filter((f) => f.score < 40)
      .map((f) => f.name);

    // Calculate estimated savings range
    const estimatedSavingsRange = calculateSavingsRange(
      ana.assessmentGap,
      successProbability
    );

    // Generate recommendation
    const recommendation = generateRecommendation(
      overallScore,
      successProbability,
      riskFactors,
      strengthFactors
    );

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

/**
 * Calculate comparable sales score (0-100)
 * Higher score = better appeal prospects
 */
function calculateComparableSalesScore(
  assessedValue: number | null,
  marketValue: number | null
): number {
  if (!assessedValue || !marketValue) return 50;

  const ratio = assessedValue / marketValue;

  // Ideal ratio is around 0.85-0.95 (assessment is 85-95% of market value)
  // Higher ratios (over-assessed) = better appeal prospects
  if (ratio > 1.1) return 95; // Significantly over-assessed
  if (ratio > 1.05) return 85; // Moderately over-assessed
  if (ratio > 0.95) return 70; // Slightly over-assessed
  if (ratio > 0.85) return 50; // Fair assessment
  if (ratio > 0.75) return 30; // Under-assessed
  return 15; // Significantly under-assessed
}

/**
 * Calculate assessment gap score
 * Larger gaps = better appeal prospects
 */
function calculateAssessmentGapScore(assessmentGap: number | null): number {
  if (!assessmentGap || assessmentGap <= 0) return 30;

  // Score based on gap size
  if (assessmentGap > 500000) return 95;
  if (assessmentGap > 250000) return 85;
  if (assessmentGap > 100000) return 75;
  if (assessmentGap > 50000) return 65;
  if (assessmentGap > 25000) return 55;
  if (assessmentGap > 10000) return 45;
  if (assessmentGap > 5000) return 35;
  return 25;
}

/**
 * Calculate strength factors score
 */
function calculateStrengthFactorsScore(strengthFactors: string | null): number {
  if (!strengthFactors) return 40;

  try {
    const factors = JSON.parse(strengthFactors);
    if (!Array.isArray(factors)) return 50;

    // Score based on number and quality of factors
    if (factors.length >= 5) return 85;
    if (factors.length >= 4) return 75;
    if (factors.length >= 3) return 65;
    if (factors.length >= 2) return 55;
    if (factors.length >= 1) return 45;
    return 35;
  } catch {
    return 50;
  }
}

/**
 * Calculate county-specific factors score
 */
async function calculateCountyFactorsScore(county: string | null): Promise<number> {
  if (!county) return 50;

  // County-specific win rates and appeal procedures
  const countyFactors: Record<string, number> = {
    "Travis County": 75, // Known for favorable appeals
    "Harris County": 65, // Moderate appeal success
    "Dallas County": 70, // Good appeal track record
    "Tarrant County": 68,
    "Bexar County": 72,
    "Cook County": 60,
    "Miami-Dade County": 65,
    "Los Angeles County": 55,
    "New York County": 58,
    "San Francisco County": 62,
  };

  return countyFactors[county] || 50;
}

/**
 * Calculate property type score
 */
function calculatePropertyTypeScore(propertyType: string | null): number {
  const typeScores: Record<string, number> = {
    residential: 70, // Most common, good appeal data
    "multi-family": 75, // Good appeal prospects
    commercial: 65, // More complex assessments
    industrial: 60, // Specialized assessments
    agricultural: 55, // Limited appeal data
    land: 50, // Highly variable
    unknown: 50,
  };

  return typeScores[propertyType || "unknown"] || 50;
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
    if (!db) return 0.5;

    // Query appeal outcomes for this county and property type
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

    if (totalOutcomes.length === 0) return 0.5; // Default to 50% if no data

    return outcomes.length / totalOutcomes.length;
  } catch (error) {
    console.error("[Historical Win Rate Error]", error);
    return 0.5;
  }
}

/**
 * Determine confidence level based on score and historical data
 */
function getConfidenceLevel(
  score: number,
  historicalWinRate: number
): "high" | "medium" | "low" {
  // High confidence: strong score and good historical data
  if (score > 70 && historicalWinRate > 0.6) return "high";
  if (score > 65 && historicalWinRate > 0.5) return "high";

  // Medium confidence: moderate score or mixed data
  if (score > 45 && historicalWinRate > 0.3) return "medium";
  if (score > 55) return "medium";

  // Low confidence: weak score or poor historical data
  return "low";
}

/**
 * Calculate estimated savings range
 */
function calculateSavingsRange(
  assessmentGap: number | null,
  successProbability: number
): { min: number; max: number } {
  if (!assessmentGap || assessmentGap <= 0) {
    return { min: 0, max: 0 };
  }

  // Conservative estimate: 30-60% of assessment gap reduction
  const minReduction = assessmentGap * 0.3 * successProbability;
  const maxReduction = assessmentGap * 0.6 * successProbability;

  // Assume 1.2% annual tax rate (varies by location)
  const annualTaxRate = 0.012;

  return {
    min: Math.round(minReduction * annualTaxRate),
    max: Math.round(maxReduction * annualTaxRate),
  };
}

/**
 * Generate recommendation text
 */
function generateRecommendation(
  score: number,
  probability: number,
  riskFactors: string[],
  strengthFactors: string[]
): string {
  if (score > 75 && probability > 0.7) {
    return `Strong appeal candidate. Your property shows ${strengthFactors.join(", ")} that favor a successful appeal. Proceed with confidence.`;
  }

  if (score > 60 && probability > 0.55) {
    return `Moderate appeal prospects. While there are some favorable factors (${strengthFactors.join(", ")}), be aware of potential challenges (${riskFactors.join(", ")}).`;
  }

  if (score > 45) {
    return `Borderline appeal case. Success is possible but not guaranteed. Consider consulting with a property tax professional. Key concerns: ${riskFactors.join(", ")}.`;
  }

  return `Weak appeal prospects based on current data. The property appears fairly assessed relative to market comparables. Consider gathering additional evidence or waiting for market conditions to change.`;
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

Estimated Annual Savings: $${score.estimatedSavingsRange.min.toLocaleString()} - $${score.estimatedSavingsRange.max.toLocaleString()}
  `;
}
