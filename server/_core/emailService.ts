import { invokeLLM } from "./llm";
import { buildAppUrl } from "./appUrl";

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

export interface AnalysisConfirmationEmail {
  userEmail: string;
  userName: string;
  propertyAddress: string;
  appealStrengthScore: number;
}

export interface PaymentConfirmationEmail {
  userEmail: string;
  userName: string;
  amount: number;
  propertyAddress: string;
  transactionId: string;
}

export interface AppealFiledEmail {
  userEmail: string;
  userName: string;
  propertyAddress: string;
  filingDate: string;
  appealDeadline: string;
}

export interface AppealResultEmail {
  userEmail: string;
  userName: string;
  propertyAddress: string;
  result: "won" | "lost" | "pending";
  assessmentReduction?: number;
  annualSavings?: number;
}

export interface ReportCompletionEmail {
  userEmail: string;
  userName: string;
  propertyAddress: string;
  reportUrl: string;
  appealStrengthScore: number;
  downloadExpiresAt: string;
  // Optional: link to in-app download page that mints a fresh presigned URL.
  // Preferred over reportUrl in the email CTA because presigned URLs expire.
  downloadPageUrl?: string;
}

export interface FilingSubmittedEmail {
  userEmail: string;
  userName: string;
  propertyAddress: string;
  countyName: string;
  deliveryChannel: "portal" | "mail_certified" | "mail_first_class" | "email";
  portalConfirmationNumber?: string | null;
  mailTrackingNumber?: string | null;
  expectedDeliveryDate?: string | null;
  emailRecipient?: string | null;
  dashboardUrl: string;
}

export interface FilingDeadlineReminderEmail {
  userEmail: string;
  userName: string;
  propertyAddress: string;
  countyName: string;
  daysRemaining: number;
  windowEndDate: string;
  dashboardUrl: string;
}

/**
 * Send analysis confirmation email
 */
export async function sendAnalysisConfirmationEmail(data: AnalysisConfirmationEmail): Promise<boolean> {
  try {
    const scoreColor = data.appealStrengthScore >= 70 ? "#10B981" : data.appealStrengthScore >= 40 ? "#FBBF24" : "#EF4444";
    const scoreLabel = data.appealStrengthScore >= 70 ? "Strong" : data.appealStrengthScore >= 40 ? "Moderate" : "Weak";

    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #0D9488 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Analysis Complete!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your property appraisal is ready</p>
        </div>
        <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
          <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
            We've completed the AI analysis of your property at <strong>${data.propertyAddress}</strong>. Your appeal strength score is:
          </p>
          <div style="background: white; border: 2px solid ${scoreColor}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">${data.appealStrengthScore}%</div>
            <div style="color: ${scoreColor}; font-weight: 600; margin-top: 8px;">${scoreLabel} Appeal Potential</div>
          </div>
          <p style="margin: 20px 0; color: #64748B; line-height: 1.6;">
            This score indicates the likelihood of successfully challenging your property tax assessment. A higher score means stronger evidence for your appeal.
          </p>
          <div style="background: #F0F4FF; border-left: 4px solid #7C3AED; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0F172A; font-weight: 600;">Next Steps:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #64748B;">
              <li>Review your detailed appraisal report</li>
              <li>Upload supporting photos and documents</li>
              <li>Choose your filing method (POA or Pro Se)</li>
              <li>We handle the rest!</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl("/analysis")}" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Your Analysis</a>
          </div>
          <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
            Questions? Contact our support team at support@appraise-ai.com
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: data.userEmail,
      subject: `Your Property Analysis is Ready - ${data.appealStrengthScore}% Appeal Strength`,
      html,
    });
  } catch (error) {
    console.error("Failed to send analysis confirmation email:", error);
    return false;
  }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(data: PaymentConfirmationEmail): Promise<boolean> {
  try {
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10B981 0%, #0D9488 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Payment Received</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appeal filing is now in progress</p>
        </div>
        <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
          <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
            Thank you for using AppraiseAI to prepare and file your pro-se property tax appeal for <strong>${data.propertyAddress}</strong>.
          </p>
          <div style="background: white; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Flat-fee filing</div>
                <div style="font-size: 24px; font-weight: bold; color: #0F172A; margin-top: 4px;">$${(data.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Transaction ID</div>
                <div style="font-size: 14px; font-weight: 600; color: #0F172A; margin-top: 4px; font-family: monospace;">${data.transactionId}</div>
              </div>
            </div>
          </div>
          <div style="background: #F0F4FF; border-left: 4px solid #7C3AED; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0F172A; font-weight: 600;">What Happens Next:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #64748B;">
              <li>We prepare your appeal packet and transmit it to the county on your behalf as a scrivener</li>
              <li>You'll receive delivery confirmation (portal receipt, USPS tracking, or email) once it's filed</li>
              <li>The county corresponds with <em>you</em> as the pro-se filer — we forward any notices we receive</li>
              <li>60-day money-back guarantee: if your appeal is denied, we refund your fee on request</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl("/dashboard")}" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Track Your Appeal</a>
          </div>
          <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
            Questions? Contact our support team at support@appraise-ai.com
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: data.userEmail,
      subject: `Payment Confirmed - Appeal Filing in Progress`,
      html,
    });
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error);
    return false;
  }
}

/**
 * Send appeal filed email
 */
export async function sendAppealFiledEmail(data: AppealFiledEmail): Promise<boolean> {
  try {
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #0D9488 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Appeal Filed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your property tax appeal has been officially submitted</p>
        </div>
        <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
          <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
            Great news! Your property tax appeal for <strong>${data.propertyAddress}</strong> has been officially filed with the local assessor's office.
          </p>
          <div style="background: white; border: 2px solid #FBBF24; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Filed Date</div>
                <div style="font-size: 16px; font-weight: bold; color: #0F172A; margin-top: 4px;">${data.filingDate}</div>
              </div>
              <div>
                <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Appeal Deadline</div>
                <div style="font-size: 16px; font-weight: bold; color: #EF4444; margin-top: 4px;">${data.appealDeadline}</div>
              </div>
            </div>
          </div>
          <div style="background: #F0F4FF; border-left: 4px solid #7C3AED; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0F172A; font-weight: 600;">Timeline:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #64748B;">
              <li>Assessor reviews our evidence package</li>
              <li>Appraisal Review Board schedules hearing (typically 30-60 days)</li>
              <li>We represent you at the hearing</li>
              <li>Decision issued within 30 days of hearing</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl("/dashboard")}" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Appeal Status</a>
          </div>
          <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
            Questions? Contact our support team at support@appraise-ai.com
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: data.userEmail,
      subject: `Appeal Filed - Your Case is Now Active`,
      html,
    });
  } catch (error) {
    console.error("Failed to send appeal filed email:", error);
    return false;
  }
}

/**
 * Send report completion email
 */
export async function sendReportCompletionEmail(data: ReportCompletionEmail): Promise<boolean> {
  try {
    const scoreColor = data.appealStrengthScore >= 70 ? "#10B981" : data.appealStrengthScore >= 40 ? "#FBBF24" : "#EF4444";
    const scoreLabel = data.appealStrengthScore >= 70 ? "Strong" : data.appealStrengthScore >= 40 ? "Moderate" : "Weak";

    const downloadHref = data.downloadPageUrl || data.reportUrl;
    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #0D9488 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Your Report is Ready!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your certified appraisal report is now available</p>
        </div>
        <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
          <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
            Your certified property appraisal report for <strong>${data.propertyAddress}</strong> has been generated and is ready for download.
          </p>
          <div style="background: white; border: 2px solid ${scoreColor}; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 48px; font-weight: bold; color: ${scoreColor};">${data.appealStrengthScore}%</div>
            <div style="color: ${scoreColor}; font-weight: 600; margin-top: 8px;">${scoreLabel} Appeal Potential</div>
          </div>
          <div style="background: #F0F4FF; border-left: 4px solid #7C3AED; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0F172A; font-weight: 600;">Report Details:</p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #64748B;">
              <li>50-60 page certified appraisal report</li>
              <li>Comparable sales analysis (comps)</li>
              <li>Market data and trends</li>
              <li>USPAP-compliant methodology</li>
              <li>Ready for legal proceedings</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadHref}" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Download Report</a>
          </div>
          <p style="margin: 20px 0 0 0; color: #94A3B8; font-size: 12px;">
            <strong>Download expires:</strong> ${data.downloadExpiresAt}
          </p>
          <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
            Questions? Contact our support team at support@appraise-ai.com
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: data.userEmail,
      subject: `Your Certified Appraisal Report is Ready - ${data.propertyAddress}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send report completion email:", error);
    return false;
  }
}

/**
 * Send appeal result email
 */
export async function sendAppealResultEmail(data: AppealResultEmail): Promise<boolean> {
  try {
    const resultColor = data.result === "won" ? "#10B981" : data.result === "lost" ? "#EF4444" : "#FBBF24";
    const resultLabel = data.result === "won" ? "Appeal Won!" : data.result === "lost" ? "Appeal Denied" : "Decision Pending";
    const resultMessage = data.result === "won"
      ? `Congratulations! Your appeal was successful. Your property assessment has been reduced by $${(data.assessmentReduction || 0).toLocaleString()}, saving you $${(data.annualSavings || 0).toLocaleString()} per year.`
      : data.result === "lost"
      ? "Unfortunately, your appeal was not successful at this time. You may have the right to file additional appeals or seek legal counsel."
      : "Your appeal decision is still pending. We'll notify you as soon as we receive the official decision.";

    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${resultColor} 0%, ${resultColor}dd 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${resultLabel}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your property tax appeal decision is here</p>
        </div>
        <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
          <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
            ${resultMessage}
          </p>
          ${data.result === "won" ? `
            <div style="background: white; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Assessment Reduced</div>
                  <div style="font-size: 24px; font-weight: bold; color: #10B981; margin-top: 4px;">$${(data.assessmentReduction || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Annual Savings</div>
                  <div style="font-size: 24px; font-weight: bold; color: #10B981; margin-top: 4px;">$${(data.annualSavings || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ` : ""}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${buildAppUrl("/dashboard")}" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Details</a>
          </div>
          <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
            Questions? Contact our support team at support@appraise-ai.com
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: data.userEmail,
      subject: `Appeal Decision: ${resultLabel} - ${data.propertyAddress}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send appeal result email:", error);
    return false;
  }
}

/**
 * Generic email sending function
 * In production, this would integrate with SendGrid, Mailgun, or AWS SES
 */
async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    // Use Manus built-in email service via Forge API
    const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!forgeApiUrl || !forgeApiKey) {
      console.warn("[Email] Forge API credentials not configured, logging email only");
      console.log(`[Email] To: ${template.to}`);
      console.log(`[Email] Subject: ${template.subject}`);
      return true;
    }

    const response = await fetch(`${forgeApiUrl}/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgeApiKey}`,
      },
      body: JSON.stringify({
        to: template.to,
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Email] Failed to send: ${response.status} ${error}`);
      return false;
    }

    console.log(`[Email] Successfully sent to ${template.to}: ${template.subject}`);
    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

/**
 * Filing-submitted confirmation — the single most important trust moment
 * in the user flow. Hits their inbox the instant the dispatcher finishes,
 * with the exact artifact they can use to verify: USPS tracking link,
 * portal confirmation #, or email delivery receipt.
 */
export async function sendFilingSubmittedEmail(data: FilingSubmittedEmail): Promise<boolean> {
  const channelCopy = (() => {
    switch (data.deliveryChannel) {
      case "portal":
        return {
          headline: "Filed through your county portal",
          detail: `Your appeal was submitted directly through ${data.countyName}'s online portal. Confirmation below.`,
          artifactLabel: "Portal confirmation #",
          artifactValue: data.portalConfirmationNumber ?? "—",
          trackingUrl: null as string | null,
        };
      case "mail_certified":
        return {
          headline: "Filed via USPS Certified Mail + return receipt",
          detail: `Your appeal was printed and mailed certified to ${data.countyName}. You'll see the delivery signature in your dashboard within 3–5 business days.`,
          artifactLabel: "USPS tracking #",
          artifactValue: data.mailTrackingNumber ?? "—",
          trackingUrl: data.mailTrackingNumber
            ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(data.mailTrackingNumber)}`
            : null,
        };
      case "mail_first_class":
        return {
          headline: "Filed via USPS First Class + tracking",
          detail: `Your appeal was printed and mailed to ${data.countyName}. Expected delivery in 3–5 business days.`,
          artifactLabel: "USPS tracking #",
          artifactValue: data.mailTrackingNumber ?? "—",
          trackingUrl: data.mailTrackingNumber
            ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(data.mailTrackingNumber)}`
            : null,
        };
      case "email":
        return {
          headline: "Filed via county intake email",
          detail: `Your appeal was emailed to ${data.emailRecipient ?? data.countyName}. You've been CC'd so you have a copy on file.`,
          artifactLabel: "Recipient",
          artifactValue: data.emailRecipient ?? data.countyName,
          trackingUrl: null,
        };
    }
  })();

  const etaBlock = data.expectedDeliveryDate
    ? `<p style="margin: 8px 0 0 0; color: #64748B; font-size: 13px;">Expected delivery: <strong>${new Date(
        data.expectedDeliveryDate
      ).toLocaleDateString()}</strong></p>`
    : "";

  const trackingBlock = channelCopy.trackingUrl
    ? `<div style="text-align: center; margin: 18px 0;">
         <a href="${channelCopy.trackingUrl}" style="color: #7C3AED; font-weight: 600; text-decoration: underline;">
           Track with USPS →
         </a>
       </div>`
    : "";

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7C3AED 0%, #10B981 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Appeal filed.</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${channelCopy.headline}</p>
      </div>
      <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
        <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
          ${channelCopy.detail}
        </p>
        <div style="background: white; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 6px 0; color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Property</p>
          <p style="margin: 0 0 18px 0; color: #0F172A; font-weight: 600;">${data.propertyAddress}</p>
          <p style="margin: 0 0 6px 0; color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">${channelCopy.artifactLabel}</p>
          <p style="margin: 0; color: #7C3AED; font-family: monospace; font-size: 15px; font-weight: 600;">${channelCopy.artifactValue}</p>
          ${etaBlock}
        </div>
        ${trackingBlock}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background: #0F172A; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Open your dashboard</a>
        </div>
        <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
          AppraiseAI is a software tool. You are the filer of record. Not legal advice.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: data.userEmail,
    subject: `Your property tax appeal was filed — ${data.propertyAddress}`,
    html,
  });
}

/**
 * Deadline reminder — sent 7 days before a county's filing window
 * closes if the user has an analysis but no completed filing for that
 * submission. One email per (submission, windowEndDate) pair via the
 * activityLogs de-duplication key.
 */
export async function sendFilingDeadlineReminderEmail(
  data: FilingDeadlineReminderEmail
): Promise<boolean> {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"} left.</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.92;">${data.countyName} filing window closes ${new Date(data.windowEndDate).toLocaleDateString()}</p>
      </div>
      <div style="background: #F8FAFC; padding: 40px 20px; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 20px 0; color: #0F172A;">Hi ${data.userName},</p>
        <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
          You ran an analysis on <strong>${data.propertyAddress}</strong> but haven't filed your appeal yet. The ${data.countyName} window closes in <strong>${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"}</strong>.
        </p>
        <p style="margin: 0 0 20px 0; color: #64748B; line-height: 1.6;">
          Filing takes about 4 minutes. If we've already pre-filled everything from your analysis, you just review it, sign, and we dispatch to the county.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background: #7C3AED; color: white; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 700; display: inline-block;">File my appeal</a>
        </div>
        <p style="margin: 30px 0 0 0; color: #94A3B8; font-size: 12px; text-align: center;">
          You're receiving this because you ran a free analysis on this property. Unsubscribe at any time from your account settings.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: data.userEmail,
    subject: `${data.daysRemaining} day${data.daysRemaining === 1 ? "" : "s"} left to file — ${data.propertyAddress}`,
    html,
  });
}
