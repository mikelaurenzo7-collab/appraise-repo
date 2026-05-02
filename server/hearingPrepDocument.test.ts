import { describe, it, expect, vi } from "vitest";
import {
  generateHearingPrepDocument,
  type HearingPrepInput,
} from "./services/hearingPrepDocument";
import { analyzeUniformity } from "./services/uniformityAnalyzer";
import { detectRecordErrors } from "./services/recordErrorDetector";

vi.mock("./_core/claude", () => ({
  isClaudeAvailable: () => false,
  generateNarrativeWithClaude: vi.fn(async () => {
    throw new Error("not used in fallback path");
  }),
}));

function baseInput(overrides: Partial<HearingPrepInput> = {}): HearingPrepInput {
  return {
    propertyAddress: "123 Main St, Springfield, IL 62701",
    parcelId: "13-14-118-042-0000",
    taxYear: 2026,
    jurisdiction: "Cook County, Illinois",
    hearingBody: "Cook County Board of Review",
    hearingFormat: "in-person",
    currentAssessedValue: 450_000,
    requestedAssessedValue: 380_000,
    evidenceSupportedMarketValue: 380_000,
    comparableSummaries: [
      {
        address: "456 Oak Ave",
        adjustedPrice: 372_000,
        saleDate: "2025-08-15",
        keyAttribute: "1,950 sqft, 0.4 mi away, arms-length",
      },
      {
        address: "789 Pine Rd",
        adjustedPrice: 385_000,
        saleDate: "2025-09-02",
        keyAttribute: "1,980 sqft, 0.7 mi away, arms-length",
      },
      {
        address: "111 Elm St",
        adjustedPrice: 388_000,
        saleDate: "2025-09-30",
        keyAttribute: "2,010 sqft, 0.9 mi away, arms-length",
      },
    ],
    uniformity: analyzeUniformity(450_000, 380_000, []),
    recordErrors: detectRecordErrors(
      { squareFeet: 2400 },
      { squareFeet: 2150 },
    ),
    photoFindings: ["Visible water staining on kitchen ceiling"],
    functionalObsolescence: [],
    ...overrides,
  };
}

describe("hearingPrepDocument (fallback path)", () => {
  it("produces opening, closing, talking points, anticipated Q&A, comp walkthrough, checklist", async () => {
    const doc = await generateHearingPrepDocument(baseInput());
    expect(doc.source).toBe("fallback");
    expect(doc.openingStatement).toContain("$450,000");
    expect(doc.openingStatement).toContain("$380,000");
    expect(doc.openingStatement).toContain("123 Main St");
    expect(doc.closingStatement).toContain("$450,000");
    expect(doc.closingStatement).toContain("$380,000");
    expect(doc.closingStatement).toContain("2026");
    expect(doc.groundsTalkingPoints.length).toBeGreaterThanOrEqual(2); // market_value + record_errors
    expect(doc.groundsTalkingPoints[0].ground).toBe("market_value");
    expect(doc.anticipatedQuestions.length).toBeGreaterThanOrEqual(4);
    expect(doc.comparableWalkthrough.length).toBe(3);
    expect(doc.recordErrorWalkthrough.length).toBeGreaterThan(0);
    expect(doc.preHearingChecklist.length).toBeGreaterThanOrEqual(6);
  });

  it("includes uniformity ground and Q when uniformity has a real claim", async () => {
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
    const doc = await generateHearingPrepDocument(
      baseInput({
        currentAssessedValue: 500_000,
        requestedAssessedValue: 500_000,
        evidenceSupportedMarketValue: 500_000,
        uniformity: strongUniformity,
      }),
    );
    expect(doc.groundsTalkingPoints.some((g) => g.ground === "uniformity")).toBe(true);
    expect(doc.anticipatedQuestions.some((q) => q.category === "uniformity")).toBe(true);
    expect(doc.openingStatement).toContain("uniformity");
  });

  it("omits record-errors ground when no errors are present", async () => {
    const doc = await generateHearingPrepDocument(
      baseInput({
        recordErrors: detectRecordErrors({ squareFeet: 2000 }, { squareFeet: 2000 }),
      }),
    );
    expect(doc.groundsTalkingPoints.some((g) => g.ground === "record_errors")).toBe(false);
    expect(doc.recordErrorWalkthrough.length).toBe(0);
  });

  it("never includes emotional / hardship language in any field", async () => {
    const doc = await generateHearingPrepDocument(baseInput());
    const allText = [
      doc.openingStatement,
      doc.closingStatement,
      ...doc.groundsTalkingPoints.flatMap((g) => [g.headline, ...g.bullets]),
      ...doc.anticipatedQuestions.flatMap((q) => [q.question, q.response]),
      ...doc.comparableWalkthrough.map((c) => c.line),
      ...doc.recordErrorWalkthrough,
      ...doc.preHearingChecklist,
    ].join(" ");
    expect(allText).not.toMatch(/\bunfair\b/i);
    expect(allText).not.toMatch(/can'?t afford/i);
    expect(allText).not.toMatch(/my neighbor pays less/i);
    expect(allText).not.toMatch(/please have mercy/i);
  });

  it("opening + closing both specify a precise requested value", async () => {
    const doc = await generateHearingPrepDocument(baseInput());
    expect(doc.openingStatement).toMatch(/\$380,000/);
    expect(doc.closingStatement).toMatch(/\$380,000/);
  });

  it("anticipated questions cover comp admissibility, valuation method, and a precise-value ask", async () => {
    const doc = await generateHearingPrepDocument(baseInput());
    const cats = new Set(doc.anticipatedQuestions.map((q) => q.category));
    expect(cats.has("comp_admissibility")).toBe(true);
    expect(cats.has("valuation_method")).toBe(true);
    expect(cats.has("general")).toBe(true); // "what specific assessed value are you requesting"
  });

  it("pre-hearing checklist contains practical, hearing-day-specific items", async () => {
    const doc = await generateHearingPrepDocument(baseInput());
    const list = doc.preHearingChecklist.join(" ").toLowerCase();
    expect(list).toMatch(/print|copies|packet/);
    expect(list).toMatch(/arrive|early|time/);
    expect(list).toMatch(/closing|rebut|interrupt/);
  });
});
