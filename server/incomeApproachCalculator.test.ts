import { describe, it, expect } from "vitest";
import {
  calculateIncomeApproach,
  deriveMarketRent,
  computeVacancyRate,
} from "./services/incomeApproachCalculator";
import type { PropertyData } from "./services/propertyDataAggregator";

const baseData: Partial<PropertyData> = {
  marketRent: 2000,
  assessedValue: 400000,
};

describe("incomeApproachCalculator", () => {
  it("returns null when no rental data available", () => {
    const result = calculateIncomeApproach({}, "residential");
    expect(result).toBeNull();
  });

  it("derives market rent from marketRent field", () => {
    expect(deriveMarketRent({ marketRent: 2500 })).toBe(2500);
  });

  it("derives market rent from rentalComps median", () => {
    const data: Partial<PropertyData> = {
      rentalComps: [
        { address: "A", monthlyRent: 2000, bedrooms: 3, bathrooms: 2, squareFeet: 1500, source: "rentcast" },
        { address: "B", monthlyRent: 2400, bedrooms: 3, bathrooms: 2, squareFeet: 1500, source: "rentcast" },
        { address: "C", monthlyRent: 2200, bedrooms: 3, bathrooms: 2, squareFeet: 1500, source: "rentcast" },
      ],
    };
    expect(deriveMarketRent(data)).toBe(2200);
  });

  it("computes vacancy rate by property type", () => {
    expect(computeVacancyRate("residential")).toBe(0.05);
    expect(computeVacancyRate("multi_family")).toBe(0.08);
    expect(computeVacancyRate("commercial")).toBe(0.08);
    expect(computeVacancyRate("industrial")).toBe(0.10);
  });

  it("calculates full income approach for rental property", () => {
    const result = calculateIncomeApproach(baseData as PropertyData, "rental_property");
    expect(result).not.toBeNull();
    expect(result!.marketRentPerUnit).toBe(2000);
    expect(result!.totalUnits).toBe(1);
    expect(result!.grossPotentialIncome).toBe(24000);
    expect(result!.vacancyRate).toBe(0.05);
    expect(result!.netOperatingIncome).toBeGreaterThan(0);
    expect(result!.incomeValue).toBeGreaterThan(0);
  });

  it("produces reasonable income value", () => {
    const result = calculateIncomeApproach(baseData as PropertyData, "rental_property");
    expect(result!.incomeValue).toBeGreaterThan(100000);
  });
});
