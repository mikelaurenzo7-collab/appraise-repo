import { describe, it, expect } from "vitest";
import {
  getJurisdictionRules,
  calculateAppealViability,
  getFilingStrategy,
  jurisdictionRules,
} from "./data/jurisdictionRules";

// These tests lock in the resolution chain (exact county → state-level →
// national fallback) so regressions can't silently strand a user in a
// state we don't have data for.

describe("getJurisdictionRules — resolution chain", () => {
  it("returns the exact county rule when both state and county match", () => {
    const rule = getJurisdictionRules("TX", "Harris");
    expect(rule.state).toBe("TX");
    expect(rule.county).toBe("Harris");
    expect(rule.appealDeadlineDays).toBe(30);
  });

  it("matches county case-insensitively", () => {
    const lower = getJurisdictionRules("tx", "harris");
    const upper = getJurisdictionRules("TX", "HARRIS");
    expect(lower.county).toBe("Harris");
    expect(upper.county).toBe("Harris");
  });

  it("falls back to state-level rule when county is unknown but state is", () => {
    const rule = getJurisdictionRules("TX", "Wakanda");
    // Should be a TX rule, not a generic national fallback
    expect(rule.state).toBe("TX");
    // Should mark itself as a state-fallback in notes
    expect(rule.notes.toLowerCase()).toContain("fallback");
  });

  it("falls back to state-level rule when county omitted", () => {
    const rule = getJurisdictionRules("FL");
    expect(rule.state).toBe("FL");
    // Must be a real FL entry, not the national default
    expect(jurisdictionRules.FL.some((r) => r.county === rule.county)).toBe(true);
  });

  it("returns the national fallback for unknown states (never null)", () => {
    const rule = getJurisdictionRules("XX", "Nowhere");
    expect(rule).toBeTruthy();
    expect(rule.appealDeadlineDays).toBeGreaterThan(0);
    expect(rule.filingMethods.length).toBeGreaterThan(0);
    // National fallback notes mention verifying with county
    expect(rule.notes.toLowerCase()).toMatch(/verify|county|national/);
  });

  it("preserves the requested state code on the national fallback", () => {
    const rule = getJurisdictionRules("ZZ");
    expect(rule.state).toBe("ZZ");
  });

  it("never returns a null jurisdiction (regression guard)", () => {
    for (const state of ["TX", "CA", "XX", "us", "", "Foo"]) {
      const rule = getJurisdictionRules(state, "AnyCounty");
      expect(rule).not.toBeNull();
      expect(rule.appealDeadlineDays).toBeGreaterThan(0);
    }
  });
});

describe("calculateAppealViability", () => {
  it("scores a meaningful overassessment in a known jurisdiction", () => {
    const v = calculateAppealViability(500_000, 420_000, "TX", "Harris");
    // Significant gap (16%), strong jurisdiction → score should be high
    expect(v.score).toBeGreaterThan(60);
    expect(v.reasoning.some((r) => r.includes("Dollar difference"))).toBe(true);
    expect(v.reasoning.some((r) => r.includes("Percentage difference"))).toBe(true);
  });

  it("returns a non-zero score for unknown states (uses national fallback)", () => {
    // Pre-fix this used to return { score: 0, reasoning: ["Jurisdiction not found"] }
    const v = calculateAppealViability(500_000, 420_000, "XX");
    expect(v.score).toBeGreaterThan(0);
    expect(v.reasoning).not.toContain("Jurisdiction not found in database");
  });

  it("flags small overassessments as below threshold", () => {
    const v = calculateAppealViability(500_000, 498_000, "TX", "Harris");
    expect(v.reasoning.some((r) => r.includes("below minimum"))).toBe(true);
  });

  it("caps the score at 100", () => {
    const v = calculateAppealViability(1_000_000, 500_000, "TX", "Harris");
    expect(v.score).toBeLessThanOrEqual(100);
  });
});

describe("getFilingStrategy", () => {
  it("recommends pro_se in jurisdictions where POA is disallowed", () => {
    const strat = getFilingStrategy("CA", "Los Angeles", "residential", 1_000_000, 800_000);
    expect(strat.recommendedMethod).toBe("pro_se");
    expect(strat.reasoning.toLowerCase()).toContain("power of attorney not allowed");
  });

  it("recommends POA when contingency-fee allowed and savings are large", () => {
    const strat = getFilingStrategy("TX", "Harris", "residential", 500_000, 400_000);
    expect(strat.recommendedMethod).toBe("poa");
    expect(strat.estimatedFee).toBeGreaterThan(0);
  });

  it("falls back gracefully for unknown jurisdictions", () => {
    const strat = getFilingStrategy("XX", undefined, "residential", 500_000, 480_000);
    // National fallback allows POA, so we should get a real recommendation
    expect(["poa", "pro_se", "none"]).toContain(strat.recommendedMethod);
    expect(strat.recommendedMethod).not.toBe("none");
  });
});

describe("jurisdictionRules database — coverage smoke test", () => {
  it("includes all 21 expected states after the expansion wave", () => {
    const expected = [
      "TX", "CA", "NJ", "IL", "AZ", "FL", "NY", "OH", "PA", "MI",
      "GA", "NC", "WA", "MA", "CO", "VA", "MD", "MN", "NV", "OR",
      "CT", "MO", "TN", "IN", "WI", "SC",
    ];
    for (const state of expected) {
      expect(jurisdictionRules[state], `expected state: ${state}`).toBeTruthy();
      expect(jurisdictionRules[state].length).toBeGreaterThan(0);
    }
  });

  it("every county rule has a valid deadline + at least one filing method", () => {
    for (const [state, rules] of Object.entries(jurisdictionRules)) {
      for (const r of rules) {
        expect(r.state).toBe(state);
        expect(r.appealDeadlineDays).toBeGreaterThan(0);
        expect(r.filingMethods.length).toBeGreaterThan(0);
        expect(r.successRate).toBeGreaterThanOrEqual(0);
        expect(r.successRate).toBeLessThanOrEqual(100);
      }
    }
  });
});
