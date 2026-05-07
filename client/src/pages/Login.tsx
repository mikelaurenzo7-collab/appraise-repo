import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Building2, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

function getReturnTo(): string {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const rt = params.get("returnTo") ?? "/";
  return rt.startsWith("/") && !rt.startsWith("//") ? rt : "/";
}

export default function Login() {
  const [, navigate] = useLocation();
  const returnTo = getReturnTo();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  const utils = trpc.useUtils();

  const signinMut = trpc.auth.signin.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate(returnTo);
    },
    onError: (e) => {
      setError(e.message);
      // Detect Supabase's "Email not confirmed" response so we can offer to
      // resend the confirmation message instead of leaving the user stuck.
      setShowResend(/email.*not.*confirm/i.test(e.message));
    },
  });

  const signupMut = trpc.auth.signup.useMutation({
    onSuccess: async (data) => {
      if (data.requiresConfirmation) {
        setInfo("Check your email for a confirmation link, then sign in.");
        setTab("signin");
        setPassword("");
      } else {
        await utils.auth.me.invalidate();
        navigate(returnTo);
      }
    },
    onError: (e) => setError(e.message),
  });

  const resendMut = trpc.auth.resendConfirmation.useMutation({
    onSuccess: () => {
      setInfo("Confirmation email sent. Please check your inbox.");
      setError(null);
      setShowResend(false);
    },
    onError: () => {
      // Even on failure, show a neutral message — we don't want to leak whether
      // the email is registered.
      setInfo("If that email is registered, a confirmation link has been sent.");
      setError(null);
      setShowResend(false);
    },
  });

  const busy = signinMut.isPending || signupMut.isPending || resendMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setShowResend(false);
    if (tab === "signin") {
      signinMut.mutate({ email, password });
    } else {
      signupMut.mutate({ email, password, name: name || undefined });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative ambient glow — purple top-left, gold bottom-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-[#7C3AED] opacity-25 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-[#FBBF24] opacity-15 blur-[120px]"
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-9">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(124,58,237,0.6)]">
            <Building2 size={22} className="text-white" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white font-bold text-xl tracking-tight">AppraiseAI</span>
            <span className="text-[#A78BFA] text-[10px] font-semibold tracking-[0.18em] uppercase mt-0.5">
              Property Tax Appeals
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <Sparkles size={12} className="text-[#FBBF24]" />
          <p className="text-white/55 text-xs tracking-wide">
            USPAP-aligned analysis. Audience-aware briefs.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]">
          {/* Tabs */}
          <div className="flex rounded-xl bg-white/5 p-1 mb-7">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setInfo(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t
                    ? "bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.5)]"
                    : "text-white/55 hover:text-white/85"
                }`}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {tab === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-white/65 mb-1.5 tracking-wide uppercase">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] text-sm transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white/65 mb-1.5 tracking-wide uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/65 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "At least 8 characters" : "Your password"}
                  required
                  minLength={tab === "signup" ? 8 : 6}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-[#A78BFA] transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 space-y-2">
                <p>{error}</p>
                {showResend && email && (
                  <button
                    type="button"
                    onClick={() => resendMut.mutate({ email })}
                    disabled={resendMut.isPending}
                    className="text-[#A78BFA] underline underline-offset-2 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed text-xs font-semibold"
                  >
                    {resendMut.isPending ? "Sending…" : "Resend confirmation email"}
                  </button>
                )}
              </div>
            )}
            {info && (
              <p className="text-emerald-300 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] hover:from-[#8B4CF1] hover:to-[#7C3AED] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.75 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-[0_8px_24px_-8px_rgba(124,58,237,0.6)] hover:shadow-[0_10px_28px_-6px_rgba(124,58,237,0.7)]"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-white/40 text-xs mt-7">
            No credit card required to{" "}
            {tab === "signin" ? "sign in" : "create an account"}.
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Secure session protected by HS256 JWT and HTTPS-only cookies.
        </p>
      </div>
    </div>
  );
}
