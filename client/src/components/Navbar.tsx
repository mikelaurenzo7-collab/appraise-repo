/**
 * AppraiseAI Navbar
 * Design: Refined Legal-Tech — Deep navy + cream + gold
 * Sticky top nav with transparent-to-solid scroll behavior
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";

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
    : "bg-[oklch(0.18_0.06_255)] shadow-lg shadow-black/20";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-[oklch(0.72_0.12_75)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L2 7v9h5v-5h4v5h5V7L9 2z" fill="oklch(0.12 0.055 255)" />
              <path d="M9 2L2 7" stroke="oklch(0.12 0.055 255)" strokeWidth="0.5" />
            </svg>
          </div>
          <span className="font-display font-700 text-xl text-white tracking-tight">
            Appraise<span className="text-[oklch(0.72_0.12_75)]">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-body font-medium transition-colors duration-200 ${
                location === link.href
                  ? "text-[oklch(0.72_0.12_75)]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            My Dashboard
          </Link>
          <Link
            href="/get-started"
            className="btn-gold px-5 py-2.5 rounded text-sm font-semibold"
          >
            Get My Free Analysis
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[oklch(0.18_0.06_255)] border-t border-white/10 px-4 pb-6 pt-4">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-medium py-1 ${
                  location === link.href
                    ? "text-[oklch(0.72_0.12_75)]"
                    : "text-white/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/get-started"
              className="btn-gold mt-2 px-5 py-3 rounded text-sm font-semibold text-center"
            >
              Get My Free Analysis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
