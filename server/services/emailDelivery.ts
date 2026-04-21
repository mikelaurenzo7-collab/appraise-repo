/**
 * Email delivery service for appeal filings.
 *
 * Used when a county publishes an official intake email address and
 * explicitly treats emailed filings as equivalent to mail (FL Orange
 * County, a handful of smaller jurisdictions). We send the user's filled
 * appeal PDF as an attachment, with a short professional body and the
 * user's contact info in the body so the assessor's mailroom can reply.
 *
 * Provider is abstracted behind a thin send function. We prefer the
 * existing Forge email integration (BUILT_IN_FORGE_API_URL /
 * BUILT_IN_FORGE_API_KEY) when configured; otherwise the stub mode logs
 * the email and returns a synthetic message id so tests and dev
 * environments work without credentials.
 */

import crypto from "crypto";

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

function isStubMode(): boolean {
  return (
    process.env.EMAIL_DELIVERY_STUB === "1" ||
    !process.env.BUILT_IN_FORGE_API_URL ||
    !process.env.BUILT_IN_FORGE_API_KEY
  );
}

export async function sendAppealEmail(
  params: AppealEmailParams
): Promise<AppealEmailResult> {
  if (isStubMode()) {
    const hash = crypto
      .createHash("sha1")
      .update(params.pdfBuffer)
      .update(params.toEmail)
      .digest("hex");
    console.log(
      `[EmailDelivery] STUB: would send ${params.pdfBuffer.length}-byte PDF to ${params.toEmail}`
    );
    return {
      messageId: `stub-${hash.slice(0, 24)}@appraiseai.local`,
      stubbed: true,
    };
  }

  const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL!;
  const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY!;

  // Forge's email endpoint is JSON with a base64-encoded attachment payload.
  const resp = await fetch(`${forgeApiUrl}/email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${forgeApiKey}`,
    },
    body: JSON.stringify({
      to: params.toEmail,
      ...(params.ccEmail ? { cc: params.ccEmail } : {}),
      subject: params.subject,
      text: params.bodyText,
      attachments: [
        {
          filename: params.pdfFilename,
          content: params.pdfBuffer.toString("base64"),
          contentType: "application/pdf",
        },
      ],
      metadata: params.metadata ?? {},
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new EmailDeliveryError(
      `Email delivery failed (${resp.status}): ${body.slice(0, 500)}`
    );
  }

  const json = (await resp.json().catch(() => ({}))) as { messageId?: string };
  return {
    messageId: json.messageId || `sent-${crypto.randomBytes(6).toString("hex")}@appraiseai`,
    stubbed: false,
  };
}

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
