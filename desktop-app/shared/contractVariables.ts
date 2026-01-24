// Contract Variable Parser - Replace {{placeholders}} with actual data
import { format } from "date-fns";

export interface ContractVariableData {
  // Client info
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  // Photographer info
  photographerName?: string;
  photographerEmail?: string;
  photographerPhone?: string;
  photographerAddress?: string;

  // Project details
  projectDate?: Date | string;
  projectVenue?: string;
  projectType?: string;

  // Package details
  selectedPackages?: Array<{
    name: string;
    priceCents: number;
    quantity?: number;
    description?: string;
    items?: string[];
  }>;

  // Add-ons
  selectedAddOns?: Array<{
    name: string;
    priceCents: number;
    quantity: number;
    description?: string;
  }>;

  // Payment info
  totalCents?: number;
  depositCents?: number;
  depositPercent?: number;
  balanceCents?: number;
  paymentSchedule?: Array<{
    dueDate: Date | string;
    amountCents: number;
    percentOfTotal: number;
  }>;

  // Contract meta
  contractDate?: Date | string;
}

// Format currency in cents to USD
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// Format date
function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "EEE, MMM d, yyyy");
}

// Generate package details with line items
function formatPackageDetails(data: ContractVariableData): string {
  if (!data.selectedPackages || data.selectedPackages.length === 0) {
    return "No packages selected";
  }

  return data.selectedPackages
    .map((pkg) => {
      const quantity = pkg.quantity || 1;
      const total = pkg.priceCents * quantity;
      let output = `${quantity} of ${pkg.name}`;

      if (pkg.priceCents) {
        output += ` at ${formatCurrency(pkg.priceCents)}`;
        if (quantity > 1) {
          output += ` each`;
        }
        output += ` for a total of ${formatCurrency(total)}`;
      }

      // Add description if exists
      if (pkg.description) {
        output += `\n${pkg.description}`;
      }

      // Add included items if exists
      if (pkg.items && pkg.items.length > 0) {
        output += "\nIncludes:\n\n";
        output += pkg.items.map((item) => `- ${item}`).join("\n");
      }

      return output;
    })
    .join("\n\n");
}

// Generate add-ons details
function formatAddOnDetails(data: ContractVariableData): string {
  if (!data.selectedAddOns || data.selectedAddOns.length === 0) {
    return "";
  }

  return data.selectedAddOns
    .map((addon) => {
      const total = addon.priceCents * addon.quantity;
      let output = `${addon.quantity} × ${addon.name} - ${formatCurrency(total)}`;

      if (addon.description) {
        output += `\n${addon.description}`;
      }

      return output;
    })
    .join("\n");
}

// Generate payment schedule
function formatPaymentSchedule(data: ContractVariableData): string {
  if (!data.paymentSchedule || data.paymentSchedule.length === 0) {
    // Fallback to simple deposit info
    if (data.depositCents && data.totalCents) {
      return `Deposit: ${formatCurrency(data.depositCents)} (${data.depositPercent || 50}% of total)\n\nBalance: ${formatCurrency(data.totalCents - data.depositCents)} due before event`;
    }
    return "Payment terms to be discussed";
  }

  const scheduleText = data.paymentSchedule
    .map((payment, index) => {
      const dueDate = formatDate(payment.dueDate);
      const percent = payment.percentOfTotal.toFixed(2);
      // Include description if present (from new PaymentInstallment type)
      const description =
        (payment as any).description || `Payment ${index + 1}`;
      return `${description}: ${percent}% of the total (${formatCurrency(payment.amountCents)}) due on ${dueDate}`;
    })
    .join("\n\n"); // Blank line separation for readability

  // Add HoneyBook-style flexibility disclaimer
  const disclaimer =
    "\n\nNote: This payment schedule is a guide. Early payments are welcome, and the schedule can be adjusted as needed. Clients may pay more or less than the scheduled amounts, and remaining payments will be recalculated accordingly.";

  return scheduleText + disclaimer;
}

// Main parser function
export function parseContractTemplate(
  template: string,
  data: ContractVariableData,
): string {
  let parsed = template;

  // Basic text replacements
  const replacements: Record<string, string> = {
    "{{client_name}}": data.clientName || "[Client Name]",
    "{{client_email}}": data.clientEmail || "[Client Email]",
    "{{client_phone}}": data.clientPhone || "[Client Phone]",
    "{{client_address}}": data.clientAddress || "[Client Address]",

    "{{photographer_name}}": data.photographerName || "[Photographer Name]",
    "{{photographer_email}}": data.photographerEmail || "[Photographer Email]",
    "{{photographer_phone}}": data.photographerPhone || "[Photographer Phone]",
    "{{photographer_address}}":
      data.photographerAddress || "[Photographer Address]",

    "{{project_date}}": formatDate(data.projectDate),
    "{{project_venue}}": data.projectVenue || "[Venue]",
    "{{project_type}}": data.projectType || "[Project Type]",

    "{{total_amount}}": data.totalCents
      ? formatCurrency(data.totalCents)
      : "$0.00",
    "{{deposit_amount}}": data.depositCents
      ? formatCurrency(data.depositCents)
      : "$0.00",
    "{{deposit_percent}}": (data.depositPercent || 50).toString() + "%",
    "{{balance_amount}}":
      data.totalCents && data.depositCents
        ? formatCurrency(data.totalCents - data.depositCents)
        : "$0.00",

    "{{contract_date}}": formatDate(data.contractDate || new Date()),
  };

  // Replace basic variables
  Object.entries(replacements).forEach(([key, value]) => {
    parsed = parsed.replace(
      new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
      value,
    );
  });

  // Complex replacements (these generate multi-line content)
  parsed = parsed.replace(
    /\{\{selected_packages\}\}/g,
    formatPackageDetails(data),
  );
  parsed = parsed.replace(/\{\{selected_addons\}\}/g, formatAddOnDetails(data));
  parsed = parsed.replace(
    /\{\{payment_schedule\}\}/g,
    formatPaymentSchedule(data),
  );

  return parsed;
}

// Get list of available variables for the UI
export const AVAILABLE_VARIABLES = [
  { key: "{{client_name}}", label: "Client Name", category: "Client Info" },
  { key: "{{client_email}}", label: "Client Email", category: "Client Info" },
  { key: "{{client_phone}}", label: "Client Phone", category: "Client Info" },
  {
    key: "{{client_address}}",
    label: "Client Address",
    category: "Client Info",
  },

  {
    key: "{{photographer_name}}",
    label: "Photographer Name",
    category: "Photographer Info",
  },
  {
    key: "{{photographer_email}}",
    label: "Photographer Email",
    category: "Photographer Info",
  },
  {
    key: "{{photographer_phone}}",
    label: "Photographer Phone",
    category: "Photographer Info",
  },
  {
    key: "{{photographer_address}}",
    label: "Photographer Address",
    category: "Photographer Info",
  },

  {
    key: "{{project_date}}",
    label: "Project Date",
    category: "Project Details",
  },
  {
    key: "{{project_venue}}",
    label: "Project Venue",
    category: "Project Details",
  },
  {
    key: "{{project_type}}",
    label: "Project Type",
    category: "Project Details",
  },

  {
    key: "{{selected_packages}}",
    label: "Selected Packages (with details)",
    category: "Selections",
  },
  {
    key: "{{selected_addons}}",
    label: "Selected Add-ons",
    category: "Selections",
  },

  { key: "{{total_amount}}", label: "Total Amount", category: "Payment" },
  { key: "{{deposit_amount}}", label: "Deposit Amount", category: "Payment" },
  {
    key: "{{deposit_percent}}",
    label: "Deposit Percentage",
    category: "Payment",
  },
  { key: "{{balance_amount}}", label: "Balance Due", category: "Payment" },
  {
    key: "{{payment_schedule}}",
    label: "Payment Schedule",
    category: "Payment",
  },

  { key: "{{contract_date}}", label: "Contract Date", category: "Meta" },
];

// Simpler parser for public views that takes a flat object
export function parseContractVariables(
  template: string,
  data: Record<string, string>,
): string {
  let parsed = template;

  // Replace all {{variables}} with provided data
  Object.entries(data).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    parsed = parsed.replace(pattern, value || `[${key}]`);
  });

  return parsed;
}

// Detect if content is HTML (for backward compatibility with plain text contracts)
export function isHtmlContent(content: string): boolean {
  if (!content) return false;
  // Check for common HTML tags that would be in rich text content
  const htmlPattern = /<(p|div|span|h[1-6]|ul|ol|li|strong|em|u|br)\b[^>]*>/i;
  return htmlPattern.test(content);
}

// Escape HTML special characters in variable values
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Parser for HTML content - escapes variable values to prevent XSS
export function parseContractVariablesHtml(
  template: string,
  data: Record<string, string>,
): string {
  let parsed = template;

  // Replace all {{variables}} with HTML-escaped data
  Object.entries(data).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const escapedValue = escapeHtml(value || `[${key}]`);
    parsed = parsed.replace(pattern, escapedValue);
  });

  return parsed;
}
