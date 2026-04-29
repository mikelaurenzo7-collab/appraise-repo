/**
 * Jurisdiction Rules Helpers
 * Query jurisdiction rules from the database instead of hardcoded file
 * Provides fallback to default rules if county not found
 */
import { getDb } from "./db";
import { jurisdictionRules } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface JurisdictionRuleData {
  state: string;
  county: string;
  assessmentRate: number;
  appealDeadlineDays: number;
  appealDeadlineType: "from_notice" | "calendar_year" | "fiscal_year" | "rolling";
  minAssessmentDifference: number;
  minAssessmentPercentage: number;
  successRate: number;
  filingMethods: string[];
  documentationRequired: string[];
  hearingRequired: boolean;
  averageResolutionDays: number;
  contingencyFeeAllowed: boolean;
  maxContingencyFee: number;
  notes: string;
  source: string;
  sourceUrl: string;
  lastVerifiedAt: Date;
}

// Default fallback rule for unknown counties
const DEFAULT_RULE: JurisdictionRuleData = {
  state: "US",
  county: "Unknown",
  assessmentRate: 25,
  appealDeadlineDays: 45,
  appealDeadlineType: "from_notice",
  minAssessmentDifference: 5000,
  minAssessmentPercentage: 3,
  successRate: 40,
  filingMethods: ["pro_se"],
  documentationRequired: ["Appraisal", "Comparable sales"],
  hearingRequired: true,
  averageResolutionDays: 120,
  contingencyFeeAllowed: false,
  maxContingencyFee: 0,
  notes: "Default rule for unknown jurisdiction. Please provide specific county for accurate information.",
  source: "AppraiseAI Default",
  sourceUrl: "",
  lastVerifiedAt: new Date(),
};

/**
 * Get jurisdiction rule for a specific state and county
 * Returns DB rule if found, otherwise returns default rule
 */
export async function getJurisdictionRule(
  state: string,
  county: string
): Promise<JurisdictionRuleData> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Jurisdiction] DB connection failed, using default rule");
      return DEFAULT_RULE;
    }

    const rule = await db
      .select()
      .from(jurisdictionRules)
      .where(and(eq(jurisdictionRules.state, state), eq(jurisdictionRules.county, county)))
      .limit(1)
      .then((rows) => rows[0]);

    if (rule) {
      return {
        state: rule.state,
        county: rule.county,
        assessmentRate: parseFloat(rule.assessmentRate),
        appealDeadlineDays: rule.appealDeadlineDays,
        appealDeadlineType: rule.appealDeadlineType,
        minAssessmentDifference: rule.minAssessmentDifference || 5000,
        minAssessmentPercentage: rule.minAssessmentPercentage ? parseFloat(rule.minAssessmentPercentage.toString()) : 3,
        successRate: rule.successRate || 40,
        filingMethods: JSON.parse(rule.filingMethods || "[]"),
        documentationRequired: JSON.parse(rule.documentationRequired || "[]"),
        hearingRequired: rule.hearingRequired || false,
        averageResolutionDays: rule.averageResolutionDays || 120,
        contingencyFeeAllowed: rule.contingencyFeeAllowed || false,
        maxContingencyFee: rule.maxContingencyFee ? parseFloat(rule.maxContingencyFee.toString()) : 0,
        notes: rule.notes || "",
        source: rule.source || "",
        sourceUrl: rule.sourceUrl || "",
        lastVerifiedAt: rule.lastVerifiedAt,
      };
    }

    console.warn(`[Jurisdiction] Rule not found for ${state}/${county}, using default`);
    return DEFAULT_RULE;
  } catch (err) {
    console.error(`[Jurisdiction] Error fetching rule for ${state}/${county}:`, err);
    return DEFAULT_RULE;
  }
}

/**
 * Get all rules for a specific state
 */
export async function getStateRules(state: string): Promise<JurisdictionRuleData[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const rules = await db
      .select()
      .from(jurisdictionRules)
      .where(eq(jurisdictionRules.state, state));

    return rules.map((rule: any) => ({
      state: rule.state,
      county: rule.county,
      assessmentRate: parseFloat(rule.assessmentRate),
      appealDeadlineDays: rule.appealDeadlineDays,
      appealDeadlineType: rule.appealDeadlineType,
      minAssessmentDifference: rule.minAssessmentDifference || 5000,
      minAssessmentPercentage: rule.minAssessmentPercentage ? parseFloat(rule.minAssessmentPercentage.toString()) : 3,
      successRate: rule.successRate || 40,
      filingMethods: JSON.parse(rule.filingMethods || "[]"),
      documentationRequired: JSON.parse(rule.documentationRequired || "[]"),
      hearingRequired: rule.hearingRequired || false,
      averageResolutionDays: rule.averageResolutionDays || 120,
      contingencyFeeAllowed: rule.contingencyFeeAllowed || false,
      maxContingencyFee: rule.maxContingencyFee ? parseFloat(rule.maxContingencyFee.toString()) : 0,
      notes: rule.notes || "",
      source: rule.source || "",
      sourceUrl: rule.sourceUrl || "",
      lastVerifiedAt: rule.lastVerifiedAt,
    }));
  } catch (err) {
    console.error(`[Jurisdiction] Error fetching rules for ${state}:`, err);
    return [];
  }
}
