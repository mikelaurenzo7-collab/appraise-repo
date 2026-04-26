/**
 * AppraiseAI Footer
 * Design: Refined Legal-Tech — Deep navy background, cream text, gold accents
 */
import { Link } from "wouter";
import { MapPin, Mail, Shield, FileText, Scale } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#020617] text-[#F1F5F9]">
      {/* Main footer content */}
      <div className="container mx-auto py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-[#7C3AED] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L2 7v9h5v-5h4v5h5V7L9 2z" fill="oklch(0.12 0.055 255)" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl text-white tracking-tight">
                Appraise<span className="text-[#7C3AED]">AI</span>
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              Software that helps property owners file their own tax appeals
              through their county&apos;s online portal. Flat-fee pricing,
              60-day money-back guarantee.
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#7C3AED] shrink-0" />
                <span>Automated filing in select counties</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#7C3AED] shrink-0" />
                <a href="mailto:hello@appraiseai.com" className="hover:text-white transition-colors">hello@appraiseai.com</a>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Product</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li><Link href="/tax-appeals" className="hover:text-[#7C3AED] transition-colors">Property Tax Appeals</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#7C3AED] transition-colors">Instant AI Appraisal</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#7C3AED] transition-colors">Automated Online Filing</Link></li>
              <li><Link href="/pricing" className="hover:text-[#7C3AED] transition-colors">Flat-Fee Pricing</Link></li>
              <li><Link href="/deadlines" className="hover:text-[#7C3AED] transition-colors">Filing Deadlines</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Company</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li><Link href="/about" className="hover:text-[#7C3AED] transition-colors">About Us</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#7C3AED] transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-[#7C3AED] transition-colors">Pricing</Link></li>
              <li><Link href="/blog" className="hover:text-[#7C3AED] transition-colors">Blog</Link></li>
              <li><Link href="/testimonials" className="hover:text-[#7C3AED] transition-colors">Testimonials</Link></li>
            </ul>
          </div>

          {/* Trust badges */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">How we're built</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-3 rounded border border-white/10 bg-white/5">
                <Shield size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Money-Back Guarantee</div>
                  <div className="text-xs text-white/50 mt-0.5">Full refund if we don&apos;t reduce your assessment</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded border border-white/10 bg-white/5">
                <FileText size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Software, Not a Law Firm</div>
                  <div className="text-xs text-white/50 mt-0.5">You file pro se — we&apos;re the tool</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded border border-white/10 bg-white/5">
                <Scale size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Scrivener Authorization</div>
                  <div className="text-xs text-white/50 mt-0.5">Per-filing consent, logged and hashed</div>
                </div>
              </div>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
