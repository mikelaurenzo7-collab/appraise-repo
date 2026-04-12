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
    title: "We File Your Appeal",
    desc: "Sign a power of attorney (or go pro se). Our team prepares and files your property tax appeal with the local assessor's office.",
  },
  {
    number: "04",
    icon: <TrendingDown size={22} />,
    title: "You Save Money",
    desc: "We negotiate, attend hearings, and fight until your assessment is reduced. You pay nothing unless we win.",
  },
];

const features = [
  { icon: <Shield size={20} />, title: "No Win, No Fee", desc: "Our contingency model means zero upfront cost. We only get paid when you save." },
  { icon: <Scale size={20} />, title: "Power of Attorney", desc: "We act as your legal representative before tax boards, assessors, and appeal tribunals." },
  { icon: <Building2 size={20} />, title: "All 50 States", desc: "Licensed appraisers and filing specialists in every jurisdiction nationwide." },
  { icon: <Clock size={20} />, title: "Instant or 24-Hour", desc: "AI appraisal in seconds. Certified written report within 24 hours for legal use." },
  { icon: <FileText size={20} />, title: "Pro Se Filing", desc: "Prefer to file yourself? We prepare all documents and coach you through the hearing." },
  { icon: <CheckCircle2 size={20} />, title: "40–60% Win Rate", desc: "National average success rate. Our AI-backed evidence packages outperform DIY appeals." },
];

const testimonials = [
  {
    name: "Marcus T.",
    location: "Austin, TX",
    savings: "$3,200/yr",
    stars: 5,
    quote: "AppraiseAI found that my county had overassessed my home by $87,000. They filed everything, attended the hearing, and got my bill reduced. Took about 6 weeks total.",
  },
  {
    name: "Jennifer R.",
    location: "Cook County, IL",
    savings: "$4,800/yr",
    stars: 5,
    quote: "I had no idea I was overpaying. The AI analysis was instant and showed exactly where the assessor went wrong. The team handled everything via power of attorney.",
  },
  {
    name: "David K.",
    location: "Maricopa County, AZ",
    savings: "$1,900/yr",
    stars: 5,
    quote: "Simple process. Entered my address, got the appraisal, signed the POA form, and they did the rest. Best ROI I've ever seen — completely free until they won.",
  },
  {
    name: "Sandra M.",
    location: "Bergen County, NJ",
    savings: "$6,100/yr",
    stars: 5,
    quote: "New Jersey property taxes are brutal. AppraiseAI reduced my assessed value by $140,000. The certified appraisal report was exactly what the board needed.",
  },
];

export default function Home() {
  const statsSection = useScrollReveal();
  const howSection = useScrollReveal();
  const featuresSection = useScrollReveal();

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663544407089/njPZ7GrdvQti9UYLXGdrDo/hero-house-ajzSq5N5Z78Y7sB2bMm2vj.webp)` }}
        />
        {/* Overlay: dark navy gradient from left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617/97%] via-[#020617/80%] to-[#020617/20%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617/60%] to-transparent" />

        <div className="container relative z-10 pt-24 pb-16 lg:pt-32 lg:pb-24">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-semibold uppercase tracking-widest mb-6">
              <Zap size={12} />
              Instant AI Appraisals · Nationwide Tax Appeals
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.08] mb-6">
              Stop Overpaying<br />
              <span className="text-[#7C3AED] italic">Property Taxes.</span>
            </h1>

            <p className="text-lg lg:text-xl text-white/75 font-body leading-relaxed mb-8 max-w-xl">
              More than <strong className="text-white">40% of U.S. homeowners</strong> are over-assessed. AppraiseAI delivers an instant AI appraisal and files your property tax appeal nationwide — via power of attorney or pro se. <strong className="text-white">No win, no fee.</strong>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                href="/get-started"
                className="btn-gold inline-flex items-center justify-center gap-2 px-7 py-4 rounded text-base font-semibold"
              >
                Get My Free Analysis
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded text-base font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                See How It Works
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
              {["No upfront cost", "Licensed in all 50 states", "Results in 24–48 hours", "POA or pro se filing"].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#7C3AED]" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────── */}
      <section className="bg-[#0F172A] py-14 lg:py-16" ref={statsSection.ref}>
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            <StatCard value={40} suffix="%" label="of U.S. homes are over-assessed" start={statsSection.visible} />
            <StatCard value={2400} suffix="+" label="appeals filed nationwide" start={statsSection.visible} />
            <StatCard value={50} suffix=" States" label="full coverage, every jurisdiction" start={statsSection.visible} />
            <StatCard value={94} suffix="%" label="client satisfaction rate" start={statsSection.visible} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-[#F1F5F9]" ref={howSection.ref}>
        <div className="container">
          <div className="max-w-xl mb-14">
            <span className="gold-rule" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-4">
              From Address to Appeal in Four Steps
            </h2>
            <p className="text-[#64748B] font-body leading-relaxed">
              Our process combines AI precision with licensed appraiser expertise and legal filing authority — all in one seamless workflow.
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
                We Don't Just Appraise.<br />
                <span className="text-[#7C3AED] italic">We Fight Your Tax Bill.</span>
              </h2>
              <p className="text-white/70 font-body leading-relaxed mb-8">
                Most appraisal services stop at the report. AppraiseAI goes further — we file your appeal, represent you before the board, and negotiate your assessment down. Via power of attorney, we act as your legal agent. Or we prepare everything for a pro se filing so you can appear yourself.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "AI-generated comparable sales analysis (comps)",
                  "Certified appraisal report for evidentiary use",
                  "Power of attorney filing — we appear on your behalf",
                  "Pro se packet — full documents + hearing coaching",
                  "Deadline tracking across all 50 state jurisdictions",
                  "No-fee contingency — pay only from savings",
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

            {/* Right: image + card overlay */}
            <div className="relative">
              <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/40">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663544407089/njPZ7GrdvQti9UYLXGdrDo/legal-document-UVutgeC3fnSaJpZL9qyzeJ.webp"
                  alt="Power of Attorney legal document"
                  className="w-full h-72 lg:h-96 object-cover"
                />
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 glass-card rounded-xl p-5 shadow-xl">
                <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Average Annual Savings</div>
                <div className="font-data text-3xl font-medium text-[#7C3AED]">$2,800</div>
                <div className="text-xs text-white/60 mt-1">per successful appeal</div>
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
              AppraiseAI combines AI valuation technology with licensed appraisers and legal filing expertise — the full stack for property tax reduction.
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
                  { label: "States Covered", value: "All 50" },
                  { label: "Counties Tracked", value: "3,000+" },
                  { label: "Avg. Deadline", value: "45 days" },
                  { label: "Filing Methods", value: "POA + Pro Se" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-lg border border-white/10 bg-white/5">
                    <div className="font-data text-xl font-medium text-[#7C3AED]">{stat.value}</div>
                    <div className="text-xs text-white/50 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663544407089/njPZ7GrdvQti9UYLXGdrDo/nationwide-map-d5aHjn69WWLgKQVs6Et9cT.webp"
                alt="Nationwide property tax appeal coverage map"
                className="w-full rounded-xl shadow-2xl shadow-black/50"
              />
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
              No upfront fees. No hidden costs. You only pay when we save you money.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                name: "Instant Appraisal",
                price: "Free",
                sub: "No credit card required",
                features: ["AI-powered valuation", "Comparable sales analysis", "Assessment vs. market value gap", "Appeal recommendation"],
                cta: "Get Free Appraisal",
                highlight: false,
              },
              {
                name: "Tax Appeal",
                price: "25%",
                sub: "of first-year savings only",
                features: ["Everything in Instant", "Certified appraisal report", "POA or pro se filing", "Hearing representation", "Deadline tracking"],
                cta: "Start My Appeal",
                highlight: true,
              },
              {
                name: "Certified Report",
                price: "$299",
                sub: "delivered within 24 hours",
                features: ["USPAP-compliant report", "Licensed appraiser signature", "Legal evidentiary use", "Mortgage & estate use", "Rush delivery available"],
                cta: "Order Report",
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
      <section className="bg-[#0F172A] py-20 lg:py-28 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663544407089/njPZ7GrdvQti9UYLXGdrDo/savings-graphic-VTCpCfCqT5y9mohjFHYHjt.webp"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative z-10 text-center max-w-2xl mx-auto">
          <span className="gold-rule mx-auto" />
          <h2 className="font-display text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Find Out If You're<br />
            <span className="text-[#7C3AED] italic">Overpaying Right Now</span>
          </h2>
          <p className="text-white/70 font-body text-lg mb-10">
            Enter your address and get an instant AI appraisal — completely free. If you're over-assessed, we'll file the appeal for you. No risk. No upfront cost.
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
            No credit card required · Results in seconds · Licensed appraisers in all 50 states
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
