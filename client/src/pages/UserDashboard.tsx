/**
 * UserDashboard — Live data from trpc.user.getSubmissions
 * Shows real submissions, real report job status, and working PDF download/generate buttons.
 */
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Gavel,
  Trophy,
  XCircle,
  FilePlus2,
  MapPin,
  DollarSign,
  Download,
  Share2,
  Home,
  BarChart3,
  Award,
  TrendingDown,
  RefreshCw,
  Camera,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Copy, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";

type SubmissionStatus =
  | "pending"
  | "analyzing"
  | "analyzed"
  | "error"
  | "contacted"
  | "appeal-filed"
  | "hearing-scheduled"
  | "won"
  | "lost"
  | "withdrawn"
  | "archived";

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: { label: "Pending", cls: "text-slate-500", Icon: Clock },
    analyzing: { label: "Analyzing", cls: "text-purple-600", Icon: Loader2 },
    analyzed: { label: "Report Ready", cls: "text-green-600", Icon: CheckCircle2 },
    error: { label: "Analysis Error", cls: "text-red-500", Icon: AlertCircle },
    contacted: { label: "Contacted", cls: "text-blue-600", Icon: CheckCircle2 },
    "appeal-filed": { label: "Appeal Filed", cls: "text-amber-600", Icon: FilePlus2 },
    "hearing-scheduled": { label: "Hearing Scheduled", cls: "text-amber-700", Icon: Gavel },
    won: { label: "Won", cls: "text-green-700", Icon: Trophy },
    lost: { label: "Lost", cls: "text-red-600", Icon: XCircle },
    withdrawn: { label: "Withdrawn", cls: "text-slate-500", Icon: XCircle },
    archived: { label: "Archived", cls: "text-slate-400", Icon: AlertCircle },
  };
  const info = map[status] ?? { label: status, cls: "text-slate-500", Icon: AlertCircle };
  const spin = status === "analyzing";
  return (
    <div className={`flex items-center gap-2 text-sm font-semibold ${info.cls}`}>
      <info.Icon size={14} className={spin ? "animate-spin" : ""} />
      {info.label}
    </div>
  );
}

/** Per-card PDF download/generate button with its own job polling */
function ReportButton({ submissionId, status }: { submissionId: number; status: SubmissionStatus }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Check if a report job already exists
  const { data: jobData, isLoading: jobLoading } = trpc.payments.getReportDownloadUrl.useQuery(
    { submissionId },
    {
      enabled: status === "analyzed" || status === "contacted" || status === "appeal-filed" || status === "hearing-scheduled" || status === "won" || status === "lost",
      retry: false,
    }
  );

  const generateMutation = trpc.payments.generateReportAsync.useMutation({
    onSuccess: (_data: unknown) => {
      toast.success("Report generation started — ready in under a minute.");
      utils.payments.getReportDownloadUrl.invalidate({ submissionId });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg?.includes("payment") || msg?.includes("tier")) {
        toast.error("Upgrade to Pro Se or Automated Filing to download the full PDF report.");
        navigate(`/analysis?id=${submissionId}`);
      } else {
        toast.error(msg || "Failed to generate report.");
      }
    },
  });

  if (status === "pending" || status === "analyzing") {
    return (
      <Button variant="outline" size="sm" disabled className="flex-1 border-border text-muted-foreground">
        <Clock className="w-4 h-4 mr-2" />
        Analyzing...
      </Button>
    );
  }

  if (jobLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="flex-1 border-border">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (jobData?.url) {
    return (
      <a href={jobData.url} target="_blank" rel="noopener noreferrer" className="flex-1">
        <Button variant="outline" size="sm" className="w-full border-green-600/50 text-green-600 hover:bg-green-600/10">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </a>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1 border-purple-600/50 text-purple-600 hover:bg-purple-600/10"
      disabled={generateMutation.isPending}
      onClick={() => generateMutation.mutate({ submissionId })}
    >
      {generateMutation.isPending ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
      ) : (
        <><FileText className="w-4 h-4 mr-2" />Generate PDF</>
      )}
    </Button>
  );
}

export default function UserDashboard() {
  usePageMeta({
    title: "My Dashboard",
    description: "Your property tax appeal submissions and reports.",
    noindex: true,
  });
  const { user, isAuthenticated, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [copiedRef, setCopiedRef] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Live submissions from backend
  const { data: submissions = [], isLoading: subLoading, refetch } = trpc.user.getSubmissions.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000, // auto-refresh every 30s to catch status changes
  });

  // Handle Stripe redirect-back with ?payment=success (fallback for any tier)
  // Primary handlers live in AnalysisResults and AppealFilingWorkflow;
  // this catches any edge-case where the user lands on the dashboard instead.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Payment confirmed! Your report is being prepared.");
      refetch();
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and search — all hooks MUST be before any early returns
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchesSearch =
        s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.county || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginated = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Portfolio stats from live data
  const stats = useMemo(() => {
    const won = submissions.filter((s) => s.status === "won");
    const totalSavings = submissions.reduce((sum, s) => sum + (s.potentialSavings || 0), 0);
    const winRate = submissions.length > 0
      ? Math.round((won.length / submissions.length) * 100)
      : 0;
    return {
      totalProperties: submissions.length,
      winRate,
      totalSavings,
      active: submissions.filter((s) =>
        ["analyzing", "analyzed", "contacted", "appeal-filed", "hearing-scheduled"].includes(s.status)
      ).length,
    };
  }, [submissions]);

  // Use real referral code from the API
  const { data: referralData } = trpc.referral.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const referralLink = referralData?.code
    ? `${window.location.origin}/ref/${referralData.code}`
    : `${window.location.origin}/ref/loading...`;

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your dashboard</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-12">
        {/* Welcome Section */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Welcome back, {user?.name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-muted-foreground text-lg">
              Your property tax appeal portfolio
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link href="/get-started">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <FilePlus2 className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Home className="w-4 h-4" />
              <span className="text-sm">Properties</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{stats.totalProperties}</div>
          </Card>
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Active</span>
            </div>
            <div className="text-3xl font-bold text-purple-500">{stats.active}</div>
          </Card>
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Award className="w-4 h-4" />
              <span className="text-sm">Win Rate</span>
            </div>
            <div className="text-3xl font-bold text-green-500">{stats.winRate}%</div>
          </Card>
          <Card className="bg-card border-border p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">Est. Savings</span>
            </div>
            <div className="text-3xl font-bold text-amber-500">
              {stats.totalSavings > 0
                ? `$${(stats.totalSavings / 1000).toFixed(0)}k`
                : "—"}
            </div>
          </Card>
        </div>

        {/* Referral Card */}
        <div className="mb-12">
          <Card className="bg-gradient-to-r from-purple-600/10 to-teal-600/10 border-purple-600/30 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-foreground mb-1">Refer a Homeowner — Earn Commission</div>
                <p className="text-xs text-muted-foreground">Share your link. Earn a percentage of every filing fee paid by your referrals.</p>
              </div>
              <div className="flex gap-2 min-w-0 w-full sm:w-auto sm:max-w-xs">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground font-mono truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                  className="p-2 rounded-lg hover:bg-purple-600/20 transition-colors border border-border"
                >
                  {copiedRef ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by address or county..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-600"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as SubmissionStatus | "all"); setCurrentPage(1); }}
            className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-600"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="analyzing">Analyzing</option>
            <option value="analyzed">Report Ready</option>
            <option value="appeal-filed">Appeal Filed</option>
            <option value="hearing-scheduled">Hearing Scheduled</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        {/* Reports Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Your Properties</h2>

          {submissions.length === 0 ? (
            <Card className="bg-card border-border p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No analyses yet</h3>
              <p className="text-muted-foreground mb-6">Submit your first property address to get an instant AI appraisal</p>
              <Link href="/get-started">
                <Button className="bg-purple-600 hover:bg-purple-700">Start Your First Analysis</Button>
              </Link>
            </Card>
          ) : filteredSubmissions.length === 0 ? (
            <Card className="bg-card border-border p-8 text-center">
              <p className="text-muted-foreground">No results match your filters.</p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {paginated.map((sub) => (
                  <Card
                    key={sub.id}
                    className="bg-card border-border hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/10 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                            <h3 className="font-bold text-foreground truncate">{sub.address}</h3>
                          </div>
                          {sub.county && (
                            <div className="text-sm text-muted-foreground ml-6">{sub.county}{sub.state ? `, ${sub.state}` : ""}</div>
                          )}
                        </div>
                        <div className="ml-3 shrink-0">
                          <StatusBadge status={sub.status as SubmissionStatus} />
                        </div>
                      </div>

                      {/* Stats row */}
                      {(sub.assessedValue || sub.marketValue || sub.potentialSavings) ? (
                        <>
                          <div className="border-t border-border my-4" />
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Assessed</div>
                              <div className="font-bold text-foreground">
                                {sub.assessedValue ? `$${(sub.assessedValue / 1000).toFixed(0)}k` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">AI Estimate</div>
                              <div className="font-bold text-purple-400">
                                {sub.marketValue ? `$${(sub.marketValue / 1000).toFixed(0)}k` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Potential Savings</div>
                              <div className="font-bold text-green-400">
                                {sub.potentialSavings ? `$${(sub.potentialSavings / 1000).toFixed(0)}k` : "—"}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}

                      {/* Appeal strength */}
                      {sub.appealStrengthScore != null && (
                        <div className="bg-background/50 rounded-lg p-3 mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-muted-foreground">Appeal Strength</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-green-500"
                                style={{ width: `${sub.appealStrengthScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-foreground">{sub.appealStrengthScore}/100</span>
                          </div>
                        </div>
                      )}

                      {/* Filing method + deadline */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span className="capitalize">
                          {sub.filingMethod === "poa" ? "Automated Filing" : sub.filingMethod === "pro-se" ? "Pro Se (DIY)" : "Free Analysis"}
                        </span>
                        {sub.appealDeadline && (
                          <span className="text-amber-500 font-medium">
                            Deadline: {new Date(sub.appealDeadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/analysis?id=${sub.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-border hover:border-purple-600/50"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analysis
                          </Button>
                        </Link>
                        <ReportButton submissionId={sub.id} status={sub.status as SubmissionStatus} />
                        <Link href={`/get-started?address=${encodeURIComponent(sub.address)}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border hover:border-purple-600/50"
                            title="Add photos"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border hover:border-purple-600/50"
                          title="Share"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/analysis?id=${sub.id}`);
                            toast.success("Link copied!");
                          }}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={page === currentPage ? "bg-purple-600" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
