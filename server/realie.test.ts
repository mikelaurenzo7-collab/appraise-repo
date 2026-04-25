/**
 * Realie API key validation test
 * Verifies the REALIE_API_KEY is valid by making a lightweight property search
 */
import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Realie API", () => {
  it("should return property data with a valid API key", async () => {
    const apiKey = process.env.REALIE_API_KEY;
    expect(apiKey, "REALIE_API_KEY must be set").toBeTruthy();

    const response = await axios.get("https://app.realie.ai/api/public/property/search/", {
      params: {
        address: "25W050 Setauket",
        city: "Naperville",
        state: "IL",
        limit: 1,
      },
      headers: { Authorization: apiKey },
      timeout: 15000,
    });

    expect(response.status).toBe(200);
    const properties = response.data?.properties;
    expect(Array.isArray(properties), "properties should be an array").toBe(true);
    expect(properties.length, "should return at least one property").toBeGreaterThan(0);

    const p = properties[0];
    console.log("[Realie Test] Property found:", {
      parcelId: p.parcelId,
      county: p.county,
      assessedValue: p.totalAssessedValue,
      taxValue: p.taxValue,
      yearBuilt: p.yearBuilt,
      bedrooms: p.totalBedrooms,
      bathrooms: p.totalBathrooms,
      buildingArea: p.buildingArea,
      acres: p.acres,
      zoning: p.zoningCode,
      modelValue: p.modelValue,
    });

    expect(p.parcelId || p.county, "should have parcel ID or county").toBeTruthy();
  }, 20000);
});
