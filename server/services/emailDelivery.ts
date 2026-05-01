/**
 * Email delivery service for appeal filings.
 *
 * Used when a county publishes an official intake email address and
 * explicitly treats emailed filings as equivalent to mail (FL Orange
 * County, a handful of smaller jurisdictions). We send the user's filled
 * appeal PDF as an attachment, with a short professional body and the
 * user's contact info in the body so the assessor's mailroom can reply.
 *
 * Backed by the unified Resend mailer (server/_core/mailer.ts). Falls
 * back to STUB mode when RESEND_API_KEY is not configured.
 */

import crypto from "crypto";
import { sendMail } from "../_core/mailer";

export interface AppealEmailParams {
  toEmail: string; // county intake email
  ccEmail?: string; // owner's email (for a copy)
  subject: string;
  bodyText: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
  metadata?: Record<string, string>;
}

export interface AppealEmailResult {
  messageId: string;
  stubbed: boolean;
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export async function sendAppealEmail(
  params: AppealEmailParams
): Promise<AppealEmailResult> {
  try {
    const result = await sendMail({
      to: params.toEmail,
      cc: params.ccEmail,
      subject: params.subject,
      text: params.bodyText,
      attachments: [
        {
          filename: params.pdfFilename,
          content: params.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
      tags: params.metadata,
    });
    return {
      messageId: result.messageId,
      stubbed: result.stubbed,
    };
  } catch (err) {
    throw new EmailDeliveryError(
      err instanceof Error ? err.message : "Email delivery failed"
    );
  }
}

// kept for backward-compat with tests that may import crypto-using helpers
void crypto;

/**
 * Build the canonical email body used for every emailed appeal filing.
 * Keep this boilerplate — the county mailroom expects consistent format.
 */
export function buildAppealEmailBody(opts: {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  propertyAddress: string;
  parcelOrAccount?: string;
  countyName: string;
  opinionOfValueCents?: number;
}): { subject: string; bodyText: string } {
  const parcelLine = opts.parcelOrAccount
    ? `Parcel / Account: ${opts.parcelOrAccount}\n`
    : "";
  const opinionLine =
    opts.opinionOfValueCents != null
      ? `Opinion of value: $${(opts.opinionOfValueCents / 100).toLocaleString()}\n`
      : "";

  const subject = `Property Tax Appeal — ${opts.propertyAddress}`;
  const bodyText = [
    `To: ${opts.countyName} Appeals Office`,
    ``,
    `Please find attached my property tax assessment appeal for the ${new Date().getFullYear()} tax year.`,
    ``,
    `Owner: ${opts.ownerName}`,
    `Email: ${opts.ownerEmail}`,
    ...(opts.ownerPhone ? [`Phone: ${opts.ownerPhone}`] : []),
    `Property: ${opts.propertyAddress}`,
    parcelLine.trimEnd(),
    opinionLine.trimEnd(),
    ``,
    `The attached PDF contains the completed appeal form and supporting comparable sales evidence.`,
    ``,
    `I am filing pro se. AppraiseAI is the software tool that prepared and transmitted this filing on my behalf at my direction; AppraiseAI is not my legal representative.`,
    ``,
    `Please direct any correspondence to ${opts.ownerEmail}.`,
    ``,
    `Thank you,`,
    `${opts.ownerName}`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  return { subject, bodyText };
}
