import twilio from 'twilio';

/**
 * Twilio SMS Service
 * Sends SMS notifications for hearing dates, appeal status updates, and important alerts
 * Uses MessagingServiceSid for number management and compliance
 */

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || '';

// Lazy-init client to avoid errors when env vars are missing at import time
let _client: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!_client && accountSid && authToken) {
    _client = twilio(accountSid, authToken);
  }
  return _client;
}

export interface SMSNotification {
  to: string;
  message: string;
  type: 'hearing_scheduled' | 'appeal_filed' | 'appeal_won' | 'appeal_lost' | 'deadline_reminder' | 'status_update';
}

/**
 * Send SMS notification via Twilio MessagingService
 */
export async function sendSMS(notification: SMSNotification): Promise<boolean> {
  try {
    const client = getClient();
    if (!client || !messagingServiceSid) {
      console.warn('[SMS] Twilio credentials not configured, logging instead');
      logSMSLocally(notification);
      return true;
    }

    const message = await client.messages.create({
      body: notification.message,
      messagingServiceSid,
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

  return sendSMS({
    to: phoneNumber,
    message: `Your property tax appeal hearing is scheduled for ${dateStr} in ${county} County. Reply CONFIRM to acknowledge. - AppraiseAI`,
    type: 'hearing_scheduled',
  });
}

/**
 * Send appeal filed notification
 */
export async function notifyAppealFiled(phoneNumber: string, county: string, assessmentValue: number): Promise<boolean> {
  return sendSMS({
    to: phoneNumber,
    message: `Your property tax appeal has been filed in ${county} County. Assessed value: $${assessmentValue.toLocaleString()}. You'll receive updates as the case progresses. - AppraiseAI`,
    type: 'appeal_filed',
  });
}

/**
 * Send appeal won notification
 */
export async function notifyAppealWon(phoneNumber: string, county: string, savingsPerYear: number): Promise<boolean> {
  return sendSMS({
    to: phoneNumber,
    message: `Great news! Your property tax appeal in ${county} County was successful! You'll save approximately $${savingsPerYear.toLocaleString()} per year. Check your account for details. - AppraiseAI`,
    type: 'appeal_won',
  });
}

/**
 * Send appeal lost notification
 */
export async function notifyAppealLost(phoneNumber: string, county: string): Promise<boolean> {
  return sendSMS({
    to: phoneNumber,
    message: `Your property tax appeal in ${county} County was not successful. You have the right to appeal this decision. Contact us for next steps. - AppraiseAI`,
    type: 'appeal_lost',
  });
}

/**
 * Send deadline reminder notification
 */
export async function notifyDeadlineReminder(phoneNumber: string, county: string, daysUntilDeadline: number): Promise<boolean> {
  return sendSMS({
    to: phoneNumber,
    message: `Reminder: Property tax appeal deadline for ${county} County is in ${daysUntilDeadline} days. File now to avoid missing the deadline. - AppraiseAI`,
    type: 'deadline_reminder',
  });
}

/**
 * Send status update notification
 */
export async function notifyStatusUpdate(phoneNumber: string, status: string, details: string): Promise<boolean> {
  return sendSMS({
    to: phoneNumber,
    message: `Status Update: ${status}. ${details}. View full details in your AppraiseAI account. - AppraiseAI`,
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
  const e164Regex = /^\+?[1-9]\d{1,14}$/;
  const usRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  return e164Regex.test(phoneNumber) || usRegex.test(phoneNumber);
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  return `+${cleaned}`;
}

/**
 * Verify Twilio credentials by fetching account info
 */
export async function verifyTwilioCredentials(): Promise<{ valid: boolean; accountName?: string; error?: string }> {
  try {
    const client = getClient();
    if (!client) return { valid: false, error: 'Twilio client not configured' };
    const account = await client.api.accounts(accountSid).fetch();
    return { valid: true, accountName: account.friendlyName };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Failed to verify credentials' };
  }
}
