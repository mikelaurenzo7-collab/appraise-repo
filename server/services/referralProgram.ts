import { v4 as uuidv4 } from 'uuid';
import { scopedLogger } from "../_core/logger";
import { buildAppUrl } from "../_core/appUrl";

const log = scopedLogger("ReferralProgram");

/**
 * Referral Program Service
 * Manages referral tracking, commission calculation, and payouts
 */

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
}

/**
 * Generate unique referral code for user
 */
export async function generateReferralCode(userId: string): Promise<string> {
  const code = `REF-${uuidv4().substring(0, 8).toUpperCase()}`;
  
  // Store in database (would be in referrals table)
  log.info(`[Referral] Generated code ${code} for user ${userId}`);
  
  return code;
}

/**
 * Track referral when new user signs up with code
 */
export async function trackReferral(referralCode: string, newUserId: string, newUserEmail: string): Promise<boolean> {
  try {
    // Validate referral code exists
    if (!referralCode.startsWith('REF-')) {
      log.warn(`[Referral] Invalid referral code format: ${referralCode}`);
      return false;
    }

    // Log referral
    log.info(`[Referral] Tracked referral: ${referralCode} -> ${newUserEmail}`);
    
    return true;
  } catch (error) {
    log.error('[Referral] Error tracking referral:', { err: error });
    return false;
  }
}

/**
 * Calculate commission for referral
 * Base: $50 per successful referral (Pro Se filing)
 * Bonus: Additional 5% of contingency fees from POA filings
 */
export function calculateCommission(referralType: 'pro_se' | 'poa', amount?: number): number {
  if (referralType === 'pro_se') {
    return 50; // $50 per Pro Se referral
  } else if (referralType === 'poa' && amount) {
    return amount * 0.05; // 5% of POA contingency
  }
  return 0;
}

/**
 * Get referral statistics for user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  // Mock data - would query database in production
  const referralCode = `REF-${userId.substring(0, 8).toUpperCase()}`;
  
  return {
    referralCode,
    totalReferrals: 12,
    successfulReferrals: 8,
    totalCommission: 650, // $50 * 8 + $50 bonus
    pendingCommission: 150,
    paidCommission: 500,
  };
}

/**
 * Get top referrers (leaderboard)
 */
export async function getTopReferrers(limit: number = 10): Promise<Array<{
  userId: string;
  userName: string;
  referrals: number;
  commission: number;
}>> {
  // Mock data - would query database in production
  return [
    { userId: '1', userName: 'John Smith', referrals: 45, commission: 2750 },
    { userId: '2', userName: 'Sarah Johnson', referrals: 38, commission: 2300 },
    { userId: '3', userName: 'Mike Davis', referrals: 32, commission: 1900 },
    { userId: '4', userName: 'Emily Wilson', referrals: 28, commission: 1650 },
    { userId: '5', userName: 'James Brown', referrals: 24, commission: 1400 },
  ].slice(0, limit);
}

/**
 * Request payout for earned commissions
 */
export async function requestPayout(userId: string, amount: number, bankAccount: string): Promise<boolean> {
  try {
    if (amount <= 0) {
      log.warn(`[Referral] Invalid payout amount: ${amount}`);
      return false;
    }

    // Log payout request
    log.info(`[Referral] Payout request: ${userId} - $${amount} to ${bankAccount}`);
    
    // In production, would integrate with payment processor (Stripe, ACH, etc.)
    
    return true;
  } catch (error) {
    log.error('[Referral] Error requesting payout:', { err: error });
    return false;
  }
}

/**
 * Get referral history for user
 */
export async function getReferralHistory(userId: string, limit: number = 50): Promise<Array<{
  referralId: string;
  referredUserEmail: string;
  referralDate: Date;
  status: 'pending' | 'completed' | 'failed';
  commission: number;
  filingType: 'pro_se' | 'poa';
}>> {
  // Mock data - would query database in production
  const history: Array<{
    referralId: string;
    referredUserEmail: string;
    referralDate: Date;
    status: 'pending' | 'completed' | 'failed';
    commission: number;
    filingType: 'pro_se' | 'poa';
  }> = [
    {
      referralId: '1',
      referredUserEmail: 'john@example.com',
      referralDate: new Date('2026-04-15'),
      status: 'completed' as const,
      commission: 50,
      filingType: 'pro_se' as const,
    },
    {
      referralId: '2',
      referredUserEmail: 'jane@example.com',
      referralDate: new Date('2026-04-10'),
      status: 'completed' as const,
      commission: 75,
      filingType: 'poa' as const,
    },
    {
      referralId: '3',
      referredUserEmail: 'bob@example.com',
      referralDate: new Date('2026-04-05'),
      status: 'pending' as const,
      commission: 0,
      filingType: 'pro_se' as const,
    },
  ];
  return history.slice(0, limit);
}

/**
 * Send referral invite link to friend
 */
export async function sendReferralInvite(fromUserId: string, toEmail: string, referralCode: string): Promise<boolean> {
  try {
    const inviteLink = buildAppUrl(`/get-started?ref=${referralCode}`);
    
    log.info(`[Referral] Sending invite from ${fromUserId} to ${toEmail}`);
    log.info(`[Referral] Invite link: ${inviteLink}`);
    
    // In production, would send email with invite link
    
    return true;
  } catch (error) {
    log.error('[Referral] Error sending invite:', { err: error });
    return false;
  }
}

/**
 * Validate referral code and get referrer info
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string; discount?: number }> {
  try {
    if (!code.startsWith('REF-')) {
      return { valid: false };
    }

    // In production, would query database
    return {
      valid: true,
      referrerId: code.substring(4),
      discount: 0, // No discount, commission goes to referrer
    };
  } catch (error) {
    log.error('[Referral] Error validating code:', { err: error });
    return { valid: false };
  }
}
