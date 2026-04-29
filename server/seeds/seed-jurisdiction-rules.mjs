/**
 * Seed jurisdiction_rules table from jurisdictionRules.ts
 * Run with: node seed-jurisdiction-rules.mjs
 */
import { config } from "dotenv";
config();

import mysql from "mysql2/promise";

const pool = mysql.createPool({
  connectionLimit: 1,
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "appraise_ai",
});

// Import rules from the TypeScript file (converted to JS)
const jurisdictionRules = {
  TX: [
    {
      state: "TX",
      county: "Harris",
      assessmentRate: 100, // Texas assesses at market value
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000,
      minAssessmentPercentage: 3,
      successRate: 52,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Comparable sales analysis", "Property condition report", "Market analysis", "Appraisal report"],
      hearingRequired: true,
      averageResolutionDays: 120,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Harris County accepts both POA and pro se. Strong comps market. AI-generated reports perform well.",
      source: "Harris County Appraisal District",
      sourceUrl: "https://www.hcad.org",
    },
    {
      state: "TX",
      county: "Dallas",
      assessmentRate: 100,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000,
      minAssessmentPercentage: 2.5,
      successRate: 48,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Certified appraisal", "Comparable sales", "Market analysis"],
      hearingRequired: true,
      averageResolutionDays: 90,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Dallas CAD is data-heavy. Requires certified appraisals for POA filings.",
      source: "Dallas Central Appraisal District",
      sourceUrl: "https://www.dallascad.org",
    },
    {
      state: "TX",
      county: "Tarrant",
      assessmentRate: 100,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500,
      minAssessmentPercentage: 2,
      successRate: 55,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market data"],
      hearingRequired: true,
      averageResolutionDays: 75,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Fort Worth area. Favorable to residential appeals. Fast turnaround.",
      source: "Tarrant Central Appraisal District",
      sourceUrl: "https://www.tcad.org",
    },
  ],
  IL: [
    {
      state: "IL",
      county: "Cook",
      assessmentRate: 33.33,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 5000,
      minAssessmentPercentage: 3,
      successRate: 45,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Certified appraisal", "Comparable sales", "Market analysis"],
      hearingRequired: true,
      averageResolutionDays: 150,
      contingencyFeeAllowed: true,
      maxContingencyFee: 20,
      notes: "Cook County (Chicago) is competitive. Requires certified appraisals. Strong appeal culture but strict standards.",
      source: "Cook County Assessor",
      sourceUrl: "https://www.cookcountyassessor.com",
    },
    {
      state: "IL",
      county: "DuPage",
      assessmentRate: 27.5,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000,
      minAssessmentPercentage: 2.5,
      successRate: 48,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market analysis"],
      hearingRequired: true,
      averageResolutionDays: 120,
      contingencyFeeAllowed: true,
      maxContingencyFee: 20,
      notes: "DuPage County (western suburbs of Chicago). Moderate assessment rate. Good appeal market.",
      source: "DuPage County Assessor",
      sourceUrl: "https://www.dupageco.org/assessor",
    },
    {
      state: "IL",
      county: "Lake",
      assessmentRate: 30,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000,
      minAssessmentPercentage: 2.5,
      successRate: 46,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 110,
      contingencyFeeAllowed: true,
      maxContingencyFee: 20,
      notes: "Lake County (north of Chicago). Moderate assessment rate. Residential-focused.",
      source: "Lake County Assessor",
      sourceUrl: "https://www.lakecountyil.gov/assessor",
    },
    {
      state: "IL",
      county: "Will",
      assessmentRate: 28,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500,
      minAssessmentPercentage: 2,
      successRate: 50,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 100,
      contingencyFeeAllowed: true,
      maxContingencyFee: 20,
      notes: "Will County (south of Chicago). Growing market. Good appeal success rate.",
      source: "Will County Assessor",
      sourceUrl: "https://www.willcountyassessor.com",
    },
    {
      state: "IL",
      county: "Kane",
      assessmentRate: 29,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3500,
      minAssessmentPercentage: 2,
      successRate: 49,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 105,
      contingencyFeeAllowed: true,
      maxContingencyFee: 20,
      notes: "Kane County (west of Chicago). Moderate assessment rate. Aurora area.",
      source: "Kane County Assessor",
      sourceUrl: "https://www.kanecountyassessor.com",
    },
  ],
  AZ: [
    {
      state: "AZ",
      county: "Maricopa",
      assessmentRate: 10,
      appealDeadlineDays: 30,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 3000,
      minAssessmentPercentage: 2,
      successRate: 50,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps", "Market data"],
      hearingRequired: false,
      averageResolutionDays: 60,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Maricopa County (Phoenix) does NOT require hearings for many appeals. Fast resolution. Good market.",
      source: "Maricopa County Assessor",
      sourceUrl: "https://www.maricopa.gov/assessor",
    },
  ],
  FL: [
    {
      state: "FL",
      county: "Miami-Dade",
      assessmentRate: 100,
      appealDeadlineDays: 25,
      appealDeadlineType: "from_notice",
      minAssessmentDifference: 4000,
      minAssessmentPercentage: 2.5,
      successRate: 48,
      filingMethods: ["poa", "pro_se"],
      documentationRequired: ["Appraisal", "Comps"],
      hearingRequired: true,
      averageResolutionDays: 90,
      contingencyFeeAllowed: true,
      maxContingencyFee: 25,
      notes: "Miami-Dade is residential-focused. Short deadline (25 days). Good contingency market.",
      source: "Miami-Dade County Property Appraiser",
      sourceUrl: "https://www.miamidade.gov/propertysearch",
    },
  ],
};

async function seedJurisdictionRules() {
  const connection = await pool.getConnection();
  try {
    console.log("[Seed] Starting jurisdiction_rules seeding...");

    // Clear existing rules
    await connection.query("DELETE FROM jurisdiction_rules");
    console.log("[Seed] Cleared existing rules");

    let count = 0;
    for (const [state, rules] of Object.entries(jurisdictionRules)) {
      for (const rule of rules) {
        const lastVerifiedAt = new Date();
        await connection.query(
          `INSERT INTO jurisdiction_rules 
           (state, county, assessmentRate, appealDeadlineDays, appealDeadlineType, 
            minAssessmentDifference, minAssessmentPercentage, successRate, averageResolutionDays,
            filingMethods, documentationRequired, hearingRequired, contingencyFeeAllowed, maxContingencyFee,
            notes, source, sourceUrl, lastVerifiedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rule.state,
            rule.county,
            rule.assessmentRate,
            rule.appealDeadlineDays,
            rule.appealDeadlineType,
            rule.minAssessmentDifference,
            rule.minAssessmentPercentage,
            rule.successRate,
            rule.averageResolutionDays,
            JSON.stringify(rule.filingMethods),
            JSON.stringify(rule.documentationRequired),
            rule.hearingRequired ? 1 : 0,
            rule.contingencyFeeAllowed ? 1 : 0,
            rule.maxContingencyFee,
            rule.notes,
            rule.source,
            rule.sourceUrl,
            lastVerifiedAt,
          ]
        );
        count++;
      }
    }

    console.log(`[Seed] Successfully seeded ${count} jurisdiction rules`);
    const result = await connection.query("SELECT COUNT(*) as total FROM jurisdiction_rules");
    console.log(`[Seed] Total rules in database: ${result[0][0].total}`);
  } catch (err) {
    console.error("[Seed] Error seeding jurisdiction rules:", err);
    throw err;
  } finally {
    await connection.release();
    await pool.end();
  }
}

seedJurisdictionRules().catch(err => {
  console.error(err);
  process.exit(1);
});
