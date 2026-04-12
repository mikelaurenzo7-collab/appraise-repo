import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database — include ALL functions the router imports
vi.mock("./db", () => ({
  createPropertySubmission: vi.fn(async (submission: any) => ({
    id: 1,
    ...submission,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  persistActivityLog: vi.fn(async () => undefined),
  getPropertySubmissionById: vi.fn(async () => null),
  getPropertyAnalysisBySubmissionId: vi.fn(async () => null),
  getAppealOutcomeBySubmissionId: vi.fn(async () => null),
  getActivityLogsBySubmission: vi.fn(async () => []),
  getUserSubmissions: vi.fn(async () => []),
  listAllSubmissions: vi.fn(async () => []),
  getSubmissionStats: vi.fn(async () => ({ total: 0, pending: 0, analyzing: 0, analyzed: 0, failed: 0 })),
  createAppealOutcome: vi.fn(async () => null),
  updateAppealOutcome: vi.fn(async () => null),
  listAppealOutcomes: vi.fn(async () => []),
  getOutcomeStats: vi.fn(async () => ({ total: 0, won: 0, lost: 0, pending: 0, avgSavings: 0 })),
  getRecentActivityLogs: vi.fn(async () => []),
  updatePropertySubmission: vi.fn(async () => null),
  evictExpiredCache: vi.fn(async () => 0),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

// Mock the analysis job so it doesn't run in tests
vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
  analyzePropertySubmission: vi.fn(),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("properties.submitAddress", () => {
  it("successfully submits a property address with all fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.submitAddress({
      address: "123 Main St, Austin, TX 78701",
      email: "user@example.com",
      phone: "(555) 123-4567",
      filingMethod: "poa",
    });

    expect(result.success).toBe(true);
    expect(result.submissionId).toBe(1);
    expect(result.message).toContain("received");
  });

  it("successfully submits without phone number", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.submitAddress({
      address: "456 Oak Ave, Denver, CO 80202",
      email: "another@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.submissionId).toBe(1);
  });

  it("defaults filing method to poa when not specified", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.submitAddress({
      address: "789 Elm St, Chicago, IL 60601",
      email: "test@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.properties.submitAddress({
        address: "789 Pine Rd, Seattle, WA 98101",
        email: "not-an-email",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("invalid");
    }
  });

  it("rejects short address", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.properties.submitAddress({
        address: "123",
        email: "user@example.com",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("valid address");
    }
  });

  it("rejects missing email", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.properties.submitAddress({
        address: "123 Main St, Austin, TX 78701",
        email: "",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("invalid");
    }
  });
});
