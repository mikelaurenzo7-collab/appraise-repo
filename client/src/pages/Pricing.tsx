import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRICING_TIERS, MONEY_BACK_GUARANTEE_COPY } from "../../../shared/pricing";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Pricing() {
  usePageMeta({
    title: "Pricing — Flat-fee Property Tax Appeal",
    description: "Starter $79, Standard $149, Premium $299. Flat fee indexed to your property's assessed value. 60-day money-back guarantee.",
    canonicalPath: "/pricing",
  });
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <section className="bg-[#0F172A] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">
            Flat-fee pricing. 60-day money-back guarantee.
          </h1>
          <p className="text-white/70 text-lg">
            Software fee indexed to your property&apos;s assessed value. Full
            refund if the county doesn&apos;t reduce your assessment.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="rounded-xl p-8 bg-white border border-[#E2E8F0]">
              <h3 className="font-display text-lg font-semibold mb-1 text-[#0F172A]">
                Instant Appraisal
              </h3>
              <div className="font-data text-4xl font-medium mb-1 text-[#0F172A]">Free</div>
              <div className="text-xs mb-8 text-[#64748B]">No credit card required</div>
              <ul className="space-y-3 mb-8">
                {[
                  "AI-powered valuation",
                  "Comparable sales analysis",
                  "Assessment vs. market value",
                  "Filing recommendation",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                    <span className="text-[#64748B]">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/get-started"
                className="block text-center py-3 rounded text-sm font-semibold border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white transition-all"
              >
                Get Free Analysis
              </Link>
            </div>

            {PRICING_TIERS.map((tier, idx) => (
              <div
                key={tier.id}
                className={`rounded-xl p-8 ${
                  idx === 1
                    ? "bg-[#0F172A] text-white shadow-2xl shadow-[#0F172A]/30 scale-105"
                    : "bg-white border border-[#E2E8F0]"
                }`}
              >
                {idx === 1 && (
                  <div className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest mb-3">
                    Most common
                  </div>
                )}
                <h3
                  className={`font-display text-lg font-semibold mb-1 ${
                    idx === 1 ? "text-white" : "text-[#0F172A]"
                  }`}
                >
                  {tier.label}
                </h3>
                <div
                  className={`font-data text-4xl font-medium mb-1 ${
                    idx === 1 ? "text-[#7C3AED]" : "text-[#0F172A]"
                  }`}
                >
                  ${tier.priceCents / 100}
                </div>
                <div
                  className={`text-xs mb-8 ${idx === 1 ? "text-white/50" : "text-[#64748B]"}`}
                >
                  {tier.blurb}
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Full appraisal report",
                    "Automated online filing",
                    "Scrivener authorization logged",
                    "Filing confirmation + audit trail",
                    "60-day money-back guarantee",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                      <span className={idx === 1 ? "text-white/80" : "text-[#64748B]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/get-started"
                  className={`block text-center py-3 rounded text-sm font-semibold transition-all ${
                    idx === 1
                      ? "btn-gold"
                      : "border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[#64748B] mt-10 max-w-2xl mx-auto">
            {MONEY_BACK_GUARANTEE_COPY}
          </p>
        </div>
      </section>

      <section className="bg-[oklch(0.94_0.018_85)] py-20 lg:py-28">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Is AppraiseAI a law firm?",
                a: "No. AppraiseAI is a software tool. We help you file your own tax-assessment appeal (pro se). We do not provide legal advice about your specific case and we do not represent you in a legal capacity.",
              },
              {
                q: "How does the money-back guarantee work?",
                a: "If the county does not reduce your assessment as a result of the appeal we filed on your behalf, you can request a full refund of the software fee within 60 days of the decision. No negotiation — we issue the refund to your original payment method.",
              },
              {
                q: "Why flat fee instead of contingency?",
                a: "Contingency pricing aligns economics with outcome in a way that, in most states, is reserved for licensed attorneys and licensed property-tax consultants. We're software. Flat pricing keeps us clearly on the tool side of that line.",
              },
              {
                q: "Which counties are supported for automated filing?",
                a: "We start with counties that offer online filing portals with PIN-based access for taxpayers. Check your county at eligibility time — if your county isn't supported yet, we'll still generate a ready-to-mail pro-se packet for you.",
              },
              {
                q: "Are there any hidden fees?",
                a: "No. The tier you see at checkout is the entire software fee. Some counties charge their own filing fee (typically $0–$50); those are passed through directly to the county portal.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-[#E2E8F0]">
                <h3 className="font-display text-base font-semibold text-[#0F172A] mb-3">
                  {faq.q}
                </h3>
                <p className="text-sm text-[#64748B]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container text-center max-w-xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#0F172A] mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-[#64748B] mb-8">
            Enter your address and get your free AI appraisal in seconds.
          </p>
          <Link
            href="/get-started"
            className="btn-gold inline-flex items-center gap-2 px-7 py-4 rounded font-semibold"
          >
            Get My Free Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
