import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Scale, Clock, DollarSign } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TaxAppeals() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <section className="bg-[#0F172A] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">
            Property Tax Appeals
          </h1>
          <p className="text-white/70 text-lg">
            AppraiseAI helps you file your own appeal — pro se — through your
            county&apos;s online portal. Flat fee, 60-day money-back guarantee
            if your assessment isn&apos;t reduced.
          </p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="gold-rule" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-6">
                You file. Our software fills in the form.
              </h2>
              <p className="text-[#64748B] mb-8 leading-relaxed">
                AppraiseAI is a software tool, not a law firm. We build your
                evidence package, pre-fill your county&apos;s online form with
                your data, and (after you authorize the specific filing) submit
                it on your behalf through the portal. You stay the filer of
                record.
              </p>
              {[
                "Automated online filing for supported counties",
                "Mail-in pro-se packet fallback otherwise",
                "Comparable sales analysis as supporting evidence",
                "Scrivener authorization — logged and hashed per filing",
                "Filing confirmation number + screenshot saved to your dashboard",
                "Flat fee, refunded if your assessment isn’t reduced",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#334155]">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#0F172A] p-10 shadow-2xl aspect-[4/5] flex flex-col justify-between">
              <div className="text-white/80 text-sm uppercase tracking-[0.2em]">
                Filing in progress
              </div>
              <div>
                <div className="font-data text-4xl font-bold text-white mb-2">
                  $1,284<span className="text-lg text-white/60">/yr est.</span>
                </div>
                <div className="text-white/70 text-sm">
                  Appeal strength 78%. Filing submitted at 10:42 AM via Travis
                  CAD portal. Confirmation #A-2F41-9X.
                </div>
              </div>
              <div className="text-white/60 text-xs">
                Your data. Your signature. Our software.
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Shield size={20} />, title: "Money-Back Guarantee", desc: "Full refund if your assessment isn’t reduced." },
              { icon: <Scale size={20} />, title: "Pro Se, By Design", desc: "You remain the filer. We’re the tool." },
              { icon: <Clock size={20} />, title: "4-Minute Filing", desc: "For supported counties with online portals." },
              { icon: <DollarSign size={20} />, title: "Flat Fee Pricing", desc: "$79, $149, or $299 by assessed value." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-lg bg-white border border-[#E2E8F0]">
                <div className="w-10 h-10 rounded bg-[#0F172A] text-[#7C3AED] flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-display text-base font-semibold text-[#0F172A] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748B]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F172A] py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="gold-rule mx-auto" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
              Why appeals succeed
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { title: "Data-Grounded Evidence", desc: "Our appeal packet is built from comparable sales, public assessor records, and commercial property data." },
              { title: "County-Specific Forms", desc: "We match each county's exact form number and field mapping — not a generic template." },
              { title: "Timely Filing Window", desc: "Automated filing lands on-time within the county's active window — no missed deadlines." },
              { title: "Auditable Submission", desc: "Every filing has a screenshot, confirmation number, and execution log saved to your dashboard." },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl bg-white/10 border border-white/20">
                <h3 className="font-display text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container text-center max-w-xl mx-auto">
          <span className="gold-rule mx-auto" />
          <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-4">
            Ready to file?
          </h2>
          <p className="text-[#64748B] mb-8">
            Get your free AI appraisal first. If you&apos;re over-assessed,
            file your appeal in 4 minutes.
          </p>
          <Link
            href="/get-started"
            className="btn-gold inline-flex items-center gap-2 px-7 py-4 rounded font-semibold"
          >
            Start My Filing <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
