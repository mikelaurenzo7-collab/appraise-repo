/**
 * AppraiseAI Navbar
 * Design: Refined Legal-Tech — Deep navy + cream + gold
 * Sticky top nav with transparent-to-solid scroll behavior
 * Auth-aware: shows Sign In for guests, avatar + dashboard + logout for users
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Zap, LogOut, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const navLinks = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Tax Appeals", href: "/tax-appeals" },
  { label: "Deadlines", href: "/deadlines" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const navBg = isHome && !scrolled
    ? "bg-transparent"
    : "bg-[#0F172A]/85 backdrop-blur-xl shadow-lg shadow-black/10 border-b border-white/5";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

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

        {/* Desktop CTA — auth-aware */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
              {/* Avatar + dropdown */}
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {initials}
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors max-w-[120px] truncate">
                    {user?.name?.split(" ")[0] || "Account"}
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                      <div className="text-xs text-white/50 truncate">{user?.email || "Signed in"}</div>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard size={15} /> My Dashboard
                    </Link>
                    <Link
                      href="/portfolio"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User size={15} /> My Portfolio
                    </Link>
                    <div className="border-t border-white/10 mt-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <a
                href={getLoginUrl()}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
              >
                Sign In
              </a>
              <Link
                href="/get-started"
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#020617] bg-gradient-to-r from-[#FBBF24] via-[#F59E0B] to-[#FBBF24] hover:scale-[1.02] transition-all duration-200 shadow-[0_8px_30px_-8px_rgba(251,191,36,0.4)] hover:shadow-[0_12px_40px_-8px_rgba(251,191,36,0.6)]"
              >
                Get My Free Analysis
                <Zap size={14} className="group-hover:rotate-12 transition-transform duration-200" />
              </Link>
            </>
          )}
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
          mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
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
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{user?.name}</div>
                      <div className="text-xs text-white/50">Signed in</div>
                    </div>
                  </div>
                  <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-white/70 py-2 px-3 rounded-lg hover:bg-white/5">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                  <Link href="/portfolio" className="flex items-center gap-2 text-sm font-medium text-white/70 py-2 px-3 rounded-lg hover:bg-white/5">
                    <User size={15} /> Portfolio
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 text-sm font-medium text-red-400 py-2 px-3 rounded-lg hover:bg-red-500/10 text-left"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <a
                    href={getLoginUrl()}
                    className="text-sm font-medium text-white/70 py-2 px-3 rounded-lg hover:bg-white/5"
                  >
                    Sign In
                  </a>
                </>
              )}
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
