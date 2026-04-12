import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { classifyByAddressPattern } from "./services/propertyClassifier";

// Helper to create a public context (no user)
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

describe("Property Classifier (heuristic)", () => {
  it("classifies residential addresses", () => {
    expect(classifyByAddressPattern("123 Main St")).toBe("residential");
    expect(classifyByAddressPattern("456 Oak Ave")).toBe("residential");
    expect(classifyByAddressPattern("789 Elm Blvd")).toBe("residential");
  });

  it("classifies commercial addresses", () => {
    expect(classifyByAddressPattern("100 Business Plaza, Suite 200")).toBe("commercial");
    expect(classifyByAddressPattern("500 Office Center Dr")).toBe("commercial");
  });

  it("classifies multi-family addresses", () => {
    expect(classifyByAddressPattern("200 Apartment Complex, Unit 5")).toBe("multi-family");
    expect(classifyByAddressPattern("300 Condo Tower")).toBe("multi-family");
  });

  it("classifies agricultural addresses", () => {
    expect(classifyByAddressPattern("1000 County Road 45, Farm")).toBe("agricultural");
    expect(classifyByAddressPattern("Ranch Road 2222")).toBe("agricultural");
  });

  it("classifies industrial addresses", () => {
    expect(classifyByAddressPattern("50 Industrial Park Blvd")).toBe("industrial");
    expect(classifyByAddressPattern("Warehouse District 12")).toBe("industrial");
  });

  it("classifies land addresses", () => {
    expect(classifyByAddressPattern("Lot 5, Block 3")).toBe("land");
    expect(classifyByAddressPattern("Vacant Parcel 123")).toBe("land");
  });
});

describe("properties.submitAddress", () => {
  it("validates address is required", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.properties.submitAddress({
        address: "",
        email: "test@example.com",
      })
    ).rejects.toThrow();
  });

  it("validates email is required", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.properties.submitAddress({
        address: "123 Main St, Austin, TX 78701",
        email: "",
      })
    ).rejects.toThrow();
  });

  it("validates email format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.properties.submitAddress({
        address: "123 Main St, Austin, TX 78701",
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });
});

describe("properties.getAnalysis", () => {
  it("validates submissionId is required", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.properties.getAnalysis({ submissionId: NaN })
    ).rejects.toThrow();
  });
});
