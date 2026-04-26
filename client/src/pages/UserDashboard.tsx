import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import { ManusLoginButton } from "@/components/ManusLoginButton";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { Link } from "wouter";

function formatCurrency(value: number | null | undefined) {
  if (!value) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    analyzing: "bg-blue-100 text-blue-800",
    analyzed: "bg-green-100 text-green-800",
    contacted: "bg-purple-100 text-purple-800",
    "appeal-filed": "bg-indigo-100 text-indigo-800",
    "hearing-scheduled": "bg-orange-100 text-orange-800",
    won: "bg-emerald-100 text-emerald-800",
    lost: "bg-red-100 text-red-800",
    withdrawn: "bg-gray-100 text-gray-700",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    analyzing: "Analyzing",
    analyzed: "Ready",
    contacted: "In Review",
    "appeal-filed": "Filed",
    "hearing-scheduled": "Hearing Set",
    won: "Won",
    lost: "Lost",
    withdrawn: "Withdrawn",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  const submissionsQuery = trpc.user.getSubmissions.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });

  if (loading || (isAuthenticated && submissionsQuery.isLoading)) {
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
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">
            Sign In to View Your Dashboard
          </h1>
          <p className="text-[#64748B] mb-8 max-w-2xl mx-auto">
            Open your AppraiseAI workspace with Manus to review active analyses, track appeal progress, and jump back into the exact property you were working on.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ManusLoginButton
              className="btn-gold px-6 py-3 h-auto rounded font-semibold"
              dialogTitle="Open your dashboard"
              dialogDescription="We’ll bring you straight back to your dashboard after Manus signs you in."
            >
              Continue with Manus
            </ManusLoginButton>
            <Link
              href="/"
              className="px-6 py-3 rounded border border-[#0F172A] text-[#0F172A] font-semibold hover:bg-[#0F172A] hover:text-white transition-colors inline-block"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (submissionsQuery.error) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <div className="container py-20">
          <Card className="max-w-2xl mx-auto p-8 text-center bg-white border border-[#E2E8F0]">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-[#0F172A] mb-3">
              We couldn’t load your dashboard
            </h1>
            <p className="text-[#64748B] mb-6">
              {submissionsQuery.error.message}
            </p>
            <Button onClick={() => submissionsQuery.refetch()} variant="outline">
              Try Again
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const submissions = submissionsQuery.data ?? [];
  const completedCount = submissions.filter(
    (submission) => !["pending", "analyzing"].includes(submission.status)
  ).length;
  const openCases = submissions.filter((submission) =>
    [
      "pending",
      "analyzing",
      "contacted",
      "appeal-filed",
      "hearing-scheduled",
    ].includes(submission.status)
  ).length;
  const totalPotentialSavings = submissions.reduce(
    (sum, submission) => sum + (submission.potentialSavings ?? 0),
    0
  );
  const confirmedSavings = submissions.reduce(
    (sum, submission) => sum + (submission.outcome?.annualTaxSavings ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <div className="container py-12">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold text-[#0F172A] mb-2">
              Your Dashboard
            </h1>
            <p className="text-[#64748B] max-w-2xl">
              Welcome back, {user?.name || user?.email}. Your Manus session is active, and your recent submissions are synced below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => submissionsQuery.refetch()}
              disabled={submissionsQuery.isFetching}
            >
              <RefreshCw
                size={16}
                className={submissionsQuery.isFetching ? "animate-spin" : ""}
              />
              Refresh
            </Button>
            <Link
              href="/get-started"
              className="btn-gold px-6 py-3 rounded font-semibold inline-block"
            >
              Analyze Another Property
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">
              Total Submissions
            </div>
            <div className="font-data text-3xl font-bold text-[#0F172A]">
              {submissions.length}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">
              Completed Analyses
            </div>
            <div className="font-data text-3xl font-bold text-[#7C3AED]">
              {completedCount}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">
              Open Cases
            </div>
            <div className="font-data text-3xl font-bold text-[#0F172A]">
              {openCases}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">
              Potential Savings
            </div>
            <div className="font-data text-3xl font-bold text-green-600">
              {formatCurrency(totalPotentialSavings)}
            </div>
            {confirmedSavings > 0 ? (
              <div className="mt-2 text-xs text-[#64748B]">
                Confirmed savings: {formatCurrency(confirmedSavings)}/yr
              </div>
            ) : null}
          </Card>
        </div>

        <Card className="bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F172A]">
                Recent Submissions
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                Track analysis progress, review results, and jump back into your appeal workflow.
              </p>
            </div>
            <div className="text-xs text-[#64748B] whitespace-nowrap">
              Auto-refreshes every 15s
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-[#E2E8F0] mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">
                No submissions yet
              </h3>
              <p className="text-[#64748B] mb-6 max-w-md mx-auto">
                Start a new AI appraisal to see over-assessment risk, estimated savings, and the best next step for an appeal.
              </p>
              <Link
                href="/get-started"
                className="btn-gold px-6 py-3 rounded font-semibold inline-block"
              >
                Get Free Analysis
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[oklch(0.94_0.018_85)] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">
                      Assessed Value
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">
                      Market Value
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">
                      Potential Savings
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => {
                    const actionLabel = ["pending", "analyzing"].includes(submission.status)
                      ? "Track Analysis"
                      : "Open Analysis";

                    return (
                      <tr
                        key={submission.id}
                        className="border-b border-[#E2E8F0] hover:bg-[oklch(0.98_0.01_85)] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#0F172A]">
                            {submission.address}
                          </div>
                          <div className="text-xs text-[#64748B] mt-1">
                            {formatDate(submission.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {["pending", "analyzing"].includes(submission.status) ? (
                              <Clock size={14} className="text-[#64748B]" />
                            ) : submission.status === "won" ? (
                              <CheckCircle2 size={14} className="text-green-600" />
                            ) : null}
                            <StatusBadge status={submission.status} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-[#0F172A]">
                          {formatCurrency(submission.assessedValue)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-[#0F172A]">
                          {formatCurrency(submission.marketValue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {submission.potentialSavings ? (
                            <div className="flex items-center justify-end gap-1 text-green-600">
                              <TrendingDown size={14} />
                              <span className="font-semibold">
                                {formatCurrency(submission.potentialSavings)}/yr
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#64748B]">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/analysis?id=${submission.id}`}>
                              {actionLabel}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <h3 className="font-display text-xl font-bold text-[#0F172A] mb-2">
              Need the investor view?
            </h3>
            <p className="text-[#64748B] mb-4">
              Open your portfolio to compare multiple properties side by side and monitor total savings across the account.
            </p>
            <Link href="/portfolio" className="text-[#7C3AED] font-semibold hover:underline">
              Open Portfolio
            </Link>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <h3 className="font-display text-xl font-bold text-[#0F172A] mb-2">
              Ready to start another case?
            </h3>
            <p className="text-[#64748B] mb-4">
              Submit another address to generate a fresh analysis and see whether the county assessment looks inflated.
            </p>
            <Link href="/get-started" className="text-[#7C3AED] font-semibold hover:underline">
              Start a New Analysis
            </Link>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
