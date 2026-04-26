/**
 * Delivery dispatcher.
 *
 * Single entry point the filing queue calls. Given a queued filing job:
 *   1. Load the county and the submission.
 *   2. Resolve the channel (county.preferredChannel, with fallback if the
 *      preferred isn't viable — e.g. portal without a verified recipe).
 *   3. Build the PDF evidence packet and hand off to the right channel
 *      service (portal / Lob / email).
 *   4. Return a normalized DispatchResult the queue can persist on the
 *      filing_jobs row.
 *
 * The design goal is that the queue worker stays channel-agnostic: it
 * updates `status`, stashes a few channel-specific artifact fields, and
 * tells the user "your appeal is filed" regardless of how the bits
 * physically reached the county.
 */

import {
  getPropertySubmissionById,
  getPropertyAnalysisBySubmissionId,
  getReportJobBySubmissionId,
  getCountyById,
  getActiveRecipeForCounty,
} from "../db";
import { storageGet } from "../storage";
import type { County, FilingJob } from "../../drizzle/schema";
import { sendLobLetter, type LobServiceLevel } from "./lobDelivery";
import { sendAppealEmail, buildAppealEmailBody } from "./emailDelivery";

export type DeliveryChannel =
  | "portal"
  | "mail_certified"
  | "mail_first_class"
  | "email";

export interface DispatchRequest {
  job: FilingJob;
  countyId: number;
  perRunInputs: Record<string, string | number | null>;
}

export interface DispatchResult {
  success: boolean;
  channelUsed: DeliveryChannel;
  // At most one of these artifact sets will be populated.
  portalConfirmationNumber?: string;
  portalScreenshot?: Buffer;
  portalExecutionLog?: unknown[];
  mailTrackingNumber?: string;
  lobLetterId?: string;
  lobExpectedDeliveryDate?: Date;
  emailMessageId?: string;
  emailRecipient?: string;
  errorMessage?: string;
}

export class DispatchError extends Error {
  constructor(message: string, public readonly retryable = false) {
    super(message);
    this.name = "DispatchError";
  }
}

/**
 * Picks the delivery channel we'll actually use for this filing.
 * Falls back automatically when the preferred channel isn't viable:
 *   - preferred=portal but no verified recipe → fallbackChannel
 *   - preferred=email but no intake email on file → fallbackChannel
 *   - preferred=mail_* but no mailing address on file → throws (bug)
 */
export async function resolveChannel(county: County): Promise<DeliveryChannel | "unsupported"> {
  const preferred = county.preferredChannel;
  if (preferred === "unsupported") return "unsupported";

  if (preferred === "portal") {
    const recipe = await getActiveRecipeForCounty(county.id);
    const recipeUsable =
      recipe &&
      (recipe.verificationStatus === "verified" ||
        recipe.verificationStatus === "staging" ||
        process.env.ALLOW_DRAFT_RECIPES === "1");
    if (recipeUsable) return "portal";
    // Fall through to fallback.
  }

  if (preferred === "email") {
    if (county.intakeEmail && county.intakeEmail.includes("@")) return "email";
  }

  if (preferred === "mail_certified" || preferred === "mail_first_class") {
    const hasAddress =
      !!county.mailingAddressLine1 &&
      !!county.mailingAddressCity &&
      !!county.mailingAddressState &&
      !!county.mailingAddressZip;
    if (hasAddress) return preferred;
  }

  // Consider fallback if preferred didn't work out.
  const fb = county.fallbackChannel;
  if (fb === "unsupported" || fb == null) return "unsupported";

  if (fb === "email") {
    if (county.intakeEmail && county.intakeEmail.includes("@")) return "email";
    return "unsupported";
  }
  if (fb === "mail_certified" || fb === "mail_first_class") {
    const hasAddress =
      !!county.mailingAddressLine1 &&
      !!county.mailingAddressCity &&
      !!county.mailingAddressState &&
      !!county.mailingAddressZip;
    return hasAddress ? fb : "unsupported";
  }

  return "unsupported";
}

/**
 * Fetch the generated appeal PDF for a submission. The dispatcher needs
 * this for mail + email channels. The portal channel fetches it inside
 * the executor for upload into the portal form.
 */
async function loadAppealPdf(
  submissionId: number
): Promise<{ buffer: Buffer; filename: string } | null> {
  const reportJob = await getReportJobBySubmissionId(submissionId);
  if (!reportJob?.reportKey) return null;
  try {
    const { url } = await storageGet(reportJob.reportKey);
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());
    return { buffer, filename: `AppraiseAI-Appeal-${submissionId}.pdf` };
  } catch (err) {
    console.warn("[Dispatcher] Could not fetch report PDF:", err);
    return null;
  }
}

export async function dispatchFiling(req: DispatchRequest): Promise<DispatchResult> {
  const county = await getCountyById(req.countyId);
  if (!county) {
    return {
      success: false,
      channelUsed: "mail_first_class", // placeholder; we throw via errorMessage
      errorMessage: "County not found",
    };
  }

  const channel = await resolveChannel(county);
  if (channel === "unsupported") {
    return {
      success: false,
      channelUsed: "mail_first_class",
      errorMessage: "No viable delivery channel configured for this county",
    };
  }

  const submission = await getPropertySubmissionById(req.job.submissionId);
  if (!submission) {
    return {
      success: false,
      channelUsed: channel,
      errorMessage: "Submission not found",
    };
  }

  const analysis = await getPropertyAnalysisBySubmissionId(req.job.submissionId);

  // Portal path: delegate to the Playwright executor via the existing recipe
  // engine. This branch lives in playwrightExecutor.ts; we import lazily so
  // mail/email paths don't pay the Playwright dep cost.
  if (channel === "portal") {
    const recipe = await getActiveRecipeForCounty(county.id);
    if (!recipe) {
      return {
        success: false,
        channelUsed: "portal",
        errorMessage: "Active recipe disappeared between resolve and dispatch",
      };
    }
    const { parseRecipe, planRecipe } = await import("./filingRecipeEngine");
    const parsed = parseRecipe(recipe.steps);
    parsed.portalUrl = recipe.portalUrl;
    parsed.countyId = recipe.countyId;
    parsed.version = recipe.version;

    const pdf = await loadAppealPdf(req.job.submissionId);

    const plan = planRecipe(parsed, {
      user: {
        accountNumber: req.perRunInputs.accountNumber as string | undefined,
        taxpayerPin: req.perRunInputs.taxpayerPin as string | undefined,
        ownerName:
          (req.perRunInputs.ownerName as string | undefined) ??
          submission.email?.split("@")[0],
        ownerEmail: submission.email,
        address: submission.address,
        city: submission.city ?? undefined,
        state: submission.state ?? undefined,
        zip: submission.zipCode ?? undefined,
      },
      analysis: {
        marketValueEstimate:
          analysis?.marketValueEstimate ?? submission.marketValue ?? undefined,
        assessmentGap: analysis?.assessmentGap ?? undefined,
        appealStrengthScore: submission.appealStrengthScore ?? undefined,
      },
      submission: {
        assessedValue: submission.assessedValue ?? undefined,
        propertyType: submission.propertyType ?? undefined,
      },
      report: { pdfUrl: null },
    });

    const { executeRecipe } = await import("./playwrightExecutor");
    const result = await executeRecipe(plan.steps, {
      reportPdfBuffer: pdf?.buffer,
      reportPdfFilename: pdf?.filename,
    });
    return {
      success: result.success,
      channelUsed: "portal",
      portalConfirmationNumber: result.portalConfirmationNumber,
      portalScreenshot: result.finalScreenshot,
      portalExecutionLog: result.executionLog,
      errorMessage: result.errorMessage,
    };
  }

  // Mail + email paths share the same PDF prerequisite.
  const pdf = await loadAppealPdf(req.job.submissionId);
  if (!pdf) {
    return {
      success: false,
      channelUsed: channel,
      errorMessage:
        "No appeal PDF available to deliver. Generate the report before filing.",
    };
  }

  if (channel === "mail_certified" || channel === "mail_first_class") {
    if (
      !county.mailingAddressLine1 ||
      !county.mailingAddressCity ||
      !county.mailingAddressState ||
      !county.mailingAddressZip
    ) {
      return {
        success: false,
        channelUsed: channel,
        errorMessage: "County mailing address is not configured",
      };
    }

    const serviceLevel: LobServiceLevel =
      channel === "mail_certified" ? "certified_return_receipt" : "first_class";

    try {
      const result = await sendLobLetter({
        toAddress: {
          name: county.mailingAddressName ?? `${county.countyName} Appeals Office`,
          addressLine1: county.mailingAddressLine1,
          addressLine2: county.mailingAddressLine2 ?? undefined,
          city: county.mailingAddressCity,
          state: county.mailingAddressState,
          zip: county.mailingAddressZip,
        },
        fromAddress: {
          name:
            (req.perRunInputs.ownerName as string | undefined) ??
            submission.email?.split("@")[0] ??
            "Property Owner",
          addressLine1: submission.address,
          city: submission.city ?? "",
          state: submission.state ?? "",
          zip: submission.zipCode ?? "",
        },
        pdfBuffer: pdf.buffer,
        description: `Appraisal appeal for submission ${submission.id}`,
        serviceLevel,
        metadata: {
          submissionId: String(submission.id),
          filingJobId: String(req.job.id),
        },
      });
      return {
        success: true,
        channelUsed: channel,
        mailTrackingNumber: result.trackingNumber ?? undefined,
        lobLetterId: result.letterId,
        lobExpectedDeliveryDate: result.expectedDeliveryDate ?? undefined,
      };
    } catch (err) {
      return {
        success: false,
        channelUsed: channel,
        errorMessage:
          err instanceof Error ? err.message : "Lob delivery failed",
      };
    }
  }

  if (channel === "email") {
    if (!county.intakeEmail) {
      return {
        success: false,
        channelUsed: "email",
        errorMessage: "County intake email is not configured",
      };
    }
    const ownerName =
      (req.perRunInputs.ownerName as string | undefined) ??
      submission.email?.split("@")[0] ??
      "Property Owner";
    const { subject, bodyText } = buildAppealEmailBody({
      ownerName,
      ownerEmail: submission.email,
      ownerPhone: submission.phone ?? undefined,
      propertyAddress: submission.address,
      parcelOrAccount: req.perRunInputs.accountNumber as string | undefined,
      countyName: county.countyName,
      opinionOfValueCents: analysis?.marketValueEstimate
        ? analysis.marketValueEstimate * 100
        : undefined,
    });
    try {
      const result = await sendAppealEmail({
        toEmail: county.intakeEmail,
        ccEmail: submission.email,
        subject,
        bodyText,
        pdfBuffer: pdf.buffer,
        pdfFilename: pdf.filename,
        metadata: {
          submissionId: String(submission.id),
          filingJobId: String(req.job.id),
        },
      });
      return {
        success: true,
        channelUsed: "email",
        emailMessageId: result.messageId,
        emailRecipient: county.intakeEmail,
      };
    } catch (err) {
      return {
        success: false,
        channelUsed: "email",
        errorMessage:
          err instanceof Error ? err.message : "Email delivery failed",
      };
    }
  }

  // Unreachable if TypeScript narrowed correctly, but guard anyway.
  return {
    success: false,
    channelUsed: channel,
    errorMessage: `Unhandled channel: ${channel}`,
  };
}
