import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { County } from "../drizzle/schema";
import { sendLobLetter, getLobLetterStatus } from "./services/lobDelivery";
import { sendAppealEmail, buildAppealEmailBody } from "./services/emailDelivery";

const mockGetSubmission = vi.fn(async () => null as any);
const mockGetAnalysis = vi.fn(async () => null as any);
const mockGetReportJob = vi.fn(async () => null as any);
const mockGetCountyById = vi.fn(async () => null as any);
const mockGetActiveRecipe = vi.fn(async () => null as any);

vi.mock("./db", () => ({
  getPropertySubmissionById: () => mockGetSubmission(),
  getPropertyAnalysisBySubmissionId: () => mockGetAnalysis(),
  getReportJobBySubmissionId: () => mockGetReportJob(),
  getCountyById: () => mockGetCountyById(),
  getActiveRecipeForCounty: () => mockGetActiveRecipe(),
}));

vi.mock("./storage", () => ({
  storageGet: vi.fn(async () => ({ url: "https://example.test/report.pdf" })),
  storagePut: vi.fn(async () => ({ key: "stub-key", url: "https://example.test/x" })),
}));

// Stub fetch so the mock PDF "download" returns a buffer deterministically.
const originalFetch = global.fetch;
beforeEach(() => {
  process.env.LOB_STUB = "1";
  process.env.EMAIL_DELIVERY_STUB = "1";
  (global as any).fetch = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
  }));
});

afterEach(() => {
  global.fetch = originalFetch;
});

function makeCounty(overrides: Partial<County> = {}): County {
  return {
    id: 1,
    state: "TX",
    countyName: "Travis County",
    countyCode: "48453",
    poaDeadlineDays: 30,
    proSeDeadlineDays: 30,
    hasOnlinePortal: true,
    portalUrl: "https://example.test",
    acceptsEmail: false,
    acceptsMail: true,
    acceptsInPerson: false,
    poaEligible: true,
    onlinePortalOnly: true,
    pinOnlyLogin: true,
    filingWindowStart: null,
    filingWindowEnd: null,
    preferredChannel: "portal",
    fallbackChannel: "mail_certified",
    mailingAddressName: "Travis CAD",
    mailingAddressLine1: "850 E Anderson Ln",
    mailingAddressLine2: null,
    mailingAddressCity: "Austin",
    mailingAddressState: "TX",
    mailingAddressZip: "78752",
    intakeEmail: null,
    assessorName: null,
    assessorPhone: null,
    assessorEmail: null,
    arbName: null,
    arbPhone: null,
    arbEmail: null,
    filingFee: null,
    hearingFee: null,
    hearingFormat: null,
    hearingScheduleDays: null,
    requiresAttorney: false,
    formTemplateUrl: null,
    formTemplateName: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as County;
}

describe("resolveChannel", () => {
  it("returns portal when preferred=portal and recipe is verified", async () => {
    mockGetActiveRecipe.mockResolvedValueOnce({
      id: 1,
      verificationStatus: "verified",
      steps: "[]",
      portalUrl: "https://example.test",
      version: 1,
      countyId: 1,
    });
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({ preferredChannel: "portal" });
    expect(await resolveChannel(c)).toBe("portal");
  });

  it("falls back to mail_certified when portal has only a draft recipe", async () => {
    mockGetActiveRecipe.mockResolvedValueOnce({
      id: 1,
      verificationStatus: "draft",
      steps: "[]",
      portalUrl: "https://example.test",
      version: 1,
      countyId: 1,
    });
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({ preferredChannel: "portal", fallbackChannel: "mail_certified" });
    expect(await resolveChannel(c)).toBe("mail_certified");
  });

  it("returns mail_first_class when preferred and mailing address present", async () => {
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({ preferredChannel: "mail_first_class", fallbackChannel: "mail_certified" });
    expect(await resolveChannel(c)).toBe("mail_first_class");
  });

  it("returns email when preferred and intakeEmail is present", async () => {
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({
      preferredChannel: "email",
      intakeEmail: "appeals@example.gov",
      fallbackChannel: "mail_certified",
    });
    expect(await resolveChannel(c)).toBe("email");
  });

  it("falls back from email to mail when intakeEmail is missing", async () => {
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({
      preferredChannel: "email",
      intakeEmail: null,
      fallbackChannel: "mail_certified",
    });
    expect(await resolveChannel(c)).toBe("mail_certified");
  });

  it("returns unsupported when nothing is configured", async () => {
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({
      preferredChannel: "unsupported",
      fallbackChannel: "unsupported",
    });
    expect(await resolveChannel(c)).toBe("unsupported");
  });

  it("falls back to unsupported when mail preferred but no address", async () => {
    const { resolveChannel } = await import("./services/deliveryDispatcher");
    const c = makeCounty({
      preferredChannel: "mail_certified",
      fallbackChannel: "mail_certified",
      mailingAddressLine1: null,
      mailingAddressCity: null,
    });
    expect(await resolveChannel(c)).toBe("unsupported");
  });
});

describe("lobDelivery stub", () => {
  it("returns a deterministic letterId for the same PDF + address", async () => {
    const params = {
      toAddress: {
        name: "Travis CAD",
        addressLine1: "850 E Anderson Ln",
        city: "Austin",
        state: "TX",
        zip: "78752",
      },
      fromAddress: {
        name: "Jane Owner",
        addressLine1: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      pdfBuffer: Buffer.from("PDFDATA"),
      description: "Test",
      serviceLevel: "certified_return_receipt" as const,
    };
    const r1 = await sendLobLetter(params);
    const r2 = await sendLobLetter(params);
    expect(r1.letterId).toEqual(r2.letterId);
    expect(r1.letterId).toMatch(/^ltr_stub_/);
    expect(r1.trackingNumber).toMatch(/^9407/);
    expect(r1.expectedDeliveryDate).toBeInstanceOf(Date);
  });

  it("returns status info from stubbed tracking", async () => {
    const status = await getLobLetterStatus("ltr_stub_abc");
    expect(status?.status).toBe("in_transit");
  });
});

describe("emailDelivery stub", () => {
  it("returns a stubbed message id when credentials missing", async () => {
    const result = await sendAppealEmail({
      toEmail: "appeals@county.gov",
      subject: "test",
      bodyText: "body",
      pdfBuffer: Buffer.from("PDF"),
      pdfFilename: "x.pdf",
    });
    expect(result.stubbed).toBe(true);
    expect(result.messageId).toContain("@appraiseai.local");
  });

  it("buildAppealEmailBody produces a professional subject + body", () => {
    const { subject, bodyText } = buildAppealEmailBody({
      ownerName: "Jane Owner",
      ownerEmail: "jane@example.com",
      propertyAddress: "123 Main St, Austin TX",
      countyName: "Travis",
      opinionOfValueCents: 599_000 * 100,
    });
    expect(subject).toContain("Property Tax Appeal");
    expect(subject).toContain("123 Main St");
    expect(bodyText).toContain("Jane Owner");
    expect(bodyText).toContain("jane@example.com");
    expect(bodyText).toContain("$599,000");
    expect(bodyText).toContain("pro se");
    expect(bodyText).toContain("not my legal representative");
  });
});

describe("dispatchFiling — mail_certified happy path", () => {
  beforeEach(() => {
    mockGetCountyById.mockReset();
    mockGetSubmission.mockReset();
    mockGetAnalysis.mockReset();
    mockGetReportJob.mockReset();
    mockGetCountyById.mockResolvedValue(
      makeCounty({
        preferredChannel: "mail_certified",
        fallbackChannel: "mail_certified",
      })
    );
    mockGetSubmission.mockResolvedValue({
      id: 77,
      email: "owner@example.com",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      phone: null,
      assessedValue: 500000,
      marketValue: null,
      propertyType: "residential",
      appealStrengthScore: 70,
    });
    mockGetAnalysis.mockResolvedValue({ marketValueEstimate: 420000 });
    mockGetReportJob.mockResolvedValue({ reportKey: "reports/77/report.pdf" });
  });

  it("dispatches a mail_certified filing with Lob stub and returns tracking", async () => {
    const { dispatchFiling } = await import("./services/deliveryDispatcher");
    const result = await dispatchFiling({
      job: {
        id: 5,
        submissionId: 77,
        userId: 1,
        recipeId: null,
        authorizationId: 1,
      } as any,
      countyId: 1,
      perRunInputs: { accountNumber: "R000123456", taxpayerPin: "PIN-X" },
    });
    expect(result.success).toBe(true);
    expect(result.channelUsed).toBe("mail_certified");
    expect(result.mailTrackingNumber).toMatch(/^9407/);
    expect(result.lobLetterId).toMatch(/^ltr_stub_/);
    expect(result.lobExpectedDeliveryDate).toBeInstanceOf(Date);
  });

  it("dispatches email when county.preferredChannel=email", async () => {
    mockGetCountyById.mockResolvedValueOnce(
      makeCounty({
        preferredChannel: "email",
        fallbackChannel: "mail_certified",
        intakeEmail: "appeals@example.gov",
      })
    );
    const { dispatchFiling } = await import("./services/deliveryDispatcher");
    const result = await dispatchFiling({
      job: { id: 5, submissionId: 77, userId: 1, recipeId: null, authorizationId: 1 } as any,
      countyId: 1,
      perRunInputs: { ownerName: "Jane" },
    });
    expect(result.success).toBe(true);
    expect(result.channelUsed).toBe("email");
    expect(result.emailRecipient).toBe("appeals@example.gov");
    expect(result.emailMessageId).toBeTruthy();
  });

  it("returns unsupported error when no channel available", async () => {
    mockGetCountyById.mockResolvedValueOnce(
      makeCounty({
        preferredChannel: "unsupported",
        fallbackChannel: "unsupported",
      })
    );
    const { dispatchFiling } = await import("./services/deliveryDispatcher");
    const result = await dispatchFiling({
      job: { id: 5, submissionId: 77, userId: 1, recipeId: null, authorizationId: 1 } as any,
      countyId: 1,
      perRunInputs: {},
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/No viable delivery channel/i);
  });

  it("refuses to dispatch when no appeal PDF is available", async () => {
    mockGetReportJob.mockResolvedValueOnce(null);
    const { dispatchFiling } = await import("./services/deliveryDispatcher");
    const result = await dispatchFiling({
      job: { id: 5, submissionId: 77, userId: 1, recipeId: null, authorizationId: 1 } as any,
      countyId: 1,
      perRunInputs: {},
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toMatch(/No appeal PDF/i);
  });
});
