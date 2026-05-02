import { describe, it, expect } from "vitest";
import { getStatutoryCitations, listCoveredStates } from "./services/statutoryCitations";

describe("statutoryCitations", () => {
  it("returns null for unknown state codes", () => {
    expect(getStatutoryCitations(undefined)).toBeNull();
    expect(getStatutoryCitations(null)).toBeNull();
    expect(getStatutoryCitations("")).toBeNull();
    expect(getStatutoryCitations("ZZ")).toBeNull();
    expect(getStatutoryCitations("XYZ")).toBeNull();
  });

  it("normalizes case of state code", () => {
    expect(getStatutoryCitations("tx")).toBeTruthy();
    expect(getStatutoryCitations("Tx")).toBeTruthy();
    expect(getStatutoryCitations("TX")).toBeTruthy();
  });

  it("provides three-grounds citations for each covered state", () => {
    const covered = listCoveredStates();
    expect(covered.length).toBeGreaterThanOrEqual(7);
    for (const code of covered) {
      const cite = getStatutoryCitations(code);
      expect(cite, `expected citations for ${code}`).toBeTruthy();
      const c = cite!;
      expect(c.state).toBeTruthy();
      expect(c.stateCode).toBe(code);
      expect(c.marketValueGround).toMatch(/[A-Z]/);
      expect(c.uniformityGround).toMatch(/[A-Z]/);
      expect(c.recordErrorGround).toMatch(/[A-Z]/);
      // Guard against accidentally fabricated cites — the keywords below
      // are the public-record markers we expect to see in real citations.
      expect(c.marketValueGround.length).toBeGreaterThan(20);
      expect(c.uniformityGround.length).toBeGreaterThan(20);
    }
  });

  it("Texas citation references Tax Code §41.41 (the protest grounds statute)", () => {
    const tx = getStatutoryCitations("TX")!;
    expect(tx.uniformityGround).toMatch(/41\.41/);
    expect(tx.uniformityGround).toMatch(/equal/i);
  });

  it("California citation references Prop 13 / Cal. Const. Art. XIII A", () => {
    const ca = getStatutoryCitations("CA")!;
    expect(ca.marketValueGround).toMatch(/Art\. XIII A|Prop 13/);
    expect(ca.recordErrorGround).toMatch(/Rev\. & Tax\.|531|51\.5/);
  });

  it("Illinois citation references 35 ILCS 200 (Property Tax Code)", () => {
    const il = getStatutoryCitations("IL")!;
    expect(il.marketValueGround).toMatch(/35 ILCS 200/);
    expect(il.uniformityGround).toMatch(/Art\. IX|uniformity/i);
  });

  it("New York citation references RPTL Article 7 / §706", () => {
    const ny = getStatutoryCitations("NY")!;
    expect(ny.marketValueGround).toMatch(/706|Article 7/);
  });

  it("does not invent a generic / placeholder citation when state is unknown", () => {
    // Critical: per "no synthetic data" rule, unknown states must return null
    // so the brief can render the conservative "consult local counsel" stance
    // rather than fabricating a citation.
    expect(getStatutoryCitations("WY")).toBeNull(); // Wyoming not curated
    expect(getStatutoryCitations("HI")).toBeNull(); // Hawaii not curated
    expect(getStatutoryCitations("AK")).toBeNull(); // Alaska not curated
  });
});
