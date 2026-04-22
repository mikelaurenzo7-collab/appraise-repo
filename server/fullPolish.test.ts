import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// DB mocks
const mockSelectRows = vi.fn();
const mockUpdate = vi.fn();
const mockAddWaitlist = vi.fn();
const mockListWaitlist = vi.fn();
const mockAggregateWaitlist = vi.fn();
const mockGetFilingStats = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => mockSelectRows(),
        }),
      }),
    }),
    update: () => ({
      set: (values: any) => ({
        where: async () => mockUpdate(values),
      }),
    }),
  })),
  persistActivityLog: vi.fn(async () => undefined),
  addWaitlistEntry: (entry: any) => mockAddWaitlist(entry),
  listWaitlistEntries: (n: number) => mockListWaitlist(n),
  aggregateWaitlistByCounty: () => mockAggregateWaitlist(),
  getFilingStats: (days: number) => mockGetFilingStats(days),
  // The routers file touches a pile of other helpers; return no-op defaults.
  createPropertySubmission: vi.fn(async () => null),
  getPropertySubmissionById: vi.fn(async () => null),
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
  listUserFilings: vi.fn(async () => []),
  listFilingQueue: vi.fn(async () => []),
  assignQueueItem: vi.fn(async () => null),
  completeQueueItem: vi.fn(async () => null),
  getBatchSubmissionIds: vi.fn(async () => []),
  createScrivenerAuthorization: vi.fn(async () => null),
  getScrivenerAuthorizationById: vi.fn(async () => null),
  getCountyEligibility: vi.fn(async () => ({})),
  getActiveRecipeForCounty: vi.fn(async () => null),
  createRefundRequest: vi.fn(async () => null),
  getRefundRequestBySubmissionId: vi.fn(async () => null),
  listPendingRefundRequests: vi.fn(async () => []),
  updateRefundRequest: vi.fn(async () => null),
  getFilingJobById: vi.fn(async () => null),
  getFilingJobBySubmissionId: vi.fn(async () => null),
  listRecentFilingJobs: vi.fn(async () => []),
  listFilingJobsByStatus: vi.fn(async () => []),
  updateFilingJob: vi.fn(async () => null),
  getCountyById: vi.fn(async () => null),
}));

vi.mock("./storage", () => ({
  storageDelete: vi.fn(async () => true),
}));

vi.mock("./_core/emailService", () => ({
  sendFilingDeadlineReminderEmail: vi.fn(async () => true),
  sendFilingSubmittedEmail: vi.fn(async () => true),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
  analyzePropertySubmission: vi.fn(),
}));

vi.mock("./services/filingJobQueue", () => ({
  queueFilingJob: vi.fn(async () => ({ jobId: 1, submissionId: 1 })),
}));

async function loadRouter() {
  const mod = await import("./routers");
  return mod.appRouter;
}

const adminUser: User = {
  id: 99,
  openId: "admin",
  name: "A",
  email: "a@example.com",
  loginMethod: "google",
  role: "admin",
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function baseCtx(u: User | null = adminUser): TrpcContext {
  return {
    user: u,
    req: {
      headers: { "user-agent": "test/1.0" },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: { clearCookie: () => {} } as any,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Filing artifact cleanup
// ────────────────────────────────────────────────────────────────────────────

describe("cleanupExpiredFilingArtifacts", () => {
  beforeEach(() => {
    mockSelectRows.mockReset();
    mockUpdate.mockReset();
  });

  it("deletes S3 artifacts and nulls the keys for expired jobs", async () => {
    mockSelectRows.mockResolvedValueOnce([
      {
        id: 1,
        submissionId: 10,
        finalScreenshotKey: "filings/10/1-screenshot.png",
        executionLogKey: "filings/10/1-log.json",
        completedAt: new Date("2024-01-01"),
      },
    ]);
    const { cleanupExpiredFilingArtifacts } = await import(
      "./services/filingCleanup"
    );
    const result = await cleanupExpiredFilingArtifacts({ retentionDays: 30 });
    expect(result.scanned).toBe(1);
    expect(result.artifactsDeleted).toBe(2);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        finalScreenshotKey: null,
        executionLogKey: null,
      })
    );
  });

  it("returns zero when nothing needs cleanup", async () => {
    mockSelectRows.mockResolvedValueOnce([]);
    const { cleanupExpiredFilingArtifacts } = await import(
      "./services/filingCleanup"
    );
    const result = await cleanupExpiredFilingArtifacts({ retentionDays: 30 });
    expect(result).toEqual({ scanned: 0, artifactsDeleted: 0, errors: 0 });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// admin.listWaitlist + counties.joinWaitlist
// ────────────────────────────────────────────────────────────────────────────

describe("counties.joinWaitlist", () => {
  beforeEach(() => {
    mockAddWaitlist.mockReset();
  });

  it("records a waitlist entry when email is valid", async () => {
    mockAddWaitlist.mockResolvedValueOnce({
      id: 11,
      email: "a@b.com",
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(null));
    const result = await caller.counties.joinWaitlist({
      email: "a@b.com",
      state: "TX",
      countyName: "Collin County",
    });
    expect(mockAddWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "a@b.com",
        state: "TX",
        countyName: "Collin County",
      })
    );
    expect(result.success).toBe(true);
    expect(result.id).toBe(11);
  });

  it("rejects invalid email", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(null));
    await expect(
      caller.counties.joinWaitlist({
        email: "not-an-email",
        state: "TX",
        countyName: "Collin",
      })
    ).rejects.toThrow();
  });
});

describe("admin.listWaitlist", () => {
  beforeEach(() => {
    mockListWaitlist.mockReset();
    mockAggregateWaitlist.mockReset();
  });

  it("returns entries + aggregates for admin", async () => {
    mockListWaitlist.mockResolvedValueOnce([
      { id: 1, email: "a@b.com", countyName: "Collin", state: "TX", createdAt: new Date() },
    ]);
    mockAggregateWaitlist.mockResolvedValueOnce([
      { state: "TX", countyName: "Collin", count: 5 },
      { state: "IL", countyName: "Winnebago", count: 2 },
    ]);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    const result = await caller.admin.listWaitlist();
    expect(result.entries).toHaveLength(1);
    expect(result.aggregates).toHaveLength(2);
    expect(result.aggregates[0].count).toBe(5);
  });

  it("refuses non-admin", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ ...adminUser, role: "user" }));
    await expect(caller.admin.listWaitlist()).rejects.toThrow(/Admin/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// admin.getFilingStats
// ────────────────────────────────────────────────────────────────────────────

describe("admin.getFilingStats", () => {
  beforeEach(() => {
    mockGetFilingStats.mockReset();
  });

  it("delegates to getFilingStats with provided window", async () => {
    mockGetFilingStats.mockResolvedValueOnce({
      totalJobs: 10,
      sinceDate: new Date(),
      byStatus: [],
      byChannel: [],
      byDeliveryStatus: [],
      deliveredInWindow: 8,
      returnedInWindow: 1,
      successRate7d: 0.9,
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    const result = await caller.admin.getFilingStats({ windowDays: 7 });
    expect(mockGetFilingStats).toHaveBeenCalledWith(7);
    expect(result.totalJobs).toBe(10);
    expect(result.deliveredInWindow).toBe(8);
    expect(result.successRate7d).toBeCloseTo(0.9);
  });

  it("defaults to 30-day window when no input provided", async () => {
    mockGetFilingStats.mockResolvedValueOnce({
      totalJobs: 0,
      sinceDate: new Date(),
      byStatus: [],
      byChannel: [],
      byDeliveryStatus: [],
      deliveredInWindow: 0,
      returnedInWindow: 0,
      successRate7d: null,
    });
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx(adminUser));
    await caller.admin.getFilingStats();
    expect(mockGetFilingStats).toHaveBeenCalledWith(30);
  });
});
