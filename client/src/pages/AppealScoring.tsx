/**
 * Appeal Scoring Dashboard
 * Shows appeal strength score, success probability, confidence intervals,
 * factor breakdown, and recommendations for a given submission.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation, useSearch } from "wouter";
import {
  Shield, TrendingUp, AlertTriangle, CheckCircle2, ArrowLeft,
  Loader2, BarChart3, Target, Zap, Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "oklch(0.72 0.19 145)" : score >= 50 ? "oklch(0.80 0.15 85)" : "oklch(0.65 0.25 25)";
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="60" fill="none" stroke="oklch(0.25 0.03 270)" strokeWidth="12" />
        <circle cx="80" cy="80" r="60" fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 80 80)" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
        <text x="80" y="72" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">{score}</text>
        <text x="80" y="95" textAnchor="middle" fill="oklch(0.7 0.03 270)" fontSize="12">/ 100</text>
      </svg>
      <span className="text-sm text-white/60 mt-2">{label}</span>
    </div>
  );
}

function FactorBar({ name, score, weight, explanation }: { name: string; score: number; weight: number; explanation: string }) {
  const barColor = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-white/90">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">Weight: {(weight * 100).toFixed(0)}%</span>
          <span className="text-sm font-semibold text-white">{score}/100</span>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-white/50">{explanation}</p>
    </div>
  );
}

export default function AppealScoring() {
  const { user, loading: authLoading } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const submissionId = Number(params.get("id"));
  const [, navigate] = useLocation();

  const scoreQuery = trpc.appeals.getStrengthScore.useQuery({ submissionId }, { enabled: !!submissionId && !!user });
  const packageQuery = trpc.appeals.getCompleteAppealPackage.useQuery({ submissionId }, { enabled: !!submissionId && !!user });

  if (authLoading) return <div className="min-h-screen bg-[oklch(0.13_0.03_270)] flex items-center justify-center"><Loader2 className="animate-spin text-[oklch(0.72_0.19_310)]" size={32} /></div>;
  if (!user) return <div className="min-h-screen bg-[oklch(0.13_0.03_270)]"><Navbar /><div className="container py-20 text-center"><h1 className="text-2xl font-bold text-white mb-4">Sign in to view appeal scoring</h1></div></div>;
  if (!submissionId) return <div className="min-h-screen bg-[oklch(0.13_0.03_270)]"><Navbar /><div className="container py-20 text-center"><h1 className="text-2xl font-bold text-white mb-4">No submission selected</h1><Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button></div></div>;

  const score = scoreQuery.data;
  const pkg = packageQuery.data;

  return (
    <div className="min-h-screen bg-[oklch(0.13_0.03_270)]">
      <Navbar />
      <div className="container py-12">
        <button onClick={() => navigate(`/analysis?id=${submissionId}`)} className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"><ArrowLeft size={16} />Back to Analysis</button>
        <h1 className="text-3xl font-bold text-white mb-2">Appeal Strength Analysis</h1>
        <p className="text-white/60 mb-8">Comprehensive scoring based on comparable sales, market trends, county factors, and historical outcomes.</p>

        {scoreQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[oklch(0.72_0.19_310)]" size={32} /><span className="ml-3 text-white/60">Calculating appeal strength...</span></div>
        ) : scoreQuery.error ? (
          <Card className="bg-red-500/10 border-red-500/30"><CardContent className="py-8 text-center"><AlertTriangle className="mx-auto mb-3 text-red-400" size={32} /><p className="text-red-300">Failed to calculate appeal strength. Please try again.</p></CardContent></Card>
        ) : score ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-[oklch(0.18_0.03_270)] border-white/10"><CardContent className="py-8 flex flex-col items-center"><ScoreGauge score={score.overallScore} label="Overall Score" /><div className="mt-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${score.confidenceLevel === "high" ? "bg-green-500/20 text-green-400" : score.confidenceLevel === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>{score.confidenceLevel.toUpperCase()} CONFIDENCE</span></div></CardContent></Card>
              <Card className="bg-[oklch(0.18_0.03_270)] border-white/10 col-span-1 lg:col-span-2"><CardHeader><CardTitle className="text-white flex items-center gap-2"><BarChart3 size={20} className="text-[oklch(0.72_0.19_310)]" />Key Metrics</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-white/5"><div className="text-2xl font-bold text-[oklch(0.72_0.19_310)]">{(score.successProbability * 100).toFixed(0)}%</div><div className="text-xs text-white/50 mt-1">Success Probability</div></div>
                  <div className="p-4 rounded-lg bg-white/5"><div className="text-2xl font-bold text-[oklch(0.80_0.15_85)]">{(score.historicalWinRate * 100).toFixed(0)}%</div><div className="text-xs text-white/50 mt-1">Historical Win Rate</div></div>
                  <div className="p-4 rounded-lg bg-white/5"><div className="text-2xl font-bold text-green-400">${score.estimatedSavingsRange.min.toLocaleString()}</div><div className="text-xs text-white/50 mt-1">Min Savings</div></div>
                  <div className="p-4 rounded-lg bg-white/5"><div className="text-2xl font-bold text-green-400">${score.estimatedSavingsRange.max.toLocaleString()}</div><div className="text-xs text-white/50 mt-1">Max Savings</div></div>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-[oklch(0.72_0.19_310)]/10 border border-[oklch(0.72_0.19_310)]/30"><div className="flex items-start gap-3"><Target size={20} className="text-[oklch(0.72_0.19_310)] mt-0.5 shrink-0" /><div><p className="text-sm font-semibold text-white mb-1">Recommendation</p><p className="text-sm text-white/70">{score.recommendation}</p></div></div></div>
              </CardContent></Card>
            </div>

            <Card className="bg-[oklch(0.18_0.03_270)] border-white/10"><CardHeader><CardTitle className="text-white flex items-center gap-2"><Zap size={20} className="text-[oklch(0.80_0.15_85)]" />Scoring Factors</CardTitle></CardHeader><CardContent className="space-y-5">
              {score.factors.map((factor, i) => <FactorBar key={i} name={factor.name} score={factor.score} weight={factor.weight} explanation={factor.explanation} />)}
            </CardContent></Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[oklch(0.18_0.03_270)] border-white/10"><CardHeader><CardTitle className="text-green-400 flex items-center gap-2"><CheckCircle2 size={20} />Strength Factors</CardTitle></CardHeader><CardContent className="space-y-2">
                {score.strengthFactors.length > 0 ? score.strengthFactors.map((f, i) => <div key={i} className="flex items-start gap-2"><CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" /><span className="text-sm text-white/70">{f}</span></div>) : <p className="text-sm text-white/50">No significant strength factors identified.</p>}
              </CardContent></Card>
              <Card className="bg-[oklch(0.18_0.03_270)] border-white/10"><CardHeader><CardTitle className="text-red-400 flex items-center gap-2"><AlertTriangle size={20} />Risk Factors</CardTitle></CardHeader><CardContent className="space-y-2">
                {score.riskFactors.length > 0 ? score.riskFactors.map((f, i) => <div key={i} className="flex items-start gap-2"><AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" /><span className="text-sm text-white/70">{f}</span></div>) : <p className="text-sm text-white/50">No significant risk factors identified.</p>}
              </CardContent></Card>
            </div>

            {pkg && (
              <Card className="bg-[oklch(0.18_0.03_270)] border-white/10"><CardHeader><CardTitle className="text-white flex items-center gap-2"><Shield size={20} className="text-[oklch(0.72_0.19_310)]" />Complete Appeal Package</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg bg-white/5"><h4 className="text-sm font-semibold text-white mb-3">Deadline Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-sm text-white/60">County</span><span className="text-sm text-white">{pkg.deadlines.county}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-white/60">Days Until Deadline</span><span className={`text-sm font-semibold ${pkg.deadlines.daysUntilAppealDeadline <= 7 ? "text-red-400" : pkg.deadlines.daysUntilAppealDeadline <= 14 ? "text-yellow-400" : "text-green-400"}`}>{pkg.deadlines.daysUntilAppealDeadline} days</span></div>
                      <div className="flex justify-between"><span className="text-sm text-white/60">Status</span><span className={`text-xs px-2 py-0.5 rounded-full ${pkg.deadlines.status === "critical" ? "bg-red-500/20 text-red-400" : pkg.deadlines.status === "urgent" ? "bg-yellow-500/20 text-yellow-400" : pkg.deadlines.status === "passed" ? "bg-gray-500/20 text-gray-400" : "bg-green-500/20 text-green-400"}`}>{pkg.deadlines.status.toUpperCase()}</span></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5"><h4 className="text-sm font-semibold text-white mb-3">Our Recommendation</h4>
                    <div className={`flex items-center gap-2 mb-3 ${pkg.recommendation.isRecommended ? "text-green-400" : "text-yellow-400"}`}>
                      {pkg.recommendation.isRecommended ? <CheckCircle2 size={18} /> : <Info size={18} />}
                      <span className="text-sm font-semibold">{pkg.recommendation.isRecommended ? "Appeal Recommended" : "Proceed with Caution"}</span>
                    </div>
                    <p className="text-xs text-white/60 mb-3">{pkg.recommendation.reason}</p>
                    <div className="space-y-1">{pkg.recommendation.nextSteps.map((step, i) => <div key={i} className="flex items-center gap-2 text-xs text-white/50"><span className="text-[oklch(0.72_0.19_310)]">{i + 1}.</span>{step}</div>)}</div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  {pkg.recommendation.isRecommended && <Button onClick={() => navigate(`/appeal-workflow/${submissionId}`)} className="bg-[oklch(0.72_0.19_310)] hover:bg-[oklch(0.65_0.19_310)] text-white"><TrendingUp size={16} className="mr-2" />Start Appeal Process</Button>}
                  <Button variant="outline" onClick={() => navigate(`/analysis?id=${submissionId}`)} className="border-white/20 text-white hover:bg-white/10">View Full Analysis</Button>
                </div>
              </CardContent></Card>
            )}
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
