/**
 * Filing Status — Track POA filings, hearing dates, and appeal outcomes
 * Shows real-time status of user's property tax appeals
 */

import { useState } from "react";
import { useLocation } from "wouter";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  TrendingDown,
  ChevronRight,
  Download,
  Share2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface FilingStatus {
  id: number;
  submissionId: number;
  status: "pending" | "filed" | "hearing_scheduled" | "won" | "lost" | "appeal_denied";
  filedDate?: string;
  hearingDate?: string;
  hearingLocation?: string;
  assessmentReduction?: number;
  estimatedSavings?: number;
  notes?: string;
  lastUpdated: string;
}

export default function FilingStatus() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedFiling, setSelectedFiling] = useState<FilingStatus | null>(null);

  // Mock data for filing status
  // In production, this would query trpc.properties.getUserSubmissions

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Sign in required</h2>
          <p className="text-[#64748B]">Please log in to view your filing status</p>
        </div>
      </div>
    );
  }

  const filings: FilingStatus[] = [
    {
      id: 1,
      submissionId: 1,
      status: "hearing_scheduled",
      filedDate: "2026-03-15",
      hearingDate: "2026-05-20",
      hearingLocation: "Travis County ARB, Austin, TX",
      assessmentReduction: 87000,
      estimatedSavings: 2175,
      notes: "Hearing scheduled with ARB. Evidence package submitted.",
      lastUpdated: "2026-04-21",
    },
    {
      id: 2,
      submissionId: 2,
      status: "filed",
      filedDate: "2026-04-10",
      assessmentReduction: 0,
      estimatedSavings: 0,
      notes: "Appeal filed with county assessor. Awaiting review.",
      lastUpdated: "2026-04-21",
    },
    {
      id: 3,
      submissionId: 3,
      status: "won",
      filedDate: "2026-02-01",
      hearingDate: "2026-04-15",
      assessmentReduction: 125000,
      estimatedSavings: 3125,
      notes: "Appeal successful! Assessment reduced by $125,000.",
      lastUpdated: "2026-04-15",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won":
        return "bg-green-100 text-green-800";
      case "hearing_scheduled":
        return "bg-blue-100 text-blue-800";
      case "filed":
        return "bg-yellow-100 text-yellow-800";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won":
        return <CheckCircle2 size={16} />;
      case "hearing_scheduled":
        return <Calendar size={16} />;
      case "filed":
        return <Clock size={16} />;
      case "lost":
        return <AlertCircle size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "won":
        return "Appeal Won";
      case "hearing_scheduled":
        return "Hearing Scheduled";
      case "filed":
        return "Filed";
      case "lost":
        return "Appeal Lost";
      case "appeal_denied":
        return "Appeal Denied";
      default:
        return "Pending";
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
            Your Filing Status
          </h1>
          <p className="text-[#64748B]">
            Track your property tax appeals and upcoming hearings
          </p>
        </div>

        {/* Filings List */}
        <div className="space-y-4">
          {filings.length === 0 ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center">
              <FileText size={32} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="font-semibold text-[#0F172A] mb-1">No filings yet</h3>
              <p className="text-sm text-[#64748B]">
                Start a new analysis to begin your property tax appeal
              </p>
            </div>
          ) : (
            filings.map((filing) => (
              <button
                key={filing.id}
                onClick={() => setSelectedFiling(filing)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white hover:border-[#7C3AED] hover:shadow-lg transition-all text-left p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(filing.status)}`}>
                        {getStatusIcon(filing.status)}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(filing.status)}`}>
                        {getStatusLabel(filing.status)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[#0F172A] mb-2">
                      Property Appeal #{filing.submissionId}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                      {filing.filedDate && (
                        <div>
                          <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                            Filed
                          </div>
                          <div className="text-sm font-medium text-[#0F172A]">
                            {new Date(filing.filedDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {filing.hearingDate && (
                        <div>
                          <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                            Hearing
                          </div>
                          <div className="text-sm font-medium text-[#0F172A]">
                            {new Date(filing.hearingDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      {filing.assessmentReduction && filing.assessmentReduction > 0 && (
                        <div>
                          <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                            Reduction
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            ${filing.assessmentReduction.toLocaleString()}
                          </div>
                        </div>
                      )}

                      {filing.estimatedSavings && filing.estimatedSavings > 0 && (
                        <div>
                          <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                            Annual Savings
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            ${filing.estimatedSavings.toLocaleString()}/yr
                          </div>
                        </div>
                      )}
                    </div>

                    {filing.notes && (
                      <p className="text-sm text-[#64748B]">{filing.notes}</p>
                    )}
                  </div>

                  <ChevronRight size={20} className="text-[#94A3B8] shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Modal */}
        {selectedFiling && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-[#0F172A] px-6 py-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">
                  Filing Details
                </h2>
                <button
                  onClick={() => setSelectedFiling(null)}
                  className="text-white hover:text-[#7C3AED] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-3">Status</h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${getStatusColor(selectedFiling.status)}`}>
                    {getStatusIcon(selectedFiling.status)}
                    <span className="font-semibold text-sm">
                      {getStatusLabel(selectedFiling.status)}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-3">Timeline</h3>
                  <div className="space-y-3">
                    {selectedFiling.filedDate && (
                      <div className="flex gap-3">
                        <FileText size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-[#0F172A]">Appeal Filed</div>
                          <div className="text-xs text-[#64748B]">
                            {new Date(selectedFiling.filedDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFiling.hearingDate && (
                      <div className="flex gap-3">
                        <Calendar size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-[#0F172A]">Hearing Scheduled</div>
                          <div className="text-xs text-[#64748B]">
                            {new Date(selectedFiling.hearingDate).toLocaleDateString()}
                          </div>
                          {selectedFiling.hearingLocation && (
                            <div className="text-xs text-[#64748B] mt-1">
                              📍 {selectedFiling.hearingLocation}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Impact */}
                {(selectedFiling.assessmentReduction && selectedFiling.assessmentReduction > 0 || selectedFiling.estimatedSavings && selectedFiling.estimatedSavings > 0) && (
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-3">Financial Impact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedFiling.assessmentReduction && selectedFiling.assessmentReduction > 0 && (
                        <div className="rounded-lg bg-green-50 p-4">
                          <div className="text-xs text-[#64748B] uppercase tracking-widest mb-1">
                            Assessment Reduction
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ${selectedFiling.assessmentReduction.toLocaleString()}
                          </div>
                        </div>
                      )}

                      {selectedFiling.estimatedSavings && selectedFiling.estimatedSavings > 0 && (
                        <div className="rounded-lg bg-green-50 p-4">
                          <div className="text-xs text-[#64748B] uppercase tracking-widest mb-1">
                            Annual Tax Savings
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ${selectedFiling.estimatedSavings.toLocaleString()}/yr
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedFiling.notes && (
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-2">Notes</h3>
                    <p className="text-sm text-[#64748B]">{selectedFiling.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors">
                    <Download size={16} />
                    Download Report
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#E2E8F0] text-[#0F172A] font-semibold hover:bg-[#F1F5F9] transition-colors">
                    <Share2 size={16} />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
