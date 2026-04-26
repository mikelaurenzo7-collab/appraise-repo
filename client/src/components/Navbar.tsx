/**
 * AppraiseAI Navbar
 * Design: Refined Legal-Tech — Deep navy + cream + gold
 * Sticky top nav with transparent-to-solid scroll behavior
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Tax Appeals", href: "/tax-appeals" },
  { label: "Deadlines", href: "/deadlines" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const navBg = isHome && !scrolled
    ? "bg-transparent"
    : "bg-[#0F172A]/85 backdrop-blur-xl shadow-lg shadow-black/10 border-b border-white/5";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20 group-hover:shadow-[#7C3AED]/40 transition-shadow duration-300">
            <Zap size={18} className="text-white" />
          </div>
          <span className="font-display font-black text-xl text-white tracking-tight group-hover:tracking-normal transition-all duration-300">
            Appraise<span className="text-[#7C3AED]">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                  isActive
                    ? "text-[#7C3AED] bg-[#7C3AED]/10"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-[#7C3AED] to-[#FBBF24] rounded-full transition-all duration-300 ${
                    isActive ? "w-4 opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/portfolio"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Portfolio
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          >
            Dashboard
          </Link>
          <Link
            href="/get-started"
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#020617] bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-[#FBBF24] hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_30px_-8px_rgba(251,191,36,0.4)] hover:shadow-[0_12px_40px_-8px_rgba(251,191,36,0.6)]"
          >
            Get My Free Analysis
            <Zap size={14} className="group-hover:rotate-12 transition-transform duration-200" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 px-4 pb-6 pt-4">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium py-2.5 px-3 rounded-lg transition-colors ${
                  location === link.href
                    ? "text-[#7C3AED] bg-[#7C3AED]/10"
                    : "text-white/80 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/portfolio"
                className="text-sm font-medium text-white/60 py-2 px-3 rounded-lg hover:bg-white/5"
              >
                Portfolio
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-white/60 py-2 px-3 rounded-lg hover:bg-white/5"
              >
                Dashboard
              </Link>
            </div>
            <Link
              href="/get-started"
              className="btn-gold mt-3 px-5 py-3 rounded-xl text-sm font-semibold text-center"
            >
              Get My Free Analysis
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
