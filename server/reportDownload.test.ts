import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { TrpcContext } from "./_core/context";

type User = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "sample-user",
    email: "owner@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as User;
}

function makeCtx(user: User): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// Mocks must be registered before importing the router.
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getReportJobById: vi.fn(),
    getReportJobBySubmissionId: vi.fn(),
    getPropertySubmissionById: vi.fn(),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
  storageGet: vi.fn(),
}));

describe("payments.getReportDownloadUrl", () => {
  let appRouter: typeof import("./routers").appRouter;
  let db: typeof import("./db");
  let storage: typeof import("./storage");

  beforeEach(async () => {
    // Freshly import with the mocks in place
    vi.resetModules();
    db = await import("./db");
    storage = await import("./storage");
    ({ appRouter } = await import("./routers"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns a freshly presigned URL for the owner of a completed job", async () => {
    const now = new Date();
    vi.mocked(db.getReportJobById).mockResolvedValue({
      id: 42,
      submissionId: 7,
      userId: 1,
      status: "completed",
      reportKey: "appraisals/7-report-abc.pdf",
      reportUrl: "https://old.example.com/stale.pdf",
      sizeBytes: 123456,
      completedAt: now,
      queuedAt: now,
      startedAt: now,
      expiresAt: new Date(Date.now() + 3600_000),
      retryCount: 0,
      maxRetries: 3,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    } as any);

    vi.mocked(db.getPropertySubmissionById).mockResolvedValue({
      id: 7,
      address: "123 Main St",
    } as any);

    vi.mocked(storage.storageGet).mockResolvedValue({
      key: "appraisals/7-report-abc.pdf",
      url: "https://fresh.example.com/signed?sig=xyz",
    });

    const caller = appRouter.createCaller(makeCtx(makeUser({ id: 1 })));
    const result = await caller.payments.getReportDownloadUrl({ jobId: 42 });

    expect(storage.storageGet).toHaveBeenCalledWith("appraisals/7-report-abc.pdf");
    expect(result.url).toBe("https://fresh.example.com/signed?sig=xyz");
    expect(result.fileName).toMatch(/^AppraiseAI-Report-123-Main-St-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result.sizeBytes).toBe(123456);
    expect(result.submissionId).toBe(7);
  });

  it("rejects a request from a user who does not own the job", async () => {
    vi.mocked(db.getReportJobById).mockResolvedValue({
      id: 42,
      submissionId: 7,
      userId: 99,
      status: "completed",
      reportKey: "appraisals/7-report-abc.pdf",
    } as any);

    const caller = appRouter.createCaller(makeCtx(makeUser({ id: 1 })));
    await expect(caller.payments.getReportDownloadUrl({ jobId: 42 })).rejects.toThrow(/Not your report/);
  });

  it("allows admins to download any user's report", async () => {
    vi.mocked(db.getReportJobById).mockResolvedValue({
      id: 42,
      submissionId: 7,
      userId: 99,
      status: "completed",
      reportKey: "appraisals/7-report-abc.pdf",
      sizeBytes: 100,
      completedAt: new Date(),
    } as any);
    vi.mocked(db.getPropertySubmissionById).mockResolvedValue({ id: 7, address: "1 Admin Way" } as any);
    vi.mocked(storage.storageGet).mockResolvedValue({ key: "k", url: "https://fresh/signed" });

    const caller = appRouter.createCaller(makeCtx(makeUser({ role: "admin" })));
    const result = await caller.payments.getReportDownloadUrl({ jobId: 42 });
    expect(result.url).toBe("https://fresh/signed");
  });

  it("returns 404 when the job does not exist", async () => {
    vi.mocked(db.getReportJobById).mockResolvedValue(null);
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    await expect(caller.payments.getReportDownloadUrl({ jobId: 999 })).rejects.toThrow(/not found/i);
  });

  it("refuses to return a URL while the job is still generating", async () => {
    vi.mocked(db.getReportJobById).mockResolvedValue({
      id: 42,
      submissionId: 7,
      userId: 1,
      status: "generating",
      reportKey: null,
    } as any);
    const caller = appRouter.createCaller(makeCtx(makeUser({ id: 1 })));
    await expect(caller.payments.getReportDownloadUrl({ jobId: 42 })).rejects.toThrow(/not ready/i);
  });

  it("accepts submissionId and looks up the latest job for that submission", async () => {
    vi.mocked(db.getReportJobBySubmissionId).mockResolvedValue({
      id: 55,
      submissionId: 7,
      userId: 1,
      status: "completed",
      reportKey: "appraisals/7-latest.pdf",
      sizeBytes: 200,
      completedAt: new Date(),
    } as any);
    vi.mocked(db.getPropertySubmissionById).mockResolvedValue({ id: 7, address: "77 Oak" } as any);
    vi.mocked(storage.storageGet).mockResolvedValue({ key: "appraisals/7-latest.pdf", url: "https://fresh/signed" });

    const caller = appRouter.createCaller(makeCtx(makeUser({ id: 1 })));
    const result = await caller.payments.getReportDownloadUrl({ submissionId: 7 });

    expect(db.getReportJobBySubmissionId).toHaveBeenCalledWith(7);
    expect(result.url).toBe("https://fresh/signed");
    expect(result.jobId).toBe(55);
  });

  it("validates input: must supply jobId or submissionId", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser()));
    // @ts-expect-error invalid input is intentional for this test
    await expect(caller.payments.getReportDownloadUrl({})).rejects.toThrow();
  });
});
