import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";

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

  const utils = trpc.useUtils();

  const signinMut = trpc.auth.signin.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate(returnTo);
    },
    onError: (e) => setError(e.message),
  });

  const signupMut = trpc.auth.signup.useMutation({
    onSuccess: async (data) => {
      if (data.requiresConfirmation) {
        setInfo("Check your email for a confirmation link, then sign in.");
        setTab("signin");
      } else {
        await utils.auth.me.invalidate();
        navigate(returnTo);
      }
    },
    onError: (e) => setError(e.message),
  });

  const busy = signinMut.isPending || signupMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (tab === "signin") {
      signinMut.mutate({ email, password });
    } else {
      signupMut.mutate({ email, password, name: name || undefined });
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">AppraiseAI</span>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex rounded-lg bg-white/5 p-1 mb-8">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setInfo(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  tab === t
                    ? "bg-[#2563EB] text-white shadow"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {tab === "signup" && (
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "signup" ? "At least 8 characters" : "Your password"}
                  required
                  minLength={tab === "signup" ? 8 : 6}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            No credit card required to{" "}
            {tab === "signin" ? "sign in" : "create an account"}.
          </p>
        </div>
      </div>
    </div>
  );
}
