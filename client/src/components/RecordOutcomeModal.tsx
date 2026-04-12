/**
 * RecordOutcomeModal — Admin modal to record appeal outcomes
 * Features: Win/loss/settled/withdrawn, original vs final assessment, auto-calculated 25% contingency fee
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Trophy, XCircle, Scale, AlertTriangle, DollarSign, Calendar,
  FileText, X, CheckCircle2, TrendingDown, Loader2
} from "lucide-react";

interface RecordOutcomeModalProps {
  submissionId: number;
  address: string;
  assessedValue?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

const OUTCOME_OPTIONS = [
  { value: "won", label: "Won", icon: <Trophy size={16} />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", activeBg: "bg-emerald-600 text-white border-emerald-600" },
  { value: "settled", label: "Settled", icon: <Scale size={16} />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", activeBg: "bg-blue-600 text-white border-blue-600" },
  { value: "pending-hearing", label: "Pending Hearing", icon: <Calendar size={16} />, color: "text-orange-600", bg: "bg-orange-50 border-orange-200", activeBg: "bg-orange-600 text-white border-orange-600" },
  { value: "lost", label: "Lost", icon: <XCircle size={16} />, color: "text-red-600", bg: "bg-red-50 border-red-200", activeBg: "bg-red-600 text-white border-red-600" },
  { value: "withdrawn", label: "Withdrawn", icon: <AlertTriangle size={16} />, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", activeBg: "bg-gray-600 text-white border-gray-600" },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

export default function RecordOutcomeModal({ submissionId, address, assessedValue, onClose, onSuccess }: RecordOutcomeModalProps) {
  const [outcome, setOutcome] = useState<"won" | "lost" | "settled" | "withdrawn" | "pending-hearing">("won");
  const [originalValue, setOriginalValue] = useState(assessedValue?.toString() || "");
  const [finalValue, setFinalValue] = useState("");
  const [annualSavings, setAnnualSavings] = useState("");
  const [filedAt, setFiledAt] = useState("");
  const [resolvedAt, setResolvedAt] = useState("");
  const [groundsForAppeal, setGroundsForAppeal] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [hearingNotes, setHearingNotes] = useState("");

  const recordMutation = trpc.admin.recordOutcome.useMutation({
    onSuccess: () => {
      toast.success(`Appeal outcome recorded: ${outcome.toUpperCase()}`);
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-calculate reduction
  const origNum = parseFloat(originalValue.replace(/[^0-9.]/g, "")) || 0;
  const finalNum = parseFloat(finalValue.replace(/[^0-9.]/g, "")) || 0;
  const reduction = origNum > 0 && finalNum > 0 ? origNum - finalNum : 0;
  const contingencyFee = annualSavings ? parseFloat(annualSavings.replace(/[^0-9.]/g, "")) * 0.25 : 0;

  const handleSubmit = () => {
    if (!outcome) { toast.error("Please select an outcome"); return; }
    recordMutation.mutate({
      submissionId,
      outcome,
      originalAssessedValue: origNum || undefined,
      finalAssessedValue: finalNum || undefined,
      annualTaxSavings: annualSavings ? parseFloat(annualSavings.replace(/[^0-9.]/g, "")) : undefined,
      filedAt: filedAt || undefined,
      resolvedAt: resolvedAt || undefined,
      groundsForAppeal: groundsForAppeal || undefined,
      adminNotes: adminNotes || undefined,
      hearingNotes: hearingNotes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[oklch(0.18_0.06_255)] px-6 py-4 rounded-t-2xl flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Record Appeal Outcome</h2>
            <p className="text-white/60 text-sm mt-0.5 truncate max-w-sm">{address}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Outcome selector */}
          <div>
            <label className="block text-sm font-semibold text-[oklch(0.18_0.06_255)] mb-3">Appeal Outcome *</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value as typeof outcome)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all text-sm font-semibold ${
                    outcome === opt.value ? opt.activeBg : `${opt.bg} ${opt.color}`
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Assessment values */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Original Assessed Value</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
                <input
                  type="text"
                  placeholder="450,000"
                  value={originalValue}
                  onChange={(e) => setOriginalValue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Final Assessed Value</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
                <input
                  type="text"
                  placeholder="380,000"
                  value={finalValue}
                  onChange={(e) => setFinalValue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]"
                />
              </div>
            </div>
          </div>

          {/* Auto-calculated reduction */}
          {reduction > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <TrendingDown size={18} className="text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-emerald-800">Assessment Reduction: {formatCurrency(reduction)}</div>
                <div className="text-xs text-emerald-600">
                  {origNum > 0 ? `${((reduction / origNum) * 100).toFixed(1)}% reduction from original assessment` : ""}
                </div>
              </div>
            </div>
          )}

          {/* Annual tax savings */}
          <div>
            <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Annual Tax Savings</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.72_0.12_75)]" />
              <input
                type="text"
                placeholder="2,800"
                value={annualSavings}
                onChange={(e) => setAnnualSavings(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]"
              />
            </div>
            {contingencyFee > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[oklch(0.72_0.12_75)] font-semibold">
                <CheckCircle2 size={12} />
                25% contingency fee: {formatCurrency(contingencyFee)} (auto-calculated)
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Filed Date</label>
              <input
                type="date"
                value={filedAt}
                onChange={(e) => setFiledAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Resolved Date</label>
              <input
                type="date"
                value={resolvedAt}
                onChange={(e) => setResolvedAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]"
              />
            </div>
          </div>

          {/* Grounds for appeal */}
          <div>
            <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Grounds for Appeal</label>
            <input
              type="text"
              placeholder="e.g., Overvaluation, Unequal assessment, Incorrect property data"
              value={groundsForAppeal}
              onChange={(e) => setGroundsForAppeal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)]"
            />
          </div>

          {/* Hearing notes */}
          <div>
            <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Hearing Notes</label>
            <textarea
              placeholder="What happened at the hearing? Key arguments, board response, etc."
              value={hearingNotes}
              onChange={(e) => setHearingNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] resize-none"
            />
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-xs font-semibold text-[oklch(0.45_0.04_255)] uppercase tracking-wider mb-1.5">Internal Admin Notes</label>
            <textarea
              placeholder="Internal notes for the team..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-[oklch(0.88_0.015_85)] text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.12_75)] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-lg border border-[oklch(0.88_0.015_85)] text-[oklch(0.45_0.04_255)] hover:bg-[oklch(0.975_0.012_85)] transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={recordMutation.isPending}
              className="flex-1 btn-gold py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {recordMutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" />Saving...</>
              ) : (
                <><FileText size={16} />Record Outcome</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
