import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, MapPin, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function GetStarted() {
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [, navigate] = useLocation();

  const submitMutation = trpc.properties.submitAddress.useMutation({
    onSuccess: (data) => {
      toast.success("Property submitted! Redirecting to analysis...");
      // Redirect to analysis results page with submission ID
      if (data.submissionId) {
        navigate(`/analysis?id=${data.submissionId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error("Please enter your property address");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    submitMutation.mutate({ address, email, phone });
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />

      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container max-w-2xl">
          <span className="gold-rule" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold text-[oklch(0.18_0.06_255)] mb-4">
            Get Your Free Property Analysis
          </h1>
          <p className="text-[oklch(0.45_0.04_255)] text-lg mb-12 leading-relaxed">
            Enter your property address below. Our AI will instantly analyze your assessment, compare it to market value, and show you how much you could save.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address input */}
            <div>
              <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-2">Property Address</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
                <input
                  type="text"
                  placeholder="123 Main St, Austin, TX 78701"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white text-[oklch(0.18_0.06_255)] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] focus:border-transparent"
                  disabled={submitMutation.isPending}
                />
              </div>
            </div>

            {/* Email input */}
            <div>
              <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-2">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white text-[oklch(0.18_0.06_255)] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] focus:border-transparent"
                disabled={submitMutation.isPending}
              />
            </div>

            {/* Phone input */}
            <div>
              <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-2">Phone (Optional)</label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white text-[oklch(0.18_0.06_255)] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] focus:border-transparent"
                disabled={submitMutation.isPending}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="btn-gold w-full py-4 rounded text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-[oklch(0.12_0.055_255)] border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Get My Free Analysis
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Trust signals */}
            <div className="space-y-2 pt-4">
              {["No credit card required", "AI analysis in seconds", "Completely free"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-[oklch(0.45_0.04_255)]">
                  <CheckCircle2 size={14} className="text-[oklch(0.72_0.12_75)]" />
                  {item}
                </div>
              ))}
            </div>
          </form>

          {/* Info boxes */}
          <div className="grid md:grid-cols-2 gap-6 mt-12 pt-12 border-t border-[oklch(0.88_0.015_85)]">
            {[
              {
                icon: <Zap size={20} />,
                title: "Instant Results",
                desc: "Get your AI appraisal in seconds. No waiting, no paperwork.",
              },
              {
                icon: <CheckCircle2 size={20} />,
                title: "Next Steps",
                desc: "If you're over-assessed, we'll explain your appeal options and fees.",
              },
            ].map((box) => (
              <div key={box.title} className="p-5 rounded-lg bg-white border border-[oklch(0.88_0.015_85)]">
                <div className="w-9 h-9 rounded bg-[oklch(0.18_0.06_255)] text-[oklch(0.72_0.12_75)] flex items-center justify-center mb-3">
                  {box.icon}
                </div>
                <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)] mb-1">{box.title}</h3>
                <p className="text-sm text-[oklch(0.45_0.04_255)]">{box.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="bg-[oklch(0.94_0.018_85)] py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="mb-12">
            <span className="gold-rule" />
            <h2 className="font-display text-3xl font-bold text-[oklch(0.18_0.06_255)] mb-4">Questions?</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: "Is my information secure?",
                a: "Yes. We use bank-level encryption and never share your data with third parties. Your privacy is protected.",
              },
              {
                q: "What if I'm not over-assessed?",
                a: "We'll tell you honestly. If your assessment is fair, there's no point filing an appeal. We only proceed when we believe you'll win.",
              },
              {
                q: "How long does the appeal process take?",
                a: "Most appeals are resolved in 3-6 months. Some jurisdictions are faster. We'll give you a timeline after your analysis.",
              },
              {
                q: "Can I speak to someone?",
                a: "Absolutely. Email hello@appraiseai.com or call our team. We're here to answer questions and help you understand your options.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-lg bg-white border border-[oklch(0.88_0.015_85)]">
                <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)] mb-2">{faq.q}</h3>
                <p className="text-sm text-[oklch(0.45_0.04_255)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
