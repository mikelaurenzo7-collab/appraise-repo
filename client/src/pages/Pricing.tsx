import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <section className="bg-[#0F172A] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">Simple, Transparent Pricing</h1>
          <p className="text-white/70 text-lg">No upfront fees. No hidden costs. You only pay when we save you money.</p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Instant Appraisal",
                price: "Free",
                sub: "No credit card required",
                features: ["AI-powered valuation", "Comparable sales analysis", "Assessment vs. market value", "Appeal recommendation"],
                cta: "Get Free Appraisal",
              },
              {
                name: "Tax Appeal",
                price: "25%",
                sub: "of first-year savings only",
                features: ["Everything in Instant", "Certified appraisal report", "POA or pro se filing", "Hearing representation", "Deadline tracking", "Negotiation"],
                cta: "Start My Appeal",
                highlight: true,
              },
              {
                name: "Certified Report",
                price: "$299",
                sub: "delivered within 24 hours",
                features: ["USPAP-compliant report", "Licensed appraiser signature", "Legal evidentiary use", "Mortgage & estate use", "Rush delivery"],
                cta: "Order Report",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-8 ${
                  plan.highlight
                    ? "bg-[#0F172A] text-white shadow-2xl shadow-[#0F172A]/30 scale-105"
                    : "bg-white border border-[#E2E8F0]"
                }`}
              >
                {plan.highlight && <div className="text-xs font-semibold text-[#7C3AED] uppercase tracking-widest mb-3">Most Popular</div>}
                <h3 className={`font-display text-lg font-semibold mb-1 ${plan.highlight ? "text-white" : "text-[#0F172A]"}`}>{plan.name}</h3>
                <div className={`font-data text-4xl font-medium mb-1 ${plan.highlight ? "text-[#7C3AED]" : "text-[#0F172A]"}`}>{plan.price}</div>
                <div className={`text-xs mb-8 ${plan.highlight ? "text-white/50" : "text-[#64748B]"}`}>{plan.sub}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                      <span className={plan.highlight ? "text-white/80" : "text-[#64748B]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/get-started" className={`block text-center py-3 rounded text-sm font-semibold transition-all ${plan.highlight ? "btn-gold" : "border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white"}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[oklch(0.94_0.018_85)] py-20 lg:py-28">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "What does 'no win, no fee' mean?", a: "You only pay our 25% contingency fee if we successfully reduce your property tax assessment. If your appeal is denied, you owe us nothing." },
              { q: "Is there a minimum savings threshold?", a: "No. We'll file your appeal even if the potential savings are modest. However, very small reductions may not justify the effort — we'll be honest about that upfront." },
              { q: "Can I get a refund if I'm not satisfied?", a: "Our contingency model means you don't pay unless we win. If we win and you're unhappy with the result, contact us — we stand behind our work." },
              { q: "Are there any hidden fees?", a: "No. Our 25% fee is the only cost. We cover filing fees, appraisal costs, and hearing representation. Transparency is core to our business." },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-[#E2E8F0]">
                <h3 className="font-display text-base font-semibold text-[#0F172A] mb-3">{faq.q}</h3>
                <p className="text-sm text-[#64748B]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container text-center max-w-xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#0F172A] mb-4">Ready to Get Started?</h2>
          <p className="text-[#64748B] mb-8">Enter your address and get your free AI appraisal in seconds.</p>
          <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-7 py-4 rounded font-semibold">
            Get My Free Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
