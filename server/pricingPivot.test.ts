import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import {
  PRICING_TIERS,
  selectPricingTier,
  SCRIVENER_AUTHORIZATION_TEXT,
} from "../shared/pricing";
import { hashAuthorizationText } from "./services/filingRecipeEngine";

const mockGetSubmissionById = vi.fn(async (_id: number) => null as any);
const mockCreateScrivenerAuth = vi.fn(async (data: any) => ({
  id: 111,
  ...data,
  signedAt: new Date(),
}));
const mockGetScrivenerAuthById = vi.fn(async (_id: number) => null as any);
const mockCreateRefundRequest = vi.fn(async (data: any) => ({
  id: 222,
  ...data,
  requestedAt: new Date(),
}));
const mockGetRefundRequestBySubmissionId = vi.fn(async (_id: number) => null as any);
const mockGetCountyEligibility = vi.fn(async () => ({
  poaEligible: true,
  onlinePortalOnly: true,
  pinOnlyLogin: true,
  hasActiveRecipe: true,
  withinFilingWindow: true,
  reasonsIneligible: [],
}));
const mockGetActiveRecipe = vi.fn(async () => ({
  id: 55,
  countyId: 1,
  portalUrl: "https://example.test/",
  steps: "[]",
  version: 1,
  verificationStatus: "verified",
}));

vi.mock("./db", () => ({
  createPropertySubmission: vi.fn(async () => null),
  persistActivityLog: vi.fn(async () => undefined),
  getPropertySubmissionById: (id: number) => mockGetSubmissionById(id),
  getPropertyAnalysisBySubmissionId: vi.fn(async () => null),
  getAppealOutcomeBySubmissionId: vi.fn(async () => null),
  getActivityLogsBySubmission: vi.fn(async () => []),
  getUserSubmissions: vi.fn(async () => []),
  listAllSubmissions: vi.fn(async () => []),
  getSubmissionStats: vi.fn(async () => ({})),
  createAppealOutcome: vi.fn(async () => null),
  updateAppealOutcome: vi.fn(async () => null),
  listAppealOutcomes: vi.fn(async () => []),
  getOutcomeStats: vi.fn(async () => ({})),
  getRecentActivityLogs: vi.fn(async () => []),
  updatePropertySubmission: vi.fn(async () => null),
  evictExpiredCache: vi.fn(async () => 0),
  getSubmissionPhotos: vi.fn(async () => []),
  getFilingTierBySubmission: vi.fn(async () => null),
  createFilingTier: vi.fn(async () => null),
  getDb: vi.fn(async () => null),
  listUserFilings: vi.fn(async () => []),
  listFilingQueue: vi.fn(async () => []),
  assignQueueItem: vi.fn(async () => null),
  completeQueueItem: vi.fn(async () => null),
  getBatchSubmissionIds: vi.fn(async () => []),
  createScrivenerAuthorization: (data: any) => mockCreateScrivenerAuth(data),
  getScrivenerAuthorizationById: (id: number) => mockGetScrivenerAuthById(id),
  getCountyEligibility: () => mockGetCountyEligibility(),
  getActiveRecipeForCounty: () => mockGetActiveRecipe(),
  createRefundRequest: (data: any) => mockCreateRefundRequest(data),
  getRefundRequestBySubmissionId: (id: number) => mockGetRefundRequestBySubmissionId(id),
  listPendingRefundRequests: vi.fn(async () => []),
  updateRefundRequest: vi.fn(async () => null),
  getFilingJobById: vi.fn(async () => null),
  getFilingJobBySubmissionId: vi.fn(async () => null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
  analyzePropertySubmission: vi.fn(),
}));

vi.mock("./services/filingJobQueue", () => ({
  queueFilingJob: vi.fn(async () => ({ jobId: 99, submissionId: 7 })),
}));

async function loadRouter() {
  const mod = await import("./routers");
  return mod.appRouter;
}

const normalUser: User = {
  id: 1,
  openId: "user-open-id",
  name: "Owner",
  email: "owner@example.com",
  loginMethod: "google",
  role: "user",
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function baseCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: {
      headers: { "user-agent": "unit-test/1.0" },
      socket: { remoteAddress: "203.0.113.5" },
    } as any,
    res: { clearCookie: () => {} } as any,
    ...overrides,
  };
}

describe("selectPricingTier", () => {
  it("defaults to the lowest tier for a null value", () => {
    expect(selectPricingTier(null).id).toBe("starter");
    expect(selectPricingTier(undefined).id).toBe("starter");
    expect(selectPricingTier(0).id).toBe("starter");
  });

  it("selects starter under $500k", () => {
    expect(selectPricingTier(450_000 * 100).id).toBe("starter");
  });

  it("selects standard between $500k and $1.5M", () => {
    expect(selectPricingTier(900_000 * 100).id).toBe("standard");
    expect(selectPricingTier(1_500_000 * 100).id).toBe("standard");
  });

  it("selects premium above $1.5M", () => {
    expect(selectPricingTier(1_500_001 * 100).id).toBe("premium");
    expect(selectPricingTier(10_000_000 * 100).id).toBe("premium");
  });

  it("exposes three distinct, ordered tiers", () => {
    expect(PRICING_TIERS).toHaveLength(3);
    expect(PRICING_TIERS[0].priceCents).toBeLessThan(PRICING_TIERS[1].priceCents);
    expect(PRICING_TIERS[1].priceCents).toBeLessThan(PRICING_TIERS[2].priceCents);
  });
});

describe("payments.listTiers", () => {
  it("returns the public shape of the pricing tiers", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const tiers = await caller.payments.listTiers();
    expect(tiers).toHaveLength(3);
    expect(tiers[0]).toHaveProperty("priceCents");
    expect(tiers[0]).toHaveProperty("blurb");
    expect(tiers[0].price).toBeCloseTo(tiers[0].priceCents / 100);
  });
});

describe("filings.getAuthorizationText", () => {
  it("returns canonical text with a matching hash", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx());
    const result = await caller.filings.getAuthorizationText();
    expect(result.text).toBe(SCRIVENER_AUTHORIZATION_TEXT);
    expect(result.textHash).toBe(hashAuthorizationText(SCRIVENER_AUTHORIZATION_TEXT));
  });
});

describe("filings.authorize", () => {
  beforeEach(() => {
    mockCreateScrivenerAuth.mockClear();
    mockGetSubmissionById.mockReset();
    mockGetSubmissionById.mockResolvedValue({
      id: 5,
      email: "owner@example.com",
      address: "1",
    } as any);
  });

  it("records a scrivener authorization with IP and UA captured", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const result = await caller.filings.authorize({
      submissionId: 5,
      typedName: "Owner Example",
      authorizationText: SCRIVENER_AUTHORIZATION_TEXT,
      scrolledToEnd: true,
    });
    expect(mockCreateScrivenerAuth).toHaveBeenCalledTimes(1);
    const call = mockCreateScrivenerAuth.mock.calls[0][0];
    expect(call.ipAddress).toBe("203.0.113.5");
    expect(call.userAgent).toContain("unit-test/1.0");
    expect(call.authorizationTextHash).toBe(
      hashAuthorizationText(SCRIVENER_AUTHORIZATION_TEXT)
    );
    expect(result.id).toBe(111);
  });

  it("rejects mismatched authorization text", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    // Zod requires at least 100 chars, so use a plausible-length text that
    // still doesn't match the canonical hash.
    const notCanonical =
      "I have decided to authorize nothing in particular. ".repeat(3);
    await expect(
      caller.filings.authorize({
        submissionId: 5,
        typedName: "Owner Example",
        authorizationText: notCanonical,
        scrolledToEnd: true,
      })
    ).rejects.toThrow(/canonical version/i);
  });

  it("rejects submissions owned by someone else", async () => {
    mockGetSubmissionById.mockResolvedValueOnce({
      id: 5,
      email: "other@example.com",
      address: "1",
    } as any);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    await expect(
      caller.filings.authorize({
        submissionId: 5,
        typedName: "Owner Example",
        authorizationText: SCRIVENER_AUTHORIZATION_TEXT,
        scrolledToEnd: true,
      })
    ).rejects.toThrow(/Not your submission/i);
  });
});

describe("filings.submit eligibility gating", () => {
  beforeEach(() => {
    mockGetSubmissionById.mockReset();
    mockGetSubmissionById.mockResolvedValue({
      id: 5,
      email: "owner@example.com",
      address: "1",
    } as any);
    mockGetScrivenerAuthById.mockReset();
    mockGetScrivenerAuthById.mockResolvedValue({
      id: 111,
      submissionId: 5,
    } as any);
    mockGetCountyEligibility.mockReset();
    mockGetActiveRecipe.mockReset();
    mockGetActiveRecipe.mockResolvedValue({
      id: 55,
      countyId: 1,
      portalUrl: "https://example.test/",
      steps: "[]",
      version: 1,
      verificationStatus: "verified",
    } as any);
  });

  it("refuses to submit when county is ineligible", async () => {
    mockGetCountyEligibility.mockResolvedValueOnce({
      poaEligible: false,
      onlinePortalOnly: false,
      pinOnlyLogin: false,
      hasActiveRecipe: false,
      withinFilingWindow: false,
      reasonsIneligible: ["County not supported yet"],
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    await expect(
      caller.filings.submit({
        submissionId: 5,
        countyId: 1,
        authorizationId: 111,
        inputs: { taxpayerPin: "P", accountNumber: "A" },
      })
    ).rejects.toThrow(/Not eligible/i);
  });

  it("refuses to submit without a valid scrivener authorization", async () => {
    mockGetCountyEligibility.mockResolvedValueOnce({
      poaEligible: true,
      onlinePortalOnly: true,
      pinOnlyLogin: true,
      hasActiveRecipe: true,
      withinFilingWindow: true,
      reasonsIneligible: [],
    });
    mockGetScrivenerAuthById.mockResolvedValueOnce(null);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    await expect(
      caller.filings.submit({
        submissionId: 5,
        countyId: 1,
        authorizationId: 111,
        inputs: { taxpayerPin: "P", accountNumber: "A" },
      })
    ).rejects.toThrow(/scrivener authorization is required/i);
  });

  it("submits when eligibility and authorization pass", async () => {
    mockGetCountyEligibility.mockResolvedValueOnce({
      poaEligible: true,
      onlinePortalOnly: true,
      pinOnlyLogin: true,
      hasActiveRecipe: true,
      withinFilingWindow: true,
      reasonsIneligible: [],
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const result = await caller.filings.submit({
      submissionId: 5,
      countyId: 1,
      authorizationId: 111,
      inputs: { taxpayerPin: "P", accountNumber: "A" },
    });
    expect(result).toEqual({ jobId: 99, submissionId: 7 });
  });
});

describe("payments.requestRefund", () => {
  beforeEach(() => {
    mockCreateRefundRequest.mockClear();
    mockGetSubmissionById.mockReset();
    mockGetRefundRequestBySubmissionId.mockReset();
    mockGetSubmissionById.mockResolvedValue({
      id: 5,
      email: "owner@example.com",
      address: "1",
    } as any);
  });

  it("creates a pending refund request", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const result = await caller.payments.requestRefund({
      submissionId: 5,
      reason: "The county did not reduce my assessment; requesting guarantee.",
      amountCents: 14900,
    });
    expect(mockCreateRefundRequest).toHaveBeenCalledTimes(1);
    expect((result as any).id).toBe(222);
  });

  it("rejects duplicate pending refund", async () => {
    mockGetRefundRequestBySubmissionId.mockResolvedValueOnce({
      id: 300,
      status: "pending",
    } as any);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    await expect(
      caller.payments.requestRefund({
        submissionId: 5,
        reason: "Another attempt at refund",
        amountCents: 14900,
      })
    ).rejects.toThrow(/already pending/i);
  });

  it("rejects a request outside the 60-day money-back guarantee window", async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    mockGetSubmissionById.mockResolvedValueOnce({
      id: 5,
      email: "owner@example.com",
      address: "1",
      createdAt: ninetyDaysAgo,
    } as any);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    await expect(
      caller.payments.requestRefund({
        submissionId: 5,
        reason: "Service was 90 days ago, trying to claim refund now.",
        amountCents: 14900,
      })
    ).rejects.toThrow(/60-day money-back guarantee window has closed/i);
  });

  it("admins may bypass the 60-day window (policy-exception refunds)", async () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    mockGetSubmissionById.mockResolvedValueOnce({
      id: 5,
      email: "owner@example.com",
      address: "1",
      createdAt: ninetyDaysAgo,
    } as any);
    const router = await loadRouter();
    const caller = router.createCaller(
      baseCtx({
        user: { ...normalUser, role: "admin" },
      })
    );
    const result = await caller.payments.requestRefund({
      submissionId: 5,
      reason: "Admin out-of-policy refund for goodwill.",
      amountCents: 14900,
    });
    expect((result as any).id).toBe(222);
  });
});
