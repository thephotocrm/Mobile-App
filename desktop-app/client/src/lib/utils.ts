import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date-only value (like eventDate) as a local date string.
 * Parses the date as local time to avoid UTC timezone shift that would show the wrong day.
 * Use this for dates that don't have a time component (event dates, wedding dates, etc.)
 */
export function formatEventDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  // Extract YYYY-MM-DD and parse as local date to avoid UTC timezone issues
  const dateStr = typeof date === 'string' ? date : date.toISOString();
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', options || { month: 'long', day: 'numeric', year: 'numeric' });
}
