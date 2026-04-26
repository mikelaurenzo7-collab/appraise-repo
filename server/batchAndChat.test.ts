import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock batchProcessor to avoid real API calls
vi.mock("./services/batchProcessor", () => ({
  processBatch: vi.fn().mockResolvedValue({
    batchId: "batch_test_123",
    totalProperties: 2,
    processedCount: 2,
    successCount: 2,
    failureCount: 0,
    averageAnalysisTime: 1500,
    estimatedTotalSavings: 5000,
    properties: [
      { address: "123 Main St", status: "success", estimatedSavings: 3000 },
      { address: "456 Oak Ave", status: "success", estimatedSavings: 2000 },
    ],
  }),
  validateBatchRequest: vi.fn().mockReturnValue([]),
}));

// Mock LLM for chatbot
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: { content: "I'd be happy to help you with your property tax appeal!" },
      index: 0,
      finish_reason: "stop",
    }],
    id: "chat_1",
    created: Date.now(),
    model: "gpt-4",
  }),
}));

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 1, openId: "test_user", name: "Test User", email: "test@example.com", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Batch Processing Router", () => {
  it("rejects unauthenticated batch submission", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.batch.submitBatch({
        clientName: "Test Client",
        properties: [{ address: "123 Main St", city: "Austin", state: "TX", zipCode: "78701" }],
        filingMethod: "poa",
        contactEmail: "test@example.com",
      })
    ).rejects.toThrow("Please login");
  });

  it("accepts valid batch submission from authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.batch.submitBatch({
      clientName: "Test Portfolio",
      properties: [
        { address: "123 Main St", city: "Austin", state: "TX", zipCode: "78701" },
        { address: "456 Oak Ave", city: "Dallas", state: "TX", zipCode: "75201" },
      ],
      filingMethod: "poa",
      contactEmail: "client@example.com",
      contactPhone: "555-1234",
    });

    expect(result.batchId).toBeDefined();
    expect(result.totalProperties).toBe(2);
    expect(result.successCount).toBe(2);
    expect(result.estimatedTotalSavings).toBe(5000);
  });

  it("rejects batch with too many properties", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const properties = Array.from({ length: 101 }, (_, i) => ({
      address: `${i} Main St`,
      city: "Austin",
      state: "TX",
      zipCode: "78701",
    }));

    await expect(
      caller.batch.submitBatch({
        clientName: "Big Portfolio",
        properties,
        filingMethod: "poa",
        contactEmail: "test@example.com",
      })
    ).rejects.toThrow();
  });
});

describe("Chatbot Widget", () => {
  it("returns a response for public chat messages", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.batch.chat({
      message: "How does the appeal process work?",
    });

    expect(result.reply).toBeTruthy();
    expect(result.sessionId).toBeDefined();
    expect(result.suggestedActions).toContain("Get free analysis");
  });

  it("handles errors gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM down"));

    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.batch.chat({
      message: "Help me",
    });

    expect(result.reply).toContain("having trouble");
    expect(result.suggestedActions).toContain("Contact support");
  });

  it("preserves sessionId across calls", async () => {
    const ctx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.batch.chat({
      message: "Hello",
      sessionId: "session_abc_123",
    });

    expect(result.sessionId).toBe("session_abc_123");
  });
});
