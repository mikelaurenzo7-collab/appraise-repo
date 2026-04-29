import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRICING_TIERS, MONEY_BACK_GUARANTEE_COPY } from "../../../shared/pricing";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Pricing() {
  usePageMeta({
    title: "Pricing — AppraiseAI Property Tax Appeal",
    description: "Free AI assessment, $49 Pro Se full report, $99 Automated Filing. Flat fee by filing method. 60-day money-back guarantee.",
    canonicalPath: "/pricing",
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0F172A] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">
            Simple, flat-fee pricing.
          </h1>
          <p className="text-white/70 text-lg">
            Start free. Upgrade only when you're ready to file. Full refund if the county
            doesn't reduce your assessment.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-xl p-8 flex flex-col ${
                  tier.highlighted
                    ? "bg-[#0F172A] text-white shadow-2xl shadow-[#0F172A]/30 scale-105"
                    : "bg-white border border-[#E2E8F0]"
                }`}
              >
                {tier.highlighted && (
                  <div className="text-xs font-semibold text-[#FBBF24] uppercase tracking-widest mb-3">
                    Most Popular
                  </div>
                )}
                <h3
                  className={`font-display text-lg font-semibold mb-1 ${
                    tier.highlighted ? "text-white" : "text-[#0F172A]"
                  }`}
                >
                  {tier.label}
                </h3>
                <div
                  className={`font-data text-4xl font-medium mb-1 ${
                    tier.highlighted ? "text-[#7C3AED]" : "text-[#0F172A]"
                  }`}
                >
                  {tier.priceCents === 0 ? "Free" : `$${tier.priceCents / 100}`}
                </div>
                <div
                  className={`text-xs mb-2 ${tier.highlighted ? "text-white/50" : "text-[#64748B]"}`}
                >
                  {tier.tagline}
                </div>
                <div
                  className={`text-sm mb-6 leading-relaxed ${tier.highlighted ? "text-white/70" : "text-[#475569]"}`}
                >
                  {tier.blurb}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                      <span className={tier.highlighted ? "text-white/80" : "text-[#64748B]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/get-started"
                  className={`block text-center py-3 rounded text-sm font-semibold transition-all ${
                    tier.highlighted
                      ? "btn-gold"
                      : "border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[#64748B] mt-10 max-w-2xl mx-auto">
            {MONEY_BACK_GUARANTEE_COPY}
          </p>
        </div>
      </section>

      {/* FAQ */}
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
                q: "What's the difference between Pro Se and Automated Filing?",
                a: "With Pro Se ($49), you receive a full professional appraisal report and step-by-step filing guide — you submit the appeal yourself. With Automated Filing ($99), our software auto-fills and submits the county's online portal form after you review and sign a scrivener authorization. You remain the filer of record in both cases.",
              },
              {
                q: "How does the money-back guarantee work?",
                a: "If the county does not reduce your assessment as a result of the appeal, you can request a full refund of the software fee within 60 days of the decision. No negotiation — we issue the refund to your original payment method.",
              },
              {
                q: "Why flat fee instead of contingency?",
                a: "Contingency pricing aligns economics with outcome in a way that, in most states, is reserved for licensed attorneys and licensed property-tax consultants. We're software. Flat pricing keeps us clearly on the tool side of that line.",
              },
              {
                q: "Which counties are supported for automated filing?",
                a: "We currently support 65+ counties across TX, FL, CA, NY, IL, AZ, WA, OH, GA, CO, MN, MI, NC, VA, MD, NJ, PA, and more with automated online portal filing. We cover 153 counties total across 22 states — if your county doesn't have a portal, we generate a certified-mail or email-ready pro-se packet for you.",
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

      {/* CTA */}
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
