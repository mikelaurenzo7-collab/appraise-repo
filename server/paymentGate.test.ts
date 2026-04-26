import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

const mockGetSubmissionById = vi.fn();
const mockGetFilingTierBySubmission = vi.fn();
const mockGetAnalysisBySubmissionId = vi.fn();
const mockGetSubmissionPhotos = vi.fn();

vi.mock("./db", () => ({
  createPropertySubmission: vi.fn(async () => null),
  persistActivityLog: vi.fn(async () => undefined),
  getPropertySubmissionById: (...args: any[]) => mockGetSubmissionById(...args),
  getPropertyAnalysisBySubmissionId: (...args: any[]) => mockGetAnalysisBySubmissionId(...args),
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
  getSubmissionPhotos: (...args: any[]) => mockGetSubmissionPhotos(...args),
  getFilingTierBySubmission: (...args: any[]) => mockGetFilingTierBySubmission(...args),
  createFilingTier: vi.fn(async () => null),
  getDb: vi.fn(async () => null),
  listUserFilings: vi.fn(async () => []),
  listFilingQueue: vi.fn(async () => []),
  assignQueueItem: vi.fn(async () => null),
  completeQueueItem: vi.fn(async () => null),
  getBatchSubmissionIds: vi.fn(async () => []),
  createScrivenerAuthorization: vi.fn(async () => ({ id: 1 })),
  getScrivenerAuthorizationById: vi.fn(async () => null),
  getCountyEligibility: vi.fn(async () => ({ reasonsIneligible: [], withinFilingWindow: true })),
  getActiveRecipeForCounty: vi.fn(async () => null),
  createRefundRequest: vi.fn(async () => null),
  getRefundRequestBySubmissionId: vi.fn(async () => null),
  listPendingRefundRequests: vi.fn(async () => []),
  updateRefundRequest: vi.fn(async () => null),
  getFilingJobById: vi.fn(async () => null),
  getFilingJobBySubmissionId: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  getLatestPhotoAnalysis: vi.fn(async () => null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
  analyzePropertySubmission: vi.fn(),
}));

vi.mock("./services/filingJobQueue", () => ({
  queueFilingJob: vi.fn(async () => ({ jobId: 99, submissionId: 5 })),
}));

vi.mock("./services/appraisalPdfGenerator", () => ({
  generateAppraisalPDF: vi.fn(async () => ({
    url: "https://example.com/report.pdf",
    key: "reports/test.pdf",
  })),
}));

const normalUser: User = {
  id: 1,
  openId: "user-open-id",
  name: "Test User",
  email: "test@example.com",
  loginMethod: "google",
  role: "user",
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const ownerUser: User = {
  ...normalUser,
  id: 99,
  openId: process.env.OWNER_OPEN_ID || "owner-open-id",
};

const adminUser: User = {
  ...normalUser,
  id: 88,
  role: "admin",
};

function makeCtx(user: User): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: { clearCookie: () => {} } as any,
  };
}

async function loadRouter() {
  const mod = await import("./routers");
  return mod.appRouter;
}

describe("Payment Gate Enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetSubmissionById.mockReset();
    mockGetFilingTierBySubmission.mockReset();
    mockGetAnalysisBySubmissionId.mockReset();
    mockGetSubmissionPhotos.mockReset();
  });

  describe("properties.getPaymentStatus", () => {
    it("returns free status for filingMethod 'none'", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "none",
        address: "123 Main St",
      });
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(normalUser));
      const result = await caller.properties.getPaymentStatus({ submissionId: 1 });
      expect(result.requiresPayment).toBe(false);
      expect(result.paymentStatus).toBe("free");
    });

    it("returns pending status for paid tier without payment", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "poa",
        address: "123 Main St",
      });
      mockGetFilingTierBySubmission.mockResolvedValue(null);
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(normalUser));
      const result = await caller.properties.getPaymentStatus({ submissionId: 1 });
      expect(result.requiresPayment).toBe(true);
      expect(result.paymentStatus).toBe("pending");
    });

    it("returns paid status when payment is completed", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "poa",
        address: "123 Main St",
      });
      mockGetFilingTierBySubmission.mockResolvedValue({
        id: 1,
        submissionId: 1,
        paymentStatus: "paid",
      });
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(normalUser));
      const result = await caller.properties.getPaymentStatus({ submissionId: 1 });
      expect(result.requiresPayment).toBe(true);
      expect(result.paymentStatus).toBe("paid");
    });
  });

  describe("properties.generateReport payment gate", () => {
    it("blocks unpaid users from generating reports for paid tiers", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "poa",
        address: "123 Main St",
        email: "test@example.com",
      });
      mockGetFilingTierBySubmission.mockResolvedValue(null);
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(normalUser));
      await expect(
        caller.payments.generateReport({ submissionId: 1 })
      ).rejects.toThrow(/Payment is required/i);
    });

    it("allows free tier users to generate reports without payment", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "none",
        address: "123 Main St",
        email: "test@example.com",
      });
      mockGetAnalysisBySubmissionId.mockResolvedValue({
        id: 1,
        submissionId: 1,
        status: "completed",
        marketValue: 500000,
        comparableSales: "[]",
        appealStrength: 75,
        aiAnalysis: "{}",
      });
      mockGetSubmissionPhotos.mockResolvedValue([]);
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(normalUser));
      const result = await caller.payments.generateReport({ submissionId: 1 });
      expect(result.url).toBeDefined();
    });

    it("allows paid users to generate reports after payment", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "poa",
        address: "123 Main St",
        email: "test@example.com",
      });
      mockGetFilingTierBySubmission.mockResolvedValue({
        id: 1,
        submissionId: 1,
        paymentStatus: "paid",
      });
      mockGetAnalysisBySubmissionId.mockResolvedValue({
        id: 1,
        submissionId: 1,
        status: "completed",
        marketValue: 500000,
        comparableSales: "[]",
        appealStrength: 75,
        aiAnalysis: "{}",
      });
      mockGetSubmissionPhotos.mockResolvedValue([]);
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(normalUser));
      const result = await caller.payments.generateReport({ submissionId: 1 });
      expect(result.url).toBeDefined();
    });

    it("allows admin to bypass payment gate", async () => {
      mockGetSubmissionById.mockResolvedValue({
        id: 1,
        filingMethod: "poa",
        address: "123 Main St",
        email: "other@example.com",
      });
      mockGetAnalysisBySubmissionId.mockResolvedValue({
        id: 1,
        submissionId: 1,
        status: "completed",
        marketValue: 500000,
        comparableSales: "[]",
        appealStrength: 75,
        aiAnalysis: "{}",
      });
      mockGetSubmissionPhotos.mockResolvedValue([]);
      const router = await loadRouter();
      const caller = router.createCaller(makeCtx(adminUser));
      const result = await caller.payments.generateReport({ submissionId: 1 });
      expect(result.url).toBeDefined();
    });
  });
});
