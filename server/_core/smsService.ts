import twilio from 'twilio';

/**
 * Twilio SMS Service
 * Sends SMS notifications for hearing dates, appeal status updates, and important alerts
 */

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

const client = twilio(accountSid, authToken);

export interface SMSNotification {
  to: string;
  message: string;
  type: 'hearing_scheduled' | 'appeal_filed' | 'appeal_won' | 'appeal_lost' | 'deadline_reminder' | 'status_update';
}

/**
 * Send SMS notification
 */
export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  try {
    if (!accountSid || !authToken || !fromNumber) {
      console.warn('[SMS] Twilio credentials not configured, logging instead');
      logSMSLocally(notification);
      return true;
    }

    const message = await client.messages.create({
      body: notification.message,
      from: fromNumber,
      to: notification.to,
    });

    console.log(`[SMS] Sent ${notification.type} to ${notification.to} (SID: ${message.sid})`);
    return true;
  } catch (error) {
    console.error('[SMS] Failed to send SMS:', error);
    logSMSLocally(notification);
    return false;
  }
}

/**
 * Send hearing scheduled notification
 */
export async function notifyHearingScheduled(phoneNumber: string, hearingDate: Date, county: string): Promise<boolean> {
  const dateStr = hearingDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const message = `🎯 Your property tax appeal hearing is scheduled for ${dateStr} in ${county} County. Reply CONFIRM to acknowledge.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'hearing_scheduled',
  });
}

/**
 * Send appeal filed notification
 */
export async function notifyAppealFiled(phoneNumber: string, county: string, assessmentValue: number): Promise<boolean> {
  const message = `✅ Your property tax appeal has been filed in ${county} County. Assessed value: $${assessmentValue.toLocaleString()}. You'll receive updates as the case progresses.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'appeal_filed',
  });
}

/**
 * Send appeal won notification
 */
export async function notifyAppealWon(phoneNumber: string, county: string, savingsPerYear: number): Promise<boolean> {
  const message = `🎉 Great news! Your property tax appeal was successful! You'll save approximately $${savingsPerYear.toLocaleString()} per year. Check your account for details.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'appeal_won',
  });
}

/**
 * Send appeal lost notification
 */
export async function notifyAppealLost(phoneNumber: string, county: string): Promise<boolean> {
  const message = `📋 Your property tax appeal in ${county} County was not successful. You have the right to appeal this decision. Contact us for next steps.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'appeal_lost',
  });
}

/**
 * Send deadline reminder notification
 */
export async function notifyDeadlineReminder(phoneNumber: string, county: string, daysUntilDeadline: number): Promise<boolean> {
  const message = `⏰ Reminder: Property tax appeal deadline for ${county} County is in ${daysUntilDeadline} days. File now to avoid missing the deadline.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'deadline_reminder',
  });
}

/**
 * Send status update notification
 */
export async function notifyStatusUpdate(phoneNumber: string, status: string, details: string): Promise<boolean> {
  const message = `📌 Status Update: ${status}. ${details}. View full details in your AppraiseAI account.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'status_update',
  });
}

/**
 * Log SMS locally (for testing or when Twilio is not configured)
 */
function logSMSLocally(notification: SMSNotification) {
  console.log(`[SMS LOCAL] To: ${notification.to}`);
  console.log(`[SMS LOCAL] Type: ${notification.type}`);
  console.log(`[SMS LOCAL] Message: ${notification.message}`);
}

/**
 * Verify phone number format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Simple validation: E.164 format or US format
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  const usRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

  return e164Regex.test(phoneNumber) || usRegex.test(phoneNumber);
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // If 10 digits, assume US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // If 11 digits starting with 1, assume US number
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise, add + prefix
  return `+${cleaned}`;
}
