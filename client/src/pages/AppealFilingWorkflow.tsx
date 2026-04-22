/**
 * AppealFilingWorkflow — pro-se automated filing flow.
 *
 * Six steps:
 *   1. Review analysis
 *   2. Confirm county eligibility for automated filing (or fall back to
 *      guided mail-in)
 *   3. Provide taxpayer details the recipe needs (PIN / account number)
 *   4. Scrivener authorization (records consent)
 *   5. Flat-fee checkout (Stripe)
 *   6. Track automated filing status (polls filings.getJobStatus)
 */

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ScrivenerAuthorization } from "@/components/ScrivenerAuthorization";
import { WaitlistCapture } from "@/components/WaitlistCapture";
import { toast } from "sonner";

interface WorkflowStep {
  id: number;
  title: string;
}

const steps: WorkflowStep[] = [
  { id: 1, title: "Review" },
  { id: 2, title: "Eligibility" },
  { id: 3, title: "Taxpayer details" },
  { id: 4, title: "Authorize" },
  { id: 5, title: "Pay" },
  { id: 6, title: "File" },
];

interface AppealFilingWorkflowProps {
  submissionId: string;
}

export default function AppealFilingWorkflow({ submissionId }: AppealFilingWorkflowProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const parsedSubmissionId = parseInt(submissionId, 10);
  const valid = Number.isFinite(parsedSubmissionId) && parsedSubmissionId > 0;

  const detailQuery = trpc.user.getSubmissionDetail.useQuery(
    { submissionId: parsedSubmissionId },
    { enabled: isAuthenticated && valid, retry: false }
  );
  const submission = detailQuery.data?.submission;

  // County is recorded on the submission as a free-text field, but the
  // filing pipeline needs a numeric countyId. We surface this state so the
  // UI can ask the user to pick their county explicitly.
  const statesQuery = trpc.counties.getHighImpactStates.useQuery();
  const [selectedState, setSelectedState] = useState<string>("");
  const countiesQuery = trpc.counties.listCountiesByState.useQuery(
    { state: selectedState },
    { enabled: selectedState.length === 2 }
  );
  const [selectedCountyId, setSelectedCountyId] = useState<number | null>(null);

  const eligibilityQuery = trpc.filings.checkEligibility.useQuery(
    { submissionId: parsedSubmissionId, countyId: selectedCountyId ?? 0 },
    { enabled: valid && selectedCountyId !== null }
  );

  const [taxpayerPin, setTaxpayerPin] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");

  const [authorizationId, setAuthorizationId] = useState<number | null>(null);
  const [filingJobId, setFilingJobId] = useState<number | null>(null);

  const createCheckoutMutation = trpc.payments.createCheckoutSession.useMutation();
  const submitFilingMutation = trpc.filings.submit.useMutation({
    onSuccess: (result) => {
      setFilingJobId(result.jobId);
      setCurrentStep(6);
    },
    onError: (err) => toast.error(err.message || "Could not submit filing"),
  });

  const jobStatusQuery = trpc.filings.getJobStatus.useQuery(
    { jobId: filingJobId ?? 0 },
    {
      enabled: filingJobId !== null,
      refetchInterval: 5_000,
    }
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [paid, setPaid] = useState(false);

  const propertyAddress = useMemo(() => {
    if (!submission) return "";
    return [submission.address, submission.city, submission.state, submission.zipCode]
      .filter(Boolean)
      .join(", ");
  }, [submission]);

  const appealStrength = submission?.appealStrengthScore ?? 0;
  const potentialSavings = submission?.potentialSavings ?? null;

  // Detect the ?payment=success redirect-back from Stripe so we advance
  // past the checkout step automatically.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPaid(true);
      setCurrentStep(6);
    }
  }, []);

  if (authLoading || (isAuthenticated && detailQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#7C3AED]" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <Navbar />
        <div className="container py-20 text-center max-w-xl">
          <h1 className="text-3xl font-bold text-white mb-4">Sign in to file your appeal</h1>
          <p className="text-[#CBD5E1] mb-8">
            You need an account to file your appeal.
          </p>
          <Link href="/" className="btn-gold px-6 py-3 rounded font-semibold inline-block">
            Back to Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!valid || detailQuery.error || !submission) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <Navbar />
        <div className="container py-20 text-center max-w-xl">
          <AlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">
            We couldn&apos;t load this submission
          </h1>
          <p className="text-[#CBD5E1] mb-6">
            {detailQuery.error?.message ||
              "That submission ID isn't valid or you don't have access to it."}
          </p>
          <Link href="/dashboard" className="btn-gold px-6 py-3 rounded font-semibold inline-block">
            Go to Dashboard
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const eligibility = eligibilityQuery.data;
  const ineligibleReasons = eligibility?.reasonsIneligible ?? [];
  const canAutomate = ineligibleReasons.length === 0;

  const handlePay = async () => {
    try {
      const result = await createCheckoutMutation.mutateAsync({
        submissionId: parsedSubmissionId,
      });
      if (result.url) window.open(result.url, "_blank");
    } catch (err) {
      toast.error("Could not start checkout");
    }
  };

  const handleSubmitFiling = () => {
    if (!authorizationId || !selectedCountyId) return;
    submitFilingMutation.mutate({
      submissionId: parsedSubmissionId,
      countyId: selectedCountyId,
      authorizationId,
      inputs: {
        taxpayerPin: taxpayerPin.trim(),
        accountNumber: accountNumber.trim(),
        ownerName: ownerName.trim() || undefined,
      } as Record<string, string | number | null>,
    });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] py-12">
      <div className="container max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-2">File your appeal</h1>
          <p className="text-[#CBD5E1]">
            {propertyAddress} • Appeal strength:{" "}
            <span className="font-bold text-[#7C3AED]">{appealStrength}%</span>
          </p>
        </div>

        <div className="mb-10 flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                  currentStep >= step.id
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#334155] text-[#94A3B8]"
                }`}
                title={step.title}
              >
                {currentStep > step.id ? <CheckCircle2 size={18} /> : step.id}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded ${
                    currentStep > step.id ? "bg-[#7C3AED]" : "bg-[#334155]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-[#1E293B] border-[#334155] p-8 mb-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="text-[#7C3AED]" />
                Review your analysis
              </h2>
              <p className="text-[#CBD5E1]">
                Our data shows the gap between your assessment and market value.
                We translate this into an appeal form the county portal accepts.
                This page does not provide legal advice about your specific case.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                  <p className="text-[#94A3B8] text-sm uppercase font-semibold mb-2">
                    Appeal strength
                  </p>
                  <p className="text-4xl font-bold text-[#7C3AED]">{appealStrength}%</p>
                  <p className="text-[#CBD5E1] text-sm mt-2">
                    {appealStrength >= 70
                      ? "Strong data basis for an appeal"
                      : appealStrength >= 40
                        ? "Moderate data basis"
                        : "Weak data basis — appeal still possible but less certain"}
                  </p>
                </div>

                <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                  <p className="text-[#94A3B8] text-sm uppercase font-semibold mb-2">
                    Estimated annual savings
                  </p>
                  <p className="text-4xl font-bold text-[#10B981]">
                    {potentialSavings ? `$${potentialSavings.toLocaleString()}` : "—"}
                  </p>
                  <p className="text-[#CBD5E1] text-sm mt-2">
                    Estimate only. Actual savings depend on the county decision.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3"
              >
                Continue <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-[#7C3AED]" />
                Is your county eligible for automated filing?
              </h2>
              <p className="text-[#CBD5E1]">
                We automate the filing directly through your county&apos;s online
                portal. If your county isn&apos;t supported yet, we&apos;ll give you
                a ready-to-mail pro-se packet instead.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#CBD5E1] mb-1 block">State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedCountyId(null);
                    }}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-white"
                  >
                    <option value="">Select state…</option>
                    {(statesQuery.data ?? []).map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#CBD5E1] mb-1 block">County</label>
                  <select
                    value={selectedCountyId ?? ""}
                    onChange={(e) =>
                      setSelectedCountyId(e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={!selectedState}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-white disabled:opacity-40"
                  >
                    <option value="">Select county…</option>
                    {(countiesQuery.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.countyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {eligibilityQuery.isLoading && selectedCountyId && (
                <div className="flex items-center gap-2 text-[#CBD5E1] text-sm">
                  <Loader2 className="animate-spin" size={14} /> Checking eligibility…
                </div>
              )}

              {eligibility && canAutomate && (
                <div className="bg-[#10B981]/10 border border-[#10B981] rounded-lg p-4 text-[#CBD5E1] text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="text-[#10B981] shrink-0 mt-0.5" size={18} />
                    <div>
                      {(() => {
                        const channel = (eligibility as any).selectedChannel as
                          | "portal"
                          | "mail_certified"
                          | "mail_first_class"
                          | "email"
                          | "unsupported"
                          | undefined;
                        if (channel === "portal") {
                          return (
                            <>
                              <strong>Automated portal filing.</strong> We&apos;ll
                              submit through your county&apos;s online portal using
                              the taxpayer PIN you provide. You&apos;ll get a
                              county confirmation number the same day.
                              {eligibility.portalUrl && (
                                <>
                                  {" "}
                                  <a
                                    href={eligibility.portalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline inline-flex items-center gap-1"
                                  >
                                    Portal <ExternalLink size={12} />
                                  </a>
                                </>
                              )}
                            </>
                          );
                        }
                        if (channel === "mail_certified") {
                          return (
                            <>
                              <strong>Certified mail with return receipt.</strong>{" "}
                              We print your appeal packet and mail it certified
                              via USPS. You get a tracking number, and the county
                              signs for delivery. Arrives within 3–5 business days.
                            </>
                          );
                        }
                        if (channel === "mail_first_class") {
                          return (
                            <>
                              <strong>First Class mail with tracking.</strong> We
                              print your appeal packet and mail it via USPS. You
                              get a tracking number. Arrives within 3–5 business
                              days.
                            </>
                          );
                        }
                        if (channel === "email") {
                          return (
                            <>
                              <strong>Email delivery.</strong> Your county accepts
                              emailed appeal filings as equivalent to mailed ones.
                              We&apos;ll send the packet to their official intake
                              address and cc you.
                            </>
                          );
                        }
                        return <>This county is supported.</>;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {eligibility && !canAutomate && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-400 rounded-lg p-4 text-[#CBD5E1] text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="mb-2 font-semibold">
                          Automated filing isn&apos;t available yet for this county:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          {ineligibleReasons.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                        <p className="mt-3">
                          We&apos;ll instead generate a pro-se filing packet you can
                          print, sign, and mail. Head to your{" "}
                          <Link href="/dashboard" className="underline">
                            dashboard
                          </Link>{" "}
                          to download it.
                        </p>
                      </div>
                    </div>
                  </div>
                  <WaitlistCapture
                    defaultEmail={submission?.email ?? ""}
                    defaultState={selectedState || submission?.state || ""}
                    defaultCountyName={
                      (selectedCountyId &&
                        countiesQuery.data?.find((c) => c.id === selectedCountyId)
                          ?.countyName) ||
                      submission?.county ||
                      ""
                    }
                    submissionId={parsedSubmissionId}
                    variant="loud"
                  />
                </div>
              )}

              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canAutomate}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 disabled:opacity-50"
              >
                Continue <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">
                Taxpayer details for your county portal
              </h2>
              <p className="text-[#CBD5E1] text-sm">
                Your county&apos;s online filing portal needs a few identifiers from
                your assessment notice. These are used once, for this filing only,
                and are wiped from our system once the filing completes.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#CBD5E1] mb-1 block">
                    Taxpayer PIN (from assessment notice)
                  </label>
                  <input
                    type="text"
                    value={taxpayerPin}
                    onChange={(e) => setTaxpayerPin(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-white"
                    autoComplete="off"
                    placeholder="e.g. 8F3-291-442"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#CBD5E1] mb-1 block">
                    Property account number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-white"
                    autoComplete="off"
                    placeholder="e.g. R000123456"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#CBD5E1] mb-1 block">
                    Full legal name of owner (optional, defaults to your email handle)
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded text-white"
                    autoComplete="off"
                  />
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep(4)}
                disabled={taxpayerPin.trim().length < 3 || accountNumber.trim().length < 3}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 disabled:opacity-50"
              >
                Continue <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Authorize this filing</h2>
              <ScrivenerAuthorization
                submissionId={parsedSubmissionId}
                onAuthorized={(id) => {
                  setAuthorizationId(id);
                  setCurrentStep(5);
                }}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Pay filing fee</h2>
              <p className="text-[#CBD5E1] text-sm">
                Flat-fee pricing based on your property&apos;s assessed value.
                60-day money-back guarantee if your appeal doesn&apos;t reduce
                your assessment.
              </p>

              <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                <p className="text-[#CBD5E1] text-sm mb-2">
                  Click pay to open secure checkout in a new tab. Come back here
                  afterwards — we&apos;ll detect the success redirect and start
                  the filing automatically.
                </p>
              </div>

              {!paid ? (
                <Button
                  onClick={handlePay}
                  disabled={createCheckoutMutation.isPending}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3"
                >
                  {createCheckoutMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={16} /> Opening checkout…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Pay filing fee <ChevronRight size={18} />
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitFiling}
                  disabled={submitFilingMutation.isPending || !authorizationId}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3"
                >
                  {submitFilingMutation.isPending
                    ? "Submitting filing…"
                    : "Submit automated filing"}
                </Button>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="text-[#10B981]" />
                Filing in progress
              </h2>
              {!filingJobId && paid && (
                <Button
                  onClick={handleSubmitFiling}
                  disabled={submitFilingMutation.isPending || !authorizationId}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3"
                >
                  {submitFilingMutation.isPending
                    ? "Submitting filing…"
                    : "Submit automated filing"}
                </Button>
              )}

              {filingJobId && (
                <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155] space-y-3">
                  <p className="text-[#CBD5E1] text-sm">
                    Filing job #{filingJobId}
                  </p>
                  <p className="text-white font-semibold">
                    Status:{" "}
                    <span className="text-[#7C3AED] capitalize">
                      {jobStatusQuery.data?.status ?? "pending"}
                    </span>
                  </p>
                  {jobStatusQuery.data?.deliveryChannel && (
                    <p className="text-[#CBD5E1] text-sm">
                      Delivered via:{" "}
                      <span className="text-white font-medium">
                        {jobStatusQuery.data.deliveryChannel === "portal"
                          ? "County online portal"
                          : jobStatusQuery.data.deliveryChannel === "mail_certified"
                            ? "USPS Certified Mail + return receipt"
                            : jobStatusQuery.data.deliveryChannel === "mail_first_class"
                              ? "USPS First Class Mail + tracking"
                              : "Email to county intake address"}
                      </span>
                    </p>
                  )}
                  {jobStatusQuery.data?.portalConfirmationNumber && (
                    <p className="text-[#10B981] text-sm">
                      Portal confirmation:{" "}
                      <span className="font-mono">
                        {jobStatusQuery.data.portalConfirmationNumber}
                      </span>
                    </p>
                  )}
                  {jobStatusQuery.data?.mailTrackingNumber && (
                    <p className="text-[#10B981] text-sm">
                      USPS tracking:{" "}
                      <a
                        href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${jobStatusQuery.data.mailTrackingNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono underline"
                      >
                        {jobStatusQuery.data.mailTrackingNumber}
                      </a>
                      {jobStatusQuery.data.lobExpectedDeliveryDate && (
                        <span className="text-[#94A3B8]">
                          {" · expected "}
                          {new Date(
                            jobStatusQuery.data.lobExpectedDeliveryDate
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  )}
                  {jobStatusQuery.data?.emailMessageId && (
                    <p className="text-[#10B981] text-sm">
                      Emailed to{" "}
                      <span className="font-mono">
                        {jobStatusQuery.data.emailRecipient}
                      </span>
                      <span className="text-[#94A3B8]"> · message id{" "}</span>
                      <span className="font-mono text-xs">
                        {jobStatusQuery.data.emailMessageId}
                      </span>
                    </p>
                  )}
                  {jobStatusQuery.data?.errorMessage && (
                    <p className="text-red-400 text-sm">
                      {jobStatusQuery.data.errorMessage}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3"
              >
                Go to dashboard <ChevronRight size={20} />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
