import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  TrendingDown,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Gavel,
  Trophy,
  XCircle,
  FilePlus2,
} from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

type SubmissionStatus =
  | "pending"
  | "analyzing"
  | "analyzed"
  | "contacted"
  | "appeal-filed"
  | "hearing-scheduled"
  | "won"
  | "lost"
  | "withdrawn"
  | "archived";

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: { label: "Pending", cls: "text-[#64748B]", Icon: Clock },
    analyzing: { label: "Analyzing", cls: "text-[#7C3AED]", Icon: Loader2 },
    analyzed: { label: "Analyzed", cls: "text-green-600", Icon: CheckCircle2 },
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
    <div className={`flex items-center gap-2 ${info.cls}`}>
      <info.Icon size={14} className={spin ? "animate-spin" : ""} />
      <span className="text-sm font-medium">{info.label}</span>
    </div>
  );
}

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  const submissionsQuery = trpc.user.getSubmissions.useQuery(undefined, {
    enabled: isAuthenticated,
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
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">
            Sign In to View Your Dashboard
          </h1>
          <p className="text-[#64748B] mb-8">
            Track your property appraisals and appeals in one place.
          </p>
          <Link href="/" className="btn-gold px-6 py-3 rounded font-semibold inline-block">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const submissions = submissionsQuery.data ?? [];
  const isLoading = submissionsQuery.isLoading;
  const analyzed = submissions.filter((s) => s.status === "analyzed" || s.status === "contacted" || s.status === "appeal-filed" || s.status === "hearing-scheduled" || s.status === "won" || s.status === "lost");
  const inProgress = submissions.filter((s) => s.status === "pending" || s.status === "analyzing");
  const totalPotentialSavings = submissions.reduce((sum, s) => sum + (s.potentialSavings ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <div className="container py-12">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold text-[#0F172A] mb-2">Your Dashboard</h1>
          <p className="text-[#64748B]">
            Welcome back, {user?.name || user?.email}. Track your appraisals and appeals here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">Total Submissions</div>
            <div className="font-data text-3xl font-bold text-[#0F172A]">{submissions.length}</div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">Analyzed</div>
            <div className="font-data text-3xl font-bold text-[#7C3AED]">{analyzed.length}</div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">Total Potential Savings</div>
            <div className="font-data text-3xl font-bold text-[#0F172A]">
              ${totalPotentialSavings.toLocaleString()}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">In Progress</div>
            <div className="font-data text-3xl font-bold text-[#64748B]">{inProgress.length}</div>
          </Card>
        </div>

        <Card className="bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">Your Submissions</h2>
            {submissionsQuery.isFetching && !isLoading && (
              <Loader2 size={16} className="animate-spin text-[#7C3AED]" />
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-[#7C3AED] mx-auto mb-4" size={32} />
              <p className="text-[#64748B]">Loading your submissions...</p>
            </div>
          ) : submissionsQuery.error ? (
            <div className="p-12 text-center">
              <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
              <p className="text-[#64748B] mb-4">Couldn&apos;t load your submissions.</p>
              <p className="text-xs text-slate-500 mb-4">{submissionsQuery.error.message}</p>
              <Button variant="outline" onClick={() => submissionsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-[#E2E8F0] mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">No Submissions Yet</h3>
              <p className="text-[#64748B] mb-6">Start by getting a free property analysis.</p>
              <Link href="/get-started" className="btn-gold px-6 py-3 rounded font-semibold inline-block">
                Get Free Analysis
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[oklch(0.94_0.018_85)] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">Assessed</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">Market</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">Potential Savings</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[#E2E8F0] hover:bg-[oklch(0.98_0.01_85)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#0F172A]">{s.address}</div>
                        <div className="text-xs text-[#64748B] mt-1">
                          {s.city ? `${s.city}, ` : ""}{s.state} {s.zipCode} · {new Date(s.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={s.status as SubmissionStatus} />
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-[#0F172A]">
                        {s.assessedValue ? `$${s.assessedValue.toLocaleString()}` : <span className="text-[#64748B]">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.marketValue ? (
                          <span className="font-semibold text-[#0F172A]">${s.marketValue.toLocaleString()}</span>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.potentialSavings ? (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown size={14} className="text-green-600" />
                            <span className="font-semibold text-green-600">
                              ${s.potentialSavings.toLocaleString()}/yr
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/analysis?id=${s.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
                          {(s.status === "analyzed" || s.status === "contacted") && (
                            <Link href={`/appeal-workflow/${s.id}`}>
                              <Button size="sm">File Appeal</Button>
                            </Link>
                          )}
                          <Link href={`/report?submissionId=${s.id}`}>
                            <Button variant="ghost" size="sm">Report</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-12 text-center">
          <Link href="/get-started" className="btn-gold px-8 py-4 rounded font-semibold inline-block">
            Analyze Another Property
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
