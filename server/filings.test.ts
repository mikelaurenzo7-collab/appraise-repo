import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Stable mocks returned from ./db — each test can override them by
// reaching into these fn refs.
const mockListUserFilings = vi.fn(async (_email: string) => [] as any[]);
const mockListFilingQueue = vi.fn(async () => [] as any[]);
const mockAssignQueueItem = vi.fn(async (_id: number, _to: string) => ({
  id: 1,
  assignedTo: "Sarah Chen",
  status: "in-progress",
}));
const mockCompleteQueueItem = vi.fn(async (_id: number) => ({
  id: 1,
  status: "completed",
}));
const mockGetBatchIds = vi.fn(async (_batchId: string) => [] as number[]);
const mockGetSubmissionById = vi.fn(async (_id: number) => null as any);

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
  listUserFilings: (email: string) => mockListUserFilings(email),
  listFilingQueue: () => mockListFilingQueue(),
  assignQueueItem: (id: number, to: string) => mockAssignQueueItem(id, to),
  completeQueueItem: (id: number, notes?: string) =>
    mockCompleteQueueItem(id, notes),
  getBatchSubmissionIds: (batchId: string) => mockGetBatchIds(batchId),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
  analyzePropertySubmission: vi.fn(),
}));

async function loadRouter() {
  const mod = await import("./routers");
  return mod.appRouter;
}

function baseCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
    res: { clearCookie: () => {} } as any,
    ...overrides,
  };
}

const adminUser: User = {
  id: 42,
  openId: "admin-open-id",
  name: "Admin",
  email: "admin@example.com",
  loginMethod: "google",
  role: "admin",
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const normalUser: User = {
  ...adminUser,
  id: 1,
  openId: "user-open-id",
  email: "owner@example.com",
  role: "user",
};

describe("user.getFilings", () => {
  beforeEach(() => {
    mockListUserFilings.mockReset();
    mockListUserFilings.mockResolvedValue([
      {
        submissionId: 7,
        address: "123 Main St",
        city: "Austin",
        state: "TX",
        status: "hearing-scheduled",
        filingMethod: "poa",
        filedDate: new Date("2026-03-01"),
        hearingDate: new Date("2026-05-01"),
        hearingLocation: "Travis ARB",
        hearingFormat: "in-person",
        outcome: "pending",
        newAssessedValue: null,
        assessmentReduction: 50000,
        annualTaxSavings: 1200,
        confirmationNumber: "ABC-123",
        portalUrl: "https://traviscad.org/",
        lastUpdated: new Date(),
        notes: "On calendar",
      },
    ]);
  });

  it("returns filings for the authenticated user's email", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const filings = await caller.user.getFilings();
    expect(mockListUserFilings).toHaveBeenCalledWith("owner@example.com");
    expect(filings).toHaveLength(1);
    expect(filings[0]?.submissionId).toBe(7);
  });

  it("rejects unauthenticated callers", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: null }));
    await expect(caller.user.getFilings()).rejects.toThrow();
  });
});

describe("admin.listFilingQueue / assignFiling / completeFiling", () => {
  beforeEach(() => {
    mockListFilingQueue.mockReset();
    mockAssignQueueItem.mockReset();
    mockCompleteQueueItem.mockReset();
    mockListFilingQueue.mockResolvedValue([
      {
        queueId: 1,
        poaFilingId: 10,
        submissionId: 100,
        status: "queued",
        priority: "normal",
        assignedTo: null,
        deadline: new Date("2026-06-01"),
        queuedAt: new Date(),
        completedAt: null,
        county: "Travis County",
        state: "TX",
        address: "123 Main St",
        ownerEmail: "owner@example.com",
        ownerPhone: null,
        filingType: "poa",
        notes: null,
      },
    ]);
    mockAssignQueueItem.mockResolvedValue({
      id: 1,
      assignedTo: "Sarah Chen",
      status: "in-progress",
    } as any);
    mockCompleteQueueItem.mockResolvedValue({
      id: 1,
      status: "completed",
    } as any);
  });

  it("lists queue for admin", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: adminUser }));
    const rows = await caller.admin.listFilingQueue();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.queueId).toBe(1);
  });

  it("rejects listFilingQueue for non-admins", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    await expect(caller.admin.listFilingQueue()).rejects.toThrow(/Admin/i);
  });

  it("assigns a paralegal and records the action", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: adminUser }));
    const result = await caller.admin.assignFiling({
      queueId: 1,
      assignedTo: "Sarah Chen",
    });
    expect(mockAssignQueueItem).toHaveBeenCalledWith(1, "Sarah Chen");
    expect((result as any).assignedTo).toBe("Sarah Chen");
  });

  it("throws NOT_FOUND when the queue item is missing", async () => {
    mockAssignQueueItem.mockResolvedValueOnce(null as any);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: adminUser }));
    await expect(
      caller.admin.assignFiling({ queueId: 999, assignedTo: "Nobody" })
    ).rejects.toThrow(/not found/i);
  });

  it("marks filings complete", async () => {
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: adminUser }));
    const result = await caller.admin.completeFiling({
      queueId: 1,
      notes: "Sent to county",
    });
    expect(mockCompleteQueueItem).toHaveBeenCalledWith(1, "Sent to county");
    expect((result as any).status).toBe("completed");
  });
});

describe("payments.getBatchStatus", () => {
  beforeEach(() => {
    mockGetBatchIds.mockReset();
    mockGetSubmissionById.mockReset();
  });

  it("returns not-found when the batch has no submissions", async () => {
    mockGetBatchIds.mockResolvedValueOnce([]);
    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const result = await caller.payments.getBatchStatus({ batchId: "missing" });
    expect(result.status).toBe("not-found");
    expect(result.totalProperties).toBe(0);
  });

  it("aggregates completed/failed/pending counts from submission status", async () => {
    mockGetBatchIds.mockResolvedValueOnce([1, 2, 3]);
    mockGetSubmissionById.mockImplementation(async (id: number) => {
      if (id === 1) return { id: 1, address: "A", status: "analyzed", potentialSavings: 100 };
      if (id === 2) return { id: 2, address: "B", status: "withdrawn", potentialSavings: null };
      if (id === 3) return { id: 3, address: "C", status: "pending", potentialSavings: null };
      return null;
    });

    const router = await loadRouter();
    const caller = router.createCaller(baseCtx({ user: normalUser }));
    const result = await caller.payments.getBatchStatus({ batchId: "batch_1" });

    expect(result.totalProperties).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.submissions).toHaveLength(3);
    expect(result.status).toBe("processing");
  });
});
