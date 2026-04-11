import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Shield, Scale, FileText, Clock, DollarSign, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TaxAppeals() {
  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />
      <section className="bg-[oklch(0.18_0.06_255)] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">Property Tax Appeals</h1>
          <p className="text-white/70 text-lg">We file your appeal nationwide via power of attorney or pro se. No upfront cost. No win, no fee.</p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="gold-rule" />
              <h2 className="font-display text-3xl lg:text-4xl font-bold text-[oklch(0.18_0.06_255)] mb-6">Your Appeal, Handled End-to-End</h2>
              <p className="text-[oklch(0.45_0.04_255)] mb-8 leading-relaxed">
                We don't just appraise your property — we fight your tax bill. From filing to hearing representation, AppraiseAI handles the entire appeal process on your behalf.
              </p>
              {[
                "Power of Attorney filing in all 50 states",
                "Certified appraisal report included",
                "Deadline tracking and compliance",
                "Hearing representation (or pro se coaching)",
                "Negotiation with county assessor",
                "Contingency fee — 25% of first-year savings only",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={16} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                  <span className="text-sm text-[oklch(0.3_0.04_255)]">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663544407089/njPZ7GrdvQti9UYLXGdrDo/legal-document-UVutgeC3fnSaJpZL9qyzeJ.webp" alt="Legal filing" className="w-full h-96 object-cover" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Shield size={20} />, title: "No Win, No Fee", desc: "Zero upfront cost. We only earn when you save." },
              { icon: <Scale size={20} />, title: "Legal Authority", desc: "Licensed in all 50 states. POA or pro se filing." },
              { icon: <Clock size={20} />, title: "Fast Results", desc: "Most appeals resolved in 3–6 months." },
              { icon: <DollarSign size={20} />, title: "Real Savings", desc: "Average $2,800/year per successful appeal." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-lg bg-white border border-[oklch(0.88_0.015_85)]">
                <div className="w-10 h-10 rounded bg-[oklch(0.18_0.06_255)] text-[oklch(0.72_0.12_75)] flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)] mb-2">{f.title}</h3>
                <p className="text-sm text-[oklch(0.45_0.04_255)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[oklch(0.18_0.06_255)] py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="gold-rule mx-auto" />
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">Why Appeals Succeed</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { title: "AI-Backed Evidence", desc: "Our AI appraisal identifies assessment errors that manual review often misses." },
              { title: "Certified Appraisers", desc: "Licensed professionals prepare court-ready reports that assessors respect." },
              { title: "Comparable Sales Analysis", desc: "We prove your property is worth less than the assessed value using recent comps." },
              { title: "Legal Representation", desc: "We appear before the board on your behalf — no intimidation, no confusion." },
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
          <h2 className="font-display text-3xl font-bold text-[oklch(0.18_0.06_255)] mb-4">Ready to File Your Appeal?</h2>
          <p className="text-[oklch(0.45_0.04_255)] mb-8">Get your free AI appraisal first. If you're over-assessed, we'll handle the rest.</p>
          <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-7 py-4 rounded font-semibold">
            Start My Appeal <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
