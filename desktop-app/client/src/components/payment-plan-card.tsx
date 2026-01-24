import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PaymentInstallment } from "@shared/paymentScheduleUtils";

interface PaymentScheduleResponse {
  schedule: PaymentInstallment[];
  nextInstallment: PaymentInstallment | null;
  summary: {
    totalCents: number;
    totalPaidCents: number;
    totalRemainingCents: number;
    paidCount: number;
    totalCount: number;
    percentComplete: number;
    status: string;
    isFullyPaid: boolean;
  };
  transactions: Array<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: string;
    stripePaymentIntentId?: string;
  }>;
  config: any;
}

interface PaymentPlanCardProps {
  token: string;
  onPaymentClick?: (
    installment: PaymentInstallment,
    clientSecret: string,
  ) => void;
  compact?: boolean;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function getStatusBadge(status: string, dueDate: string) {
  const date = new Date(dueDate);
  const isOverdue = isPast(date) && !isToday(date) && status !== "PAID";
  const isDueToday = isToday(date) && status !== "PAID";
  const daysUntil = differenceInDays(date, new Date());

  if (status === "PAID") {
    return (
      <Badge
        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
        data-testid="badge-paid"
      >
        Paid
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge
        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
        data-testid="badge-partial"
      >
        Partial
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge variant="destructive" data-testid="badge-overdue">
        Overdue
      </Badge>
    );
  }
  if (isDueToday) {
    return (
      <Badge
        className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
        data-testid="badge-due-today"
      >
        Due Today
      </Badge>
    );
  }
  if (daysUntil <= 7 && daysUntil > 0) {
    return (
      <Badge
        className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
        data-testid="badge-due-soon"
      >
        Due in {daysUntil}d
      </Badge>
    );
  }
  return (
    <Badge variant="outline" data-testid="badge-pending">
      Pending
    </Badge>
  );
}

function InstallmentTimeline({
  schedule,
  nextInstallmentId,
  onPayClick,
}: {
  schedule: PaymentInstallment[];
  nextInstallmentId?: string;
  onPayClick?: (installment: PaymentInstallment) => void;
}) {
  return (
    <div className="space-y-4" data-testid="installment-timeline">
      {schedule.map((installment, index) => {
        const isNext = installment.id === nextInstallmentId;
        const isPaid = installment.status === "PAID";
        const isPartial = installment.status === "PARTIAL";
        const remainingCents =
          installment.amountCents - (installment.amountPaidCents || 0);

        return (
          <div
            key={installment.id}
            className={`relative flex items-start gap-4 ${isNext ? "bg-primary/5 -mx-4 px-4 py-3 rounded-lg border border-primary/20" : ""}`}
            data-testid={`installment-${index}`}
          >
            {index < schedule.length - 1 && (
              <div
                className={`absolute left-[17px] top-8 w-0.5 h-[calc(100%+8px)] ${isPaid ? "bg-green-500" : "bg-muted-foreground/20"}`}
              />
            )}

            <div className="flex-shrink-0 z-10">
              {isPaid ? (
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              ) : isPartial ? (
                <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              ) : isNext ? (
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary-foreground" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                  <Circle className="w-5 h-5 text-muted-foreground/50" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className="font-medium text-sm"
                    data-testid={`installment-description-${index}`}
                  >
                    {installment.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span
                      className="text-xs text-muted-foreground"
                      data-testid={`installment-date-${index}`}
                    >
                      {format(new Date(installment.dueDate), "MMM d, yyyy")}
                    </span>
                    {getStatusBadge(installment.status, installment.dueDate)}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${isPaid ? "text-green-600 dark:text-green-400" : ""}`}
                    data-testid={`installment-amount-${index}`}
                  >
                    {formatPrice(installment.amountCents)}
                  </p>
                  {isPartial && (
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`installment-remaining-${index}`}
                    >
                      {formatPrice(remainingCents)} remaining
                    </p>
                  )}
                  {isPaid && installment.amountPaidCents && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Paid {formatPrice(installment.amountPaidCents)}
                    </p>
                  )}
                </div>
              </div>

              {isNext && onPayClick && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => onPayClick(installment)}
                  data-testid="button-pay-installment"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay {formatPrice(remainingCents)}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({
  percent,
  size = 80,
}: {
  percent: number;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-green-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" data-testid="text-progress-percent">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function PaymentPlanCard({
  token,
  onPaymentClick,
  compact = false,
}: PaymentPlanCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const { data, isLoading, error } = useQuery<PaymentScheduleResponse>({
    queryKey: ["/api/public/smart-files", token, "payment-schedule"],
    enabled: !!token,
  });

  const createInstallmentPayment = useMutation({
    mutationFn: async (installmentId: string) => {
      const response = await apiRequest(
        `/api/public/smart-files/${token}/create-installment-payment`,
        {
          method: "POST",
          body: JSON.stringify({ installmentId }),
        },
      );
      return response;
    },
    onSuccess: (data, installmentId) => {
      const installment = schedule?.find((i) => i.id === installmentId);
      if (installment && onPaymentClick) {
        onPaymentClick(installment, data.clientSecret);
      }
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="payment-plan-loading">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { schedule, nextInstallment, summary, transactions } = data;

  if (!schedule || schedule.length === 0) {
    return null;
  }

  const handlePayClick = (installment: PaymentInstallment) => {
    createInstallmentPayment.mutate(installment.id);
  };

  return (
    <Card className="overflow-hidden" data-testid="payment-plan-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Payment Plan
          </CardTitle>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              data-testid="button-toggle-expand"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <ProgressRing percent={summary.percentComplete} />

          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span
                className="font-medium text-green-600 dark:text-green-400"
                data-testid="text-total-paid"
              >
                {formatPrice(summary.totalPaidCents)}
              </span>
            </div>
            <Progress value={summary.percentComplete} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium" data-testid="text-total-remaining">
                {formatPrice(summary.totalRemainingCents)}
              </span>
            </div>
            <p
              className="text-xs text-muted-foreground"
              data-testid="text-payment-count"
            >
              {summary.paidCount} of {summary.totalCount} payments complete
            </p>
          </div>
        </div>

        {summary.isFullyPaid && (
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium" data-testid="text-fully-paid">
                All payments complete!
              </p>
            </div>
          </div>
        )}

        {!summary.isFullyPaid && nextInstallment && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Next payment due
                </p>
                <p
                  className="font-semibold"
                  data-testid="text-next-payment-amount"
                >
                  {formatPrice(
                    nextInstallment.amountCents -
                      (nextInstallment.amountPaidCents || 0),
                  )}
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="text-next-payment-date"
                >
                  {format(new Date(nextInstallment.dueDate), "MMMM d, yyyy")}
                </p>
              </div>
              {onPaymentClick && (
                <Button
                  onClick={() => handlePayClick(nextInstallment)}
                  disabled={createInstallmentPayment.isPending}
                  data-testid="button-pay-next"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {createInstallmentPayment.isPending
                    ? "Loading..."
                    : "Pay Now"}
                </Button>
              )}
            </div>
          </div>
        )}

        {expanded && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-4">Payment Schedule</h4>
            <InstallmentTimeline
              schedule={schedule}
              nextInstallmentId={nextInstallment?.id}
              onPayClick={onPaymentClick ? handlePayClick : undefined}
            />
          </div>
        )}

        {transactions && transactions.length > 0 && expanded && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Payment History</h4>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                  data-testid={`transaction-${tx.id}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{format(new Date(tx.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <span className="font-medium">
                    {formatPrice(tx.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentPlanCompact({
  token,
  onPaymentClick,
}: {
  token: string;
  onPaymentClick?: (
    installment: PaymentInstallment,
    clientSecret: string,
  ) => void;
}) {
  return (
    <PaymentPlanCard token={token} onPaymentClick={onPaymentClick} compact />
  );
}
