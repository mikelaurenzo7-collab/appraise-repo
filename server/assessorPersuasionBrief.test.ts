import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateAssessorPersuasionBrief,
  sanitizePersuasionText,
  type PersuasionBriefInput,
} from "./services/assessorPersuasionBrief";
import { analyzeUniformity } from "./services/uniformityAnalyzer";
import { detectRecordErrors } from "./services/recordErrorDetector";

// Force fallback path (no Claude key) for deterministic tests
vi.mock("./_core/claude", () => ({
  isClaudeAvailable: () => false,
  generateNarrativeWithClaude: vi.fn(async () => {
    throw new Error("not used in fallback path");
  }),
}));

function baseInput(overrides: Partial<PersuasionBriefInput> = {}): PersuasionBriefInput {
  const uniformity = analyzeUniformity(450_000, 380_000, []);
  const recordErrors = detectRecordErrors(
    { squareFeet: 2000 },
    { squareFeet: 2000 },
  );
  return {
    audience: "board",
    propertyAddress: "123 Main St, Springfield, IL 62701",
    parcelId: "13-14-118-042-0000",
    taxYear: 2026,
    jurisdiction: "Cook County, Illinois",
    currentAssessedValue: 450_000,
    requestedAssessedValue: 380_000,
    evidenceSupportedMarketValue: 380_000,
    effectiveTaxRate: 0.022,
    estimatedAnnualSavings: 1_540,
    comparableSummaries: [
      "456 Oak Ave: $370,000 (1,950 sqft, $190/sqft), sold 2025-08-15",
      "789 Pine Rd: $385,000 (1,980 sqft, $194/sqft), sold 2025-09-02",
      "111 Elm St: $390,000 (2,010 sqft, $194/sqft), sold 2025-09-30",
    ],
    uniformity,
    recordErrors,
    photoFindings: [],
    functionalObsolescence: [],
    ...overrides,
  };
}

describe("assessorPersuasionBrief", () => {
  describe("sanitizePersuasionText", () => {
    it("strips emotional / hardship language", () => {
      const cleaned = sanitizePersuasionText(
        "This is unfair. I can't afford this. My neighbor pays less.",
      );
      expect(cleaned).not.toMatch(/this is unfair/i);
      expect(cleaned).not.toMatch(/i can'?t afford/i);
      expect(cleaned).not.toMatch(/my neighbor pays less/i);
    });

    it("preserves evidence-grade language", () => {
      const text =
        "The subject is assessed at $450,000; the comparable evidence supports $380,000.";
      expect(sanitizePersuasionText(text)).toBe(text);
    });
  });

  describe("fallback brief generation", () => {
    it("produces a 60-second summary with the requested value", async () => {
      const brief = await generateAssessorPersuasionBrief(baseInput());
      expect(brief.source).toBe("fallback");
      expect(brief.sixtySecondSummary).toContain("$450,000");
      expect(brief.sixtySecondSummary).toContain("$380,000");
      expect(brief.sixtySecondSummary).toContain("Cook County");
      expect(brief.sixtySecondSummary).toContain("$1,540");
    });

    it("includes specific prayer for relief with parcel ID", async () => {
      const brief = await generateAssessorPersuasionBrief(baseInput());
      expect(brief.prayerForRelief).toContain("123 Main St");
      expect(brief.prayerForRelief).toContain("13-14-118-042-0000");
      expect(brief.prayerForRelief).toContain("$450,000");
      expect(brief.prayerForRelief).toContain("$380,000");
      expect(brief.prayerForRelief).toContain("2026");
    });

    it("ranks market value first when uniformity / record errors lack support", async () => {
      const brief = await generateAssessorPersuasionBrief(baseInput());
      expect(brief.rankedGrounds[0].ground).toBe("market_value");
      // Other grounds are present but at strength 0
      const others = brief.rankedGrounds.filter((g) => g.ground !== "market_value");
      others.forEach((g) => expect(g.strength).toBe(0));
    });

    it("promotes uniformity to first when its strength exceeds market value", async () => {
      const strongUniformity = analyzeUniformity(
        500_000,
        500_000,
        [
          { address: "A", salePrice: 400_000, saleDate: "2025-09-01", squareFeet: 1800, similarity: 0.9, source: "rentcast" },
          { address: "B", salePrice: 400_000, saleDate: "2025-09-01", squareFeet: 1800, similarity: 0.9, source: "rentcast" },
          { address: "C", salePrice: 400_000, saleDate: "2025-09-01", squareFeet: 1800, similarity: 0.9, source: "rentcast" },
        ],
        () => 280_000, // peer ratio 70%, subject ratio 100%
      );
      // Match-the-comp market value (no market-value ground)
      const brief = await generateAssessorPersuasionBrief(
        baseInput({
          currentAssessedValue: 500_000,
          requestedAssessedValue: 500_000,
          evidenceSupportedMarketValue: 500_000,
          uniformity: strongUniformity,
        }),
      );
      expect(brief.rankedGrounds[0].ground).toBe("uniformity");
      expect(brief.rankedGrounds[0].strength).toBeGreaterThan(50);
    });

    it("promotes record errors when they are the strongest ground", async () => {
      const recordErrors = detectRecordErrors(
        { squareFeet: 2400, bedrooms: 4, yearBuilt: 1985 },
        { squareFeet: 2150, bedrooms: 3, yearBuilt: 1995 },
      );
      // Make market value match assessed value so market-value ground is weakest
      const brief = await generateAssessorPersuasionBrief(
        baseInput({
          currentAssessedValue: 450_000,
          requestedAssessedValue: 450_000,
          evidenceSupportedMarketValue: 450_000,
          recordErrors,
        }),
      );
      expect(brief.rankedGrounds[0].ground).toBe("record_errors");
    });

    it("populates the exhibit index with appropriate exhibits", async () => {
      const brief = await generateAssessorPersuasionBrief(
        baseInput({
          photoFindings: ["Visible water staining on kitchen ceiling"],
          functionalObsolescence: ["Original 1965 single-pane windows"],
        }),
      );
      const tags = brief.exhibitIndex.map((e) => e.tag);
      expect(tags).toContain("Exhibit A"); // Comparables
      expect(brief.exhibitIndex.length).toBeGreaterThanOrEqual(3);
      expect(brief.exhibitIndex.some((e) => /Photographic/.test(e.title))).toBe(true);
      expect(brief.exhibitIndex.some((e) => /Functional Obsolescence/.test(e.title))).toBe(true);
    });

    it("formal brief has Subject Property, Requested Relief, and Conclusion sections", async () => {
      const brief = await generateAssessorPersuasionBrief(baseInput());
      expect(brief.formalBrief).toContain("## Subject Property");
      expect(brief.formalBrief).toContain("## Requested Relief");
      expect(brief.formalBrief).toContain("## Grounds for Appeal");
      expect(brief.formalBrief).toContain("## Conclusion");
      expect(brief.formalBrief).toContain("$450,000");
      expect(brief.formalBrief).toContain("$380,000");
    });

    it("never leaks emotional language even if the input contains it", async () => {
      const brief = await generateAssessorPersuasionBrief(
        baseInput({
          comparableSummaries: ["This is unfair, my neighbor pays less"],
        }),
      );
      expect(brief.formalBrief).not.toMatch(/\bunfair\b/i);
      expect(brief.formalBrief).not.toMatch(/my neighbor pays less/i);
    });

    it("supports each audience type", async () => {
      for (const audience of ["assessor", "board", "attorney", "owner"] as const) {
        const brief = await generateAssessorPersuasionBrief(baseInput({ audience }));
        expect(brief.audience).toBe(audience);
        expect(brief.sixtySecondSummary.length).toBeGreaterThan(0);
      }
    });

    it("omits fabricated savings figures when no real tax rate is available", async () => {
      const brief = await generateAssessorPersuasionBrief(
        baseInput({
          effectiveTaxRate: null,
          estimatedAnnualSavings: null,
        }),
      );
      // The summary must not insert a dollar savings figure
      expect(brief.sixtySecondSummary).not.toMatch(/\$1,540/);
      expect(brief.sixtySecondSummary).toMatch(/not available|not stated|cannot be computed|tax bill/i);
      // The formal brief must explicitly say the projection is omitted
      expect(brief.formalBrief).toMatch(/Not computed|not available|omits the projection/);
      // Prayer for relief must still produce a precise requested value
      expect(brief.prayerForRelief).toContain("$450,000");
      expect(brief.prayerForRelief).toContain("$380,000");
    });
  });
});
