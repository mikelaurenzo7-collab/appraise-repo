import { invokeLLM } from "./llm";

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
            <a href="https://appraise-ai.manus.space/analysis" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Your Analysis</a>
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
            Thank you for choosing AppraiseAI to handle your property tax appeal for <strong>${data.propertyAddress}</strong>.
          </p>
          <div style="background: white; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <div style="color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Contingency Fee (25%)</div>
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
              <li>Our team will file your appeal with the local assessor's office</li>
              <li>You'll receive updates on your appeal status via email</li>
              <li>We handle all communication and hearings on your behalf</li>
              <li>You only pay if we win - this is just our contingency fee placeholder</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://appraise-ai.manus.space/dashboard" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Track Your Appeal</a>
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
            <a href="https://appraise-ai.manus.space/dashboard" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Appeal Status</a>
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
            <a href="https://appraise-ai.manus.space/dashboard" style="background: #7C3AED; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Details</a>
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
    // For now, log the email (in production, integrate with email service)
    console.log(`[Email] Sending to ${template.to}: ${template.subject}`);
    // TODO: Integrate with actual email service (SendGrid, Mailgun, etc.)
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
