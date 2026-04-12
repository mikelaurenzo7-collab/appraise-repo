/**
 * PDF Report Generator Service
 * 
 * Generates professional USPAP-compliant appraisal reports in PDF format
 */

import { PropertyAnalysis, PropertySubmission } from "../../drizzle/schema";

export interface AppraisalReportData {
  submission: PropertySubmission;
  analysis: PropertyAnalysis;
  comparableSales: Array<{
    address: string;
    salePrice: number;
    saleDate: string;
    sqft: number;
    pricePerSqft: number;
  }>;
  appealStrengthFactors: string[];
  nextSteps: string[];
}

/**
 * Generate HTML for PDF report
 * This HTML can be converted to PDF using a service like WeasyPrint or Puppeteer
 */
export function generateAppraisalReportHTML(data: AppraisalReportData): string {
  const {
    submission,
    analysis,
    comparableSales,
    appealStrengthFactors,
    nextSteps,
  } = data;

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const overassessment = (submission.assessedValue || 0) - (submission.marketValue || 0);
  const overassessmentPercent = submission.assessedValue
    ? ((overassessment / submission.assessedValue) * 100).toFixed(1)
    : "0";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Appraisal Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', serif;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    .page {
      max-width: 8.5in;
      height: 11in;
      margin: 0 auto;
      padding: 0.75in;
      background: white;
      page-break-after: always;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0F1F3D;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #0F1F3D;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .report-date {
      font-size: 11px;
      color: #999;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #0F1F3D;
      border-bottom: 2px solid #C9A84C;
      padding-bottom: 8px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .property-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-item {
      font-size: 11px;
    }
    .info-label {
      font-weight: bold;
      color: #0F1F3D;
      margin-bottom: 3px;
    }
    .info-value {
      color: #555;
    }
    .valuation-box {
      background: #FAF7F2;
      border-left: 4px solid #C9A84C;
      padding: 15px;
      margin: 15px 0;
      font-size: 12px;
    }
    .valuation-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #E0DDD5;
    }
    .valuation-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .valuation-label {
      font-weight: bold;
      color: #0F1F3D;
    }
    .valuation-amount {
      text-align: right;
      color: #555;
    }
    .overassessment {
      background: #fff3cd;
      border-left: 4px solid #ff6b6b;
    }
    .overassessment .valuation-label {
      color: #d9534f;
    }
    .overassessment .valuation-amount {
      color: #d9534f;
      font-weight: bold;
    }
    .comps-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin: 12px 0;
    }
    .comps-table th {
      background: #0F1F3D;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }
    .comps-table td {
      padding: 8px;
      border-bottom: 1px solid #E0DDD5;
    }
    .comps-table tr:nth-child(even) {
      background: #FAF7F2;
    }
    .factors-list {
      list-style: none;
      font-size: 11px;
      margin: 12px 0;
    }
    .factors-list li {
      padding: 6px 0 6px 20px;
      position: relative;
      line-height: 1.5;
    }
    .factors-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #C9A84C;
      font-weight: bold;
    }
    .next-steps {
      background: #F0F4F8;
      padding: 12px;
      border-radius: 4px;
      font-size: 11px;
      line-height: 1.6;
    }
    .next-steps ol {
      margin-left: 20px;
      margin-top: 8px;
    }
    .next-steps li {
      margin-bottom: 6px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #E0DDD5;
      font-size: 9px;
      color: #999;
      text-align: center;
    }
    .disclaimer {
      font-size: 9px;
      color: #666;
      margin-top: 20px;
      line-height: 1.5;
      font-style: italic;
    }
    @media print {
      .page {
        page-break-after: always;
        margin: 0;
        padding: 0.5in;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo">AppraiseAI</div>
      <div class="subtitle">Property Appraisal Report</div>
      <div class="report-date">Report Date: ${reportDate}</div>
    </div>

    <!-- Property Information -->
    <div class="section">
      <div class="section-title">Property Information</div>
      <div class="property-info">
        <div class="info-item">
          <div class="info-label">Address</div>
          <div class="info-value">${submission.address}, ${submission.city}, ${submission.state} ${submission.zipCode}</div>
        </div>
        <div class="info-item">
          <div class="info-label">County</div>
          <div class="info-value">${submission.county || "N/A"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Property Type</div>
          <div class="info-value">${submission.propertyType || "Residential"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Year Built</div>
          <div class="info-value">${submission.yearBuilt || "N/A"}</div>
        </div>
        ${submission.squareFeet ? `
        <div class="info-item">
          <div class="info-label">Square Feet</div>
          <div class="info-value">${submission.squareFeet.toLocaleString()}</div>
        </div>
        ` : ""}
        ${submission.bedrooms ? `
        <div class="info-item">
          <div class="info-label">Bedrooms / Bathrooms</div>
          <div class="info-value">${submission.bedrooms} / ${submission.bathrooms}</div>
        </div>
        ` : ""}
      </div>
    </div>

    <!-- Valuation Summary -->
    <div class="section">
      <div class="section-title">Valuation Summary</div>
      <div class="valuation-box">
        <div class="valuation-row">
          <span class="valuation-label">Current Assessment</span>
          <span class="valuation-amount">$${(submission.assessedValue || 0).toLocaleString()}</span>
        </div>
        <div class="valuation-row">
          <span class="valuation-label">Appraised Market Value</span>
          <span class="valuation-amount">$${(submission.marketValue || 0).toLocaleString()}</span>
        </div>
      </div>
      ${overassessment > 0 ? `
      <div class="valuation-box overassessment">
        <div class="valuation-row">
          <span class="valuation-label">Overassessment Amount</span>
          <span class="valuation-amount">$${overassessment.toLocaleString()}</span>
        </div>
        <div class="valuation-row">
          <span class="valuation-label">Overassessment Percentage</span>
          <span class="valuation-amount">${overassessmentPercent}%</span>
        </div>
      </div>
      ` : ""}
    </div>

    <!-- Comparable Sales -->
    ${comparableSales && comparableSales.length > 0 ? `
    <div class="section">
      <div class="section-title">Comparable Sales Analysis</div>
      <table class="comps-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Sale Price</th>
            <th>Sq Ft</th>
            <th>Price/Sq Ft</th>
            <th>Sale Date</th>
          </tr>
        </thead>
        <tbody>
          ${comparableSales
            .map(
              (comp) => `
          <tr>
            <td>${comp.address}</td>
            <td>$${comp.salePrice.toLocaleString()}</td>
            <td>${comp.sqft.toLocaleString()}</td>
            <td>$${comp.pricePerSqft.toLocaleString()}</td>
            <td>${comp.saleDate}</td>
          </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ` : ""}

    <!-- Appeal Strength Factors -->
    ${appealStrengthFactors && appealStrengthFactors.length > 0 ? `
    <div class="section">
      <div class="section-title">Appeal Strength Factors</div>
      <ul class="factors-list">
        ${appealStrengthFactors.map((factor) => `<li>${factor}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    <!-- Next Steps -->
    ${nextSteps && nextSteps.length > 0 ? `
    <div class="section">
      <div class="section-title">Recommended Next Steps</div>
      <div class="next-steps">
        <ol>
          ${nextSteps.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      </div>
    </div>
    ` : ""}

    <!-- Disclaimer -->
    <div class="disclaimer">
      <strong>Disclaimer:</strong> This appraisal report is provided for informational purposes only. 
      AppraiseAI is not a licensed appraisal company and this report should not be used for mortgage, 
      lending, or official appraisal purposes. For official appraisals, please contact a licensed appraiser 
      in your state. This analysis is based on publicly available data and AI analysis, which may not be 
      100% accurate. Always verify information independently before taking action.
    </disclaimer>

    <!-- Footer -->
    <div class="footer">
      <p>AppraiseAI | Property Tax Appeal Specialists</p>
      <p>Report generated on ${reportDate}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate JSON report data for API responses
 */
export function generateAppraisalReportJSON(data: AppraisalReportData) {
  return {
    reportDate: new Date().toISOString(),
    property: {
      address: data.submission.address,
      city: data.submission.city,
      state: data.submission.state,
      zipCode: data.submission.zipCode,
      county: data.submission.county,
      type: data.submission.propertyType,
      yearBuilt: data.submission.yearBuilt,
      squareFeet: data.submission.squareFeet,
      bedrooms: data.submission.bedrooms,
      bathrooms: data.submission.bathrooms,
    },
    valuation: {
      assessedValue: data.submission.assessedValue,
      marketValue: data.submission.marketValue,
      overassessment: (data.submission.assessedValue || 0) - (data.submission.marketValue || 0),
      overassessmentPercent:
        data.submission.assessedValue && data.submission.marketValue
          ? (
              ((data.submission.assessedValue - (data.submission.marketValue || 0)) /
                data.submission.assessedValue) *
              100
            ).toFixed(1)
          : null,
    },
    comparableSales: data.comparableSales,
    appealStrengthFactors: data.appealStrengthFactors,
    nextSteps: data.nextSteps,
    executiveSummary: data.analysis.executiveSummary,
    valuationJustification: data.analysis.valuationJustification,
  };
}
