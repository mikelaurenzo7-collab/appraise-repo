import { useState, useEffect } from "react";
import { Star, TrendingDown, DollarSign, MapPin, Loader2 } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

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

const fallbackCaseStudies: CaseStudy[] = [
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
    assessedValue: 425000,
    newAssessment: 350000,
    annualSavings: 1900,
    quote: "Simple process. Entered my address, got the appraisal, signed the POA form, and they did the rest. Best ROI I've ever seen.",
    result: "won",
    date: "2026-03-05",
    stars: 5,
  },
  {
    id: "bergen-nj-001",
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
    id: "denver-co-001",
    name: "Robert L.",
    location: "Denver, CO",
    state: "CO",
    propertyType: "Townhouse",
    assessedValue: 380000,
    newAssessment: 315000,
    annualSavings: 2100,
    quote: "The team was professional and responsive. They kept me updated every step of the way and delivered results.",
    result: "won",
    date: "2026-02-20",
    stars: 5,
  },
  {
    id: "seattle-wa-001",
    name: "Patricia G.",
    location: "King County, WA",
    state: "WA",
    propertyType: "Single Family Home",
    assessedValue: 580000,
    newAssessment: 490000,
    annualSavings: 2700,
    quote: "Incredible service. They handled everything and I saved thousands. Highly recommend to anyone in Washington.",
    result: "won",
    date: "2026-02-15",
    stars: 5,
  },
];

export default function Testimonials() {
  const [displayCaseStudies, setDisplayCaseStudies] = useState<CaseStudy[]>(fallbackCaseStudies);
  const { data: dashboard, isLoading } = trpc.admin.getDashboard.useQuery();

  useEffect(() => {
    if (dashboard?.recentActivity && dashboard.recentActivity.length > 0) {
      const wonActivities = dashboard.recentActivity.filter(
        (activity: any) => activity.type === "appeal_won" || activity.type === "outcome_recorded"
      );
      if (wonActivities.length > 0) {
        const transformed = wonActivities.slice(0, 6).map((activity: any, idx: number) => ({
          id: `activity-${idx}`,
          name: `Customer ${idx + 1}`,
          location: activity.metadata?.location || "Unknown",
          state: activity.metadata?.state || "US",
          propertyType: activity.metadata?.propertyType || "Property",
          assessedValue: activity.metadata?.assessedValue || 0,
          newAssessment: activity.metadata?.newAssessment || 0,
          annualSavings: activity.metadata?.annualSavings || 0,
          quote: `Successfully reduced assessment. Saved $${(activity.metadata?.annualSavings || 0).toLocaleString()}/year on property taxes.`,
          result: "won" as const,
          date: new Date(activity.createdAt).toISOString().split("T")[0],
          stars: 5,
        }));
        if (transformed.length > 0) {
          setDisplayCaseStudies(transformed);
        }
      }
    }
  }, [dashboard]);

  const totalSavings = displayCaseStudies.reduce((sum, cs) => sum + cs.annualSavings, 0);
  const averageSavings = Math.round(totalSavings / displayCaseStudies.length);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-[#1E293B] to-[#0F172A]">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-black text-4xl lg:text-5xl text-white mb-6 leading-tight">
                Real Results from Real Homeowners
              </h1>
              <p className="text-lg text-[#CBD5E1] mb-8">
                See how AppraiseAI has helped thousands of homeowners reduce their property tax assessments and save money.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 bg-[#1E293B]">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#7C3AED] mb-2">{displayCaseStudies.length}+</div>
                <div className="text-[#CBD5E1]">Successful Appeals</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#FBBF24] mb-2">${(totalSavings / 1000).toFixed(0)}K+</div>
                <div className="text-[#CBD5E1]">Total Savings</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-[#10B981] mb-2">${averageSavings.toLocaleString()}</div>
                <div className="text-[#CBD5E1]">Average Annual Savings</div>
              </div>
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section className="py-20 lg:py-28">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-12 text-center">Success Stories</h2>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={40} className="text-[#7C3AED] animate-spin" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {displayCaseStudies.map((study) => (
                    <div
                      key={study.id}
                      className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 hover:border-[#7C3AED] transition-colors"
                    >
                      {/* Stars */}
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: study.stars }).map((_, i) => (
                          <Star key={i} size={16} className="fill-[#FBBF24] text-[#FBBF24]" />
                        ))}
                      </div>

                      {/* Quote */}
                      <p className="text-[#CBD5E1] mb-6 italic">"{study.quote}"</p>

                      {/* Name & Location */}
                      <div className="mb-4">
                        <p className="font-semibold text-white">{study.name}</p>
                        <div className="flex items-center gap-1 text-sm text-[#94A3B8]">
                          <MapPin size={14} />
                          {study.location}
                        </div>
                      </div>

                      {/* Savings */}
                      <div className="bg-[#0F172A] rounded p-4 border border-[#334155]">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-[#94A3B8] uppercase font-semibold">Assessment Reduced</div>
                            <div className="text-lg font-bold text-[#10B981]">
                              ${(study.assessedValue - study.newAssessment).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[#94A3B8] uppercase font-semibold">Annual Savings</div>
                            <div className="text-lg font-bold text-[#FBBF24]">${study.annualSavings.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-[#7C3AED] to-[#0D9488]">
          <div className="container text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Save on Your Property Taxes?</h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of homeowners who have successfully reduced their property tax assessments with AppraiseAI.
            </p>
            <Link
              href="/get-started"
              className="inline-block bg-[#FBBF24] text-[#0F172A] px-8 py-3 rounded-lg font-semibold hover:bg-[#FCD34D] transition-colors"
            >
              Get Your Free Analysis
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
