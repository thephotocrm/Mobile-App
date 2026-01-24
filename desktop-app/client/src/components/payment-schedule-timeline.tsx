import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";

export interface PaymentInstallment {
  id: string;
  label: string;
  description?: string;
  amountCents: number;
  dueDate: string;
  status: "PENDING" | "PAID" | "PARTIAL";
  paidCents?: number;
}

export interface PaymentSummary {
  totalCents: number;
  totalPaidCents: number;
  totalRemainingCents: number;
  paidCount: number;
  totalCount: number;
  percentComplete: number;
  isFullyPaid: boolean;
}

interface PaymentScheduleTimelineProps {
  schedule: PaymentInstallment[];
  nextInstallment: PaymentInstallment | null;
  summary: PaymentSummary;
  context: "client-portal" | "photographer-view";
  onPayClick?: (installment: PaymentInstallment) => void;
  onSendReminder?: (installment: PaymentInstallment) => void;
  onMarkPaid?: (installment: PaymentInstallment) => void;
  compact?: boolean;
  smartFileToken?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function getInstallmentState(
  installment: PaymentInstallment,
  nextInstallmentId?: string,
) {
  const isPaid = installment.status === "PAID";
  const isPartial = installment.status === "PARTIAL";
  const isCurrent = installment.id === nextInstallmentId;
  const date = new Date(installment.dueDate);
  const isOverdue = !isPaid && isPast(date) && !isToday(date);
  const isDueToday = !isPaid && isToday(date);
  const daysUntil = differenceInDays(date, new Date());
  const isDueSoon = !isPaid && daysUntil <= 7 && daysUntil > 0;
  const isFuture =
    !isPaid && !isPartial && !isOverdue && !isDueToday && !isDueSoon;

  return {
    isPaid,
    isPartial,
    isCurrent,
    isOverdue,
    isDueToday,
    isDueSoon,
    isFuture,
    daysUntil,
  };
}

function PaymentStatusBadge({
  installment,
  nextInstallmentId,
}: {
  installment: PaymentInstallment;
  nextInstallmentId?: string;
}) {
  const state = getInstallmentState(installment, nextInstallmentId);

  if (state.isPaid) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="w-3 h-3 mr-1" />
        Paid
      </Badge>
    );
  }

  if (state.isPartial) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock className="w-3 h-3 mr-1" />
        Partial
      </Badge>
    );
  }

  if (state.isOverdue) {
    return (
      <Badge className="bg-red-600 text-white font-bold">
        <AlertCircle className="w-3 h-3 mr-1" />
        OVERDUE
      </Badge>
    );
  }

  if (state.isDueToday) {
    return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
        <Clock className="w-3 h-3 mr-1" />
        Due Today
      </Badge>
    );
  }

  if (state.isDueSoon) {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        Due in {state.daysUntil}d
      </Badge>
    );
  }

  return <Badge variant="outline">Pending</Badge>;
}

// Progress header with ring - simplified
function PaymentProgressHeader({ summary }: { summary: PaymentSummary }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Payment Progress
        </h3>
        <p className="text-lg font-bold mt-1">
          {summary.paidCount} of {summary.totalCount} payments
        </p>
      </div>

      {summary.isFullyPaid ? (
        <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
      ) : (
        <div className="relative w-14 h-14">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - summary.percentComplete / 100)}`}
              className="text-green-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">
              {Math.round(summary.percentComplete)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Horizontal step indicator for desktop
function PaymentStepIndicator({
  schedule,
  nextInstallmentId,
}: {
  schedule: PaymentInstallment[];
  nextInstallmentId?: string;
}) {
  if (schedule.length === 0) return null;

  return (
    <div className="hidden md:block py-6">
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted-foreground/20" />

        {/* Progress line (green portion) */}
        {schedule.length > 1 &&
          (() => {
            const paidCount = schedule.filter(
              (s) => s.status === "PAID",
            ).length;
            const progressPercent =
              paidCount > 0
                ? ((paidCount - 1) / (schedule.length - 1)) * 100
                : 0;
            return (
              <div
                className="absolute top-5 left-8 h-0.5 bg-green-500 transition-all duration-500"
                style={{
                  width: `calc(${progressPercent}% * (100% - 4rem) / 100)`,
                }}
              />
            );
          })()}

        {/* Step nodes */}
        <div className="relative flex justify-between px-4">
          {schedule.map((installment, index) => {
            const state = getInstallmentState(installment, nextInstallmentId);

            return (
              <div
                key={installment.id}
                className="flex flex-col items-center gap-2"
              >
                {/* Step number circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm z-10 transition-all",
                    state.isPaid && "bg-green-500 text-white",
                    state.isCurrent &&
                      !state.isOverdue &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    state.isCurrent &&
                      state.isOverdue &&
                      "bg-red-500 text-white ring-4 ring-red-500/20",
                    state.isFuture &&
                      "bg-muted border-2 border-muted-foreground/30 text-muted-foreground",
                    !state.isPaid &&
                      !state.isCurrent &&
                      state.isOverdue &&
                      "bg-red-100 text-red-600 border-2 border-red-300",
                    !state.isPaid &&
                      !state.isCurrent &&
                      state.isDueToday &&
                      "bg-orange-100 text-orange-600 border-2 border-orange-300",
                    !state.isPaid &&
                      !state.isCurrent &&
                      state.isDueSoon &&
                      "bg-blue-100 text-blue-600 border-2 border-blue-300",
                  )}
                >
                  {state.isPaid ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step label */}
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      state.isPaid && "text-green-600 dark:text-green-400",
                      state.isCurrent && "text-primary font-semibold",
                      state.isFuture && "text-muted-foreground",
                    )}
                  >
                    {state.isPaid
                      ? "Paid"
                      : state.isCurrent
                        ? "Current"
                        : state.isOverdue
                          ? "Overdue"
                          : "Upcoming"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatPrice(installment.amountCents)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Individual payment card
function PaymentInstallmentCard({
  installment,
  index,
  totalPayments,
  nextInstallmentId,
  context,
  onPayClick,
  onSendReminder,
  onMarkPaid,
}: {
  installment: PaymentInstallment;
  index: number;
  totalPayments: number;
  nextInstallmentId?: string;
  context: "client-portal" | "photographer-view";
  onPayClick?: (installment: PaymentInstallment) => void;
  onSendReminder?: (installment: PaymentInstallment) => void;
  onMarkPaid?: (installment: PaymentInstallment) => void;
}) {
  const state = getInstallmentState(installment, nextInstallmentId);
  const remainingCents = installment.amountCents - (installment.paidCents || 0);

  return (
    <div
      className={cn(
        "relative rounded-lg border transition-all",
        state.isCurrent &&
          !state.isOverdue &&
          "border-primary/50 bg-primary/5 shadow-sm mt-3",
        state.isCurrent &&
          state.isOverdue &&
          "border-red-500 bg-red-50 dark:bg-red-950/20 shadow-md shadow-red-200/50 mt-3",
        state.isPaid && "border-green-200 bg-green-50/50 dark:bg-green-950/10",
        state.isFuture && "border-muted bg-muted/20",
        !state.isPaid &&
          !state.isCurrent &&
          state.isOverdue &&
          "border-red-500 bg-red-50 dark:bg-red-950/20 shadow-md shadow-red-200/50",
        !state.isPaid &&
          !state.isCurrent &&
          state.isDueToday &&
          "border-orange-300 bg-orange-50/50",
        !state.isPaid &&
          !state.isCurrent &&
          state.isDueSoon &&
          "border-blue-200 bg-blue-50/30",
      )}
    >
      {/* NEXT UP Badge */}
      {state.isCurrent && !state.isPaid && (
        <div className="absolute -top-2.5 left-4 z-10">
          <Badge
            className={cn(
              "text-xs font-bold px-2.5 py-0.5 shadow-sm",
              state.isOverdue
                ? "bg-red-600 text-white"
                : "bg-primary text-primary-foreground",
            )}
          >
            {state.isOverdue ? "OVERDUE" : "NEXT UP"}
          </Badge>
        </div>
      )}

      {/* Header with payment number badge */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          {/* Payment number badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
              state.isPaid &&
                "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              state.isCurrent && "bg-primary/10 text-primary",
              state.isFuture && "bg-muted text-muted-foreground",
              !state.isPaid &&
                !state.isCurrent &&
                (state.isOverdue || state.isDueToday) &&
                "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            Payment {index + 1} of {totalPayments}
          </div>
        </div>

        <PaymentStatusBadge
          installment={installment}
          nextInstallmentId={nextInstallmentId}
        />
      </div>

      {/* Main content */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between">
          {/* Left: Amount and description */}
          <div>
            <p
              className={cn(
                "text-2xl font-bold",
                state.isPaid && "text-green-600 dark:text-green-400",
                state.isCurrent && "text-foreground",
                state.isFuture && "text-muted-foreground",
              )}
            >
              {formatPrice(installment.amountCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {installment.label ||
                installment.description ||
                `Payment ${index + 1}`}
            </p>
            {state.isPartial && remainingCents > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {formatPrice(remainingCents)} remaining
              </p>
            )}
          </div>

          {/* Right: Due date and actions */}
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(installment.dueDate), "MMM d, yyyy")}
              </span>
            </div>

            {/* Client Portal: Pay button for ANY unpaid payment */}
            {context === "client-portal" && !state.isPaid && onPayClick && (
              <Button
                size="sm"
                className={cn(
                  "mt-3",
                  state.isOverdue && "bg-red-600 hover:bg-red-700",
                )}
                variant={
                  state.isOverdue
                    ? "destructive"
                    : state.isCurrent
                      ? "default"
                      : "outline"
                }
                onClick={() => onPayClick(installment)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {state.isOverdue ? "Pay Now - Overdue" : "Pay Now"}
              </Button>
            )}

            {/* Photographer: Remind / Mark Paid buttons */}
            {context === "photographer-view" && !state.isPaid && (
              <div className="flex gap-2 mt-3">
                {onSendReminder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendReminder(installment)}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Remind
                  </Button>
                )}
                {onMarkPaid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkPaid(installment)}
                  >
                    Mark Paid
                  </Button>
                )}
              </div>
            )}

            {/* Paid checkmark */}
            {state.isPaid && (
              <div className="flex items-center gap-1.5 mt-2 text-green-600 dark:text-green-400 justify-end">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Paid</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentScheduleTimeline({
  schedule,
  nextInstallment,
  summary,
  context,
  onPayClick,
  onSendReminder,
  onMarkPaid,
  compact = false,
}: PaymentScheduleTimelineProps) {
  const [expanded, setExpanded] = useState(!compact);

  if (schedule.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No payment schedule configured</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Progress Header */}
      <PaymentProgressHeader summary={summary} />

      {/* Collapsible schedule section */}
      {compact && (
        <Button
          variant="ghost"
          className="w-full justify-between mb-3"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="font-semibold">Payment Schedule</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      )}

      {expanded && (
        <div className="space-y-3">
          {schedule.map((installment, index) => (
            <PaymentInstallmentCard
              key={installment.id}
              installment={installment}
              index={index}
              totalPayments={schedule.length}
              nextInstallmentId={nextInstallment?.id}
              context={context}
              onPayClick={onPayClick}
              onSendReminder={onSendReminder}
              onMarkPaid={onMarkPaid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
