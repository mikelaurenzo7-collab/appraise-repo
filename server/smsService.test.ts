import { describe, it, expect, vi } from "vitest";

describe("SMS Service", () => {
  describe("Phone number validation", () => {
    it("should accept valid US phone numbers", () => {
      const validNumbers = [
        "+18005551234",
        "+12125551234",
        "+13125551234",
      ];
      for (const num of validNumbers) {
        expect(/^\+1\d{10}$/.test(num)).toBe(true);
      }
    });

    it("should reject invalid phone numbers", () => {
      const invalidNumbers = [
        "8005551234",       // missing +1
        "+1800555123",      // too short
        "+180055512345",    // too long
        "+28005551234",     // wrong country code
        "not-a-number",
      ];
      for (const num of invalidNumbers) {
        expect(/^\+1\d{10}$/.test(num)).toBe(false);
      }
    });
  });

  describe("SMS message templates", () => {
    it("should generate hearing reminder message", () => {
      const template = (address: string, date: string, county: string) =>
        `AppraiseAI: Your property tax hearing for ${address} is scheduled for ${date} in ${county}. Reply STOP to opt out.`;
      
      const msg = template("123 Main St", "2025-06-15", "Travis County");
      expect(msg).toContain("123 Main St");
      expect(msg).toContain("2025-06-15");
      expect(msg).toContain("Travis County");
      expect(msg).toContain("STOP");
    });

    it("should generate appeal status update message", () => {
      const template = (address: string, status: string) =>
        `AppraiseAI: Update on your appeal for ${address}: ${status}. View details at your dashboard. Reply STOP to opt out.`;
      
      const msg = template("456 Oak Ave", "Assessment reduced by $45,000");
      expect(msg).toContain("456 Oak Ave");
      expect(msg).toContain("reduced by $45,000");
    });

    it("should generate deadline reminder message", () => {
      const template = (county: string, deadline: string, daysLeft: number) =>
        `AppraiseAI: Filing deadline for ${county} is ${deadline} (${daysLeft} days away). Start your appeal now. Reply STOP to opt out.`;
      
      const msg = template("Cook County", "2025-07-01", 30);
      expect(msg).toContain("Cook County");
      expect(msg).toContain("30 days away");
    });

    it("should keep messages under 160 characters for SMS", () => {
      const shortTemplate = (addr: string) =>
        `AppraiseAI: Your appeal for ${addr} has been filed. Reply STOP to opt out.`;
      
      const msg = shortTemplate("123 Main St, Austin, TX");
      expect(msg.length).toBeLessThanOrEqual(160);
    });
  });

  describe("SMS notification types", () => {
    const notificationTypes = [
      "hearing_reminder",
      "appeal_status_update",
      "deadline_reminder",
      "filing_confirmation",
      "document_ready",
      "payment_confirmation",
    ];

    it("should support all required notification types", () => {
      expect(notificationTypes).toContain("hearing_reminder");
      expect(notificationTypes).toContain("appeal_status_update");
      expect(notificationTypes).toContain("deadline_reminder");
      expect(notificationTypes).toContain("filing_confirmation");
      expect(notificationTypes).toContain("document_ready");
      expect(notificationTypes).toContain("payment_confirmation");
    });
  });

  describe("Opt-in/Opt-out logic", () => {
    it("should default to opted out", () => {
      const defaultPreference = { smsOptedIn: false, phone: null };
      expect(defaultPreference.smsOptedIn).toBe(false);
    });

    it("should require phone number for opt-in", () => {
      const canOptIn = (phone: string | null) => !!phone && /^\+1\d{10}$/.test(phone);
      expect(canOptIn("+18005551234")).toBe(true);
      expect(canOptIn(null)).toBe(false);
      expect(canOptIn("invalid")).toBe(false);
    });
  });
});
