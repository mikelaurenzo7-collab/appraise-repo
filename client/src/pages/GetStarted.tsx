import { useState } from "react";
import { ArrowRight, MapPin, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

export default function GetStarted() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error("Please enter your property address");
      return;
    }
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
    toast.success("Analysis complete! Check your email for results.");
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />

      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container max-w-2xl">
          {!submitted ? (
            <>
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
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-4 rounded text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[oklch(0.12_0.055_255)] border-t-transparent rounded-full animate-spin" />
                      Analyzing Your Property...
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
                  {["No credit card required", "Results in seconds", "Completely free analysis"].map((item) => (
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
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[oklch(0.72_0.12_75)] text-white flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="font-display text-3xl lg:text-4xl font-bold text-[oklch(0.18_0.06_255)] mb-4">
                Analysis Complete!
              </h1>
              <p className="text-[oklch(0.45_0.04_255)] text-lg mb-8 max-w-md mx-auto">
                We've sent your detailed property analysis to your email. Check your inbox (and spam folder) for your results and next steps.
              </p>
              <div className="p-6 rounded-lg bg-[oklch(0.94_0.018_85)] border border-[oklch(0.88_0.015_85)] mb-8">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-[oklch(0.18_0.06_255)] mb-1">What happens next?</div>
                    <p className="text-sm text-[oklch(0.45_0.04_255)]">
                      Our team will review your property and reach out within 24 hours to discuss your appeal options. If you're over-assessed, we'll explain how much you could save and our contingency fee structure.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setAddress("");
                }}
                className="btn-gold px-6 py-3 rounded font-semibold"
              >
                Analyze Another Property
              </button>
            </div>
          )}
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
                a: "Most appeals are resolved in 3–6 months. Some jurisdictions are faster. We'll give you a timeline after your analysis.",
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
