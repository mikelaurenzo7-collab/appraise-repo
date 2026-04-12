/**
 * State Deadline Calendar
 * Shows all 50 states with appeal deadlines, success rates, and filing procedures.
 * Designed for SEO and conversion — helps users understand urgency.
 */

import { useState } from "react";
import { Link } from "wouter";
import {
  Calendar, Clock, MapPin, TrendingDown, ChevronRight, Search,
  AlertTriangle, CheckCircle2, ArrowRight, Building2, Scale, Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface StateData {
  code: string;
  name: string;
  deadlineType: "from_notice" | "calendar_year" | "fiscal_year" | "annual";
  deadlineDays: number;
  deadlineDescription: string;
  successRate: number;
  avgSavings: number;
  filingFee: number;
  hearingType: "informal" | "formal" | "both";
  poaAllowed: boolean;
  notes: string;
  urgency: "high" | "medium" | "low";
}

const stateData: StateData[] = [
  { code: "TX", name: "Texas", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice (May 15 default)", successRate: 55, avgSavings: 3200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Highest volume state. ARB hearings are informal and owner-friendly.", urgency: "high" },
  { code: "CA", name: "California", deadlineType: "calendar_year", deadlineDays: 60, deadlineDescription: "July 2 – September 15 annually", successRate: 42, avgSavings: 4800, filingFee: 0, hearingType: "formal", poaAllowed: true, notes: "Prop 13 limits increases. Assessment appeals focus on decline-in-value.", urgency: "medium" },
  { code: "IL", name: "Illinois", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice", successRate: 48, avgSavings: 2900, filingFee: 0, hearingType: "formal", poaAllowed: true, notes: "Cook County has separate PTAB process. Formal appraisals strongly recommended.", urgency: "high" },
  { code: "NJ", name: "New Jersey", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "April 1 annually (or 45 days from notice)", successRate: 52, avgSavings: 5100, filingFee: 25, hearingType: "formal", poaAllowed: true, notes: "Highest property taxes in US. Certified appraisals almost always required.", urgency: "high" },
  { code: "NY", name: "New York", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "March 1 in NYC; varies by county", successRate: 44, avgSavings: 4200, filingFee: 0, hearingType: "formal", poaAllowed: true, notes: "NYC has TAX Commission. Upstate counties vary significantly.", urgency: "high" },
  { code: "FL", name: "Florida", deadlineType: "from_notice", deadlineDays: 25, deadlineDescription: "25 days from TRIM notice (August)", successRate: 38, avgSavings: 2100, filingFee: 15, hearingType: "formal", poaAllowed: true, notes: "VAB hearings are formal. Homestead exemption must be filed separately.", urgency: "high" },
  { code: "PA", name: "Pennsylvania", deadlineType: "calendar_year", deadlineDays: 60, deadlineDescription: "August 1 annually (varies by county)", successRate: 46, avgSavings: 2400, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Philadelphia has separate OPA process. County-by-county variation is significant.", urgency: "medium" },
  { code: "OH", name: "Ohio", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "April 1 annually", successRate: 50, avgSavings: 1800, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "BOR hearings are informal and accessible. Strong success rate for residential.", urgency: "medium" },
  { code: "MI", name: "Michigan", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "May 31 annually (MTT: July 31)", successRate: 47, avgSavings: 2200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Two-track system: local BOR and Michigan Tax Tribunal. MTT is more powerful.", urgency: "medium" },
  { code: "GA", name: "Georgia", deadlineType: "from_notice", deadlineDays: 45, deadlineDescription: "45 days from assessment notice", successRate: 41, avgSavings: 1900, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "BOE hearings first, then Superior Court. Arbitration available for large reductions.", urgency: "medium" },
  { code: "NC", name: "North Carolina", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "May 1 annually (revaluation years)", successRate: 39, avgSavings: 1600, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Revaluations every 4-8 years. Best time to appeal is revaluation year.", urgency: "low" },
  { code: "VA", name: "Virginia", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "April 1 – May 31 annually", successRate: 36, avgSavings: 2800, filingFee: 0, hearingType: "formal", poaAllowed: true, notes: "Northern Virginia has highest property values. Formal appraisals recommended.", urgency: "medium" },
  { code: "WA", name: "Washington", deadlineType: "from_notice", deadlineDays: 60, deadlineDescription: "60 days from assessment notice", successRate: 40, avgSavings: 3100, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "King County has highest volume. Board of Equalization hearings are accessible.", urgency: "medium" },
  { code: "AZ", name: "Arizona", deadlineType: "calendar_year", deadlineDays: 60, deadlineDescription: "April 30 annually (Maricopa: 60 days from notice)", successRate: 45, avgSavings: 2000, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Maricopa County is high-volume. State Board of Equalization for large properties.", urgency: "medium" },
  { code: "CO", name: "Colorado", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice (June 1)", successRate: 43, avgSavings: 2600, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Odd-year reappraisals. Denver metro has highest appeal volume.", urgency: "high" },
  { code: "MA", name: "Massachusetts", deadlineType: "from_notice", deadlineDays: 90, deadlineDescription: "February 1 annually (3 years after assessment)", successRate: 37, avgSavings: 3400, filingFee: 0, hearingType: "formal", poaAllowed: true, notes: "Appellate Tax Board is formal. Three-year window for residential appeals.", urgency: "low" },
  { code: "MD", name: "Maryland", deadlineType: "from_notice", deadlineDays: 45, deadlineDescription: "45 days from assessment notice", successRate: 42, avgSavings: 2700, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Three-year assessment cycle. SDAT hearings are informal and accessible.", urgency: "medium" },
  { code: "MN", name: "Minnesota", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "April 30 annually (local BOE)", successRate: 44, avgSavings: 2000, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Local Board of Appeal first, then Tax Court. Residential success rate is solid.", urgency: "medium" },
  { code: "WI", name: "Wisconsin", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "May 1 – June 15 annually (BOE meeting)", successRate: 41, avgSavings: 1700, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Must appear at local BOE. Circuit Court appeal available after BOE.", urgency: "medium" },
  { code: "MO", name: "Missouri", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "July 10 annually (BOE)", successRate: 46, avgSavings: 1500, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Odd-year reassessments. State Tax Commission for large commercial properties.", urgency: "medium" },
  { code: "TN", name: "Tennessee", deadlineType: "from_notice", deadlineDays: 45, deadlineDescription: "45 days from assessment notice", successRate: 38, avgSavings: 1400, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County assessor first, then State Board of Equalization.", urgency: "medium" },
  { code: "IN", name: "Indiana", deadlineType: "from_notice", deadlineDays: 45, deadlineDescription: "45 days from assessment notice", successRate: 40, avgSavings: 1300, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "PTABOA hearings are accessible. Indiana Tax Court for larger disputes.", urgency: "medium" },
  { code: "KY", name: "Kentucky", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "May 1 – June 1 annually", successRate: 39, avgSavings: 1200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County PVA first, then KBTA. Louisville/Jefferson County has highest volume.", urgency: "low" },
  { code: "SC", name: "South Carolina", deadlineType: "from_notice", deadlineDays: 90, deadlineDescription: "90 days from assessment notice", successRate: 37, avgSavings: 1500, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Quinquennial reassessments. County assessor informal review first.", urgency: "low" },
  { code: "AL", name: "Alabama", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "January 1 – February 28 annually", successRate: 35, avgSavings: 1100, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Alabama has relatively low property taxes.", urgency: "medium" },
  { code: "LA", name: "Louisiana", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "August 1 – September 15 annually", successRate: 36, avgSavings: 1300, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Parish assessors. Louisiana Tax Commission for unresolved disputes.", urgency: "medium" },
  { code: "OK", name: "Oklahoma", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "January 1 – March 1 annually", successRate: 38, avgSavings: 1200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Oklahoma Tax Commission for larger disputes.", urgency: "medium" },
  { code: "AR", name: "Arkansas", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "August 1 – September 1 annually", successRate: 34, avgSavings: 900, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Arkansas has relatively low property taxes.", urgency: "low" },
  { code: "MS", name: "Mississippi", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "April 1 – April 30 annually", successRate: 33, avgSavings: 800, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Supervisors. Mississippi has lowest property taxes in US.", urgency: "low" },
  { code: "IA", name: "Iowa", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "April 2 – April 30 annually", successRate: 40, avgSavings: 1400, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Local Board of Review first. Property Assessment Appeal Board for unresolved.", urgency: "medium" },
  { code: "KS", name: "Kansas", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice", successRate: 39, avgSavings: 1300, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Appraiser informal first, then COTA. Kansas has fair appeal process.", urgency: "medium" },
  { code: "NE", name: "Nebraska", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "June 1 – June 30 annually", successRate: 38, avgSavings: 1400, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Nebraska Tax Equalization and Review Commission.", urgency: "medium" },
  { code: "SD", name: "South Dakota", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "April 1 – April 30 annually", successRate: 35, avgSavings: 1000, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. South Dakota has no income tax.", urgency: "low" },
  { code: "ND", name: "North Dakota", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "April 1 – May 1 annually", successRate: 34, avgSavings: 900, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Local Board of Equalization. North Dakota has relatively low property taxes.", urgency: "low" },
  { code: "MT", name: "Montana", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice", successRate: 37, avgSavings: 1100, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Montana Tax Appeal Board. Informal review with DOR first.", urgency: "medium" },
  { code: "WY", name: "Wyoming", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "June 1 – July 15 annually", successRate: 36, avgSavings: 1200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Wyoming has no income tax.", urgency: "low" },
  { code: "ID", name: "Idaho", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "June 1 – June 30 annually", successRate: 38, avgSavings: 1500, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Idaho has seen rapid appreciation.", urgency: "medium" },
  { code: "NV", name: "Nevada", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "January 15 annually (or 30 days from notice)", successRate: 41, avgSavings: 2200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Assessor first, then State Board of Equalization.", urgency: "medium" },
  { code: "UT", name: "Utah", deadlineType: "from_notice", deadlineDays: 45, deadlineDescription: "September 15 annually (or 45 days from notice)", successRate: 40, avgSavings: 1900, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Equalization. Utah Tax Commission for unresolved.", urgency: "medium" },
  { code: "NM", name: "New Mexico", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "April 1 – May 1 annually", successRate: 37, avgSavings: 1300, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Assessor protest first. Valuation Protests Board for unresolved.", urgency: "medium" },
  { code: "OR", name: "Oregon", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "December 31 annually (Magistrate Division)", successRate: 39, avgSavings: 2400, filingFee: 265, hearingType: "formal", poaAllowed: true, notes: "Oregon Tax Court Magistrate Division. Formal process but accessible.", urgency: "low" },
  { code: "HI", name: "Hawaii", deadlineType: "calendar_year", deadlineDays: 30, deadlineDescription: "January 15 – February 1 annually", successRate: 35, avgSavings: 3800, filingFee: 0, hearingType: "formal", poaAllowed: true, notes: "Board of Review. Hawaii has highest property values but lower tax rates.", urgency: "medium" },
  { code: "AK", name: "Alaska", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice", successRate: 33, avgSavings: 2100, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Borough/city assessors. No statewide property tax.", urgency: "low" },
  { code: "ME", name: "Maine", deadlineType: "calendar_year", deadlineDays: 185, deadlineDescription: "185 days after tax commitment", successRate: 36, avgSavings: 1600, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Board of Assessment Review. Maine has long appeal window.", urgency: "low" },
  { code: "NH", name: "New Hampshire", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "September 1 annually", successRate: 38, avgSavings: 2200, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Board of Tax and Land Appeals. NH has no income or sales tax.", urgency: "low" },
  { code: "VT", name: "Vermont", deadlineType: "from_notice", deadlineDays: 90, deadlineDescription: "90 days from grand list filing", successRate: 35, avgSavings: 1800, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Board of Civil Authority first. Vermont Environmental Court for unresolved.", urgency: "low" },
  { code: "RI", name: "Rhode Island", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "December 31 annually", successRate: 37, avgSavings: 2000, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Local Board of Assessment Review. Superior Court for unresolved.", urgency: "low" },
  { code: "CT", name: "Connecticut", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "February 20 annually (Board of Assessment Appeals)", successRate: 40, avgSavings: 2600, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "Board of Assessment Appeals first. Superior Court for larger disputes.", urgency: "medium" },
  { code: "DE", name: "Delaware", deadlineType: "from_notice", deadlineDays: 30, deadlineDescription: "30 days from assessment notice", successRate: 38, avgSavings: 1500, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Board of Assessment Review. Delaware has no sales tax.", urgency: "medium" },
  { code: "WV", name: "West Virginia", deadlineType: "calendar_year", deadlineDays: 90, deadlineDescription: "February 1 – March 31 annually", successRate: 34, avgSavings: 900, filingFee: 0, hearingType: "both", poaAllowed: true, notes: "County Commission sitting as Board of Equalization.", urgency: "low" },
];

function UrgencyBadge({ urgency }: { urgency: "high" | "medium" | "low" }) {
  const map = {
    high: { label: "High Priority", classes: "bg-red-100 text-red-700" },
    medium: { label: "Medium", classes: "bg-yellow-100 text-yellow-700" },
    low: { label: "Low", classes: "bg-green-100 text-green-700" },
  };
  const s = map[urgency];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.classes}`}>{s.label}</span>;
}

export default function DeadlineCalendar() {
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"name" | "successRate" | "avgSavings" | "deadlineDays">("name");

  const filtered = stateData
    .filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
      const matchesUrgency = urgencyFilter === "all" || s.urgency === urgencyFilter;
      return matchesSearch && matchesUrgency;
    })
    .sort((a, b) => {
      if (sortBy === "successRate") return b.successRate - a.successRate;
      if (sortBy === "avgSavings") return b.avgSavings - a.avgSavings;
      if (sortBy === "deadlineDays") return a.deadlineDays - b.deadlineDays;
      return a.name.localeCompare(b.name);
    });

  const highPriorityCount = stateData.filter((s) => s.urgency === "high").length;
  const avgSuccessRate = Math.round(stateData.reduce((sum, s) => sum + s.successRate, 0) / stateData.length);
  const avgSavings = Math.round(stateData.reduce((sum, s) => sum + s.avgSavings, 0) / stateData.length);

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.012_85)]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[oklch(0.18_0.06_255)] pt-28 pb-16">
        <div className="container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[oklch(0.72_0.12_75)]/40 bg-[oklch(0.72_0.12_75)]/10 text-[oklch(0.72_0.12_75)] text-xs font-semibold uppercase tracking-widest mb-6">
              <Calendar size={12} />
              Nationwide Appeal Deadlines
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Property Tax Appeal<br />
              <span className="text-[oklch(0.72_0.12_75)] italic">Deadline Calendar</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-2xl">
              Every state has different appeal windows, procedures, and success rates. Missing your deadline means waiting another year. Know your state's rules — and let AppraiseAI handle the filing.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              {[
                { label: "States Covered", value: "All 50" },
                { label: "Avg. Success Rate", value: `${avgSuccessRate}%` },
                { label: "Avg. Annual Savings", value: `$${avgSavings.toLocaleString()}` },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-lg border border-white/10 bg-white/5 text-center">
                  <div className="font-data text-2xl font-bold text-[oklch(0.72_0.12_75)]">{s.value}</div>
                  <div className="text-xs text-white/50 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Alert Banner */}
      <div className="bg-red-600 py-3">
        <div className="container flex items-center gap-3">
          <AlertTriangle size={16} className="text-white shrink-0" />
          <p className="text-white text-sm font-medium">
            <strong>{highPriorityCount} states</strong> have high-urgency deadlines. Missing your window means waiting 12 months for the next cycle.
          </p>
          <Link href="/get-started" className="ml-auto shrink-0 bg-white text-red-600 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-red-50 transition-colors">
            File Now →
          </Link>
        </div>
      </div>

      {/* Filters */}
      <section className="py-8 border-b border-[oklch(0.88_0.015_85)] bg-white">
        <div className="container flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0.04_255)]" />
            <input
              type="text"
              placeholder="Search state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]/30 focus:border-[oklch(0.72_0.12_75)]"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "high", "medium", "low"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUrgencyFilter(u)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  urgencyFilter === u
                    ? "bg-[oklch(0.18_0.06_255)] text-white"
                    : "bg-[oklch(0.94_0.018_85)] text-[oklch(0.45_0.04_255)] hover:bg-[oklch(0.88_0.015_85)]"
                }`}
              >
                {u === "all" ? "All States" : `${u} priority`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[oklch(0.55_0.04_255)]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-[oklch(0.88_0.015_85)] rounded px-2 py-1.5 focus:outline-none"
            >
              <option value="name">State Name</option>
              <option value="successRate">Success Rate</option>
              <option value="avgSavings">Avg. Savings</option>
              <option value="deadlineDays">Deadline (Shortest First)</option>
            </select>
          </div>
        </div>
      </section>

      {/* State Grid */}
      <section className="py-12">
        <div className="container">
          <p className="text-sm text-[oklch(0.55_0.04_255)] mb-6">
            Showing {filtered.length} of {stateData.length} states
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((state) => (
              <div
                key={state.code}
                className={`rounded-xl bg-white border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                  state.urgency === "high" ? "border-red-200" : "border-[oklch(0.88_0.015_85)]"
                }`}
              >
                {/* Card Header */}
                <div className={`px-5 py-4 flex items-start justify-between ${
                  state.urgency === "high" ? "bg-red-50" : "bg-[oklch(0.975_0.012_85)]"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[oklch(0.18_0.06_255)] flex items-center justify-center">
                      <span className="font-data text-xs font-bold text-[oklch(0.72_0.12_75)]">{state.code}</span>
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold text-[oklch(0.18_0.06_255)]">{state.name}</h3>
                      <UrgencyBadge urgency={state.urgency} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-data text-lg font-bold text-[oklch(0.72_0.12_75)]">{state.successRate}%</div>
                    <div className="text-xs text-[oklch(0.55_0.04_255)]">win rate</div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="text-[oklch(0.72_0.12_75)] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[oklch(0.18_0.06_255)]">Deadline</div>
                      <div className="text-xs text-[oklch(0.45_0.04_255)]">{state.deadlineDescription}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <TrendingDown size={14} className="text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[oklch(0.18_0.06_255)]">Avg. Annual Savings</div>
                      <div className="text-xs text-green-600 font-semibold">${state.avgSavings.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Scale size={14} className="text-[oklch(0.55_0.04_255)] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[oklch(0.18_0.06_255)]">Hearing Type</div>
                      <div className="text-xs text-[oklch(0.45_0.04_255)] capitalize">{state.hearingType} · {state.poaAllowed ? "POA allowed" : "Pro se only"}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-[oklch(0.55_0.04_255)] mt-0.5 shrink-0" />
                    <div className="text-xs text-[oklch(0.55_0.04_255)] leading-relaxed">{state.notes}</div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-[oklch(0.92_0.01_255)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.04_255)]">
                    <CheckCircle2 size={12} className="text-[oklch(0.72_0.12_75)]" />
                    {state.filingFee === 0 ? "No filing fee" : `$${state.filingFee} filing fee`}
                  </div>
                  <Link
                    href="/get-started"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.18_0.06_255)] hover:text-[oklch(0.72_0.12_75)] transition-colors"
                  >
                    File in {state.code} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[oklch(0.18_0.06_255)] py-16">
        <div className="container text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Don't Miss Your Window
          </h2>
          <p className="text-white/70 mb-8">
            Enter your address now. AppraiseAI will identify your state's deadline, analyze your property, and file your appeal before time runs out.
          </p>
          <Link
            href="/get-started"
            className="btn-gold inline-flex items-center gap-2 px-8 py-4 rounded text-base font-semibold"
          >
            Get My Free Analysis <ArrowRight size={18} />
          </Link>
          <p className="text-white/40 text-xs mt-4">No credit card · Results in seconds · Licensed in all 50 states</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
