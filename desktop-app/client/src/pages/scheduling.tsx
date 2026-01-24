import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, addMonths, startOfWeek } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Clock,
  Settings,
  Trash2,
  Plus,
  Coffee,
  Copy,
  ExternalLink,
  Link,
  Check,
  CheckCircle,
  X,
  Video,
  User,
  Mail,
  Phone,
  FileText,
  CalendarX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  SchedulingCalendar,
  type DayOverride,
} from "@/components/SchedulingCalendar";
import type { DateRange } from "react-day-picker";

// Form schema for daily templates
const dailyTemplateSchema = z
  .object({
    dayOfWeek: z.enum([
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY",
    ]),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    isEnabled: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

// Form schema for break times
const breakTimeSchema = z
  .object({
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    label: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

// Form schema for day overrides
const overrideSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    isAvailable: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isAvailable && data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

type DailyTemplateFormData = z.infer<typeof dailyTemplateSchema>;
type BreakTimeFormData = z.infer<typeof breakTimeSchema>;
type OverrideFormData = z.infer<typeof overrideSchema>;

// Type definitions for API data
type DailyTemplate = {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
  photographerId: string;
};

type BreakTime = {
  id: string;
  templateId: string;
  startTime: string;
  endTime: string;
  label?: string;
};

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

type GoogleCalendarMetadata = Record<string, { name: string; color: string }>;

type BookingData = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  bookingType: "CONSULTATION" | "ENGAGEMENT" | "WEDDING" | "MEETING" | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  googleMeetLink: string | null;
  description: string | null;
};

type SlotsResponse = {
  slots: TimeSlot[];
  googleCalendarMetadata: GoogleCalendarMetadata | null;
  googleCalendarError?: string;
};

export default function Scheduling() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // State for calendar view mode
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">(
    "month",
  );

  // State for main calendar date (controlled from header)
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // State for calendar and time management
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DailyTemplate | null>(
    null,
  );
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(
    null,
  );
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [editingBreak, setEditingBreak] = useState<BreakTime | null>(null);
  const [clickedSlotId, setClickedSlotId] = useState<string | null>(null);

  // Override modal state (unified flow)
  const [blockDateRange, setBlockDateRange] = useState<DateRange | undefined>(
    undefined,
  );
  const [blockSelectedDates, setBlockSelectedDates] = useState<
    Date[] | undefined
  >(undefined);
  const [dateSelectionMode, setDateSelectionMode] = useState<
    "range" | "individual"
  >("individual");
  const [blockReason, setBlockReason] = useState<string>("");
  const [availabilityType, setAvailabilityType] = useState<
    "blocked" | "custom"
  >("blocked");
  const [customStartTime, setCustomStartTime] = useState<string>("17:00");
  const [customEndTime, setCustomEndTime] = useState<string>("20:00");

  // Edit override modal state
  const [editingOverride, setEditingOverride] = useState<DayOverride | null>(
    null,
  );
  const [editOverrideType, setEditOverrideType] = useState<
    "blocked" | "custom" | "reset"
  >("blocked");
  const [editStartTime, setEditStartTime] = useState<string>("17:00");
  const [editEndTime, setEditEndTime] = useState<string>("20:00");
  const [editReason, setEditReason] = useState<string>("");

  // New API queries for template-based system
  const { data: dailyTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/availability/templates"],
    enabled: !!user,
  }) as { data: DailyTemplate[]; isLoading: boolean };

  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: [
      "/api/availability/overrides",
      selectedDate?.toISOString().split("T")[0],
    ],
    enabled: !!user && !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const startDate = selectedDate.toISOString().split("T")[0];
      const endDate = selectedDate.toISOString().split("T")[0];
      const response = await apiRequest(
        "GET",
        `/api/availability/overrides?startDate=${startDate}&endDate=${endDate}`,
      );
      return await response.json();
    },
  }) as { data: DayOverride[]; isLoading: boolean };

  // Get time slots for selected date
  const { data: slotsResponse, isLoading: slotsLoading } = useQuery({
    queryKey: [
      "/api/availability/slots",
      selectedDate?.toISOString().split("T")[0],
    ],
    enabled: !!user && !!selectedDate,
    queryFn: async (): Promise<SlotsResponse> => {
      if (!selectedDate) return { slots: [], googleCalendarMetadata: null };
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await apiRequest(
        "GET",
        `/api/availability/slots/${dateStr}`,
      );
      return await response.json();
    },
  });
  const timeSlots = slotsResponse?.slots || [];
  const googleCalendarMetadata = slotsResponse?.googleCalendarMetadata || null;
  const googleCalendarError = slotsResponse?.googleCalendarError;

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery<
    BookingData[]
  >({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });
  const bookings: BookingData[] = Array.isArray(bookingsData)
    ? bookingsData
    : [];

  const { data: photographer, isLoading: photographerLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!user,
  }) as {
    data:
      | {
          publicToken?: string;
          businessName?: string;
          timezone?: string;
          portalSlug?: string;
        }
      | undefined;
    isLoading: boolean;
  };

  // Get all breaks for this photographer's templates (efficient single query)
  const { data: allBreaks = [], isLoading: breaksLoading } = useQuery({
    queryKey: ["/api/availability/breaks"],
    enabled: !!user,
  }) as { data: BreakTime[]; isLoading: boolean };

  // Check Google Calendar connection status
  const { data: calendarStatus } = useQuery({
    queryKey: ["/api/calendar/status"],
    enabled: !!user,
  });
  const isCalendarConnected = (calendarStatus as any)?.authenticated;

  // Handler to connect Google Calendar
  const handleConnectCalendar = async () => {
    try {
      const response = await fetch(
        "/api/auth/google-calendar?returnUrl=/scheduling",
        {
          credentials: "include",
        },
      );
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Failed to initiate Google Calendar connection:", error);
    }
  };

  // Get breaks for the current template being edited
  const templateBreaks = editingTemplate?.id
    ? allBreaks.filter((b) => b.templateId === editingTemplate.id)
    : [];

  // Forms for the new template-based system
  const templateForm = useForm<DailyTemplateFormData>({
    resolver: zodResolver(dailyTemplateSchema),
    defaultValues: {
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "17:00",
      isEnabled: true,
    },
  });

  const breakForm = useForm<BreakTimeFormData>({
    resolver: zodResolver(breakTimeSchema),
    defaultValues: {
      startTime: "12:00",
      endTime: "13:00",
      label: "",
    },
  });

  const overrideForm = useForm<OverrideFormData>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      date: "",
      isAvailable: true,
      startTime: "09:00",
      endTime: "17:00",
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: DailyTemplateFormData) => {
      return apiRequest("POST", "/api/availability/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/templates"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowTemplateModal(false);
      templateForm.reset();
      toast({
        title: "Success",
        description: "Daily schedule template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: DailyTemplateFormData & { id: string }) => {
      return apiRequest("PUT", `/api/availability/templates/${data.id}`, {
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isEnabled: data.isEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/templates"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowTemplateModal(false);
      setEditingTemplate(null);
      templateForm.reset();
      toast({
        title: "Success",
        description: "Daily schedule template updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/availability/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/templates"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      toast({
        title: "Success",
        description: "Daily schedule template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  // Create break mutation
  const createBreakMutation = useMutation({
    mutationFn: async (data: BreakTimeFormData & { templateId: string }) => {
      return apiRequest(
        "POST",
        `/api/availability/templates/${data.templateId}/breaks`,
        {
          startTime: data.startTime,
          endTime: data.endTime,
          label: data.label,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/breaks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowBreakForm(false);
      breakForm.reset();
      toast({
        title: "Success",
        description: "Break time added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add break time",
        variant: "destructive",
      });
    },
  });

  // Update break mutation
  const updateBreakMutation = useMutation({
    mutationFn: async (data: BreakTimeFormData & { id: string }) => {
      return apiRequest("PUT", `/api/availability/breaks/${data.id}`, {
        startTime: data.startTime,
        endTime: data.endTime,
        label: data.label,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/breaks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowBreakForm(false);
      setEditingBreak(null);
      breakForm.reset();
      toast({
        title: "Success",
        description: "Break time updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update break time",
        variant: "destructive",
      });
    },
  });

  // Delete break mutation
  const deleteBreakMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/availability/breaks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability/breaks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      toast({
        title: "Success",
        description: "Break time deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete break time",
        variant: "destructive",
      });
    },
  });

  // Confirm booking mutation
  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PUT", `/api/bookings/${bookingId}`, {
        status: "CONFIRMED",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking confirmed!",
        description: "The booking has been successfully confirmed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to confirm booking",
        variant: "destructive",
      });
    },
  });

  // Create override mutation (single day custom hours)
  const createOverrideMutation = useMutation({
    mutationFn: async (data: OverrideFormData) => {
      return apiRequest("POST", "/api/availability/overrides", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/overrides"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowOverrideModal(false);
      overrideForm.reset();
      toast({
        title: "Success",
        description: "Custom hours saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save custom hours",
        variant: "destructive",
      });
    },
  });

  // Bulk override mutation (date range or individual dates - supports both full block and custom hours)
  const bulkBlockMutation = useMutation({
    mutationFn: async (data: {
      startDate?: string;
      endDate?: string;
      dates?: string[];
      reason?: string;
      startTime?: string;
      endTime?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/availability/overrides/bulk",
        data,
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/overrides"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setShowOverrideModal(false);
      setBlockDateRange(undefined);
      setBlockSelectedDates(undefined);
      setBlockReason("");
      setAvailabilityType("blocked");
      setCustomStartTime("17:00");
      setCustomEndTime("20:00");

      const isCustomHours = !!variables.startTime;

      // Build description with warnings
      let description = isCustomHours
        ? "Custom hours have been set for the selected dates"
        : "Time off has been added to your calendar";
      if (data.skipped > 0) {
        description = `${data.skipped} ${data.skipped === 1 ? "day was" : "days were"} already set and skipped`;
      }
      if (data.conflictingBookingsCount > 0) {
        description += data.skipped > 0 ? ". " : "";
        description += `Note: ${data.conflictingBookingsCount} existing ${data.conflictingBookingsCount === 1 ? "booking needs" : "bookings need"} to be reviewed.`;
      }

      toast({
        title: isCustomHours
          ? `Custom hours set for ${data.created} ${data.created === 1 ? "day" : "days"}`
          : `${data.created} ${data.created === 1 ? "day" : "days"} blocked`,
        description,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to block time off",
        variant: "destructive",
      });
    },
  });

  // Update single override mutation
  const updateOverrideMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/availability/overrides/${data.id}`,
        {
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/overrides"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setEditingOverride(null);
      toast({
        title: "Updated",
        description: "Availability override has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update override",
        variant: "destructive",
      });
    },
  });

  // Delete single override mutation
  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/availability/overrides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/availability/overrides"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability/slots"] });
      setEditingOverride(null);
      toast({
        title: "Deleted",
        description: "Availability override has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete override",
        variant: "destructive",
      });
    },
  });

  // Utility functions
  const getDayOfWeekFromDate = (date: Date): string => {
    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    return days[date.getDay()];
  };

  const convertDayNameToNumber = (dayName: string): number => {
    const dayMap: Record<string, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };
    return dayMap[dayName];
  };

  const convertNumberToDayName = (dayNumber: number): string => {
    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];
    return days[dayNumber];
  };

  const formatTime = (time: string) => {
    // Time slots are already stored in photographer's local time
    // Just convert HH:MM to 12-hour format, no timezone conversion needed
    const [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Calculate days in date range
  const getDayCount = (from?: Date, to?: Date): number => {
    if (!from) return 0;
    if (!to) return 1;
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Format date range for display
  const formatDateRange = (from: Date, to: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const fromStr = from.toLocaleDateString("en-US", options);
    const toStr = to.toLocaleDateString("en-US", options);
    if (fromStr === toStr) return fromStr;
    return `${fromStr} - ${toStr}`;
  };

  // Format multiple selected dates for display
  const formatSelectedDates = (dates: Date[]): string => {
    if (dates.length === 0) return "";
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    if (dates.length <= 3) {
      return sortedDates
        .map((d) => d.toLocaleDateString("en-US", options))
        .join(", ");
    }
    const first = sortedDates[0].toLocaleDateString("en-US", options);
    const last = sortedDates[sortedDates.length - 1].toLocaleDateString(
      "en-US",
      options,
    );
    return `${first} ... ${last}`;
  };

  // Check if any dates are selected (for either mode)
  const hasSelectedDates =
    dateSelectionMode === "individual"
      ? blockSelectedDates && blockSelectedDates.length > 0
      : !!blockDateRange?.from;

  // Get selected date count for either mode
  const getSelectedDateCount = (): number => {
    if (dateSelectionMode === "individual") {
      return blockSelectedDates?.length || 0;
    }
    return getDayCount(blockDateRange?.from, blockDateRange?.to);
  };

  // Handle clicking on an override event to open edit modal
  const handleOverrideClick = (override: DayOverride) => {
    setEditingOverride(override);
    setEditOverrideType(override.startTime ? "custom" : "blocked");
    setEditStartTime(override.startTime || "17:00");
    setEditEndTime(override.endTime || "20:00");
    setEditReason(override.reason || "");
  };

  // Format booking date/time with photographer's timezone
  const formatBookingDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const timezone = photographer?.timezone || "America/New_York";

    return {
      date: date.toLocaleDateString("en-US", {
        timeZone: timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  // Format booking title to convert any 24-hour times to 12-hour format
  const formatBookingTitle = (title: string) => {
    // Regex to match patterns like "13:00 to 14:00" or "09:00 to 10:00"
    const timePattern = /(\d{1,2}):(\d{2})\s+to\s+(\d{1,2}):(\d{2})/g;

    return title.replace(timePattern, (match, hour1, min1, hour2, min2) => {
      const formatTime12Hour = (hour: string, minute: string) => {
        const h = parseInt(hour);
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${minute} ${ampm}`;
      };

      return `${formatTime12Hour(hour1, min1)} to ${formatTime12Hour(hour2, min2)}`;
    });
  };

  // Generate deterministic gradient colors based on name
  const getClientGradient = (name: string) => {
    const gradients = [
      "from-violet-500 to-purple-600",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-orange-500",
      "from-pink-500 to-rose-500",
      "from-indigo-500 to-blue-500",
    ];
    const hash =
      name?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return gradients[hash % gradients.length];
  };

  // Navigate calendar to previous/next period
  const handleCalendarNavigate = useCallback(
    (direction: "prev" | "next" | "today") => {
      setCalendarDate((prev) => {
        if (direction === "today") {
          return new Date();
        }
        if (calendarView === "month") {
          return addMonths(prev, direction === "prev" ? -1 : 1);
        }
        const days = calendarView === "day" ? 1 : 7;
        const offset = direction === "prev" ? -days : days;
        return addDays(prev, offset);
      });
    },
    [calendarView],
  );

  // Compute header text for calendar
  const calendarHeaderText = useMemo(() => {
    if (calendarView === "day") {
      return format(calendarDate, "EEEE, MMMM d, yyyy");
    } else if (calendarView === "week") {
      const weekStart = startOfWeek(calendarDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      if (format(weekStart, "MMM") === format(weekEnd, "MMM")) {
        return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`;
      }
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return format(calendarDate, "MMMM yyyy");
    }
  }, [calendarDate, calendarView]);

  // Handle clicking a time slot pill
  const handleSlotPillClick = (slot: TimeSlot) => {
    if (!slot.isAvailable) {
      // Find matching booking for this slot
      const timezone = photographer?.timezone || "America/New_York";
      const matchingBooking = bookings.find((booking) => {
        const bookingDate = new Date(booking.startAt).toLocaleDateString(
          "en-CA",
          { timeZone: timezone },
        );
        const bookingStartTime = new Date(booking.startAt).toLocaleTimeString(
          "en-US",
          {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          },
        );
        // Match by date and start time
        return bookingDate === slot.date && bookingStartTime === slot.startTime;
      });

      if (matchingBooking) {
        // Visual feedback - brief highlight
        setClickedSlotId(slot.id);
        setTimeout(() => setClickedSlotId(null), 200);

        setSelectedBooking(matchingBooking);
        setShowBookingDetailsModal(true);
      }
    }
  };

  // Handle template editing
  const handleEditTemplate = (template: DailyTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      dayOfWeek: convertNumberToDayName(template.dayOfWeek as number),
      startTime: template.startTime,
      endTime: template.endTime,
      isEnabled: template.isEnabled,
    });
    setShowTemplateModal(true);
  };

  // Handle template form submission
  const handleTemplateSubmit = (data: DailyTemplateFormData) => {
    // Convert day name to number for API
    const apiData = {
      ...data,
      dayOfWeek: convertDayNameToNumber(data.dayOfWeek),
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...apiData, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(apiData);
    }
  };

  // Handle override form submission
  const handleOverrideSubmit = (data: OverrideFormData) => {
    createOverrideMutation.mutate(data);
  };

  // Handle break editing
  const handleEditBreak = (breakTime: BreakTime) => {
    setEditingBreak(breakTime);
    breakForm.reset({
      startTime: breakTime.startTime,
      endTime: breakTime.endTime,
      label: breakTime.label || "",
    });
    setShowBreakForm(true);
  };

  // Handle break form submission
  const handleBreakSubmit = (data: BreakTimeFormData) => {
    if (editingBreak) {
      updateBreakMutation.mutate({ ...data, id: editingBreak.id });
    } else if (editingTemplate?.id) {
      createBreakMutation.mutate({ ...data, templateId: editingTemplate.id });
    }
  };

  // Handle new break
  const handleNewBreak = () => {
    setEditingBreak(null);
    breakForm.reset({
      startTime: "12:00",
      endTime: "13:00",
      label: "",
    });
    setShowBreakForm(true);
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Pre-fill override form with selected date
      overrideForm.setValue("date", date.toISOString().split("T")[0]);
    }
  };

  // Handle new template
  const handleNewTemplate = () => {
    setEditingTemplate(null);
    templateForm.reset();
    setShowTemplateModal(true);
  };

  // Handle new override for selected date
  const handleNewOverride = () => {
    if (selectedDate) {
      overrideForm.setValue("date", selectedDate.toISOString().split("T")[0]);
    }
    setShowOverrideModal(true);
  };

  // Get template for current selected day
  const getTemplateForDay = (date: Date) => {
    const dayOfWeek = getDayOfWeekFromDate(date);
    return dailyTemplates.find((t) => t.dayOfWeek === dayOfWeek && t.isEnabled);
  };

  // Get override for selected date
  const getOverrideForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return overrides.find((o) => o.date === dateStr);
  };

  // Redirect to login if not authenticated
  if (!loading && !user) {
    setLocation("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-1px)]">
      {/* Full-width Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <SidebarTrigger
            data-testid="button-menu-toggle"
            className="md:hidden mr-2"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCalendarNavigate("today")}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCalendarNavigate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {calendarHeaderText}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCalendarNavigate("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={calendarView}
          onValueChange={(v) => setCalendarView(v as "month" | "week" | "day")}
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
      </div>

      {/* Content Area: Sidebar + Calendar */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar Panel */}
        <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto hidden md:flex md:flex-col">
          {/* Calendar Legend - HoneyBook style */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              ThePhotoCrm
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: "#3b82f6" }}
                />
                <span className="text-sm">Booked Projects</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: "#f97316" }}
                />
                <span className="text-sm">Meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: "#22c55e" }}
                />
                <span className="text-sm">Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: "#06b6d4" }}
                />
                <span className="text-sm">Tentative Bookings</span>
              </div>
            </div>
          </div>

          {/* Availability Legend */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Availability
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-sm">Blocked / Time Off</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-violet-500" />
                <span className="text-sm">Custom Hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-green-500" />
                <span className="text-sm">Available</span>
              </div>
            </div>
          </div>

          {/* Google Calendar Section */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Google Calendar
            </h3>

            {isCalendarConnected ? (
              <>
                {/* Connected indicator */}
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-3">
                  <CheckCircle className="w-4 h-4" />
                  <span>Calendar connected</span>
                </div>

                {/* Legend */}
                {googleCalendarMetadata &&
                Object.keys(googleCalendarMetadata).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(googleCalendarMetadata).map(
                      ([calId, cal]) => (
                        <div key={calId} className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: cal.color }}
                          />
                          <span className="text-sm truncate">{cal.name}</span>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No calendars selected
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect Google Calendar to sync your availability
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleConnectCalendar}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Connect Calendar
                </Button>
              </>
            )}
          </div>

          {/* Block Time Off Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mb-4"
            onClick={handleNewOverride}
          >
            <CalendarX className="w-3 h-3 mr-2" />
            Block Time Off
          </Button>

          {/* Spacer to push bottom sections down */}
          <div className="flex-1" />

          {/* Compact Weekly Hours */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Hours
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={handleNewTemplate}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => {
                const dayMap: Record<number, number> = {
                  0: 1,
                  1: 2,
                  2: 3,
                  3: 4,
                  4: 5,
                  5: 6,
                  6: 0,
                };
                const template = dailyTemplates.find(
                  (t) => Number(t.dayOfWeek) === dayMap[index],
                );
                const hasAvailability = template?.isEnabled;
                return (
                  <div
                    key={index}
                    className={`text-center py-1 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                      hasAvailability
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                    onClick={() => {
                      const t = dailyTemplates.find(
                        (t) => Number(t.dayOfWeek) === dayMap[index],
                      );
                      setEditingTemplate(t || null);
                      setShowTemplateModal(true);
                    }}
                    title={
                      hasAvailability && template
                        ? `${formatTime(template.startTime)} - ${formatTime(template.endTime)}`
                        : "Off"
                    }
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact Booking Link */}
          {photographer?.portalSlug && (
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://${photographer.portalSlug}.tpcportal.co/book`,
                    );
                    toast({
                      title: "Copied!",
                      description: "Booking link copied",
                    });
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy Link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() =>
                    window.open(
                      `https://${photographer.portalSlug}.tpcportal.co/book`,
                      "_blank",
                    )
                  }
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-full">
            <SchedulingCalendar
              view={calendarView}
              currentDate={calendarDate}
              onDateChange={setCalendarDate}
              showToolbar={false}
              onSlotClick={(slot) => {
                if (!slot.isAvailable) {
                  // Find the booking for this slot and show details
                  const slotStart = new Date(`${slot.date}T${slot.startTime}`);
                  const slotEnd = new Date(`${slot.date}T${slot.endTime}`);
                  const matchingBooking = bookings.find((b: any) => {
                    const bookingStart = new Date(b.startAt);
                    const bookingEnd = new Date(b.endAt);
                    return slotStart < bookingEnd && slotEnd > bookingStart;
                  });
                  if (matchingBooking) {
                    setSelectedBooking(matchingBooking);
                    setShowBookingDetailsModal(true);
                  }
                }
              }}
              onOverrideClick={handleOverrideClick}
            />
          </div>
        </div>
      </div>

      {/* Template Modal */}
      <Dialog
        open={showTemplateModal}
        onOpenChange={(open) => {
          setShowTemplateModal(open);
          if (!open) {
            setEditingTemplate(null);
            templateForm.reset();
          }
        }}
      >
        <DialogContent
          className="max-w-2xl"
          aria-describedby="template-description"
        >
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? "Edit Daily Template"
                : "Manage Daily Schedule Templates"}
            </DialogTitle>
          </DialogHeader>
          <p
            id="template-description"
            className="text-sm text-muted-foreground mb-4"
          >
            {editingTemplate
              ? "Edit your working hours for a specific day"
              : "Create and manage your regular working hours for each day of the week"}
          </p>

          {/* Existing Templates List - Only show when not editing */}
          {!editingTemplate && dailyTemplates.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-3">Existing Templates</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dailyTemplates.map((template) => {
                  const templateBreaksForDisplay = allBreaks.filter(
                    (b) => b.templateId === template.id,
                  );
                  return (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                      data-testid={`modal-template-${template.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            template.isEnabled
                              ? "bg-primary"
                              : "bg-muted-foreground"
                          }`}
                        ></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium"
                              data-testid={`modal-template-day-${template.id}`}
                            >
                              {(() => {
                                const dayName = convertNumberToDayName(
                                  template.dayOfWeek as number,
                                );
                                return (
                                  dayName.charAt(0) +
                                  dayName.slice(1).toLowerCase()
                                );
                              })()}
                            </span>
                            <span
                              className="text-sm text-muted-foreground"
                              data-testid={`modal-template-time-${template.id}`}
                            >
                              {formatTime(template.startTime)} -{" "}
                              {formatTime(template.endTime)}
                              {!template.isEnabled && (
                                <span className="ml-1 text-red-600">
                                  (Disabled)
                                </span>
                              )}
                            </span>
                          </div>
                          {templateBreaksForDisplay.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Coffee className="w-3 h-3 text-amber-600" />
                              <span
                                className="text-xs text-muted-foreground"
                                data-testid={`template-breaks-${template.id}`}
                              >
                                {templateBreaksForDisplay.map((b, i) => (
                                  <span key={b.id}>
                                    {i > 0 && ", "}
                                    {formatTime(b.startTime)}-
                                    {formatTime(b.endTime)}
                                    {b.label && ` (${b.label})`}
                                  </span>
                                ))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          data-testid={`modal-button-edit-template-${template.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            deleteTemplateMutation.mutate(template.id)
                          }
                          disabled={deleteTemplateMutation.isPending}
                          data-testid={`modal-button-delete-template-${template.id}`}
                        >
                          {deleteTemplateMutation.isPending ? (
                            "..."
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form for Creating/Editing Templates */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </h4>
            <Form {...templateForm}>
              <form
                onSubmit={templateForm.handleSubmit(handleTemplateSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={templateForm.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        data-testid="select-template-day"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MONDAY">Monday</SelectItem>
                          <SelectItem value="TUESDAY">Tuesday</SelectItem>
                          <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                          <SelectItem value="THURSDAY">Thursday</SelectItem>
                          <SelectItem value="FRIDAY">Friday</SelectItem>
                          <SelectItem value="SATURDAY">Saturday</SelectItem>
                          <SelectItem value="SUNDAY">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={templateForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            data-testid="input-template-start-time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={templateForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            data-testid="input-template-end-time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={templateForm.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          data-testid="checkbox-template-enabled"
                          className="w-4 h-4"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        Enable this template
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTemplateModal(false)}
                    data-testid="button-cancel-template"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createTemplateMutation.isPending ||
                      updateTemplateMutation.isPending
                    }
                    data-testid="button-save-template"
                  >
                    {createTemplateMutation.isPending ||
                    updateTemplateMutation.isPending
                      ? "Saving..."
                      : editingTemplate
                        ? "Update"
                        : "Create"}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Break Times Section - Only show when editing an existing template */}
            {editingTemplate && (
              <div className="border-t mt-6 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Coffee className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-medium">Break Times</h4>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNewBreak}
                    data-testid="button-add-break"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Break
                  </Button>
                </div>

                {/* Existing Breaks */}
                {breaksLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading breaks...
                  </div>
                ) : templateBreaks.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {templateBreaks.map((breakTime) => (
                      <div
                        key={breakTime.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50"
                        data-testid={`break-${breakTime.id}`}
                      >
                        <div>
                          <div
                            className="font-medium"
                            data-testid={`break-time-${breakTime.id}`}
                          >
                            {formatTime(breakTime.startTime)} -{" "}
                            {formatTime(breakTime.endTime)}
                          </div>
                          {breakTime.label && (
                            <div
                              className="text-sm text-muted-foreground"
                              data-testid={`break-label-${breakTime.id}`}
                            >
                              {breakTime.label}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBreak(breakTime)}
                            data-testid={`button-edit-break-${breakTime.id}`}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              deleteBreakMutation.mutate(breakTime.id)
                            }
                            disabled={deleteBreakMutation.isPending}
                            data-testid={`button-delete-break-${breakTime.id}`}
                          >
                            {deleteBreakMutation.isPending ? (
                              "..."
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg mb-4">
                    No breaks added yet. Click "Add Break" to add lunch breaks
                    or other time blocks.
                  </div>
                )}

                {/* Break Form - Only show when adding/editing a break */}
                {showBreakForm && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium mb-3">
                      {editingBreak ? "Edit Break" : "Add Break"}
                    </h5>
                    <Form {...breakForm}>
                      <form
                        onSubmit={breakForm.handleSubmit(handleBreakSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={breakForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    data-testid="input-break-start-time"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={breakForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    data-testid="input-break-end-time"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={breakForm.control}
                          name="label"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Lunch break"
                                  data-testid="input-break-label"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowBreakForm(false);
                              setEditingBreak(null);
                              breakForm.reset();
                            }}
                            data-testid="button-cancel-break"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              createBreakMutation.isPending ||
                              updateBreakMutation.isPending
                            }
                            data-testid="button-save-break"
                          >
                            {createBreakMutation.isPending ||
                            updateBreakMutation.isPending
                              ? "Saving..."
                              : editingBreak
                                ? "Update"
                                : "Add"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Modal - Unified Flow */}
      <Dialog
        open={showOverrideModal}
        onOpenChange={(open) => {
          setShowOverrideModal(open);
          if (!open) {
            setBlockDateRange(undefined);
            setBlockReason("");
            setAvailabilityType("blocked");
            setCustomStartTime("17:00");
            setCustomEndTime("20:00");
          }
        }}
      >
        <DialogContent
          className="max-w-lg p-0 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
          aria-describedby="override-description"
        >
          {/* Header - changes color based on availability type */}
          <div
            className={`px-6 pt-6 pb-4 ${availabilityType === "blocked" ? "bg-amber-50 dark:bg-amber-950/30" : "bg-violet-50 dark:bg-violet-950/30"}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  availabilityType === "blocked"
                    ? "bg-amber-100 dark:bg-amber-900/50"
                    : "bg-violet-100 dark:bg-violet-900/50"
                }`}
              >
                {availabilityType === "blocked" ? (
                  <CalendarX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                )}
              </div>
              <div>
                <DialogHeader className="p-0">
                  <DialogTitle className="text-lg">
                    Manage Availability
                  </DialogTitle>
                </DialogHeader>
                <p
                  id="override-description"
                  className="text-sm text-muted-foreground"
                >
                  Block time off or set custom hours for specific dates
                </p>
              </div>
            </div>
          </div>

          {/* Unified Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Step 1: Date Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Select date(s)
                </p>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDateSelectionMode("individual");
                      setBlockDateRange(undefined);
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                      dateSelectionMode === "individual"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateSelectionMode("range");
                      setBlockSelectedDates(undefined);
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                      dateSelectionMode === "range"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Range
                  </button>
                </div>
              </div>
              <div className="border border-border rounded-lg p-2 flex justify-center">
                {dateSelectionMode === "individual" ? (
                  <Calendar
                    mode="multiple"
                    selected={blockSelectedDates}
                    onSelect={setBlockSelectedDates}
                    numberOfMonths={1}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    classNames={{
                      day_selected:
                        availabilityType === "blocked"
                          ? "bg-amber-500 text-white hover:bg-amber-600 focus:bg-amber-600"
                          : "bg-violet-500 text-white hover:bg-violet-600 focus:bg-violet-600",
                      day_today: "bg-accent text-accent-foreground",
                    }}
                    data-testid="calendar-block-multiple"
                  />
                ) : (
                  <Calendar
                    mode="range"
                    selected={blockDateRange}
                    onSelect={setBlockDateRange}
                    numberOfMonths={1}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    classNames={{
                      day_selected:
                        availabilityType === "blocked"
                          ? "bg-amber-500 text-white hover:bg-amber-600 focus:bg-amber-600"
                          : "bg-violet-500 text-white hover:bg-violet-600 focus:bg-violet-600",
                      day_range_middle:
                        availabilityType === "blocked"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100"
                          : "bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100",
                      day_range_start:
                        availabilityType === "blocked"
                          ? "bg-amber-500 text-white rounded-l-md"
                          : "bg-violet-500 text-white rounded-l-md",
                      day_range_end:
                        availabilityType === "blocked"
                          ? "bg-amber-500 text-white rounded-r-md"
                          : "bg-violet-500 text-white rounded-r-md",
                      day_today: "bg-accent text-accent-foreground",
                    }}
                    data-testid="calendar-block-range"
                  />
                )}
              </div>
            </div>

            {/* Date Selection Summary */}
            {hasSelectedDates && (
              <div
                className={`rounded-lg p-4 border ${
                  availabilityType === "blocked"
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      availabilityType === "blocked"
                        ? "bg-amber-100 dark:bg-amber-900/50"
                        : "bg-violet-100 dark:bg-violet-900/50"
                    }`}
                  >
                    {availabilityType === "blocked" ? (
                      <CalendarX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    )}
                  </div>
                  <div>
                    <p
                      className="font-medium text-sm"
                      data-testid="block-date-range-display"
                    >
                      {dateSelectionMode === "individual" && blockSelectedDates
                        ? formatSelectedDates(blockSelectedDates)
                        : blockDateRange?.from
                          ? formatDateRange(
                              blockDateRange.from,
                              blockDateRange.to || blockDateRange.from,
                            )
                          : ""}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid="block-day-count"
                    >
                      {getSelectedDateCount()}{" "}
                      {getSelectedDateCount() === 1 ? "day" : "days"} selected
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Availability Type (shown after dates selected) */}
            {hasSelectedDates && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Availability type
                </p>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      availabilityType === "blocked"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                        : "border-border hover:border-amber-300"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={availabilityType === "blocked"}
                      onChange={() => setAvailabilityType("blocked")}
                      className="w-4 h-4 text-amber-600"
                      data-testid="radio-type-blocked"
                    />
                    <div>
                      <p className="font-medium text-sm">
                        Completely unavailable
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Block entire day(s) - vacation, holiday, etc.
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      availabilityType === "custom"
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-border hover:border-violet-300"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={availabilityType === "custom"}
                      onChange={() => setAvailabilityType("custom")}
                      className="w-4 h-4 text-violet-600"
                      data-testid="radio-type-custom"
                    />
                    <div>
                      <p className="font-medium text-sm">Custom hours</p>
                      <p className="text-xs text-muted-foreground">
                        Set specific availability hours for selected dates
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 3: Time Inputs (shown when custom hours selected) */}
            {hasSelectedDates && availabilityType === "custom" && (
              <div className="grid grid-cols-2 gap-4 transition-all duration-200">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-violet-500"
                    data-testid="input-custom-start-time"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-violet-500"
                    data-testid="input-custom-end-time"
                  />
                </div>
              </div>
            )}

            {/* Optional Note */}
            {hasSelectedDates && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Note (optional)
                </p>
                <Input
                  placeholder={
                    availabilityType === "blocked"
                      ? "e.g., Holiday vacation, Wedding trip..."
                      : "e.g., Evening availability only..."
                  }
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className={
                    availabilityType === "blocked"
                      ? "border-amber-200 dark:border-amber-800 focus:border-amber-500 focus:ring-amber-500"
                      : "border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-violet-500"
                  }
                  data-testid="input-block-reason"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-4 border-t flex items-center justify-between ${
              availabilityType === "blocked"
                ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                : "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800"
            }`}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowOverrideModal(false)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-cancel-override"
            >
              Cancel
            </Button>

            <Button
              onClick={() => {
                if (
                  dateSelectionMode === "individual" &&
                  blockSelectedDates &&
                  blockSelectedDates.length > 0
                ) {
                  // Individual dates mode - send dates array
                  const sortedDates = [...blockSelectedDates].sort(
                    (a, b) => a.getTime() - b.getTime(),
                  );
                  bulkBlockMutation.mutate({
                    dates: sortedDates.map(
                      (d) => d.toISOString().split("T")[0],
                    ),
                    reason: blockReason || undefined,
                    startTime:
                      availabilityType === "custom"
                        ? customStartTime
                        : undefined,
                    endTime:
                      availabilityType === "custom" ? customEndTime : undefined,
                  });
                } else if (
                  dateSelectionMode === "range" &&
                  blockDateRange?.from
                ) {
                  // Range mode - send start/end dates
                  bulkBlockMutation.mutate({
                    startDate: blockDateRange.from.toISOString().split("T")[0],
                    endDate: (blockDateRange.to || blockDateRange.from)
                      .toISOString()
                      .split("T")[0],
                    reason: blockReason || undefined,
                    startTime:
                      availabilityType === "custom"
                        ? customStartTime
                        : undefined,
                    endTime:
                      availabilityType === "custom" ? customEndTime : undefined,
                  });
                }
              }}
              disabled={
                !hasSelectedDates ||
                bulkBlockMutation.isPending ||
                (availabilityType === "custom" &&
                  customEndTime <= customStartTime)
              }
              className={
                availabilityType === "blocked"
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                  : "bg-violet-500 hover:bg-violet-600 text-white shadow-sm"
              }
              data-testid="button-save-override"
            >
              {bulkBlockMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : availabilityType === "blocked" ? (
                <CalendarX className="w-4 h-4 mr-2" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              {bulkBlockMutation.isPending
                ? "Saving..."
                : availabilityType === "blocked"
                  ? `Block ${getSelectedDateCount()} ${getSelectedDateCount() === 1 ? "Day" : "Days"}`
                  : `Set Hours for ${getSelectedDateCount()} ${getSelectedDateCount() === 1 ? "Day" : "Days"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Booking Details Modal */}
      <Dialog
        open={showBookingDetailsModal}
        onOpenChange={setShowBookingDetailsModal}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          {selectedBooking && (
            <>
              {/* Header with gradient avatar */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  {/* Gradient Avatar */}
                  <div
                    className={`w-14 h-14 rounded-full bg-gradient-to-br ${getClientGradient(selectedBooking.clientName || "Client")} flex items-center justify-center text-white font-semibold text-lg shadow-lg`}
                  >
                    {(selectedBooking.clientName || "C")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-semibold text-lg truncate"
                        data-testid="modal-booking-title"
                      >
                        {selectedBooking.clientName ||
                          formatBookingTitle(selectedBooking.title)}
                      </h3>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 ${
                          selectedBooking.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700"
                            : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                        }`}
                        variant="outline"
                        data-testid="modal-booking-status"
                      >
                        {selectedBooking.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedBooking.bookingType || "Consultation"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="px-6 pb-4 space-y-4">
                {/* Scheduled Time */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Scheduled Time
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p
                        className="font-medium"
                        data-testid="modal-booking-date"
                      >
                        {(() => {
                          const startDateTime = formatBookingDateTime(
                            selectedBooking.startAt,
                          );
                          const date = new Date(selectedBooking.startAt);
                          return date.toLocaleDateString("en-US", {
                            timeZone:
                              photographer?.timezone || "America/New_York",
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          });
                        })()}
                      </p>
                      <p
                        className="text-muted-foreground"
                        data-testid="modal-booking-time"
                      >
                        {(() => {
                          const startDateTime = formatBookingDateTime(
                            selectedBooking.startAt,
                          );
                          const endDateTime = formatBookingDateTime(
                            selectedBooking.endAt,
                          );
                          const start = new Date(selectedBooking.startAt);
                          const end = new Date(selectedBooking.endAt);
                          const durationMs = end.getTime() - start.getTime();
                          const durationMins = Math.round(durationMs / 60000);
                          const durationStr =
                            durationMins >= 60
                              ? `${Math.floor(durationMins / 60)} hour${Math.floor(durationMins / 60) > 1 ? "s" : ""}`
                              : `${durationMins} min`;
                          return `${startDateTime.time} - ${endDateTime.time} (${durationStr})`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meeting Link - styled as interactive card */}
                {selectedBooking.googleMeetLink && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Meeting Link
                    </p>
                    <a
                      href={selectedBooking.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all hover:shadow-sm group"
                      data-testid="modal-meeting-link"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Video className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-sm">
                          Join Meeting
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </a>
                  </div>
                )}

                {/* Contact Info */}
                {(selectedBooking.clientEmail ||
                  selectedBooking.clientPhone) && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Contact
                    </p>
                    <div className="space-y-2">
                      {selectedBooking.clientEmail && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="modal-client-email">
                            {selectedBooking.clientEmail}
                          </span>
                        </div>
                      )}
                      {selectedBooking.clientPhone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span data-testid="modal-client-phone">
                            {selectedBooking.clientPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes/Description */}
                {selectedBooking.description && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Notes
                    </p>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p
                        className="text-sm text-muted-foreground"
                        data-testid="modal-booking-description"
                      >
                        {selectedBooking.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-muted/30 border-t border-border flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBookingDetailsModal(false)}
                  data-testid="button-close-booking-details"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Override Modal */}
      <Dialog
        open={!!editingOverride}
        onOpenChange={(open) => {
          if (!open) {
            setEditingOverride(null);
          }
        }}
      >
        <DialogContent
          className="max-w-md p-0 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
          aria-describedby="edit-override-description"
        >
          {editingOverride && (
            <>
              {/* Header */}
              <div
                className={`px-6 pt-6 pb-4 ${
                  editOverrideType === "blocked"
                    ? "bg-amber-50 dark:bg-amber-950/30"
                    : editOverrideType === "custom"
                      ? "bg-violet-50 dark:bg-violet-950/30"
                      : "bg-green-50 dark:bg-green-950/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      editOverrideType === "blocked"
                        ? "bg-amber-100 dark:bg-amber-900/50"
                        : editOverrideType === "custom"
                          ? "bg-violet-100 dark:bg-violet-900/50"
                          : "bg-green-100 dark:bg-green-900/50"
                    }`}
                  >
                    {editOverrideType === "blocked" ? (
                      <CalendarX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : editOverrideType === "custom" ? (
                      <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    ) : (
                      <RotateCcw className="w-5 h-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <DialogHeader className="p-0">
                      <DialogTitle className="text-lg">
                        Edit Availability
                      </DialogTitle>
                    </DialogHeader>
                    <p
                      id="edit-override-description"
                      className="text-sm text-muted-foreground"
                    >
                      {new Date(
                        editingOverride.date + "T12:00:00",
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                {/* Availability Type */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Availability type
                  </p>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        editOverrideType === "blocked"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "border-border hover:border-amber-300"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={editOverrideType === "blocked"}
                        onChange={() => setEditOverrideType("blocked")}
                        className="w-4 h-4 text-amber-600"
                        data-testid="edit-radio-type-blocked"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          Completely unavailable
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Block entire day - vacation, holiday, etc.
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        editOverrideType === "custom"
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-border hover:border-violet-300"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={editOverrideType === "custom"}
                        onChange={() => setEditOverrideType("custom")}
                        className="w-4 h-4 text-violet-600"
                        data-testid="edit-radio-type-custom"
                      />
                      <div>
                        <p className="font-medium text-sm">Custom hours</p>
                        <p className="text-xs text-muted-foreground">
                          Set specific availability hours
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        editOverrideType === "reset"
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                          : "border-border hover:border-green-300"
                      }`}
                    >
                      <input
                        type="radio"
                        checked={editOverrideType === "reset"}
                        onChange={() => setEditOverrideType("reset")}
                        className="w-4 h-4 text-green-600"
                        data-testid="edit-radio-type-reset"
                      />
                      <div>
                        <p className="font-medium text-sm">
                          Reset to default hours
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Use your regular weekly schedule
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Time Inputs (shown when custom hours selected) */}
                {editOverrideType === "custom" && (
                  <div className="grid grid-cols-2 gap-4 transition-all duration-200">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                        Start Time
                      </label>
                      <Input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-violet-500"
                        data-testid="edit-input-start-time"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                        End Time
                      </label>
                      <Input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-violet-500"
                        data-testid="edit-input-end-time"
                      />
                    </div>
                  </div>
                )}

                {/* Note - hidden when resetting */}
                {editOverrideType !== "reset" && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Note (optional)
                    </p>
                    <Input
                      placeholder={
                        editOverrideType === "blocked"
                          ? "e.g., Holiday vacation, Wedding trip..."
                          : "e.g., Evening availability only..."
                      }
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className={
                        editOverrideType === "blocked"
                          ? "border-amber-200 dark:border-amber-800 focus:border-amber-500 focus:ring-amber-500"
                          : "border-violet-200 dark:border-violet-800 focus:border-violet-500 focus:ring-violet-500"
                      }
                      data-testid="edit-input-reason"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className={`px-6 py-4 border-t flex items-center justify-end gap-2 ${
                  editOverrideType === "blocked"
                    ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    : editOverrideType === "custom"
                      ? "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800"
                      : "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                }`}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOverride(null)}
                  data-testid="edit-button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editOverrideType === "reset") {
                      // Delete the override to reset to default hours
                      deleteOverrideMutation.mutate(editingOverride.id);
                    } else {
                      // Update the override
                      updateOverrideMutation.mutate({
                        id: editingOverride.id,
                        startTime:
                          editOverrideType === "custom" ? editStartTime : null,
                        endTime:
                          editOverrideType === "custom" ? editEndTime : null,
                        reason: editReason || null,
                      });
                    }
                  }}
                  disabled={
                    updateOverrideMutation.isPending ||
                    deleteOverrideMutation.isPending ||
                    (editOverrideType === "custom" &&
                      editEndTime <= editStartTime)
                  }
                  className={
                    editOverrideType === "blocked"
                      ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                      : editOverrideType === "custom"
                        ? "bg-violet-500 hover:bg-violet-600 text-white shadow-sm"
                        : "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                  }
                  data-testid="edit-button-save"
                >
                  {updateOverrideMutation.isPending ||
                  deleteOverrideMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {editOverrideType === "reset"
                    ? "Reset to Default"
                    : "Save Changes"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
