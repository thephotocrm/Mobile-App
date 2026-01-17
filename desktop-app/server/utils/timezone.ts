/**
 * Timezone utility functions for proper date/time handling
 * 
 * Uses Intl.DateTimeFormat for reliable timezone calculations without
 * string parsing ambiguity.
 */

/**
 * Gets the UTC offset in minutes for a specific timezone at a specific point in time.
 * Uses Intl.DateTimeFormat.formatToParts for reliable offset calculation.
 * 
 * @param utcDate - The UTC date to check the offset for
 * @param timezone - IANA timezone string (e.g., 'America/Chicago')
 * @returns Offset in minutes (e.g., -360 for UTC-6, 60 for UTC+1)
 */
function getTimezoneOffsetMinutes(utcDate: Date, timezone: string): number {
  // Format the same instant in both UTC and target timezone
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const tzParts = tzFormatter.formatToParts(utcDate);
  
  const getPartValue = (parts: Intl.DateTimeFormatPart[], type: string): number => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  const tzYear = getPartValue(tzParts, 'year');
  const tzMonth = getPartValue(tzParts, 'month');
  const tzDay = getPartValue(tzParts, 'day');
  let tzHour = getPartValue(tzParts, 'hour');
  const tzMinute = getPartValue(tzParts, 'minute');
  const tzSecond = getPartValue(tzParts, 'second');
  
  // Handle midnight formatting (hour12: false can return "24" for midnight in some locales)
  if (tzHour === 24) tzHour = 0;
  
  // Create a UTC timestamp from the timezone-local representation
  // This gives us "what UTC time would show the same clock reading"
  const tzAsUtcTimestamp = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  
  // The offset is the difference between the local representation (as if UTC) and actual UTC
  // Positive offset = timezone is ahead of UTC (east), negative = behind UTC (west)
  const offsetMs = tzAsUtcTimestamp - utcDate.getTime();
  return Math.round(offsetMs / 60000);
}

/**
 * Creates a Date object from a date string (YYYY-MM-DD) and time string (HH:MM)
 * interpreted in a specific timezone. The returned Date represents the correct
 * moment in time (stored internally as UTC).
 * 
 * @param dateStr - Date in YYYY-MM-DD format (must be exactly this format)
 * @param timeStr - Time in HH:MM format (24-hour)
 * @param timezone - IANA timezone string (e.g., 'America/Chicago')
 * @returns Date object in UTC representing the specified time in the given timezone
 * @throws Error if date or time format is invalid
 */
export function createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
  // Validate inputs
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Validate ranges
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) {
    throw new Error(`Invalid date/time values: ${dateStr} ${timeStr}`);
  }

  // Create a reference UTC date (treating the local time as if it were UTC)
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  // Get the offset for this timezone at this approximate time
  const offsetMinutes = getTimezoneOffsetMinutes(naiveUtc, timezone);
  
  // To convert local time to UTC: subtract the offset
  // e.g., 10:00 Central (UTC-6, offset = -360) -> 10:00 - (-360min) = 16:00 UTC
  const utcTime = new Date(naiveUtc.getTime() - offsetMinutes * 60000);
  
  // Verify the offset at the actual target time (handles edge cases near DST transitions)
  const actualOffset = getTimezoneOffsetMinutes(utcTime, timezone);
  if (actualOffset !== offsetMinutes) {
    // DST transition occurred between our initial guess and actual time
    // Recalculate with the correct offset
    return new Date(naiveUtc.getTime() - actualOffset * 60000);
  }
  
  return utcTime;
}

/**
 * Extracts the date portion (YYYY-MM-DD) from a Date or ISO string
 * in a specific timezone.
 * 
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateInTimezone(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Use 'en-CA' locale which formats as YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Extracts the time portion (HH:MM) from a Date or ISO string
 * in a specific timezone.
 * 
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone string
 * @returns Time string in HH:MM format (24-hour)
 */
export function getTimeInTimezone(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  
  return `${hour}:${minute}`;
}
