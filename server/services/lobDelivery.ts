/**
 * Lob certified-mail delivery service.
 *
 * Wraps the Lob Letters API (https://docs.lob.com/#tag/Letters). Lob is the
 * industry-standard print-and-mail service for developers — we POST a PDF
 * plus a recipient address, their regional print partners print the piece
 * and drop it at USPS the same business day. For appeal filings we use
 * Certified Mail with Return Receipt Requested, which gives us:
 *
 *   - USPS tracking number (the "mailTrackingNumber" we store on the job)
 *   - Proof-of-delivery signature (returned days later via webhook)
 *   - First-class postmark, which is the evidentiary standard every ARB
 *     accepts for timely filing
 *
 * Cost: ~$8/letter for certified+RR, ~$2/letter for First Class tracked.
 *
 * The module is designed so the server and tests can import it without a
 * live Lob API key. If LOB_API_KEY is absent or LOB_STUB=1, calls are
 * simulated end-to-end with realistic shapes.
 */

import crypto from "crypto";

export type LobServiceLevel = "first_class" | "certified" | "certified_return_receipt";

export interface LobAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string; // 2-letter
  zip: string;
  country?: string; // defaults to "US"
}

export interface LobSendParams {
  toAddress: LobAddress;
  fromAddress: LobAddress;
  pdfBuffer: Buffer;
  description: string; // shows up in Lob dashboard, not on letter
  serviceLevel: LobServiceLevel;
  metadata?: Record<string, string>;
}

export interface LobSendResult {
  letterId: string;
  trackingNumber: string | null;
  expectedDeliveryDate: Date | null;
  carrier: string;
  serviceLevel: LobServiceLevel;
  // Raw API response, stored for debugging.
  raw?: unknown;
}

export class LobDeliveryError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "LobDeliveryError";
  }
}

const LOB_API_BASE = "https://api.lob.com/v1";

function isStubMode(): boolean {
  return process.env.LOB_STUB === "1" || !process.env.LOB_API_KEY;
}

function buildAuthHeader(): string {
  const key = process.env.LOB_API_KEY ?? "";
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function serializeAddress(addr: LobAddress): Record<string, string> {
  return {
    name: addr.name,
    address_line1: addr.addressLine1,
    ...(addr.addressLine2 ? { address_line2: addr.addressLine2 } : {}),
    address_city: addr.city,
    address_state: addr.state,
    address_zip: addr.zip,
    address_country: addr.country ?? "US",
  };
}

/**
 * Send a letter via Lob. In stub mode (no LOB_API_KEY or LOB_STUB=1),
 * returns a deterministic fake response derived from the PDF hash so
 * tests and dev environments have stable tracking numbers.
 */
export async function sendLobLetter(params: LobSendParams): Promise<LobSendResult> {
  if (isStubMode()) {
    const hash = crypto
      .createHash("sha1")
      .update(params.pdfBuffer)
      .update(params.toAddress.zip)
      .digest("hex");
    const letterId = `ltr_stub_${hash.slice(0, 20)}`;
    const tracking = `9407${hash.slice(0, 16).replace(/[^0-9]/g, "0").slice(0, 16)}`;
    const eta = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    return {
      letterId,
      trackingNumber: tracking,
      expectedDeliveryDate: eta,
      carrier: "USPS",
      serviceLevel: params.serviceLevel,
      raw: { stub: true },
    };
  }

  const form = new FormData();
  const toFields = serializeAddress(params.toAddress);
  const fromFields = serializeAddress(params.fromAddress);
  for (const [k, v] of Object.entries(toFields)) form.append(`to[${k}]`, v);
  for (const [k, v] of Object.entries(fromFields)) form.append(`from[${k}]`, v);
  // Copy into a plain Uint8Array so we get an ArrayBuffer (not SharedArrayBuffer)
  // — TS's Blob constructor rejects Node's Buffer<ArrayBufferLike>.
  const pdfBytes = new Uint8Array(params.pdfBuffer);
  form.append(
    "file",
    new Blob([pdfBytes], { type: "application/pdf" }),
    "filing.pdf"
  );
  form.append("description", params.description.slice(0, 255));
  form.append("color", "false"); // black-and-white is cheaper and fine for filings
  if (params.serviceLevel === "certified" || params.serviceLevel === "certified_return_receipt") {
    form.append("extra_service", "certified");
    if (params.serviceLevel === "certified_return_receipt") {
      form.append("return_envelope", "true");
    }
  }
  if (params.metadata) {
    for (const [k, v] of Object.entries(params.metadata)) {
      form.append(`metadata[${k}]`, String(v));
    }
  }

  const resp = await fetch(`${LOB_API_BASE}/letters`, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(),
      "Lob-Version": "2020-02-11",
    },
    body: form as any,
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new LobDeliveryError(
      `Lob letter send failed (${resp.status}): ${body.slice(0, 500)}`,
      resp.status
    );
  }

  const json = (await resp.json()) as any;
  return {
    letterId: json.id,
    trackingNumber: json.tracking_number ?? null,
    expectedDeliveryDate: json.expected_delivery_date
      ? new Date(json.expected_delivery_date)
      : null,
    carrier: json.carrier ?? "USPS",
    serviceLevel: params.serviceLevel,
    raw: json,
  };
}

/**
 * Retrieve the latest status of a previously-mailed letter. Used by a
 * background reconciliation job to surface delivery confirmation to the
 * user's dashboard.
 */
export async function getLobLetterStatus(letterId: string): Promise<{
  status: string;
  trackingEvents: Array<{ name: string; time: string; description: string }>;
} | null> {
  if (isStubMode()) {
    return {
      status: "in_transit",
      trackingEvents: [{ name: "mailed", time: new Date().toISOString(), description: "Processed at USPS" }],
    };
  }
  const resp = await fetch(`${LOB_API_BASE}/letters/${letterId}`, {
    headers: { Authorization: buildAuthHeader() },
  });
  if (!resp.ok) return null;
  const json = (await resp.json()) as any;
  return {
    status: json.tracking_events?.slice(-1)?.[0]?.name ?? "unknown",
    trackingEvents: (json.tracking_events ?? []).map((e: any) => ({
      name: e.name,
      time: e.time,
      description: e.description,
    })),
  };
}
