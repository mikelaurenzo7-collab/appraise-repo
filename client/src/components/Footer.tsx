/**
 * AppraiseAI Footer
 * Design: Refined Legal-Tech — Deep navy background, cream text, gold accents
 * Enhanced: gradient border, newsletter CTA, social links, back-to-top
 */
import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Mail, Shield, FileText, Scale, ArrowUp, Zap, Twitter, Linkedin, Github } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes("@")) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="bg-[#020617] text-[#F1F5F9] relative">
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />

      {/* Newsletter CTA band */}
      <div className="container mx-auto py-12 lg:py-14">
        <div className="relative rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 via-[#0D9488]/5 to-[#FBBF24]/10 border border-[#7C3AED]/20 p-8 lg:p-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#7C3AED]/20 blur-[60px]" />
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-white mb-2">
                Know when your county goes live
              </h3>
              <p className="text-white/60 text-sm max-w-md">
                Get notified as we add automated filing support for new counties. No spam, just updates.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full lg:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 lg:w-64 px-4 py-3 rounded-xl bg-[#0F172A]/80 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/30 transition-all"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#7C3AED]/30 transition-all whitespace-nowrap"
              >
                {subscribed ? "Subscribed!" : "Notify Me"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container mx-auto pb-16 lg:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-display font-black text-xl text-white tracking-tight">
                Appraise<span className="text-[#7C3AED]">AI</span>
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-sm">
              Software that helps property owners file their own tax appeals
              through their county&apos;s online portal. Flat-fee pricing,
              60-day money-back guarantee.
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/50 mb-6">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#7C3AED] shrink-0" />
                <span>Automated filing in select counties</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#7C3AED] shrink-0" />
                <a href="mailto:hello@appraiseai.com" className="hover:text-[#7C3AED] transition-colors">hello@appraiseai.com</a>
              </div>
            </div>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {[
                { icon: <Twitter size={16} />, href: "#", label: "Twitter" },
                { icon: <Linkedin size={16} />, href: "#", label: "LinkedIn" },
                { icon: <Github size={16} />, href: "#", label: "GitHub" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-[#7C3AED] hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/10 transition-all"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Product</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li><Link href="/tax-appeals" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Property Tax Appeals <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Instant AI Appraisal <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Automated Online Filing <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/pricing" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Flat-Fee Pricing <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/deadlines" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Filing Deadlines <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Company</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li><Link href="/about" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">About Us <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/blog" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Blog <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/testimonials" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Testimonials <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
              <li><Link href="/portfolio" className="hover:text-[#7C3AED] transition-colors inline-flex items-center gap-1 group">Portfolio <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#7C3AED]">→</span></Link></li>
            </ul>
          </div>

          {/* Trust badges */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">How we're built</h4>
            <div className="flex flex-col gap-3">
              {[
                { icon: <Shield size={16} />, title: "Money-Back Guarantee", desc: "Full refund if we don't reduce your assessment" },
                { icon: <FileText size={16} />, title: "Software, Not a Law Firm", desc: "You file pro se — we're the tool" },
                { icon: <Scale size={16} />, title: "Scrivener Authorization", desc: "Per-filing consent, logged and hashed" },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/5 transition-all group cursor-default"
                >
                  <div className="text-[#7C3AED] mt-0.5 shrink-0 group-hover:scale-110 transition-transform">
                    {badge.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{badge.title}</div>
                    <div className="text-xs text-white/50 mt-0.5">{badge.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <span>© {new Date().getFullYear()} AppraiseAI, Inc. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms of Service</Link>
            <Link href="/disclaimer" className="hover:text-white/70 transition-colors">Disclaimer</Link>
            <button
              onClick={scrollToTop}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/30 hover:text-[#7C3AED] transition-all"
              aria-label="Back to top"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
