import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdate = vi.fn();
const mockSelectRows = vi.fn();
const mockGetStatus = vi.fn();

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
}));

vi.mock("./services/lobDelivery", () => ({
  getLobLetterStatus: () => mockGetStatus(),
}));

describe("reconcilePendingMailFilings", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockSelectRows.mockReset();
    mockGetStatus.mockReset();
  });

  it("advances in_transit rows when Lob says delivered", async () => {
    mockSelectRows.mockResolvedValueOnce([
      {
        id: 10,
        submissionId: 100,
        lobLetterId: "ltr_1",
        deliveryStatus: "in_transit",
      },
    ]);
    mockGetStatus.mockResolvedValueOnce({
      status: "in_transit",
      trackingEvents: [
        { name: "mailed", time: "2026-04-15", description: "" },
        { name: "delivered", time: "2026-04-18", description: "" },
      ],
    });
    const { reconcilePendingMailFilings } = await import(
      "./services/lobReconciliation"
    );
    const result = await reconcilePendingMailFilings(10);
    expect(result.checked).toBe(1);
    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryStatus: "delivered" })
    );
  });

  it("does not regress a delivered row", async () => {
    mockSelectRows.mockResolvedValueOnce([
      {
        id: 11,
        submissionId: 100,
        lobLetterId: "ltr_2",
        deliveryStatus: "delivered",
      },
    ]);
    mockGetStatus.mockResolvedValueOnce({
      status: "in_transit",
      trackingEvents: [{ name: "in_transit", time: "t", description: "" }],
    });
    const { reconcilePendingMailFilings } = await import(
      "./services/lobReconciliation"
    );
    const result = await reconcilePendingMailFilings(10);
    expect(result.updated).toBe(0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("marks returned_to_sender as returned", async () => {
    mockSelectRows.mockResolvedValueOnce([
      {
        id: 12,
        submissionId: 100,
        lobLetterId: "ltr_3",
        deliveryStatus: "in_transit",
      },
    ]);
    mockGetStatus.mockResolvedValueOnce({
      status: "returned_to_sender",
      trackingEvents: [
        { name: "returned_to_sender", time: "t", description: "" },
      ],
    });
    const { reconcilePendingMailFilings } = await import(
      "./services/lobReconciliation"
    );
    const result = await reconcilePendingMailFilings(10);
    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryStatus: "returned" })
    );
  });

  it("counts errors when getLobLetterStatus throws", async () => {
    mockSelectRows.mockResolvedValueOnce([
      {
        id: 13,
        submissionId: 100,
        lobLetterId: "ltr_4",
        deliveryStatus: "in_transit",
      },
    ]);
    mockGetStatus.mockRejectedValueOnce(new Error("boom"));
    const { reconcilePendingMailFilings } = await import(
      "./services/lobReconciliation"
    );
    const result = await reconcilePendingMailFilings(10);
    expect(result.checked).toBe(1);
    expect(result.errors).toBe(1);
  });

  it("returns zero counts when no rows match the query", async () => {
    mockSelectRows.mockResolvedValueOnce([]);
    const { reconcilePendingMailFilings } = await import(
      "./services/lobReconciliation"
    );
    const result = await reconcilePendingMailFilings(10);
    expect(result).toEqual({ checked: 0, updated: 0, errors: 0 });
  });
});
