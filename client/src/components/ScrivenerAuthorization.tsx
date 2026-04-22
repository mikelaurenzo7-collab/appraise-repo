/**
 * ScrivenerAuthorization — legally meaningful consent capture.
 *
 * Replaces the prior `setDocumentsSigned(true)` sham with an actual record
 * the user explicitly approved. Captures:
 *
 *   - the exact authorization text shown (so the server can hash-match)
 *   - a typed name acting as a signature
 *   - whether the user scrolled through the entire text (proof of review)
 *   - IP + user agent are captured server-side from the request
 *
 * This is a per-submission authorization, not a POA. We are not acting as
 * the user's legal representative; we're a software tool that submits a
 * form the user has reviewed and approved.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface ScrivenerAuthorizationProps {
  submissionId: number;
  onAuthorized: (authorizationId: number) => void;
}

export function ScrivenerAuthorization({
  submissionId,
  onAuthorized,
}: ScrivenerAuthorizationProps) {
  const textQuery = trpc.filings.getAuthorizationText.useQuery();
  const authorizeMutation = trpc.filings.authorize.useMutation({
    onSuccess: (result) => {
      toast.success("Authorization recorded");
      onAuthorized(result.id);
    },
    onError: (err) => {
      toast.error(err.message || "Could not record authorization");
    },
  });

  const [typedName, setTypedName] = useState("");
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      // allow a small buffer for rounding
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 16) {
        setScrolledToEnd(true);
      }
    };
    el.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [textQuery.data?.text]);

  const canSign =
    scrolledToEnd && typedName.trim().length >= 2 && !authorizeMutation.isPending;

  if (textQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="animate-spin text-[#7C3AED]" size={24} />
      </div>
    );
  }

  if (!textQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load authorization text.
      </div>
    );
  }

  const handleSign = () => {
    if (!textQuery.data) return;
    authorizeMutation.mutate({
      submissionId,
      typedName: typedName.trim(),
      authorizationText: textQuery.data.text,
      scrolledToEnd,
    });
  };

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="text-[#7C3AED]" size={20} />
        <h2 className="font-display text-lg font-bold text-[#0F172A]">
          Authorize this filing
        </h2>
      </div>
      <p className="text-sm text-[#64748B] mb-4">
        Please read the full authorization below, then type your legal name to
        sign. You must reach the end of the text before signing.
      </p>

      <div
        ref={scrollContainerRef}
        className="max-h-56 overflow-y-auto rounded border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#334155] whitespace-pre-wrap mb-4"
      >
        {textQuery.data.text}
      </div>

      {!scrolledToEnd && (
        <p className="text-xs text-[#94A3B8] mb-3">
          ↓ Scroll to the bottom of the authorization to continue.
        </p>
      )}

      <label className="block text-sm font-medium text-[#0F172A] mb-1">
        Type your full legal name
      </label>
      <input
        type="text"
        value={typedName}
        onChange={(e) => setTypedName(e.target.value)}
        className="w-full rounded border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] mb-4"
        placeholder="e.g. Jane Homeowner"
        autoComplete="off"
      />

      <button
        type="button"
        onClick={handleSign}
        disabled={!canSign}
        className="w-full rounded bg-[#7C3AED] text-white font-semibold py-2 disabled:bg-[#C4B5FD] disabled:cursor-not-allowed hover:bg-[#6D28D9] transition-colors"
      >
        {authorizeMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Recording authorization…
          </span>
        ) : (
          `Sign and authorize as ${typedName.trim() || "…"}`
        )}
      </button>

      <p className="text-xs text-[#94A3B8] mt-3 text-center">
        We log your IP, browser, and a hash of this exact text so both parties
        can prove what you signed.
      </p>
    </div>
  );
}
