import { Link } from "wouter";
import { ArrowRight, Zap, Users, Target, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function About() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <section className="bg-[#0F172A] pt-32 pb-20">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-5">About AppraiseAI</h1>
          <p className="text-white/70 text-lg">We're building the future of property tax appeals — combining AI precision with legal expertise to help homeowners fight back.</p>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-6">Our Mission</h2>
          <p className="text-[#64748B] leading-relaxed text-lg mb-8">
            More than 40% of American homeowners are over-assessed on their property taxes. Most never appeal because the process is confusing, expensive, and time-consuming. AppraiseAI exists to change that.
          </p>
          <p className="text-[#64748B] leading-relaxed text-lg mb-8">
            We combine cutting-edge AI valuation technology with licensed appraisers and legal filing expertise to make property tax appeals fast, affordable, and accessible to everyone — regardless of income or location.
          </p>
          <p className="text-[#64748B] leading-relaxed text-lg">
            Our contingency model means zero upfront cost. You only pay when we win. It's that simple.
          </p>
        </div>
      </section>

      <section className="bg-[#0F172A] py-20 lg:py-28">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="gold-rule mx-auto" />
            <h2 className="font-display text-3xl font-bold text-white mb-4">Why We Built AppraiseAI</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { icon: <Target size={24} />, title: "The Problem", desc: "Property tax appeals are a broken system. Wealthy homeowners with lawyers win. Everyone else overpays." },
              { icon: <Zap size={24} />, title: "The Opportunity", desc: "AI can instantly identify over-assessments. Legal filing can be automated. The barrier to entry should be zero." },
              { icon: <Users size={24} />, title: "The Team", desc: "We're appraisers, lawyers, and engineers united by one goal: democratizing property tax appeals." },
              { icon: <Award size={24} />, title: "The Difference", desc: "We don't just appraise. We fight. We appear in hearings. We negotiate. We win." },
            ].map((item) => (
              <div key={item.title} className="p-8 rounded-xl bg-white/10 border border-white/20">
                <div className="w-12 h-12 rounded bg-[#7C3AED] text-[#0F172A] flex items-center justify-center mb-4">{item.icon}</div>
                <h3 className="font-display text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="container max-w-3xl">
          <span className="gold-rule" />
          <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-8">Our Values</h2>
          <div className="space-y-6">
            {[
              { title: "Transparency", desc: "No hidden fees. No surprises. You know exactly what you're paying and why." },
              { title: "Integrity", desc: "We only file appeals we believe in. We don't chase every case — we chase the right ones." },
              { title: "Expertise", desc: "Licensed appraisers. Experienced tax attorneys. AI engineers. We bring the full stack." },
              { title: "Accessibility", desc: "Contingency fees mean anyone can afford an appeal. Wealth shouldn't determine your tax burden." },
              { title: "Speed", desc: "Instant AI appraisals. Same-day filing. Results in weeks, not months." },
            ].map((v) => (
              <div key={v.title} className="p-6 rounded-xl bg-white border border-[#E2E8F0]">
                <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">{v.title}</h3>
                <p className="text-[#64748B]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[oklch(0.94_0.018_85)] py-16">
        <div className="container text-center max-w-xl">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-[#0F172A] mb-4">Join Thousands of Homeowners Saving Money</h2>
          <p className="text-[#64748B] mb-8">Get your free AI appraisal today. No credit card. No obligation.</p>
          <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-7 py-4 rounded font-semibold">
            Get My Free Analysis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
