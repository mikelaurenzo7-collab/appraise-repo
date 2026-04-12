import { describe, it, expect } from "vitest";

/**
 * Validate that API keys are configured and accessible
 * These are lightweight tests that verify credentials are set
 */

describe("API Keys Configuration", () => {
  it("has Lightbox API credentials configured", () => {
    expect(process.env.LIGHTBOX_API_KEY).toBeDefined();
    expect(process.env.LIGHTBOX_API_SECRET).toBeDefined();
    expect(process.env.LIGHTBOX_API_KEY?.length).toBeGreaterThan(40);
    expect(process.env.LIGHTBOX_API_SECRET?.length).toBeGreaterThan(40);
  });

  it("has RentCast API key configured", () => {
    expect(process.env.RENTCAST_API_KEY).toBeDefined();
    expect(process.env.RENTCAST_API_KEY).toHaveLength(32);
  });

  it("has ReGRID API key configured", () => {
    expect(process.env.REGRID_API_KEY).toBeDefined();
    expect(process.env.REGRID_API_KEY).toContain(".");
    // JWT token format check
    expect(process.env.REGRID_API_KEY?.split(".")).toHaveLength(3);
  });

  it("has AttomData API key configured (ATTOM_API_KEY)", () => {
    // Accept either the correct name or the legacy typo name
    const attomKey = process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY;
    expect(attomKey).toBeDefined();
    expect(attomKey?.length).toBeGreaterThan(20);
  });

  it("all property data APIs are available", () => {
    const apis = {
      lightbox: process.env.LIGHTBOX_API_KEY && process.env.LIGHTBOX_API_SECRET,
      rentcast: process.env.RENTCAST_API_KEY,
      regrid: process.env.REGRID_API_KEY,
      attom: process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY,
    };

    Object.entries(apis).forEach(([name, key]) => {
      expect(key, `${name} API key should be configured`).toBeDefined();
    });
  });
});
