import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  Shield,
  Scale,
  FileText,
  Clock,
  AlertTriangle,
  Loader2,
  Home as HomeIcon,
  BarChart3,
  MapPin,
  Calendar,
  Building2,
  Activity,
  Zap,
  RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyMapView from "@/components/PropertyMapView";
import { trpc } from "@/lib/trpc";

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "oklch(0.65 0.18 145)" // green
      : score >= 40
      ? "oklch(0.72 0.12 75)" // gold
      : "oklch(0.55 0.2 25)"; // red

  const label = score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Weak";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.92 0.01 255)" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 264} 264`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-data text-3xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-[#64748B]">/ 100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold" style={{ color }}>
        {label} Appeal
      </span>
    </div>
  );
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function AnalysisResults() {
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const submissionId = params.get("id") ? parseInt(params.get("id")!, 10) : null;
  const generateReportMutation = trpc.properties.generateReport.useMutation();

  const { data, isLoading, error } = trpc.properties.getAnalysis.useQuery(
    { submissionId: submissionId! },
    { enabled: !!submissionId, refetchInterval: (query) => {
      // Poll every 3 seconds while still analyzing
      const status = query.state.data?.submission?.status;
      return status === "pending" || status === "analyzing" ? 3000 : false;
    }}
  );

  if (!submissionId) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="container max-w-2xl text-center">
            <AlertTriangle size={48} className="text-[#7C3AED] mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">No Submission Found</h1>
            <p className="text-[#64748B] mb-8">Please submit your property address first to get an analysis.</p>
            <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="container max-w-2xl text-center">
            <Loader2 size={48} className="text-[#7C3AED] mx-auto mb-4 animate-spin" />
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Loading Analysis...</h1>
            <p className="text-[#64748B]">Fetching your property analysis results.</p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const submission = data?.submission;
  const analysis = data?.analysis;
  const isAnalyzing = submission?.status === "pending" || submission?.status === "analyzing";

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="container max-w-2xl text-center">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-[#F1F5F9]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#7C3AED] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 size={28} className="text-[#7C3AED]" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Analyzing Your Property</h1>
            <p className="text-[#64748B] text-lg mb-8 max-w-md mx-auto">
              Our AI is pulling assessor records, comparable sales, and market data for your property. This typically takes 30-60 seconds.
            </p>

            <div className="max-w-md mx-auto space-y-3">
              {[
                { label: "Pulling assessor records", done: true },
                { label: "Querying comparable sales", done: submission?.status === "analyzing" },
                { label: "Running AI valuation model", done: false },
                { label: "Generating appeal analysis", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0]">
                  {step.done ? (
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-[#E2E8F0] shrink-0" />
                  )}
                  <span className={`text-sm ${step.done ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // Analysis complete — show results
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      {/* Header */}
      <section className="bg-[#0F172A] pt-28 pb-16 lg:pt-36 lg:pb-20">
        <div className="container">
          <div className="flex items-center gap-2 text-[#7C3AED] text-sm mb-4">
            <MapPin size={14} />
            <span>
              {submission?.address}
              {submission?.city ? `, ${submission.city}` : ""}
              {submission?.state ? `, ${submission.state}` : ""}
              {submission?.zipCode ? ` ${submission.zipCode}` : ""}
            </span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-white mb-2">Your Property Analysis</h1>
          <p className="text-white/60">
            {submission?.county ? `${submission.county} County · ` : ""}
            {submission?.propertyType ? submission.propertyType.charAt(0).toUpperCase() + submission.propertyType.slice(1) : "Residential"}
          </p>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-12 -mt-8">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Assessed vs Market */}
            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-3">Assessed Value</div>
              <div className="font-data text-3xl font-bold text-[#0F172A] mb-1">
                {formatCurrency(submission?.assessedValue)}
              </div>
              <div className="text-xs text-[#64748B]">Current county assessment</div>
            </div>

            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-3">Market Value Estimate</div>
              <div className="font-data text-3xl font-bold text-[#7C3AED] mb-1">
                {formatCurrency(submission?.marketValue || analysis?.marketValueEstimate)}
              </div>
              <div className="text-xs text-[#64748B]">AI-estimated fair market value</div>
            </div>

            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-3">Potential Annual Savings</div>
              <div className="font-data text-3xl font-bold text-green-600 mb-1">
                {formatCurrency(submission?.potentialSavings)}
              </div>
              <div className="text-xs text-[#64748B]">If appeal is successful</div>
            </div>
          </div>
        </div>
      </section>

      {/* Appeal Strength + Summary */}
      <section className="pb-12">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Appeal Strength */}
            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-4">Appeal Strength</div>
              <ScoreGauge score={submission?.appealStrengthScore || 0} />
              <div className="mt-4 text-center">
                <div className="text-xs text-[#64748B]">
                  {analysis?.recommendedApproach === "poa"
                    ? "We recommend filing via Power of Attorney"
                    : analysis?.recommendedApproach === "pro-se"
                    ? "We recommend a Pro Se filing"
                    : "Appeal may not be recommended"}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-3">Executive Summary</div>
              <p className="text-[#E2E8F0] leading-relaxed mb-6">
                {analysis?.executiveSummary || "Analysis summary is being generated..."}
              </p>

              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-3">Valuation Methodology</div>
              <p className="text-sm text-[#64748B] leading-relaxed">
                {analysis?.valuationJustification || "Valuation details are being prepared..."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Property Map View */}
      {submission && analysis && (
        <section className="pb-12">
          <div className="container">
            <div className="mb-4">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-2">Property Location & Comparable Sales</div>
              <p className="text-sm text-[#64748B]">Interactive map showing your property and comparable sales in the area</p>
            </div>
            <PropertyMapView
              address={submission.address}
              city={submission.city || undefined}
              state={submission.state || undefined}
              zipCode={submission.zipCode || undefined}
              marketValue={submission.marketValue || undefined}
              assessedValue={submission.assessedValue || undefined}
              comparableSales={(analysis.comparableSales ?? []) as any}
            />
          </div>
        </section>
      )}
      {/* Appeal Strength Factors */}
      {analysis?.appealStrengthFactors && analysis.appealStrengthFactors.length > 0 && (
        <section className="pb-12">
          <div className="container">
            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-4">Key Factors Supporting Your Appeal</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {(analysis.appealStrengthFactors as string[]).map((factor, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#F1F5F9]">
                    <CheckCircle2 size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#E2E8F0]">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Property Details */}
      <section className="pb-12">
        <div className="container">
          <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
            <div className="text-xs text-[#64748B] uppercase tracking-widest mb-4">Property Details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Type", value: submission?.propertyType || "Residential", icon: <Building2 size={16} /> },
                { label: "Sq Ft", value: submission?.squareFeet?.toLocaleString() || "N/A", icon: <HomeIcon size={16} /> },
                { label: "Year Built", value: submission?.yearBuilt?.toString() || "N/A", icon: <Calendar size={16} /> },
                { label: "Bedrooms", value: submission?.bedrooms?.toString() || "N/A", icon: <HomeIcon size={16} /> },
                { label: "Bathrooms", value: submission?.bathrooms?.toString() || "N/A", icon: <HomeIcon size={16} /> },
                { label: "County", value: submission?.county || "N/A", icon: <MapPin size={16} /> },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-[#F1F5F9]">
                  <div className="flex items-center gap-1.5 text-[#64748B] mb-1">
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <div className="font-semibold text-sm text-[#0F172A] capitalize">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      {analysis?.nextSteps && analysis.nextSteps.length > 0 && (
        <section className="pb-12">
          <div className="container">
            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-4">Recommended Next Steps</div>
              <div className="space-y-3">
                {(analysis.nextSteps as string[]).map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-[#F1F5F9]">
                    <div className="w-6 h-6 rounded-full bg-[#0F172A] text-[#7C3AED] flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm text-[#E2E8F0]">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Appeal Deadline Alert */}
      {submission?.appealDeadline && (
        <section className="pb-12">
          <div className="container">
            <div className={`p-5 rounded-xl border-2 flex items-start gap-4 ${
              new Date(submission.appealDeadline).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000
                ? "border-red-300 bg-red-50"
                : new Date(submission.appealDeadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
                ? "border-yellow-300 bg-yellow-50"
                : "border-[#7C3AED]/30 bg-[#7C3AED]/5"
            }`}>
              <AlertTriangle size={20} className={`shrink-0 mt-0.5 ${
                new Date(submission.appealDeadline).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000
                  ? "text-red-600" : "text-[#7C3AED]"
              }`} />
              <div>
                <div className="font-semibold text-[#0F172A] mb-1">
                  Appeal Deadline: {new Date(submission.appealDeadline).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </div>
                <div className="text-sm text-[#64748B]">
                  {Math.ceil((new Date(submission.appealDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining to file your appeal.
                  {new Date(submission.appealDeadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 && " Act now to protect your rights."}
                </div>
              </div>
              <Link
                href="/get-started"
                className="ml-auto shrink-0 btn-gold px-4 py-2 rounded text-sm font-semibold"
              >
                File Now
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Activity Log Timeline */}
      {data?.activityLogs && data.activityLogs.length > 0 && (
        <section className="pb-12">
          <div className="container">
            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={16} className="text-[#7C3AED]" />
                <div className="text-xs text-[#64748B] uppercase tracking-widest">Analysis Pipeline Log</div>
              </div>
              <div className="relative">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#F1F5F9]" />
                <div className="space-y-4">
                  {data.activityLogs.map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 pl-1">
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        log.status === "error" ? "bg-red-100" :
                        log.type === "analysis_complete" ? "bg-green-100" :
                        "bg-[#0F172A]"
                      }`}>
                        {log.status === "error" ? (
                          <AlertTriangle size={12} className="text-red-600" />
                        ) : log.type === "analysis_complete" ? (
                          <CheckCircle2 size={12} className="text-green-600" />
                        ) : (
                          <Zap size={10} className="text-[#7C3AED]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-[#0F172A] capitalize">
                            {log.type.replace(/_/g, " ")}
                          </span>
                          {log.durationMs && (
                            <span className="text-xs text-[#94A3B8]">{(log.durationMs / 1000).toFixed(1)}s</span>
                          )}
                          <span className="text-xs text-[oklch(0.75_0.01_255)] ml-auto">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{log.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Download Report & CTA */}
      <section className="py-12">
        <div className="container">
          <div className="p-8 rounded-xl bg-[#0F172A] text-center">
            <FileText size={32} className="text-[#7C3AED] mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-white mb-2">Download Your Appraisal Report</h2>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Get a professional, certified PDF report ready for your appeal filing or personal records.
            </p>
            <button
              onClick={async () => {
                setPdfGenerating(true);
                try {
                  await generateReportMutation.mutateAsync({ submissionId: submissionId! });
                } catch (err) {
                  console.error("PDF generation failed:", err);
                } finally {
                  setPdfGenerating(false);
                }
              }}
              disabled={pdfGenerating || generateReportMutation.isPending}
              className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfGenerating || generateReportMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Download PDF Report
                </>
              )}
            </button>
            {generateReportMutation.data?.url && (
              <div className="mt-4 text-sm text-green-300">
                ✓ PDF ready! Check your downloads folder.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] py-16">
        <div className="container text-center max-w-xl mx-auto">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">Ready to File Your Appeal?</h2>
          <p className="text-white/60 mb-8">
            Our team will handle everything — from preparing documents to representing you at the hearing. No win, no fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold"
            >
              Start My Appeal <ArrowRight size={16} />
            </Link>
            <Link
              href="/tax-appeals"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              Learn About Tax Appeals
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
