/**
 * AppraiseAI — How It Works Page
 * Design: Refined Legal-Tech
 */
import { Link } from "wouter";
import { ArrowRight, MapPin, Zap, FileText, TrendingDown, CheckCircle2, Clock, Shield, Scale, Brain, BarChart3, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const phases = [
  {
    phase: "Phase 1",
    title: "Instant AI Appraisal",
    icon: <Brain size={28} />,
    color: "text-[oklch(0.72_0.12_75)]",
    steps: [
      { icon: <MapPin size={18} />, title: "Enter Your Property Address", desc: "Our system instantly pulls your county assessor records, deed information, and current assessed value." },
      { icon: <BarChart3 size={18} />, title: "AI Analyzes Comparable Sales", desc: "We run your property against thousands of recent comparable sales (comps) in your neighborhood to determine fair market value." },
      { icon: <Zap size={18} />, title: "Receive Your Valuation", desc: "Get an instant AI appraisal showing your estimated fair market value vs. your current assessed value — and the potential savings." },
    ],
  },
  {
    phase: "Phase 2",
    title: "Appeal Preparation",
    icon: <FileText size={28} />,
    color: "text-[oklch(0.72_0.12_75)]",
    steps: [
      { icon: <Shield size={18} />, title: "Sign Power of Attorney", desc: "Authorize AppraiseAI to act as your legal representative before the county assessor and appeal board." },
      { icon: <FileText size={18} />, title: "Certified Appraisal Report", desc: "Our licensed appraisers produce a USPAP-compliant certified appraisal report — the gold standard evidence for tax appeals." },
      { icon: <Clock size={18} />, title: "Deadline Tracking", desc: "We monitor your jurisdiction's appeal window and ensure all filings are submitted before the deadline." },
    ],
  },
  {
    phase: "Phase 3",
    title: "Filing & Representation",
    icon: <Scale size={28} />,
    color: "text-[oklch(0.72_0.12_75)]",
    steps: [
      { icon: <Scale size={18} />, title: "We File Your Appeal", desc: "Our team submits your appeal packet — including the certified appraisal, comparable sales, and legal arguments — to the assessor's office." },
      { icon: <Users size={18} />, title: "Hearing Representation", desc: "If a hearing is required, we appear on your behalf via power of attorney and present your case to the appeal board." },
      { icon: <TrendingDown size={18} />, title: "Negotiation & Resolution", desc: "We negotiate your assessed value down and confirm the reduction in writing. You receive your savings confirmation." },
    ],
  },
];

const faqs = [
  {
    q: "What is a power of attorney in the context of property tax appeals?",
    a: "A limited power of attorney (POA) authorizes AppraiseAI to act as your legal agent specifically for the purpose of filing and prosecuting your property tax appeal. This means we can sign documents, attend hearings, and negotiate on your behalf without you needing to appear.",
  },
  {
    q: "What is pro se filing?",
    a: "Pro se means representing yourself. If you prefer to appear at the hearing yourself, we prepare your entire appeal packet — the certified appraisal, comparable sales analysis, and legal arguments — and coach you on how to present your case. You file and appear; we do all the preparation work.",
  },
  {
    q: "How long does the appeal process take?",
    a: "The timeline varies by jurisdiction. Most appeals are resolved within 3–6 months. Some counties have informal review processes that can yield results in 4–6 weeks. We track your case and keep you updated throughout.",
  },
  {
    q: "What if my appeal is denied?",
    a: "If the initial appeal is denied, we evaluate whether to escalate to the next level of appeal (e.g., state tax court or administrative tribunal) at no additional cost to you. Our contingency fee only applies when we achieve a successful reduction.",
  },
  {
    q: "Do I need to do anything after signing the POA?",
    a: "Very little. Once you sign the power of attorney, we handle everything — filing, correspondence with the assessor, hearing appearances, and negotiation. We'll notify you of key milestones and when your savings are confirmed.",
  },
  {
    q: "What types of properties do you handle?",
    a: "We handle residential properties (single-family homes, condos, townhomes, multi-family up to 4 units) nationwide. Commercial property appeals are available in select markets — contact us for details.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />

      {/* Page header */}
      <section className="bg-[oklch(0.18_0.06_255)] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            How AppraiseAI Works
          </h1>
          <p className="text-white/70 text-lg font-body leading-relaxed">
            From your first address search to a confirmed tax reduction — here's exactly how our process works, step by step.
          </p>
        </div>
      </section>

      {/* Process phases */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="space-y-20">
            {phases.map((phase, pi) => (
              <div key={phase.phase}>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-lg bg-[oklch(0.18_0.06_255)] text-[oklch(0.72_0.12_75)] flex items-center justify-center">
                    {phase.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[oklch(0.72_0.12_75)] uppercase tracking-widest">{phase.phase}</div>
                    <h2 className="font-display text-2xl font-bold text-[oklch(0.18_0.06_255)]">{phase.title}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {phase.steps.map((step, si) => (
                    <div key={si} className="p-6 rounded-xl bg-white border border-[oklch(0.88_0.015_85)] shadow-sm">
                      <div className="w-9 h-9 rounded bg-[oklch(0.18_0.06_255)] text-[oklch(0.72_0.12_75)] flex items-center justify-center mb-4">
                        {step.icon}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)] mb-2">{step.title}</h3>
                      <p className="text-sm text-[oklch(0.45_0.04_255)] leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Analysis section */}
      <section className="bg-[oklch(0.18_0.06_255)] py-20 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="gold-rule" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-6">
                The AI Behind the Appraisal
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                Our valuation engine is trained on millions of property transactions, assessor records, and market data points. It analyzes your property against the most relevant comparable sales — the same methodology used by licensed appraisers, but in seconds instead of days.
              </p>
              <div className="space-y-3">
                {[
                  "Analyzes 50+ property attributes",
                  "Compares against recent comparable sales",
                  "Adjusts for lot size, condition, and amenities",
                  "Identifies assessment errors and inequities",
                  "Generates court-ready evidence packages",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 size={15} className="text-[oklch(0.72_0.12_75)] shrink-0" />
                    <span className="text-sm text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663544407089/njPZ7GrdvQti9UYLXGdrDo/ai-analysis-fmLbcq3a54ZL4hZcuEjyZW.webp"
                alt="AI property analysis visualization"
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="mb-12">
            <span className="gold-rule" />
            <h2 className="font-display text-3xl font-bold text-[oklch(0.18_0.06_255)] mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-[oklch(0.88_0.015_85)]">
                <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)] mb-3">{faq.q}</h3>
                <p className="text-sm text-[oklch(0.45_0.04_255)] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[oklch(0.94_0.018_85)] py-16">
        <div className="container text-center max-w-xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[oklch(0.18_0.06_255)] mb-4">
            Ready to Start Your Appeal?
          </h2>
          <p className="text-[oklch(0.45_0.04_255)] mb-8">
            Get your free AI appraisal in seconds. If you're over-assessed, we'll handle everything from there.
          </p>
          <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-7 py-4 rounded font-semibold">
            Get My Free Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
