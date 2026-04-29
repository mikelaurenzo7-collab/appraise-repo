/**
 * Generate a sample paid-tier PDF report with realistic data.
 * Run: node generate-sample-report.mjs
 */
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { writeFileSync } from "fs";

// We need to transpile the TS file — use tsx
import { register } from "node:module";

// Load env
import dotenv from "dotenv";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env") });

// Dynamic import of the compiled module
const { generateAppraisalPDF } = await import("./server/services/pdfGenerator.ts");

const sampleData = {
  submissionId: 42,
  address: "1847 Oakwood Drive",
  city: "Austin",
  state: "TX",
  zipCode: "78704",
  county: "Travis",
  propertyType: "residential",
  ownerName: "Michael & Sarah Thompson",
  ownerEmail: "thompson@email.com",
  assessedValue: 685000,
  assessmentLevel: 1.0,
  marketValueEstimate: 542000,
  assessmentGap: 143000,
  potentialSavings: 3575,
  appealStrengthScore: 78,
  executiveSummary:
    "This analysis concludes that the subject property at 1847 Oakwood Drive, Austin, TX 78704 has a market value of $542,000 as of the effective date. " +
    "The current Travis County assessed value of $685,000 exceeds the market value by $143,000, representing a 20.9% over-assessment. " +
    "This conclusion is supported by 6 verified comparable sales within a 1.5-mile radius, all transacted within the past 12 months. " +
    "The Sales Comparison Approach, which is given the greatest weight in this analysis, indicates a value range of $525,000 to $558,000 after adjustments. " +
    "The Cost Approach provides additional support at $537,400. Property condition findings from 4 owner-submitted photographs reveal moderate deferred maintenance " +
    "including aging roof materials and exterior paint deterioration, which further supports a value below the current assessment. " +
    "Based on these findings, the appeal strength score is 78/100 (STRONG), and the estimated annual tax savings from a successful appeal is $3,575.",
  valuationJustification:
    "The assessor's current valuation of $685,000 appears to rely on outdated comparable sales from a period of peak market activity (Q1-Q2 2024) " +
    "and does not adequately account for the market correction observed in the subject's micro-market during the latter half of 2024. " +
    "Specifically: (1) The assessor's implied price per square foot of $342.50 exceeds the median comparable sale price of $271/SF by 26.4%. " +
    "(2) The assessment does not reflect the property's effective age of 28 years and associated physical depreciation, including deferred roof maintenance " +
    "estimated at $12,000-$18,000 in cost-to-cure. (3) Three of the six comparable sales analyzed herein — all within 0.8 miles of the subject — " +
    "sold for less than $560,000, directly contradicting the $685,000 assessment. (4) The subject's lot size of 7,200 SF is 15% smaller than the " +
    "neighborhood median of 8,500 SF, a factor not adequately reflected in the current assessment.",
  recommendedApproach: "Sales Comparison Approach with Cost Approach support",
  filingMethod: "pro_se",
  appealDeadline: "2026-05-15",
  reportDate: "April 28, 2026",
  reportType: "full",
  tier: "pro_se",
  squareFeet: 2000,
  yearBuilt: 1998,
  bedrooms: 4,
  bathrooms: 2.5,
  lotSize: 7200,
  parcelNumber: "02-4456-0178-0000",
  comparableSales: [
    {
      address: "2103 Barton Hills Dr, Austin, TX 78704",
      salePrice: 525000,
      saleDate: "2025-11-15",
      squareFeet: 1920,
      yearBuilt: 1996,
      bedrooms: 4,
      bathrooms: 2,
      lotSize: 7500,
      distance: 0.4,
      similarity: 92,
      propertyType: "residential",
    },
    {
      address: "1622 Collier St, Austin, TX 78704",
      salePrice: 558000,
      saleDate: "2025-10-22",
      squareFeet: 2150,
      yearBuilt: 2001,
      bedrooms: 4,
      bathrooms: 3,
      lotSize: 8100,
      distance: 0.6,
      similarity: 88,
      propertyType: "residential",
    },
    {
      address: "905 Jessie St, Austin, TX 78704",
      salePrice: 510000,
      saleDate: "2025-09-08",
      squareFeet: 1850,
      yearBuilt: 1994,
      bedrooms: 3,
      bathrooms: 2,
      lotSize: 6800,
      distance: 0.8,
      similarity: 85,
      propertyType: "residential",
    },
    {
      address: "3401 Del Curto Rd, Austin, TX 78704",
      salePrice: 575000,
      saleDate: "2025-12-03",
      squareFeet: 2200,
      yearBuilt: 2003,
      bedrooms: 4,
      bathrooms: 3,
      lotSize: 8800,
      distance: 1.1,
      similarity: 82,
      propertyType: "residential",
    },
    {
      address: "2210 Kinney Ave, Austin, TX 78704",
      salePrice: 498000,
      saleDate: "2025-08-19",
      squareFeet: 1780,
      yearBuilt: 1992,
      bedrooms: 3,
      bathrooms: 2,
      lotSize: 6500,
      distance: 1.3,
      similarity: 79,
      propertyType: "residential",
    },
    {
      address: "1504 Newning Ave, Austin, TX 78704",
      salePrice: 545000,
      saleDate: "2025-10-01",
      squareFeet: 2050,
      yearBuilt: 1999,
      bedrooms: 4,
      bathrooms: 2.5,
      lotSize: 7400,
      distance: 0.5,
      similarity: 94,
      propertyType: "residential",
    },
  ],
  adjustmentGrid: [
    {
      compAddress: "2103 Barton Hills Dr — Comp 1",
      salePrice: 525000,
      adjustments: {
        location: 1.5,
        grossLivingArea: 2.1,
        age: -0.5,
        condition: 0.0,
        bathrooms: 1.2,
        lotSize: -0.4,
        garageParking: 0.0,
      },
      netAdjustmentPct: 3.9,
      adjustedValue: 545475,
      pricePerSF: 273.44,
    },
    {
      compAddress: "1622 Collier St — Comp 2",
      salePrice: 558000,
      adjustments: {
        location: 0.5,
        grossLivingArea: -3.5,
        age: 0.8,
        condition: 0.0,
        bathrooms: -1.2,
        lotSize: -1.0,
        garageParking: 0.0,
      },
      netAdjustmentPct: -4.4,
      adjustedValue: 533448,
      pricePerSF: 259.53,
    },
    {
      compAddress: "905 Jessie St — Comp 3",
      salePrice: 510000,
      adjustments: {
        location: 2.0,
        grossLivingArea: 4.1,
        age: -1.0,
        condition: 1.5,
        bathrooms: 1.2,
        lotSize: 0.6,
        garageParking: 0.0,
      },
      netAdjustmentPct: 8.4,
      adjustedValue: 552840,
      pricePerSF: 275.68,
    },
    {
      compAddress: "3401 Del Curto Rd — Comp 4",
      salePrice: 575000,
      adjustments: {
        location: -1.5,
        grossLivingArea: -4.6,
        age: 1.3,
        condition: -0.5,
        bathrooms: -1.2,
        lotSize: -2.0,
        garageParking: 0.0,
      },
      netAdjustmentPct: -8.5,
      adjustedValue: 526125,
      pricePerSF: 261.36,
    },
    {
      compAddress: "2210 Kinney Ave — Comp 5",
      salePrice: 498000,
      adjustments: {
        location: 3.0,
        grossLivingArea: 6.2,
        age: -1.5,
        condition: 2.0,
        bathrooms: 1.2,
        lotSize: 1.0,
        garageParking: 0.0,
      },
      netAdjustmentPct: 11.9,
      adjustedValue: 557262,
      pricePerSF: 279.78,
    },
    {
      compAddress: "1504 Newning Ave — Comp 6",
      salePrice: 545000,
      adjustments: {
        location: 0.0,
        grossLivingArea: -1.2,
        age: 0.3,
        condition: 0.0,
        bathrooms: 0.0,
        lotSize: -0.3,
        garageParking: 0.0,
      },
      netAdjustmentPct: -1.2,
      adjustedValue: 538460,
      pricePerSF: 265.85,
    },
  ],
  costApproach: {
    landValue: 185000,
    improvementValue: 352400,
    replacementCostNew: 380000,
    totalDepreciation: 27600,
    effectiveAge: 28,
    remainingEconomicLife: 47,
    costApproachValue: 537400,
  },
  marketTrend: {
    medianSalePrice: 535000,
    medianPricePerSF: 271,
    averageDaysOnMarket: 42,
    inventoryCount: 156,
    priceChangeYoY: -3.2,
    absorptionRate: 4.8,
  },
  reconciliationNarrative:
    "Three valuation approaches were applied in this analysis: the Sales Comparison Approach, the Cost Approach, and a review of the assessor's methodology. " +
    "The Sales Comparison Approach is given the greatest weight because it most directly reflects the actions of buyers and sellers in the South Austin market. " +
    "The six comparable sales, after quantitative adjustments for differences in size, age, condition, and location, produce an adjusted value range of " +
    "$526,125 to $557,262, with a median of $539,954 and a mean of $542,268. The Cost Approach provides supporting evidence at $537,400, which falls " +
    "within the range indicated by the sales comparison analysis. The close alignment between the two approaches strengthens the reliability of the " +
    "final value conclusion. After careful consideration of all value indications, with primary emphasis on the Sales Comparison Approach, " +
    "the final opinion of market value for the subject property is $542,000 as of the effective date.",
  photoFindings: {
    overallConditionScore: 62,
    overallEvidenceStrength: 74,
    summaryParagraph:
      "Analysis of 4 owner-submitted photographs reveals a property in average to fair condition with notable deferred maintenance items. " +
      "The exterior shows moderate paint deterioration on the south-facing elevation, consistent with UV exposure and age. " +
      "Roof materials appear to be original composition shingles approaching end of useful life (estimated 25+ years), with visible " +
      "granule loss and minor curling at edges. The interior photographs show functional but dated finishes including original " +
      "laminate countertops and vinyl flooring in the kitchen. These condition factors support a value adjustment below properties " +
      "in good or excellent condition and are consistent with the effective age assessment of 28 years.",
    topObservations: [
      "Exterior paint showing moderate deterioration on south and west elevations — estimated cost to cure: $4,500–$6,500",
      "Composition roof shingles at or near end of useful life (25+ years) — estimated replacement cost: $12,000–$18,000",
      "Kitchen finishes are original and functionally adequate but dated — cosmetic update estimated at $8,000–$15,000",
      "Foundation appears structurally sound with no visible cracking or settlement in available photographs",
      "Landscaping is mature and well-maintained, contributing positively to curb appeal",
    ],
    topValueIssues: [
      "Deferred roof maintenance represents the most significant value-impacting condition issue — $12,000–$18,000 cost to cure",
      "Exterior paint deterioration reduces curb appeal and may indicate moisture intrusion risk — $4,500–$6,500 cost to cure",
      "Dated interior finishes place the property below market expectations for the price range — functional obsolescence adjustment warranted",
    ],
  },
  photos: [],
  streetViewUrl: "",
  satelliteImageUrl: "",
};

console.log("Generating sample paid-tier report...");
try {
  const result = await generateAppraisalPDF(sampleData);
  console.log("✅ Report generated successfully!");
  console.log(`   URL: ${result.url}`);
  console.log(`   Key: ${result.key}`);
  console.log(`   Size: ${(result.sizeBytes / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error("❌ Report generation failed:", err);
  process.exit(1);
}
