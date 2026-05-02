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
  Star,
  DollarSign,
  Wrench,
  Heart,
  TrendingUp,
  Info,
  Eye,
  Receipt,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PropertyMapView from "@/components/PropertyMapView";
import { ShimmerSkeleton, ShimmerCard, ShimmerStatRow } from "@/components/ShimmerSkeleton";
import { trpc } from "@/lib/trpc";
import {
  computePipelineState,
  type PipelineStageState,
} from "../../../shared/analysisProgress";
import { usePageMeta } from "@/hooks/usePageMeta";
import { AnalyticsEvent, track } from "@/lib/analytics";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Lock, CreditCard } from "lucide-react";
import { toast } from "sonner";

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
  usePageMeta({
    title: "Your Property Analysis",
    description: "Instant AI-powered property appraisal, comparable sales, and appeal strength scoring.",
    canonicalPath: "/analysis",
    noindex: true,
  });
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const submissionId = params.get("id") ? parseInt(params.get("id")!, 10) : null;
  const generateReportMutation = trpc.payments.generateReport.useMutation();
  const { isAuthenticated } = useAuth();

  // Check payment status for this submission
  const paymentStatusQuery = trpc.properties.getPaymentStatus.useQuery(
    { submissionId: submissionId! },
    { enabled: !!submissionId }
  );
  const paymentStatus = paymentStatusQuery.data;
  const requiresPayment = paymentStatus?.requiresPayment ?? false;
  const isPaid = paymentStatus?.paymentStatus === "paid" || paymentStatus?.paymentStatus === "free";

  // Checkout session mutation for inline payment
  const createCheckoutMutation = trpc.payments.createCheckoutSession.useMutation();

  // Detect the ?payment=success redirect-back from Stripe and unlock the gate
  // without requiring a manual page refresh.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success") {
      // Refetch payment status so the gate unlocks immediately
      paymentStatusQuery.refetch();
      toast.success("Payment confirmed! Your full report is ready to download.");
      // Clean the query param from the URL without a page reload
      const cleanUrl =
        window.location.pathname + (submissionId ? `?id=${submissionId}` : "");
      window.history.replaceState({}, "", cleanUrl);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, error } = trpc.properties.getAnalysis.useQuery(
    { submissionId: submissionId! },
    { enabled: !!submissionId, refetchInterval: (query) => {
      // Poll every 1.5s while analyzing so users see stage transitions
      // as the pipeline emits them.
      const status = query.state.data?.submission?.status;
      return status === "pending" || status === "analyzing" ? 1500 : false;
    }}
  );

  // Emit an analysis_viewed event once per completed analysis so we can
  // attribute conversions to actual completion, not abandoned polling.
  const [analysisViewTracked, setAnalysisViewTracked] = useState(false);
  useEffect(() => {
    if (analysisViewTracked) return;
    const status = data?.submission?.status;
    if (status && status !== "pending" && status !== "analyzing") {
      track(AnalyticsEvent.AnalysisViewed, {
        submissionId: submissionId ?? null,
        status,
      });
      setAnalysisViewTracked(true);
    }
  }, [data, analysisViewTracked, submissionId]);

  if (!submissionId) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="container max-w-2xl text-center">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rotate-3 opacity-90 blur-[1px]" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center shadow-[0_20px_40px_-12px_rgba(124,58,237,0.45)]">
                <AlertTriangle size={36} className="text-white" strokeWidth={2.25} />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-3">No Submission Found</h1>
            <p className="text-[#64748B] mb-8 max-w-md mx-auto leading-relaxed">
              Submit your property address to start a USPAP-aligned analysis. The full pipeline runs in
              under a minute and produces an audience-aware appeal brief.
            </p>
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
          <div className="container max-w-4xl">
            <ShimmerSkeleton count={1} className="h-8 w-48 mx-auto mb-4 rounded-lg" />
            <ShimmerSkeleton count={1} className="h-4 w-64 mx-auto mb-12 rounded-md" />
            <ShimmerStatRow count={3} />
            <div className="mt-8 grid lg:grid-cols-3 gap-6">
              <ShimmerCard lines={2} />
              <div className="lg:col-span-2">
                <ShimmerCard lines={4} />
              </div>
            </div>
            <div className="mt-6">
              <ShimmerCard lines={3} />
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const submission = data?.submission;

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="container max-w-2xl text-center">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Unable to Load Analysis</h1>
            <p className="text-[#64748B] mb-8">
              {error?.message || "This property analysis is not available yet."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard" className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold">
                Go to Dashboard <ArrowRight size={16} />
              </Link>
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold border border-[#0F172A]/20 text-[#0F172A] hover:bg-white transition-colors"
              >
                Start New Analysis
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const analysis = data?.analysis;
  const isAnalyzing = submission?.status === "pending" || submission?.status === "analyzing";
  const appealWorkflowHref = submissionId ? `/appeal-workflow/${submissionId}` : "/dashboard";

  if (isAnalyzing) {
    const pipeline = computePipelineState(
      (data?.activityLogs ?? []) as Array<{
        type: string;
        status?: string | null;
        durationMs?: number | null;
        description?: string | null;
        createdAt?: Date | string;
      }>,
      { submissionStatus: submission?.status }
    );
    const completed = pipeline.filter((s) => s.status === "completed").length;
    const progressPct = Math.round((completed / pipeline.length) * 100);
    const hasError = pipeline.some((s) => s.status === "error");

    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <section className="pt-32 pb-20">
          <div className="container max-w-2xl">
            <div className="text-center mb-8">
              <div className="relative mx-auto mb-6 w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-[#E2E8F0]" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#7C3AED] border-r-[#A78BFA]/40 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 size={28} className="text-[#7C3AED]" />
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-2">
                {hasError ? "Analysis hit a snag" : "Analyzing Your Property"}
              </h1>
              <p className="text-[#64748B] max-w-md mx-auto">
                {hasError
                  ? "We'll retry automatically. You can safely leave this page — we'll email you when it's ready."
                  : "Live pipeline status — this typically takes 30–60 seconds."}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 text-xs text-[#64748B] uppercase tracking-widest">
                <span>Pipeline progress</span>
                <span className="font-data">{progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#0D9488] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Stage list driven by real activity logs */}
            <div className="space-y-2 mb-8">
              {pipeline.map((stage: PipelineStageState) => {
                const cls =
                  stage.status === "completed"
                    ? "bg-white border-green-200"
                    : stage.status === "running"
                      ? "bg-white border-[#7C3AED] ring-1 ring-[#7C3AED]/20"
                      : stage.status === "error"
                        ? "bg-red-50 border-red-200"
                        : "bg-white border-[#E2E8F0]";
                return (
                  <div
                    key={stage.key}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${cls}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {stage.status === "completed" ? (
                        <CheckCircle2 size={20} className="text-green-500" />
                      ) : stage.status === "running" ? (
                        <Loader2 size={20} className="text-[#7C3AED] animate-spin" />
                      ) : stage.status === "error" ? (
                        <AlertTriangle size={20} className="text-red-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-[#E2E8F0]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold ${
                            stage.status === "pending" ? "text-[#94A3B8]" : "text-[#0F172A]"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {stage.status === "completed" && stage.durationMs !== undefined && (
                          <span className="text-xs text-[#94A3B8]">
                            {(stage.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {stage.status === "running" && (
                          <span className="text-xs text-[#7C3AED] uppercase tracking-widest">
                            running
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs mt-0.5 leading-relaxed ${
                          stage.status === "error" ? "text-red-600" : "text-[#64748B]"
                        }`}
                      >
                        {stage.errorMessage || stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live activity stream — shows the raw events as they arrive */}
            {data?.activityLogs && data.activityLogs.length > 0 && (
              <div className="p-4 rounded-lg bg-[#0F172A] text-white/90">
                <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-widest text-white/60">
                  <Activity size={12} />
                  Live Event Stream
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                  {data.activityLogs
                    .slice()
                    .reverse()
                    .map((log: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[#7C3AED] shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                        <span
                          className={`shrink-0 ${
                            log.status === "error" ? "text-red-400" : "text-[#0D9488]"
                          }`}
                        >
                          {log.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-white/70 truncate">{log.description}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
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
                  {analysis?.recommendedApproach === "automated_express"
                    ? "We recommend Automated Express (same-day portal filing)"
                    : analysis?.recommendedApproach === "automated_standard" || analysis?.recommendedApproach === "poa"
                    ? "We recommend Automated Standard (certified mail filing)"
                    : analysis?.recommendedApproach === "pro-se"
                    ? "We recommend Pro Se Guided filing"
                    : "Appeal may not be recommended"}
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-3">Executive Summary</div>
              <p className="text-[#0F172A] leading-relaxed mb-6">
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
              comparableSales={
                // The server returns comparableSales already parsed as an
                // array via safeJsonParse. Earlier this code tried to
                // JSON.parse it again — which always threw and silently
                // returned [], so the map has not been showing comps.
                (Array.isArray(analysis.comparableSales)
                  ? analysis.comparableSales
                  : []) as Array<{
                    address: string;
                    salePrice: number;
                    saleDate: string;
                    similarity?: number;
                    lat?: number;
                    lng?: number;
                  }>
              }
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
                {analysis.appealStrengthFactors.map((factor: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#F1F5F9]">
                    <CheckCircle2 size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#0F172A]">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── SCENARIO-SPECIFIC UPSELL PROMPTS ─────────────────────────────── */}
      {submission?.userScenario && submission.userScenario !== "none" && (() => {
        const scenario = submission.userScenario as string;

        // Rental / Investment — income approach upsell
        if (scenario === "rental_property" || scenario === "mixed_use") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/5 to-[#0D9488]/5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#7C3AED] flex items-center justify-center shrink-0">
                      <DollarSign size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Income Approach Analysis Included
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold uppercase tracking-wide">
                          Rental Property
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Because you identified this as a{scenario === "mixed_use" ? " mixed-use" : " rental"} property, your analysis includes the{" "}
                        <strong className="text-[#0F172A]">income capitalization approach</strong> — the legally required valuation method for income-producing properties in most jurisdictions. This gives you a second, powerful angle to challenge the assessor.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {[
                          "Income approach is legally required for rental properties in most states",
                          "Assessors often use owner-occupied comps — a costly error for rentals",
                          "Vacancy rates, management fees, and expenses must be deducted",
                          "Your cap rate analysis is included in the full PDF report",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-[#E2E8F0]">
                            <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // Veteran / Disabled — exemption stacking upsell
        if (scenario === "veteran_disability") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-50 to-orange-50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                      <Shield size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Veteran &amp; Disability Exemptions — Verify Before Filing
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-wide">
                          Action Required
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Your market-value appeal runs <strong className="text-[#0F172A]">independently</strong> of veteran and disability exemptions — but exemptions reduce your tax bill <em>even if the appeal fails</em>. Pursue both simultaneously.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {[
                          "100%-disabled veterans qualify for full exemption in most states (TX, FL, MI, IA, IL)",
                          "Partial disability ratings qualify for proportional exemptions",
                          "ADA modifications (ramps, lifts) do NOT increase your taxable value",
                          "Surviving spouses of disabled veterans usually retain the exemption",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-amber-200">
                            <Star size={14} className="text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-100 border border-amber-300">
                        <Info size={14} className="text-amber-700 shrink-0" />
                        <span className="text-xs text-amber-800">
                          <strong>Next step:</strong> Contact your county assessor's office to verify your exemption is applied to your current tax bill. Exemption deadlines are separate from appeal deadlines.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // Senior / Retired — exemption stacking upsell
        if (scenario === "senior_homestead") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-blue-300/60 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                      <Heart size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Senior Exemptions &amp; Freeze Programs — Stack With Your Appeal
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wide">
                          Senior Homeowner
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Senior exemptions reduce your <strong className="text-[#0F172A]">tax rate</strong>. Your appeal reduces the <strong className="text-[#0F172A]">assessed base</strong>. Both work together — a successful appeal on top of your senior exemption produces the maximum savings.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {[
                          "Most states offer a senior homestead exemption ($10K–$50K assessed value reduction)",
                          "Some states freeze assessed value at age 65 — TX, IL, NJ, and others",
                          "Property tax deferral programs let you defer taxes until sale",
                          "Circuit-breaker credits cap taxes as a % of household income",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-blue-200">
                            <CheckCircle2 size={14} className="text-blue-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100 border border-blue-300">
                        <Info size={14} className="text-blue-700 shrink-0" />
                        <span className="text-xs text-blue-800">
                          <strong>Next step:</strong> Verify all senior exemptions are applied to your current bill. Exemption and freeze program deadlines are separate from appeal deadlines — apply for both.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // Financial Hardship — urgency + deferral upsell
        if (scenario === "financial_hardship") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-red-300/60 bg-gradient-to-br from-red-50 to-orange-50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
                      <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Hardship Relief Programs — File the Appeal AND Request Deferral
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold uppercase tracking-wide">
                          Urgent
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Your market-value appeal is the primary path to a permanent reduction. But while the appeal is pending, <strong className="text-[#0F172A]">hardship deferral programs</strong> can stop the clock on delinquency and prevent fees and lien proceedings.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {[
                          "Hardship deferrals postpone taxes without foreclosure risk in most states",
                          "Circuit-breaker credits cap taxes as a % of household income (often 4–6%)",
                          "Payment plans without penalty are available in most jurisdictions",
                          "Senior + disability + hardship programs frequently stack — apply for all",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-red-200">
                            <Shield size={14} className="text-red-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 border border-red-300">
                        <AlertTriangle size={14} className="text-red-700 shrink-0" />
                        <span className="text-xs text-red-800">
                          <strong>Act now:</strong> Delinquency triggers fees and lien proceedings. File the appeal immediately and contact your county assessor about hardship deferral and payment plans today.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // Distressed Condition — cost-to-cure and photo evidence upsell
        if (scenario === "distressed_condition") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-orange-300/60 bg-gradient-to-br from-orange-50 to-yellow-50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                      <Wrench size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Condition Evidence Is Your Strongest Asset
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold uppercase tracking-wide">
                          Distressed Property
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Mass appraisal systems assume <strong className="text-[#0F172A]">average condition</strong>. Your property's actual deficiencies — documented with photos and repair estimates — are the most powerful evidence you can bring to a hearing.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {[
                          "Repair estimates from 2–3 contractors are legally admissible evidence",
                          "Dated photos documenting deficiencies carry significant weight",
                          "You can request a physical re-inspection by the assessor",
                          "Distressed comparable sales are valid in most jurisdictions",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-orange-200">
                            <CheckCircle2 size={14} className="text-orange-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-100 border border-orange-300">
                        <Info size={14} className="text-orange-700 shrink-0" />
                        <span className="text-xs text-orange-800">
                          <strong>Next step:</strong> Upload photos of deficiencies and obtain 2–3 contractor repair estimates. These are included in your full PDF report as cost-to-cure evidence.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // Recently Purchased — purchase price as gold standard evidence
        if (scenario === "recently_purchased") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-green-300/60 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
                      <TrendingUp size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Your Purchase Price Is Your Strongest Evidence
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase tracking-wide">
                          Recently Purchased
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Courts and appeal boards consistently recognize a <strong className="text-[#0F172A]">recent arm's-length purchase price</strong> as the gold standard for market value. If your assessment exceeds your purchase price, you have an exceptionally strong case.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {[
                          "Your closing disclosure is the most powerful single document you can present",
                          "The lender's appraisal from closing independently corroborates your price",
                          "Many jurisdictions require assessment to equal purchase price after sale",
                          "Pre-purchase inspection report documents condition at time of sale",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-green-200">
                            <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 border border-green-300">
                        <Info size={14} className="text-green-700 shrink-0" />
                        <span className="text-xs text-green-800">
                          <strong>Next step:</strong> Gather your closing disclosure, purchase agreement, and lender's appraisal. These are included in your full PDF report as primary evidence.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // Inherited Property — stepped-up basis clarification
        if (scenario === "inherited_property") {
          return (
            <section className="pb-12">
              <div className="container">
                <div className="p-6 rounded-xl border-2 border-purple-300/60 bg-gradient-to-br from-purple-50 to-violet-50">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
                      <Scale size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-[#0F172A]">
                          Stepped-Up Basis ≠ Assessed Value — A Common Assessor Error
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wide">
                          Inherited Property
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B] mb-4 leading-relaxed">
                        Assessors often confuse the stepped-up basis (a capital gains concept) with market value. Your property's <strong className="text-[#0F172A]">actual condition</strong> — including deferred maintenance typical of estate properties — must be reflected in the assessment.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {[
                          "Stepped-up basis is for capital gains tax — not property tax assessment",
                          "Estate properties often have deferred maintenance reducing market value",
                          "Estate sale comparables are legally admissible as condition-adjusted evidence",
                          "Probate documents establish the transfer date and condition at inheritance",
                        ].map((point, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-purple-200">
                            <CheckCircle2 size={14} className="text-purple-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-[#0F172A]">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        return null;
      })()}

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

      {/* ─── EVIDENCE PANELS: Photo + Tax Bill ─────────────────────────── */}
      {(data?.photoEvidence || data?.taxBill) && (
        <section className="pb-12">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-6">

              {/* Photo Evidence Panel */}
              {data?.photoEvidence && (
                <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                      <Eye size={16} className="text-[#7C3AED]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#64748B] uppercase tracking-widest">Photo Evidence</div>
                      <div className="text-sm font-semibold text-[#0F172A]">
                        {data.photoEvidence.photoCount} Photo{data.photoEvidence.photoCount !== 1 ? "s" : ""} Analyzed
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-[#0F172A]">{data.photoEvidence.overallConditionScore}</div>
                      <div className="text-xs text-[#64748B]">/ 100 Condition</div>
                    </div>
                  </div>

                  {data.photoEvidence.summaryParagraph && (
                    <p className="text-sm text-[#64748B] leading-relaxed mb-4">{data.photoEvidence.summaryParagraph}</p>
                  )}

                  {data.photoEvidence.assessorBlindSpotItems.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wide mb-2">
                        🔒 Assessor Blind Spots (Interior)
                      </div>
                      <div className="space-y-1.5">
                        {data.photoEvidence.assessorBlindSpotItems.map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[#0F172A]">
                            <Shield size={11} className="text-[#7C3AED] mt-0.5 shrink-0" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.photoEvidence.functionalObsolescenceItems.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                        Functional Obsolescence
                      </div>
                      <div className="space-y-1.5">
                        {data.photoEvidence.functionalObsolescenceItems.map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[#64748B]">
                            <TrendingDown size={11} className="text-amber-500 mt-0.5 shrink-0" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.photoEvidence.uspapRatings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {data.photoEvidence.uspapRatings.map((r: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold">
                          USPAP {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tax Bill Panel */}
              {data?.taxBill && (
                <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                      <Receipt size={16} className="text-[#2563EB]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#64748B] uppercase tracking-widest">Tax Bill Data</div>
                      <div className="text-sm font-semibold text-[#0F172A]">
                        {data.taxBill.apn ? `APN: ${data.taxBill.apn}` : "Extracted from Tax Bill"}
                      </div>
                    </div>
                    {data.taxBill.taxYear && (
                      <div className="ml-auto px-2 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-xs font-semibold">
                        Tax Year {data.taxBill.taxYear}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {data.taxBill.currentAssessedValue != null && (
                      <div className="p-3 rounded-lg bg-[#F1F5F9]">
                        <div className="text-xs text-[#64748B] mb-1">Assessed Value</div>
                        <div className="font-bold text-[#0F172A]">${Number(data.taxBill.currentAssessedValue).toLocaleString()}</div>
                      </div>
                    )}
                    {data.taxBill.annualTaxAmount != null && (
                      <div className="p-3 rounded-lg bg-[#F1F5F9]">
                        <div className="text-xs text-[#64748B] mb-1">Annual Tax</div>
                        <div className="font-bold text-[#0F172A]">${Number(data.taxBill.annualTaxAmount).toLocaleString()}</div>
                      </div>
                    )}
                    {data.taxBill.effectiveTaxRate != null && (
                      <div className="p-3 rounded-lg bg-[#F1F5F9]">
                        <div className="text-xs text-[#64748B] mb-1">Effective Rate</div>
                        <div className="font-bold text-[#0F172A]">{(Number(data.taxBill.effectiveTaxRate) * 100).toFixed(3)}%</div>
                      </div>
                    )}
                    {data.taxBill.priorYearAssessedValue != null && data.taxBill.currentAssessedValue != null && (
                      <div className="p-3 rounded-lg bg-[#F1F5F9]">
                        <div className="text-xs text-[#64748B] mb-1">YoY Change</div>
                        <div className={`font-bold ${Number(data.taxBill.currentAssessedValue) > Number(data.taxBill.priorYearAssessedValue) ? "text-red-600" : "text-emerald-600"}`}>
                          {Number(data.taxBill.currentAssessedValue) > Number(data.taxBill.priorYearAssessedValue) ? "+" : ""}
                          {(((Number(data.taxBill.currentAssessedValue) - Number(data.taxBill.priorYearAssessedValue)) / Number(data.taxBill.priorYearAssessedValue)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {data.taxBill.appealDeadline && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Clock size={14} className="text-amber-600 shrink-0" />
                      <div className="text-xs text-amber-800">
                        <span className="font-semibold">Appeal Deadline:</span> {data.taxBill.appealDeadline}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Next Steps */}
      {analysis?.nextSteps && analysis.nextSteps.length > 0 && (
        <section className="pb-12">
          <div className="container">
            <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
              <div className="text-xs text-[#64748B] uppercase tracking-widest mb-4">Recommended Next Steps</div>
              <div className="space-y-3">
                {(analysis.nextSteps as unknown[]).map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-[#F1F5F9]">
                    <div className="w-6 h-6 rounded-full bg-[#0F172A] text-[#7C3AED] flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm text-[#0F172A]">{String(step)}</span>
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
                href={appealWorkflowHref}
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

            {/* PAYMENT GATE: Show checkout button if payment is required and not yet paid */}
            {requiresPayment && !isPaid ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                  <Lock size={14} />
                  Payment required to download your full report
                </div>
                {!isAuthenticated ? (
                  <div>
                    <a
                    href={getLoginUrl()}
                    className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold"
                  >
                    <CreditCard size={16} />
                    Sign In to Complete Payment
                  </a>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={async () => {
                        let attempts = 0;
                        const maxAttempts = 3;
                        while (attempts < maxAttempts) {
                          try {
                            const result = await createCheckoutMutation.mutateAsync({
                              submissionId: submissionId!,
                            });
                            if (result.url) {
                              window.open(result.url, "_blank");
                            }
                            break;
                          } catch (err) {
                            attempts++;
                            if (attempts >= maxAttempts) {
                              toast.error("Checkout failed. Please try again in a moment.");
                              console.error("Checkout failed after retries:", err);
                            } else {
                              await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 500));
                            }
                          }
                        }
                      }}
                      disabled={createCheckoutMutation.isPending}
                      className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createCheckoutMutation.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Redirecting to checkout...
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} />
                          Complete Payment to Download Report
                        </>
                      )}
                    </button>
                    <p className="text-white/50 text-xs mt-3">60-day money-back guarantee. Secure checkout via Stripe.</p>
                  </div>
                )}
              </div>
            ) : (
              /* FREE or PAID: show download button */
              <>
                {!isAuthenticated ? (
                  <a
                    href={getLoginUrl()}
                    className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold"
                  >
                    <FileText size={16} />
                    Sign In to Download Report
                  </a>
                ) : (
                  <button
                    onClick={async () => {
                      setPdfGenerating(true);
                      try {
                        const result = await generateReportMutation.mutateAsync({ submissionId: submissionId! });
                        if (result.url) {
                          window.open(result.url, "_blank");
                        }
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
                )}
                {generateReportMutation.data?.url && (
                  <div className="mt-4 text-sm text-green-300">
                    ✓ PDF ready! Check your downloads folder.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] py-16">
        <div className="container text-center max-w-xl mx-auto">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">Ready to File Your Appeal?</h2>
          <p className="text-white/60 mb-8">
            We build your evidence, pre-fill your county&apos;s form, and
            submit through the online portal after you authorize. Flat fee,
            money-back guarantee.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={appealWorkflowHref}
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
