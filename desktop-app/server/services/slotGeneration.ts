import { storage } from '../storage.js';
import { DailyAvailabilityTemplate, DailyAvailabilityBreak, DailyAvailabilityOverride, InsertAvailabilitySlot } from '../../shared/schema.js';
import { nanoid } from 'nanoid';
import { createDateInTimezone, getDateInTimezone } from '../utils/timezone.js';
import { googleCalendarService } from './calendar.js';

// Simple in-memory cache for Google Calendar busy times
const googleBusyCache = new Map<string, { busyTimes: Array<{ start: Date; end: Date; calendarId: string }>; expiresAt: number }>();

// Clean up expired cache entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  googleBusyCache.forEach((value, key) => {
    if (value.expiresAt < now) {
      googleBusyCache.delete(key);
    }
  });
}, 10 * 60 * 1000);

function getCacheKey(photographerId: string, date: string): string {
  return `${photographerId}:${date}`;
}

function getCacheTTL(date: string): number {
  const targetDate = new Date(date);
  const now = new Date();
  const daysAhead = Math.floor((targetDate.getTime() - now.getTime()) / (24 * 3600 * 1000));

  // Shorter TTL for near-term dates (more likely to change)
  if (daysAhead <= 7) return 5 * 60 * 1000;  // 5 minutes
  if (daysAhead <= 30) return 15 * 60 * 1000; // 15 minutes
  return 60 * 60 * 1000; // 1 hour
}

/**
 * Invalidate Google Calendar busy times cache for a photographer.
 * Call this when sync settings change to ensure fresh data is fetched.
 */
export function invalidateGoogleCalendarCache(photographerId: string): void {
  const keysToDelete: string[] = [];
  googleBusyCache.forEach((_, key) => {
    if (key.startsWith(`${photographerId}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => googleBusyCache.delete(key));
}

interface SlotGenerationOptions {
  photographerId: string;
  startDate: Date;
  endDate: Date;
  slotDurationMinutes?: number; // Default to 60 minutes
}

interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface ApiSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  photographerId: string;
  blockedByGoogle?: boolean;
  blockedByCalendars?: string[];
}

export interface SlotsForDateResult {
  slots: ApiSlot[];
  googleCalendarMetadata: Record<string, { name: string; color: string }> | null;
  googleCalendarError?: string; // Set if Google Calendar API call failed
}

export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO string
  end: string;   // ISO string
  htmlLink?: string;
  isAllDay: boolean;
}

export interface SlotsForDateRangeResult {
  slots: Record<string, ApiSlot[]>;
  googleCalendarMetadata: Record<string, { name: string; color: string }> | null;
  googleCalendarError?: string;
  /** Actual Google Calendar events with titles */
  googleCalendarEvents?: GoogleCalendarEvent[];
  /** Earliest start time across all templates (for calendar min bound) */
  earliestStartTime?: string;
  /** Latest end time across all templates (for calendar max bound) */
  latestEndTime?: string;
}

export class SlotGenerationService {
  
  /**
   * Generate availability slots for a photographer within a date range
   * Uses daily templates with breaks and date-specific overrides
   */
  async generateSlotsForDateRange(options: SlotGenerationOptions): Promise<void> {
    const { photographerId, startDate, endDate, slotDurationMinutes = 60 } = options;
    
    // Get photographer's daily templates
    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);
    
    // Get any overrides in the date range
    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      this.formatDate(startDate),
      this.formatDate(endDate)
    );
    
    // Convert overrides to a map for quick lookup
    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => {
      overrideMap.set(override.date, override);
    });
    
    // Process each date in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      await this.generateSlotsForDate(
        photographerId,
        currentDate,
        templates,
        overrideMap,
        slotDurationMinutes
      );
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  /**
   * Generate slots for a specific date
   */
  private async generateSlotsForDate(
    photographerId: string,
    date: Date,
    templates: DailyAvailabilityTemplate[],
    overrideMap: Map<string, DailyAvailabilityOverride>,
    slotDurationMinutes: number
  ): Promise<void> {
    const dateString = this.formatDate(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if there's an override for this date
    const override = overrideMap.get(dateString);
    
    let availabilityConfig: {
      startTime?: string;
      endTime?: string;
      templateId?: string;
      breaks: { startTime: string; endTime: string; label?: string }[];
      reason?: string;
    };
    
    if (override) {
      // Use override configuration - null startTime/endTime means closed day
      if (!override.startTime || !override.endTime) {
        // Day is closed due to override
        return;
      }
      
      availabilityConfig = {
        startTime: override.startTime,
        endTime: override.endTime,
        breaks: (override.breaks as any) || [], // Parse JSON breaks array
        reason: override.reason || undefined
      };
    } else {
      // Find template for this day of week
      const template = templates.find(t => t.dayOfWeek === dayOfWeek);
      if (!template) {
        // No template for this day, skip
        return;
      }
      
      // Check if template is enabled
      if (!template.isEnabled || !template.startTime || !template.endTime) {
        return;
      }
      
      // Get breaks for this template
      const templateBreaks = await storage.getDailyAvailabilityBreaksByTemplate(template.id);
      
      availabilityConfig = {
        startTime: template.startTime,
        endTime: template.endTime,
        templateId: template.id,
        breaks: templateBreaks.map(b => ({
          startTime: b.startTime,
          endTime: b.endTime,
          label: b.label || undefined
        }))
      };
    }
    
    // Generate time slots
    const timeSlots = this.generateTimeSlots(
      availabilityConfig.startTime!,
      availabilityConfig.endTime!,
      availabilityConfig.breaks,
      slotDurationMinutes
    );
    
    // Convert time slots to availability slots and save to database
    const availabilitySlots: InsertAvailabilitySlot[] = timeSlots.map(slot => {
      const slotTitle = availabilityConfig.reason 
        ? `Available (${availabilityConfig.reason})`
        : 'Available for booking';
      
      return {
        id: nanoid(),
        photographerId,
        title: slotTitle,
        description: `${slot.startTime} - ${slot.endTime}`,
        startAt: this.combineDateTime(date, slot.startTime),
        endAt: this.combineDateTime(date, slot.endTime),
        isBooked: false,
        isRecurring: false,
        sourceTemplateId: availabilityConfig.templateId || null
      };
    });
    
    // Note: Slots are now generated on-demand, no persistence needed
    // The template-based system generates slots dynamically for API requests
  }
  
  /**
   * Generate time slots within a time range, excluding breaks
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    breaks: { startTime: string; endTime: string; label?: string }[],
    slotDurationMinutes: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    // Parse start and end times to minutes since midnight
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    // Generate all possible slots
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotDurationMinutes) {
      const slotEndMinutes = currentMinutes + slotDurationMinutes;
      
      // Skip if slot would extend beyond availability
      if (slotEndMinutes > endMinutes) {
        break;
      }
      
      // Check if this slot conflicts with any breaks
      const hasConflict = breaks.some(breakTime => {
        const breakStartMinutes = this.timeToMinutes(breakTime.startTime);
        const breakEndMinutes = this.timeToMinutes(breakTime.endTime);
        
        // Check if slot overlaps with break
        return !(slotEndMinutes <= breakStartMinutes || currentMinutes >= breakEndMinutes);
      });
      
      // If no conflict, add the slot
      if (!hasConflict) {
        slots.push({
          startTime: this.minutesToTime(currentMinutes),
          endTime: this.minutesToTime(slotEndMinutes)
        });
      }
    }
    
    return slots;
  }
  
  // clearSlotsForDate method removed - slots are now generated on-demand without persistence
  
  /**
   * Regenerate slots for a specific template
   * Called when template or breaks are modified
   */
  async regenerateSlotsForTemplate(templateId: string, daysInFuture: number = 90): Promise<void> {
    const template = await storage.getDailyAvailabilityTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysInFuture);
    
    await this.generateSlotsForDateRange({
      photographerId: template.photographerId,
      startDate,
      endDate
    });
  }
  
  /**
   * Regenerate slots for a specific date (when override is modified)
   */
  async regenerateSlotsForDate(photographerId: string, date: Date): Promise<void> {
    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);
    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      this.formatDate(date),
      this.formatDate(date)
    );
    
    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => {
      overrideMap.set(override.date, override);
    });
    
    await this.generateSlotsForDate(photographerId, date, templates, overrideMap, 60);
  }
  
  /**
   * Get generated time slots for a specific date (on-demand, no persistence)
   * Returns slots in API-friendly format for frontend display
   */
  async getSlotsForDate(photographerId: string, date: Date): Promise<SlotsForDateResult> {
    // Get photographer's timezone for correct conflict checking
    let photographer = await storage.getPhotographer(photographerId);
    const timezone = photographer?.timezone || 'America/New_York';

    // Auto-populate Google Calendar metadata if sync is enabled but metadata is missing
    let calendarMetadata = photographer?.googleCalendarMetadata as Record<string, { name: string; color: string }> | null;
    if (photographer?.googleCalendarSyncEnabled && photographer.googleCalendarIdsToCheck) {
      const calendarIds = photographer.googleCalendarIdsToCheck as string[];
      if (calendarIds.length > 0 && (!calendarMetadata || Object.keys(calendarMetadata).length === 0)) {
        // Metadata is missing, fetch it from Google Calendar API
        const calendarListResult = await googleCalendarService.listCalendars(photographerId);
        if (calendarListResult.success && calendarListResult.calendars) {
          const newMetadata: Record<string, { name: string; color: string }> = {};
          for (const cal of calendarListResult.calendars) {
            if (calendarIds.includes(cal.id)) {
              newMetadata[cal.id] = {
                name: cal.summary || cal.id,
                color: cal.backgroundColor || '#4285f4'
              };
            }
          }
          if (Object.keys(newMetadata).length > 0) {
            // Save the metadata to the photographer record
            await storage.updatePhotographer(photographerId, {
              googleCalendarMetadata: newMetadata
            });
            calendarMetadata = newMetadata;
          }
        }
      }
    }

    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);

    // Fetch all breaks once (batched query) instead of per-template (N+1)
    const allBreaks = await storage.getDailyAvailabilityBreaksByPhotographer(photographerId);
    const breaksMap = new Map<string, { startTime: string; endTime: string; label?: string }[]>();
    for (const breakItem of allBreaks) {
      if (!breaksMap.has(breakItem.templateId)) {
        breaksMap.set(breakItem.templateId, []);
      }
      breaksMap.get(breakItem.templateId)!.push({
        startTime: breakItem.startTime,
        endTime: breakItem.endTime,
        label: breakItem.label || undefined
      });
    }

    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      this.formatDate(date),
      this.formatDate(date)
    );

    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => {
      overrideMap.set(override.date, override);
    });

    // Generate slots without persistence
    const dateString = this.formatDate(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if there's an override for this date
    const override = overrideMap.get(dateString);
    
    let availabilityConfig: {
      startTime?: string;
      endTime?: string;
      templateId?: string;
      breaks: { startTime: string; endTime: string; label?: string }[];
      reason?: string;
    };
    
    // Helper to return empty result with metadata
    const emptyResult = (): SlotsForDateResult => ({
      slots: [],
      googleCalendarMetadata: calendarMetadata
    });

    if (override) {
      // Use override configuration - null startTime/endTime means closed day
      if (!override.startTime || !override.endTime) {
        // Day is closed due to override
        return emptyResult();
      }

      availabilityConfig = {
        startTime: override.startTime,
        endTime: override.endTime,
        breaks: (override.breaks as any) || [], // Parse JSON breaks array
        reason: override.reason || undefined
      };
    } else {
      // Find template for this day of week
      const template = templates.find(t => t.dayOfWeek === dayOfWeek);
      if (!template) {
        // No template for this day, return empty
        return emptyResult();
      }

      // Check if template is enabled
      if (!template.isEnabled || !template.startTime || !template.endTime) {
        return emptyResult();
      }

      // Get breaks for this template from the pre-fetched map (O(1) lookup)
      const templateBreaks = breaksMap.get(template.id) || [];

      availabilityConfig = {
        startTime: template.startTime,
        endTime: template.endTime,
        templateId: template.id,
        breaks: templateBreaks
      };
    }
    
    // Generate time slots
    const timeSlots = this.generateTimeSlots(
      availabilityConfig.startTime!,
      availabilityConfig.endTime!,
      availabilityConfig.breaks,
      60 // 1 hour duration
    );
    
    // Get existing bookings for this date to filter out booked slots
    // Use photographer's timezone to correctly match dates
    const existingBookings = await storage.getBookingsByPhotographer(photographerId);
    const dateBookings = existingBookings.filter(booking => {
      const bookingDate = getDateInTimezone(booking.startAt, timezone);
      return bookingDate === dateString;
    });

    // Get Google Calendar busy times if sync is enabled (with caching)
    let googleBusyTimes: Array<{ start: Date; end: Date; calendarId: string }> = [];
    let googleCalendarError: string | undefined;
    if (photographer?.googleCalendarSyncEnabled && photographer.googleCalendarIdsToCheck) {
      const calendarIds = photographer.googleCalendarIdsToCheck as string[];
      if (calendarIds.length > 0) {
        const cacheKey = getCacheKey(photographerId, dateString);
        const cached = googleBusyCache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
          // Use cached busy times
          googleBusyTimes = cached.busyTimes;
        } else {
          // Fetch from Google Calendar API
          const startOfDay = createDateInTimezone(dateString, '00:00', timezone);
          const endOfDay = createDateInTimezone(dateString, '23:59', timezone);

          const busyResult = await googleCalendarService.getBusyTimes(
            photographerId,
            calendarIds,
            startOfDay,
            endOfDay
          );

          if (busyResult.success && busyResult.busyTimes) {
            googleBusyTimes = busyResult.busyTimes.map(bt => ({
              start: bt.start,
              end: bt.end,
              calendarId: bt.calendarId
            }));

            // Cache the result
            googleBusyCache.set(cacheKey, {
              busyTimes: googleBusyTimes,
              expiresAt: Date.now() + getCacheTTL(dateString)
            });
          } else if (!busyResult.success) {
            // Log error but continue - slots will show as available
            console.error(`Google Calendar API error for photographer ${photographerId}:`, busyResult.error);
            googleCalendarError = busyResult.error || 'Failed to fetch Google Calendar busy times';
          }
        }
      }
    }

    // Convert to API format and mark slots as available or booked
    const allSlots = timeSlots
      .map(slot => {
        // Check if this slot conflicts with any existing booking
        // Use photographer's timezone for correct comparison with UTC-stored bookings
        const slotStart = createDateInTimezone(dateString, slot.startTime, timezone);
        const slotEnd = createDateInTimezone(dateString, slot.endTime, timezone);

        // Check if any CRM booking overlaps with this slot
        const hasCrmConflict = dateBookings.some(booking => {
          const bookingStart = new Date(booking.startAt);
          const bookingEnd = new Date(booking.endAt);
          return (slotStart < bookingEnd && slotEnd > bookingStart);
        });

        // Find which Google Calendar events overlap with this slot
        const blockingCalendarIds = googleBusyTimes
          .filter(busy => slotStart < busy.end && slotEnd > busy.start)
          .map(busy => busy.calendarId);
        const hasGoogleConflict = blockingCalendarIds.length > 0;

        // Get unique calendar IDs that block this slot
        const uniqueBlockingCalendarIds = Array.from(new Set(blockingCalendarIds));

        return {
          id: `slot-${slot.startTime}-${slot.endTime}`,
          date: dateString,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: !hasCrmConflict && !hasGoogleConflict,
          photographerId,
          blockedByGoogle: hasGoogleConflict && !hasCrmConflict, // Indicate if blocked by Google Calendar
          blockedByCalendars: uniqueBlockingCalendarIds.length > 0 ? uniqueBlockingCalendarIds : undefined
        };
      });

    return {
      slots: allSlots,
      googleCalendarMetadata: calendarMetadata,
      googleCalendarError
    };
  }

  /**
   * Get slots for a date range with batched queries (optimized for week/day views)
   * Makes only O(1) database calls instead of O(n) per date
   */
  async getSlotsForDateRange(
    photographerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SlotsForDateRangeResult> {
    const startDateStr = this.formatDate(startDate);
    const endDateStr = this.formatDate(endDate);

    // === BATCH ALL DATA FETCHES ===

    // 1. Get photographer (once)
    let photographer = await storage.getPhotographer(photographerId);
    const timezone = photographer?.timezone || 'America/New_York';

    // 2. Auto-populate Google Calendar metadata if needed (once)
    let calendarMetadata = photographer?.googleCalendarMetadata as Record<string, { name: string; color: string }> | null;
    if (photographer?.googleCalendarSyncEnabled && photographer.googleCalendarIdsToCheck) {
      const calendarIds = photographer.googleCalendarIdsToCheck as string[];
      if (calendarIds.length > 0 && (!calendarMetadata || Object.keys(calendarMetadata).length === 0)) {
        const calendarListResult = await googleCalendarService.listCalendars(photographerId);
        if (calendarListResult.success && calendarListResult.calendars) {
          const newMetadata: Record<string, { name: string; color: string }> = {};
          for (const cal of calendarListResult.calendars) {
            if (calendarIds.includes(cal.id)) {
              newMetadata[cal.id] = {
                name: cal.summary || cal.id,
                color: cal.backgroundColor || '#4285f4'
              };
            }
          }
          if (Object.keys(newMetadata).length > 0) {
            await storage.updatePhotographer(photographerId, { googleCalendarMetadata: newMetadata });
            calendarMetadata = newMetadata;
          }
        }
      }
    }

    // 3. Get all templates (once)
    const templates = await storage.getDailyAvailabilityTemplatesByPhotographer(photographerId);

    // 4. Get all breaks for all templates (once, batched - single query)
    const allBreaks = await storage.getDailyAvailabilityBreaksByPhotographer(photographerId);
    const allBreaksMap = new Map<string, { startTime: string; endTime: string; label?: string }[]>();
    for (const breakItem of allBreaks) {
      if (!allBreaksMap.has(breakItem.templateId)) {
        allBreaksMap.set(breakItem.templateId, []);
      }
      allBreaksMap.get(breakItem.templateId)!.push({
        startTime: breakItem.startTime,
        endTime: breakItem.endTime,
        label: breakItem.label || undefined
      });
    }

    // 5. Get all overrides for the range (once)
    const overrides = await storage.getDailyAvailabilityOverridesByPhotographer(
      photographerId,
      startDateStr,
      endDateStr
    );
    const overrideMap = new Map<string, DailyAvailabilityOverride>();
    overrides.forEach(override => overrideMap.set(override.date, override));

    // 6. Get bookings for the date range (once, filtered by date)
    const allBookings = await storage.getBookingsByPhotographerInRange(photographerId, startDateStr, endDateStr);

    // 7. Get Google Calendar busy times AND actual events for entire range (once)
    let googleBusyTimes: Array<{ start: Date; end: Date; calendarId: string }> = [];
    let googleCalendarEvents: GoogleCalendarEvent[] = [];
    let googleCalendarError: string | undefined;
    if (photographer?.googleCalendarSyncEnabled && photographer.googleCalendarIdsToCheck) {
      const calendarIds = photographer.googleCalendarIdsToCheck as string[];
      if (calendarIds.length > 0) {
        const rangeStart = createDateInTimezone(startDateStr, '00:00', timezone);
        const rangeEnd = createDateInTimezone(endDateStr, '23:59', timezone);

        // Fetch busy times (for blocking slots) - keep this for backward compat
        const busyResult = await googleCalendarService.getBusyTimes(
          photographerId,
          calendarIds,
          rangeStart,
          rangeEnd
        );

        if (busyResult.success && busyResult.busyTimes) {
          googleBusyTimes = busyResult.busyTimes.map(bt => ({
            start: bt.start,
            end: bt.end,
            calendarId: bt.calendarId
          }));
        } else if (!busyResult.success) {
          console.error(`Google Calendar API error for photographer ${photographerId}:`, busyResult.error);
          googleCalendarError = busyResult.error || 'Failed to fetch Google Calendar busy times';
        }

        // Fetch actual events with titles (for display on calendar)
        const eventsResult = await googleCalendarService.getCalendarEvents(
          photographerId,
          calendarIds,
          rangeStart,
          rangeEnd
        );

        if (eventsResult.success && eventsResult.events) {
          googleCalendarEvents = eventsResult.events.map(evt => ({
            id: evt.id,
            calendarId: evt.calendarId,
            title: evt.title,
            description: evt.description,
            location: evt.location,
            start: evt.start.toISOString(),
            end: evt.end.toISOString(),
            htmlLink: evt.htmlLink,
            isAllDay: evt.isAllDay,
          }));
        }
      }
    }

    // === PROCESS EACH DATE IN MEMORY ===

    const result: Record<string, ApiSlot[]> = {};
    let earliestStartTime: string | undefined;
    let latestEndTime: string | undefined;

    // Iterate through each date in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = this.formatDate(currentDate);
      const dayOfWeek = currentDate.getDay();

      // Check for override
      const override = overrideMap.get(dateStr);

      let availabilityConfig: {
        startTime?: string;
        endTime?: string;
        breaks: { startTime: string; endTime: string; label?: string }[];
      } | null = null;

      if (override) {
        if (override.startTime && override.endTime) {
          availabilityConfig = {
            startTime: override.startTime,
            endTime: override.endTime,
            breaks: (override.breaks as any) || []
          };
        }
        // If no start/end time, day is closed - leave availabilityConfig as null
      } else {
        // Find template for this day
        const template = templates.find(t => t.dayOfWeek === dayOfWeek);
        if (template?.isEnabled && template.startTime && template.endTime) {
          availabilityConfig = {
            startTime: template.startTime,
            endTime: template.endTime,
            breaks: allBreaksMap.get(template.id) || []
          };
        }
      }

      if (!availabilityConfig) {
        // Day is closed
        result[dateStr] = [];
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Track earliest/latest times for calendar bounds
      if (!earliestStartTime || availabilityConfig.startTime! < earliestStartTime) {
        earliestStartTime = availabilityConfig.startTime;
      }
      if (!latestEndTime || availabilityConfig.endTime! > latestEndTime) {
        latestEndTime = availabilityConfig.endTime;
      }

      // Generate time slots
      const timeSlots = this.generateTimeSlots(
        availabilityConfig.startTime!,
        availabilityConfig.endTime!,
        availabilityConfig.breaks,
        60
      );

      // Filter bookings for this date (excluding cancelled bookings and meetings/consultations)
      // Meetings and consultations don't block availability - only actual sessions do
      const dateBookings = allBookings.filter(booking => {
        if (booking.status === 'CANCELLED') return false;
        // Don't block availability for meetings/consultations (phone/video calls)
        if (booking.bookingType === 'CONSULTATION' || booking.bookingType === 'MEETING') return false;
        const bookingDate = getDateInTimezone(booking.startAt, timezone);
        return bookingDate === dateStr;
      });

      // Filter Google busy times for this date
      const dayStart = createDateInTimezone(dateStr, '00:00', timezone);
      const dayEnd = createDateInTimezone(dateStr, '23:59', timezone);
      const dateBusyTimes = googleBusyTimes.filter(busy =>
        busy.start < dayEnd && busy.end > dayStart
      );

      // Convert to API format
      const slots = timeSlots.map(slot => {
        const slotStart = createDateInTimezone(dateStr, slot.startTime, timezone);
        const slotEnd = createDateInTimezone(dateStr, slot.endTime, timezone);

        const hasCrmConflict = dateBookings.some(booking => {
          const bookingStart = new Date(booking.startAt);
          const bookingEnd = new Date(booking.endAt);
          return slotStart < bookingEnd && slotEnd > bookingStart;
        });

        const blockingCalendarIds = dateBusyTimes
          .filter(busy => slotStart < busy.end && slotEnd > busy.start)
          .map(busy => busy.calendarId);
        const hasGoogleConflict = blockingCalendarIds.length > 0;
        const uniqueBlockingCalendarIds = Array.from(new Set(blockingCalendarIds));

        return {
          id: `slot-${dateStr}-${slot.startTime}-${slot.endTime}`,
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isAvailable: !hasCrmConflict && !hasGoogleConflict,
          photographerId,
          blockedByGoogle: hasGoogleConflict && !hasCrmConflict,
          blockedByCalendars: uniqueBlockingCalendarIds.length > 0 ? uniqueBlockingCalendarIds : undefined
        };
      });

      result[dateStr] = slots;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      slots: result,
      googleCalendarMetadata: calendarMetadata,
      googleCalendarError,
      googleCalendarEvents: googleCalendarEvents.length > 0 ? googleCalendarEvents : undefined,
      earliestStartTime,
      latestEndTime
    };
  }

  /**
   * Batch insert availability slots for better performance
   */
  private async batchInsertSlots(slots: InsertAvailabilitySlot[]): Promise<void> {
    // Insert all slots in a single bulk operation for optimal performance
    await storage.createAvailabilitySlotsBatch(slots);
  }

  // Utility methods
  
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

// Export singleton instance
export const slotGenerationService = new SlotGenerationService();