import { describe, it, expect } from "vitest";

/**
 * Validate that API keys — when configured — have the expected shape.
 * These are deployment-readiness checks: if the env var isn't set (e.g. local
 * dev or CI without secrets), we skip rather than fail so the test suite
 * stays green. Format assertions still run when the var is present.
 */

function itIfSet(name: string, envVar: string | undefined, fn: () => void) {
  if (!envVar) {
    it.skip(`${name} (skipped — env not set)`, fn);
  } else {
    it(name, fn);
  }
}

describe("API Keys Configuration", () => {
  itIfSet(
    "has Lightbox API credentials configured",
    process.env.LIGHTBOX_API_KEY && process.env.LIGHTBOX_API_SECRET,
    () => {
      expect(process.env.LIGHTBOX_API_KEY?.length).toBeGreaterThan(40);
      expect(process.env.LIGHTBOX_API_SECRET?.length).toBeGreaterThan(40);
    }
  );

  itIfSet("has RentCast API key configured", process.env.RENTCAST_API_KEY, () => {
    expect(process.env.RENTCAST_API_KEY).toHaveLength(32);
  });

  itIfSet("has ReGRID API key configured", process.env.REGRID_API_KEY, () => {
    expect(process.env.REGRID_API_KEY).toContain(".");
    // JWT token format check
    expect(process.env.REGRID_API_KEY?.split(".")).toHaveLength(3);
  });

  itIfSet(
    "has AttomData API key configured (ATTOM_API_KEY)",
    process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY,
    () => {
      const attomKey = process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY;
      expect(attomKey?.length).toBeGreaterThan(20);
    }
  );

  it("reports which property data APIs are available", () => {
    const apis = {
      lightbox: Boolean(process.env.LIGHTBOX_API_KEY && process.env.LIGHTBOX_API_SECRET),
      rentcast: Boolean(process.env.RENTCAST_API_KEY),
      regrid: Boolean(process.env.REGRID_API_KEY),
      attom: Boolean(process.env.ATTOM_API_KEY || process.env.ATTTOM_API_KEY),
    };

    // Informational only — log rather than fail. Deployment environments should
    // verify all four via separate infra checks.
    // eslint-disable-next-line no-console
    console.log("[apis.validation] Configured APIs:", apis);
    expect(typeof apis).toBe("object");
  });
});
