import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useState } from "react";

export default function PaymentHistory() {
  const { data: payments, isLoading, error } = trpc.payments.getPaymentHistory.useQuery();
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <AlertCircle className="inline mr-2" size={20} />
        Failed to load payment history
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-purple-600 mb-2">Payment History</h2>
        <p className="text-gray-600">
          Track all your flat-fee filing payments and refunds
        </p>
      </div>

      {!payments || payments.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 mb-4">No payments yet</p>
          <p className="text-sm text-gray-500">
            Payments will appear here after you submit an appeal and complete payment
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card
              key={payment.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedPayment(selectedPayment === payment.id ? null : payment.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CreditCard className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </div>
                    <div className="text-sm text-gray-600">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      // Download receipt functionality
                      console.log("Download receipt for payment:", payment.id);
                    }}
                  >
                    <Download size={16} />
                    Receipt
                  </Button>
                </div>
              </div>

              {selectedPayment === payment.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-gray-900">{payment.id}</span>
                  </div>
                  {payment.description && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Description:</span>
                      <span className="text-gray-900">{payment.description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="capitalize font-medium text-gray-900">{payment.status}</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-purple-50 border-purple-200 p-4">
        <h3 className="font-semibold text-purple-900 mb-2">About Our Flat Fee</h3>
        <p className="text-sm text-purple-800">
          AppraiseAI charges a flat software fee by assessed-value tier
          ($79 / $149 / $299). If the county doesn&apos;t reduce your
          assessment after we file, request a refund within 60 days of the
          decision.
        </p>
      </Card>
    </div>
  );
}
