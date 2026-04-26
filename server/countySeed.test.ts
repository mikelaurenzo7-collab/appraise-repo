import { describe, expect, it } from "vitest";
import { COUNTY_SEED } from "./routers/admin";

/**
 * Config-correctness: every seeded county that routes via mail must have
 * a complete mailing address, otherwise the dispatcher will silently fall
 * through to "unsupported" and the user gets charged with no delivery.
 * Adding a new county without an address should fail this test on CI
 * before it ever ships.
 */
describe("county seed / channel routing", () => {
  const requiresMailingAddress = (c: any) =>
    c.preferredChannel === "mail_certified" ||
    c.preferredChannel === "mail_first_class" ||
    c.fallbackChannel === "mail_certified" ||
    c.fallbackChannel === "mail_first_class";

  it("every mail-routed county has a complete mailing address", () => {
    const offenders = COUNTY_SEED.filter(requiresMailingAddress).filter(
      (c: any) =>
        !c.mailingAddressLine1 ||
        !c.mailingAddressCity ||
        !c.mailingAddressState ||
        !c.mailingAddressZip ||
        !c.mailingAddressName
    );
    expect(
      offenders.map((c: any) => `${c.state} / ${c.countyName}`)
    ).toEqual([]);
  });

  it("every county except explicitly unsupported has a preferredChannel", () => {
    const offenders = COUNTY_SEED.filter(
      (c: any) => !c.preferredChannel
    );
    expect(
      offenders.map((c: any) => `${c.state} / ${c.countyName}`)
    ).toEqual([]);
  });

  it("Fairfield CT is explicitly marked unsupported (CT has no county assessor)", () => {
    const ct = COUNTY_SEED.find(
      (c: any) => c.state === "CT" && c.countyName === "Fairfield County"
    );
    expect(ct).toBeDefined();
    expect((ct as any).preferredChannel).toBe("unsupported");
  });

  it("mail-channel counties have a filing window set", () => {
    const mailCounties = COUNTY_SEED.filter(requiresMailingAddress);
    const missingWindow = mailCounties.filter(
      (c: any) => !c.filingWindowStart || !c.filingWindowEnd
    );
    expect(
      missingWindow.map((c: any) => `${c.state} / ${c.countyName}`)
    ).toEqual([]);
  });

  it("ships with at least 10 mail-ready counties", () => {
    const mailReady = COUNTY_SEED.filter(
      (c: any) =>
        (c.preferredChannel === "mail_certified" ||
          c.preferredChannel === "portal") &&
        c.mailingAddressLine1
    );
    expect(mailReady.length).toBeGreaterThanOrEqual(10);
  });
});
