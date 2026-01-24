import { useState, useCallback, useMemo, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Setup date-fns localizer for react-big-calendar
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type GoogleCalendarMetadata = Record<string, { name: string; color: string }>;

type TimeSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  photographerId: string;
  blockedByGoogle?: boolean;
  blockedByCalendars?: string[];
};

type BookingData = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  bookingType: "CONSULTATION" | "ENGAGEMENT" | "WEDDING" | "MEETING" | null;
  clientName: string | null;
  clientEmail: string | null;
  googleMeetLink: string | null;
};

type PaymentDue = {
  id: string;
  dueDate: string;
  amountCents: number;
  description: string;
  status: string;
  clientName: string;
  projectId: string;
  smartFileInstanceId: string;
};

type GoogleCalendarEventData = {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO string
  end: string; // ISO string
  htmlLink?: string;
  isAllDay: boolean;
};

type SlotsRangeResponse = {
  slots: Record<string, TimeSlot[]>;
  googleCalendarMetadata: GoogleCalendarMetadata | null;
  googleCalendarError?: string;
  googleCalendarEvents?: GoogleCalendarEventData[];
  earliestStartTime?: string;
  latestEndTime?: string;
  bookings?: BookingData[];
  paymentsDue?: PaymentDue[];
};

export type DayOverride = {
  id: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  photographerId: string;
};

// Calendar event categories matching HoneyBook style
type EventCategory =
  | "session"
  | "meeting"
  | "tentative"
  | "payment"
  | "google"
  | "blocked"
  | "custom-hours";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource: {
    category: EventCategory;
    isAvailable?: boolean;
    blockedByGoogle?: boolean;
    blockedByCalendars?: string[];
    slot?: TimeSlot;
    booking?: BookingData;
    payment?: PaymentDue;
    override?: DayOverride;
    googleCalendarColor?: string;
    googleCalendarName?: string;
    googleCalendarEvent?: GoogleCalendarEventData;
  };
}

interface SchedulingCalendarProps {
  view: "month" | "week" | "day";
  /** Callback when view changes */
  onViewChange?: (view: "month" | "week" | "day") => void;
  /** Initial date to display (uncontrolled mode) */
  initialDate?: Date;
  /** Controlled date - when provided, component is in controlled mode */
  currentDate?: Date;
  /** Callback when date changes (for controlled mode) */
  onDateChange?: (date: Date) => void;
  /** Whether to show the built-in toolbar (default: true) */
  showToolbar?: boolean;
  onSlotClick?: (slot: TimeSlot) => void;
  /** Callback when clicking on a blocked/custom hours override */
  onOverrideClick?: (override: DayOverride) => void;
}

// Custom header component with proper row structure (replaces react-big-calendar's header)
interface CustomWeekHeaderProps {
  currentDate: Date;
  view: "week" | "day";
}

const CustomWeekHeader = ({ currentDate, view }: CustomWeekHeaderProps) => {
  // Calculate the days to display based on view and currentDate
  const days =
    view === "day"
      ? [currentDate]
      : Array.from({ length: 7 }, (_, i) =>
          addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i),
        );

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="custom-week-header">
      {/* Row 1: Day labels */}
      <div className="header-row">
        <div className="gutter-cell" />
        {days.map((day, i) => (
          <div key={i} className={`day-cell ${isToday(day) ? "today" : ""}`}>
            {format(day, "EEE d")}
          </div>
        ))}
      </div>
      {/* All-day events row is now handled by react-big-calendar's native .rbc-allday-cell */}
    </div>
  );
};

export function SchedulingCalendar({
  view,
  onViewChange,
  initialDate,
  currentDate: controlledDate,
  onDateChange,
  showToolbar = true,
  onSlotClick,
  onOverrideClick,
}: SchedulingCalendarProps) {
  const [internalDate, setInternalDate] = useState(initialDate || new Date());

  // Use controlled date if provided, otherwise use internal state
  const currentDate = controlledDate ?? internalDate;
  const setCurrentDate = useCallback(
    (dateOrFn: Date | ((prev: Date) => Date)) => {
      if (typeof dateOrFn === "function") {
        const newDate = dateOrFn(controlledDate ?? internalDate);
        if (onDateChange) {
          onDateChange(newDate);
        } else {
          setInternalDate(newDate);
        }
      } else {
        if (onDateChange) {
          onDateChange(dateOrFn);
        } else {
          setInternalDate(dateOrFn);
        }
      }
    },
    [controlledDate, internalDate, onDateChange],
  );

  // Sync with initialDate when it changes (only in uncontrolled mode)
  useEffect(() => {
    if (initialDate && !controlledDate) {
      setInternalDate(initialDate);
    }
  }, [initialDate, controlledDate]);

  // Calculate date range based on view
  const { startDate, endDate } = useMemo(() => {
    if (view === "day") {
      const start = startOfDay(currentDate);
      return {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(start, "yyyy-MM-dd"),
      };
    } else if (view === "week") {
      // Week view - get start of week (Sunday)
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      return {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      };
    } else {
      // Month view - get full month
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return {
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      };
    }
  }, [currentDate, view]);

  // Fetch slots for the date range
  const {
    data: slotsResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/availability/slots-range", startDate, endDate],
    queryFn: async (): Promise<SlotsRangeResponse> => {
      const response = await apiRequest(
        "GET",
        `/api/availability/slots-range?startDate=${startDate}&endDate=${endDate}`,
      );
      return response.json();
    },
  });

  // Fetch overrides for the date range (blocked days and custom hours)
  const { data: overrides = [] } = useQuery({
    queryKey: ["/api/availability/overrides", startDate, endDate],
    queryFn: async (): Promise<DayOverride[]> => {
      const response = await apiRequest(
        "GET",
        `/api/availability/overrides?startDate=${startDate}&endDate=${endDate}`,
      );
      return response.json();
    },
  });

  const googleCalendarMetadata = slotsResponse?.googleCalendarMetadata;

  // Show all 24 hours of the day for week/day views
  const minTime = new Date(1970, 0, 1, 0, 0, 0); // 12:00 AM (midnight)
  const maxTime = new Date(1970, 0, 1, 23, 59, 0); // 11:59 PM

  // Transform bookings and payments to calendar events
  // HoneyBook-style categories: session (blue), meeting (orange), tentative (cyan), payment (green), google (red)
  const events: CalendarEvent[] = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // Add booking events with categories
    if (slotsResponse?.bookings) {
      slotsResponse.bookings.forEach((booking) => {
        // Skip cancelled bookings
        if (booking.status === "CANCELLED") return;

        const startDateTime = new Date(booking.startAt);
        const endDateTime = new Date(booking.endAt);

        // Determine category based on status and type
        let category: EventCategory;
        let title: string;

        if (booking.status === "PENDING") {
          category = "tentative";
          title = booking.clientName || "Tentative";
        } else if (
          booking.bookingType === "CONSULTATION" ||
          booking.bookingType === "MEETING"
        ) {
          category = "meeting";
          title = booking.clientName || "Meeting";
        } else {
          category = "session";
          title = booking.clientName || "Session";
        }

        allEvents.push({
          id: `booking-${booking.id}`,
          title,
          start: startDateTime,
          end: endDateTime,
          resource: {
            category,
            booking,
          },
        });
      });
    }

    // Add Google Calendar events (using actual event data with titles)
    if (
      slotsResponse?.googleCalendarEvents &&
      slotsResponse.googleCalendarEvents.length > 0
    ) {
      // Use actual Google Calendar events with real titles and times
      slotsResponse.googleCalendarEvents.forEach((gcalEvent) => {
        const calendarInfo = googleCalendarMetadata?.[gcalEvent.calendarId];
        const calendarColor = calendarInfo?.color || "#ef4444";
        const calendarName = calendarInfo?.name || "Google Calendar";

        const startDate = new Date(gcalEvent.start);
        const endDate = new Date(gcalEvent.end);

        allEvents.push({
          id: `gcal-${gcalEvent.id}`,
          title: gcalEvent.title,
          start: startDate,
          end: endDate,
          allDay: gcalEvent.isAllDay,
          resource: {
            category: "google",
            blockedByGoogle: true,
            blockedByCalendars: [gcalEvent.calendarId],
            googleCalendarColor: calendarColor,
            googleCalendarName: calendarName,
            googleCalendarEvent: gcalEvent,
          },
        });
      });
    } else if (slotsResponse?.slots) {
      // Fallback: derive events from blocked slots (legacy behavior)
      // Group consecutive blocked slots by calendar to show as single events
      if (googleCalendarMetadata) {
        Object.entries(slotsResponse.slots).forEach(([dateStr, slots]) => {
          const blockedSlots = slots.filter(
            (slot) => slot.blockedByGoogle && slot.blockedByCalendars?.length,
          );
          const processedSlotIds = new Set<string>();

          blockedSlots.forEach((slot, index) => {
            if (processedSlotIds.has(slot.id)) return;

            const calendarIds = slot.blockedByCalendars || [];
            const primaryCalendarId = calendarIds[0];
            const calendarInfo = googleCalendarMetadata[primaryCalendarId];

            let endSlot = slot;
            for (let i = index + 1; i < blockedSlots.length; i++) {
              const nextSlot = blockedSlots[i];
              if (
                nextSlot.startTime === endSlot.endTime &&
                nextSlot.blockedByCalendars?.includes(primaryCalendarId)
              ) {
                processedSlotIds.add(nextSlot.id);
                endSlot = nextSlot;
              } else {
                break;
              }
            }
            processedSlotIds.add(slot.id);

            const [startHour, startMinute] = slot.startTime
              .split(":")
              .map(Number);
            const [endHour, endMinute] = endSlot.endTime.split(":").map(Number);
            const [year, month, day] = dateStr.split("-").map(Number);

            const startDateTime = new Date(
              year,
              month - 1,
              day,
              startHour,
              startMinute,
              0,
              0,
            );
            const endDateTime = new Date(
              year,
              month - 1,
              day,
              endHour,
              endMinute,
              0,
              0,
            );

            const calendarName = calendarInfo?.name || "Google Calendar";
            const calendarColor = calendarInfo?.color || "#ef4444";

            allEvents.push({
              id: `gcal-${slot.id}-${primaryCalendarId}`,
              title: calendarName,
              start: startDateTime,
              end: endDateTime,
              resource: {
                category: "google",
                blockedByGoogle: true,
                blockedByCalendars: calendarIds,
                slot,
                googleCalendarColor: calendarColor,
                googleCalendarName: calendarName,
              },
            });
          });
        });
      } else {
        // No metadata - show generic Google Calendar events
        Object.entries(slotsResponse.slots).forEach(([dateStr, slots]) => {
          slots.forEach((slot) => {
            if (!slot.blockedByGoogle) return;

            const [startHour, startMinute] = slot.startTime
              .split(":")
              .map(Number);
            const [endHour, endMinute] = slot.endTime.split(":").map(Number);
            const [year, month, day] = dateStr.split("-").map(Number);

            const startDateTime = new Date(
              year,
              month - 1,
              day,
              startHour,
              startMinute,
              0,
              0,
            );
            const endDateTime = new Date(
              year,
              month - 1,
              day,
              endHour,
              endMinute,
              0,
              0,
            );

            allEvents.push({
              id: slot.id,
              title: "Google Calendar",
              start: startDateTime,
              end: endDateTime,
              resource: {
                category: "google",
                blockedByGoogle: true,
                blockedByCalendars: slot.blockedByCalendars,
                slot,
              },
            });
          });
        });
      }
    }

    // Add payment due dates as all-day events
    if (slotsResponse?.paymentsDue) {
      slotsResponse.paymentsDue.forEach((payment) => {
        const dueDate = new Date(payment.dueDate);
        // Set to start of day for all-day event
        const startOfDayDate = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
        );

        const amount = (payment.amountCents / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });
        const title = `${payment.clientName}: ${amount}`;

        allEvents.push({
          id: `payment-${payment.id}`,
          title,
          start: startOfDayDate,
          end: startOfDayDate,
          allDay: true,
          resource: {
            category: "payment",
            payment,
          },
        });
      });
    }

    // Add blocked time / custom hours override events
    overrides.forEach((override) => {
      const [year, month, day] = override.date.split("-").map(Number);
      const eventDate = new Date(year, month - 1, day);

      // Helper to format time for display
      const formatTimeDisplay = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        const ampm = hours >= 12 ? "pm" : "am";
        const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return minutes === 0
          ? `${displayHour}${ampm}`
          : `${displayHour}:${minutes.toString().padStart(2, "0")}${ampm}`;
      };

      if (!override.startTime) {
        // Fully blocked day - all-day event
        allEvents.push({
          id: `blocked-${override.id}`,
          title: (override as any).reason || "Time Off",
          start: eventDate,
          end: eventDate,
          allDay: true,
          resource: {
            category: "blocked",
            override,
          },
        });
      } else if (override.startTime && override.endTime) {
        // Custom hours - show as a positive AVAILABILITY indicator
        // Shows when the photographer IS available (positive framing per UI/UX audit)
        const [customStartHour, customStartMin] = override.startTime
          .split(":")
          .map(Number);
        const [customEndHour, customEndMin] = override.endTime
          .split(":")
          .map(Number);

        allEvents.push({
          id: `custom-${override.id}`,
          title: `Open ${formatTimeDisplay(override.startTime)}-${formatTimeDisplay(override.endTime)}`,
          start: new Date(
            year,
            month - 1,
            day,
            customStartHour,
            customStartMin,
          ),
          end: new Date(year, month - 1, day, customEndHour, customEndMin),
          allDay: false,
          resource: {
            category: "custom-hours",
            override,
          },
        });
      }
    });

    return allEvents;
  }, [slotsResponse, overrides]);

  // Style day cells based on overrides (blocked days / custom hours)
  const dayPropGetter = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const override = overrides.find((o) => o.date === dateStr);

      if (!override) return {};

      // Blocked day (no startTime means fully blocked)
      if (!override.startTime) {
        return {
          className: "blocked-day",
          style: {
            backgroundColor: "rgb(254 243 199)", // amber-100
          },
        };
      }

      // Custom hours (has startTime) - green tint matches availability theme
      return {
        className: "custom-hours-day",
        style: {
          backgroundColor: "rgb(220 252 231)", // green-100 (matches availability indicator)
        },
      };
    },
    [overrides],
  );

  // Navigate to previous/next period
  const handleNavigate = useCallback(
    (direction: "prev" | "next" | "today") => {
      setCurrentDate((prev) => {
        if (direction === "today") {
          return new Date();
        }
        if (view === "month") {
          return addMonths(prev, direction === "prev" ? -1 : 1);
        }
        const days = view === "day" ? 1 : 7;
        const offset = direction === "prev" ? -days : days;
        return addDays(prev, offset);
      });
    },
    [view],
  );

  // Handle clicking on an event
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      // Handle blocked/custom-hours override clicks
      if (
        (event.resource.category === "blocked" ||
          event.resource.category === "custom-hours") &&
        event.resource.override
      ) {
        onOverrideClick?.(event.resource.override);
        return;
      }
      // Only call onSlotClick if this event has a slot (Google Calendar events)
      if (event.resource.slot) {
        onSlotClick?.(event.resource.slot);
      }
      // TODO: Could add onBookingClick or onPaymentClick callbacks for other event types
    },
    [onSlotClick, onOverrideClick],
  );

  // Custom event component with styling
  const EventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => {
      const {
        blockedByGoogle,
        blockedByCalendars,
        googleCalendarEvent,
        googleCalendarName,
        googleCalendarColor,
      } = event.resource;

      // If it's a Google Calendar event with full details
      if (blockedByGoogle && googleCalendarEvent) {
        const formatEventTime = (isoStr: string) => {
          const date = new Date(isoStr);
          return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
        };

        return (
          <Popover>
            <PopoverTrigger asChild>
              <div className="h-full w-full flex items-center gap-1 px-1 cursor-pointer">
                <span className="text-[10px] font-medium truncate">
                  {event.title}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              {/* Header with calendar color */}
              <div
                className="px-4 py-3 rounded-t-md"
                style={{ backgroundColor: googleCalendarColor || "#4285f4" }}
              >
                <p className="font-semibold text-white text-sm truncate">
                  {googleCalendarEvent.title}
                </p>
                <p className="text-white/80 text-xs">
                  {googleCalendarName || "Google Calendar"}
                </p>
              </div>
              {/* Event details */}
              <div className="p-4 space-y-3">
                {/* Time */}
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm">
                    {googleCalendarEvent.isAllDay ? (
                      <span>All day</span>
                    ) : (
                      <span>
                        {formatEventTime(googleCalendarEvent.start)} -{" "}
                        {formatEventTime(googleCalendarEvent.end)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Location */}
                {googleCalendarEvent.location && (
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground truncate">
                      {googleCalendarEvent.location}
                    </p>
                  </div>
                )}
                {/* Description */}
                {googleCalendarEvent.description && (
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h7"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {googleCalendarEvent.description}
                    </p>
                  </div>
                )}
                {/* Open in Google Calendar link */}
                {googleCalendarEvent.htmlLink && (
                  <a
                    href={googleCalendarEvent.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline mt-2"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15H6v-4.5h4.5V18zm0-6H6v-4.5h4.5V12zm6 6h-4.5v-4.5H16.5V18zm0-6h-4.5v-4.5H16.5V12z" />
                    </svg>
                    Open in Google Calendar
                  </a>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      // Legacy Google Calendar events (from busy times, no event details)
      if (
        blockedByGoogle &&
        blockedByCalendars &&
        blockedByCalendars.length > 0 &&
        googleCalendarMetadata
      ) {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <div className="h-full w-full flex items-center gap-1 px-1 cursor-pointer">
                <span className="text-[10px] font-medium truncate">
                  {event.title}
                </span>
                <span className="flex gap-0.5 flex-shrink-0">
                  {blockedByCalendars.slice(0, 3).map((calId) => {
                    const cal = googleCalendarMetadata[calId];
                    return (
                      <span
                        key={calId}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cal?.color || "#4285f4" }}
                      />
                    );
                  })}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <p className="font-medium text-sm mb-2">Blocked by:</p>
              <div className="space-y-1.5">
                {blockedByCalendars.map((calId) => {
                  const cal = googleCalendarMetadata[calId];
                  return (
                    <div
                      key={calId}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cal?.color || "#4285f4" }}
                      />
                      <span>{cal?.name || calId}</span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      return (
        <div className="h-full w-full flex items-center px-1">
          <span className="text-[10px] font-medium truncate">
            {event.title}
          </span>
        </div>
      );
    },
    [googleCalendarMetadata],
  );

  // Custom styling for events based on category
  // HoneyBook colors: session (blue), meeting (orange), tentative (cyan), payment (green), google (calendar color)
  // Visual hierarchy: Real bookings (solid) > System events > Availability indicators (dashed, subtle)
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { category, googleCalendarColor } = event.resource;

    const categoryColors: Record<
      EventCategory,
      { bg: string; border: string }
    > = {
      session: { bg: "#3b82f6", border: "#2563eb" }, // Blue - Booked sessions
      meeting: { bg: "#f97316", border: "#ea580c" }, // Orange - Meetings/consultations
      tentative: { bg: "#06b6d4", border: "#0891b2" }, // Cyan - Pending/tentative
      payment: { bg: "#22c55e", border: "#16a34a" }, // Green - Payment due
      google: { bg: "#ef4444", border: "#dc2626" }, // Red - Google Calendar (fallback)
      blocked: { bg: "#f59e0b", border: "#d97706" }, // Amber - Time Off / Blocked
      "custom-hours": { bg: "#86efac", border: "#4ade80" }, // Muted green - Available hours
    };

    // Custom hours get special styling - lower visual weight (indicator, not real event)
    if (category === "custom-hours") {
      return {
        style: {
          backgroundColor: "rgba(134, 239, 172, 0.6)", // Muted green, semi-transparent
          borderColor: "#4ade80",
          borderWidth: "1px",
          borderStyle: "dashed", // Dashed border = indicator, not a real booking
          borderRadius: "4px",
          color: "#166534", // Dark green text for contrast
          fontSize: "11px",
        },
      };
    }

    // For Google Calendar events, use the actual calendar color if available
    let colors = categoryColors[category] || categoryColors.session;
    if (category === "google" && googleCalendarColor) {
      // Darken the color slightly for border
      colors = {
        bg: googleCalendarColor,
        border: googleCalendarColor,
      };
    }

    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "4px",
        color: "white",
        fontSize: "11px",
      },
    };
  }, []);

  // Format header for the current view
  const headerText = useMemo(() => {
    if (view === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      if (format(weekStart, "MMM") === format(weekEnd, "MMM")) {
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      // Month view
      return format(currentDate, "MMMM yyyy");
    }
  }, [currentDate, view]);

  return (
    <div className="h-full flex flex-col">
      {/* Custom Navigation Header - only show if showToolbar is true */}
      {showToolbar && (
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("today")}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNavigate("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold">{headerText}</h2>
          {onViewChange && (
            <Select
              value={view}
              onValueChange={(v) => onViewChange(v as "month" | "week" | "day")}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Failed to load availability. Please try again.</span>
        </div>
      )}

      {/* Google Calendar Error Warning */}
      {slotsResponse?.googleCalendarError && (
        <div className="flex items-center gap-2 p-2 mb-4 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
          <span>
            Google Calendar sync error - some slots may show as available when
            blocked
          </span>
        </div>
      )}

      {/* Loading State - Skeleton Calendar */}
      {isLoading ? (
        <div className="flex-1 min-h-[500px]">
          {/* Skeleton header row */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="h-8 bg-muted/50 rounded flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">{day}</span>
              </div>
            ))}
          </div>
          {/* Skeleton grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        /* Calendar */
        <div
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          {/* Single scroll container for header + time slots - ensures columns align */}
          <div
            style={{ flex: 1, overflow: "auto" }}
            className="calendar-scroll-container"
          >
            {/* Custom header for week/day views with proper row structure */}
            {(view === "week" || view === "day") && (
              <CustomWeekHeader currentDate={currentDate} view={view} />
            )}
            <Calendar
              localizer={localizer}
              events={events}
              view={view}
              views={["month", "week", "day"]}
              onView={(newView) => {
                if (
                  onViewChange &&
                  (newView === "month" ||
                    newView === "week" ||
                    newView === "day")
                ) {
                  onViewChange(newView);
                }
              }}
              date={currentDate}
              onNavigate={setCurrentDate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              components={{
                event: EventComponent,
              }}
              formats={{
                dayFormat: (date: Date) => format(date, "EEE d"),
                timeGutterFormat: (date: Date) => format(date, "h a"),
              }}
              toolbar={false}
              min={minTime}
              max={maxTime}
              step={60}
              timeslots={1}
              className="scheduling-calendar"
            />
          </div>
        </div>
      )}

      {/* Custom CSS for react-big-calendar */}
      <style>{`
        /* CSS variable for gutter width - must match between header and calendar */
        .custom-week-header,
        .scheduling-calendar {
          --gutter-width: 58px;
        }
        .scheduling-calendar {
          font-family: inherit;
          height: 100%;
          flex: 1;
        }
        .scheduling-calendar .rbc-header {
          padding: 8px 4px;
          font-weight: 500;
          font-size: 12px;
          border-bottom: 1px solid var(--border);
          background: hsl(var(--muted) / 0.3);
        }
        /* Month view styles */
        .scheduling-calendar .rbc-month-view {
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .scheduling-calendar .rbc-month-row {
          border-bottom: 1px solid var(--border);
          min-height: 80px;
        }
        .scheduling-calendar .rbc-month-row:last-child {
          border-bottom: none;
        }
        .scheduling-calendar .rbc-date-cell {
          padding: 4px 8px;
          text-align: right;
          font-size: 12px;
        }
        .scheduling-calendar .rbc-off-range {
          color: hsl(var(--muted-foreground) / 0.3);
        }
        .scheduling-calendar .rbc-off-range-bg {
          background: hsl(var(--muted) / 0.5);
          opacity: 0.5;
        }
        /* Month view: full cell borders (vertical + horizontal) */
        .scheduling-calendar .rbc-month-view .rbc-day-bg {
          border-right: 1px solid var(--border);
        }
        .scheduling-calendar .rbc-month-view .rbc-day-bg:last-child {
          border-right: none;
        }
        .scheduling-calendar .rbc-month-view .rbc-row-bg {
          border-bottom: 1px solid var(--border);
        }
        .scheduling-calendar .rbc-row-segment {
          padding: 0 2px 1px 2px;
        }
        .scheduling-calendar .rbc-row-segment .rbc-event {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .scheduling-calendar .rbc-show-more {
          font-size: 11px;
          font-weight: 500;
          color: hsl(var(--primary));
          padding: 2px 4px;
          cursor: pointer;
        }
        .scheduling-calendar .rbc-show-more:hover {
          text-decoration: underline;
        }
        /* Custom week/day header with proper row structure */
        .custom-week-header {
          flex-shrink: 0;
          border: 1px solid var(--border);
          border-bottom: none;
        }
        .custom-week-header .header-row {
          display: flex;
        }
        .custom-week-header .gutter-cell {
          width: var(--gutter-width);
          min-width: var(--gutter-width);
          box-sizing: border-box;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 5px;
          font-size: 9px;
          letter-spacing: 0.5px;
          color: hsl(var(--muted-foreground));
          border-bottom: 1px solid var(--border);
          background: hsl(var(--muted) / 0.3);
        }
        .custom-week-header .day-cell {
          flex: 1;
          min-width: 0;
          padding: 8px 4px;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          border-left: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: hsl(var(--muted) / 0.3);
        }
        .custom-week-header .day-cell.today {
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
        }
        /* Week/Day time view styles */
        .scheduling-calendar .rbc-time-view {
          border: 1px solid var(--border);
          border-top: none;
          overflow: visible; /* Parent container handles scrolling */
          display: flex;
          flex-direction: column;
        }
        /* Hide default day labels - we use CustomWeekHeader for those */
        /* But SHOW the all-day events row */
        .scheduling-calendar .rbc-time-header {
          display: block;
        }
        .scheduling-calendar .rbc-time-header .rbc-time-header-content {
          display: none; /* Hide day labels (we use CustomWeekHeader) */
        }
        .scheduling-calendar .rbc-time-header .rbc-row {
          display: none; /* Hide the header row with day names */
        }
        .scheduling-calendar .rbc-allday-cell {
          display: flex !important; /* Show all-day events */
          min-height: 32px;
          border-bottom: 1px solid var(--border);
          background: hsl(var(--muted) / 0.1);
        }
        .scheduling-calendar .rbc-row-bg {
          display: none; /* Hide background row in header */
        }
        /* Add "ALL DAY" label to the gutter area */
        .scheduling-calendar .rbc-time-header .rbc-time-header-gutter {
          display: flex !important;
          align-items: center;
          justify-content: center;
          width: var(--gutter-width);
          min-width: var(--gutter-width);
          font-size: 9px;
          letter-spacing: 0.5px;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / 0.1);
          border-bottom: 1px solid var(--border);
        }
        .scheduling-calendar .rbc-time-header .rbc-time-header-gutter::after {
          content: 'ALL DAY';
        }
        .scheduling-calendar .rbc-time-content {
          border-top: none;
          overflow: visible;
        }
        /* Week view: vertical borders between day columns */
        .scheduling-calendar .rbc-time-view .rbc-day-slot {
          border-left: 1px solid var(--border);
          flex: 1;
          min-width: 0;
        }
        /* Remove react-big-calendar's duplicate border on day slot children */
        .scheduling-calendar .rbc-time-content > * + * > * {
          border-left: none;
        }
        /* Week and Day views: horizontal borders between each hour */
        .scheduling-calendar .rbc-timeslot-group {
          min-height: 80px;
          border-bottom: 1px solid var(--border) !important;
        }
        .scheduling-calendar .rbc-time-view .rbc-timeslot-group {
          border-bottom: 1px solid var(--border) !important;
        }
        .scheduling-calendar .rbc-time-gutter .rbc-timeslot-group {
          border-bottom: 1px solid var(--border) !important;
        }
        .scheduling-calendar .rbc-day-slot .rbc-timeslot-group {
          border-bottom: 1px solid var(--border) !important;
        }
        .scheduling-calendar .rbc-time-gutter {
          width: var(--gutter-width);
          min-width: var(--gutter-width);
          box-sizing: border-box;
          flex: none;
          font-size: 11px;
          color: hsl(var(--muted-foreground));
          text-align: center;
          padding: 0 5px;
        }
        .scheduling-calendar .rbc-label {
          padding: 4px 5px;
        }
        .scheduling-calendar .rbc-current-time-indicator {
          background-color: hsl(var(--primary));
          height: 2px;
        }
        .scheduling-calendar .rbc-today {
          background-color: hsl(var(--primary) / 0.05);
        }
        .scheduling-calendar .rbc-event {
          padding: 2px 4px;
        }
        .scheduling-calendar .rbc-event-label {
          display: none;
        }
        /* Note: Week/day view header is now handled by CustomWeekHeader component */
        .scheduling-calendar .rbc-day-slot .rbc-events-container {
          margin-right: 2px;
        }
      `}</style>
    </div>
  );
}
