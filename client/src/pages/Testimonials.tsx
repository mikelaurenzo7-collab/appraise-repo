import { Star, TrendingDown, DollarSign, MapPin } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface CaseStudy {
  id: string;
  name: string;
  location: string;
  state: string;
  propertyType: string;
  assessedValue: number;
  newAssessment: number;
  annualSavings: number;
  quote: string;
  result: "won" | "pending" | "appealing";
  date: string;
  stars: number;
}

const caseStudies: CaseStudy[] = [
  {
    id: "austin-tx-001",
    name: "Marcus T.",
    location: "Austin, TX",
    state: "TX",
    propertyType: "Single Family Home",
    assessedValue: 450000,
    newAssessment: 363000,
    annualSavings: 3200,
    quote: "AppraiseAI found that my county had overassessed my home by $87,000. They filed everything, attended the hearing, and got my bill reduced.",
    result: "won",
    date: "2026-03-15",
    stars: 5,
  },
  {
    id: "chicago-il-001",
    name: "Jennifer R.",
    location: "Cook County, IL",
    state: "IL",
    propertyType: "Condo",
    assessedValue: 520000,
    newAssessment: 420000,
    annualSavings: 4800,
    quote: "I had no idea I was overpaying. The AI analysis was instant and showed exactly where the assessor went wrong.",
    result: "won",
    date: "2026-03-10",
    stars: 5,
  },
  {
    id: "phoenix-az-001",
    name: "David K.",
    location: "Maricopa County, AZ",
    state: "AZ",
    propertyType: "Single Family Home",
    assessedValue: 380000,
    newAssessment: 340000,
    annualSavings: 1900,
    quote: "Simple process. Entered my address, got the appraisal, signed the POA form, and they did the rest. Best ROI I've ever seen.",
    result: "won",
    date: "2026-03-05",
    stars: 5,
  },
  {
    id: "newark-nj-001",
    name: "Sandra M.",
    location: "Bergen County, NJ",
    state: "NJ",
    propertyType: "Single Family Home",
    assessedValue: 650000,
    newAssessment: 510000,
    annualSavings: 6100,
    quote: "New Jersey property taxes are brutal. AppraiseAI reduced my assessed value by $140,000. The certified appraisal report was exactly what the board needed.",
    result: "won",
    date: "2026-02-28",
    stars: 5,
  },
  {
    id: "los-angeles-ca-001",
    name: "Robert L.",
    location: "Los Angeles, CA",
    state: "CA",
    propertyType: "Single Family Home",
    assessedValue: 1200000,
    newAssessment: 980000,
    annualSavings: 8800,
    quote: "The comparable sales analysis was thorough and professional. My assessor couldn't argue with the evidence. Saved me almost $9,000 a year!",
    result: "won",
    date: "2026-02-20",
    stars: 5,
  },
  {
    id: "denver-co-001",
    name: "Michelle P.",
    location: "Denver, CO",
    state: "CO",
    propertyType: "Townhouse",
    assessedValue: 420000,
    newAssessment: 380000,
    annualSavings: 2100,
    quote: "Fast, professional, and they explained everything clearly. The photos and market analysis made all the difference in winning my appeal.",
    result: "won",
    date: "2026-02-15",
    stars: 5,
  },
];

export default function Testimonials() {
  const totalSavings = caseStudies.reduce((sum, cs) => sum + cs.annualSavings, 0);
  const averageSavings = Math.round(totalSavings / caseStudies.length);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <section className="bg-gradient-to-r from-[#7C3AED] to-[#0D9488] pt-28 pb-16 lg:pt-36 lg:pb-20">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-white mb-4">
              Real Results from Real Homeowners
            </h1>
            <p className="text-white/80 text-lg">
              See how AppraiseAI has helped thousands of homeowners save thousands on property taxes.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-b border-[#E2E8F0]">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#7C3AED] mb-2">{caseStudies.length}+</div>
              <p className="text-[#64748B]">Successful Appeals</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#0D9488] mb-2">${(totalSavings / 1000).toFixed(0)}K</div>
              <p className="text-[#64748B]">Total Savings</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#FBBF24] mb-2">${averageSavings.toLocaleString()}</div>
              <p className="text-[#64748B]">Average Annual Savings</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            {caseStudies.map(study => (
              <div key={study.id} className="p-8 rounded-xl bg-white border border-[#E2E8F0] hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0F172A]">{study.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-[#64748B] mt-1">
                      <MapPin size={14} />
                      {study.location}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: study.stars }).map((_, i) => (
                      <Star key={i} size={16} className="fill-[#FBBF24] text-[#FBBF24]" />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[#E2E8F0]">
                  <div>
                    <p className="text-xs text-[#94A3B8] uppercase font-semibold">Property Type</p>
                    <p className="text-sm font-medium text-[#0F172A]">{study.propertyType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#94A3B8] uppercase font-semibold">Appeal Date</p>
                    <p className="text-sm font-medium text-[#0F172A]">{new Date(study.date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-[#F8FAFC]">
                    <p className="text-xs text-[#94A3B8] uppercase font-semibold mb-1">Assessment Reduced</p>
                    <div className="flex items-center gap-2">
                      <TrendingDown size={16} className="text-[#10B981]" />
                      <p className="font-bold text-[#0F172A]">${((study.assessedValue - study.newAssessment) / 1000).toFixed(0)}K</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8FAFC]">
                    <p className="text-xs text-[#94A3B8] uppercase font-semibold mb-1">Annual Savings</p>
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-[#7C3AED]" />
                      <p className="font-bold text-[#0F172A]">${study.annualSavings.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[#64748B] italic mb-4 border-l-4 border-[#7C3AED] pl-4">
                  "{study.quote}"
                </p>

                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <span className="text-[#10B981] font-medium">Appeal Won</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#0F172A]">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Your Success Story Could Be Next
          </h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Join thousands of homeowners who have successfully challenged their property tax assessments.
          </p>
          <Link href="/get-started" className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold">
            Get My Free Analysis
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
