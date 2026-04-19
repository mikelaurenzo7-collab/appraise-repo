import { describe, it, expect } from "vitest";

/**
 * Validate that API keys are configured and accessible.
 *
 * These are deploy/CI validation checks, not unit tests. They only run when
 * VALIDATE_API_KEYS=1 is set — otherwise they're skipped so that local
 * developers and test environments without production secrets aren't blocked.
 */

const shouldValidate = process.env.VALIDATE_API_KEYS === "1";

describe.skipIf(!shouldValidate)("API Keys Configuration", () => {
  it("has Lightbox API credentials configured", () => {
    expect(process.env.LIGHTBOX_API_KEY, "LIGHTBOX_API_KEY must be set").toBeTruthy();
    expect(process.env.LIGHTBOX_API_SECRET, "LIGHTBOX_API_SECRET must be set").toBeTruthy();
  });

  it("has RentCast API key configured", () => {
    expect(process.env.RENTCAST_API_KEY, "RENTCAST_API_KEY must be set").toBeTruthy();
  });

  it("has ReGRID API key configured", () => {
    const key = process.env.REGRID_API_KEY;
    expect(key, "REGRID_API_KEY must be set").toBeTruthy();
    // ReGRID uses JWT-format tokens (three dot-delimited segments)
    expect(key?.split(".")).toHaveLength(3);
  });

  it("has AttomData API key configured (ATTOM_API_KEY)", () => {
    // Accept either the correct name or the legacy typo name
    const attomKey = process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY;
    expect(attomKey, "ATTOM_API_KEY (or legacy ATTTOM_API_KEY) must be set").toBeTruthy();
  });

  it("all property data APIs are available", () => {
    const apis = {
      lightbox: process.env.LIGHTBOX_API_KEY && process.env.LIGHTBOX_API_SECRET,
      rentcast: process.env.RENTCAST_API_KEY,
      regrid: process.env.REGRID_API_KEY,
      attom: process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY,
    };

    Object.entries(apis).forEach(([name, key]) => {
      expect(key, `${name} API key should be configured`).toBeTruthy();
    });
  });
});
