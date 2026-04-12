import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingDown, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface UserSubmission {
  id: number;
  address: string;
  status: "pending" | "analyzing" | "analyzed" | "error";
  assessedValue: number;
  marketValue: number | null;
  potentialSavings: number | null;
  appealStrength: number | null;
  createdAt: string;
}

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // In a real app, this would call trpc.user.getSubmissions
      // For now, we'll show a placeholder
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

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

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold text-[#0F172A] mb-2">
            Your Dashboard
          </h1>
          <p className="text-[#64748B]">
            Welcome back, {user?.name || user?.email}. Track your appraisals and appeals here.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
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
              Analyzed
            </div>
            <div className="font-data text-3xl font-bold text-[#7C3AED]">
              {submissions.filter((s) => s.status === "analyzed").length}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">
              Total Potential Savings
            </div>
            <div className="font-data text-3xl font-bold text-[#0F172A]">
              $
              {submissions
                .reduce((sum, s) => sum + (s.potentialSavings || 0), 0)
                .toLocaleString()}
            </div>
          </Card>

          <Card className="p-6 bg-white border border-[#E2E8F0]">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">
              In Progress
            </div>
            <div className="font-data text-3xl font-bold text-[#64748B]">
              {submissions.filter((s) => s.status === "pending" || s.status === "analyzing").length}
            </div>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card className="bg-white border border-[#E2E8F0] overflow-hidden">
          <div className="p-6 border-b border-[#E2E8F0]">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">
              Your Submissions
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin text-[#7C3AED] mx-auto mb-4" size={32} />
              <p className="text-[#64748B]">Loading your submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-[#E2E8F0] mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">
                No Submissions Yet
              </h3>
              <p className="text-[#64748B] mb-6">
                Start by getting a free property analysis.
              </p>
              <Link href="/get-started" className="btn-gold px-6 py-3 rounded font-semibold inline-block">
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
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="border-b border-[#E2E8F0] hover:bg-[oklch(0.98_0.01_85)] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#0F172A]">
                          {submission.address}
                        </div>
                        <div className="text-xs text-[#64748B] mt-1">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {submission.status === "pending" && (
                            <>
                              <Clock size={14} className="text-[#64748B]" />
                              <span className="text-sm text-[#64748B]">Pending</span>
                            </>
                          )}
                          {submission.status === "analyzing" && (
                            <>
                              <Loader2 size={14} className="animate-spin text-[#7C3AED]" />
                              <span className="text-sm text-[#7C3AED]">Analyzing</span>
                            </>
                          )}
                          {submission.status === "analyzed" && (
                            <>
                              <CheckCircle2 size={14} className="text-green-600" />
                              <span className="text-sm text-green-600">Analyzed</span>
                            </>
                          )}
                          {submission.status === "error" && (
                            <>
                              <AlertCircle size={14} className="text-red-600" />
                              <span className="text-sm text-red-600">Error</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-[#0F172A]">
                        ${submission.assessedValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {submission.marketValue ? (
                          <span className="font-semibold text-[#0F172A]">
                            ${submission.marketValue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {submission.potentialSavings ? (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingDown size={14} className="text-green-600" />
                            <span className="font-semibold text-green-600">
                              ${submission.potentialSavings.toLocaleString()}/yr
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#64748B]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {submission.status === "analyzed" && (
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* CTA */}
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
