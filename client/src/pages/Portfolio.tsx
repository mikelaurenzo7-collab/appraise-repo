/**
 * Portfolio Page — Multi-property management for investors and landlords
 * Shows all submitted properties, their analysis status, appeal outcomes, and aggregate savings
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2, MapPin, TrendingDown, Trophy, Clock, AlertTriangle,
  CheckCircle2, ArrowRight, Plus, DollarSign, BarChart3, Scale,
  Loader2, Home as HomeIcon, Warehouse, TreePine, FileText, Zap,
  ChevronRight, Eye
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PROPERTY_TYPE_ICONS: Record<string, React.ReactNode> = {
  residential: <HomeIcon size={16} />,
  "multi-family": <Building2 size={16} />,
  commercial: <Building2 size={16} />,
  industrial: <Warehouse size={16} />,
  land: <TreePine size={16} />,
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    pending:              { label: "Queued",         classes: "bg-yellow-100 text-yellow-800" },
    analyzing:            { label: "Analyzing...",   classes: "bg-blue-100 text-blue-800" },
    analyzed:             { label: "Ready",          classes: "bg-green-100 text-green-800" },
    contacted:            { label: "In Review",      classes: "bg-purple-100 text-purple-800" },
    "appeal-filed":       { label: "Filed",          classes: "bg-indigo-100 text-indigo-800" },
    "hearing-scheduled":  { label: "Hearing Set",    classes: "bg-orange-100 text-orange-800" },
    won:                  { label: "WON ✓",          classes: "bg-emerald-100 text-emerald-800 font-bold" },
    lost:                 { label: "Lost",           classes: "bg-red-100 text-red-800" },
    withdrawn:            { label: "Withdrawn",      classes: "bg-gray-100 text-gray-600" },
    error:                { label: "Error",          classes: "bg-red-100 text-red-800" },
  };
  const s = map[status] ?? { label: status, classes: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.classes}`}>
      {s.label}
    </span>
  );
}

function AppealStrengthBar({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-xs text-[oklch(0.65_0.03_255)]">—</span>;
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-[oklch(0.35_0.04_255)]">{score}</span>
    </div>
  );
}

export default function Portfolio() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [view, setView] = useState<"grid" | "list">("list");

  const submissionsQuery = trpc.user.getSubmissions.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#7C3AED]" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-md">
            <Building2 size={56} className="text-[#7C3AED] mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Your Property Portfolio</h1>
            <p className="text-[#64748B] mb-8 leading-relaxed">
              Sign in to track all your properties, monitor appeal status, and see your total tax savings in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={getLoginUrl()} className="btn-gold px-6 py-3 rounded font-semibold inline-block">Sign In to View Portfolio</a>
              <Link href="/get-started" className="px-6 py-3 rounded border border-[#0F172A] text-[#0F172A] font-semibold hover:bg-[#0F172A] hover:text-white transition-colors inline-block text-center">
                Add Your First Property
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const submissions = submissionsQuery.data || [];

  // Aggregate stats
  const totalProperties = submissions.length;
  const analyzed = submissions.filter((s) => s.status === "analyzed" || s.status === "won" || s.status === "lost" || s.status === "appeal-filed").length;
  const won = submissions.filter((s) => s.status === "won").length;
  const totalPotentialSavings = submissions.reduce((sum, s) => sum + (s.potentialSavings || 0), 0);
  const totalActualSavings = submissions.reduce((sum, s) => {
    const outcome = (s as any).outcome;
    return sum + (outcome?.annualTaxSavings || 0);
  }, 0);
  const appealsInProgress = submissions.filter((s) =>
    ["appeal-filed", "hearing-scheduled", "contacted"].includes(s.status)
  ).length;

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <section className="pt-32 pb-8 lg:pt-40 lg:pb-10">
        <div className="container">
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="gold-rule" />
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
                Property Portfolio
              </h1>
              <p className="text-[#64748B]">
                {user?.name ? `Welcome back, ${user.name.split(" ")[0]}. ` : ""}
                Manage all your properties and track your tax appeal progress.
              </p>
            </div>
            <Link
              href="/get-started"
              className="btn-gold inline-flex items-center gap-2 px-5 py-3 rounded text-sm font-semibold shrink-0"
            >
              <Plus size={16} />
              Add Property
            </Link>
          </div>

          {/* Portfolio KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { icon: <Building2 size={16} />, label: "Properties", value: totalProperties, color: "text-[#0F172A]" },
              { icon: <CheckCircle2 size={16} />, label: "Analyzed", value: analyzed, color: "text-green-600" },
              { icon: <Scale size={16} />, label: "In Progress", value: appealsInProgress, color: "text-blue-600" },
              { icon: <Trophy size={16} />, label: "Won", value: won, color: "text-emerald-600" },
              { icon: <DollarSign size={16} />, label: "Potential Savings/yr", value: formatCurrency(totalPotentialSavings), color: "text-[#7C3AED]" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center gap-1.5 text-[#64748B] mb-2">
                  {stat.icon}
                  <span className="text-xs">{stat.label}</span>
                </div>
                <div className={`font-data text-xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Actual savings banner */}
          {totalActualSavings > 0 && (
            <div className="mb-6 p-5 rounded-xl bg-[#0F172A] flex items-center gap-4">
              <TrendingDown size={24} className="text-[#7C3AED] shrink-0" />
              <div>
                <div className="text-white font-semibold">Total Confirmed Annual Savings</div>
                <div className="font-data text-2xl font-bold text-[#7C3AED]">{formatCurrency(totalActualSavings)}/year</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Properties list */}
      <section className="pb-20">
        <div className="container">
          {submissionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-[#7C3AED]" size={36} />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[#E2E8F0]">
              <Building2 size={56} className="text-[#E2E8F0] mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-3">No Properties Yet</h2>
              <p className="text-[#64748B] mb-6 max-w-sm mx-auto">
                Add your first property to get an instant AI appraisal and see if you're overpaying on taxes.
              </p>
              <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold">
                <Plus size={16} />
                Add Your First Property
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => {
                const outcome = (sub as any).outcome;
                const isWon = sub.status === "won";
                const isInProgress = ["appeal-filed", "hearing-scheduled", "contacted"].includes(sub.status);
                const isAnalyzed = sub.status === "analyzed";

                return (
                  <div
                    key={sub.id}
                    className={`bg-white rounded-xl border-2 transition-all hover:shadow-md ${
                      isWon
                        ? "border-emerald-200 bg-emerald-50/30"
                        : isInProgress
                        ? "border-blue-200"
                        : "border-[#E2E8F0]"
                    }`}
                  >
                    <div className="p-5 lg:p-6">
                      <div className="flex items-start gap-4">
                        {/* Property type icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isWon ? "bg-emerald-100 text-emerald-600" : "bg-[#0F172A] text-[#7C3AED]"
                        }`}>
                          {PROPERTY_TYPE_ICONS[sub.propertyType || "residential"] || <HomeIcon size={16} />}
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-[#0F172A] text-sm">{sub.address}</h3>
                                {sub.city && sub.state && (
                                  <span className="text-xs text-[#64748B]">{sub.city}, {sub.state}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <StatusBadge status={sub.status} />
                                <span className="text-xs text-[oklch(0.65_0.03_255)] capitalize">{sub.propertyType || "residential"}</span>
                                <span className="text-xs text-[oklch(0.65_0.03_255)]">Submitted {formatDate(sub.createdAt)}</span>
                              </div>
                            </div>
                            <Link
                              href={`/analysis?id=${sub.id}`}
                              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] hover:text-[#7C3AED] transition-colors border border-[#E2E8F0] px-3 py-1.5 rounded-lg hover:border-[#7C3AED]"
                            >
                              <Eye size={12} />
                              View Analysis
                            </Link>
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <div>
                              <div className="text-xs text-[oklch(0.65_0.03_255)] mb-0.5">Assessed Value</div>
                              <div className="font-data text-sm font-semibold text-[#0F172A]">
                                {formatCurrency(sub.assessedValue)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-[oklch(0.65_0.03_255)] mb-0.5">Market Value</div>
                              <div className="font-data text-sm font-semibold text-[#7C3AED]">
                                {formatCurrency(sub.marketValue)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-[oklch(0.65_0.03_255)] mb-0.5">Potential Savings/yr</div>
                              <div className="font-data text-sm font-semibold text-green-600">
                                {formatCurrency(sub.potentialSavings)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-[oklch(0.65_0.03_255)] mb-0.5">Appeal Strength</div>
                              <AppealStrengthBar score={sub.appealStrengthScore} />
                            </div>
                          </div>

                          {/* Won outcome banner */}
                          {isWon && outcome && (
                            <div className="mt-3 p-3 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center gap-2">
                              <Trophy size={14} className="text-emerald-600 shrink-0" />
                              <div className="text-xs text-emerald-800">
                                <strong>Appeal Won!</strong>
                                {outcome.annualTaxSavings && ` Saving ${formatCurrency(outcome.annualTaxSavings)}/year.`}
                                {outcome.reductionAmount && ` Assessment reduced by ${formatCurrency(outcome.reductionAmount)}.`}
                              </div>
                            </div>
                          )}

                          {/* In progress banner */}
                          {isInProgress && (
                            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                              <Scale size={14} className="text-blue-600 shrink-0" />
                              <div className="text-xs text-blue-800">
                                <strong>Appeal in progress.</strong>
                                {sub.status === "hearing-scheduled" ? " Hearing has been scheduled." : " Filed and awaiting board review."}
                              </div>
                            </div>
                          )}

                          {/* CTA for analyzed but not filed */}
                          {isAnalyzed && sub.appealStrengthScore && sub.appealStrengthScore >= 50 && (
                            <div className="mt-3 p-3 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/30 flex items-center justify-between gap-3">
                              <div className="text-xs text-[#0F172A]">
                                <strong>Strong appeal case detected.</strong> Your appeal strength score is {sub.appealStrengthScore}/100.
                              </div>
                              <Link
                                href={`/analysis?id=${sub.id}`}
                                className="shrink-0 text-xs font-semibold text-[#0F172A] flex items-center gap-1 hover:text-[#7C3AED] transition-colors"
                              >
                                Start Appeal <ChevronRight size={12} />
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add more properties CTA */}
          {submissions.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed border-[#E2E8F0] text-[#64748B] hover:border-[#7C3AED] hover:text-[#0F172A] transition-all text-sm font-semibold"
              >
                <Plus size={16} />
                Add Another Property
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* How portfolio works */}
      {submissions.length === 0 && (
        <section className="bg-[oklch(0.94_0.018_85)] py-20">
          <div className="container max-w-4xl">
            <div className="text-center mb-12">
              <span className="gold-rule mx-auto" />
              <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Built for Investors & Landlords</h2>
              <p className="text-[#64748B]">Manage your entire property portfolio from one dashboard.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Zap size={20} />, title: "Bulk Analysis", desc: "Submit multiple properties at once. Each gets its own AI appraisal and appeal strength score." },
                { icon: <BarChart3 size={20} />, title: "Aggregate Savings", desc: "See your total potential and confirmed savings across all properties in one view." },
                { icon: <FileText size={20} />, title: "Unified Filing", desc: "One POA covers all your properties. We track deadlines and file appeals for every eligible property." },
              ].map((f) => (
                <div key={f.title} className="p-6 rounded-xl bg-white border border-[#E2E8F0]">
                  <div className="w-10 h-10 rounded bg-[#0F172A] text-[#7C3AED] flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#0F172A] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
