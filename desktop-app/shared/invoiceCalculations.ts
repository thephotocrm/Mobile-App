/**
 * Shared invoice calculation utilities
 * Used by both smart-file-builder.tsx and public-smart-file.tsx
 */

export interface InvoiceLineItem {
  id: string;
  service: string;
  quantity: number;
  unit: string;
  unitPrice: number; // in cents
  taxable: boolean;
}

export interface InvoiceCalculationResult {
  subtotal: number;      // in cents
  taxableSubtotal: number; // in cents
  tax: number;           // in cents
  discount: number;      // in cents
  total: number;         // in cents
}

/**
 * Calculate invoice totals from line items and adjustments
 * All amounts are in cents
 */
export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  taxPercent: number,
  discountAmount: number,
  discountType: 'AMOUNT' | 'PERCENT'
): InvoiceCalculationResult {
  const subtotal = lineItems.reduce((sum, item) =>
    sum + (item.quantity * item.unitPrice), 0);

  const taxableSubtotal = lineItems
    .filter(item => item.taxable)
    .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const tax = taxPercent > 0
    ? Math.round(taxableSubtotal * (taxPercent / 100))
    : 0;

  const discount = discountType === 'PERCENT'
    ? Math.round(subtotal * (discountAmount / 100))
    : discountAmount || 0;

  const total = subtotal + tax - discount;

  return { subtotal, taxableSubtotal, tax, discount, total };
}

/**
 * Format cents to dollar string
 */
export function formatCentsAsDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
