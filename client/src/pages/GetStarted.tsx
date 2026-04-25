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
  AlertCircle,
  Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AddressAutocomplete, type StructuredAddress } from "@/components/AddressAutocomplete";
import { usePageMeta } from "@/hooks/usePageMeta";
import { AnalyticsEvent, track } from "@/lib/analytics";
import PhotoUpload from "@/components/PhotoUpload";

// US state abbreviation map for auto-detection from address
const STATE_ABBREVS: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC',
};
const ALL_STATE_CODES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function detectStateFromAddress(addr: string): string | null {
  const upper = addr.toUpperCase().trim();
  // Try 2-letter state code match (e.g. ", IL " or ", IL\d")
  for (const code of ALL_STATE_CODES) {
    const patterns = [
      new RegExp(`,\\s*${code}\\s+\\d`),
      new RegExp(`,\\s*${code}\\s*$`),
      new RegExp(`,\\s*${code},`),
    ];
    for (const p of patterns) {
      if (p.test(upper)) return code;
    }
  }
  // Try full state name
  const lower = addr.toLowerCase();
  for (const [name, code] of Object.entries(STATE_ABBREVS)) {
    if (lower.includes(name)) return code;
  }
  return null;
}

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
    label: "Automated Online Filing",
    icon: <Scale size={20} />,
    desc: "For supported counties with online portals. Our software pre-fills and submits the county's form after you review and sign a per-filing scrivener authorization. You stay the filer of record.",
    badge: "Most Popular",
    price: "$99 flat",
    priceDesc: "60-day money-back guarantee",
    badgeColor: "bg-[#7C3AED] text-[#020617]",
  },
  {
    value: "pro-se",
    label: "Pro Se Filing",
    icon: <FileText size={20} />,
    desc: "You file yourself. We prepare all documents, coach you through the process, and support you at the hearing.",
    badge: "DIY + Support",
    price: "$49",
    priceDesc: "One-time fee",
    badgeColor: "bg-[#0F172A] text-white",
  },
  {
    value: "none",
    label: "Analysis Only",
    icon: <Zap size={20} />,
    desc: "Get the AI appraisal and appeal analysis. Decide later whether to file.",
    badge: "Free",
    price: "Free",
    priceDesc: "No commitment",
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
              ? "bg-[#7C3AED] text-[#020617]"
              : i + 1 === current
              ? "bg-[#0F172A] text-white ring-2 ring-[#7C3AED] ring-offset-2"
              : "bg-[#F1F5F9] text-[#64748B]"
          }`}>
            {i + 1 < current ? <CheckCircle2 size={16} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 transition-all ${i + 1 < current ? "bg-[#7C3AED]" : "bg-[#E2E8F0]"}`} />
          )}
        </div>
      ))}
      <span className="ml-3 text-sm text-[#64748B]">
        Step {current} of {total}
      </span>
    </div>
  );
}

export default function GetStarted() {
  usePageMeta({
    title: "Get Started — Property Tax Appeal",
    description: "Enter your property address and get an instant AI appraisal. Flat fee, 60-day money-back guarantee.",
    canonicalPath: "/get-started",
  });
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [filingMethod, setFilingMethod] = useState<"poa" | "pro-se" | "none">("poa");
  const [selectedCountyId, setSelectedCountyId] = useState<number | null>(null);
  const [photoSubmissionId, setPhotoSubmissionId] = useState<number | null>(null);
  const [photosUploaded, setPhotosUploaded] = useState<number>(0);
  const [, navigate] = useLocation();

  // Fire once when the user first interacts (not on mount), so page views
  // don't inflate the form-start count.
  const [formStartTracked, setFormStartTracked] = useState(false);
  useEffect(() => {
    if (!formStartTracked && (address.length > 0 || email.length > 0)) {
      track(AnalyticsEvent.FormStart);
      setFormStartTracked(true);
    }
  }, [address, email, formStartTracked]);

  // Get high-impact states
  const statesQuery = trpc.counties.getHighImpactStates.useQuery();
  const [selectedState, setSelectedState] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  // County name from geocoding (used for dynamic Serper lookup when county not in DB)
  const [detectedCountyName, setDetectedCountyName] = useState("");

  // Auto-detect state from address when moving to step 2
  useEffect(() => {
    if (step === 2 && address) {
      const detected = detectStateFromAddress(address);
      if (detected) {
        setSelectedState(detected);
        setSelectedCountyId(null);
        return;
      }
    }
    // Fallback: if no detection and no state selected, pick first available
    if (step === 2 && !selectedState && statesQuery.data?.length) {
      setSelectedState(statesQuery.data[0].code);
    }
  }, [step, address, statesQuery.data]);
  
  // Get counties for selected state
  const countiesQuery = trpc.counties.listCountiesByState.useQuery(
    { state: selectedState },
    { enabled: !!selectedState }
  );

  // Generate form for selected county and tier
  const formQuery = trpc.counties.generateForm.useQuery(
    { countyId: selectedCountyId || 0, tier: filingMethod as "poa" | "pro-se" },
    { enabled: !!selectedCountyId && filingMethod !== "none" }
  );

  // Dynamic county lookup via Serper — fires when no counties found for the selected state
  // and we have a county name from geocoding
  const noCountiesFound =
    !!selectedState &&
    !countiesQuery.isLoading &&
    countiesQuery.data !== undefined &&
    countiesQuery.data.length === 0;

  const dynamicCountyQuery = trpc.counties.lookupDynamic.useQuery(
    { countyName: detectedCountyName || selectedState, state: selectedState },
    {
      enabled: noCountiesFound && !!selectedState,
      staleTime: 1000 * 60 * 30, // Cache for 30 minutes
      retry: false,
    }
  );

  // Pre-submission: create a draft submission to get an ID for photo uploads
  const preMutation = trpc.properties.submitAddress.useMutation({
    onSuccess: (data) => {
      if (data.submissionId) {
        setPhotoSubmissionId(data.submissionId);
        setStep(3); // advance to photo upload step
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit. Please try again.");
    },
  });

  const submitMutation = trpc.properties.submitAddress.useMutation({
    onSuccess: (data) => {
      track(AnalyticsEvent.FormSubmit, {
        submissionId: data.submissionId ?? null,
        filingMethod,
        propertyType,
      });
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
      if (filingMethod !== "none" && !selectedCountyId) {
        toast.error("Please select your county");
        return;
      }
    }
    track(AnalyticsEvent.FormStepComplete, { step });
    setStep((s) => s + 1);
  };

  // Step 2 → Step 3: pre-create submission to get ID for photo uploads
  const handleGoToPhotos = () => {
    if (photoSubmissionId) {
      // Already created, just advance
      setStep(3);
      return;
    }
    preMutation.mutate({ address, email, phone, filingMethod: filingMethod as "poa" | "pro-se" | "none" });
  };

  // Step 3 (photos) → Step 4 (final analysis redirect)
  const handleSubmit = () => {
    if (photoSubmissionId) {
      track(AnalyticsEvent.FormSubmit, {
        submissionId: photoSubmissionId,
        filingMethod,
        propertyType,
      });
      toast.success("Analysis started! Redirecting...");
      navigate(`/analysis?id=${photoSubmissionId}`);
    } else {
      submitMutation.mutate({ address, email, phone, filingMethod: filingMethod as "poa" | "pro-se" | "none" });
    }
  };

  const selectedFiling = FILING_METHODS.find((f) => f.value === filingMethod)!;
  const selectedType = PROPERTY_TYPES.find((t) => t.value === propertyType)!;

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container max-w-2xl">

          {/* Header */}
          <div className="mb-8">
            <span className="gold-rule" />
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-3">
              {step === 1 && "Tell Us About Your Property"}
              {step === 2 && "Your Contact Information"}
              {step === 3 && "Add Property Photos"}
            </h1>
            <p className="text-[#64748B]">
              {step === 1 && "Enter your property address and type for the most accurate analysis."}
              {step === 2 && "We'll send your analysis results and keep you updated on your appeal."}
              {step === 3 && "Photos give our AI visual evidence of your property's condition — a major advantage over the assessor's records."}
            </p>
          </div>

          <StepIndicator current={step} total={3} />

          {/* ─── STEP 1: Property ─── */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Property Address <span className="text-red-500">*</span>
                </label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main St, Austin, TX 78701"
                  onStructuredAddress={(data: StructuredAddress) => {
                    // Auto-detect state and county from geocoded data (more reliable than regex)
                    if (data.stateCode) {
                      setSelectedState(data.stateCode);
                      setSelectedCountyId(null);
                    }
                    if (data.county) {
                      // Strip " County" suffix for cleaner lookup
                      setDetectedCountyName(data.county.replace(/\s*county$/i, "").trim());
                    }
                  }}
                />
                <p className="text-xs text-[#94A3B8] mt-1.5">Include street number, city, state, and ZIP for best results</p>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-3">Property Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPropertyType(type.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        propertyType === type.value
                          ? "border-[#7C3AED] bg-[#7C3AED]/5"
                          : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
                          propertyType === type.value
                            ? "bg-[#0F172A] text-[#7C3AED]"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                          {type.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#0F172A]">{type.label}</div>
                          <div className="text-xs text-[#64748B]">{type.desc}</div>
                        </div>
                        {propertyType === type.value && (
                          <CheckCircle2 size={16} className="text-[#7C3AED] ml-auto shrink-0" />
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
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-base"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-[#94A3B8] mt-1.5">Your analysis report will be sent to this address</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-2">
                  Phone <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7C3AED]" />
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] placeholder-[oklch(0.7_0.02_255)] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-base"
                  />
                </div>
              </div>

              {/* Filing Method */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-3">
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
                          ? "border-[#7C3AED] bg-[#7C3AED]/5"
                          : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                          filingMethod === method.value
                            ? "bg-[#0F172A] text-[#7C3AED]"
                            : "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                          {method.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-[#0F172A]">{method.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${method.badgeColor}`}>
                              {method.badge}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] leading-relaxed">{method.desc}</p>
                          {(method as any).price && (
                            <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                              <div className="text-sm font-bold text-[#0F172A]">{(method as any).price}</div>
                              <div className="text-xs text-[#94A3B8]">{(method as any).priceDesc}</div>
                            </div>
                          )}
                        </div>
                        {filingMethod === method.value && (
                          <CheckCircle2 size={16} className="text-[#7C3AED] shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#94A3B8] mt-2">
                  You can change this after reviewing your analysis. No commitment required.
                </p>
              </div>

              {/* County Selection (if filing) */}
              {filingMethod !== "none" && (
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-3">
                    Select Your County <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* State selector */}
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedCountyId(null);
                        setWaitlistSubmitted(false);
                      }}
                      className="col-span-full px-4 py-3.5 rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent text-base"
                    >
                      {!selectedState && <option value="">Select your state...</option>}
                      {statesQuery.data?.map((state: any) => (
                        <option key={state.code} value={state.code}>
                          {state.name} ({state.code}) — {state.countyCount} {state.countyCount === 1 ? 'county' : 'counties'}
                        </option>
                      ))}
                    </select>

                    {/* County selector */}
                    {countiesQuery.isLoading ? (
                      <div className="col-span-full text-sm text-[#64748B] text-center py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                          Loading counties...
                        </div>
                      </div>
                    ) : countiesQuery.data && countiesQuery.data.length > 0 ? (
                      countiesQuery.data.map((county: any) => (
                        <button
                          key={county.id}
                          type="button"
                          onClick={() => setSelectedCountyId(county.id)}
                          className={`p-3 rounded-lg border-2 text-left transition-all text-sm ${
                            selectedCountyId === county.id
                              ? "border-[#7C3AED] bg-[#7C3AED]/5"
                              : "border-[#E2E8F0] bg-white hover:border-[#7C3AED]/40"
                          }`}
                        >
                          <div className="font-semibold text-[#0F172A]">{county.countyName}</div>
                          <div className="text-xs text-[#64748B] mt-0.5">Filing deadline: {county.poaDeadlineDays} days</div>
                        </button>
                      ))
                    ) : (
                      /* No counties seeded — show dynamic Serper-powered info */
                      <div className="col-span-full space-y-3">
                        {dynamicCountyQuery.isLoading ? (
                          <div className="rounded-lg border-2 border-[#E2E8F0] bg-white p-5 flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-[#0F172A]">Looking up {detectedCountyName || selectedState} county filing info...</p>
                              <p className="text-xs text-[#64748B] mt-0.5">Searching public records and assessor portals</p>
                            </div>
                          </div>
                        ) : dynamicCountyQuery.data ? (
                          <div className="rounded-lg border-2 border-[#7C3AED]/30 bg-[#7C3AED]/5 p-5">
                            <div className="flex items-start gap-3 mb-3">
                              <Zap size={18} className="text-[#7C3AED] shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-sm text-[#0F172A] mb-0.5">
                                  {dynamicCountyQuery.data.countyName} County — Filing Info Found
                                </h4>
                                <p className="text-xs text-[#64748B]">Sourced from public records via AI research</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                              {dynamicCountyQuery.data.appealDeadline && (
                                <div className="bg-white rounded p-3 border border-[#E2E8F0]">
                                  <div className="text-xs text-[#64748B] mb-0.5">Appeal Deadline</div>
                                  <div className="text-sm font-semibold text-[#0F172A]">{dynamicCountyQuery.data.appealDeadline}</div>
                                </div>
                              )}
                              {dynamicCountyQuery.data.filingFee && (
                                <div className="bg-white rounded p-3 border border-[#E2E8F0]">
                                  <div className="text-xs text-[#64748B] mb-0.5">Filing Fee</div>
                                  <div className="text-sm font-semibold text-[#0F172A]">{dynamicCountyQuery.data.filingFee}</div>
                                </div>
                              )}
                              {dynamicCountyQuery.data.assessorPhone && (
                                <div className="bg-white rounded p-3 border border-[#E2E8F0]">
                                  <div className="text-xs text-[#64748B] mb-0.5">Assessor Phone</div>
                                  <div className="text-sm font-semibold text-[#0F172A]">{dynamicCountyQuery.data.assessorPhone}</div>
                                </div>
                              )}
                              {dynamicCountyQuery.data.requiredForms && (
                                <div className="bg-white rounded p-3 border border-[#E2E8F0]">
                                  <div className="text-xs text-[#64748B] mb-0.5">Required Forms</div>
                                  <div className="text-sm font-semibold text-[#0F172A]">{dynamicCountyQuery.data.requiredForms}</div>
                                </div>
                              )}
                            </div>
                            {dynamicCountyQuery.data.portalUrl && (
                              <a
                                href={dynamicCountyQuery.data.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#7C3AED] font-semibold hover:underline mb-3"
                              >
                                <MapPin size={12} /> View Assessor Portal
                              </a>
                            )}
                            {dynamicCountyQuery.data.filingInstructions && (
                              <p className="text-xs text-[#64748B] leading-relaxed border-t border-[#E2E8F0] pt-3">
                                {dynamicCountyQuery.data.filingInstructions}
                              </p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilingMethod("none");
                                  setSelectedCountyId(null);
                                  toast.success("Switched to Analysis Only — full report included.");
                                }}
                                className="px-3 py-1.5 rounded bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9] transition-colors"
                              >
                                Continue with Free Analysis
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Serper lookup failed or returned nothing */
                          <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-5">
                            <div className="flex items-start gap-3">
                              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-sm text-[#0F172A] mb-1">
                                  Filing not yet available in {selectedState}
                                </h4>
                                <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                                  We're actively expanding to new jurisdictions. You can still get your <strong>free AI appraisal analysis</strong> — it works nationwide.
                                </p>
                                {!waitlistSubmitted ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFilingMethod("none");
                                        setSelectedCountyId(null);
                                        toast.success("Switched to Analysis Only — no commitment, full report included.");
                                      }}
                                      className="px-3 py-1.5 rounded bg-[#7C3AED] text-white text-xs font-semibold hover:bg-[#6D28D9] transition-colors"
                                    >
                                      Continue with Free Analysis
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWaitlistSubmitted(true);
                                        toast.success(`You'll be notified when filing opens in ${selectedState}!`);
                                      }}
                                      className="px-3 py-1.5 rounded border border-[#E2E8F0] text-[#64748B] text-xs font-semibold hover:bg-[#F1F5F9] transition-colors flex items-center gap-1"
                                    >
                                      <Clock size={12} /> Notify Me When Available
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-green-700 font-medium">
                                    <CheckCircle2 size={14} />
                                    You're on the waitlist! We'll email you at {email || "your address"} when filing opens.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] transition-colors text-sm font-semibold"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleGoToPhotos}
                  disabled={preMutation.isPending}
                  className="btn-gold flex-1 py-3.5 rounded text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {preMutation.isPending ? (
                    <><div className="w-4 h-4 border-2 border-[#020617] border-t-transparent rounded-full animate-spin" />Saving...</>
                  ) : (
                    <>Add Photos <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Photo Upload ─── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Why photos matter callout */}
              <div className="p-4 rounded-xl bg-[#7C3AED]/8 border border-[#7C3AED]/20 flex items-start gap-3">
                <Shield size={18} className="text-[#7C3AED] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[#0F172A] mb-1">Why photos matter</div>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Assessors typically use outdated or generic photos. Your photos document actual condition — deferred maintenance, functional obsolescence, or damage — that can justify a lower assessed value. They become part of your appraisal report.
                  </p>
                </div>
              </div>

              {/* Photo upload component */}
              {photoSubmissionId && (
                <PhotoUpload
                  submissionId={photoSubmissionId}
                  onPhotosUploaded={(count) => setPhotosUploaded(count)}
                  maxPhotos={12}
                />
              )}

              {/* What happens next */}
              <div className="p-5 rounded-xl bg-[#0F172A]/5 border border-[#0F172A]/10">
                <div className="text-xs font-semibold text-[#0F172A] uppercase tracking-widest mb-3">What Happens Next</div>
                <div className="space-y-2.5">
                  {[
                    "AI queries 4 property data APIs simultaneously",
                    "Your photos are analyzed for condition adjustments",
                    "Comparable sales and market data are analyzed",
                    "LLM generates your personalized appraisal report",
                    "Results ready in 30–60 seconds",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[oklch(0.35_0.04_255)]">
                      <ChevronRight size={14} className="text-[#7C3AED] mt-0.5 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal disclaimer */}
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                By submitting, you agree to our Terms of Service and Privacy Policy.
                AppraiseAI is a software tool; it does not provide legal advice.
                For automated filings, you&apos;ll sign a per-filing scrivener
                authorization before we submit on your behalf.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-5 py-3.5 rounded border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] transition-colors text-sm font-semibold"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-gold flex-1 py-3.5 rounded text-base font-semibold flex items-center justify-center gap-2"
                >
                  <Zap size={18} />
                  {photosUploaded > 0
                    ? `Start Analysis with ${photosUploaded} Photo${photosUploaded !== 1 ? 's' : ''}`
                    : 'Start Analysis (Skip Photos)'}
                </button>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                {["No credit card required", "Results in 30–60 seconds", "Money-back guarantee on filings"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-[#64748B]">
                    <CheckCircle2 size={12} className="text-[#7C3AED]" />
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
            <h2 className="font-display text-3xl font-bold text-[#0F172A] mb-4">Frequently Asked Questions</h2>
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
              <div key={i} className="p-6 rounded-lg bg-white border border-[#E2E8F0]">
                <h3 className="font-display text-base font-semibold text-[#0F172A] mb-2">{faq.q}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
