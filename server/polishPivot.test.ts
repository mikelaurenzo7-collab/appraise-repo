import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { SCRIVENER_AUTHORIZATION_TEXT } from "../shared/pricing";

const mockGetSubmissionById = vi.fn(async () => ({
  id: 5,
  email: "owner@example.com",
  address: "1",
  assessedValue: 500_000,
}));
const mockGetAuth = vi.fn(async () => ({ id: 111, submissionId: 5 } as any));
const mockGetActiveRecipe = vi.fn(async () => null as any);
const mockGetEligibility = vi.fn(async () => ({
  poaEligible: true,
  onlinePortalOnly: true,
  pinOnlyLogin: false,
  hasActiveRecipe: true,
  withinFilingWindow: true,
  reasonsIneligible: [],
  selectedChannel: "mail_certified",
}));
const mockGetFilingJobBySubmissionId = vi.fn(async () => null as any);
const mockQueueFilingJob = vi.fn(async () => ({ jobId: 99, submissionId: 5 }));
const mockGetFilingJobById = vi.fn(async () => null as any);
const mockUpdateFilingJob = vi.fn(async () => null as any);
const mockListRecentFilingJobs = vi.fn(async () => [] as any);
const mockListFilingJobsByStatus = vi.fn(async () => [] as any);
const mockCreateRefundRequest = vi.fn(async (data: any) => ({
  id: 303,
  ...data,
}));
const mockGetRefundRequestBySubmissionId = vi.fn(async () => null as any);

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
  createAppealOutcome: vi.fn(async () => ({ id: 1 })),
  updateAppealOutcome: vi.fn(async () => ({ id: 1 })),
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
  createScrivenerAuthorization: vi.fn(async (data: any) => ({
    id: 111,
    ...data,
  })),
  getScrivenerAuthorizationById: (id: number) => mockGetAuth(id),
  getCountyEligibility: () => mockGetEligibility(),
  getActiveRecipeForCounty: () => mockGetActiveRecipe(),
  createRefundRequest: (data: any) => mockCreateRefundRequest(data),
  getRefundRequestBySubmissionId: (id: number) =>
    mockGetRefundRequestBySubmissionId(id),
  listPendingRefundRequests: vi.fn(async () => []),
  updateRefundRequest: vi.fn(async () => null),
  getFilingJobById: (id: number) => mockGetFilingJobById(id),
  getFilingJobBySubmissionId: (id: number) =>
    mockGetFilingJobBySubmissionId(id),
  listRecentFilingJobs: (n: number) => mockListRecentFilingJobs(n),
  listFilingJobsByStatus: (statuses: any, n: number) =>
    mockListFilingJobsByStatus(statuses, n),
  updateFilingJob: (id: number, updates: any) => mockUpdateFilingJob(id, updates),
  getUserByOpenId: vi.fn(async () => null),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
  analyzePropertySubmission: vi.fn(),
}));

vi.mock("./services/filingJobQueue", () => ({
  queueFilingJob: (...args: any[]) => mockQueueFilingJob(...args),
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
const adminUser: User = { ...normalUser, id: 99, role: "admin" };

function baseCtx(u: User | null = normalUser): TrpcContext {
  return {
    user: u,
    req: {
      headers: { "user-agent": "test/1.0" },
      socket: { remoteAddress: "203.0.113.5" },
    } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("filings.submit idempotency + deadline", () => {
  beforeEach(() => {
    mockGetFilingJobBySubmissionId.mockReset();
    mockGetFilingJobBySubmissionId.mockResolvedValue(null);
    mockQueueFilingJob.mockReset();
    mockQueueFilingJob.mockResolvedValue({ jobId: 99, submissionId: 5 });
    mockGetEligibility.mockReset();
    mockGetEligibility.mockResolvedValue({
      poaEligible: true,
      onlinePortalOnly: true,
      pinOnlyLogin: false,
      hasActiveRecipe: true,
      withinFilingWindow: true,
      reasonsIneligible: [],
      selectedChannel: "mail_certified",
    });
  });

  it("refuses to submit outside the filing window", async () => {
    mockGetEligibility.mockResolvedValueOnce({
      poaEligible: true,
      onlinePortalOnly: true,
      pinOnlyLogin: false,
      hasActiveRecipe: true,
      withinFilingWindow: false,
      reasonsIneligible: [],
      selectedChannel: "mail_certified",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(normalUser));
    await expect(
      caller.filings.submit({
        submissionId: 5,
        countyId: 1,
        authorizationId: 111,
        inputs: { taxpayerPin: "P", accountNumber: "A" },
      })
    ).rejects.toThrow(/filing window is currently closed/i);
  });

  it("returns the existing job when one is already in-flight", async () => {
    mockGetFilingJobBySubmissionId.mockResolvedValueOnce({
      id: 77,
      submissionId: 5,
      status: "processing",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(normalUser));
    const result = await caller.filings.submit({
      submissionId: 5,
      countyId: 1,
      authorizationId: 111,
      inputs: { taxpayerPin: "P", accountNumber: "A" },
    });
    expect(result.jobId).toBe(77);
    // And we did NOT enqueue a second job.
    expect(mockQueueFilingJob).not.toHaveBeenCalled();
  });

  it("re-queues when the only previous job was failed", async () => {
    mockGetFilingJobBySubmissionId.mockResolvedValueOnce({
      id: 55,
      submissionId: 5,
      status: "failed",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(normalUser));
    const result = await caller.filings.submit({
      submissionId: 5,
      countyId: 1,
      authorizationId: 111,
      inputs: { taxpayerPin: "P", accountNumber: "A" },
    });
    expect(mockQueueFilingJob).toHaveBeenCalledOnce();
    expect(result.jobId).toBe(99);
  });
});

describe("admin.listFilingJobs / retry / cancel", () => {
  beforeEach(() => {
    mockListRecentFilingJobs.mockReset();
    mockListFilingJobsByStatus.mockReset();
    mockGetFilingJobById.mockReset();
    mockUpdateFilingJob.mockReset();
  });

  it("lists recent jobs when no status filter provided", async () => {
    mockListRecentFilingJobs.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    const rows = await caller.admin.listFilingJobs();
    expect(mockListRecentFilingJobs).toHaveBeenCalledWith(50);
    expect(rows).toHaveLength(2);
  });

  it("lists by status when a status filter is provided", async () => {
    mockListFilingJobsByStatus.mockResolvedValueOnce([{ id: 3 }]);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    const rows = await caller.admin.listFilingJobs({ status: "failed", limit: 10 });
    expect(mockListFilingJobsByStatus).toHaveBeenCalled();
    expect(rows).toHaveLength(1);
  });

  it("refuses listFilingJobs for non-admin", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(normalUser));
    await expect(caller.admin.listFilingJobs()).rejects.toThrow(/Admin access/i);
  });

  it("retry resets status and bumps retry count", async () => {
    mockGetFilingJobById.mockResolvedValueOnce({
      id: 10,
      submissionId: 5,
      status: "failed",
      retryCount: 0,
      maxRetries: 2,
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    const result = await caller.admin.retryFiling({ jobId: 10 });
    expect(result.success).toBe(true);
    expect(mockUpdateFilingJob).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ status: "pending", retryCount: 1 })
    );
  });

  it("retry refuses non-retryable states", async () => {
    mockGetFilingJobById.mockResolvedValueOnce({
      id: 10,
      submissionId: 5,
      status: "completed",
      retryCount: 0,
      maxRetries: 2,
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await expect(caller.admin.retryFiling({ jobId: 10 })).rejects.toThrow(
      /Can only retry/i
    );
  });

  it("retry refuses when max retries exceeded", async () => {
    mockGetFilingJobById.mockResolvedValueOnce({
      id: 10,
      submissionId: 5,
      status: "failed",
      retryCount: 2,
      maxRetries: 2,
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await expect(caller.admin.retryFiling({ jobId: 10 })).rejects.toThrow(
      /max retries/i
    );
  });

  it("cancel refuses a completed job", async () => {
    mockGetFilingJobById.mockResolvedValueOnce({
      id: 10,
      submissionId: 5,
      status: "completed",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await expect(caller.admin.cancelFiling({ jobId: 10 })).rejects.toThrow(
      /completed filing/i
    );
  });

  it("cancel marks a pending job cancelled", async () => {
    mockGetFilingJobById.mockResolvedValueOnce({
      id: 10,
      submissionId: 5,
      status: "pending",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    const result = await caller.admin.cancelFiling({
      jobId: 10,
      reason: "Taxpayer asked to stop",
    });
    expect(result.success).toBe(true);
    expect(mockUpdateFilingJob).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ status: "cancelled" })
    );
  });
});

describe("admin.recordOutcome auto-refund", () => {
  beforeEach(() => {
    mockGetFilingJobBySubmissionId.mockReset();
    mockGetRefundRequestBySubmissionId.mockReset();
    mockCreateRefundRequest.mockReset();
  });

  it("creates an auto-refund request when recorded outcome is lost and a completed filing exists", async () => {
    mockGetFilingJobBySubmissionId.mockResolvedValueOnce({
      id: 20,
      status: "completed",
    });
    mockGetRefundRequestBySubmissionId.mockResolvedValueOnce(null);
    mockCreateRefundRequest.mockResolvedValueOnce({ id: 303, status: "pending" });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await caller.admin.recordOutcome({
      submissionId: 5,
      outcome: "lost",
    });
    expect(mockCreateRefundRequest).toHaveBeenCalledOnce();
    const payload = mockCreateRefundRequest.mock.calls[0][0] as any;
    expect(payload.amountCents).toBeGreaterThan(0);
    expect(payload.reason).toMatch(/money-back guarantee/i);
  });

  it("does NOT auto-refund when no filing was completed", async () => {
    mockGetFilingJobBySubmissionId.mockResolvedValueOnce(null);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await caller.admin.recordOutcome({
      submissionId: 5,
      outcome: "lost",
    });
    expect(mockCreateRefundRequest).not.toHaveBeenCalled();
  });

  it("does NOT auto-refund when a refund is already pending", async () => {
    mockGetFilingJobBySubmissionId.mockResolvedValueOnce({
      id: 20,
      status: "completed",
    });
    mockGetRefundRequestBySubmissionId.mockResolvedValueOnce({
      id: 9,
      status: "pending",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await caller.admin.recordOutcome({
      submissionId: 5,
      outcome: "lost",
    });
    expect(mockCreateRefundRequest).not.toHaveBeenCalled();
  });

  it("does NOT auto-refund for won outcome", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await caller.admin.recordOutcome({
      submissionId: 5,
      outcome: "won",
      annualTaxSavings: 1200,
    });
    expect(mockCreateRefundRequest).not.toHaveBeenCalled();
  });
});

// Keep the unused import so TypeScript knows the text is still exported.
void SCRIVENER_AUTHORIZATION_TEXT;
