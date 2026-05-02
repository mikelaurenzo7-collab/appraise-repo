import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { scopedLogger } from "./logger";

const log = scopedLogger("Notification");

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification.
 *
 * Originally backed by the Manus WebDevService. Since the migration to
 * Vercel/Supabase, owner notifications fall back to Resend email when
 * OWNER_EMAIL is configured. If neither a notification backend nor
 * OWNER_EMAIL is set, this is a best-effort no-op — callers already
 * handle a `false` return by logging and moving on.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const validated = validatePayload(payload);

  // Try Resend email fallback when OWNER_EMAIL is configured
  const ownerEmail = process.env.OWNER_EMAIL;
  if (ownerEmail && process.env.RESEND_API_KEY) {
    try {
      const { sendMail } = await import("./mailer");
      await sendMail({
        to: ownerEmail,
        subject: `[AppraiseAI] ${validated.title}`,
        text: validated.content,
      });
      return true;
    } catch (err) {
      log.warn("[Notification] Resend email fallback failed:", { err: err });
      return false;
    }
  }

  // No notification backend is wired up
  return false;
}
