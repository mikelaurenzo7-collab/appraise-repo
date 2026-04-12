import { useState } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  Building2,
  MapPin,
  DollarSign,
  Users,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    pending:   { label: "Pending",   classes: "bg-yellow-100 text-yellow-800" },
    analyzing: { label: "Analyzing", classes: "bg-blue-100 text-blue-800" },
    analyzed:  { label: "Complete",  classes: "bg-green-100 text-green-800" },
    error:     { label: "Error",     classes: "bg-red-100 text-red-800" },
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

export default function AdminDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch, isFetching } = trpc.admin.listSubmissions.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { enabled: isAuthenticated && user?.role === "admin", refetchInterval: 15000, refetchOnWindowFocus: false }
  );

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[oklch(0.975_0.012_85)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[oklch(0.72_0.12_75)]" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[oklch(0.975_0.012_85)] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-[oklch(0.72_0.12_75)] mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-[oklch(0.18_0.06_255)] mb-4">Admin Access Required</h1>
          <a href={getLoginUrl()} className="btn-gold px-6 py-3 rounded font-semibold inline-block">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[oklch(0.975_0.012_85)] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-[oklch(0.18_0.06_255)] mb-2">Access Denied</h1>
          <p className="text-[oklch(0.45_0.04_255)]">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  const submissions = data?.submissions ?? [];
  const stats = data?.stats;

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      {/* Header */}
      <div className="bg-[oklch(0.18_0.06_255)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm">
            <Building2 size={16} />
            AppraiseAI
          </Link>
          <span className="text-white/30">/</span>
          <span className="text-white text-sm font-semibold">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch?.()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <span className="text-xs text-white/40">{user?.name || user?.email}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: <Users size={18} />,
              label: "Total Submissions",
              value: stats?.total ?? "—",
              color: "text-[oklch(0.18_0.06_255)]",
            },
            {
              icon: <CheckCircle2 size={18} />,
              label: "Analyses Complete",
              value: stats?.analyzed ?? "—",
              color: "text-green-600",
            },
            {
              icon: <Activity size={18} />,
              label: "In Progress",
              value: (stats?.pending ?? 0) + (stats?.analyzing ?? 0),
              color: "text-blue-600",
            },
            {
              icon: <DollarSign size={18} />,
              label: "Avg. Potential Savings",
              value: stats?.avgSavings ? formatCurrency(stats.avgSavings) : "—",
              color: "text-[oklch(0.72_0.12_75)]",
            },
          ].map((s) => (
            <div key={s.label} className="p-5 rounded-xl bg-white border border-[oklch(0.88_0.015_85)] shadow-sm">
              <div className="flex items-center gap-2 text-[oklch(0.55_0.04_255)] mb-2">
                {s.icon}
                <span className="text-xs">{s.label}</span>
              </div>
              <div className={`font-data text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_85)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[oklch(0.88_0.015_85)] flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-[oklch(0.18_0.06_255)]">Property Submissions</h2>
            <span className="text-xs text-[oklch(0.55_0.04_255)]">Auto-refreshes every 15s</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[oklch(0.72_0.12_75)]" size={32} />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={40} className="text-[oklch(0.88_0.015_85)] mx-auto mb-3" />
              <p className="text-[oklch(0.55_0.04_255)]">No submissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[oklch(0.88_0.015_85)] bg-[oklch(0.975_0.012_85)]">
                    {["ID", "Address", "Email", "Type", "Assessed", "Market", "Savings", "Score", "Status", "Date", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[oklch(0.55_0.04_255)] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, i) => (
                    <tr
                      key={sub.id}
                      className={`border-b border-[oklch(0.92_0.01_255)] hover:bg-[oklch(0.975_0.012_85)] transition-colors ${
                        i % 2 === 0 ? "" : "bg-[oklch(0.985_0.008_85)]"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-[oklch(0.55_0.04_255)]">#{sub.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5">
                          <MapPin size={12} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium text-[oklch(0.18_0.06_255)] max-w-[180px] truncate">{sub.address}</div>
                            <div className="text-xs text-[oklch(0.55_0.04_255)]">
                              {[sub.city, sub.state, sub.zipCode].filter(Boolean).join(", ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[oklch(0.45_0.04_255)] max-w-[140px] truncate">{sub.email}</td>
                      <td className="px-4 py-3 capitalize text-[oklch(0.45_0.04_255)]">{sub.propertyType || "—"}</td>
                      <td className="px-4 py-3 font-data text-[oklch(0.18_0.06_255)]">{formatCurrency(sub.assessedValue)}</td>
                      <td className="px-4 py-3 font-data text-[oklch(0.72_0.12_75)]">{formatCurrency(sub.marketValue)}</td>
                      <td className="px-4 py-3 font-data text-green-600 font-semibold">{formatCurrency(sub.potentialSavings)}</td>
                      <td className="px-4 py-3">
                        {sub.appealStrengthScore != null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-[oklch(0.92_0.01_255)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[oklch(0.72_0.12_75)]"
                                style={{ width: `${sub.appealStrengthScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-[oklch(0.45_0.04_255)]">{sub.appealStrengthScore}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-3 text-xs text-[oklch(0.55_0.04_255)]">{formatDate(sub.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/analysis?id=${sub.id}`}
                          className="inline-flex items-center gap-1 text-xs text-[oklch(0.18_0.06_255)] hover:text-[oklch(0.72_0.12_75)] transition-colors"
                        >
                          <Eye size={13} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {(data?.total ?? 0) > PAGE_SIZE && (
            <div className="px-6 py-4 border-t border-[oklch(0.88_0.015_85)] flex items-center justify-between">
              <span className="text-xs text-[oklch(0.55_0.04_255)]">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0)} of {data?.total ?? 0}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded border border-[oklch(0.88_0.015_85)] text-xs text-[oklch(0.45_0.04_255)] hover:bg-[oklch(0.975_0.012_85)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)}
                  className="px-3 py-1.5 rounded border border-[oklch(0.88_0.015_85)] text-xs text-[oklch(0.45_0.04_255)] hover:bg-[oklch(0.975_0.012_85)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
