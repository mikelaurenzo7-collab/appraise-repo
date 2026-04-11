/**
 * AppraiseAI Footer
 * Design: Refined Legal-Tech — Deep navy background, cream text, gold accents
 */
import { Link } from "wouter";
import { MapPin, Phone, Mail, Shield, FileText, Scale } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[oklch(0.12_0.055_255)] text-[oklch(0.975_0.012_85)]">
      {/* Main footer content */}
      <div className="container mx-auto py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-[oklch(0.72_0.12_75)] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L2 7v9h5v-5h4v5h5V7L9 2z" fill="oklch(0.12 0.055 255)" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl text-white tracking-tight">
                Appraise<span className="text-[oklch(0.72_0.12_75)]">AI</span>
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              AI-powered property appraisals and nationwide tax appeal filing. We fight your property tax bill — so you don't have to.
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[oklch(0.72_0.12_75)] shrink-0" />
                <span>Nationwide Coverage — All 50 States</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[oklch(0.72_0.12_75)] shrink-0" />
                <a href="mailto:hello@appraiseai.com" className="hover:text-white transition-colors">hello@appraiseai.com</a>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Services</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li><Link href="/tax-appeals" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Property Tax Appeals</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Instant AI Appraisal</Link></li>
              <li><Link href="/tax-appeals" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Power of Attorney Filing</Link></li>
              <li><Link href="/tax-appeals" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Pro Se Representation</Link></li>
              <li><Link href="/pricing" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">24-Hour Certified Appraisal</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Company</h4>
            <ul className="flex flex-col gap-3 text-sm text-white/60">
              <li><Link href="/about" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">About Us</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Pricing</Link></li>
              <li><a href="#" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-[oklch(0.72_0.12_75)] transition-colors">Press</a></li>
            </ul>
          </div>

          {/* Trust badges */}
          <div>
            <h4 className="font-display text-sm font-semibold text-white uppercase tracking-widest mb-5">Trust & Security</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-3 rounded border border-white/10 bg-white/5">
                <Shield size={16} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">No Win, No Fee</div>
                  <div className="text-xs text-white/50 mt-0.5">You only pay if we save you money</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded border border-white/10 bg-white/5">
                <FileText size={16} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Licensed Appraisers</div>
                  <div className="text-xs text-white/50 mt-0.5">Certified in all 50 states</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded border border-white/10 bg-white/5">
                <Scale size={16} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-white">Legal Authority</div>
                  <div className="text-xs text-white/50 mt-0.5">POA & pro se filing nationwide</div>
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
            <a href="#" className="hover:text-white/70 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/70 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white/70 transition-colors">Disclaimer</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
