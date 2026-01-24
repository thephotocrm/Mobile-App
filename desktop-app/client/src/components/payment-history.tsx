import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Receipt, CreditCard, CheckCircle2 } from "lucide-react";

interface PaymentTransaction {
  id: string;
  amountCents: number;
  tipCents: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  metadata?: {
    paymentType?: string;
  };
}

interface PaymentHistoryProps {
  token: string;
}

export function PaymentHistory({ token }: PaymentHistoryProps) {
  const { data, isLoading } = useQuery<{ transactions: PaymentTransaction[] }>({
    queryKey: [`/api/public/smart-files/${token}/payment-history`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-5 h-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.transactions || data.transactions.length === 0) {
    return null;
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="w-5 h-5" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.transactions.map((transaction) => {
            const totalAmount = transaction.amountCents;
            const baseAmount =
              transaction.amountCents - (transaction.tipCents || 0);
            const paymentType = transaction.metadata?.paymentType || "PAYMENT";

            return (
              <div
                key={transaction.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                data-testid={`payment-transaction-${transaction.id}`}
              >
                <div className="mt-0.5">
                  {transaction.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p
                        className="font-medium text-sm"
                        data-testid={`text-transaction-type-${transaction.id}`}
                      >
                        {paymentType === "DEPOSIT"
                          ? "Deposit Payment"
                          : paymentType === "BALANCE"
                            ? "Balance Payment"
                            : paymentType === "FULL"
                              ? "Full Payment"
                              : "Payment"}
                      </p>
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid={`text-transaction-date-${transaction.id}`}
                      >
                        {formatDistanceToNow(new Date(transaction.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="font-semibold text-sm"
                        data-testid={`text-transaction-amount-${transaction.id}`}
                      >
                        {formatPrice(totalAmount)}
                      </p>
                      {transaction.tipCents > 0 && (
                        <p className="text-xs text-muted-foreground">
                          (includes {formatPrice(transaction.tipCents)} tip)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {transaction.paymentMethod.toLowerCase()}
                    </span>
                    <span>•</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {transaction.status.charAt(0) +
                        transaction.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
