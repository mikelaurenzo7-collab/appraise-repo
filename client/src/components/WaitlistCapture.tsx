/**
 * WaitlistCapture — inline form shown when a user's county isn't supported
 * for automated filing. Captures interest so we can prioritize which
 * counties to onboard next and notify the user when theirs is live.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export interface WaitlistCaptureProps {
  defaultEmail?: string;
  defaultState?: string;
  defaultCountyName?: string;
  submissionId?: number;
  /** Tone for the container — defaults to subtle gray. */
  variant?: "subtle" | "loud";
}

export function WaitlistCapture({
  defaultEmail,
  defaultState,
  defaultCountyName,
  submissionId,
  variant = "subtle",
}: WaitlistCaptureProps) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [state, setState] = useState(defaultState ?? "");
  const [countyName, setCountyName] = useState(defaultCountyName ?? "");
  const [joined, setJoined] = useState(false);

  const joinMutation = trpc.counties.joinWaitlist.useMutation({
    onSuccess: () => {
      setJoined(true);
      toast.success("You're on the list — we'll email when your county is live.");
    },
    onError: (err) => toast.error(err.message || "Could not add you to the waitlist"),
  });

  if (joined) {
    return (
      <div
        className={`rounded-lg p-5 border ${
          variant === "loud"
            ? "border-[#10B981] bg-[#10B981]/10"
            : "border-[#E2E8F0] bg-[#F8FAFC]"
        } flex items-start gap-3`}
      >
        <CheckCircle2 className="text-[#10B981] shrink-0 mt-0.5" size={20} />
        <div>
          <div className="font-semibold text-[#0F172A] mb-1">
            You&apos;re on the waitlist.
          </div>
          <div className="text-sm text-[#64748B]">
            We&apos;ll email {email} the minute {countyName || "your county"} is
            live. In the meantime, you can still download your analysis and the
            pre-filled filing packet from your dashboard.
          </div>
        </div>
      </div>
    );
  }

  const canSubmit = /.+@.+\..+/.test(email) && !joinMutation.isPending;

  return (
    <div
      className={`rounded-lg p-5 border ${
        variant === "loud"
          ? "border-[#7C3AED]/50 bg-[#7C3AED]/5"
          : "border-[#E2E8F0] bg-white"
      } space-y-3`}
    >
      <div>
        <div className="font-semibold text-[#0F172A] mb-1">
          Get notified when we launch here
        </div>
        <p className="text-sm text-[#64748B]">
          Drop your email and we&apos;ll add your county to our priority list.
          Takes about 3 seconds.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="sm:col-span-3 px-3 py-2 bg-white border border-[#E2E8F0] rounded text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
        />
        <input
          type="text"
          value={countyName}
          onChange={(e) => setCountyName(e.target.value)}
          placeholder="County (e.g. Cook County)"
          className="sm:col-span-2 px-3 py-2 bg-white border border-[#E2E8F0] rounded text-sm text-[#0F172A]"
        />
        <input
          type="text"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="ST"
          className="px-3 py-2 bg-white border border-[#E2E8F0] rounded text-sm text-[#0F172A]"
          maxLength={2}
        />
      </div>
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() =>
          joinMutation.mutate({
            email: email.trim(),
            state: state.trim() ? state.trim() : undefined,
            countyName: countyName.trim() ? countyName.trim() : undefined,
            submissionId,
          })
        }
        className="w-full rounded bg-[#7C3AED] text-white font-semibold py-2 disabled:bg-[#C4B5FD] disabled:cursor-not-allowed hover:bg-[#6D28D9] transition-colors text-sm flex items-center justify-center gap-2"
      >
        {joinMutation.isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Joining…
          </>
        ) : (
          "Notify me when ready"
        )}
      </button>
    </div>
  );
}
