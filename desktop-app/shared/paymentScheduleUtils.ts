import { nanoid } from "nanoid";

export interface PaymentInstallment {
  id: string;
  description: string;
  dueDate: string; // ISO date string
  amountCents: number;
  percentOfTotal: number;
  status: "PENDING" | "PAID" | "PARTIAL";
  amountPaidCents?: number; // Track partial payments
}

export interface PaymentScheduleConfig {
  maxInstallments?: number; // For client-choice mode
  allowPayInFull?: boolean; // For client-choice mode
  payInFullDiscountPercent?: number; // Discount for paying in full
}

export interface GenerateScheduleOptions {
  totalCents: number;
  eventDate: Date;
  startDate?: Date; // Default: today
  frequency: "BIWEEKLY" | "MONTHLY" | "CUSTOM";
  numberOfPayments?: number; // For CUSTOM frequency
  finalPaymentDaysBeforeEvent?: number; // Default: 30
  depositPercent?: number; // Initial deposit percentage
}

/**
 * Generate a payment schedule from today to event date with smart spacing
 * Final payment defaults to 30 days before event (like HoneyBook)
 */
export function calculateScheduleFromEventDate(
  options: GenerateScheduleOptions,
): PaymentInstallment[] {
  const {
    totalCents,
    eventDate,
    startDate = new Date(),
    frequency,
    numberOfPayments,
    finalPaymentDaysBeforeEvent = 30,
    depositPercent,
  } = options;

  const installments: PaymentInstallment[] = [];

  // Calculate final payment date (30 days before event by default)
  const finalPaymentDate = new Date(eventDate);
  finalPaymentDate.setDate(
    finalPaymentDate.getDate() - finalPaymentDaysBeforeEvent,
  );

  // Calculate time span in days
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const finalDate = new Date(finalPaymentDate);
  finalDate.setHours(0, 0, 0, 0);

  const totalDays = Math.floor(
    (finalDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (totalDays < 0) {
    // Event is in the past or too soon, return single payment
    return [
      {
        id: nanoid(),
        description: "Full payment",
        dueDate: start.toISOString(),
        amountCents: totalCents,
        percentOfTotal: 100,
        status: "PENDING",
      },
    ];
  }

  let paymentDates: Date[] = [];

  if (frequency === "BIWEEKLY") {
    // Generate bi-weekly payments
    paymentDates = generateBiweeklyDates(start, finalDate);
  } else if (frequency === "MONTHLY") {
    // Generate monthly payments
    paymentDates = generateMonthlyDates(start, finalDate);
  } else if (frequency === "CUSTOM" && numberOfPayments) {
    // Distribute payments evenly across the time period
    paymentDates = distributePaymentsEvenly(start, finalDate, numberOfPayments);
  }

  // Guard: ensure we always have at least one payment date
  if (paymentDates.length === 0) {
    paymentDates = [new Date(start)];
  }

  // Handle deposit if specified
  if (depositPercent && depositPercent > 0) {
    const depositCents = Math.round(totalCents * (depositPercent / 100));
    const remaining = totalCents - depositCents;

    // First payment is deposit
    installments.push({
      id: nanoid(),
      description: `Deposit (${depositPercent}%)`,
      dueDate: start.toISOString(),
      amountCents: depositCents,
      percentOfTotal: depositPercent,
      status: "PENDING",
    });

    // Distribute remaining amount across other payments
    const numRemainingPayments = paymentDates.length - 1;
    if (numRemainingPayments > 0) {
      const amountPerPayment = Math.floor(remaining / numRemainingPayments);
      let remainingToDistribute = remaining;

      for (let i = 1; i < paymentDates.length; i++) {
        const isLast = i === paymentDates.length - 1;
        const amount = isLast ? remainingToDistribute : amountPerPayment;
        const percent = (amount / totalCents) * 100;

        installments.push({
          id: nanoid(),
          description: isLast
            ? `Final payment (due ${finalPaymentDaysBeforeEvent} days before event)`
            : `Payment ${i}`,
          dueDate: paymentDates[i].toISOString(),
          amountCents: amount,
          percentOfTotal: Number(percent.toFixed(2)),
          status: "PENDING",
        });

        remainingToDistribute -= amount;
      }
    } else if (remaining > 0) {
      // Guard: If only deposit date exists but there's remaining balance, add final payment on same date
      installments.push({
        id: nanoid(),
        description: "Final payment",
        dueDate: start.toISOString(),
        amountCents: remaining,
        percentOfTotal: Number(((remaining / totalCents) * 100).toFixed(2)),
        status: "PENDING",
      });
    }
  } else {
    // No deposit, distribute evenly
    const numPayments = paymentDates.length;
    const amountPerPayment = Math.floor(totalCents / numPayments);
    let remainingToDistribute = totalCents;

    paymentDates.forEach((date, index) => {
      const isLast = index === paymentDates.length - 1;
      const amount = isLast ? remainingToDistribute : amountPerPayment;
      const percent = (amount / totalCents) * 100;

      installments.push({
        id: nanoid(),
        description: isLast
          ? `Final payment (due ${finalPaymentDaysBeforeEvent} days before event)`
          : `Payment ${index + 1}`,
        dueDate: date.toISOString(),
        amountCents: amount,
        percentOfTotal: Number(percent.toFixed(2)),
        status: "PENDING",
      });

      remainingToDistribute -= amount;
    });
  }

  return installments;
}

/**
 * Generate bi-weekly payment dates (every 14 days)
 */
function generateBiweeklyDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  dates.push(new Date(current)); // First payment

  while (true) {
    current.setDate(current.getDate() + 14); // Add 14 days
    if (current > endDate) break;
    dates.push(new Date(current));
  }

  // Ensure final payment is on the end date
  const lastDate = dates[dates.length - 1];
  if (lastDate.getTime() !== endDate.getTime()) {
    dates.push(new Date(endDate));
  }

  return dates;
}

/**
 * Generate monthly payment dates (HoneyBook-style: same day each month)
 */
function generateMonthlyDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  const dayOfMonth = current.getDate();

  dates.push(new Date(current)); // First payment

  while (true) {
    // Advance to next month, same day
    current.setMonth(current.getMonth() + 1);

    // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
    const maxDay = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      0,
    ).getDate();
    current.setDate(Math.min(dayOfMonth, maxDay));

    if (current > endDate) break;
    dates.push(new Date(current));
  }

  // Ensure final payment is on the end date
  const lastDate = dates[dates.length - 1];
  if (lastDate.getTime() !== endDate.getTime()) {
    dates.push(new Date(endDate));
  }

  return dates;
}

/**
 * Distribute payments evenly across the time period
 */
function distributePaymentsEvenly(
  startDate: Date,
  endDate: Date,
  numberOfPayments: number,
): Date[] {
  if (numberOfPayments <= 1) {
    return [new Date(startDate)];
  }

  const dates: Date[] = [];
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const intervalDays = Math.floor(totalDays / (numberOfPayments - 1));

  const current = new Date(startDate);
  dates.push(new Date(current)); // First payment

  for (let i = 1; i < numberOfPayments - 1; i++) {
    current.setDate(current.getDate() + intervalDays);
    dates.push(new Date(current));
  }

  dates.push(new Date(endDate)); // Final payment

  return dates;
}

/**
 * Apply a flexible payment to the schedule
 * Payment is applied to earliest unpaid installment(s)
 * Returns updated schedule (does not mutate input)
 */
export function applyPaymentToSchedule(
  schedule: PaymentInstallment[],
  paymentAmountCents: number,
): PaymentInstallment[] {
  // Clone the schedule to avoid mutation
  const updatedSchedule = schedule.map((inst) => ({ ...inst }));
  let remainingPayment = paymentAmountCents;

  // Sort by due date to apply to earliest first (on cloned array)
  const sortedSchedule = [...updatedSchedule].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  for (const installment of sortedSchedule) {
    if (remainingPayment <= 0) break;

    if (installment.status === "PENDING" || installment.status === "PARTIAL") {
      const amountDue =
        installment.amountCents - (installment.amountPaidCents || 0);

      if (remainingPayment >= amountDue) {
        // Fully pay this installment
        installment.amountPaidCents = installment.amountCents;
        installment.status = "PAID";
        remainingPayment -= amountDue;
      } else {
        // Partial payment
        installment.amountPaidCents =
          (installment.amountPaidCents || 0) + remainingPayment;
        installment.status = "PARTIAL";
        remainingPayment = 0;
      }
    }
  }

  return sortedSchedule;
}

/**
 * Get the next unpaid/partial installment
 */
export function getNextDueInstallment(
  schedule: PaymentInstallment[],
): PaymentInstallment | null {
  const sorted = [...schedule].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
  return (
    sorted.find((i) => i.status === "PENDING" || i.status === "PARTIAL") || null
  );
}

/**
 * Calculate total amount paid so far
 */
export function getTotalPaid(schedule: PaymentInstallment[]): number {
  return schedule.reduce((total, installment) => {
    return total + (installment.amountPaidCents || 0);
  }, 0);
}

/**
 * Calculate total amount remaining
 */
export function getTotalRemaining(schedule: PaymentInstallment[]): number {
  return schedule.reduce((total, installment) => {
    const due = installment.amountCents - (installment.amountPaidCents || 0);
    return total + due;
  }, 0);
}

/**
 * Recalculate schedule when total amount changes (e.g., client adds/removes items)
 * Maintains the same payment structure but adjusts amounts proportionally
 */
export function recalculateScheduleForNewTotal(
  schedule: PaymentInstallment[],
  newTotalCents: number,
  preservePaidInstallments: boolean = true,
): PaymentInstallment[] {
  const updatedSchedule = [...schedule];

  if (preservePaidInstallments) {
    // Keep paid installments as-is, recalculate only unpaid ones
    const paidAmount = updatedSchedule
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amountCents, 0);

    const remainingTotal = newTotalCents - paidAmount;
    const unpaidInstallments = updatedSchedule.filter(
      (i) => i.status !== "PAID",
    );

    if (unpaidInstallments.length > 0) {
      const amountPerUnpaid = Math.floor(
        remainingTotal / unpaidInstallments.length,
      );
      let remainingToDistribute = remainingTotal;

      unpaidInstallments.forEach((installment, index) => {
        const isLast = index === unpaidInstallments.length - 1;
        const amount = isLast ? remainingToDistribute : amountPerUnpaid;

        installment.amountCents = amount;
        installment.percentOfTotal = Number(
          ((amount / newTotalCents) * 100).toFixed(2),
        );
        remainingToDistribute -= amount;
      });
    }
  } else {
    // Recalculate all installments proportionally
    const totalAmount = updatedSchedule.reduce(
      (sum, i) => sum + i.amountCents,
      0,
    );

    // Guard against division by zero - distribute evenly if original total was 0
    if (totalAmount === 0) {
      const perInstallment = Math.floor(newTotalCents / updatedSchedule.length);
      let remainingToDistribute = newTotalCents;

      updatedSchedule.forEach((installment, index) => {
        const isLast = index === updatedSchedule.length - 1;
        const amount = isLast ? remainingToDistribute : perInstallment;

        installment.amountCents = amount;
        installment.percentOfTotal = Number(
          ((amount / newTotalCents) * 100).toFixed(2),
        );
        remainingToDistribute -= amount;
      });

      return updatedSchedule;
    }

    const ratio = newTotalCents / totalAmount;

    let remainingToDistribute = newTotalCents;

    updatedSchedule.forEach((installment, index) => {
      const isLast = index === updatedSchedule.length - 1;
      const amount = isLast
        ? remainingToDistribute
        : Math.round(installment.amountCents * ratio);

      installment.amountCents = amount;
      installment.percentOfTotal = Number(
        ((amount / newTotalCents) * 100).toFixed(2),
      );
      remainingToDistribute -= amount;
    });
  }

  return updatedSchedule;
}

/**
 * Generate a simple 2-payment schedule (deposit + balance)
 */
export function generateSimpleSchedule(
  totalCents: number,
  depositPercent: number,
  eventDate: Date,
): PaymentInstallment[] {
  const depositCents = Math.round(totalCents * (depositPercent / 100));
  const balanceCents = totalCents - depositCents;

  const finalPaymentDate = new Date(eventDate);
  finalPaymentDate.setDate(finalPaymentDate.getDate() - 30); // 30 days before event

  return [
    {
      id: nanoid(),
      description: `Deposit (${depositPercent}%)`,
      dueDate: new Date().toISOString(),
      amountCents: depositCents,
      percentOfTotal: depositPercent,
      status: "PENDING",
    },
    {
      id: nanoid(),
      description: "Final payment (due 30 days before event)",
      dueDate: finalPaymentDate.toISOString(),
      amountCents: balanceCents,
      percentOfTotal: Number((100 - depositPercent).toFixed(2)),
      status: "PENDING",
    },
  ];
}

/**
 * Calculate which installment counts are allowed based on event date proximity
 * Rules:
 * - Final payment must be at least 30 days before event
 * - Minimum gap between payments is 7 days (to be practical)
 * - Returns an array of allowed installment counts and a max installment count
 */
export function getAllowedInstallmentCounts(
  eventDate: Date | null,
  today: Date = new Date(),
  finalPaymentBuffer: number = 30,
  minGapDays: number = 7,
  maxPossibleInstallments: number = 6,
): {
  allowedCounts: number[];
  maxInstallments: number;
  daysUntilFinal: number;
} {
  // If no event date, allow all options with a note they're estimated
  if (!eventDate) {
    return {
      allowedCounts: Array.from(
        { length: maxPossibleInstallments },
        (_, i) => i + 1,
      ),
      maxInstallments: maxPossibleInstallments,
      daysUntilFinal: 180, // Default assumption
    };
  }

  // Calculate the final payment date (30 days before event)
  const finalPaymentDate = new Date(eventDate);
  finalPaymentDate.setDate(finalPaymentDate.getDate() - finalPaymentBuffer);
  finalPaymentDate.setHours(0, 0, 0, 0);

  const todayNormalized = new Date(today);
  todayNormalized.setHours(0, 0, 0, 0);

  // Calculate days available for the payment schedule
  const daysUntilFinal = Math.floor(
    (finalPaymentDate.getTime() - todayNormalized.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // If event is too soon (final payment already past), only allow full payment
  if (daysUntilFinal <= 0) {
    return {
      allowedCounts: [1],
      maxInstallments: 1,
      daysUntilFinal: 0,
    };
  }

  // Calculate max installments that make sense
  // For N installments, we need (N-1) gaps of at least minGapDays
  // So: daysUntilFinal >= (N-1) * minGapDays
  // N <= (daysUntilFinal / minGapDays) + 1
  const maxAllowed = Math.min(
    Math.floor(daysUntilFinal / minGapDays) + 1,
    maxPossibleInstallments,
  );

  // Always allow at least 1 (full payment)
  const allowedCounts = Array.from(
    { length: Math.max(1, maxAllowed) },
    (_, i) => i + 1,
  );

  return {
    allowedCounts,
    maxInstallments: Math.max(1, maxAllowed),
    daysUntilFinal,
  };
}

/**
 * Generate a synthetic 2-payment schedule from existing payment data
 * Used when no explicit paymentSchedule exists but deposit/balance data is available
 */
export function generateSyntheticScheduleFromPaymentData(
  totalCents: number,
  depositCents: number,
  amountPaidCents: number,
  balanceDueCents: number,
  eventDate?: Date | null,
): PaymentInstallment[] {
  // If no meaningful payment data, return empty
  if (totalCents <= 0) {
    return [];
  }

  const schedule: PaymentInstallment[] = [];

  // Determine deposit amount and status
  const effectiveDepositCents =
    depositCents > 0 ? depositCents : amountPaidCents;

  if (effectiveDepositCents > 0) {
    const depositPaid = amountPaidCents >= effectiveDepositCents;
    schedule.push({
      id: nanoid(),
      description: "Deposit",
      dueDate: new Date().toISOString(), // Deposit is due immediately
      amountCents: effectiveDepositCents,
      percentOfTotal: Number(
        ((effectiveDepositCents / totalCents) * 100).toFixed(2),
      ),
      status: depositPaid ? "PAID" : "PENDING",
      amountPaidCents: depositPaid
        ? effectiveDepositCents
        : amountPaidCents > 0
          ? amountPaidCents
          : undefined,
    });
  }

  // Add balance payment if there's remaining amount
  const effectiveBalanceCents =
    balanceDueCents > 0 ? balanceDueCents : totalCents - effectiveDepositCents;

  if (effectiveBalanceCents > 0) {
    // Calculate balance due date (30 days before event, or a reasonable future date)
    let balanceDueDate: Date;
    if (eventDate) {
      balanceDueDate = new Date(eventDate);
      balanceDueDate.setDate(balanceDueDate.getDate() - 30);
    } else {
      // Default to 30 days from now if no event date
      balanceDueDate = new Date();
      balanceDueDate.setDate(balanceDueDate.getDate() + 30);
    }

    // Check if balance is fully or partially paid
    const amountPaidTowardsBalance = Math.max(
      0,
      amountPaidCents - effectiveDepositCents,
    );
    const balanceFullyPaid = amountPaidTowardsBalance >= effectiveBalanceCents;
    const balancePartiallyPaid =
      amountPaidTowardsBalance > 0 && !balanceFullyPaid;

    schedule.push({
      id: nanoid(),
      description: "Final Payment",
      dueDate: balanceDueDate.toISOString(),
      amountCents: effectiveBalanceCents,
      percentOfTotal: Number(
        ((effectiveBalanceCents / totalCents) * 100).toFixed(2),
      ),
      status: balanceFullyPaid
        ? "PAID"
        : balancePartiallyPaid
          ? "PARTIAL"
          : "PENDING",
      amountPaidCents:
        amountPaidTowardsBalance > 0 ? amountPaidTowardsBalance : undefined,
    });
  }

  return schedule;
}

/**
 * Generate schedule for client-choice mode
 * Client picks number of installments, we generate the schedule
 * If depositPercent is provided, the first payment is the deposit and remaining is split across other installments
 */
export function generateClientChoiceSchedule(
  totalCents: number,
  numberOfInstallments: number,
  eventDate: Date,
  depositPercent?: number,
): PaymentInstallment[] {
  if (numberOfInstallments === 1) {
    return [
      {
        id: nanoid(),
        description: "Full payment",
        dueDate: new Date().toISOString(),
        amountCents: totalCents,
        percentOfTotal: 100,
        status: "PENDING",
      },
    ];
  }

  // Use CUSTOM frequency to respect the exact numberOfInstallments
  // Pass depositPercent so first payment is the deposit, remaining is split across other installments
  return calculateScheduleFromEventDate({
    totalCents,
    eventDate,
    frequency: "CUSTOM",
    numberOfPayments: numberOfInstallments,
    finalPaymentDaysBeforeEvent: 30,
    depositPercent:
      depositPercent && depositPercent > 0 ? depositPercent : undefined,
  });
}
