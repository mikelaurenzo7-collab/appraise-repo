/**
 * Regression test for the assessor-vs-owner PDF audience split.
 *
 * Renders the actual generateAppraisalPDF() against a synthetic fixture
 * in BOTH audience modes, captures the rendered PDF bytes via a mocked
 * storagePut, extracts text via pdf-parse, and asserts on real content.
 *
 * Locks in the non-negotiable invariant: the assessor exhibit must NEVER
 * contain owner-facing content — appeal-strength score, "Estimated Annual
 * Tax Savings", "Over-Assessment" advocacy framing, the Tax Impact
 * Analysis section, etc. The owner gets the full version; the assessor
 * exhibit is clinical.
 *
 * This test only runs in environments where pdf-parse is installable.
 * Skips cleanly otherwise so CI without that dep still passes.
 */

import { describe, expect, it, vi, beforeAll } from "vitest";

// Capture PDF bytes routed to "S3" by the generator. The mock has to be
// set up via vi.mock at module-load time so the generator picks it up.
const captures: { mode: string; buffer: Buffer }[] = [];

vi.mock("./storage", () => ({
  storagePut: vi.fn(async (key: string, data: Buffer) => {
    // Tag each upload by inferring the mode from the most recent push.
    captures.push({ mode: captures.length === 0 ? "first" : "second", buffer: data });
    return { url: `mock://s3/${key}`, key };
  }),
}));

let pdfParse: ((buf: Buffer) => Promise<{ text: string; numpages: number }>) | null = null;

beforeAll(async () => {
  try {
    const mod = (await import("pdf-parse")) as unknown as {
      default: (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    };
    pdfParse = mod.default;
  } catch {
    pdfParse = null;
  }
});

const FIXTURE = {
  submissionId: 99999,
  address: "123 Smoke Test Ave",
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  county: "Travis",
  propertyType: "residential",
  ownerName: "Test Owner",
  ownerEmail: "test@example.com",
  assessedValue: 500_000,
  marketValueEstimate: 425_000,
  assessmentGap: 75_000,
  potentialSavings: 1_800,
  appealStrengthScore: 78,
  executiveSummary:
    "Property assessed at $500,000 but comparable evidence supports a market value of approximately $425,000.",
  valuationJustification:
    "Sales-comparison approach weighted at 80%. Comp band IQR $200-$240 / sqft.",
  recommendedApproach: "sales comparison approach",
  filingMethod: "automated_standard",
  appealDeadline: "2026-05-31",
  comparableSales: [
    { address: "111 Test Ln", salePrice: 415_000, saleDate: "2025-12-01", squareFeet: 2_050, similarity: 0.9 },
    { address: "222 Test Ln", salePrice: 430_000, saleDate: "2025-11-15", squareFeet: 2_100, similarity: 0.85 },
    { address: "333 Test Ln", salePrice: 422_000, saleDate: "2025-10-01", squareFeet: 2_075, similarity: 0.88 },
  ],
  squareFeet: 2_080,
  yearBuilt: 1_995,
  bedrooms: 3,
  bathrooms: 2,
  lotSize: 7_200,
  reportDate: "April 30, 2026",
  reportType: "instant",
  tier: "automated_standard",
} as const;

describe("PDF audience split (assessor vs owner)", () => {
  let assessorBuf: Buffer | undefined;
  let ownerBuf: Buffer | undefined;

  it("renders both modes successfully with the storage upload mocked", async () => {
    const { generateAppraisalPDF } = await import("./services/pdfGenerator");

    captures.length = 0;
    await generateAppraisalPDF({ ...FIXTURE, reportAudience: "assessor" });
    await generateAppraisalPDF({ ...FIXTURE, reportAudience: "owner" });

    expect(captures.length).toBe(2);
    [assessorBuf, ownerBuf] = [captures[0]!.buffer, captures[1]!.buffer];

    // Both PDFs must be non-trivially sized (>10KB indicates real rendering).
    expect(assessorBuf.length).toBeGreaterThan(10_000);
    expect(ownerBuf.length).toBeGreaterThan(10_000);
  });

  it("owner PDF is larger than assessor PDF (extra Tax Impact section)", () => {
    if (!assessorBuf || !ownerBuf) return; // first test failed, propagated
    expect(ownerBuf.length).toBeGreaterThan(assessorBuf.length);
  });

  it("assessor PDF NEVER contains owner-only sections", async () => {
    if (!pdfParse || !assessorBuf) {
      // Skip when pdf-parse is unavailable in this environment.
      return;
    }
    const text = (await pdfParse(assessorBuf)).text.toLowerCase();
    const banned = [
      "tax impact analysis",
      "estimated annual tax savings",
      "appeal strength score",
      "potential 10-year savings",
      "year-by-year tax savings projection",
      "over-assessment amount", // advocacy framing replaced with "indicated reduction"
      "over-assessment percentage",
      "over-assessment:", // value-comparison callout label (advocacy framing)
    ];
    for (const phrase of banned) {
      expect(text, `assessor PDF leaked owner-only phrase: "${phrase}"`).not.toContain(phrase);
    }
  });

  it("owner PDF DOES contain the owner-facing sections", async () => {
    if (!pdfParse || !ownerBuf) return;
    const text = (await pdfParse(ownerBuf)).text.toLowerCase();
    const required = [
      "tax impact analysis",
      "estimated annual tax savings",
      "appeal strength score",
      "potential 10-year savings",
      "over-assessment amount",
    ];
    for (const phrase of required) {
      expect(text, `owner PDF missing required phrase: "${phrase}"`).toContain(phrase);
    }
  });

  it("assessor PDF uses neutral 'Indicated Reduction' phrasing", async () => {
    if (!pdfParse || !assessorBuf) return;
    const text = (await pdfParse(assessorBuf)).text.toLowerCase();
    expect(text).toContain("indicated reduction");
  });

  it("both PDFs contain the core appraisal sections", async () => {
    if (!pdfParse || !assessorBuf || !ownerBuf) return;
    const assessorText = (await pdfParse(assessorBuf)).text.toLowerCase();
    const ownerText = (await pdfParse(ownerBuf)).text.toLowerCase();
    const core = [
      "comparable",
      "market value",
      "executive summary",
      FIXTURE.address.toLowerCase(),
    ];
    for (const phrase of core) {
      expect(assessorText, `assessor PDF missing core: "${phrase}"`).toContain(phrase);
      expect(ownerText, `owner PDF missing core: "${phrase}"`).toContain(phrase);
    }
  });
});
