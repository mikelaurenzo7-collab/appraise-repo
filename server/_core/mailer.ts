/**
 * Provider-agnostic email sender.
 *
 * Primary backend: Resend (https://resend.com) — REST API, no SDK needed.
 * Configure via:
 *   RESEND_API_KEY   — required for live sending
 *   EMAIL_FROM       — default From address (e.g. "AppraiseAI <noreply@appraise-ai.com>")
 *
 * If RESEND_API_KEY is missing the sender falls back to STUB mode: it logs
 * the email and returns a synthetic message id. This keeps tests and
 * unconfigured dev environments working.
 */

import crypto from "crypto";
import { scopedLogger } from "./logger";

const log = scopedLogger("Mailer");

export interface MailAttachment {
  filename: string;
  /** Either a Buffer (preferred) or pre-encoded base64 string. */
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SendMailResult {
  messageId: string;
  stubbed: boolean;
}

function defaultFrom(): string {
  return process.env.EMAIL_FROM || "AppraiseAI <noreply@appraise-ai.com>";
}

function isStubMode(): boolean {
  return process.env.EMAIL_DELIVERY_STUB === "1" || !process.env.RESEND_API_KEY;
}

export async function sendMail(opts: SendMailOptions): Promise<SendMailResult> {
  if (isStubMode()) {
    const hash = crypto.createHash("sha1");
    hash.update(JSON.stringify({ to: opts.to, subject: opts.subject }));
    if (opts.attachments) {
      for (const a of opts.attachments) {
        if (Buffer.isBuffer(a.content)) hash.update(a.content);
        else hash.update(a.content);
      }
    }
    log.info(
      `[Mailer] STUB: would send "${opts.subject}" to ${Array.isArray(opts.to) ? opts.to.join(",") : opts.to}` +
        (opts.attachments?.length ? ` (${opts.attachments.length} attachment(s))` : "")
    );
    return {
      messageId: `stub-${hash.digest("hex").slice(0, 24)}@appraiseai.local`,
      stubbed: true,
    };
  }

  const apiKey = process.env.RESEND_API_KEY!;
  const body: Record<string, unknown> = {
    from: opts.from || defaultFrom(),
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
  };
  if (opts.cc) body.cc = Array.isArray(opts.cc) ? opts.cc : [opts.cc];
  if (opts.bcc) body.bcc = Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc];
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.html) body.html = opts.html;
  if (opts.text) body.text = opts.text;
  if (opts.headers) body.headers = opts.headers;
  if (opts.tags) {
    body.tags = Object.entries(opts.tags).map(([name, value]) => ({ name, value }));
  }
  if (opts.attachments?.length) {
    body.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
      content_type: a.contentType,
    }));
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Resend error ${resp.status}: ${text.slice(0, 500)}`);
  }

  const json = (await resp.json().catch(() => ({}))) as { id?: string };
  return {
    messageId: json.id || `sent-${crypto.randomBytes(6).toString("hex")}@resend`,
    stubbed: false,
  };
}
