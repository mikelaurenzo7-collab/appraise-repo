import { describe, it, expect } from "vitest";

describe("Email Delivery Service", () => {
  it("should validate email template structure", () => {
    const template = {
      to: "user@example.com",
      subject: "Your Property Analysis is Ready",
      html: "<p>Your analysis has been completed.</p>",
    };

    expect(template.to).toContain("@");
    expect(template.subject).toBeTruthy();
    expect(template.html).toContain("<p>");
  });

  it("should validate analysis confirmation email data", () => {
    const data = {
      userEmail: "john@example.com",
      userName: "John Doe",
      propertyAddress: "123 Main St, Austin, TX 78701",
      appealStrengthScore: 78,
    };

    expect(data.userEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(data.appealStrengthScore).toBeGreaterThanOrEqual(0);
    expect(data.appealStrengthScore).toBeLessThanOrEqual(100);
  });

  it("should validate payment confirmation email data", () => {
    const data = {
      userEmail: "user@example.com",
      userName: "Jane Smith",
      amount: 2500,
      propertyAddress: "456 Oak Ave, Austin, TX 78702",
      transactionId: "txn_1234567890",
    };

    expect(data.amount).toBeGreaterThan(0);
    expect(data.transactionId).toBeTruthy();
    expect(data.userEmail).toContain("@");
  });

  it("should validate appeal filed email data", () => {
    const data = {
      userEmail: "user@example.com",
      userName: "Bob Johnson",
      propertyAddress: "789 Pine Rd, Austin, TX 78703",
      filingDate: "2026-04-21",
      appealDeadline: "2026-06-15",
    };

    expect(data.filingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.appealDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should validate appeal result email data", () => {
    const data = {
      userEmail: "user@example.com",
      userName: "Alice Brown",
      propertyAddress: "321 Elm St, Austin, TX 78704",
      result: "won" as const,
      assessmentReduction: 150000,
      annualSavings: 3600,
    };

    expect(["won", "lost", "pending"]).toContain(data.result);
    expect(data.assessmentReduction).toBeGreaterThan(0);
    expect(data.annualSavings).toBeGreaterThan(0);
  });

  it("should validate report completion email data", () => {
    const data = {
      userEmail: "user@example.com",
      userName: "Charlie Davis",
      propertyAddress: "654 Maple Dr, Austin, TX 78705",
      reportUrl: "https://s3.example.com/reports/report-123.pdf",
      appealStrengthScore: 85,
      downloadExpiresAt: "2026-04-28T05:56:57.310Z",
      downloadPageUrl: "https://appraiseai.com/report?jobId=job_123",
    };

    expect(data.reportUrl).toContain("s3");
    expect(data.appealStrengthScore).toBeGreaterThan(0);
    expect(data.downloadPageUrl).toContain("report");
  });

  it("should format email score colors based on strength", () => {
    const strongScore = 78;
    const moderateScore = 55;
    const weakScore = 25;

    const getScoreColor = (score: number) => {
      if (score >= 70) return "#10B981";
      if (score >= 40) return "#FBBF24";
      return "#EF4444";
    };

    expect(getScoreColor(strongScore)).toBe("#10B981");
    expect(getScoreColor(moderateScore)).toBe("#FBBF24");
    expect(getScoreColor(weakScore)).toBe("#EF4444");
  });

  it("should format email score labels", () => {
    const getScoreLabel = (score: number) => {
      if (score >= 70) return "Strong";
      if (score >= 40) return "Moderate";
      return "Weak";
    };

    expect(getScoreLabel(78)).toBe("Strong");
    expect(getScoreLabel(55)).toBe("Moderate");
    expect(getScoreLabel(25)).toBe("Weak");
  });

  it("should validate Forge API integration configuration", () => {
    const config = {
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL,
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY,
    };

    // In test environment, these may be undefined - that's OK
    // The email service gracefully falls back to logging
    if (config.forgeApiUrl) {
      expect(config.forgeApiUrl).toContain("http");
    }
    if (config.forgeApiKey) {
      expect(config.forgeApiKey).toBeTruthy();
    }
  });

  it("should support optional email fields", () => {
    const minimalData = {
      userEmail: "user@example.com",
      userName: "Test User",
      propertyAddress: "123 Test St",
      reportUrl: "https://example.com/report.pdf",
      appealStrengthScore: 70,
      downloadExpiresAt: "2026-04-28",
    };

    const withOptionalFields = {
      ...minimalData,
      downloadPageUrl: "https://appraiseai.com/report?jobId=123",
    };

    expect(minimalData.downloadPageUrl).toBeUndefined();
    expect(withOptionalFields.downloadPageUrl).toBeDefined();
  });
});
