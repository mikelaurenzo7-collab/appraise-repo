import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database and notification functions
vi.mock("./db", () => ({
  createPropertySubmission: vi.fn(async (submission) => ({
    id: 1,
    ...submission,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
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
    });

    expect(result.success).toBe(true);
    expect(result.submissionId).toBe(1);
    expect(result.message).toContain("received");
    expect(result.message).toContain("24 hours");
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
