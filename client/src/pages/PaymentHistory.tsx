import { useAuth } from "@/_core/hooks/useAuth";
import Footer from "@/components/Footer";
import { ManusLoginButton } from "@/components/ManusLoginButton";
import Navbar from "@/components/Navbar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function PaymentHistory() {
  const { isAuthenticated, loading } = useAuth();
  const { data: payments, isLoading, error, refetch } = trpc.payments.getPaymentHistory.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  if (loading || (isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#7C3AED]" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-4">
            Sign In to View Payment History
          </h1>
          <p className="text-[#64748B] mb-8 max-w-2xl mx-auto">
            Open your Manus-backed workspace to review receipts, successful charges, and every contingency payment tied to your appeals.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <ManusLoginButton
              className="btn-gold px-6 py-3 h-auto rounded font-semibold"
              dialogTitle="Open your payment history"
              dialogDescription="We'll bring you straight back to your payment history after Manus signs you in."
            >
              Continue with Manus
            </ManusLoginButton>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded border border-[#0F172A] text-[#0F172A] font-semibold hover:bg-[#0F172A] hover:text-white transition-colors inline-block"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <div className="container py-20">
          <Card className="max-w-2xl mx-auto p-8 text-center bg-white border border-[#E2E8F0]">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-[#0F172A] mb-3">
              We couldn't load your payments
            </h1>
            <p className="text-[#64748B] mb-6">
              {error.message}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />
      <div className="container py-12 space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold text-[#0F172A] mb-2">Payment History</h1>
          <p className="text-[#64748B] max-w-2xl">
            Review every contingency fee payment tied to your Manus account, including receipt details and payment status.
          </p>
        </div>

        {!payments || payments.length === 0 ? (
          <Card className="p-8 text-center bg-white border border-[#E2E8F0]">
            <CreditCard className="mx-auto mb-4 text-[#94A3B8]" size={48} />
            <p className="text-[#0F172A] font-semibold mb-2">No payments yet</p>
            <p className="text-sm text-[#64748B] max-w-md mx-auto">
              Payments will appear here after you move an appeal into filing and complete checkout.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card
                key={payment.id}
                className="p-4 bg-white border border-[#E2E8F0] hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedPayment(selectedPayment === payment.id ? null : payment.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="p-3 bg-[#EDE9FE] rounded-lg">
                      <CreditCard className="text-[#7C3AED]" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0F172A]">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </div>
                      <div className="text-sm text-[#64748B]">
                        {new Date(payment.created).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {payment.status === "succeeded" ? (
                        <>
                          <CheckCircle2 className="text-green-500" size={20} />
                          <span className="text-sm font-medium text-green-700">Completed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="text-yellow-500" size={20} />
                          <span className="text-sm font-medium text-yellow-700 capitalize">
                            {payment.status}
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!payment.receiptUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (payment.receiptUrl) {
                          window.open(payment.receiptUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <Download size={16} />
                      {payment.receiptUrl ? "Receipt" : "No Receipt"}
                    </Button>
                  </div>
                </div>

                {selectedPayment === payment.id && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#64748B]">Transaction ID:</span>
                      <span className="font-mono text-[#0F172A] break-all text-right">{payment.id}</span>
                    </div>
                    {payment.description && (
                      <div className="flex justify-between gap-4">
                        <span className="text-[#64748B]">Description:</span>
                        <span className="text-[#0F172A] text-right">{payment.description}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-[#64748B]">Status:</span>
                      <span className="capitalize font-medium text-[#0F172A]">{payment.status}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-[#EDE9FE] border-[#DDD6FE] p-4">
          <h3 className="font-semibold text-[#4C1D95] mb-2">About Contingency Fees</h3>
          <p className="text-sm text-[#5B21B6]">
            We charge 25% of your first-year tax savings as our contingency fee. You only pay when we win your appeal and reduce your bill.
          </p>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
