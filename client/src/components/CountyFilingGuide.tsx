/**
 * County Filing Guide Component
 * Dynamic, county-specific filing instructions and deadlines
 * Generates for all 3,000+ US counties
 */

import React from "react";
import { Calendar, MapPin, FileText, Phone, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface CountyGuideData {
  countyName: string;
  state: string;
  stateCode: string;
  fipsCode: string;
  
  // Deadlines
  poaDeadlineDays: number;
  proSeDeadlineDays: number;
  filingWindowStart: string; // MM-DD
  filingWindowEnd: string;   // MM-DD
  
  // Filing Methods
  hasOnlinePortal: boolean;
  portalUrl?: string;
  acceptsEmail: boolean;
  acceptsMail: boolean;
  acceptsInPerson: boolean;
  preferredChannel: "portal" | "mail_certified" | "mail_first_class" | "email";
  
  // Portal Details
  pinOnlyLogin: boolean;
  onlinePortalOnly: boolean;
  
  // Contact Info
  assessorName?: string;
  assessorPhone?: string;
  assessorEmail?: string;
  assessorAddress?: string;
  
  // Pro Se Eligibility
  poaEligible: boolean;
  proSeEligible: boolean;
  
  // Success Metrics
  successRate?: number;
  averageSavings?: number;
  totalAppealsProcessed?: number;
}

interface CountyFilingGuideProps {
  county: CountyGuideData;
  userState?: string;
}

export default function CountyFilingGuide({ county, userState }: CountyFilingGuideProps) {
  const isUserCounty = userState === county.stateCode;
  
  const getDeadlineStatus = (days: number) => {
    if (days <= 30) return { status: "URGENT", color: "text-red-500", bg: "bg-red-50" };
    if (days <= 60) return { status: "APPROACHING", color: "text-yellow-500", bg: "bg-yellow-50" };
    return { status: "NORMAL", color: "text-green-500", bg: "bg-green-50" };
  };

  const poaStatus = getDeadlineStatus(county.poaDeadlineDays || 90);
  const proSeStatus = getDeadlineStatus(county.proSeDeadlineDays || 90);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-6 h-6 text-purple-600" />
          <h1 className="text-3xl font-bold text-slate-900">
            {county.countyName} County, {county.state}
          </h1>
        </div>
        <p className="text-slate-600">
          Complete filing guide for property tax appeals in {county.countyName} County
        </p>
      </div>

      {/* Quick Stats */}
      {county.successRate && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="text-sm text-purple-700 font-semibold">Success Rate</div>
            <div className="text-3xl font-bold text-purple-900">{county.successRate}%</div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
            <div className="text-sm text-teal-700 font-semibold">Avg. Annual Savings</div>
            <div className="text-3xl font-bold text-teal-900">
              ${(county.averageSavings || 0).toLocaleString()}
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <div className="text-sm text-amber-700 font-semibold">Appeals Processed</div>
            <div className="text-3xl font-bold text-amber-900">
              {(county.totalAppealsProcessed || 0).toLocaleString()}
            </div>
          </Card>
        </div>
      )}

      {/* Filing Deadlines */}
      <Card className="p-6 border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold">Filing Deadlines</h2>
        </div>

        <div className="space-y-4">
          {/* POA Deadline */}
          <div className={`p-4 rounded-lg ${poaStatus.bg}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-slate-900">Power of Attorney (POA) Appeal</div>
                <div className="text-sm text-slate-600">Professional representation</div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${poaStatus.color}`}>
                {poaStatus.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4" />
              <span>
                <strong>{county.poaDeadlineDays || 90} days</strong> from assessment notice
              </span>
            </div>
          </div>

          {/* Pro Se Deadline */}
          <div className={`p-4 rounded-lg ${proSeStatus.bg}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-slate-900">Pro Se Appeal</div>
                <div className="text-sm text-slate-600">Self-representation (DIY)</div>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${proSeStatus.color}`}>
                {proSeStatus.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4" />
              <span>
                <strong>{county.proSeDeadlineDays || 90} days</strong> from assessment notice
              </span>
            </div>
          </div>

          {/* Annual Filing Window */}
          {county.filingWindowStart && county.filingWindowEnd && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="font-semibold text-slate-900 mb-2">Annual Filing Window</div>
              <div className="text-sm text-slate-700">
                Appeals accepted: <strong>{county.filingWindowStart} to {county.filingWindowEnd}</strong>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Filing Methods */}
      <Card className="p-6 border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-teal-600" />
          <h2 className="text-xl font-bold">How to File</h2>
        </div>

        <div className="space-y-3">
          {county.hasOnlinePortal && (
            <div className="flex items-start gap-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
              <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Online Portal</div>
                <div className="text-sm text-slate-600 mb-2">File directly through county website</div>
                {county.portalUrl && (
                  <a
                    href={county.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 text-sm font-semibold"
                  >
                    Visit Portal →
                  </a>
                )}
              </div>
            </div>
          )}

          {county.acceptsMail && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900">Mail</div>
                <div className="text-sm text-slate-600">
                  {county.preferredChannel === "mail_certified"
                    ? "Certified mail (recommended)"
                    : "First-class mail"}
                </div>
              </div>
            </div>
          )}

          {county.acceptsEmail && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900">Email</div>
                <div className="text-sm text-slate-600">Electronic submission</div>
              </div>
            </div>
          )}

          {county.acceptsInPerson && (
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-slate-900">In Person</div>
                <div className="text-sm text-slate-600">Submit directly to assessor's office</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Assessor Contact */}
      {county.assessorPhone && (
        <Card className="p-6 border-2 border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-bold">Contact Information</h2>
          </div>

          <div className="space-y-3">
            {county.assessorPhone && (
              <div>
                <div className="text-sm text-slate-600">Phone</div>
                <a href={`tel:${county.assessorPhone}`} className="text-lg font-semibold text-amber-600 hover:text-amber-700">
                  {county.assessorPhone}
                </a>
              </div>
            )}
            {county.assessorEmail && (
              <div>
                <div className="text-sm text-slate-600">Email</div>
                <a href={`mailto:${county.assessorEmail}`} className="text-lg font-semibold text-amber-600 hover:text-amber-700">
                  {county.assessorEmail}
                </a>
              </div>
            )}
            {county.assessorAddress && (
              <div>
                <div className="text-sm text-slate-600">Address</div>
                <div className="text-slate-900">{county.assessorAddress}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Pro Se Eligibility */}
      {!county.proSeEligible && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">Pro Se Not Available</div>
            <div className="text-sm text-amber-800">
              This county requires professional representation. Use POA filing method.
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3">
        <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
          Start Your Appeal
        </Button>
        <Button variant="outline" className="flex-1">
          Download Guide (PDF)
        </Button>
      </div>

      {/* Footer */}
      <div className="text-xs text-slate-500 text-center pt-4 border-t">
        Last updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
