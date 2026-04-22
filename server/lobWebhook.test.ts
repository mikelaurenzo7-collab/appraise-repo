import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { verifyLobSignature, handleLobEvent } from "./_core/lobWebhook";

const mockUpdate = vi.fn();
const mockSelect = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => mockSelect(),
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

describe("verifyLobSignature", () => {
  const secret = "whsec_test_abc123";

  it("verifies a legitimate signature", () => {
    const body = '{"event_type":"letter.delivered"}';
    const ts = "1713700000";
    const sig = crypto.createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
    expect(verifyLobSignature(body, sig, ts, secret)).toBe(true);
  });

  it("rejects a forged signature", () => {
    const body = '{"event_type":"letter.delivered"}';
    const ts = "1713700000";
    const forged = "a".repeat(64);
    expect(verifyLobSignature(body, forged, ts, secret)).toBe(false);
  });

  it("rejects when signature missing", () => {
    expect(verifyLobSignature("body", undefined, "ts", secret)).toBe(false);
  });

  it("rejects when lengths differ", () => {
    expect(verifyLobSignature("body", "short", "ts", secret)).toBe(false);
  });
});

describe("handleLobEvent", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockSelect.mockReset();
  });

  it("advances pending → in_transit on letter.mailed", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: 42,
        submissionId: 7,
        deliveryStatus: "pending",
        lobLetterId: "ltr_abc",
        mailTrackingNumber: null,
      },
    ]);
    const result = await handleLobEvent({
      id: "evt_1",
      event_type: "letter.mailed",
      body: { id: "ltr_abc", tracking_number: "9407XYZ" },
    });
    expect(result.matched).toBe(true);
    expect(result.deliveryStatus).toBe("in_transit");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryStatus: "in_transit",
        mailTrackingNumber: "9407XYZ",
      })
    );
  });

  it("does not regress delivered → in_transit", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: 42,
        submissionId: 7,
        deliveryStatus: "delivered",
        lobLetterId: "ltr_abc",
        mailTrackingNumber: "9407XYZ",
      },
    ]);
    const result = await handleLobEvent({
      id: "evt_2",
      event_type: "letter.in_transit",
      body: { id: "ltr_abc" },
    });
    expect(result.deliveryStatus).toBe("delivered");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns matched=false for unknown event type", async () => {
    const result = await handleLobEvent({
      id: "evt_3",
      event_type: "letter.unknown_event",
      body: { id: "ltr_abc" },
    });
    expect(result.matched).toBe(false);
  });

  it("returns matched=false when no filing job matches letter id", async () => {
    mockSelect.mockResolvedValueOnce([]);
    const result = await handleLobEvent({
      id: "evt_4",
      event_type: "letter.delivered",
      body: { id: "ltr_nonexistent" },
    });
    expect(result.matched).toBe(false);
  });

  it("advances in_transit → delivered on letter.delivered", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: 42,
        submissionId: 7,
        deliveryStatus: "in_transit",
        lobLetterId: "ltr_abc",
        mailTrackingNumber: "9407XYZ",
      },
    ]);
    const result = await handleLobEvent({
      id: "evt_5",
      event_type: "letter.delivered",
      body: { id: "ltr_abc" },
    });
    expect(result.deliveryStatus).toBe("delivered");
  });

  it("marks returned_to_sender as returned", async () => {
    mockSelect.mockResolvedValueOnce([
      {
        id: 42,
        submissionId: 7,
        deliveryStatus: "in_transit",
        lobLetterId: "ltr_abc",
      },
    ]);
    const result = await handleLobEvent({
      id: "evt_6",
      event_type: "letter.returned_to_sender",
      body: { id: "ltr_abc" },
    });
    expect(result.deliveryStatus).toBe("returned");
  });
});
