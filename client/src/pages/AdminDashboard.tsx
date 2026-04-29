import { useState } from "react";
import RecordOutcomeModal from "@/components/RecordOutcomeModal";
import { ManusLoginButton } from "@/components/ManusLoginButton";
import { Link } from "wouter";
import {
  BarChart3, TrendingDown, FileText, Clock, CheckCircle2, AlertTriangle,
  Loader2, RefreshCw, Eye, Building2, MapPin, DollarSign, Users, Activity,
  Trophy, XCircle, Scale, Zap, ChevronRight, RotateCcw, Gift, ArrowUpRight,
  Database,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    pending:            { label: "Pending",          classes: "bg-yellow-100 text-yellow-800" },
    analyzing:          { label: "Analyzing",        classes: "bg-blue-100 text-blue-800" },
    analyzed:           { label: "Complete",         classes: "bg-green-100 text-green-800" },
    contacted:          { label: "Contacted",        classes: "bg-purple-100 text-purple-800" },
    "appeal-filed":     { label: "Filed",            classes: "bg-indigo-100 text-indigo-800" },
    "hearing-scheduled":{ label: "Hearing Set",      classes: "bg-orange-100 text-orange-800" },
    won:                { label: "WON ✓",            classes: "bg-emerald-100 text-emerald-800 font-bold" },
    lost:               { label: "Lost",             classes: "bg-red-100 text-red-800" },
    withdrawn:          { label: "Withdrawn",        classes: "bg-gray-100 text-gray-600" },
    archived:           { label: "Archived",         classes: "bg-gray-100 text-gray-500" },
    error:              { label: "Error",            classes: "bg-red-100 text-red-800" },
  };
  const s = map[status] ?? { label: status, classes: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.classes}`}>
      {s.label}
    </span>
  );
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeAgo(d: Date | string | null | undefined) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type TabKey = "submissions" | "outcomes" | "activity" | "filings" | "waitlist" | "referrals" | "data";

export default function AdminDashboard() {
  usePageMeta({
    title: "Admin Dashboard",
    description: "AppraiseAI internal admin panel.",
    noindex: true,
  });
  const { user, isAuthenticated, loading } = useAuth();
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<TabKey>("submissions");
  const PAGE_SIZE = 25;

  const dashboardQuery = trpc.admin.getDashboard.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const submissionsQuery = trpc.admin.listSubmissions.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { enabled: isAuthenticated && user?.role === "admin" && tab === "submissions", refetchInterval: 15000 }
  );

  const outcomesQuery = trpc.admin.listOutcomes.useQuery(
    { limit: PAGE_SIZE, offset: 0 },
    { enabled: isAuthenticated && user?.role === "admin" && tab === "outcomes" }
  );

  const [outcomeModal, setOutcomeModal] = useState<{ submissionId: number; address: string; assessedValue?: number | null } | null>(null);

  const retriggerMutation = trpc.admin.retriggerAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Analysis re-triggered");
      submissionsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const seedCountiesMutation = trpc.admin.seedCounties.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (err) => toast.error(`Seed failed: ${err.message}`),
  });

  const seedRecipesMutation = trpc.admin.seedRecipes.useMutation({
    onSuccess: (data) => toast.success(data.message),
    onError: (err) => toast.error(`Recipe seed failed: ${err.message}`),
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
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-[#7C3AED] mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-[#0F172A] mb-4">Admin Access Required</h1>
          <ManusLoginButton
            className="btn-gold px-6 py-3 h-auto rounded font-semibold"
            dialogTitle="Admin access requires Manus"
            dialogDescription="We’ll return you to the command center after Manus signs you in."
          >
            Sign In
          </ManusLoginButton>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-[#0F172A] mb-2">Access Denied</h1>
          <p className="text-[#64748B]">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  const { submissionStats, outcomeStats, recentActivity } = dashboardQuery.data ?? {};
  const submissions = submissionsQuery.data?.submissions ?? [];
  const outcomes = outcomesQuery.data?.outcomes ?? [];

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Top Bar */}
      <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm">
            <Building2 size={16} />AppraiseAI
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white text-sm font-semibold">Command Center</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { dashboardQuery.refetch(); submissionsQuery.refetch(); }}
            disabled={dashboardQuery.isFetching}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={dashboardQuery.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <span className="text-xs text-white/40">{user?.name || user?.email}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          {[
            { icon: <Users size={16} />, label: "Total Leads", value: submissionStats?.total ?? "—", color: "text-[#0F172A]" },
            { icon: <CheckCircle2 size={16} />, label: "Analyzed", value: submissionStats?.analyzed ?? "—", color: "text-green-600" },
            { icon: <Activity size={16} />, label: "In Progress", value: (submissionStats?.pending ?? 0) + (submissionStats?.analyzing ?? 0), color: "text-blue-600" },
            { icon: <DollarSign size={16} />, label: "Avg. Savings", value: submissionStats?.avgSavings ? formatCurrency(submissionStats.avgSavings) : "—", color: "text-[#7C3AED]" },
            { icon: <Trophy size={16} />, label: "Appeals Won", value: outcomeStats?.won ?? "—", color: "text-emerald-600" },
            { icon: <XCircle size={16} />, label: "Appeals Lost", value: outcomeStats?.lost ?? "—", color: "text-red-500" },
            { icon: <BarChart3 size={16} />, label: "Win Rate", value: outcomeStats?.winRate != null ? `${outcomeStats.winRate}%` : "—", color: "text-[#7C3AED]" },
            { icon: <DollarSign size={16} />, label: "Total Revenue", value: outcomeStats?.totalRevenue ? formatCurrency(outcomeStats.totalRevenue) : "—", color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center gap-1.5 text-[#64748B] mb-2">
                {s.icon}
                <span className="text-xs">{s.label}</span>
              </div>
              <div className={`font-data text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#E2E8F0]">
          {(["submissions", "filings", "waitlist", "outcomes", "referrals", "activity", "data"] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-[#7C3AED] text-[#0F172A]"
                  : "border-transparent text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {t === "submissions" && <span className="flex items-center gap-1.5"><FileText size={14} />{t}</span>}
              {t === "filings" && <span className="flex items-center gap-1.5"><Activity size={14} />{t}</span>}
              {t === "waitlist" && <span className="flex items-center gap-1.5"><FileText size={14} />{t}</span>}
              {t === "outcomes" && <span className="flex items-center gap-1.5"><Trophy size={14} />{t}</span>}
              {t === "referrals" && <span className="flex items-center gap-1.5"><Gift size={14} />{t}</span>}
              {t === "activity" && <span className="flex items-center gap-1.5"><Activity size={14} />{t}</span>}
              {t === "data" && <span className="flex items-center gap-1.5"><Database size={14} />data mgmt</span>}
            </button>
          ))}
        </div>

        {/* ── SUBMISSIONS TAB ─────────────────────────────────────── */}
        {tab === "submissions" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                Property Submissions
                {submissionsQuery.data?.total != null && (
                  <span className="ml-2 text-sm font-normal text-[#64748B]">({submissionsQuery.data.total} total)</span>
                )}
              </h2>
              <span className="text-xs text-[#64748B]">Auto-refreshes every 15s</span>
            </div>

            {submissionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#7C3AED]" size={32} /></div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={40} className="text-[#E2E8F0] mx-auto mb-3" />
                <p className="text-[#64748B]">No submissions yet. Share the site to get your first lead.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
                      {["ID", "Address", "Email", "Type", "Assessed", "Market", "Savings", "Score", "Filing", "Status", "Date", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub, i) => (
                      <tr key={sub.id} className={`border-b border-[#F1F5F9] hover:bg-[#F1F5F9] transition-colors ${i % 2 === 0 ? "" : "bg-[oklch(0.985_0.008_85)]"}`}>
                        <td className="px-4 py-3 font-mono text-xs text-[#64748B]">#{sub.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5">
                            <MapPin size={12} className="text-[#7C3AED] mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-[#0F172A] max-w-[160px] truncate">{sub.address}</div>
                              <div className="text-xs text-[#64748B]">{[sub.city, sub.state].filter(Boolean).join(", ")}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#64748B] max-w-[130px] truncate">{sub.email}</td>
                        <td className="px-4 py-3 capitalize text-[#64748B] text-xs">{sub.propertyType || "—"}</td>
                        <td className="px-4 py-3 font-data text-[#0F172A] text-xs">{formatCurrency(sub.assessedValue)}</td>
                        <td className="px-4 py-3 font-data text-[#7C3AED] text-xs">{formatCurrency(sub.marketValue)}</td>
                        <td className="px-4 py-3 font-data text-green-600 font-semibold text-xs">{formatCurrency(sub.potentialSavings)}</td>
                        <td className="px-4 py-3">
                          {sub.appealStrengthScore != null ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                                <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${sub.appealStrengthScore}%` }} />
                              </div>
                              <span className="text-xs text-[#64748B]">{sub.appealStrengthScore}</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${sub.filingMethod === "poa" ? "bg-indigo-50 text-indigo-700" : sub.filingMethod === "pro-se" ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-500"}`}>
                            {sub.filingMethod?.toUpperCase() || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">{formatDate(sub.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={`/analysis?id=${sub.id}`} className="inline-flex items-center gap-1 text-xs text-[#0F172A] hover:text-[#7C3AED] transition-colors">
                              <Eye size={12} />View
                            </Link>
                            <button
                              onClick={() => setOutcomeModal({ submissionId: sub.id, address: sub.address, assessedValue: sub.assessedValue })}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors font-medium"
                              title="Record outcome"
                            >
                              <Trophy size={11} />Outcome
                            </button>
                            {(sub.status === "pending" || sub.status === "analyzed") && (
                              <button
                                onClick={() => retriggerMutation.mutate({ submissionId: sub.id })}
                                disabled={retriggerMutation.isPending}
                                className="inline-flex items-center gap-1 text-xs text-[#64748B] hover:text-blue-600 transition-colors"
                                title="Re-run analysis"
                              >
                                <RotateCcw size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(submissionsQuery.data?.total ?? 0) > PAGE_SIZE && (
              <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-xs text-[#64748B]">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, submissionsQuery.data?.total ?? 0)} of {submissionsQuery.data?.total ?? 0}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= (submissionsQuery.data?.total ?? 0)} className="px-3 py-1.5 rounded border border-[#E2E8F0] text-xs text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FILINGS TAB ─────────────────────────────────────────── */}
        {tab === "filings" && <FilingJobsTable />}

        {/* ── WAITLIST TAB ────────────────────────────────────────── */}
        {tab === "waitlist" && <WaitlistTable />}

        {/* ── OUTCOMES TAB ────────────────────────────────────────── */}
        {tab === "outcomes" && (
          <div className="space-y-6">
            {/* Outcome KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Filed", value: outcomeStats?.totalFiled ?? "—", icon: <Scale size={16} />, color: "text-[#0F172A]" },
                { label: "Won", value: outcomeStats?.won ?? "—", icon: <Trophy size={16} />, color: "text-emerald-600" },
                { label: "Avg. Annual Savings", value: outcomeStats?.avgSavings ? formatCurrency(outcomeStats.avgSavings) : "—", icon: <TrendingDown size={16} />, color: "text-[#7C3AED]" },
                { label: "Avg. Resolution", value: outcomeStats?.avgResolutionDays ? `${outcomeStats.avgResolutionDays} days` : "—", icon: <Clock size={16} />, color: "text-blue-600" },
              ].map((s) => (
                <div key={s.label} className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                  <div className="flex items-center gap-2 text-[#64748B] mb-2">{s.icon}<span className="text-xs">{s.label}</span></div>
                  <div className={`font-data text-2xl font-bold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="font-display text-lg font-semibold text-[#0F172A]">Appeal Outcomes</h2>
              </div>
              {outcomesQuery.isLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#7C3AED]" size={32} /></div>
              ) : outcomes.length === 0 ? (
                <div className="text-center py-16">
                  <Trophy size={40} className="text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-[#64748B]">No outcomes recorded yet. File your first appeal to start tracking wins.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F1F5F9]">
                        {["ID", "Submission", "Outcome", "Original", "Final", "Reduction", "Annual Savings", "Flat Fee Rev.", "Days", "Filed"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {outcomes.map((o, i) => (
                        <tr key={o.id} className={`border-b border-[#F1F5F9] hover:bg-[#F1F5F9] ${i % 2 === 0 ? "" : "bg-[oklch(0.985_0.008_85)]"}`}>
                          <td className="px-4 py-3 font-mono text-xs text-[#64748B]">#{o.id}</td>
                          <td className="px-4 py-3 text-xs">
                            <Link href={`/analysis?id=${o.submissionId}`} className="text-[#0F172A] hover:text-[#7C3AED] flex items-center gap-1">
                              Sub #{o.submissionId}<ChevronRight size={10} />
                            </Link>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={o.outcome} /></td>
                          <td className="px-4 py-3 font-data text-xs">{formatCurrency(o.originalAssessedValue)}</td>
                          <td className="px-4 py-3 font-data text-xs">{formatCurrency(o.finalAssessedValue)}</td>
                          <td className="px-4 py-3 font-data text-xs text-[#7C3AED]">{formatCurrency(o.reductionAmount)}</td>
                          <td className="px-4 py-3 font-data text-xs text-emerald-600 font-semibold">{formatCurrency(o.annualTaxSavings)}</td>
                          <td className="px-4 py-3 font-data text-xs text-[#7C3AED] font-semibold">
                            {o.contingencyFeeEarned ? `$${Number(o.contingencyFeeEarned).toLocaleString()}` : "—"}
                            {/* contingencyFeeEarned repurposed as flat-fee revenue tracker */}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{o.resolutionDays ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{formatDate(o.filedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REFERRALS TAB ───────────────────────────────────────── */}
        {tab === "referrals" && <ReferralManagementTab />}

        {/* ── DATA MANAGEMENT TAB ─────────────────────────────── */}
        {tab === "data" && (
          <div className="space-y-6">
            {/* County Seed */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#0F172A] mb-1">County Database</h2>
                  <p className="text-sm text-[#64748B] max-w-lg">
                    Upserts all 153 counties (88 base + 65 expansion) into the database. Safe to re-run — uses
                    <code className="mx-1 px-1 bg-[#F1F5F9] rounded text-xs">ON DUPLICATE KEY UPDATE</code>
                    so existing records are refreshed, not duplicated.
                  </p>
                </div>
                <button
                  onClick={() => seedCountiesMutation.mutate()}
                  disabled={seedCountiesMutation.isPending}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] disabled:opacity-60 transition-colors"
                >
                  {seedCountiesMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                  {seedCountiesMutation.isPending ? "Seeding…" : "Seed Counties"}
                </button>
              </div>
              {seedCountiesMutation.data && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  ✓ {seedCountiesMutation.data.message}
                </div>
              )}
            </div>

            {/* Recipe Seed */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#0F172A] mb-1">Filing Recipes</h2>
                  <p className="text-sm text-[#64748B] max-w-lg">
                    Seeds draft filing recipes for all portal-eligible counties. Recipes are inserted with
                    <code className="mx-1 px-1 bg-[#F1F5F9] rounded text-xs">verificationStatus=&apos;draft&apos;</code>
                    and must be promoted to <code className="px-1 bg-[#F1F5F9] rounded text-xs">verified</code> after
                    human QA before the Automated Filing tier will use them in production.
                  </p>
                </div>
                <button
                  onClick={() => seedRecipesMutation.mutate()}
                  disabled={seedRecipesMutation.isPending}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B] disabled:opacity-60 transition-colors"
                >
                  {seedRecipesMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  {seedRecipesMutation.isPending ? "Seeding…" : "Seed Recipes"}
                </button>
              </div>
              {seedRecipesMutation.data && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                  <p>✓ {seedRecipesMutation.data.message}</p>
                  {seedRecipesMutation.data.errors && seedRecipesMutation.data.errors.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
                      {seedRecipesMutation.data.errors.map((e, i) => <li key={i}>⚠ {e}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-[#FFF7ED] rounded-xl border border-[#FED7AA] p-5">
              <h3 className="font-semibold text-[#9A3412] text-sm mb-2">⚠ Post-Seed Checklist</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-[#7C2D12]">
                <li>Run <strong>Seed Counties</strong> first — recipes reference county IDs.</li>
                <li>Run <strong>Seed Recipes</strong> — all recipes land as <code className="px-1 bg-orange-100 rounded text-xs">draft</code>.</li>
                <li>For each county you want live, open the Database panel, find the recipe row, and set <code className="px-1 bg-orange-100 rounded text-xs">verificationStatus = &apos;verified&apos;</code>.</li>
                <li>Only <code className="px-1 bg-orange-100 rounded text-xs">verified</code> recipes are executed by the Automated Filing runner in production.</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ────────────────────────────────────────── */}
        {tab === "activity" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">Live Activity Feed</h2>
            </div>
            {!recentActivity || recentActivity.length === 0 ? (
              <div className="text-center py-16">
                <Activity size={40} className="text-[#E2E8F0] mx-auto mb-3" />
                <p className="text-[#64748B]">No activity yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {recentActivity.map((log) => (
                  <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-[#F1F5F9] transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${log.status === "success" ? "bg-emerald-400" : log.status === "error" ? "bg-red-400" : "bg-yellow-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-[#64748B] bg-[oklch(0.94_0.018_85)] px-1.5 py-0.5 rounded">{log.type}</span>
                        {log.submissionId && (
                          <Link href={`/analysis?id=${log.submissionId}`} className="text-xs text-[#7C3AED] hover:underline">Sub #{log.submissionId}</Link>
                        )}
                        <span className="text-xs text-[oklch(0.65_0.03_255)] capitalize">{log.actor}</span>
                      </div>
                      <p className="text-sm text-[#E2E8F0]">{log.description}</p>
                    </div>
                    <div className="text-xs text-[oklch(0.65_0.03_255)] shrink-0">{formatTimeAgo(log.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Record Outcome Modal */}
      {outcomeModal && (
        <RecordOutcomeModal
          submissionId={outcomeModal.submissionId}
          address={outcomeModal.address}
          assessedValue={outcomeModal.assessedValue}
          onClose={() => setOutcomeModal(null)}
          onSuccess={() => {
            setOutcomeModal(null);
            submissionsQuery.refetch();
            outcomesQuery.refetch();
            dashboardQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

/**
 * FilingJobsTable — admin view of every filing job the dispatcher has run
 * or queued. Supports status filters, retry and cancel actions.
 */
function FilingStatsBanner() {
  const statsQuery = trpc.admin.getFilingStats.useQuery(
    { windowDays: 30 },
    { refetchInterval: 60_000 }
  );
  const s = statsQuery.data;
  if (!s) return null;

  const cards = [
    { label: "Filings (30d)", value: s.totalJobs.toString() },
    {
      label: "Delivered",
      value: s.deliveredInWindow.toString(),
      hint: `${s.totalJobs > 0 ? Math.round((s.deliveredInWindow / s.totalJobs) * 100) : 0}%`,
    },
    {
      label: "Returned/failed",
      value: s.returnedInWindow.toString(),
      hint: s.returnedInWindow > 0 ? "investigate" : "clean",
      warn: s.returnedInWindow > 0,
    },
    {
      label: "Success rate (7d)",
      value:
        s.successRate7d == null ? "—" : `${Math.round(s.successRate7d * 100)}%`,
      hint: "completed / (completed + failed)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-lg border px-4 py-3 ${
            c.warn ? "border-red-200 bg-red-50" : "border-[#E2E8F0] bg-white"
          }`}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]">
            {c.label}
          </div>
          <div
            className={`font-data text-2xl font-bold ${
              c.warn ? "text-red-700" : "text-[#0F172A]"
            }`}
          >
            {c.value}
          </div>
          {c.hint && (
            <div className="text-[11px] text-[#64748B] mt-0.5">{c.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function WaitlistTable() {
  const query = trpc.admin.listWaitlist.useQuery(
    { limit: 200 },
    { refetchInterval: 60_000 }
  );
  const data = query.data;
  const entries = data?.entries ?? [];
  const aggregates = data?.aggregates ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Top counties by demand
            <span className="ml-2 text-sm font-normal text-[#64748B]">
              ({aggregates.length})
            </span>
          </h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-widest text-[#64748B]">
            <tr>
              <th className="text-left px-4 py-3">County</th>
              <th className="text-left px-4 py-3">State</th>
              <th className="text-right px-4 py-3">Waitlist size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {aggregates.map((row, idx) => (
              <tr key={idx} className="hover:bg-[#FAFAFA]">
                <td className="px-4 py-3">{row.countyName ?? "—"}</td>
                <td className="px-4 py-3">{row.state ?? "—"}</td>
                <td className="px-4 py-3 text-right font-data font-semibold">
                  {row.count}
                </td>
              </tr>
            ))}
            {aggregates.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10 text-sm text-[#94A3B8]">
                  No waitlist signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">
            Individual signups
            <span className="ml-2 text-sm font-normal text-[#64748B]">
              ({entries.length})
            </span>
          </h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-widest text-[#64748B]">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Location</th>
              <th className="text-left px-4 py-3">Notes</th>
              <th className="text-right px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {entries.map((e: any) => (
              <tr key={e.id} className="hover:bg-[#FAFAFA]">
                <td className="px-4 py-3 font-mono text-xs">{e.email}</td>
                <td className="px-4 py-3">
                  {[e.countyName, e.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[#64748B] truncate max-w-[240px]">
                  {e.notes ?? ""}
                </td>
                <td className="px-4 py-3 text-right text-xs text-[#64748B]">
                  {new Date(e.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-10 text-sm text-[#94A3B8]">
                  No individual signups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilingJobsTable() {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "processing" | "completed" | "failed" | "cancelled"
  >("all");
  const query = trpc.admin.listFilingJobs.useQuery(
    statusFilter === "all"
      ? { limit: 100 }
      : { limit: 100, status: statusFilter as any }
  );
  const utils = trpc.useUtils();
  const retry = trpc.admin.retryFiling.useMutation({
    onSuccess: () => utils.admin.listFilingJobs.invalidate(),
  });
  const cancel = trpc.admin.cancelFiling.useMutation({
    onSuccess: () => utils.admin.listFilingJobs.invalidate(),
  });

  const rows = query.data ?? [];

  return (
    <div>
      <FilingStatsBanner />
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-lg font-semibold text-[#0F172A]">
          Filing Jobs
          <span className="ml-2 text-sm font-normal text-[#64748B]">({rows.length})</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "processing", "completed", "failed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-widest text-[#64748B]">
            <tr>
              <th className="text-left px-4 py-3">Job</th>
              <th className="text-left px-4 py-3">Submission</th>
              <th className="text-left px-4 py-3">Channel</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Delivery</th>
              <th className="text-left px-4 py-3">Artifact</th>
              <th className="text-left px-4 py-3">Queued</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {rows.map((row: any) => {
              const artifact =
                row.portalConfirmationNumber ||
                row.mailTrackingNumber ||
                row.emailMessageId ||
                "—";
              return (
                <tr key={row.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3 font-mono text-xs">#{row.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">#{row.submissionId}</td>
                  <td className="px-4 py-3 text-xs">
                    {row.deliveryChannel
                      ? row.deliveryChannel.replace("_", " ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        row.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : row.status === "failed" || row.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : row.status === "processing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">
                    {row.deliveryStatus ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono truncate max-w-[180px]" title={artifact}>
                    {artifact}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">
                    {new Date(row.queuedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {(row.status === "failed" || row.status === "cancelled") && (
                      <button
                        onClick={() => retry.mutate({ jobId: row.id })}
                        disabled={retry.isPending}
                        className="text-xs text-[#7C3AED] hover:underline"
                      >
                        Retry
                      </button>
                    )}
                    {row.status !== "completed" &&
                      row.status !== "cancelled" && (
                        <button
                          onClick={() => {
                            const reason = prompt("Cancel reason (optional):");
                            cancel.mutate({
                              jobId: row.id,
                              reason: reason || undefined,
                            });
                          }}
                          disabled={cancel.isPending}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm text-[#94A3B8]">
                  No filing jobs match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

function ReferralManagementTab() {
  const [subTab, setSubTab] = useState<"leaderboard" | "tracking" | "payouts">("leaderboard");
  const statsQuery = trpc.admin.getReferralStats.useQuery(undefined, { refetchInterval: 60_000 });
  const codesQuery = trpc.admin.listReferralCodes.useQuery(undefined, {
    enabled: subTab === "leaderboard",
  });
  const trackingQuery = trpc.admin.listReferralTracking.useQuery(undefined, {
    enabled: subTab === "tracking",
  });
  const payoutsQuery = trpc.admin.listReferralPayouts.useQuery(undefined, {
    enabled: subTab === "payouts",
  });
  const utils = trpc.useUtils();

  const updatePayout = trpc.admin.updatePayoutStatus.useMutation({
    onSuccess: () => {
      utils.admin.listReferralPayouts.invalidate();
      utils.admin.getReferralStats.invalidate();
      toast.success("Payout updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateTier = trpc.admin.updateReferralTier.useMutation({
    onSuccess: () => {
      utils.admin.listReferralCodes.invalidate();
      toast.success("Tier updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const stats = statsQuery.data;

  const tierColors: Record<string, string> = {
    bronze: "bg-amber-100 text-amber-800",
    silver: "bg-gray-100 text-gray-700",
    gold: "bg-yellow-100 text-yellow-800",
    platinum: "bg-purple-100 text-purple-800",
  };

  const statusColors: Record<string, string> = {
    clicked: "bg-gray-100 text-gray-600",
    signed_up: "bg-blue-100 text-blue-700",
    submitted: "bg-indigo-100 text-indigo-700",
    paid: "bg-emerald-100 text-emerald-700",
    credited: "bg-green-100 text-green-800 font-bold",
    reversed: "bg-red-100 text-red-700",
  };

  const payoutStatusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Active Referrers", value: stats?.totalCodes ?? "—", icon: <Users size={14} /> },
          { label: "Total Referrals", value: stats?.totalReferrals ?? "—", icon: <Gift size={14} /> },
          { label: "Total Earned", value: stats?.totalEarningsCents ? `$${(stats.totalEarningsCents / 100).toLocaleString()}` : "—", icon: <DollarSign size={14} /> },
          { label: "Pending Balance", value: stats?.totalPendingCents ? `$${(stats.totalPendingCents / 100).toLocaleString()}` : "$0", icon: <Clock size={14} /> },
          { label: "Paid Out", value: stats?.totalPaidCents ? `$${(stats.totalPaidCents / 100).toLocaleString()}` : "$0", icon: <CheckCircle2 size={14} /> },
          { label: "Pending Payouts", value: stats?.pendingPayouts ?? 0, icon: <AlertTriangle size={14} />, warn: (stats?.pendingPayouts ?? 0) > 0 },
        ].map((s: any) => (
          <div key={s.label} className={`rounded-lg border px-4 py-3 ${s.warn ? "border-yellow-300 bg-yellow-50" : "border-[#E2E8F0] bg-white"}`}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-[#94A3B8] mb-1">{s.icon}{s.label}</div>
            <div className={`font-data text-xl font-bold ${s.warn ? "text-yellow-700" : "text-[#0F172A]"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {(["leaderboard", "tracking", "payouts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
              subTab === t ? "bg-[#7C3AED] text-white" : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── LEADERBOARD ──────────────────────────────────────────── */}
      {subTab === "leaderboard" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Referrer Leaderboard
              <span className="ml-2 text-sm font-normal text-[#64748B]">({codesQuery.data?.length ?? 0})</span>
            </h2>
          </div>
          {codesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#7C3AED]" size={32} /></div>
          ) : !codesQuery.data?.length ? (
            <div className="text-center py-16">
              <Gift size={40} className="text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-[#64748B]">No referral codes created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F8FAFC] text-xs uppercase tracking-widest text-[#64748B]">
                  <tr>
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Referrer</th>
                    <th className="text-left px-4 py-3">Code</th>
                    <th className="text-left px-4 py-3">Tier</th>
                    <th className="text-right px-4 py-3">Referrals</th>
                    <th className="text-right px-4 py-3">Earned</th>
                    <th className="text-right px-4 py-3">Pending</th>
                    <th className="text-right px-4 py-3">Paid</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {codesQuery.data.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-xs text-[#94A3B8] font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#0F172A] text-sm">{row.userName || "—"}</div>
                        <div className="text-xs text-[#64748B]">{row.userEmail || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#7C3AED] font-semibold">{row.code}</td>
                      <td className="px-4 py-3">
                        <select
                          value={row.tier}
                          onChange={(e) => updateTier.mutate({ codeId: row.id, tier: e.target.value as any })}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border-0 cursor-pointer ${tierColors[row.tier] || "bg-gray-100 text-gray-600"}`}
                        >
                          {["bronze", "silver", "gold", "platinum"].map((t) => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-data font-semibold">{row.lifetimeReferrals}</td>
                      <td className="px-4 py-3 text-right font-data text-emerald-600 font-semibold">${(row.lifetimeEarningsCents / 100).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-data text-yellow-600">${(row.pendingBalanceCents / 100).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-data text-[#64748B]">${(row.paidOutCents / 100).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[10px] text-[#94A3B8]">{formatDate(row.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TRACKING ─────────────────────────────────────────────── */}
      {subTab === "tracking" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Referral Events
              <span className="ml-2 text-sm font-normal text-[#64748B]">({trackingQuery.data?.length ?? 0})</span>
            </h2>
          </div>
          {trackingQuery.isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#7C3AED]" size={32} /></div>
          ) : !trackingQuery.data?.length ? (
            <div className="text-center py-16">
              <ArrowUpRight size={40} className="text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-[#64748B]">No referral events tracked yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F8FAFC] text-xs uppercase tracking-widest text-[#64748B]">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Code</th>
                    <th className="text-left px-4 py-3">Referred Email</th>
                    <th className="text-left px-4 py-3">Submission</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Commission</th>
                    <th className="text-left px-4 py-3">Tier</th>
                    <th className="text-right px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {trackingQuery.data.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">#{row.id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#7C3AED] font-semibold">{row.referralCode}</td>
                      <td className="px-4 py-3 text-xs">{row.referredEmail || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {row.submissionId ? (
                          <Link href={`/analysis?id=${row.submissionId}`} className="text-[#7C3AED] hover:underline">
                            Sub #{row.submissionId}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[row.status] || "bg-gray-100 text-gray-600"}`}>
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-data text-xs">
                        {row.commissionCents > 0 ? `$${(row.commissionCents / 100).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.commissionTier ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tierColors[row.commissionTier] || "bg-gray-100 text-gray-600"}`}>
                            {row.commissionTier}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#64748B]">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PAYOUTS ──────────────────────────────────────────────── */}
      {subTab === "payouts" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">
              Payout Requests
              <span className="ml-2 text-sm font-normal text-[#64748B]">({payoutsQuery.data?.length ?? 0})</span>
            </h2>
          </div>
          {payoutsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#7C3AED]" size={32} /></div>
          ) : !payoutsQuery.data?.length ? (
            <div className="text-center py-16">
              <DollarSign size={40} className="text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-[#64748B]">No payout requests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F8FAFC] text-xs uppercase tracking-widest text-[#64748B]">
                  <tr>
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Referrer</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Notes</th>
                    <th className="text-left px-4 py-3">Requested</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {payoutsQuery.data.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">#{row.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#0F172A] text-sm">{row.userName || "—"}</div>
                        <div className="text-xs text-[#64748B]">{row.userEmail || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-data font-semibold text-[#0F172A]">
                        ${(row.amountCents / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{row.method?.replace("_", " ") || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payoutStatusColors[row.status] || "bg-gray-100 text-gray-600"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#64748B] max-w-[200px] truncate">{row.notes || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[#64748B]">{formatDate(row.requestedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {row.status === "pending" && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => updatePayout.mutate({ payoutId: row.id, status: "processing" })}
                              disabled={updatePayout.isPending}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Process
                            </button>
                            <button
                              onClick={() => {
                                const notes = prompt("Reason for rejection (optional):");
                                updatePayout.mutate({ payoutId: row.id, status: "failed", notes: notes || undefined });
                              }}
                              disabled={updatePayout.isPending}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {row.status === "processing" && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => updatePayout.mutate({ payoutId: row.id, status: "completed" })}
                              disabled={updatePayout.isPending}
                              className="text-xs text-green-600 hover:underline font-medium"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => {
                                const notes = prompt("Failure reason:");
                                updatePayout.mutate({ payoutId: row.id, status: "failed", notes: notes || undefined });
                              }}
                              disabled={updatePayout.isPending}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Failed
                            </button>
                          </div>
                        )}
                        {(row.status === "completed" || row.status === "failed") && (
                          <span className="text-[10px] text-[#94A3B8]">
                            {row.completedAt ? formatDate(row.completedAt) : row.processedAt ? formatDate(row.processedAt) : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
