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
    color: "text-[#7C3AED]",
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
    color: "text-[#7C3AED]",
    steps: [
      { icon: <Shield size={18} />, title: "Scrivener Authorization", desc: "Authorize AppraiseAI to submit the specific form you've reviewed. Per-filing consent — not a blanket POA." },
      { icon: <FileText size={18} />, title: "Data-Grounded Report", desc: "We assemble a comparable-sales analysis and market-value estimate you can attach as evidence to the county filing." },
      { icon: <Clock size={18} />, title: "Deadline Tracking", desc: "We monitor your jurisdiction's appeal window and refuse to submit outside it." },
    ],
  },
  {
    phase: "Phase 3",
    title: "Automated Pro-Se Filing",
    icon: <Scale size={28} />,
    color: "text-[#7C3AED]",
    steps: [
      { icon: <Scale size={18} />, title: "Our Software Fills The Form", desc: "For supported counties, we use your taxpayer PIN and account number to pre-fill the county's online appeal form." },
      { icon: <Users size={18} />, title: "You Review, You Authorize", desc: "You review the fully-filled form and sign a per-filing scrivener authorization. Then our Playwright automation submits it for you." },
      { icon: <TrendingDown size={18} />, title: "Confirmation + Audit Trail", desc: "Portal confirmation number, final screenshot, and execution log saved to your dashboard the moment the county accepts the filing." },
    ],
  },
];

const faqs = [
  {
    q: "Is AppraiseAI acting as my legal representative?",
    a: "No. AppraiseAI is a software tool. You remain the filer of record (pro se). We do not provide case-specific legal advice and we do not represent you in a legal proceeding. The scrivener authorization you sign is a per-filing consent that documents you asked our software to submit a specific form on your behalf — not a blanket power of attorney.",
  },
  {
    q: "What is pro se filing?",
    a: "Pro se means you are representing yourself. You are always allowed to file your own property-tax appeal. AppraiseAI builds the evidence, fills in the county's form, and — for supported counties with online portals — automates the submission through the portal. You review everything before submission.",
  },
  {
    q: "How long does the appeal process take?",
    a: "Filing itself takes about 4 minutes for supported counties. County decisions vary by jurisdiction — most land within 3–6 months of the filing date. Your dashboard tracks every milestone.",
  },
  {
    q: "What if my appeal is denied?",
    a: "If the county does not reduce your assessment as a result of the appeal we filed on your behalf, you can request a full refund of the software fee within 60 days of the decision. See our Terms of Service for details.",
  },
  {
    q: "Do I need to do anything after authorizing?",
    a: "Very little. Once you sign the scrivener authorization and complete payment, our software submits to your county portal automatically. You'll get a confirmation number and screenshot in your dashboard when it lands.",
  },
  {
    q: "What types of properties do you handle?",
    a: "We handle residential properties (single-family homes, condos, townhomes, multi-family up to 4 units) nationwide. Commercial property appeals are available in select markets — contact us for details.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      {/* Page header */}
      <section className="bg-[#0F172A] pt-32 pb-20">
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
                  <div className="w-12 h-12 rounded-lg bg-[#0F172A] text-[#7C3AED] flex items-center justify-center">
                    {phase.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest">{phase.phase}</div>
                    <h2 className="font-display text-2xl font-bold text-[#0F172A]">{phase.title}</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {phase.steps.map((step, si) => (
                    <div key={si} className="p-6 rounded-xl bg-white border border-[#E2E8F0] shadow-sm">
                      <div className="w-9 h-9 rounded bg-[#0F172A] text-[#7C3AED] flex items-center justify-center mb-4">
                        {step.icon}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[#0F172A] mb-2">{step.title}</h3>
                      <p className="text-sm text-[#64748B] leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Analysis section */}
      <section className="bg-[#0F172A] py-20 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="gold-rule" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-6">
                The AI Behind the Appraisal
              </h2>
              <p className="text-white/70 leading-relaxed mb-6">
                Our valuation engine analyzes your property against the most
                relevant comparable sales using public assessor records and
                commercial real-estate data — in seconds. The output is
                evidence, not legal advice about your case.
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
                    <CheckCircle2 size={15} className="text-[#7C3AED] shrink-0" />
                    <span className="text-sm text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#7C3AED]/30 via-[#0F172A] to-[#0D9488]/30 p-1">
              <div className="rounded-[11px] bg-[#020617] p-8 h-80 flex flex-col justify-between font-mono">
                <div>
                  <div className="flex items-center gap-1.5 mb-5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed">
                    <div className="text-white/40">
                      $ analyze 4521 shoal creek, austin tx
                    </div>
                    <div className="text-[#10B981]">✓ Pulled 8 comparable sales (0.4mi radius)</div>
                    <div className="text-[#10B981]">✓ Assessor record: $687,000 (2026)</div>
                    <div className="text-[#10B981]">✓ Weighted market value: $599,000</div>
                    <div className="text-[#FBBF24]">→ Gap: -$88,000 (12.8%)</div>
                    <div className="text-[#7C3AED]">→ Appeal strength: 78%</div>
                    <div className="text-white/40 mt-3">
                      $ evidence pack --format=pdf
                    </div>
                    <div className="text-[#10B981]">
                      ✓ 14-page packet ready: 4521-shoal-creek.pdf
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/40 border-t border-white/5 pt-3">
                  <span>data · not legal advice</span>
                  <span className="text-[#10B981]">● ready to file</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="mb-12">
            <span className="gold-rule" />
            <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-[#E2E8F0]">
                <h3 className="font-display text-base font-semibold text-[#0F172A] mb-3">{faq.q}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[oklch(0.94_0.018_85)] py-16">
        <div className="container text-center max-w-xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#0F172A] mb-4">
            Ready to Start Your Appeal?
          </h2>
          <p className="text-[#64748B] mb-8">
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
