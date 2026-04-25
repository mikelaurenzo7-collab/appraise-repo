import { useState } from "react";
import { Link } from "wouter";
import {
  Copy,
  Share2,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Gift,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Referral Program Page
 * Two modes:
 * 1. Logged-out: marketing page explaining the program + CTA to sign up
 * 2. Logged-in: dashboard with real referral code, live stats, history
 */

const tiers = [
  {
    label: "Bronze",
    range: "1–5 referrals",
    commission: "$25",
    perks: "Per successful referral",
    color: "from-amber-700 to-amber-600",
    textColor: "text-amber-200",
  },
  {
    label: "Silver",
    range: "6–15 referrals",
    commission: "$40",
    perks: "Per referral + priority support",
    color: "from-slate-400 to-slate-300",
    textColor: "text-slate-700",
  },
  {
    label: "Gold",
    range: "16–50 referrals",
    commission: "$50",
    perks: "Per referral + free filing",
    color: "from-[oklch(0.72_0.12_75)] to-[oklch(0.65_0.14_75)]",
    textColor: "text-[oklch(0.18_0.06_255)]",
  },
  {
    label: "Platinum",
    range: "51+ referrals",
    commission: "$75",
    perks: "Per referral + revenue share",
    color: "from-[#7C3AED] to-[#6D28D9]",
    textColor: "text-white",
  },
];

const howItWorks = [
  {
    step: "01",
    icon: <Gift size={20} />,
    title: "Get Your Link",
    desc: "Sign up or log in to receive your personal referral link. Share it anywhere — email, social media, or word of mouth.",
  },
  {
    step: "02",
    icon: <Users size={20} />,
    title: "Friends File Appeals",
    desc: "When someone uses your link to start a property tax appeal and pays for filing, you earn a commission.",
  },
  {
    step: "03",
    icon: <DollarSign size={20} />,
    title: "Earn Cash Rewards",
    desc: "Commissions are tracked automatically. Cash out anytime once your balance reaches $50. Paid via direct deposit.",
  },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    clicked: "bg-gray-100 text-gray-600",
    signed_up: "bg-blue-100 text-blue-700",
    submitted: "bg-amber-100 text-amber-700",
    paid: "bg-emerald-100 text-emerald-700",
    credited: "bg-green-100 text-green-700",
    reversed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function ReferralProgram() {
  usePageMeta({
    title: "Referral Program — Earn Cash Helping Friends Save on Property Taxes",
    description:
      "Join the AppraiseAI referral program. Earn $25–$75 per referral when friends file property tax appeals. No cap on earnings. Cash out anytime.",
    canonicalPath: "/referral",
  });

  const { user, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  // Fetch real dashboard data for logged-in users
  const { data: dashboard, isLoading: dashboardLoading } = trpc.referral.dashboard.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const payoutMutation = trpc.referral.requestPayout.useMutation({
    onSuccess: () => {
      toast.success("Payout request submitted! We'll process it within 24 hours.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to request payout");
    },
  });

  // Use real code from dashboard, fallback to deterministic
  const referralCode = dashboard?.code || (user ? `APPR-${String(user.id).padStart(4, "0")}` : "APPR-XXXX");
  const shareUrl = `${window.location.origin}/get-started?ref=${referralCode}`;

  const copyCode = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Save on your property taxes with AppraiseAI",
        text: "I used AppraiseAI to file my property tax appeal. Use my link to get started — it's free to analyze your property!",
        url: shareUrl,
      });
    } else {
      copyCode();
    }
  };

  const handlePayout = () => {
    if (!dashboard || dashboard.pendingBalanceCents < 5000) {
      toast.error("Minimum payout is $50. Keep referring to build your balance!");
      return;
    }
    payoutMutation.mutate({ amountCents: dashboard.pendingBalanceCents });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-[#0F172A] pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#7C3AED 1px, transparent 1px), linear-gradient(90deg, #7C3AED 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold uppercase tracking-widest mb-6">
              <Gift size={12} />
              Referral Program
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Earn Cash Helping<br />
              Friends{" "}
              <span className="text-[#7C3AED] italic">Save on Taxes.</span>
            </h1>

            <p className="text-lg lg:text-xl text-white/70 font-body leading-relaxed mb-8 max-w-2xl mx-auto">
              Refer homeowners to AppraiseAI. When they file a property tax
              appeal, you earn <strong className="text-white">$25–$75 per referral</strong>.
              No cap on earnings. No minimum to start.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button
                  onClick={copyCode}
                  className="btn-gold px-7 py-4 rounded text-base font-semibold inline-flex items-center gap-2"
                >
                  <Copy size={18} />
                  {copied ? "Copied!" : "Copy My Referral Link"}
                </Button>
              ) : (
                <Link
                  href="/get-started"
                  className="btn-gold inline-flex items-center justify-center gap-2 px-7 py-4 rounded text-base font-semibold"
                >
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
              )}
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded text-base font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                See How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAND ───────────────────────────────────── */}
      <section className="bg-[#1E293B] py-10">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "$75", label: "Max per referral" },
              { value: "No Cap", label: "On total earnings" },
              { value: "$50", label: "Min cash-out" },
              { value: "24h", label: "Payout processing" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl lg:text-4xl font-bold text-[#7C3AED] mb-1">
                  {s.value}
                </div>
                <div className="text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="container">
          <div className="max-w-xl mb-14">
            <span className="block w-12 h-1 bg-[#7C3AED] rounded mb-4" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Three Steps to Earning
            </h2>
            <p className="text-[#475569] leading-relaxed">
              Our referral program is simple, transparent, and rewarding. No
              complicated tiers to unlock before you start earning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorks.map((step, i) => (
              <div
                key={step.step}
                className="relative p-6 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white hover:shadow-lg hover:shadow-[#0F172A]/8 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="font-display text-5xl font-medium text-[oklch(0.88_0.015_85)] mb-4 leading-none">
                  {step.step}
                </div>
                <div className="w-10 h-10 rounded bg-[#0F172A] text-[#7C3AED] flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {step.desc}
                </p>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight size={20} className="text-[#7C3AED]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REWARD TIERS ─────────────────────────────────── */}
      <section className="bg-[#0F172A] py-20 lg:py-28">
        <div className="container">
          <div className="max-w-xl mb-14">
            <span className="block w-12 h-1 bg-[#7C3AED] rounded mb-4" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
              Reward Tiers
            </h2>
            <p className="text-white/60 leading-relaxed">
              The more friends you refer, the more you earn per referral. Tiers
              are calculated automatically based on your lifetime referral count.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => {
              const isCurrentTier = dashboard?.tier === tier.label.toLowerCase();
              return (
                <div
                  key={tier.label}
                  className={`rounded-xl p-6 bg-gradient-to-br ${tier.color} relative overflow-hidden ${isCurrentTier ? "ring-2 ring-white ring-offset-2 ring-offset-[#0F172A]" : ""}`}
                >
                  {isCurrentTier && (
                    <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Your Tier
                    </div>
                  )}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-x-4 -translate-y-4" />
                  <div className={`relative z-10 ${tier.textColor}`}>
                    <div className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
                      {tier.label}
                    </div>
                    <div className="text-3xl font-bold mb-1">{tier.commission}</div>
                    <div className="text-sm opacity-80 mb-3">{tier.range}</div>
                    <div className="text-xs opacity-70 leading-relaxed">
                      {tier.perks}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── REFERRAL DASHBOARD (logged-in users) ─────────── */}
      {isAuthenticated && (
        <section className="py-20 lg:py-28">
          <div className="container">
            <div className="max-w-xl mb-14">
              <span className="block w-12 h-1 bg-[#7C3AED] rounded mb-4" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
                Your Referral Dashboard
              </h2>
              <p className="text-[#475569] leading-relaxed">
                Share your unique link and track your earnings in real time.
              </p>
            </div>

            {dashboardLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#7C3AED]" size={32} />
              </div>
            ) : (
              <>
                {/* Referral Link Card */}
                <Card className="p-8 mb-8 border-2 border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/5 to-transparent">
                  <h3 className="font-display text-xl font-bold text-[#0F172A] mb-4">
                    Your Referral Link
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-white rounded-lg px-4 py-3 border border-[#E2E8F0] font-mono text-sm text-[#475569] truncate">
                      {shareUrl}
                    </div>
                    <Button
                      onClick={copyCode}
                      variant="outline"
                      className="px-5 shrink-0"
                    >
                      <Copy size={16} className="mr-2" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button onClick={shareLink} className="px-5 shrink-0 bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                      <Share2 size={16} className="mr-2" />
                      Share
                    </Button>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-3">
                    Your code: <strong className="text-[#7C3AED]">{referralCode}</strong>
                    {" "}— Anyone who signs up through this link is automatically
                    tracked as your referral.
                  </p>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      label: "Total Referrals",
                      value: String(dashboard?.lifetimeReferrals ?? 0),
                      icon: <Users size={20} />,
                      color: "text-blue-500",
                    },
                    {
                      label: "Successful",
                      value: String(dashboard?.successfulCount ?? 0),
                      icon: <Award size={20} />,
                      color: "text-green-500",
                    },
                    {
                      label: "Total Earned",
                      value: formatCents(dashboard?.lifetimeEarningsCents ?? 0),
                      icon: <DollarSign size={20} />,
                      color: "text-[#7C3AED]",
                    },
                    {
                      label: "Available Balance",
                      value: formatCents(dashboard?.pendingBalanceCents ?? 0),
                      icon: <TrendingUp size={20} />,
                      color: "text-amber-500",
                    },
                  ].map((stat) => (
                    <Card key={stat.label} className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#94A3B8] mb-1">{stat.label}</p>
                          <p className="text-2xl font-bold text-[#0F172A]">
                            {stat.value}
                          </p>
                        </div>
                        <div className={`${stat.color} opacity-30`}>{stat.icon}</div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Payout Button */}
                {(dashboard?.pendingBalanceCents ?? 0) >= 5000 && (
                  <div className="mb-8">
                    <Button
                      onClick={handlePayout}
                      disabled={payoutMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                    >
                      {payoutMutation.isPending ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Banknote size={16} className="mr-2" />
                      )}
                      Cash Out {formatCents(dashboard?.pendingBalanceCents ?? 0)}
                    </Button>
                  </div>
                )}

                {/* Referral History */}
                {dashboard?.recentReferrals && dashboard.recentReferrals.length > 0 ? (
                  <Card className="overflow-hidden">
                    <div className="p-6 border-b border-[#E2E8F0]">
                      <h3 className="font-display text-lg font-semibold text-[#0F172A]">
                        Referral History
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                            <th className="text-left px-6 py-3 font-medium text-[#64748B]">Email</th>
                            <th className="text-left px-6 py-3 font-medium text-[#64748B]">Status</th>
                            <th className="text-left px-6 py-3 font-medium text-[#64748B]">Commission</th>
                            <th className="text-left px-6 py-3 font-medium text-[#64748B]">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboard.recentReferrals.map((ref) => (
                            <tr key={ref.id} className="border-b border-[#E2E8F0] last:border-0">
                              <td className="px-6 py-3 text-[#334155]">
                                {ref.referredEmail || "—"}
                              </td>
                              <td className="px-6 py-3">
                                <StatusBadge status={ref.status} />
                              </td>
                              <td className="px-6 py-3 text-[#334155] font-medium">
                                {ref.commissionCents > 0 ? formatCents(ref.commissionCents) : "—"}
                              </td>
                              <td className="px-6 py-3 text-[#94A3B8]">
                                {new Date(ref.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-12 text-center border-dashed">
                    <Gift size={40} className="mx-auto text-[#94A3B8] mb-4" />
                    <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">
                      No referrals yet
                    </h3>
                    <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-6">
                      Share your referral link with friends, family, or on social media.
                      You'll see your referral activity here once someone signs up.
                    </p>
                    <Button onClick={shareLink} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                      <Share2 size={16} className="mr-2" />
                      Share Your Link
                    </Button>
                  </Card>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ─── FAQ ──────────────────────────────────────────── */}
      <section className={`py-20 lg:py-28 ${isAuthenticated ? "bg-[oklch(0.96_0.012_85)]" : ""}`}>
        <div className="container">
          <div className="max-w-xl mb-14">
            <span className="block w-12 h-1 bg-[#7C3AED] rounded mb-4" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {[
              {
                q: "Who can join the referral program?",
                a: "Anyone with an AppraiseAI account. You don't need to have filed an appeal yourself — just share your link and earn when others do.",
              },
              {
                q: "When do I get paid?",
                a: "Commissions are credited once the referred user's appeal filing payment is confirmed. You can cash out anytime your balance reaches $50.",
              },
              {
                q: "Is there a limit on how much I can earn?",
                a: "No. There's no cap on referrals or earnings. The more you refer, the higher your per-referral commission tier.",
              },
              {
                q: "What if my referral gets a refund?",
                a: "If a referred user receives a refund under our money-back guarantee, the associated commission is reversed.",
              },
              {
                q: "How are referrals tracked?",
                a: "When someone clicks your unique link, the referral code is captured. If they submit a property and pay for filing, you get credit automatically.",
              },
              {
                q: "Can I refer businesses or investors?",
                a: "Absolutely. Portfolio and batch submissions count too — each property that results in a paid filing earns you a commission.",
              },
            ].map((faq) => (
              <Card key={faq.q} className="p-6">
                <h3 className="font-display text-base font-semibold text-[#0F172A] mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="bg-[#0F172A] py-20 lg:py-28">
          <div className="container text-center">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto mb-8">
              Create a free account, get your referral link, and start sharing.
              There's no cost to join and no minimum to start.
            </p>
            <Link
              href="/get-started"
              className="btn-gold inline-flex items-center gap-2 px-8 py-4 rounded text-base font-semibold"
            >
              Join the Referral Program
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
