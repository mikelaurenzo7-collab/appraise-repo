import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Mail,
  FileText,
  Search,
  Star,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PRICING_TIERS, MONEY_BACK_GUARANTEE_COPY } from "../../../shared/pricing";
import { usePageMeta } from "@/hooks/usePageMeta";

const TIER_ICONS = [
  <Search size={20} />,
  <FileText size={20} />,
  <Mail size={20} />,
  <Zap size={20} />,
];

const FAQS = [
  {
    q: "Is AppraiseAI a law firm?",
    a: "No. AppraiseAI is a software tool. We help you prepare and file your own property tax assessment appeal. We do not provide legal advice about your specific case and do not represent you in a legal capacity.",
  },
  {
    q: "What is the difference between Pro Se Guided and Automated?",
    a: "With Pro Se Guided ($49), you receive a full 40-page professional appraisal report and a step-by-step dashboard filing guide — you submit the appeal yourself. With Automated Standard ($99), we prepare and physically mail your certified appeal packet via USPS Certified Mail to your county. With Automated Express ($129), we file electronically through your county's online portal the same day for the fastest possible hearing date.",
  },
  {
    q: "Which counties support Automated Express?",
    a: "Approximately 650–750 counties across the US have online filing portals, covering roughly 70% of all US residential property value. Texas alone has 200+ portal counties. If your county doesn't have a portal, Automated Standard (certified mail) covers all 3,143 US counties.",
  },
  {
    q: "How does the money-back guarantee work?",
    a: "If the county does not reduce your assessment as a result of the appeal, request a full refund within 60 days of the county's decision. No negotiation — we issue the refund to your original payment method.",
  },
  {
    q: "Why flat fee instead of contingency?",
    a: "Contingency pricing in most states is reserved for licensed attorneys and property-tax consultants. We are software. Flat pricing keeps us clearly on the tool side of that line — and aligns our incentive with building the best product, not maximizing your bill.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No. The price you see is the entire software fee. Some counties charge their own filing fee (typically $0–$50); those are paid directly to the county portal and are not collected by AppraiseAI.",
  },
];

export default function Pricing() {
  usePageMeta({
    title: "Pricing — AppraiseAI Property Tax Appeal",
    description:
      "Free AI assessment, $49 Pro Se full report, $99 Automated Mail filing, $129 Automated Express same-day portal filing. Flat fee, 60-day money-back guarantee.",
    canonicalPath: "/pricing",
  });

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-[#1E0A3C] pt-32 pb-20 relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(124,58,237,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="container max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#A78BFA] text-xs font-semibold uppercase tracking-widest mb-6">
            <Star size={12} />
            Simple, transparent pricing
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            Stop Overpaying.<br />
            <span className="text-[#A78BFA]">Start at Free.</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl">
            Get your free AI appraisal instantly. Upgrade only when you're ready to
            file — flat fee, no contingency, 60-day money-back guarantee.
          </p>
        </div>
      </section>

      {/* ── Tier Cards ───────────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {PRICING_TIERS.map((tier, idx) => {
              const isHighlighted = !!tier.highlighted;
              return (
                <div
                  key={tier.id}
                  className={`relative rounded-2xl flex flex-col transition-all duration-200 ${
                    isHighlighted
                      ? "bg-[#1E0A3C] text-white shadow-2xl shadow-[#7C3AED]/30 ring-2 ring-[#7C3AED] scale-[1.02]"
                      : "bg-white border border-[#E9E4FF] shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  {/* Badge */}
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${tier.badgeColor || "bg-[#7C3AED] text-white"}`}
                      >
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  <div className="p-7 flex flex-col flex-1">
                    {/* Icon + Label */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isHighlighted
                            ? "bg-[#7C3AED]/30 text-[#A78BFA]"
                            : "bg-[#F3F0FF] text-[#7C3AED]"
                        }`}
                      >
                        {TIER_ICONS[idx]}
                      </div>
                      <h3
                        className={`font-display text-base font-semibold ${
                          isHighlighted ? "text-white" : "text-[#1E0A3C]"
                        }`}
                      >
                        {tier.label}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="mb-1">
                      <span
                        className={`font-data text-4xl font-bold ${
                          isHighlighted ? "text-[#A78BFA]" : "text-[#1E0A3C]"
                        }`}
                      >
                        {tier.priceCents === 0 ? "Free" : `$${tier.priceCents / 100}`}
                      </span>
                      {tier.priceCents > 0 && (
                        <span
                          className={`text-sm ml-1 ${
                            isHighlighted ? "text-white/50" : "text-[#64748B]"
                          }`}
                        >
                          flat fee
                        </span>
                      )}
                    </div>

                    {/* Tagline */}
                    <p
                      className={`text-xs mb-4 ${
                        isHighlighted ? "text-[#A78BFA]" : "text-[#7C3AED]"
                      } font-semibold uppercase tracking-wide`}
                    >
                      {tier.tagline}
                    </p>

                    {/* Blurb */}
                    <p
                      className={`text-sm leading-relaxed mb-6 ${
                        isHighlighted ? "text-white/70" : "text-[#475569]"
                      }`}
                    >
                      {tier.blurb}
                    </p>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-8 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2
                            size={14}
                            className={`mt-0.5 shrink-0 ${
                              isHighlighted ? "text-[#A78BFA]" : "text-[#7C3AED]"
                            }`}
                          />
                          <span
                            className={
                              isHighlighted ? "text-white/80" : "text-[#475569]"
                            }
                          >
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      href="/get-started"
                      className={`block text-center py-3 rounded-lg text-sm font-semibold transition-all ${
                        isHighlighted
                          ? "bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/30"
                          : tier.priceCents === 0
                          ? "border-2 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                          : "bg-[#1E0A3C] text-white hover:bg-[#2D1060]"
                      }`}
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Money-back guarantee */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F3F0FF] text-[#7C3AED] text-sm font-medium">
              <CheckCircle2 size={14} />
              {MONEY_BACK_GUARANTEE_COPY}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Table ─────────────────────────────────────────── */}
      <section className="bg-white py-16 lg:py-20 border-y border-[#E9E4FF]">
        <div className="container max-w-5xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#1E0A3C] mb-10 text-center">
            What's included at each tier
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E9E4FF]">
                  <th className="text-left py-3 pr-6 text-[#64748B] font-medium w-1/3">Feature</th>
                  <th className="text-center py-3 px-3 text-[#64748B] font-medium">Free</th>
                  <th className="text-center py-3 px-3 text-[#64748B] font-medium">Pro Se<br /><span className="text-[#7C3AED] font-bold">$49</span></th>
                  <th className="text-center py-3 px-3 text-[#64748B] font-medium">Standard<br /><span className="text-[#7C3AED] font-bold">$99</span></th>
                  <th className="text-center py-3 px-3 text-[#1E0A3C] font-semibold bg-[#F3F0FF] rounded-t-lg">Express<br /><span className="text-[#7C3AED] font-bold">$129</span></th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["AI market value estimate", true, true, true, true],
                  ["Appeal strength score", true, true, true, true],
                  ["County deadline lookup", true, true, true, true],
                  ["4-page teaser report", true, false, false, false],
                  ["Full 40-page appraisal report", false, true, true, true],
                  ["Comparable sales + adjustment grid", false, true, true, true],
                  ["Street View + satellite imagery", false, true, true, true],
                  ["Step-by-step filing guide (dashboard)", false, true, true, true],
                  ["We prepare your appeal packet", false, false, true, true],
                  ["USPS Certified Mail filing", false, false, true, true],
                  ["All 3,143 US counties", false, false, true, true],
                  ["Same-day electronic portal filing", false, false, false, true],
                  ["Instant confirmation receipt", false, false, false, true],
                  ["~650 portal-enabled counties", false, false, false, true],
                  ["60-day money-back guarantee", false, true, true, true],
                ].map(([feature, free, prose, standard, express], i) => (
                  <tr key={i} className={`border-b border-[#F3F0FF] ${i % 2 === 0 ? "bg-[#FAFAFE]" : "bg-white"}`}>
                    <td className="py-3 pr-6 text-[#1E0A3C] font-medium">{feature as string}</td>
                    {[free, prose, standard, express].map((val, j) => (
                      <td key={j} className={`text-center py-3 px-3 ${j === 3 ? "bg-[#F3F0FF]" : ""}`}>
                        {val ? (
                          <CheckCircle2 size={16} className="text-[#7C3AED] mx-auto" />
                        ) : (
                          <span className="text-[#CBD5E1] text-lg leading-none">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="bg-[#F8F7FF] py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F0FF] text-[#7C3AED] text-xs font-semibold uppercase tracking-widest mb-4">
            FAQ
          </div>
          <h2 className="font-display text-3xl font-bold text-[#1E0A3C] mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="p-6 rounded-xl bg-white border border-[#E9E4FF] shadow-sm">
                <h3 className="font-display text-base font-semibold text-[#1E0A3C] mb-2">
                  {faq.q}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-[#1E0A3C] py-20">
        <div className="container text-center max-w-xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-4">
            Ready to challenge your assessment?
          </h2>
          <p className="text-white/60 mb-8">
            Enter your address and get your free AI appraisal in under 60 seconds.
          </p>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors shadow-lg shadow-[#7C3AED]/30"
          >
            Get My Free Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
