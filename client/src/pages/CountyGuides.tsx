import React, { useState } from "react";
import { Search, MapPin } from "lucide-react";
import CountyFilingGuide from "@/components/CountyFilingGuide";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CountyGuidesPage() {
  const [selectedState, setSelectedState] = useState("TX");
  const [selectedCounty, setSelectedCounty] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: counties } = trpc.counties.listCountiesByState.useQuery({
    state: selectedState,
  });

  const { data: guide } = trpc.guides.getCountyGuide.useQuery(
    {
      state: selectedState,
      county: selectedCounty,
    },
    { enabled: !!selectedCounty }
  );

  const states = [
    { code: "TX", name: "Texas" },
    { code: "IL", name: "Illinois" },
    { code: "NJ", name: "New Jersey" },
    { code: "CT", name: "Connecticut" },
    { code: "WI", name: "Wisconsin" },
    { code: "OH", name: "Ohio" },
    { code: "PA", name: "Pennsylvania" },
    { code: "CA", name: "California" },
    { code: "NY", name: "New York" },
    { code: "FL", name: "Florida" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-6 h-6 text-purple-600" />
            <h1 className="text-3xl font-bold text-slate-900">County Filing Guides</h1>
          </div>
          <p className="text-slate-600">
            Find county-specific filing instructions, deadlines, and contact information
          </p>
        </div>

        {/* State Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Select State</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {states.map((state) => (
              <Button
                key={state.code}
                variant={selectedState === state.code ? "default" : "outline"}
                onClick={() => {
                  setSelectedState(state.code);
                  setSelectedCounty("");
                }}
                className="w-full"
              >
                {state.code}
              </Button>
            ))}
          </div>
        </div>

        {/* County Selection */}
        {counties && counties.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select County</h2>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search counties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* County Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {counties
                .filter((c: any) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((county: any) => (
                  <Button
                    key={county.id}
                    variant={selectedCounty === county.slug ? "default" : "outline"}
                    onClick={() => setSelectedCounty(county.slug)}
                    className="justify-start text-left"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">{county.name}</div>
                      <div className="text-xs opacity-75">
                        {county.successRate}% success rate
                      </div>
                    </div>
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Guide Display */}
        {guide && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <CountyFilingGuide county={guide} userState={selectedState} />
          </div>
        )}

        {/* Empty State */}
        {!guide && selectedCounty && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-slate-600">Loading guide...</p>
          </div>
        )}
      </div>
    </div>
  );
}
