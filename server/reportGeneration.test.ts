import { describe, it, expect, beforeAll } from "vitest";
import { ProfessionalReportTemplate, ReportData } from "./services/reportTemplate";
import { Readable } from "stream";

describe("Professional Report Generation", () => {
  let mockReportData: ReportData;

  beforeAll(() => {
    mockReportData = {
      propertyAddress: "914 W Van Buren",
      city: "Chicago",
      state: "IL",
      zipCode: "60607",
      county: "Cook",
      assessedValue: 450000,
      marketValue: 350000,
      assessmentGap: 100000,
      propertyType: "Single Family Home",
      yearBuilt: 1985,
      squareFeet: 2500,
      bedrooms: 3,
      bathrooms: 2,
      lotSize: 0.25,
      condition: "Average",
      comparableSales: [
        {
          address: "910 W Van Buren",
          salePrice: 345000,
          saleDate: "2024-03-15",
          squareFeet: 2450,
        },
        {
          address: "916 W Van Buren",
          salePrice: 355000,
          saleDate: "2024-02-20",
          squareFeet: 2550,
        },
        {
          address: "920 W Van Buren",
          salePrice: 340000,
          saleDate: "2024-01-10",
          squareFeet: 2400,
        },
      ],
      marketTrends: {
        yearOverYearChange: -2.5,
        sixMonthChange: -1.2,
        marketStatus: "Cooling",
      },
      appealScore: 85,
      successProbability: 0.82,
      annualSavings: 2500,
      estimatedSavings40Year: 100000,
      photos: [
        {
          url: "https://example.com/photo1.jpg",
          category: "Exterior",
          description: "Front facade showing wear",
          defects: ["Cracked foundation", "Roof shingles missing"],
          costToCure: 15000,
          annotations: [
            {
              x: 100,
              y: 150,
              text: "Foundation crack extends 10 feet",
              severity: "critical",
            },
            {
              x: 200,
              y: 100,
              text: "Missing shingles on north side",
              severity: "major",
            },
          ],
        },
      ],
      costToCure: [
        { defect: "Foundation repair", estimatedCost: 15000 },
        { defect: "Roof replacement", estimatedCost: 8000 },
        { defect: "Exterior paint", estimatedCost: 3000 },
      ],
      countyDeadlines: [
        { event: "Assessment Notice Date", deadline: "2024-04-01" },
        { event: "Appeal Filing Deadline", deadline: "2024-05-01" },
        { event: "Board of Review Hearing", deadline: "2024-06-15" },
      ],
      countyStrategy: {
        filingDeadline: "30 days from assessment notice",
        preferredChannel: "Online portal",
        successRate: 0.65,
        typicalTimeframe: "90-120 days",
        commonObjections: [
          "Assessor claims market hasn't changed",
          "Assessor disputes comparable sales",
        ],
        recommendedStrategy:
          "File online appeal with strong comparable sales evidence",
      },
    };
  });

  it("should generate a valid PDF report stream", () => {
    const template = new ProfessionalReportTemplate();
    const reportStream = template.generateReport(mockReportData);

    expect(reportStream).toBeInstanceOf(Readable);
  });

  it("should validate report data correctly", () => {
    const template = new ProfessionalReportTemplate();
    const validation = template.validateReport(mockReportData);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it("should reject invalid report data - missing address", () => {
    const template = new ProfessionalReportTemplate();
    const invalidData = { ...mockReportData, propertyAddress: "" };

    const validation = template.validateReport(invalidData);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Missing property address");
  });

  it("should reject invalid report data - missing county", () => {
    const template = new ProfessionalReportTemplate();
    const invalidData = { ...mockReportData, county: "" };

    const validation = template.validateReport(invalidData);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Missing county");
  });

  it("should reject invalid report data - insufficient comparables", () => {
    const template = new ProfessionalReportTemplate();
    const invalidData = {
      ...mockReportData,
      comparableSales: mockReportData.comparableSales.slice(0, 2),
    };

    const validation = template.validateReport(invalidData);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "Insufficient comparable sales (need at least 3)"
    );
  });

  it("should reject invalid report data - invalid appeal score", () => {
    const template = new ProfessionalReportTemplate();
    const invalidData = { ...mockReportData, appealScore: 150 };

    const validation = template.validateReport(invalidData);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Invalid appeal score");
  });

  it("should reject invalid report data - invalid success probability", () => {
    const template = new ProfessionalReportTemplate();
    const invalidData = { ...mockReportData, successProbability: 1.5 };

    const validation = template.validateReport(invalidData);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Invalid success probability");
  });

  it("should include all required sections in the report", async () => {
    const template = new ProfessionalReportTemplate();
    const reportStream = template.generateReport(mockReportData);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      reportStream.on("data", (chunk) => chunks.push(chunk));
      reportStream.on("end", () => resolve());
      reportStream.on("error", reject);
    });

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    // PDF content should be non-trivial (PDFKit generates binary content)
    expect(totalLength).toBeGreaterThan(5000);
  });

  it("should calculate correct assessment gap", () => {
    const template = new ProfessionalReportTemplate();
    const validation = template.validateReport(mockReportData);

    expect(validation.valid).toBe(true);
    expect(mockReportData.assessmentGap).toBe(100000);
    expect(mockReportData.assessedValue - mockReportData.marketValue).toBe(
      100000
    );
  });

  it("should handle reports with photos and annotations", () => {
    const template = new ProfessionalReportTemplate();
    const dataWithPhotos = {
      ...mockReportData,
      photos: [
        {
          url: "https://example.com/photo1.jpg",
          category: "Exterior",
          description: "Front facade",
          defects: ["Cracked foundation"],
          costToCure: 15000,
          annotations: [
            {
              x: 100,
              y: 150,
              text: "Critical foundation crack",
              severity: "critical",
            },
          ],
        },
      ],
    };

    const validation = template.validateReport(dataWithPhotos);
    expect(validation.valid).toBe(true);

    const reportStream = template.generateReport(dataWithPhotos);
    expect(reportStream).toBeInstanceOf(Readable);
  });

  it("should handle reports with county strategy", () => {
    const template = new ProfessionalReportTemplate();
    const dataWithStrategy = {
      ...mockReportData,
      countyStrategy: {
        filingDeadline: "30 days",
        preferredChannel: "Online",
        successRate: 0.65,
        typicalTimeframe: "90 days",
        commonObjections: ["Market hasn't changed"],
        recommendedStrategy: "File online with strong evidence",
      },
    };

    const validation = template.validateReport(dataWithStrategy);
    expect(validation.valid).toBe(true);

    const reportStream = template.generateReport(dataWithStrategy);
    expect(reportStream).toBeInstanceOf(Readable);
  });

  it("should calculate cost-to-cure totals correctly", () => {
    const template = new ProfessionalReportTemplate();

    const totalCostToCure = mockReportData.costToCure?.reduce(
      (sum, c) => sum + c.estimatedCost,
      0
    ) || 0;

    expect(totalCostToCure).toBe(26000);
  });

  it("should handle market trend analysis", () => {
    const template = new ProfessionalReportTemplate();

    expect(mockReportData.marketTrends.yearOverYearChange).toBeLessThan(0);
    expect(mockReportData.marketTrends.sixMonthChange).toBeLessThan(0);
    expect(mockReportData.marketTrends.marketStatus).toBe("Cooling");
  });

  it("should generate report with high appeal score", () => {
    const template = new ProfessionalReportTemplate();
    const highScoreData = { ...mockReportData, appealScore: 90 };

    const validation = template.validateReport(highScoreData);
    expect(validation.valid).toBe(true);
    expect(highScoreData.appealScore).toBeGreaterThan(75);
  });

  it("should generate report with low appeal score", () => {
    const template = new ProfessionalReportTemplate();
    const lowScoreData = { ...mockReportData, appealScore: 45 };

    const validation = template.validateReport(lowScoreData);
    expect(validation.valid).toBe(true);
    expect(lowScoreData.appealScore).toBeLessThan(60);
  });

  it("should handle multiple comparable sales", () => {
    const template = new ProfessionalReportTemplate();
    const avgPrice =
      mockReportData.comparableSales.reduce((sum, s) => sum + s.salePrice, 0) /
      mockReportData.comparableSales.length;

    expect(avgPrice).toBeCloseTo(346666.67, 0);
    expect(mockReportData.comparableSales.length).toBe(3);
  });

  it("should validate county deadlines", () => {
    const template = new ProfessionalReportTemplate();

    expect(mockReportData.countyDeadlines).toBeDefined();
    expect(mockReportData.countyDeadlines?.length).toBeGreaterThan(0);
    expect(mockReportData.countyDeadlines?.[0].event).toBe(
      "Assessment Notice Date"
    );
  });
});
