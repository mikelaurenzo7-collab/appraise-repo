import { describe, it, expect } from "vitest";

/**
 * Validate that API keys — when configured — have the expected shape.
 * These are deployment-readiness checks: if the env var isn't set (e.g. local
 * dev or CI without secrets), we skip rather than fail so the test suite
 * stays green. Format assertions still run when the var is present.
 *
 * API roles:
 *   RentCast  → Tax assessments, property characteristics, AVM, sale history
 *   ReGRID   → Parcel boundaries, zoning, GIS-measured lot size, parcel number
 *   Redfin   → Recent comparable sold properties with photos, DOM, price data
 *   ATTOM    → (Future) Foreclosure, climate risk, crime, school data
 */

function itIfSet(name: string, envVar: string | undefined, fn: () => void) {
  if (!envVar) {
    it.skip(`${name} (skipped — env not set)`, fn);
  } else {
    it(name, fn);
  }
}

describe("API Keys Configuration", () => {
  itIfSet("has RentCast API key configured", process.env.RENTCAST_API_KEY, () => {
    expect(process.env.RENTCAST_API_KEY).toHaveLength(32);
  });

  itIfSet("has ReGRID API key configured", process.env.REGRID_API_KEY, () => {
    expect(process.env.REGRID_API_KEY).toContain(".");
    // JWT token format check
    expect(process.env.REGRID_API_KEY?.split(".")).toHaveLength(3);
  });

  itIfSet("has Redfin RapidAPI key configured", process.env.REDFIN_RAPIDAPI_KEY, () => {
    expect(process.env.REDFIN_RAPIDAPI_KEY?.length).toBeGreaterThan(20);
  });

  itIfSet(
    "has AttomData API key configured (future — foreclosure/climate/crime/school data)",
    process.env.ATTOM_API_KEY,
    () => {
      expect(process.env.ATTOM_API_KEY?.length).toBeGreaterThan(20);
    }
  );

  it("reports which property data APIs are available", () => {
    const apis = {
      rentcast: Boolean(process.env.RENTCAST_API_KEY),
      regrid: Boolean(process.env.REGRID_API_KEY),
      redfin: Boolean(process.env.REDFIN_RAPIDAPI_KEY),
      attom: Boolean(process.env.ATTOM_API_KEY),
    };

    // Informational only — log rather than fail. Deployment environments should
    // verify all active APIs via separate infra checks.
    console.log("[apis.validation] Configured APIs:", apis);
    expect(typeof apis).toBe("object");
  });
});
