import { describe, it, expect } from "vitest";
import { detectRecordErrors } from "./services/recordErrorDetector";

describe("recordErrorDetector", () => {
  it("returns no errors when records match", () => {
    const r = detectRecordErrors(
      { squareFeet: 2000, bedrooms: 3, bathrooms: 2, yearBuilt: 1990, lotSize: 7500 },
      { squareFeet: 2000, bedrooms: 3, bathrooms: 2, yearBuilt: 1990, lotSize: 7500 },
    );
    expect(r.hasErrors).toBe(false);
    expect(r.findings).toHaveLength(0);
    expect(r.errorStrength).toBe(0);
    expect(r.summaryLine).toContain("No material discrepancies");
  });

  it("flags material square footage overstatement (above tolerance, below major)", () => {
    // 2300 vs 2150 = 6.98% — above 3% tolerance, below 8% major threshold
    const r = detectRecordErrors(
      { squareFeet: 2300 },
      { squareFeet: 2150 },
    );
    expect(r.hasErrors).toBe(true);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].field).toBe("squareFeet");
    expect(r.findings[0].severity).toBe("material");
    expect(r.findings[0].factualClaim).toMatch(/2,300 sqft/);
    expect(r.findings[0].factualClaim).toMatch(/2,150 sqft/);
    expect(r.findings[0].factualClaim).toMatch(/overstatement/);
    expect(r.findings[0].recommendedEvidence).toMatch(/floor.plan|measurement/i);
  });

  it("flags major sqft discrepancy at higher severity (≥8%)", () => {
    // 2400 vs 2150 = 11.6% → major
    const r = detectRecordErrors(
      { squareFeet: 2400 },
      { squareFeet: 2150 },
    );
    expect(r.findings[0].severity).toBe("major");
    expect(r.errorStrength).toBeGreaterThanOrEqual(35);
  });

  it("flags bedroom mismatch as material", () => {
    const r = detectRecordErrors(
      { bedrooms: 4 },
      { bedrooms: 3 },
    );
    expect(r.hasErrors).toBe(true);
    expect(r.findings[0].field).toBe("bedrooms");
    expect(r.findings[0].severity).toBe("material");
    expect(r.findings[0].factualClaim).toContain("4 bedrooms");
    expect(r.findings[0].factualClaim).toContain("3 bedrooms");
  });

  it("ignores tiny square footage differences within tolerance", () => {
    const r = detectRecordErrors(
      { squareFeet: 2000 },
      { squareFeet: 2010 }, // 0.5% — within 3% tolerance
    );
    expect(r.hasErrors).toBe(false);
  });

  it("flags year-built discrepancies appropriately", () => {
    const major = detectRecordErrors(
      { yearBuilt: 1985 },
      { yearBuilt: 1995 },
    );
    expect(major.findings[0].severity).toBe("major");

    const material = detectRecordErrors(
      { yearBuilt: 1990 },
      { yearBuilt: 1993 },
    );
    expect(material.findings[0].severity).toBe("material");
  });

  it("aggregates multiple findings into a strength score", () => {
    const r = detectRecordErrors(
      { squareFeet: 2400, bedrooms: 4, yearBuilt: 1985 },
      { squareFeet: 2150, bedrooms: 3, yearBuilt: 1995 },
    );
    expect(r.findings.length).toBe(3);
    expect(r.significantCount).toBe(3);
    expect(r.errorStrength).toBeGreaterThan(50);
    expect(r.summaryLine).toMatch(/3 record discrepancies/);
  });

  it("handles missing fields gracefully", () => {
    const r = detectRecordErrors(
      { squareFeet: 2000, bedrooms: null, bathrooms: undefined },
      { squareFeet: 2000 },
    );
    expect(r.hasErrors).toBe(false);
  });
});
