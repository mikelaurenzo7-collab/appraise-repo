import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB helpers
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  listAllReferralCodes: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 10,
      code: "APPR-0042",
      tier: "silver",
      lifetimeReferrals: 12,
      lifetimeEarningsCents: 24000,
      pendingBalanceCents: 5000,
      paidOutCents: 19000,
      createdAt: new Date("2025-06-01"),
      userName: "Alice",
      userEmail: "alice@test.com",
    },
    {
      id: 2,
      userId: 20,
      code: "APPR-0099",
      tier: "bronze",
      lifetimeReferrals: 3,
      lifetimeEarningsCents: 6000,
      pendingBalanceCents: 2000,
      paidOutCents: 4000,
      createdAt: new Date("2025-07-15"),
      userName: "Bob",
      userEmail: "bob@test.com",
    },
  ]),
  listAllReferralTracking: vi.fn().mockResolvedValue([
    {
      id: 1,
      referrerUserId: 10,
      referredEmail: "charlie@test.com",
      referralCode: "APPR-0042",
      submissionId: 5,
      status: "credited",
      commissionCents: 2000,
      commissionTier: "silver",
      clickedAt: new Date("2025-08-01"),
      paidAt: new Date("2025-08-10"),
      creditedAt: new Date("2025-08-10"),
      reversedAt: null,
      createdAt: new Date("2025-08-01"),
    },
  ]),
  listAllReferralPayouts: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 10,
      amountCents: 5000,
      status: "pending",
      method: "stripe_transfer",
      stripeTransferId: null,
      notes: null,
      requestedAt: new Date("2025-09-01"),
      processedAt: null,
      completedAt: null,
      userName: "Alice",
      userEmail: "alice@test.com",
    },
  ]),
  updateReferralPayout: vi.fn().mockResolvedValue(true),
  getReferralAdminStats: vi.fn().mockResolvedValue({
    totalCodes: 2,
    totalReferrals: 15,
    totalEarningsCents: 30000,
    totalPendingCents: 7000,
    totalPaidCents: 23000,
    pendingPayouts: 1,
  }),
  updateReferralCodeTier: vi.fn().mockResolvedValue(true),
  persistActivityLog: vi.fn().mockResolvedValue(undefined),
  // Other DB functions that might be imported
  getSubmissionStats: vi.fn().mockResolvedValue({}),
  getOutcomeStats: vi.fn().mockResolvedValue({}),
  getRecentActivityLogs: vi.fn().mockResolvedValue([]),
  listAllSubmissions: vi.fn().mockResolvedValue({ submissions: [], total: 0 }),
  getPropertySubmissionById: vi.fn().mockResolvedValue(null),
  getPropertyAnalysisBySubmissionId: vi.fn().mockResolvedValue(null),
  getAppealOutcomeBySubmissionId: vi.fn().mockResolvedValue(null),
  getActivityLogsBySubmission: vi.fn().mockResolvedValue([]),
  updatePropertySubmission: vi.fn().mockResolvedValue(null),
  createAppealOutcome: vi.fn().mockResolvedValue(null),
  updateAppealOutcome: vi.fn().mockResolvedValue(null),
  listAppealOutcomes: vi.fn().mockResolvedValue([]),
  evictExpiredCache: vi.fn().mockResolvedValue(0),
  getSubmissionPhotos: vi.fn().mockResolvedValue([]),
  getFilingTierBySubmission: vi.fn().mockResolvedValue(null),
  createFilingTier: vi.fn().mockResolvedValue(null),
  listUserFilings: vi.fn().mockResolvedValue([]),
  listFilingQueue: vi.fn().mockResolvedValue([]),
  assignQueueItem: vi.fn().mockResolvedValue(null),
  completeQueueItem: vi.fn().mockResolvedValue(null),
  getBatchSubmissionIds: vi.fn().mockResolvedValue([]),
  listRecentFilingJobs: vi.fn().mockResolvedValue([]),
  listFilingJobsByStatus: vi.fn().mockResolvedValue([]),
  updateFilingJob: vi.fn().mockResolvedValue(null),
  addWaitlistEntry: vi.fn().mockResolvedValue(null),
  listWaitlistEntries: vi.fn().mockResolvedValue([]),
  aggregateWaitlistByCounty: vi.fn().mockResolvedValue([]),
  getFilingStats: vi.fn().mockResolvedValue({}),
  getOrCreateReferralCode: vi.fn().mockResolvedValue(null),
  getReferralCodeByCode: vi.fn().mockResolvedValue(null),
  createReferralTracking: vi.fn().mockResolvedValue(null),
  getReferralTrackingBySubmission: vi.fn().mockResolvedValue(null),
  updateReferralTracking: vi.fn().mockResolvedValue(undefined),
  creditReferral: vi.fn().mockResolvedValue(undefined),
  getReferralDashboard: vi.fn().mockResolvedValue(null),
  createReferralPayout: vi.fn().mockResolvedValue(null),
  getUserSubmissions: vi.fn().mockResolvedValue([]),
  createScrivenerAuthorization: vi.fn().mockResolvedValue(null),
  getScrivenerAuthorizationById: vi.fn().mockResolvedValue(null),
  getCountyEligibility: vi.fn().mockResolvedValue({ reasonsIneligible: [], withinFilingWindow: true }),
  getActiveRecipeForCounty: vi.fn().mockResolvedValue(null),
  createRefundRequest: vi.fn().mockResolvedValue(null),
  getRefundRequestBySubmissionId: vi.fn().mockResolvedValue(null),
  listPendingRefundRequests: vi.fn().mockResolvedValue([]),
  updateRefundRequest: vi.fn().mockResolvedValue(null),
  getFilingJobById: vi.fn().mockResolvedValue(null),
  getFilingJobBySubmissionId: vi.fn().mockResolvedValue(null),
  getReportJobById: vi.fn().mockResolvedValue(null),
  getReportJobBySubmissionId: vi.fn().mockResolvedValue(null),
}));

// Mock other modules that routers.ts imports
vi.mock("./services/analysisJob", () => ({
  queueAnalysisJob: vi.fn(),
}));
vi.mock("./services/reportJobQueue", () => ({
  queueReportGeneration: vi.fn(),
}));
vi.mock("./services/pdfGenerator", () => ({
  generateAppraisalPDF: vi.fn(),
}));
vi.mock("./storage", () => ({
  storagePut: vi.fn(),
  storageGet: vi.fn(),
}));
vi.mock("./services/chat", () => ({
  CHAT_MAX_CHARS_PER_MESSAGE: 5000,
  CHAT_MAX_MESSAGES: 50,
  ChatValidationError: class extends Error {},
  buildLLMMessages: vi.fn(),
  extractContactInfo: vi.fn(),
  sanitizeMessages: vi.fn(),
}));
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));
vi.mock("./routers/sms", () => ({
  smsRouter: {} as any,
}));
vi.mock("./routers/appeals", () => ({
  appealsRouter: {} as any,
}));
vi.mock("./routers/reports", () => ({
  reportsRouter: {} as any,
}));
vi.mock("./routers/guides", () => ({
  guidesRouter: {} as any,
}));
vi.mock("./routers/counties", () => ({
  countiesRouter: {} as any,
}));
vi.mock("./services/filingRecipeEngine", () => ({
  hashAuthorizationText: vi.fn().mockReturnValue("hash"),
}));
vi.mock("./services/filingJobQueue", () => ({
  queueFilingJob: vi.fn(),
}));
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn(),
}));
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn(),
}));

import { appRouter } from "./routers";
import {
  listAllReferralCodes,
  listAllReferralTracking,
  listAllReferralPayouts,
  updateReferralPayout,
  getReferralAdminStats,
  updateReferralCodeTier,
} from "./db";

// Helper to create a caller with admin context
function createAdminCaller() {
  return appRouter.createCaller({
    user: {
      id: 1,
      openId: "admin-openid",
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
      loginMethod: "email",
      stripeCustomerId: null,
      phoneNumber: null,
      smsOptIn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, socket: {} } as any,
    res: {} as any,
  });
}

function createUserCaller() {
  return appRouter.createCaller({
    user: {
      id: 99,
      openId: "user-openid",
      name: "User",
      email: "user@test.com",
      role: "user",
      loginMethod: "email",
      stripeCustomerId: null,
      phoneNumber: null,
      smsOptIn: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {}, socket: {} } as any,
    res: {} as any,
  });
}

describe("Admin Referral Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getReferralStats", () => {
    it("returns aggregate referral stats for admin", async () => {
      const caller = createAdminCaller();
      const stats = await caller.admin.getReferralStats();
      expect(stats.totalCodes).toBe(2);
      expect(stats.totalReferrals).toBe(15);
      expect(stats.totalEarningsCents).toBe(30000);
      expect(stats.totalPendingCents).toBe(7000);
      expect(stats.totalPaidCents).toBe(23000);
      expect(stats.pendingPayouts).toBe(1);
      expect(getReferralAdminStats).toHaveBeenCalledOnce();
    });

    it("rejects non-admin users", async () => {
      const caller = createUserCaller();
      await expect(caller.admin.getReferralStats()).rejects.toThrow("You do not have required permission");
    });
  });

  describe("listReferralCodes", () => {
    it("returns leaderboard data with user info", async () => {
      const caller = createAdminCaller();
      const codes = await caller.admin.listReferralCodes();
      expect(codes).toHaveLength(2);
      expect(codes[0].code).toBe("APPR-0042");
      expect(codes[0].userName).toBe("Alice");
      expect(codes[0].tier).toBe("silver");
      expect(codes[0].lifetimeEarningsCents).toBe(24000);
      expect(listAllReferralCodes).toHaveBeenCalledWith(100);
    });

    it("accepts custom limit", async () => {
      const caller = createAdminCaller();
      await caller.admin.listReferralCodes({ limit: 50 });
      expect(listAllReferralCodes).toHaveBeenCalledWith(50);
    });
  });

  describe("listReferralTracking", () => {
    it("returns referral event history", async () => {
      const caller = createAdminCaller();
      const tracking = await caller.admin.listReferralTracking();
      expect(tracking).toHaveLength(1);
      expect(tracking[0].referralCode).toBe("APPR-0042");
      expect(tracking[0].status).toBe("credited");
      expect(tracking[0].commissionCents).toBe(2000);
      expect(listAllReferralTracking).toHaveBeenCalledWith(200);
    });
  });

  describe("listReferralPayouts", () => {
    it("returns payout requests with user info", async () => {
      const caller = createAdminCaller();
      const payouts = await caller.admin.listReferralPayouts();
      expect(payouts).toHaveLength(1);
      expect(payouts[0].amountCents).toBe(5000);
      expect(payouts[0].status).toBe("pending");
      expect(payouts[0].userName).toBe("Alice");
      expect(listAllReferralPayouts).toHaveBeenCalledWith(100);
    });
  });

  describe("updatePayoutStatus", () => {
    it("updates payout to processing", async () => {
      const caller = createAdminCaller();
      const result = await caller.admin.updatePayoutStatus({ payoutId: 1, status: "processing" });
      expect(result.success).toBe(true);
      expect(updateReferralPayout).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "processing",
        processedAt: expect.any(Date),
      }));
    });

    it("updates payout to completed", async () => {
      const caller = createAdminCaller();
      const result = await caller.admin.updatePayoutStatus({ payoutId: 1, status: "completed" });
      expect(result.success).toBe(true);
      expect(updateReferralPayout).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "completed",
        completedAt: expect.any(Date),
      }));
    });

    it("rejects payout with notes", async () => {
      const caller = createAdminCaller();
      const result = await caller.admin.updatePayoutStatus({
        payoutId: 1,
        status: "failed",
        notes: "Insufficient verification",
      });
      expect(result.success).toBe(true);
      expect(updateReferralPayout).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "failed",
        notes: "Insufficient verification",
      }));
    });

    it("throws when payout not found", async () => {
      vi.mocked(updateReferralPayout).mockResolvedValueOnce(false);
      const caller = createAdminCaller();
      await expect(
        caller.admin.updatePayoutStatus({ payoutId: 999, status: "completed" })
      ).rejects.toThrow("Payout not found");
    });
  });

  describe("updateReferralTier", () => {
    it("updates a referral code tier", async () => {
      const caller = createAdminCaller();
      const result = await caller.admin.updateReferralTier({ codeId: 1, tier: "gold" });
      expect(result.success).toBe(true);
      expect(updateReferralCodeTier).toHaveBeenCalledWith(1, "gold");
    });

    it("throws when code not found", async () => {
      vi.mocked(updateReferralCodeTier).mockResolvedValueOnce(false);
      const caller = createAdminCaller();
      await expect(
        caller.admin.updateReferralTier({ codeId: 999, tier: "platinum" })
      ).rejects.toThrow("Referral code not found");
    });
  });
});
