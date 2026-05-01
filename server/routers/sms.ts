/**
 * SMS Preferences Router
 * Handles user SMS notification settings and preferences
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../../drizzle/schema.pg";
import { eq } from "drizzle-orm";
import { formatPhoneNumber, isValidPhoneNumber } from "../_core/smsService";
import { TRPCError } from "@trpc/server";

export const smsRouter = router({
  /**
   * Get user's SMS preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      phoneNumber: user[0].phoneNumber,
      smsOptIn: user[0].smsOptIn ?? true,
    };
  }),

  /**
   * Update SMS preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string().optional(),
        smsOptIn: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate phone number if provided
      if (input.phoneNumber) {
        if (!isValidPhoneNumber(input.phoneNumber)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid phone number format",
          });
        }
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const formattedPhone = input.phoneNumber
        ? formatPhoneNumber(input.phoneNumber)
        : undefined;

      await db
        .update(users)
        .set({
          phoneNumber: formattedPhone,
          smsOptIn: input.smsOptIn,
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        phoneNumber: formattedPhone,
        smsOptIn: input.smsOptIn ?? true,
      };
    }),

  /**
   * Opt in to SMS notifications
   */
  optIn: protectedProcedure
    .input(z.object({ phoneNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!isValidPhoneNumber(input.phoneNumber)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid phone number format",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const formattedPhone = formatPhoneNumber(input.phoneNumber);

      await db
        .update(users)
        .set({
          phoneNumber: formattedPhone,
          smsOptIn: true,
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        phoneNumber: formattedPhone,
      };
    }),

  /**
   * Opt out of SMS notifications
   */
  optOut: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    await db
      .update(users)
      .set({
        smsOptIn: false,
      })
      .where(eq(users.id, ctx.user.id));

    return {
      success: true,
    };
  }),
});
