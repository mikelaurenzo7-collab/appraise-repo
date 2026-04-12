/**
 * GetStarted — Multi-step form with address autocomplete, property type selector, and filing method selection
 * Step 1: Property address + type
 * Step 2: Contact info + filing preference
 * Step 3: Review + submit
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Zap,
  CheckCircle2,
  Building2,
  Home as HomeIcon,
  Warehouse,
  TreePine,
  Scale,
  FileText,
  Shield,
  User,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const PROPERTY_TYPES = [
  { value: "residential", label: "Residential", icon: <HomeIcon size={20} />, desc: "Single-family home, condo, townhouse" },
  { value: "multi-family", label: "Multi-Family", icon: <Building2 size={20} />, desc: "Duplex, triplex, apartment building" },
  { value: "commercial", label: "Commercial", icon: <Building2 size={20} />, desc: "Retail, office, mixed-use" },
  { value: "industrial", label: "Industrial", icon: <Warehouse size={20} />, desc: "Warehouse, manufacturing, flex space" },
  { value: "land", label: "Land / Vacant", icon: <TreePine size={20} />, desc: "Undeveloped parcel, agricultural" },
];

const FILING_METHODS = [
  {
    value: "poa",
    label: "Power of Attorney",
    icon: <Scale size={20} />,
    desc: "We act as your legal representative. Full service — we prepare, file, and attend hearings on your behalf.",
    badge: "Most Popular",
    badgeColor: "bg-[oklch(0.72_0.12_75)] text-[oklch(0.12_0.055_255)]",
  },
  {
    value: "pro-se",
    label: "Pro Se Filing",
    icon: <FileText size={20} />,
    desc: "You file yourself. We prepare all documents, coach you through the process, and support you at the hearing.",
    badge: "DIY + Support",
    badgeColor: "bg-[oklch(0.18_0.06_255)] text-white",
  },
  {
    value: "none",
    label: "Analysis Only",
    icon: <Zap size={20} />,
    desc: "Get the AI appraisal and appeal analysis. Decide later whether to file.",
    badge: "Free",
    badgeColor: "bg-green-100 text-green-800",
  },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i + 1 < current
              ? "bg-[oklch(0.72_0.12_75)] text-[oklch(0.12_0.055_255)]"
              : i + 1 === current
              ? "bg-[oklch(0.18_0.06_255)] text-white ring-2 ring-[oklch(0.72_0.12_75)] ring-offset-2"
              : "bg-[oklch(0.92_0.01_255)] text-[oklch(0.55_0.04_255)]"
          }`}>
            {i + 1 < current ? <CheckCircle2 size={16} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all ${i + 1 < current ? "bg-[oklch(0.72_0.12_75)]" : "bg-[oklch(0.88_0.015_85)]"}`} />
          )}
        </div>
      ))}
      <span className="ml-3 text-sm text-[oklch(0.55_0.04_255)]">
        Step {current} of {total}
      </span>
    </div>
  );
}

export default function GetStarted() {
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [filingMethod, setFilingMethod] = useState<"poa" | "pro-se" | "none">("poa");
  const [, navigate] = useLocation();
  const addressRef = useRef<HTMLInputElement>(null);

  const submitMutation = trpc.properties.submitAddress.useMutation({
    onSuccess: (data) => {
      toast.success("Analysis started! Redirecting...");
      if (data.submissionId) {
        navigate(`/analysis?id=${data.submissionId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit. Please try again.");
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!address.trim() || address.trim().length < 5) {
        toast.error("Please enter a valid property address");
        return;
      }
    }
    if (step === 2) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Please enter a valid email address");
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    submitMutation.mutate({ address, email, phone, filingMethod: filingMethod as "poa" | "pro-se" | "none" });
  };

  const selectedFiling = FILING_METHODS.find((f) => f.value === filingMethod)!;
  const selectedType = PROPERTY_TYPES.find((t) => t.value === propertyType)!;

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />

      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container max-w-2xl">

          {/* Header */}
          <div className="mb-8">
            <span className="gold-rule" />
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-[oklch(0.18_0.06_255)] mb-3">
              {step === 1 && "Tell Us About Your Property"}
              {step === 2 && "Your Contact Information"}
              {step === 3 && "Review & Submit"}
            </h1>
            <p className="text-[oklch(0.55_0.04_255)]">
              {step === 1 && "Enter your property address and type for the most accurate analysis."}
              {step === 2 && "We'll send your analysis results and keep you updated on your appeal."}
              {step === 3 && "Review your submission details before we start the analysis."}
            </p>
          </div>

          <StepIndicator current={step} total={3} />

          {/* ─── STEP 1: Property ─── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-2">
                  Property Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
                  <input
                    ref={addressRef}
                    type="text"
                    placeholder="123 Main St, Austin, TX 78701"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white text-[oklch(0.18_0.06_255)] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] focus:border-transparent text-base"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-[oklch(0.65_0.02_255)] mt-1.5">Include street number, city, state, and ZIP for best results</p>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-3">Property Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPropertyType(type.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        propertyType === type.value
                          ? "border-[oklch(0.72_0.12_75)] bg-[oklch(0.72_0.12_75)]/5"
                          : "border-[oklch(0.88_0.015_85)] bg-white hover:border-[oklch(0.72_0.12_75)]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
                          propertyType === type.value
                            ? "bg-[oklch(0.18_0.06_255)] text-[oklch(0.72_0.12_75)]"
                            : "bg-[oklch(0.92_0.01_255)] text-[oklch(0.55_0.04_255)]"
                        }`}>
                          {type.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[oklch(0.18_0.06_255)]">{type.label}</div>
                          <div className="text-xs text-[oklch(0.55_0.04_255)]">{type.desc}</div>
                        </div>
                        {propertyType === type.value && (
                          <CheckCircle2 size={16} className="text-[oklch(0.72_0.12_75)] ml-auto shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="btn-gold w-full py-4 rounded text-base font-semibold flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Contact + Filing Method ─── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white text-[oklch(0.18_0.06_255)] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] focus:border-transparent text-base"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-[oklch(0.65_0.02_255)] mt-1.5">Your analysis report will be sent to this address</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-2">
                  Phone <span className="text-[oklch(0.65_0.02_255)] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[oklch(0.88_0.015_85)] bg-white text-[oklch(0.18_0.06_255)] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] focus:border-transparent text-base"
                  />
                </div>
              </div>

              {/* Filing Method */}
              <div>
                <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-3">
                  How Would You Like to Proceed?
                </label>
                <div className="space-y-3">
                  {FILING_METHODS.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setFilingMethod(method.value as "poa" | "pro-se" | "none")}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        filingMethod === method.value
                          ? "border-[oklch(0.72_0.12_75)] bg-[oklch(0.72_0.12_75)]/5"
                          : "border-[oklch(0.88_0.015_85)] bg-white hover:border-[oklch(0.72_0.12_75)]/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                          filingMethod === method.value
                            ? "bg-[oklch(0.18_0.06_255)] text-[oklch(0.72_0.12_75)]"
                            : "bg-[oklch(0.92_0.01_255)] text-[oklch(0.55_0.04_255)]"
                        }`}>
                          {method.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-[oklch(0.18_0.06_255)]">{method.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${method.badgeColor}`}>
                              {method.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[oklch(0.55_0.04_255)] leading-relaxed">{method.desc}</p>
                        </div>
                        {filingMethod === method.value && (
                          <CheckCircle2 size={16} className="text-[oklch(0.72_0.12_75)] shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[oklch(0.65_0.02_255)] mt-2">
                  You can change this after reviewing your analysis. No commitment required.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded border border-[oklch(0.88_0.015_85)] text-[oklch(0.45_0.04_255)] hover:bg-[oklch(0.92_0.01_255)] transition-colors text-sm font-semibold"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-gold flex-1 py-3.5 rounded text-base font-semibold flex items-center justify-center gap-2"
                >
                  Review Submission <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Review ─── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Review card */}
              <div className="rounded-xl border border-[oklch(0.88_0.015_85)] bg-white overflow-hidden">
                <div className="bg-[oklch(0.18_0.06_255)] px-6 py-4">
                  <h3 className="font-display text-base font-semibold text-white">Submission Summary</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-[oklch(0.55_0.04_255)] uppercase tracking-widest mb-0.5">Property</div>
                      <div className="font-medium text-[oklch(0.18_0.06_255)] text-sm">{address}</div>
                      <div className="text-xs text-[oklch(0.55_0.04_255)] capitalize">{selectedType?.label}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="ml-auto text-xs text-[oklch(0.72_0.12_75)] hover:underline font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="h-px bg-[oklch(0.92_0.01_255)]" />

                  <div className="flex items-start gap-3">
                    <Mail size={16} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-[oklch(0.55_0.04_255)] uppercase tracking-widest mb-0.5">Contact</div>
                      <div className="font-medium text-[oklch(0.18_0.06_255)] text-sm">{email}</div>
                      {phone && <div className="text-xs text-[oklch(0.55_0.04_255)]">{phone}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="ml-auto text-xs text-[oklch(0.72_0.12_75)] hover:underline font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="h-px bg-[oklch(0.92_0.01_255)]" />

                  <div className="flex items-start gap-3">
                    {selectedFiling?.icon && (
                      <div className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0">{selectedFiling.icon}</div>
                    )}
                    <div>
                      <div className="text-xs text-[oklch(0.55_0.04_255)] uppercase tracking-widest mb-0.5">Filing Method</div>
                      <div className="font-medium text-[oklch(0.18_0.06_255)] text-sm">{selectedFiling?.label}</div>
                      <div className="text-xs text-[oklch(0.55_0.04_255)]">{selectedFiling?.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="ml-auto text-xs text-[oklch(0.72_0.12_75)] hover:underline font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div className="p-5 rounded-xl bg-[oklch(0.18_0.06_255)]/5 border border-[oklch(0.18_0.06_255)]/10">
                <div className="text-xs font-semibold text-[oklch(0.18_0.06_255)] uppercase tracking-widest mb-3">What Happens Next</div>
                <div className="space-y-2.5">
                  {[
                    "AI queries 4 property data APIs simultaneously",
                    "Comparable sales and market data are analyzed",
                    "LLM generates your personalized appraisal report",
                    "Appeal strength score and strategy are calculated",
                    "Results ready in 30–60 seconds",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[oklch(0.35_0.04_255)]">
                      <ChevronRight size={14} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal disclaimer */}
              <p className="text-xs text-[oklch(0.65_0.02_255)] leading-relaxed">
                By submitting, you agree to our Terms of Service and Privacy Policy. AppraiseAI does not provide legal advice. 
                For POA filings, a separate Power of Attorney agreement will be required before we can represent you.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded border border-[oklch(0.88_0.015_85)] text-[oklch(0.45_0.04_255)] hover:bg-[oklch(0.92_0.01_255)] transition-colors text-sm font-semibold"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="btn-gold flex-1 py-3.5 rounded text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[oklch(0.12_0.055_255)] border-t-transparent rounded-full animate-spin" />
                      Starting Analysis...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Start My Free Analysis
                    </>
                  )}
                </button>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                {["No credit card required", "Results in 30–60 seconds", "No win, no fee on appeals"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.04_255)]">
                    <CheckCircle2 size={12} className="text-[oklch(0.72_0.12_75)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FAQ section */}
      <section className="bg-[oklch(0.94_0.018_85)] py-20 lg:py-28">
        <div className="container max-w-3xl">
          <div className="mb-12">
            <span className="gold-rule" />
            <h2 className="font-display text-3xl font-bold text-[oklch(0.18_0.06_255)] mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Is my information secure?",
                a: "Yes. We use bank-level encryption and never share your data with third parties. Your privacy is protected at every step.",
              },
              {
                q: "What if I'm not over-assessed?",
                a: "We'll tell you honestly. If your assessment is fair, there's no point filing an appeal. We only proceed when we believe you have a strong case.",
              },
              {
                q: "What does Power of Attorney mean?",
                a: "You sign a limited POA that authorizes AppraiseAI to file your appeal and appear before the tax board on your behalf. It's limited to your property tax appeal only.",
              },
              {
                q: "How long does the appeal process take?",
                a: "Most appeals are resolved in 3–6 months. Some jurisdictions are faster. We'll give you a specific timeline after your analysis based on your county's procedures.",
              },
              {
                q: "What property types do you handle?",
                a: "Residential, multi-family, commercial, industrial, and land. Each property type uses different valuation methodologies — our AI applies the correct approach automatically.",
              },
              {
                q: "Can I speak to someone?",
                a: "Absolutely. Email hello@appraiseai.com or call our team. We're here to answer questions and help you understand your options.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-6 rounded-lg bg-white border border-[oklch(0.88_0.015_85)]">
                <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)] mb-2">{faq.q}</h3>
                <p className="text-sm text-[oklch(0.45_0.04_255)] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
