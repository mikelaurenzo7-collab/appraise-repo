/**
 * Test Report Generation Script
 * Simulates full user pipeline: address → analysis → report
 */

import { invokeLLM } from "./server/_core/llm.ts";

const testProperty = {
  address: "25 W050 Setauket Avenue",
  city: "Naperville",
  state: "IL",
  zipCode: "60540",
  county: "DuPage County",
  propertyType: "residential",
};

console.log("🏠 AppraiseAI Test Report Generation");
console.log("=====================================\n");
console.log(`Property: ${testProperty.address}, ${testProperty.city}, ${testProperty.state} ${testProperty.zipCode}`);
console.log(`County: ${testProperty.county}`);
console.log(`Type: ${testProperty.propertyType}\n`);

// Simulate API data that would be fetched
const simulatedAnalysis = {
  assessedValue: 425000,
  marketValueEstimate: 385000,
  assessmentGap: 40000,
  yearBuilt: 1998,
  squareFeet: 3200,
  bedrooms: 4,
  bathrooms: 2.5,
  lotSize: 0.35,
  condition: "Good",
  comparableSales: [
    {
      address: "24 W050 Setauket Avenue",
      salePrice: 380000,
      saleDate: "2024-01-15",
      squareFeet: 3150,
    },
    {
      address: "26 W050 Setauket Avenue",
      salePrice: 390000,
      saleDate: "2024-02-20",
      squareFeet: 3300,
    },
    {
      address: "100 Knollwood Drive",
      salePrice: 375000,
      saleDate: "2024-03-10",
      squareFeet: 3100,
    },
  ],
  marketTrends: {
    yearOverYearChange: -2.5,
    sixMonthChange: -1.8,
    marketStatus: "Buyer's Market",
  },
};

console.log("📊 Analysis Summary:");
console.log(`  Assessed Value: $${simulatedAnalysis.assessedValue.toLocaleString()}`);
console.log(`  Market Estimate: $${simulatedAnalysis.marketValueEstimate.toLocaleString()}`);
console.log(`  Assessment Gap: $${simulatedAnalysis.assessmentGap.toLocaleString()}`);
console.log(`  Property: ${simulatedAnalysis.bedrooms}BR/${simulatedAnalysis.bathrooms}BA, ${simulatedAnalysis.squareFeet.toLocaleString()} sqft`);
console.log(`  Built: ${simulatedAnalysis.yearBuilt}, Condition: ${simulatedAnalysis.condition}\n`);

// Generate appeal strength score
const appealScore = calculateAppealScore(simulatedAnalysis);
console.log("📈 Appeal Strength Score:");
console.log(`  Overall Score: ${appealScore.score}/100`);
console.log(`  Success Probability: ${(appealScore.probability * 100).toFixed(1)}%`);
console.log(`  Confidence: ${appealScore.confidence}`);
console.log(`  Estimated Annual Savings: $${appealScore.annualSavings.toLocaleString()}\n`);

// Generate sample report excerpt
console.log("📄 Sample Report (Excerpt):");
console.log("=====================================\n");

const reportExcerpt = `
PROPERTY TAX APPEAL REPORT
25 W050 Setauket Avenue, Naperville, IL 60540
DuPage County Assessor's Office

EXECUTIVE SUMMARY
─────────────────
This property has been significantly over-assessed by the DuPage County Assessor's Office. 
The current assessed value of $425,000 exceeds the fair market value by approximately $40,000 
(9.4% over-assessment). This report demonstrates that a substantial reduction in assessed value 
is justified based on comparable sales analysis, current market conditions, and property-specific factors.

KEY FINDINGS:
• Assessed Value: $425,000
• Fair Market Value: $385,000
• Over-Assessment: $40,000 (9.4%)
• Annual Tax Savings (estimated): $480 - $720
• 40-Year Savings: $19,200 - $28,800

COMPARABLE SALES ANALYSIS
─────────────────────────
Recent sales of similar properties in the immediate area strongly support a market value 
of approximately $385,000:

1. 24 W050 Setauket Avenue (2024-01-15)
   • Sale Price: $380,000
   • Property: 4BR/2.5BA, 3,150 sqft
   • Similarity: Adjacent property, similar condition
   • Price per sqft: $120.63

2. 26 W050 Setauket Avenue (2024-02-20)
   • Sale Price: $390,000
   • Property: 4BR/2.5BA, 3,300 sqft
   • Similarity: Same street, comparable age
   • Price per sqft: $118.18

3. 100 Knollwood Drive (2024-03-10)
   • Sale Price: $375,000
   • Property: 4BR/2BA, 3,100 sqft
   • Similarity: Same neighborhood, recent sale
   • Price per sqft: $120.97

AVERAGE MARKET VALUE: $381,667
SUBJECT PROPERTY ASSESSMENT: $425,000
DISCREPANCY: $43,333 (11.3% over-assessed)

MARKET ANALYSIS
───────────────
The DuPage County real estate market has experienced a cooling trend over the past 12 months:
• Year-over-Year Change: -2.5%
• Six-Month Change: -1.8%
• Current Market Status: Buyer's Market

The subject property was assessed during a period of higher market values. Current market 
conditions clearly support a lower valuation.

PROPERTY CONDITION ASSESSMENT
──────────────────────────────
Subject Property Details:
• Year Built: 1998 (26 years old)
• Square Footage: 3,200 sqft
• Lot Size: 0.35 acres
• Bedrooms: 4
• Bathrooms: 2.5
• Overall Condition: Good
• Price per Square Foot: $132.81 (assessed)
• Market Price per Square Foot: $120.31 (comparable average)

The property's price-per-square-foot assessment ($132.81) significantly exceeds comparable 
properties in the market ($120.31), representing a 10.4% premium with no justification.

VALUATION JUSTIFICATION
────────────────────────
Using the Sales Comparison Approach (most appropriate for residential properties):

Comparable Sales Average: $381,667
Subject Property Assessed Value: $425,000
Variance: $43,333 (11.3% over-assessment)

The subject property's assessed value cannot be justified by:
✗ Recent comparable sales (all lower)
✗ Current market conditions (declining market)
✗ Property condition (average for age/area)
✗ Market rates per square foot (above market)

RECOMMENDATION
───────────────
The assessed value should be reduced to approximately $385,000, reflecting true fair market 
value based on comparable sales and current market conditions.

This reduction would result in:
• Annual Tax Savings: $480 - $720 (depending on tax rate)
• 40-Year Savings: $19,200 - $28,800
• Contingency Fee (if applicable): $4,800 - $7,200

CONCLUSION
───────────
The evidence presented in this report clearly demonstrates that the subject property has been 
over-assessed by the DuPage County Assessor's Office. A reduction to fair market value of 
approximately $385,000 is strongly supported by comparable sales data, current market analysis, 
and established appraisal principles.

We recommend filing an appeal with the DuPage County Board of Review immediately to challenge 
this over-assessment.

─────────────────────────────────────────────────────────────────────────────────────────
Report Generated: ${new Date().toLocaleDateString()}
AppraiseAI Property Tax Appeal System
`;

console.log(reportExcerpt);

console.log("\n📊 REPORT STATISTICS:");
console.log(`  Estimated Pages: ${Math.ceil(reportExcerpt.length / 3000)} pages`);
console.log(`  Word Count: ${reportExcerpt.split(/\s+/).length} words`);
console.log(`  Sections: 7 (Executive Summary, Comparables, Market Analysis, Condition, Valuation, Recommendation, Conclusion)`);

function calculateAppealScore(analysis) {
  // Comparable sales score
  const avgComparablePrice = analysis.comparableSales.reduce((sum, s) => sum + s.salePrice, 0) / analysis.comparableSales.length;
  const assessmentRatio = analysis.assessedValue / avgComparablePrice;
  const comparablesScore = assessmentRatio > 1.1 ? 90 : assessmentRatio > 1.05 ? 75 : 50;

  // Assessment gap score
  const gapScore = analysis.assessmentGap > 30000 ? 85 : analysis.assessmentGap > 20000 ? 70 : 50;

  // Market trend score
  const trendScore = analysis.marketTrends.yearOverYearChange < -2 ? 80 : 60;

  // Overall score (weighted average)
  const overallScore = Math.round(comparablesScore * 0.4 + gapScore * 0.35 + trendScore * 0.25);
  const probability = Math.min(0.95, overallScore / 100);
  const annualSavings = Math.round((analysis.assessmentGap * 0.012 * probability) / 1);

  return {
    score: overallScore,
    probability,
    confidence: overallScore > 75 ? "HIGH" : overallScore > 60 ? "MEDIUM" : "LOW",
    annualSavings,
  };
}

console.log("\n✅ Sample report generation complete!");
console.log("This demonstrates the full pipeline output users will receive.\n");
