import { useState } from 'react';
import { Copy, Share2, TrendingUp, DollarSign, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Referral Program Page
 * Dashboard for users to track referrals, earnings, and manage payouts
 */

export default function ReferralProgram() {
  const showToast = (title: string, description: string) => {
    console.log(`[Toast] ${title}: ${description}`);
  };
  const [copied, setCopied] = useState(false);

  // Mock data - would fetch from tRPC in production
  const referralCode = 'REF-A1B2C3D4';
  const stats = {
    totalReferrals: 12,
    successfulReferrals: 8,
    totalCommission: 650,
    pendingCommission: 150,
    paidCommission: 500,
  };

  const referralHistory = [
    {
      id: '1',
      email: 'john@example.com',
      date: '2026-04-15',
      status: 'completed',
      commission: 50,
      type: 'Pro Se',
    },
    {
      id: '2',
      email: 'jane@example.com',
      date: '2026-04-10',
      status: 'completed',
      commission: 75,
      type: 'POA',
    },
    {
      id: '3',
      email: 'bob@example.com',
      date: '2026-04-05',
      status: 'pending',
      commission: 0,
      type: 'Pro Se',
    },
  ];

  const topReferrers = [
    { name: 'John Smith', referrals: 45, commission: 2750 },
    { name: 'Sarah Johnson', referrals: 38, commission: 2300 },
    { name: 'Mike Davis', referrals: 32, commission: 1900 },
    { name: 'Emily Wilson', referrals: 28, commission: 1650 },
    { name: 'James Brown', referrals: 24, commission: 1400 },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    showToast('Copied!', 'Referral code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    const inviteLink = `https://appraiseai-njpz7grd.manus.space/get-started?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join AppraiseAI',
        text: 'Get your property tax appeal done instantly. Use my referral code for priority support!',
        url: inviteLink,
      });
    } else {
      navigator.clipboard.writeText(inviteLink);
      showToast('Link copied!', 'Share this link with friends');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Referral Program</h1>
          <p className="text-lg text-muted-foreground">
            Earn commissions by referring friends to AppraiseAI
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Referrals</p>
                <p className="text-3xl font-bold">{stats.totalReferrals}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Successful</p>
                <p className="text-3xl font-bold">{stats.successfulReferrals}</p>
              </div>
              <Award className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                <p className="text-3xl font-bold">${stats.totalCommission}</p>
              </div>
              <DollarSign className="w-10 h-10 text-yellow-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-3xl font-bold">${stats.pendingCommission}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Referral Code Section */}
        <Card className="p-8 mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <h2 className="text-2xl font-bold mb-6">Your Referral Code</h2>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border-2 border-dashed border-blue-300 dark:border-blue-700">
                <p className="text-center text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                  {referralCode}
                </p>
              </div>
            </div>
            <Button onClick={copyToClipboard} variant="outline" className="px-6">
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex gap-4">
            <Button onClick={shareReferral} className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Share Referral Link
            </Button>
            <Button variant="outline" className="flex-1">
              View Invite Template
            </Button>
          </div>
        </Card>

        {/* Commission Structure */}
        <Card className="p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Pro Se Filing ($149)
              </h3>
              <p className="text-muted-foreground mb-4">
                Earn <strong>$50</strong> commission for each Pro Se referral
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Guided DIY filing</li>
                <li>✓ County-specific forms</li>
                <li>✓ Email coaching</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                POA Filing (25% Contingency)
              </h3>
              <p className="text-muted-foreground mb-4">
                Earn <strong>5%</strong> of contingency fees from POA referrals
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Full filing service</li>
                <li>✓ Hearing representation</li>
                <li>✓ Outcome tracking</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Referral History */}
        <Card className="p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">Recent Referrals</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-right py-3 px-4 font-semibold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {referralHistory.map((referral) => (
                  <tr key={referral.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{referral.email}</td>
                    <td className="py-3 px-4">{referral.date}</td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-sm">
                        {referral.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          referral.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}
                      >
                        {referral.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      ${referral.commission}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Top Referrers</h2>
          <div className="space-y-4">
            {topReferrers.map((referrer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground w-8">#{index + 1}</span>
                  <div>
                    <p className="font-semibold">{referrer.name}</p>
                    <p className="text-sm text-muted-foreground">{referrer.referrals} referrals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${referrer.commission}
                  </p>
                  <p className="text-sm text-muted-foreground">earned</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
