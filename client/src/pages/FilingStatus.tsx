/**
 * Filing Status — track POA filings, hearing dates, and appeal outcomes.
 * Sources everything from trpc.user.getFilings so the view stays in sync
 * with whatever an admin records or a webhook posts.
 */

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
  ChevronRight,
  Download,
  Share2,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type SubmissionStatus =
  | "pending"
  | "analyzing"
  | "analyzed"
  | "contacted"
  | "appeal-filed"
  | "hearing-scheduled"
  | "won"
  | "lost"
  | "withdrawn"
  | "archived";

type DeliveryChannel = "portal" | "mail_certified" | "mail_first_class" | "email";

type FilingJobSummary = {
  id: number;
  status: string;
  deliveryChannel: DeliveryChannel | null;
  deliveryStatus: "pending" | "in_transit" | "delivered" | "returned" | "failed" | null;
  portalConfirmationNumber: string | null;
  mailTrackingNumber: string | null;
  lobExpectedDeliveryDate: string | Date | null;
  emailRecipient: string | null;
  completedAt: string | Date | null;
  errorMessage: string | null;
};

type FilingRow = {
  submissionId: number;
  address: string;
  city: string | null;
  state: string | null;
  status: SubmissionStatus;
  filingMethod: "poa" | "pro-se" | "none" | null;
  filedDate: Date | null;
  hearingDate: Date | null;
  hearingLocation: string | null;
  hearingFormat: "in-person" | "virtual" | "mail" | null;
  outcome: "won" | "lost" | "settled" | "withdrawn" | "pending" | null;
  newAssessedValue: number | null;
  assessmentReduction: number | null;
  annualTaxSavings: number | null;
  confirmationNumber: string | null;
  portalUrl: string | null;
  lastUpdated: Date;
  notes: string | null;
  filingJob: FilingJobSummary | null;
};

function channelLabel(c: DeliveryChannel | null | undefined): string {
  switch (c) {
    case "portal":
      return "County online portal";
    case "mail_certified":
      return "USPS Certified Mail + return receipt";
    case "mail_first_class":
      return "USPS First Class Mail + tracking";
    case "email":
      return "Email to county intake";
    default:
      return "—";
  }
}

type DisplayStatus =
  | "not-filed"
  | "filed"
  | "hearing-scheduled"
  | "won"
  | "lost"
  | "withdrawn";

function deriveDisplayStatus(filing: FilingRow): DisplayStatus {
  if (filing.status === "won" || filing.outcome === "won") return "won";
  if (filing.status === "lost" || filing.outcome === "lost") return "lost";
  if (filing.status === "withdrawn" || filing.outcome === "withdrawn") return "withdrawn";
  if (filing.status === "hearing-scheduled" || filing.hearingDate) return "hearing-scheduled";
  if (filing.status === "appeal-filed" || filing.filedDate) return "filed";
  return "not-filed";
}

const STATUS_META: Record<
  DisplayStatus,
  { label: string; badgeClass: string; Icon: typeof Clock }
> = {
  "not-filed": {
    label: "Not yet filed",
    badgeClass: "bg-gray-100 text-gray-800",
    Icon: FileText,
  },
  filed: { label: "Filed", badgeClass: "bg-yellow-100 text-yellow-800", Icon: Clock },
  "hearing-scheduled": {
    label: "Hearing Scheduled",
    badgeClass: "bg-blue-100 text-blue-800",
    Icon: Calendar,
  },
  won: { label: "Appeal Won", badgeClass: "bg-green-100 text-green-800", Icon: CheckCircle2 },
  lost: { label: "Appeal Lost", badgeClass: "bg-red-100 text-red-800", Icon: AlertCircle },
  withdrawn: {
    label: "Withdrawn",
    badgeClass: "bg-slate-100 text-slate-700",
    Icon: AlertCircle,
  },
};

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

export default function FilingStatus() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedFiling, setSelectedFiling] = useState<FilingRow | null>(null);

  const filingsQuery = trpc.user.getFilings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const filings = useMemo<FilingRow[]>(
    () => (filingsQuery.data as FilingRow[] | undefined) ?? [],
    [filingsQuery.data]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <Loader2 className="animate-spin text-[#7C3AED]" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="text-center px-6">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Sign in required</h2>
          <p className="text-[#64748B]">Please log in to view your filing status.</p>
        </div>
      </div>
    );
  }

  const renderShareButton = (filing: FilingRow) => (
    <button
      type="button"
      onClick={() => {
        const url = `${window.location.origin}/analysis?id=${filing.submissionId}`;
        navigator.clipboard?.writeText(url).then(
          () => toast.success("Analysis link copied to clipboard"),
          () => toast.error("Could not copy link")
        );
      }}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#E2E8F0] text-[#0F172A] font-semibold hover:bg-[#F1F5F9] transition-colors"
    >
      <Share2 size={16} />
      Share
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">
            Your Filing Status
          </h1>
          <p className="text-[#64748B]">
            Track your property tax appeals and upcoming hearings
          </p>
        </div>

        <div className="space-y-4">
          {filingsQuery.isLoading ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-10 flex items-center justify-center">
              <Loader2 className="animate-spin text-[#7C3AED]" size={28} />
            </div>
          ) : filingsQuery.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              Could not load filings. Please refresh the page.
            </div>
          ) : filings.length === 0 ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-8 text-center">
              <FileText size={32} className="mx-auto text-[#94A3B8] mb-3" />
              <h3 className="font-semibold text-[#0F172A] mb-1">No filings yet</h3>
              <p className="text-sm text-[#64748B] mb-4">
                Start a new analysis to begin your property tax appeal.
              </p>
              <button
                type="button"
                onClick={() => navigate("/get-started")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors"
              >
                Start a new analysis
              </button>
            </div>
          ) : (
            filings.map((filing) => {
              const display = deriveDisplayStatus(filing);
              const meta = STATUS_META[display];
              const Icon = meta.Icon;
              return (
                <button
                  key={filing.submissionId}
                  onClick={() => setSelectedFiling(filing)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white hover:border-[#7C3AED] hover:shadow-lg transition-all text-left p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${meta.badgeClass}`}
                        >
                          <Icon size={16} />
                        </div>
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        {filing.filingMethod && filing.filingMethod !== "none" && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#EDE9FE] text-[#6D28D9]">
                            {filing.filingMethod === "poa"
                              ? "Power of Attorney"
                              : "Pro Se"}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-[#0F172A] mb-1 truncate">
                        {filing.address}
                      </h3>
                      {(filing.city || filing.state) && (
                        <p className="text-sm text-[#64748B] mb-3">
                          {[filing.city, filing.state].filter(Boolean).join(", ")}
                        </p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                        {filing.filedDate && (
                          <div>
                            <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                              Filed
                            </div>
                            <div className="text-sm font-medium text-[#0F172A]">
                              {formatDate(filing.filedDate)}
                            </div>
                          </div>
                        )}

                        {filing.hearingDate && (
                          <div>
                            <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                              Hearing
                            </div>
                            <div className="text-sm font-medium text-[#0F172A]">
                              {formatDate(filing.hearingDate)}
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

                        {filing.annualTaxSavings && filing.annualTaxSavings > 0 && (
                          <div>
                            <div className="text-xs text-[#94A3B8] uppercase tracking-widest mb-0.5">
                              Annual Savings
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              ${filing.annualTaxSavings.toLocaleString()}/yr
                            </div>
                          </div>
                        )}
                      </div>

                      {filing.notes && (
                        <p className="text-sm text-[#64748B] line-clamp-2">{filing.notes}</p>
                      )}
                    </div>

                    <ChevronRight size={20} className="text-[#94A3B8] shrink-0 mt-1" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedFiling && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-[#0F172A] px-6 py-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">
                  Filing Details
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedFiling(null)}
                  aria-label="Close"
                  className="text-white hover:text-[#7C3AED] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-3">Status</h3>
                  {(() => {
                    const display = deriveDisplayStatus(selectedFiling);
                    const meta = STATUS_META[display];
                    const Icon = meta.Icon;
                    return (
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full ${meta.badgeClass}`}
                      >
                        <Icon size={16} />
                        <span className="font-semibold text-sm">{meta.label}</span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-2">Property</h3>
                  <div className="flex items-start gap-2 text-sm text-[#64748B]">
                    <MapPin size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#0F172A] font-medium">
                        {selectedFiling.address}
                      </div>
                      {(selectedFiling.city || selectedFiling.state) && (
                        <div>
                          {[selectedFiling.city, selectedFiling.state]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#0F172A] mb-3">Timeline</h3>
                  <div className="space-y-3">
                    {selectedFiling.filedDate && (
                      <div className="flex gap-3">
                        <FileText size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-[#0F172A]">
                            Appeal Filed
                          </div>
                          <div className="text-xs text-[#64748B]">
                            {formatDate(selectedFiling.filedDate)}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedFiling.hearingDate && (
                      <div className="flex gap-3">
                        <Calendar size={16} className="text-[#7C3AED] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-[#0F172A]">
                            Hearing Scheduled
                          </div>
                          <div className="text-xs text-[#64748B]">
                            {formatDate(selectedFiling.hearingDate)}
                          </div>
                          {selectedFiling.hearingLocation && (
                            <div className="text-xs text-[#64748B] mt-1">
                              📍 {selectedFiling.hearingLocation}
                              {selectedFiling.hearingFormat
                                ? ` · ${selectedFiling.hearingFormat}`
                                : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!selectedFiling.filedDate && !selectedFiling.hearingDate && (
                      <p className="text-sm text-[#64748B]">
                        No filing activity yet — we'll update this view as milestones
                        occur.
                      </p>
                    )}
                  </div>
                </div>

                {((selectedFiling.assessmentReduction ?? 0) > 0 ||
                  (selectedFiling.annualTaxSavings ?? 0) > 0) && (
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-3">Financial Impact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(selectedFiling.assessmentReduction ?? 0) > 0 && (
                        <div className="rounded-lg bg-green-50 p-4">
                          <div className="text-xs text-[#64748B] uppercase tracking-widest mb-1">
                            Assessment Reduction
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ${selectedFiling.assessmentReduction!.toLocaleString()}
                          </div>
                        </div>
                      )}

                      {(selectedFiling.annualTaxSavings ?? 0) > 0 && (
                        <div className="rounded-lg bg-green-50 p-4">
                          <div className="text-xs text-[#64748B] uppercase tracking-widest mb-1">
                            Annual Tax Savings
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ${selectedFiling.annualTaxSavings!.toLocaleString()}/yr
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedFiling.filingJob && (
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-2">Filing transmission</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[#94A3B8] uppercase tracking-widest text-xs">
                          Channel
                        </span>
                        <div className="text-[#0F172A] font-medium">
                          {channelLabel(selectedFiling.filingJob.deliveryChannel)}
                        </div>
                      </div>
                      {selectedFiling.filingJob.portalConfirmationNumber && (
                        <div>
                          <span className="text-[#94A3B8] uppercase tracking-widest text-xs">
                            Portal confirmation #
                          </span>
                          <div className="font-mono text-[#0F172A]">
                            {selectedFiling.filingJob.portalConfirmationNumber}
                          </div>
                        </div>
                      )}
                      {selectedFiling.filingJob.mailTrackingNumber && (
                        <div>
                          <span className="text-[#94A3B8] uppercase tracking-widest text-xs">
                            USPS tracking
                          </span>
                          <div>
                            <a
                              href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(
                                selectedFiling.filingJob.mailTrackingNumber
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-[#7C3AED] underline"
                            >
                              {selectedFiling.filingJob.mailTrackingNumber}
                            </a>
                            {selectedFiling.filingJob.deliveryStatus && (
                              <span className="ml-2 text-xs text-[#64748B]">
                                · {selectedFiling.filingJob.deliveryStatus.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          {selectedFiling.filingJob.lobExpectedDeliveryDate && (
                            <div className="text-xs text-[#64748B] mt-1">
                              Expected{" "}
                              {new Date(
                                selectedFiling.filingJob.lobExpectedDeliveryDate
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedFiling.filingJob.emailRecipient && (
                        <div>
                          <span className="text-[#94A3B8] uppercase tracking-widest text-xs">
                            Emailed to
                          </span>
                          <div className="font-mono text-[#0F172A]">
                            {selectedFiling.filingJob.emailRecipient}
                          </div>
                        </div>
                      )}
                      {selectedFiling.filingJob.errorMessage && (
                        <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                          {selectedFiling.filingJob.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selectedFiling.confirmationNumber || selectedFiling.portalUrl) && (
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-2">County Records</h3>
                    {selectedFiling.confirmationNumber && (
                      <p className="text-sm text-[#64748B]">
                        Confirmation #:{" "}
                        <span className="font-mono text-[#0F172A]">
                          {selectedFiling.confirmationNumber}
                        </span>
                      </p>
                    )}
                    {selectedFiling.portalUrl && (
                      <a
                        href={selectedFiling.portalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-block text-sm text-[#7C3AED] underline mt-1"
                      >
                        Open county portal →
                      </a>
                    )}
                  </div>
                )}

                {selectedFiling.notes && (
                  <div>
                    <h3 className="font-semibold text-[#0F172A] mb-2">Notes</h3>
                    <p className="text-sm text-[#64748B] whitespace-pre-wrap">
                      {selectedFiling.notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/report?submissionId=${selectedFiling.submissionId}`)
                    }
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#7C3AED] text-white font-semibold hover:bg-[#6D28D9] transition-colors"
                  >
                    <Download size={16} />
                    Download Report
                  </button>
                  {renderShareButton(selectedFiling)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
