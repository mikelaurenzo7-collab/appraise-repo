/**
 * AppraiseAI — Home Page
 * Design: Refined Legal-Tech
 * Sections: Hero → Stats → How It Works → Tax Appeals Feature → Nationwide → Pricing Preview → Testimonials → CTA
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Clock, FileText, Shield, TrendingDown, Star, ChevronRight, MapPin, Zap, Scale, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";

// Animated counter hook
function useCounter(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

// Scroll reveal hook
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function StatCard({ value, suffix, label, start }: { value: number; suffix: string; label: string; start: boolean }) {
  const count = useCounter(value, 1800, start);
  return (
    <div className="text-center">
      <div className="font-data text-4xl lg:text-5xl font-medium text-[#7C3AED] mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-white/60 font-body">{label}</div>
    </div>
  );
}

const steps = [
  {
    number: "01",
    icon: <MapPin size={22} />,
    title: "Enter Your Address",
    desc: "Type in your property address. Our AI instantly pulls assessor records, comparable sales, and market data for your area.",
  },
  {
    number: "02",
    icon: <Zap size={22} />,
    title: "Get Your AI Appraisal",
    desc: "Receive a certified-quality valuation in seconds — or opt for a full 24-hour certified appraisal report for legal proceedings.",
  },
  {
    number: "03",
    icon: <FileText size={22} />,
    title: "We Prepare &amp; Transmit",
    desc: "Review and sign a per-filing scrivener authorization. Our software prepares your pro-se appeal packet and transmits it to the county — portal, certified mail, or email, whichever the county accepts.",
  },
  {
    number: "04",
    icon: <TrendingDown size={22} />,
    title: "You Save Money",
    desc: "The county corresponds with you as the pro-se filer. We forward any notices we receive. 60-day money-back guarantee if your assessment isn't reduced.",
  },
];

const features = [
  { icon: <Shield size={20} />, title: "Money-Back Guarantee", desc: "Full refund if the county doesn't reduce your assessment. 60-day window from the decision." },
  { icon: <Scale size={20} />, title: "Pro Se Filing", desc: "You are the filer. We're the software that fills out and submits the form you review." },
  { icon: <Building2 size={20} />, title: "Automated Online Filing", desc: "For supported counties with online portals. Mail-in packet generated otherwise." },
  { icon: <Clock size={20} />, title: "Instant or 24-Hour", desc: "AI appraisal in seconds. Comprehensive written report within 24 hours." },
  { icon: <FileText size={20} />, title: "Scrivener Authorization", desc: "Every filing is covered by a specific, logged authorization — not a blanket POA." },
  { icon: <CheckCircle2 size={20} />, title: "Data-Grounded Evidence", desc: "Comparable sales analysis and market-value estimates — we stick to the numbers, not strategy advice." },
];

const testimonials = [
  {
    name: "Marcus T.",
    location: "Austin, TX",
    savings: "$3,200/yr",
    stars: 5,
    quote: "The analysis showed an $87k gap between assessed and market value. Four minutes to file through the Travis CAD portal, and I got my reduction six weeks later. The flat fee was trivial compared to the annual savings.",
  },
  {
    name: "Jennifer R.",
    location: "Cook County, IL",
    savings: "$4,800/yr",
    stars: 5,
    quote: "I didn't know I could appeal this myself until AppraiseAI made it obvious. The comparable sales they pulled were exactly what the assessor needed to see.",
  },
  {
    name: "David K.",
    location: "Harris County, TX",
    savings: "$1,900/yr",
    stars: 5,
    quote: "Address in, analysis out, filing submitted — all in one sitting. The confirmation screenshot hit my dashboard 30 seconds after I clicked submit. I still can't believe it was that fast.",
  },
  {
    name: "Sandra M.",
    location: "Miami-Dade, FL",
    savings: "$6,100/yr",
    stars: 5,
    quote: "I would have missed the VAB window without the reminder. The pre-filled DR-486 petition made filing pro se feel like filing a tax return, not fighting city hall.",
  },
];

export default function Home() {
  usePageMeta({
    title: "AppraiseAI — Property Tax Appeal Software",
    description: "Software that prepares and files your pro-se property tax appeal nationwide. Flat fee. 60-day money-back guarantee.",
    canonicalPath: "/",
  });
  const statsSection = useScrollReveal();
  const howSection = useScrollReveal();
  const featuresSection = useScrollReveal();

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      {/* ─── HERO — data-driven, no stock photo ─────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-[#020617]">
        {/* Pure-CSS background: mesh gradients + a subtle grid. Zero stock imagery. */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full bg-[#7C3AED] opacity-30 blur-[140px]" />
          <div className="absolute top-1/2 -right-40 w-[36rem] h-[36rem] rounded-full bg-[#10B981] opacity-15 blur-[140px]" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
          {/* Diagonal noise band for texture */}
          <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-gradient-to-r from-transparent via-[#7C3AED]/30 to-transparent" />
        </div>

        <div className="container relative z-10 pt-28 pb-20 lg:pt-36 lg:pb-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
            {/* Left: huge statement type */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED] text-[11px] font-semibold uppercase tracking-[0.22em] mb-8">
                <Zap size={12} />
                Pro-se filing in 4 minutes
              </div>

              <h1 className="font-display text-[56px] leading-[0.95] sm:text-7xl lg:text-[104px] lg:leading-[0.9] font-black text-white mb-8 tracking-[-0.035em]">
                File your{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-br from-white via-white to-[#A78BFA] bg-clip-text text-transparent">
                    tax&nbsp;appeal
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-[10px] bg-[#7C3AED] -z-0 translate-y-0" />
                </span>
                .<br />
                <span className="text-[#7C3AED]">Yourself.</span>{" "}
                <span className="text-white/40 font-light italic">In&nbsp;minutes.</span>
              </h1>

              <p className="text-lg lg:text-xl text-white/70 leading-relaxed mb-10 max-w-xl">
                40% of U.S. homeowners are over-assessed. AppraiseAI is the
                software that builds your evidence and <strong className="text-white">automates the pro-se filing</strong> through
                your county&apos;s online portal.{" "}
                <span className="text-white">Flat fee. Refunded if your assessment isn&apos;t reduced.</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link
                  href="/get-started"
                  className="group relative inline-flex items-center justify-center gap-2 px-8 py-5 rounded-xl text-base font-bold text-[#020617] bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-[#FBBF24] hover:scale-[1.02] transition-transform shadow-[0_20px_60px_-15px_rgba(251,191,36,0.5)]"
                >
                  Get My Free Analysis
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-5 rounded-xl text-base font-semibold border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 transition-colors"
                >
                  See a live filing
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55">
                {[
                  "No credit card",
                  "60-day money-back guarantee",
                  "You stay the filer",
                  "Confirmation # + screenshot",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-[#7C3AED]" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: live "filing in progress" data card — pure CSS/typography */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#7C3AED] to-[#0D9488] opacity-30 blur-2xl rounded-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#0F172A]/90 backdrop-blur-xl p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                {/* Window chrome */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                    filing · live
                  </div>
                </div>

                {/* Property header */}
                <div className="mb-6">
                  <div className="text-[11px] uppercase tracking-widest text-[#7C3AED] mb-1">
                    Submission #A-2F41-9X
                  </div>
                  <div className="font-display text-2xl font-bold text-white mb-0.5">
                    4521 Shoal Creek, Austin TX
                  </div>
                  <div className="text-sm text-white/50">Travis County · PIN verified</div>
                </div>

                {/* Assessment vs market */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-lg bg-white/5 p-4 border border-white/10">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Assessed</div>
                    <div className="font-data text-2xl font-bold text-white">$687k</div>
                  </div>
                  <div className="rounded-lg bg-[#7C3AED]/15 p-4 border border-[#7C3AED]/40">
                    <div className="text-[10px] uppercase tracking-widest text-[#A78BFA] mb-1">Our estimate</div>
                    <div className="font-data text-2xl font-bold text-[#A78BFA]">$599k</div>
                  </div>
                </div>

                {/* Live progress log */}
                <div className="rounded-lg bg-black/40 border border-white/5 p-4 mb-5 space-y-2 font-mono text-[11px]">
                  {[
                    { c: "#10B981", t: "✓ Comparable sales pulled (8)" },
                    { c: "#10B981", t: "✓ Evidence packet generated (14 pages)" },
                    { c: "#10B981", t: "✓ Scrivener authorization signed" },
                    { c: "#7C3AED", t: "→ Logging into traviscad.org portal" },
                    { c: "#7C3AED", t: "→ Filling protest form (opinion of value: $599k)" },
                    { c: "#FBBF24", t: "• Awaiting county confirmation…" },
                  ].map((line) => (
                    <div key={line.t} className="flex items-center gap-2 text-white/80">
                      <span style={{ color: line.c }}>{line.t.slice(0, 1)}</span>
                      <span>{line.t.slice(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer pill */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                    </span>
                    <span className="uppercase tracking-widest">Est. savings $2,340/yr</span>
                  </div>
                  <div className="text-white/40">3m 47s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOUD STATEMENT BAND ─────────────────────────────── */}
      <section className="relative bg-[#FBBF24] overflow-hidden">
        <div className="container py-8 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="font-display text-2xl lg:text-4xl font-black text-[#020617] leading-tight tracking-[-0.01em]">
              You file. <span className="text-[#7C3AED]">Our software types.</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-[#020617] text-sm font-semibold">
              <span>$79 · $149 · $299 flat</span>
              <span className="h-4 w-px bg-[#020617]/30" />
              <span>Money-back guarantee</span>
              <span className="h-4 w-px bg-[#020617]/30" />
              <span>Not a law firm</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────── */}
      <section className="bg-[#0F172A] py-14 lg:py-16" ref={statsSection.ref}>
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            <StatCard value={40} suffix="%" label="of U.S. homes are over-assessed" start={statsSection.visible} />
            <StatCard value={3} suffix=" counties" label="live with automated portal filing" start={statsSection.visible} />
            <StatCard value={4} suffix=" min" label="median filing time, end-to-end" start={statsSection.visible} />
            <StatCard value={60} suffix="-day" label="money-back guarantee on every filing" start={statsSection.visible} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-[#F1F5F9]" ref={howSection.ref}>
        <div className="container">
          <div className="max-w-xl mb-14">
            <span className="gold-rule" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              From address to filing in four steps
            </h2>
            <p className="text-[#64748B] font-body leading-relaxed">
              Analyze, authorize, pay, file. Our software handles the busy-work
              of submitting through your county&apos;s portal — you stay the
              filer of record.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`relative p-6 rounded-lg border border-[#E2E8F0] bg-white transition-all duration-500 hover:shadow-lg hover:shadow-[#0F172A]/8 hover:-translate-y-1 ${
                  howSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Step number */}
                <div className="font-data text-5xl font-medium text-[#E2E8F0] mb-4 leading-none">{step.number}</div>
                {/* Icon */}
                <div className="w-10 h-10 rounded bg-[#0F172A] text-[#7C3AED] flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">{step.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight size={20} className="text-[#7C3AED]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] hover:text-[#7C3AED] transition-colors">
              Learn more about our process <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TAX APPEALS FEATURE SECTION ──────────────────────── */}
      <section className="bg-[#0F172A] py-20 lg:py-28 overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: content */}
            <div>
              <span className="gold-rule" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] text-xs font-semibold uppercase tracking-widest mb-4">
                Our Core Moat
              </div>
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                Software, Not a Law Firm.<br />
                <span className="text-[#7C3AED] italic">File in 4 minutes.</span>
              </h2>
              <p className="text-white/70 font-body leading-relaxed mb-8">
                AppraiseAI is a pro-se filing tool. We build your data-grounded
                evidence package, then — for supported counties — automate the
                submission through your county&apos;s online portal. You review
                everything. You authorize the specific filing. You stay the
                filer of record.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "AI-generated comparable sales analysis",
                  "Pre-filled county form + supporting appraisal report",
                  "Automated online filing via your county portal",
                  "Mail-in packet fallback if your county isn't supported yet",
                  "Filing confirmation number + screenshot, saved to your dashboard",
                  "Flat fee, refunded if your assessment isn't reduced",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                    <span className="text-sm text-white/80">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/tax-appeals"
                className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded text-sm font-semibold"
              >
                Explore Tax Appeals
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Right: bold data-card (replaces stock photo) */}
            <div className="relative">
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#0D9488] p-1 shadow-2xl shadow-black/40">
                <div className="rounded-[11px] bg-[#0F172A] p-8 lg:p-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">
                      Confirmation receipt
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                      Filed
                    </span>
                  </div>
                  <div className="font-display text-3xl lg:text-4xl font-black text-white leading-tight mb-1">
                    Protest #A-2F41-9X
                  </div>
                  <div className="text-white/50 text-sm mb-8">
                    Travis CAD · Submitted 10:42 AM CT · Portal response 27s
                  </div>

                  <div className="space-y-4 mb-6">
                    {[
                      { label: "Original assessed value", value: "$687,000" },
                      { label: "Our estimated market value", value: "$599,000", accent: true },
                      { label: "Requested reduction", value: "-$88,000", accent: true },
                    ].map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between border-b border-white/5 pb-3">
                        <span className="text-sm text-white/55">{row.label}</span>
                        <span className={`font-data text-lg font-semibold ${row.accent ? "text-[#A78BFA]" : "text-white"}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-[#10B981] mb-1">
                      Estimated annual savings
                    </div>
                    <div className="font-data text-3xl font-black text-white">
                      $2,340<span className="text-lg font-normal text-white/50">/yr</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 glass-card rounded-xl p-5 shadow-xl">
                <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Median annual savings</div>
                <div className="font-data text-3xl font-medium text-[#7C3AED]">$2,800</div>
                <div className="text-xs text-white/60 mt-1">per successful pro-se filing</div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-[#7C3AED] rounded-xl p-4 shadow-xl">
                <div className="text-xs font-semibold text-[#020617] uppercase tracking-wider">Success Rate</div>
                <div className="font-data text-2xl font-bold text-[#020617]">40–60%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-[#F1F5F9]" ref={featuresSection.ref}>
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="gold-rule mx-auto" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Everything You Need to Win
            </h2>
            <p className="text-[#64748B] font-body">
              AppraiseAI combines AI valuation data, pre-filled county forms, and automated online filing — so you can file a grounded pro-se appeal in minutes, not days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`p-6 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#7C3AED]/40 hover:shadow-md transition-all duration-400 ${
                  featuresSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-10 h-10 rounded bg-[#0F172A] text-[#7C3AED] flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NATIONWIDE MAP SECTION ───────────────────────────── */}
      <section className="bg-[oklch(0.14_0.058_255)] py-20 lg:py-28 overflow-hidden">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="gold-rule" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-6">
                Nationwide Coverage.<br />
                <span className="text-[#7C3AED] italic">Every County. Every Deadline.</span>
              </h2>
              <p className="text-white/70 leading-relaxed mb-8">
                Property tax appeal deadlines vary by state — some as early as 30 days after your assessment notice. AppraiseAI tracks every jurisdiction's calendar and ensures your appeal is filed on time, every time.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Counties live", value: "3" },
                  { label: "Counties in pipeline", value: "47" },
                  { label: "Avg. filing time", value: "3m 47s" },
                  { label: "Portal uptime (30d)", value: "99.4%" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="font-data text-xl font-medium text-[#7C3AED]">{stat.value}</div>
                    <div className="text-xs text-white/50 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              {/* Coverage map — pure CSS ASCII-ish data panel (no stock image) */}
              <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0F172A]/60 backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7C3AED]">Counties live</div>
                  <span className="font-data text-5xl font-black text-white">3</span>
                </div>
                <div className="space-y-3 mb-6">
                  {[
                    { state: "TX", county: "Travis County", portal: "traviscad.org", status: "live" },
                    { state: "TX", county: "Harris County", portal: "hcad.org", status: "live" },
                    { state: "FL", county: "Miami-Dade County", portal: "miamidade.gov", status: "live" },
                    { state: "IL", county: "Cook County", portal: "cookcountyassessor.com", status: "staging" },
                    { state: "CA", county: "Los Angeles County", portal: "assessor.lacounty.gov", status: "queued" },
                    { state: "NY", county: "New York County", portal: "nyc.gov/finance", status: "queued" },
                  ].map((row) => (
                    <div key={row.county} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                      <div>
                        <div className="text-sm text-white font-semibold">
                          {row.county}, <span className="text-white/50">{row.state}</span>
                        </div>
                        <div className="text-xs text-white/40 font-mono">{row.portal}</div>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded ${
                          row.status === "live"
                            ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                            : row.status === "staging"
                              ? "bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/40"
                              : "bg-white/10 text-white/50 border border-white/10"
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-white/50">
                  New counties roll out weekly. Outside a supported county?
                  We generate a pro-se mail-in packet you can print and file.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-[#F1F5F9]">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="gold-rule mx-auto" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Real Homeowners. Real Savings.
            </h2>
            <p className="text-[#64748B]">
              Thousands of homeowners have used AppraiseAI to reduce their property tax bills. Here's what they say.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 lg:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={14} className="fill-[#7C3AED] text-[#7C3AED]" />
                  ))}
                </div>
                <blockquote className="text-[#E2E8F0] font-body leading-relaxed mb-6 italic">
                  "{t.quote}"
                </blockquote>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#0F172A] text-sm">{t.name}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{t.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-data text-lg font-medium text-[#7C3AED]">{t.savings}</div>
                    <div className="text-xs text-[#64748B]">annual savings</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING PREVIEW ──────────────────────────────────── */}
      <section className="bg-[oklch(0.94_0.018_85)] py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="gold-rule mx-auto" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-[#64748B]">
              Flat-fee pricing. 60-day money-back guarantee if your
              assessment isn&apos;t reduced.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Instant Appraisal",
                price: "Free",
                sub: "No credit card required",
                features: ["AI-powered valuation", "Comparable sales analysis", "Assessment vs. market value gap", "Filing recommendation"],
                cta: "Get Free Appraisal",
                highlight: false,
              },
              {
                name: "Standard Filing",
                price: "$149",
                sub: "homes $500k – $1.5M",
                features: ["Everything in Instant", "Full appraisal report", "Automated online filing", "Scrivener authorization + audit trail", "60-day money-back guarantee"],
                cta: "Start My Filing",
                highlight: true,
              },
              {
                name: "Premium Filing",
                price: "$299",
                sub: "homes $1.5M+ and small commercial",
                features: ["Everything in Standard", "Priority filing slot", "Portfolio dashboard", "Priority email support", "60-day money-back guarantee"],
                cta: "Start My Filing",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 lg:p-8 ${
                  plan.highlight
                    ? "bg-[#0F172A] text-white shadow-2xl shadow-[#0F172A]/30 scale-105"
                    : "bg-white border border-[#E2E8F0]"
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest mb-3">Most Popular</div>
                )}
                <div className={`font-display text-lg font-semibold mb-1 ${plan.highlight ? "text-white" : "text-[#0F172A]"}`}>{plan.name}</div>
                <div className={`font-data text-4xl font-medium mb-1 ${plan.highlight ? "text-[#7C3AED]" : "text-[#0F172A]"}`}>{plan.price}</div>
                <div className={`text-xs mb-6 ${plan.highlight ? "text-white/50" : "text-[#64748B]"}`}>{plan.sub}</div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                      <span className={plan.highlight ? "text-white/80" : "text-[#64748B]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/get-started"
                  className={`block text-center py-3 rounded text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "btn-gold"
                      : "border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing" className="text-sm text-[#64748B] hover:text-[#0F172A] transition-colors inline-flex items-center gap-1">
              View full pricing details <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="bg-[#020617] py-24 lg:py-32 relative overflow-hidden">
        {/* Pure-CSS texture, no stock image */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[52rem] h-[52rem] rounded-full bg-[#7C3AED]/25 blur-[160px]" />
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>
        <div className="container relative z-10 text-center max-w-3xl mx-auto">
          <span className="gold-rule mx-auto" />
          <h2 className="font-display text-4xl lg:text-6xl font-black text-white mb-6 leading-[0.95] tracking-[-0.02em]">
            Are you overpaying?<br />
            <span className="text-[#7C3AED] italic">Find out in 30 seconds.</span>
          </h2>
          <p className="text-white/70 font-body text-lg mb-10 max-w-xl mx-auto">
            Enter your address. Get an instant, data-grounded appraisal for
            free. If there&apos;s a real gap, file your appeal yourself — with
            our software doing the heavy lifting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/get-started"
              className="btn-gold inline-flex items-center justify-center gap-2 px-8 py-4 rounded text-base font-semibold"
            >
              Get My Free Analysis
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/tax-appeals"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded text-base font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              Learn About Tax Appeals
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-6">
            No credit card required · Results in seconds · Money-back guarantee if your assessment isn&apos;t reduced
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
