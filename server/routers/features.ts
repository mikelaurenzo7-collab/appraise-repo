import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import {
  notifyHearingScheduled,
  notifyAppealFiled,
  notifyAppealWon,
  notifyDeadlineReminder,
  formatPhoneNumber,
  isValidPhoneNumber,
} from '../_core/smsService';
import {
  generateReferralCode,
  trackReferral,
  getReferralStats,
  getReferralHistory,
  sendReferralInvite,
  validateReferralCode,
} from '../services/referralProgram';
import {
  getFilingTemplate,
  generateFilledTemplate,
  getStateTemplates,
  isWithinDeadline,
  getDaysUntilDeadline,
} from '../services/filingTemplates';

/**
 * Features Router
 * SMS notifications, referral program, and filing templates
 */

export const featuresRouter = router({
  // SMS Notifications
  sms: router({
    sendHearingNotification: protectedProcedure
      .input(
        z.object({
          phoneNumber: z.string(),
          hearingDate: z.string(),
          county: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        if (!isValidPhoneNumber(input.phoneNumber)) {
          throw new Error('Invalid phone number');
        }

        const formattedPhone = formatPhoneNumber(input.phoneNumber);
        const success = await notifyHearingScheduled(
          formattedPhone,
          new Date(input.hearingDate),
          input.county
        );

        return { success };
      }),

    sendAppealFiledNotification: protectedProcedure
      .input(
        z.object({
          phoneNumber: z.string(),
          county: z.string(),
          assessmentValue: z.number().int(),
        })
      )
      .mutation(async ({ input }) => {
        if (!isValidPhoneNumber(input.phoneNumber)) {
          throw new Error('Invalid phone number');
        }

        const formattedPhone = formatPhoneNumber(input.phoneNumber);
        const success = await notifyAppealFiled(
          formattedPhone,
          input.county,
          Math.floor(input.assessmentValue)
        );

        return { success };
      }),

    sendAppealWonNotification: protectedProcedure
      .input(
        z.object({
          phoneNumber: z.string(),
          county: z.string(),
          savingsPerYear: z.number().int(),
        })
      )
      .mutation(async ({ input }) => {
        if (!isValidPhoneNumber(input.phoneNumber)) {
          throw new Error('Invalid phone number');
        }

        const formattedPhone = formatPhoneNumber(input.phoneNumber);
        const success = await notifyAppealWon(
          formattedPhone,
          input.county,
          Math.floor(input.savingsPerYear)
        );

        return { success };
      }),

    sendDeadlineReminder: protectedProcedure
      .input(
        z.object({
          phoneNumber: z.string(),
          county: z.string(),
          daysUntilDeadline: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        if (!isValidPhoneNumber(input.phoneNumber)) {
          throw new Error('Invalid phone number');
        }

        const formattedPhone = formatPhoneNumber(input.phoneNumber);
        const success = await notifyDeadlineReminder(
          formattedPhone,
          input.county,
          input.daysUntilDeadline
        );

        return { success };
      }),
  }),

  // Referral Program
  referral: router({
    getCode: protectedProcedure.query(async ({ ctx }) => {
      const code = await generateReferralCode(ctx.user.id.toString());
      return { code };
    }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await getReferralStats(ctx.user.id.toString());
      return stats;
    }),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const history = await getReferralHistory(ctx.user.id.toString(), input.limit || 50);
        return history;
      }),

    trackReferral: publicProcedure
      .input(
        z.object({
          code: z.string(),
          email: z.string().email(),
        })
      )
      .mutation(async ({ input }) => {
        const valid = await validateReferralCode(input.code);
        if (!valid.valid) {
          throw new Error('Invalid referral code');
        }

        const success = await trackReferral(input.code, 'new-user-id', input.email.toString());
        return { success };
      }),

    sendInvite: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const code = await generateReferralCode(ctx.user.id.toString());
        const success = await sendReferralInvite(ctx.user.id.toString(), input.email, code);
        return { success };
      }),

    validateCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const result = await validateReferralCode(input.code);
        return result;
      }),
  }),

  // Filing Templates
  filingTemplates: router({
    getTemplate: publicProcedure
      .input(
        z.object({
          state: z.string(),
          county: z.string(),
        })
      )
      .query(async ({ input }) => {
        const template = await getFilingTemplate(input.state.toUpperCase(), input.county);
        if (!template) {
          throw new Error('Template not found');
        }
        return template;
      }),

    getStateTemplates: publicProcedure
      .input(z.object({ state: z.string() }))
      .query(async ({ input }) => {
        const templates = await getStateTemplates(input.state.toUpperCase());
        return templates;
      }),

    generateFilled: protectedProcedure
      .input(
        z.object({
          state: z.string(),
          county: z.string(),
          name: z.string(),
          email: z.string().email(),
          phone: z.string(),
          propertyAddress: z.string(),
          assessedValue: z.number().int(),
          marketValue: z.number().int(),
          reason: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const filled = await generateFilledTemplate(input.state.toUpperCase(), input.county, {
          name: input.name,
          email: input.email,
          phone: input.phone,
          propertyAddress: input.propertyAddress,
          assessedValue: Math.floor(input.assessedValue),
          marketValue: Math.floor(input.marketValue),
          reason: input.reason,
        });

        if (!filled) {
          throw new Error('Failed to generate template');
        }

        return filled;
      }),

    checkDeadline: publicProcedure
      .input(
        z.object({
          state: z.string(),
          county: z.string(),
          noticeDate: z.string(),
        })
      )
      .query(async ({ input }) => {
        const template = await getFilingTemplate(input.state.toUpperCase(), input.county);
        if (!template) {
          throw new Error('Template not found');
        }

        const noticeDate = new Date(input.noticeDate);
        const withinDeadline = isWithinDeadline(noticeDate, template);
        const daysRemaining = getDaysUntilDeadline(noticeDate, template);

        return {
          withinDeadline,
          daysRemaining,
          deadline: template.deadline,
        };
      }),
  }),
});
