import { useState } from "react";
import { ChevronRight, CheckCircle2, FileText, Signature, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: WorkflowStep[] = [
  {
    id: 1,
    title: "Review Analysis",
    description: "Review your appraisal report and appeal strength score",
    icon: <FileText size={24} />,
  },
  {
    id: 2,
    title: "Choose Filing Method",
    description: "Select Power of Attorney or Pro Se filing",
    icon: <AlertCircle size={24} />,
  },
  {
    id: 3,
    title: "Sign Documents",
    description: "Sign required documents electronically",
    icon: <Signature size={24} />,
  },
  {
    id: 4,
    title: "Confirm & Pay",
    description: "Confirm details and complete payment",
    icon: <CheckCircle2 size={24} />,
  },
  {
    id: 5,
    title: "Track Appeal",
    description: "Monitor your appeal status in real-time",
    icon: <Clock size={24} />,
  },
];

interface AppealFilingWorkflowProps {
  submissionId: string;
}

export default function AppealFilingWorkflow({ submissionId }: AppealFilingWorkflowProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const parsedSubmissionId = parseInt(submissionId, 10);
  const submissionIdIsValid = Number.isFinite(parsedSubmissionId) && parsedSubmissionId > 0;

  const detailQuery = trpc.user.getSubmissionDetail.useQuery(
    { submissionId: parsedSubmissionId },
    { enabled: isAuthenticated && submissionIdIsValid, retry: false }
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [filingMethod, setFilingMethod] = useState<"poa" | "pro_se" | null>(null);
  const [documentsSigned, setDocumentsSigned] = useState(false);

  const createCheckoutMutation = trpc.payments.createCheckoutSession.useMutation();

  const submission = detailQuery.data?.submission;
  const propertyAddress = submission
    ? [submission.address, submission.city, submission.state, submission.zipCode].filter(Boolean).join(", ")
    : "";
  const appealStrengthScore = submission?.appealStrengthScore ?? 0;
  // Prefer real potential savings from analysis; fall back to strength-based estimate.
  const estimatedSavings = submission?.potentialSavings && submission.potentialSavings > 0
    ? submission.potentialSavings
    : appealStrengthScore >= 70 ? 5000 : appealStrengthScore >= 40 ? 2500 : 1000;
  const contingencyFee = Math.round(estimatedSavings * 0.25);

  const handleGenerateDocuments = async () => {
    if (!filingMethod) return;
    // Documents are prepared server-side on demand; advance the workflow.
    setCurrentStep(3);
  };

  const handleSignDocuments = () => {
    setDocumentsSigned(true);
    setCurrentStep(4);
  };

  const handleConfirmAndPay = async () => {
    try {
      const response = await createCheckoutMutation.mutateAsync({
        submissionId: parsedSubmissionId,
        annualTaxSavings: estimatedSavings,
      });

      if (response.url) {
        window.open(response.url, "_blank");
      }

      setCurrentStep(5);
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    }
  };

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
          <p className="text-[#CBD5E1] mb-8">You need an account to access the appeal workflow.</p>
          <Link href="/" className="btn-gold px-6 py-3 rounded font-semibold inline-block">Back to Home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!submissionIdIsValid || detailQuery.error || !submission) {
    return (
      <div className="min-h-screen bg-[#0F172A]">
        <Navbar />
        <div className="container py-20 text-center max-w-xl">
          <AlertCircle size={48} className="text-amber-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">We couldn&apos;t load this submission</h1>
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

  return (
    <div className="min-h-screen bg-[#0F172A] py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white mb-2">File Your Appeal</h1>
          <p className="text-[#CBD5E1]">
            {propertyAddress} • Appeal Strength: <span className="font-bold text-[#7C3AED]">{appealStrengthScore}%</span>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all ${
                    currentStep >= step.id
                      ? "bg-[#7C3AED] text-white"
                      : "bg-[#334155] text-[#94A3B8]"
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle2 size={24} /> : step.id}
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

          {/* Step Labels */}
          <div className="grid grid-cols-5 gap-4">
            {steps.map((step) => (
              <div key={step.id} className="text-center">
                <p className="text-sm font-semibold text-white">{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-[#1E293B] border-[#334155] p-8 mb-8">
          {/* Step 1: Review Analysis */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="text-[#7C3AED]" />
                  Review Your Analysis
                </h2>
                <p className="text-[#CBD5E1] mb-6">
                  Your AI-powered appraisal analysis is ready. Review the key findings below before proceeding with your appeal.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                  <p className="text-[#94A3B8] text-sm uppercase font-semibold mb-2">Appeal Strength</p>
                  <p className="text-4xl font-bold text-[#7C3AED]">{appealStrengthScore}%</p>
                  <p className="text-[#CBD5E1] text-sm mt-2">
                    {appealStrengthScore >= 70
                      ? "Strong chance of success"
                      : appealStrengthScore >= 40
                        ? "Moderate appeal potential"
                        : "Weak but worth pursuing"}
                  </p>
                </div>

                <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                  <p className="text-[#94A3B8] text-sm uppercase font-semibold mb-2">Estimated Savings</p>
                  <p className="text-4xl font-bold text-[#10B981]">
                    ${estimatedSavings.toLocaleString()}
                    <span className="text-2xl text-[#94A3B8] font-normal">/yr</span>
                  </p>
                  <p className="text-[#CBD5E1] text-sm mt-2">Potential annual tax savings</p>
                </div>
              </div>

              <div className="bg-[#0D9488]/10 border border-[#0D9488] rounded-lg p-6">
                <p className="text-[#CBD5E1]">
                  Your comprehensive appraisal report includes comparable sales analysis, property valuation, and appeal strategy recommendations. This report will be submitted with your appeal to the local assessor's office.
                </p>
              </div>

              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3"
              >
                Continue to Filing Method <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {/* Step 2: Choose Filing Method */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="text-[#7C3AED]" />
                  Choose Your Filing Method
                </h2>
                <p className="text-[#CBD5E1] mb-6">
                  Select how you'd like to file your appeal. We can represent you or help you file yourself.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Power of Attorney */}
                <div
                  onClick={() => setFilingMethod("poa")}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    filingMethod === "poa"
                      ? "bg-[#7C3AED]/10 border-[#7C3AED]"
                      : "bg-[#0F172A] border-[#334155] hover:border-[#7C3AED]"
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Power of Attorney</h3>
                  <p className="text-[#CBD5E1] text-sm mb-4">
                    We represent you before the assessor's office and at all hearings. You don't need to attend.
                  </p>
                  <ul className="space-y-2 text-sm text-[#CBD5E1]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                      Full legal representation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                      We attend all hearings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                      No win, no fee
                    </li>
                  </ul>
                </div>

                {/* Pro Se Filing */}
                <div
                  onClick={() => setFilingMethod("pro_se")}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                    filingMethod === "pro_se"
                      ? "bg-[#7C3AED]/10 border-[#7C3AED]"
                      : "bg-[#0F172A] border-[#334155] hover:border-[#7C3AED]"
                  }`}
                >
                  <h3 className="text-xl font-bold text-white mb-2">Pro Se Filing</h3>
                  <p className="text-[#CBD5E1] text-sm mb-4">
                    We prepare all documents and coach you through the process. You represent yourself.
                  </p>
                  <ul className="space-y-2 text-sm text-[#CBD5E1]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                      Complete document package
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                      Expert coaching & support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                      You attend hearing
                    </li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={handleGenerateDocuments}
                disabled={!filingMethod}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 disabled:opacity-50"
              >
                Continue to Document Review
                <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {/* Step 3: Sign Documents */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Signature className="text-[#7C3AED]" />
                  Sign Documents
                </h2>
                <p className="text-[#CBD5E1] mb-6">
                  Review and sign the required documents for your {filingMethod === "poa" ? "Power of Attorney" : "Pro Se"} filing.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                  <div className="flex items-start gap-4">
                    <FileText className="text-[#7C3AED] flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">Appraisal Report</h3>
                      <p className="text-[#CBD5E1] text-sm">
                        Your comprehensive 50-60 page professional appraisal report with comparable sales analysis and valuation methodology.
                      </p>
                    </div>
                    <CheckCircle2 size={24} className="text-[#10B981] flex-shrink-0" />
                  </div>
                </div>

                {filingMethod === "poa" && (
                  <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                    <div className="flex items-start gap-4">
                      <Signature className="text-[#7C3AED] flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Power of Attorney Form</h3>
                        <p className="text-[#CBD5E1] text-sm">
                          Legal document authorizing us to represent you before the assessor's office and appeal board.
                        </p>
                      </div>
                      <Button
                        onClick={handleSignDocuments}
                        disabled={documentsSigned}
                        className="flex-shrink-0 bg-[#7C3AED] hover:bg-[#6D28D9]"
                      >
                        {documentsSigned ? "Signed" : "Sign"}
                      </Button>
                    </div>
                  </div>
                )}

                {filingMethod === "pro_se" && (
                  <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155]">
                    <div className="flex items-start gap-4">
                      <FileText className="text-[#7C3AED] flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Pro Se Filing Packet</h3>
                        <p className="text-[#CBD5E1] text-sm">
                          Complete package with all required forms, instructions, and cover letters for your jurisdiction.
                        </p>
                      </div>
                      <Button
                        onClick={handleSignDocuments}
                        disabled={documentsSigned}
                        className="flex-shrink-0 bg-[#7C3AED] hover:bg-[#6D28D9]"
                      >
                        {documentsSigned ? "Reviewed" : "Review"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setCurrentStep(4)}
                disabled={!documentsSigned}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 disabled:opacity-50"
              >
                Continue to Confirmation <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {/* Step 4: Confirm & Pay */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Confirm & Pay</h2>
                <p className="text-[#CBD5E1] mb-6">
                  Review your appeal details and complete payment to file your appeal.
                </p>
              </div>

              <div className="bg-[#0F172A] rounded-lg p-6 border border-[#334155] space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-[#334155]">
                  <span className="text-[#CBD5E1]">Filing Method</span>
                  <span className="font-semibold text-white">
                    {filingMethod === "poa" ? "Power of Attorney" : "Pro Se Filing"}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-[#334155]">
                  <span className="text-[#CBD5E1]">Property</span>
                  <span className="font-semibold text-white">{propertyAddress}</span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-[#334155]">
                  <span className="text-[#CBD5E1]">Appeal Strength</span>
                  <span className="font-semibold text-[#7C3AED]">{appealStrengthScore}%</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-b border-[#334155] pb-4">
                  <span className="text-[#CBD5E1]">Estimated Annual Savings</span>
                  <span className="font-semibold text-[#10B981]">${estimatedSavings.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="text-[#CBD5E1] font-semibold">Contingency Fee (25%)</span>
                  <div className="text-2xl font-bold text-[#FBBF24]">
                    ${contingencyFee.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="bg-[#0D9488]/10 border border-[#0D9488] rounded-lg p-6">
                <p className="text-[#CBD5E1] text-sm">
                  <strong>No win, no fee:</strong> You only pay the contingency fee if we successfully reduce your property tax assessment. If we don't win, you pay nothing.
                </p>
              </div>

              <Button
                onClick={handleConfirmAndPay}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3"
              >
                Proceed to Payment <ChevronRight size={20} />
              </Button>
            </div>
          )}

          {/* Step 5: Track Appeal */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="text-[#10B981]" />
                  Your Appeal is Filed!
                </h2>
                <p className="text-[#CBD5E1] mb-6">
                  Your appeal has been successfully submitted. Track your status below.
                </p>
              </div>

              <div className="bg-[#10B981]/10 border border-[#10B981] rounded-lg p-6">
                <p className="text-[#CBD5E1] mb-4">
                  <strong>What happens next:</strong>
                </p>
                <ul className="space-y-2 text-[#CBD5E1]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={20} className="text-[#10B981] flex-shrink-0 mt-0.5" />
                    <span>Your appeal is submitted to the local assessor's office</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock size={20} className="text-[#FBBF24] flex-shrink-0 mt-0.5" />
                    <span>Appraisal Review Board schedules hearing (typically 30-60 days)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Signature size={20} className="text-[#7C3AED] flex-shrink-0 mt-0.5" />
                    <span>
                      {filingMethod === "poa"
                        ? "We represent you at the hearing"
                        : "You attend the hearing with our coaching"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={20} className="text-[#10B981] flex-shrink-0 mt-0.5" />
                    <span>Decision issued within 30 days of hearing</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#7C3AED]/10 border border-[#7C3AED] rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">Schedule Your Hearing</h3>
                <p className="text-[#CBD5E1] text-sm mb-4">
                  Once the Appraisal Review Board schedules your hearing, you'll receive a notification. You can view and manage your hearing date below.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[#CBD5E1] text-sm font-medium">Preferred Hearing Date</label>
                    <input
                      type="date"
                      className="w-full mt-2 px-4 py-2 bg-[#1E293B] border border-[#7C3AED] rounded text-white"
                      disabled
                      placeholder="Will be assigned by ARB"
                    />
                  </div>
                  <div>
                    <label className="text-[#CBD5E1] text-sm font-medium">Representation</label>
                    <select className="w-full mt-2 px-4 py-2 bg-[#1E293B] border border-[#7C3AED] rounded text-white">
                      <option>{filingMethod === "poa" ? "We represent you" : "You represent yourself (we coach)"}</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3"
              >
                Go to Dashboard <ChevronRight size={20} />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
