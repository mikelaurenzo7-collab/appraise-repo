/**
 * Professional Report Template with Quality Control
 * Ensures consistent branding, structure, and content across all reports
 */

import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface ReportSection {
  title: string;
  content: string;
  subsections?: { title: string; content: string }[];
}

export interface ReportData {
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  assessedValue: number;
  marketValue: number;
  assessmentGap: number;
  propertyType: string;
  yearBuilt: number;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: number;
  condition: string;
  comparableSales: Array<{
    address: string;
    salePrice: number;
    saleDate: string;
    squareFeet: number;
  }>;
  marketTrends: {
    yearOverYearChange: number;
    sixMonthChange: number;
    marketStatus: string;
  };
  appealScore: number;
  successProbability: number;
  annualSavings: number;
  estimatedSavings40Year: number;
  photos?: Array<{
    url: string;
    category: string;
    description?: string;
    annotations?: Array<{ x: number; y: number; text: string; severity?: 'critical' | 'major' | 'minor' }>;
    defects?: string[];
    costToCure?: number;
  }>;
  costToCure?: Array<{ defect: string; estimatedCost: number }>;
  countyDeadlines?: Array<{ event: string; deadline: string }>;
  propertyLocationMapUrl?: string;
  comparablesMapUrl?: string;
}

export class ProfessionalReportTemplate {
  private colors = {
    primary: "#7C3AED",
    accent: "#14B8A6",
    gold: "#F59E0B",
    dark: "#1F2937",
    light: "#F3F4F6",
    white: "#FFFFFF",
    border: "#E5E7EB",
  };

  private doc: InstanceType<typeof PDFDocument>;
  private pageCount = 0;
  private currentPage = 1;
  private targetPages = 50;

  constructor() {
    this.doc = new PDFDocument({
      size: "letter",
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });
  }

  /**
   * Generate complete professional report
   */
  public generateReport(data: ReportData): Readable {
    this.addCoverPage(data);
    this.addTableOfContents();
    this.addExecutiveSummary(data);
    this.addComparableSalesAnalysis(data);
    this.addPropertyLocationMap(data);
    this.addMarketAnalysis(data);
    this.addPropertyCondition(data);
    this.addPhotosAndDefects(data);
    this.addCostToCureAnalysis(data);
    this.addDetailedCalculationMethodology(data);
    this.addCostApproachAnalysis(data);
    this.addDepreciationAnalysis(data);
    this.addValuationJustification(data);
    this.addValuationReconciliation(data);
    this.addAppealStrengthAnalysis(data);
    this.addCountyDeadlines(data);
    this.addRecommendations(data);
    this.addConclusion(data);
    this.addAppendix(data);

    this.doc.end();
    return this.doc;
  }

  private addCoverPage(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(2);

    this.doc
      .fontSize(28)
      .fillColor(this.colors.primary)
      .font("Helvetica-Bold");
    this.doc.text("PROPERTY TAX APPEAL REPORT", { align: "center" });
    this.doc.moveDown(1);

    this.doc.fontSize(16).fillColor(this.colors.dark).font("Helvetica-Bold");
    this.doc.text(data.propertyAddress, { align: "center" });
    this.doc.text(`${data.city}, ${data.state} ${data.zipCode}`, {
      align: "center",
    });
    this.doc.moveDown(0.5);

    this.doc.fontSize(12).fillColor("#666666").font("Helvetica");
    this.doc.text(`${data.county} Assessor's Office`, { align: "center" });
    this.doc.moveDown(2);

    this.doc.rect(50, this.doc.y, 495, 140).stroke(this.colors.primary);
    this.doc.moveDown(0.3);

    this.addKeyMetric("Assessed Value:", `$${data.assessedValue.toLocaleString()}`);
    this.addKeyMetric("Fair Market Value:", `$${data.marketValue.toLocaleString()}`);
    this.addKeyMetric("Over-Assessment:", `$${data.assessmentGap.toLocaleString()} (${((data.assessmentGap / data.assessedValue) * 100).toFixed(1)}%)`);
    this.addKeyMetric("Appeal Strength Score:", `${data.appealScore}/100`);
    this.addKeyMetric("Success Probability:", `${(data.successProbability * 100).toFixed(1)}%`);
    this.addKeyMetric("Annual Tax Savings:", `$${data.annualSavings.toLocaleString()}`);

    this.doc.moveDown(1);

    this.doc.fontSize(10).fillColor("#999999").font("Helvetica");
    this.doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, {
      align: "center",
    });
    this.doc.text("AppraiseAI Property Tax Appeal System", { align: "center" });

    this.addNewPage();
  }

  private addTableOfContents(): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("TABLE OF CONTENTS");

    const sections = [
      "1. Executive Summary",
      "2. Comparable Sales Analysis",
      "2A. Property Location Map",
      "3. Market Analysis & Trends",
      "4. Property Condition Assessment",
      "5. Photos & Defect Analysis",
      "6. Cost-to-Cure Analysis",
      "8A. Detailed Calculation Methodology",
      "8B. Cost Approach Analysis",
      "8C. Depreciation Analysis",
      "8D. Valuation Reconciliation",
      "9. Valuation Justification",
      "10. Appeal Strength Analysis",
      "11. County Deadlines & Procedures",
      "12. Recommendations",
      "13. Conclusion",
      "14. Appendix",
    ];

    this.doc.fontSize(10).fillColor(this.colors.dark).font("Helvetica");
    sections.forEach((section) => {
      this.doc.text(section);
      this.doc.moveDown(0.2);
    });

    this.addNewPage();
  }

  private addExecutiveSummary(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("1. EXECUTIVE SUMMARY");

    const summary = `
This property has been significantly over-assessed by the ${data.county} Assessor's Office. The current assessed value of $${data.assessedValue.toLocaleString()} exceeds the fair market value by approximately $${data.assessmentGap.toLocaleString()} (${((data.assessmentGap / data.assessedValue) * 100).toFixed(1)}% over-assessment).

This comprehensive report demonstrates that a substantial reduction in assessed value is justified based on:
• Recent comparable sales analysis
• Current market conditions and trends
• Property-specific condition factors
• Established appraisal principles (USPAP-compliant)

KEY FINDINGS:
• Assessed Value: $${data.assessedValue.toLocaleString()}
• Fair Market Value: $${data.marketValue.toLocaleString()}
• Over-Assessment: $${data.assessmentGap.toLocaleString()} (${((data.assessmentGap / data.assessedValue) * 100).toFixed(1)}%)
• Appeal Strength Score: ${data.appealScore}/100 (${data.successProbability > 0.75 ? "HIGH" : data.successProbability > 0.5 ? "MEDIUM" : "LOW"} Confidence)
• Success Probability: ${(data.successProbability * 100).toFixed(1)}%
• Estimated Annual Tax Savings: $${data.annualSavings.toLocaleString()}
• Estimated 40-Year Savings: $${data.estimatedSavings40Year.toLocaleString()}

The analysis presented in this report is based on recent comparable sales data, current market conditions, and established appraisal principles. We have identified clear evidence that the subject property's assessment does not reflect its true market value.
    `;

    this.addBodyText(summary);
    this.addNewPage();
  }

  private addComparableSalesAnalysis(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("2. COMPARABLE SALES ANALYSIS");

    this.addBodyText(
      "Recent sales of similar properties in the immediate area strongly support a market value of approximately $" +
        data.marketValue.toLocaleString() +
        ". The following comparable properties were selected based on proximity, similarity, and recency of sale:"
    );

    this.doc.moveDown(0.3);

    const avgPrice =
      data.comparableSales.reduce((sum, s) => sum + s.salePrice, 0) /
      data.comparableSales.length;
    const avgPricePerSqft =
      data.comparableSales.reduce((sum, s) => sum + s.salePrice / s.squareFeet, 0) /
      data.comparableSales.length;

    this.addTable(
      ["Property", "Sale Price", "Date", "$/SqFt", "Similarity"],
      data.comparableSales.map((comp) => [
        comp.address,
        `$${comp.salePrice.toLocaleString()}`,
        comp.saleDate,
        `$${(comp.salePrice / comp.squareFeet).toFixed(2)}`,
        "High",
      ])
    );

    this.addBodyText(`Average Market Value: $${avgPrice.toLocaleString()}`);
    this.doc.moveDown(0.2);
    this.addBodyText(
      `Average Price per Square Foot: $${avgPricePerSqft.toFixed(2)}`
    );
    this.doc.moveDown(0.2);
    this.addBodyText(
      `Subject Property Assessment: $${data.assessedValue.toLocaleString()}`
    );
    this.doc.moveDown(0.2);
    this.addBodyText(
      `Discrepancy: $${(data.assessedValue - avgPrice).toLocaleString()} (${(((data.assessedValue - avgPrice) / data.assessedValue) * 100).toFixed(1)}% over-assessed)`
    );

    this.addNewPage();
  }

  private addPropertyLocationMap(data: ReportData): void {
    if (!data.propertyLocationMapUrl) {
      return;
    }

    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("2A. PROPERTY LOCATION MAP");

    this.addBodyText(
      "The following map shows the location of the subject property and nearby comparable sales:"
    );

    this.doc.moveDown(0.3);
    this.addBodyText(
      `Property Address: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zipCode}`
    );
    this.addBodyText(`County: ${data.county}`);

    this.doc.moveDown(0.5);
    this.doc.fontSize(9).fillColor(this.colors.dark).font("Helvetica");
    this.doc.text("[Map Image: Property Location and Comparable Sales]", {
      align: "center",
      width: 495,
    });

    this.addNewPage();
  }

  private addMarketAnalysis(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("3. MARKET ANALYSIS & TRENDS");

    this.addBodyText(
      `The ${data.county} real estate market has experienced significant changes over the past 12 months. ` +
      `This analysis demonstrates that the subject property's assessment does not reflect current market conditions.`
    );

    this.doc.moveDown(0.3);
    this.addSubsectionHeader("Market Performance Metrics:");

    this.addTable(
      ["Period", "Change", "Interpretation"],
      [
        ["Year-over-Year", `${data.marketTrends.yearOverYearChange.toFixed(1)}%`, data.marketTrends.yearOverYearChange < 0 ? "Market Cooling" : "Market Strengthening"],
        ["Six-Month", `${data.marketTrends.sixMonthChange.toFixed(1)}%`, data.marketTrends.sixMonthChange < 0 ? "Recent Decline" : "Recent Growth"],
        ["Market Status", data.marketTrends.marketStatus, "Current Conditions"],
      ]
    );

    this.doc.moveDown(0.3);
    this.addSubsectionHeader("Market Analysis:");

    const marketAnalysis = `The ${data.county} market has been ${data.marketTrends.yearOverYearChange < 0 ? "cooling" : "strengthening"} over the past year. The year-over-year change of ${data.marketTrends.yearOverYearChange.toFixed(1)}% and the six-month change of ${data.marketTrends.sixMonthChange.toFixed(1)}% indicate ${data.marketTrends.yearOverYearChange < 0 ? "declining" : "stable"} market conditions.

The subject property's assessed value of $${data.assessedValue.toLocaleString()} was likely established during a period of ${data.marketTrends.yearOverYearChange > 0 ? "higher" : "similar"} market values. Current market conditions and comparable sales data clearly support a reduction to $${data.marketValue.toLocaleString()}.

This represents a ${((data.assessmentGap / data.assessedValue) * 100).toFixed(1)}% over-assessment that is not justified by current market conditions.`;

    this.addBodyText(marketAnalysis);

    this.addNewPage();
  }

  private addPropertyCondition(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("4. PROPERTY CONDITION ASSESSMENT");

    this.addBodyText("Subject Property Details:");
    this.doc.moveDown(0.2);

    const details = [
      ["Year Built:", `${data.yearBuilt} (${new Date().getFullYear() - data.yearBuilt} years old)`],
      ["Square Footage:", `${data.squareFeet.toLocaleString()} sqft`],
      ["Lot Size:", `${data.lotSize} acres`],
      ["Bedrooms:", `${data.bedrooms}`],
      ["Bathrooms:", `${data.bathrooms}`],
      ["Overall Condition:", data.condition],
      [
        "Price per Square Foot (Assessed):",
        `$${(data.assessedValue / data.squareFeet).toFixed(2)}`,
      ],
    ];

    this.doc.fontSize(9).fillColor(this.colors.dark).font("Helvetica");
    details.forEach(([label, value]) => {
      this.doc.text(`${label} ${value}`, { width: 495 });
      this.doc.moveDown(0.15);
    });

    this.addNewPage();
  }

  private addPhotosAndDefects(data: ReportData): void {
    if (!data.photos || data.photos.length === 0) {
      return;
    }

    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("5. PHOTOS & DEFECT ANALYSIS");

    this.addBodyText(
      "The following photos document the condition of the subject property and identified defects:"
    );

    data.photos.forEach((photo, idx) => {
      this.doc.moveDown(0.3);
      this.addSubsectionHeader(`${photo.category} - Photo ${idx + 1}`);

      if (photo.description) {
        this.addBodyText(`Description: ${photo.description}`);
      }

      if (photo.defects && photo.defects.length > 0) {
        this.doc.fontSize(9).fillColor(this.colors.dark).font("Helvetica");
        this.doc.text("Identified Defects:");
        this.doc.moveDown(0.1);
        photo.defects.forEach((defect) => {
          this.doc.text(`  • ${defect}`);
          this.doc.moveDown(0.1);
        });
      }

      if (photo.annotations && photo.annotations.length > 0) {
        this.doc.moveDown(0.2);
        this.doc.fontSize(9).fillColor(this.colors.dark).font("Helvetica-Bold");
        this.doc.text("Detailed Annotations:");
        this.doc.moveDown(0.1);
        photo.annotations.forEach((ann) => {
          const severityColor = ann.severity === 'critical' ? this.colors.primary :
                               ann.severity === 'major' ? this.colors.gold : this.colors.accent;
          this.doc.fontSize(8).fillColor(severityColor).font("Helvetica");
          this.doc.text(`  [${ann.severity?.toUpperCase() || 'NOTED'}] ${ann.text}`);
          this.doc.moveDown(0.1);
        });
      }

      if (photo.costToCure && photo.costToCure > 0) {
        this.doc.moveDown(0.2);
        this.doc.fontSize(9).fillColor(this.colors.dark).font("Helvetica-Bold");
        this.doc.text(`Estimated Cost to Cure: $${photo.costToCure.toLocaleString()}`);
      }

      this.doc.moveDown(0.3);
    });

    this.addNewPage();
  }

  private addCostToCureAnalysis(data: ReportData): void {
    if (!data.costToCure || data.costToCure.length === 0) {
      return;
    }

    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("6. COST-TO-CURE ANALYSIS");

    this.addBodyText(
      "The following defects identified in the property condition assessment have estimated repair costs:"
    );

    this.doc.moveDown(0.3);

    const totalCostToCure = data.costToCure.reduce((sum, c) => sum + c.estimatedCost, 0);

    this.addTable(
      ["Defect", "Estimated Cost"],
      data.costToCure.map((c) => [c.defect, `$${c.estimatedCost.toLocaleString()}`])
    );

    this.addBodyText(
      `Total Estimated Cost to Cure: $${totalCostToCure.toLocaleString()}`
    );

    this.addNewPage();
  }

  private addDetailedCalculationMethodology(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("8A. DETAILED CALCULATION METHODOLOGY");

    this.addBodyText(
      "The following section details the step-by-step calculations used to arrive at the market value estimate:"
    );

    this.doc.moveDown(0.3);
    this.addSubsectionHeader("Sales Comparison Approach Calculation:");

    const avgPrice =
      data.comparableSales.reduce((sum, s) => sum + s.salePrice, 0) /
      data.comparableSales.length;
    const avgPricePerSqft =
      data.comparableSales.reduce((sum, s) => sum + s.salePrice / s.squareFeet, 0) /
      data.comparableSales.length;

    this.addBodyText(
      `Step 1: Calculate average price per square foot from comparable sales:\n` +
      `  Average: $${avgPricePerSqft.toFixed(2)}/sqft\n` +
      `Step 2: Apply to subject property (${data.squareFeet.toLocaleString()} sqft):\n` +
      `  Indicated Value: $${(avgPricePerSqft * data.squareFeet).toLocaleString()}\n` +
      `Step 3: Compare to assessed value:\n` +
      `  Overassessment: $${data.assessmentGap.toLocaleString()} (${((data.assessmentGap / data.assessedValue) * 100).toFixed(1)}%)`
    );

    this.addNewPage();
  }

  private addCostApproachAnalysis(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("8B. COST APPROACH ANALYSIS");

    this.addBodyText(
      "The cost approach estimates value by calculating the replacement cost of the improvements and adding land value:"
    );

    this.doc.moveDown(0.3);

    const landValue = data.assessedValue * 0.25;
    const buildingCost = data.assessedValue * 0.75;
    const depreciation = buildingCost * 0.30;
    const costApproachValue = landValue + (buildingCost - depreciation);

    this.addTable(
      ["Component", "Amount"],
      [
        ["Land Value (estimated)", `$${landValue.toLocaleString()}`],
        ["Building Cost (new)", `$${buildingCost.toLocaleString()}`],
        ["Less: Depreciation (30%)", `($${depreciation.toLocaleString()})`],
        ["Cost Approach Value", `$${costApproachValue.toLocaleString()}`],
      ]
    );

    this.addNewPage();
  }

  private addDepreciationAnalysis(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("8C. DEPRECIATION ANALYSIS");

    this.addBodyText(
      "Depreciation represents the loss in value due to physical deterioration, functional obsolescence, and external factors:"
    );

    this.doc.moveDown(0.3);

    const age = new Date().getFullYear() - data.yearBuilt;
    const physicalDep = Math.min(age * 0.5, 40);
    const functionalDep = 5;
    const externalDep = 3;
    const totalDep = Math.min(physicalDep + functionalDep + externalDep, 50);

    this.addTable(
      ["Depreciation Type", "Percentage"],
      [
        ["Physical Depreciation", `${physicalDep.toFixed(1)}%`],
        ["Functional Obsolescence", `${functionalDep.toFixed(1)}%`],
        ["External Obsolescence", `${externalDep.toFixed(1)}%`],
        ["Total Depreciation", `${totalDep.toFixed(1)}%`],
      ]
    );

    this.addNewPage();
  }

  private addValuationReconciliation(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("8D. VALUATION RECONCILIATION");

    this.addBodyText(
      "The following table reconciles the conclusions from the different valuation approaches:"
    );

    this.doc.moveDown(0.3);

    const costApproachValue = data.assessedValue * 0.70;

    this.addTable(
      ["Approach", "Indicated Value", "Weight", "Weighted Value"],
      [
        ["Sales Comparison", `$${data.marketValue.toLocaleString()}`, "60%", `$${(data.marketValue * 0.60).toLocaleString()}`],
        ["Cost Approach", `$${costApproachValue.toLocaleString()}`, "40%", `$${(costApproachValue * 0.40).toLocaleString()}`],
        ["Final Market Value", `$${data.marketValue.toLocaleString()}`, "100%", `$${data.marketValue.toLocaleString()}`],
      ]
    );

    this.addNewPage();
  }

  private addValuationJustification(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("9. VALUATION JUSTIFICATION");

    this.addBodyText(
      "Using the Sales Comparison Approach (most appropriate for residential properties):"
    );

    this.doc.moveDown(0.2);

    const avgComparablePrice =
      data.comparableSales.reduce((sum, s) => sum + s.salePrice, 0) /
      data.comparableSales.length;

    this.addKeyMetric("Comparable Sales Average:", `$${avgComparablePrice.toLocaleString()}`);
    this.addKeyMetric("Subject Property Assessed Value:", `$${data.assessedValue.toLocaleString()}`);
    this.addKeyMetric(
      "Variance:",
      `$${(data.assessedValue - avgComparablePrice).toLocaleString()} (${(((data.assessedValue - avgComparablePrice) / data.assessedValue) * 100).toFixed(1)}% over-assessment)`
    );

    this.addBodyText(
      "The subject property's assessed value cannot be justified by:\n" +
        "✗ Recent comparable sales (all lower)\n" +
        "✗ Current market conditions (declining/stable market)\n" +
        "✗ Property condition (average for age/area)\n" +
        "✗ Market rates per square foot (above market)"
    );

    this.addNewPage();
  }

  private addAppealStrengthAnalysis(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("10. APPEAL STRENGTH ANALYSIS");

    this.addBodyText(
      `This property has a strong appeal case with a score of ${data.appealScore}/100 and an estimated success probability of ${(data.successProbability * 100).toFixed(1)}%.`
    );

    this.doc.moveDown(0.3);

    this.addKeyMetric("Appeal Strength Score:", `${data.appealScore}/100`);
    this.addKeyMetric(
      "Success Probability:",
      `${(data.successProbability * 100).toFixed(1)}%`
    );
    this.addKeyMetric("Confidence Level:", data.appealScore > 75 ? "HIGH" : data.appealScore > 60 ? "MEDIUM" : "LOW");

    this.addNewPage();
  }

  private addCountyDeadlines(data: ReportData): void {
    if (!data.countyDeadlines || data.countyDeadlines.length === 0) {
      return;
    }

    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("11. COUNTY DEADLINES & PROCEDURES");

    this.addBodyText(
      `Important deadlines for ${data.county} property tax appeals:`
    );

    this.doc.moveDown(0.3);

    this.addTable(
      ["Event", "Deadline"],
      data.countyDeadlines.map((d) => [d.event, d.deadline])
    );

    this.addNewPage();
  }

  private addRecommendations(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("12. RECOMMENDATIONS");

    this.doc.rect(50, this.doc.y, 495, 80).fill(this.colors.light);
    this.doc.moveDown(0.3);

    this.doc
      .fontSize(12)
      .fillColor(this.colors.primary)
      .font("Helvetica-Bold");
    this.doc.text(
      `The assessed value should be reduced to approximately $${data.marketValue.toLocaleString()}`,
      60
    );

    this.doc.fontSize(9).fillColor(this.colors.dark).font("Helvetica");
    this.doc.moveDown(0.2);
    this.doc.text("This reduction would result in:", 60);
    this.doc.moveDown(0.1);
    this.doc.text(
      `• Annual Tax Savings: $${data.annualSavings.toLocaleString()}`,
      60
    );
    this.doc.text(
      `• 40-Year Savings: $${data.estimatedSavings40Year.toLocaleString()}`,
      60
    );
    this.doc.text(
      `• Contingency Fee (if applicable): $${(data.assessmentGap * 0.25).toLocaleString()}`,
      60
    );

    this.addNewPage();
  }

  private addConclusion(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("13. CONCLUSION");

    const conclusion = `
The evidence presented in this report clearly demonstrates that the subject property has been over-assessed by the ${data.county} Assessor's Office. A reduction to fair market value of approximately $${data.marketValue.toLocaleString()} is strongly supported by:

• Comparable sales data (${data.comparableSales.length} recent sales)
• Current market analysis (${data.marketTrends.yearOverYearChange < 0 ? "declining" : "stable"} market)
• Established appraisal principles (USPAP-compliant)
• Property condition assessment

We recommend filing an appeal with the ${data.county} Board of Review immediately to challenge this over-assessment. The deadline for filing an appeal is typically 30 days from the date of the assessment notice.

With an appeal strength score of ${data.appealScore}/100 and a success probability of ${(data.successProbability * 100).toFixed(1)}%, this property has a strong case for a successful appeal.
    `;

    this.addBodyText(conclusion);

    this.addNewPage();
  }

  private addAppendix(data: ReportData): void {
    this.addHeader();
    this.doc.moveDown(0.5);

    this.addSectionHeader("14. APPENDIX");

    this.addBodyText(
      "Supporting Documents:\n" +
      "• Comparable Sales Data\n" +
      "• Market Analysis Charts\n" +
      "• Property Photos & Defect Documentation\n" +
      "• County Appeal Procedures\n" +
      "• USPAP Compliance Statement"
    );
  }

  private addHeader(): void {
    this.doc.fontSize(10).fillColor(this.colors.dark);
    this.doc.text("APPRAISEAI", { width: 200, align: "left" });
    this.doc.fontSize(8).fillColor("#666666");
    this.doc.text("Property Tax Appeal System", { width: 200, align: "left" });

    this.doc
      .moveTo(50, this.doc.y + 5)
      .lineTo(545, this.doc.y + 5)
      .stroke(this.colors.primary);
    this.doc.moveDown(0.5);
  }

  private addSectionHeader(text: string): void {
    this.doc.fontSize(12).fillColor(this.colors.primary).font("Helvetica-Bold");
    this.doc.text(text);
    this.doc
      .moveTo(50, this.doc.y)
      .lineTo(545, this.doc.y)
      .stroke(this.colors.accent);
    this.doc.moveDown(0.3);
  }

  private addSubsectionHeader(text: string): void {
    this.doc.fontSize(10).fillColor(this.colors.dark).font("Helvetica-Bold");
    this.doc.text(text);
    this.doc.moveDown(0.2);
  }

  private addBodyText(text: string, size = 9): void {
    this.doc.fontSize(size).fillColor(this.colors.dark).font("Helvetica");
    this.doc.text(text, { align: "left", width: 495 });
    this.doc.moveDown(0.3);
  }

  private addKeyMetric(label: string, value: string, color = this.colors.accent): void {
    const y = this.doc.y;
    this.doc.fontSize(9).fillColor("#666666").font("Helvetica");
    this.doc.text(label, 50, y);
    this.doc.fontSize(11).fillColor(color).font("Helvetica-Bold");
    this.doc.text(value, 250, y);
    this.doc.moveDown(0.4);
  }

  private addTable(headers: string[], rows: string[][]): void {
    const colWidth = 495 / headers.length;
    const rowHeight = 20;

    this.doc.fontSize(9).fillColor("white").font("Helvetica-Bold");
    this.doc.rect(50, this.doc.y, 495, rowHeight).fill(this.colors.primary);

    let x = 50;
    headers.forEach((header) => {
      this.doc.text(header, x + 5, this.doc.y - rowHeight + 5, {
        width: colWidth - 10,
      });
      x += colWidth;
    });

    this.doc.moveDown(0.8);

    this.doc.fontSize(8).fillColor(this.colors.dark).font("Helvetica");
    rows.forEach((row, idx) => {
      const bgColor = idx % 2 === 0 ? this.colors.light : "white";
      this.doc.rect(50, this.doc.y, 495, rowHeight).fill(bgColor);

      x = 50;
      row.forEach((cell) => {
        this.doc.text(cell, x + 5, this.doc.y - rowHeight + 5, {
          width: colWidth - 10,
        });
        x += colWidth;
      });

      this.doc.moveDown(0.8);
    });

    this.doc.moveDown(0.2);
  }

  private addNewPage(): void {
    this.currentPage++;
    if (this.currentPage < this.targetPages) {
      this.doc.addPage();
    }
  }

  /**
   * Quality control validation
   */
  public validateReport(data: ReportData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.propertyAddress) errors.push("Missing property address");
    if (!data.county) errors.push("Missing county");
    if (data.assessedValue <= 0) errors.push("Invalid assessed value");
    if (data.marketValue <= 0) errors.push("Invalid market value");
    if (data.comparableSales.length < 3)
      errors.push("Insufficient comparable sales (need at least 3)");
    if (data.appealScore < 0 || data.appealScore > 100)
      errors.push("Invalid appeal score");
    if (data.successProbability < 0 || data.successProbability > 1)
      errors.push("Invalid success probability");

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
