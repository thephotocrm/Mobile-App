import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateMetaTags } from "@/lib/meta-tags";
import { getAccessibleTextColor } from "@shared/color-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, 
  Clock, 
  Camera,
  MapPin,
  User,
  Mail,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Globe
} from "lucide-react";
import { ChatbotWidget } from "@/components/chatbot-widget";

// Common timezone options for the dropdown
const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

// Get timezone abbreviation from IANA timezone name
function getTimezoneAbbreviation(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

// Convert time from one timezone to another using a reliable approach
// This creates the correct UTC instant and then formats it in the target timezone
function convertTimeBetweenTimezones(
  timeStr: string, // "HH:MM" format
  dateStr: string, // "YYYY-MM-DD" format
  fromTimezone: string,
  toTimezone: string
): { time: string; crossesMidnight: boolean; dayOffset: number } {
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Step 1: Create a reference UTC timestamp treating the input as UTC
    const naiveUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
    
    // Step 2: Get the UTC offset for the source timezone at this approximate time
    // Offset is positive if timezone is ahead of UTC, negative if behind
    const sourceOffset = getTimezoneOffsetMs(new Date(naiveUtcMs), fromTimezone);
    
    // Step 3: Convert the "local time in source timezone" to actual UTC
    // If source is UTC-6 (offset = -360 min = -21600000 ms), and we have 12:00,
    // the actual UTC is 12:00 - (-6h) = 18:00 UTC
    const actualUtcMs = naiveUtcMs - sourceOffset;
    const utcDate = new Date(actualUtcMs);
    
    // Step 4: Format this UTC instant in the target timezone
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: toTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const targetParts = targetFormatter.formatToParts(utcDate);
    const getPart = (type: string) => targetParts.find(p => p.type === type)?.value || '00';
    
    let targetHour = getPart('hour');
    if (targetHour === '24') targetHour = '00';
    const targetMinute = getPart('minute');
    
    // Step 5: Calculate day offset properly to handle month/year boundaries
    // Compare the full dates, not just day numbers
    const targetYear = parseInt(getPart('year'));
    const targetMonth = parseInt(getPart('month'));
    const targetDay = parseInt(getPart('day'));
    
    // Create midnight dates for comparison (no time component to avoid DST issues)
    const sourceDate = new Date(year, month - 1, day);
    const targetDate = new Date(targetYear, targetMonth - 1, targetDay);
    
    // Calculate difference in days using milliseconds
    const msPerDay = 24 * 60 * 60 * 1000;
    const dayOffset = Math.round((targetDate.getTime() - sourceDate.getTime()) / msPerDay);
    
    return {
      time: `${targetHour}:${targetMinute}`,
      crossesMidnight: dayOffset !== 0,
      dayOffset
    };
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return { time: timeStr, crossesMidnight: false, dayOffset: 0 };
  }
}

// Get timezone offset in milliseconds (positive = ahead of UTC, negative = behind)
function getTimezoneOffsetMs(utcDate: Date, timezone: string): number {
  // Format the UTC instant in the target timezone to see what local time it shows
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const getVal = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  
  let hour = getVal('hour');
  if (hour === 24) hour = 0;
  
  // Create a UTC timestamp from the formatted local values
  const localAsUtcMs = Date.UTC(
    getVal('year'),
    getVal('month') - 1,
    getVal('day'),
    hour,
    getVal('minute'),
    getVal('second')
  );
  
  // The difference tells us the offset
  // If utcDate is 18:00 UTC and formats as 12:00 CST, then:
  // localAsUtcMs = 12:00 "UTC", utcDate.getTime() = 18:00 UTC
  // offset = 12:00 - 18:00 = -6 hours (CST is UTC-6)
  return localAsUtcMs - utcDate.getTime();
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  photographerId: string;
}

interface DailyTemplate {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
  photographerId: string;
}

interface Photographer {
  id: string;
  businessName: string;
  timezone: string;
  brandPrimary?: string;
  profilePicture?: string;
  logoUrl?: string;
}

interface PublicCalendarData {
  success: boolean;
  photographer: Photographer;
  dailyTemplates: DailyTemplate[];
}

const bookingFormSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  clientEmail: z.string().email("Invalid email address").max(255, "Email too long"),
  clientPhone: z.string().min(10, "Phone number must be at least 10 digits").max(20, "Phone number too long").optional(),
  bookingNotes: z.string().max(500, "Notes too long").optional()
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

function extractSlugFromHostname(): string | null {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // Production: extract slug from subdomain (e.g., slug.tpcportal.co)
  if (hostname.includes('.tpcportal.co')) {
    const slug = hostname.split('.tpcportal.co')[0];
    return slug && slug !== 'www' && slug !== 'app' ? slug : null;
  }
  
  // Development: extract slug from URL path (e.g., /book/:slug)
  if (hostname.includes('.replit.dev') || hostname.includes('localhost')) {
    // Check if we're on /book/:slug route
    const bookMatch = pathname.match(/^\/book\/([^/]+)/);
    if (bookMatch && bookMatch[1]) {
      return bookMatch[1];
    }
    return null;
  }
  
  return null;
}

export default function SlugBookingCalendar() {
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const { toast } = useToast();
  
  // Client timezone - auto-detected from browser, can be overridden
  const [clientTimezone, setClientTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'America/New_York';
    }
  });
  
  const slug = extractSlugFromHostname();

  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      bookingNotes: ""
    }
  });

  const { data: calendarData, isLoading } = useQuery<PublicCalendarData>({
    queryKey: [`/api/public/booking/by-slug/${slug}`],
    enabled: !!slug,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/public/booking/by-slug/${slug}`);
      return await response.json();
    }
  });

  useEffect(() => {
    if (calendarData?.photographer) {
      const { businessName, logoUrl } = calendarData.photographer;
      const currentUrl = window.location.href;
      
      updateMetaTags({
        title: `${businessName} - Schedule Your Photography Session`,
        description: `Book your consultation with ${businessName}. Choose a time that works for you.`,
        image: logoUrl || undefined,
        url: currentUrl
      });
    }
  }, [calendarData]);

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { data: timeSlots = [], isLoading: slotsLoading } = useQuery<TimeSlot[]>({
    queryKey: [`/api/public/booking/by-slug/${slug}/slots`, selectedDate ? formatDateForAPI(selectedDate) : null],
    enabled: !!slug && !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const dateStr = formatDateForAPI(selectedDate);
      const response = await apiRequest("GET", `/api/public/booking/by-slug/${slug}/slots/${dateStr}`);
      const result = await response.json();
      return result.slots || [];
    }
  });

  const bookingMutation = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      if (!selectedSlot || !slug || !selectedDate) {
        throw new Error("No slot selected or invalid booking");
      }
      
      const dateStr = formatDateForAPI(selectedDate);
      const response = await apiRequest("POST", `/api/public/booking/by-slug/${slug}/book/${dateStr}/${selectedSlot.id}`, formData);
      return await response.json();
    },
    onSuccess: (data, formData) => {
      // Convert times to client's timezone for the confirmation page
      const dateStr = formatDateForAPI(selectedDate!);
      const photographerTz = calendarData?.photographer.timezone || 'America/New_York';
      
      let displayStartTime = selectedSlot?.startTime || '';
      let displayEndTime = selectedSlot?.endTime || '';
      
      // Convert to client timezone if different from photographer
      if (clientTimezone !== photographerTz && selectedSlot) {
        const { time: convertedStart } = convertTimeBetweenTimezones(
          selectedSlot.startTime,
          dateStr,
          photographerTz,
          clientTimezone
        );
        const { time: convertedEnd } = convertTimeBetweenTimezones(
          selectedSlot.endTime,
          dateStr,
          photographerTz,
          clientTimezone
        );
        displayStartTime = convertedStart;
        displayEndTime = convertedEnd;
      }
      
      const queryParams = new URLSearchParams({
        businessName: calendarData?.photographer.businessName || '',
        name: formData.clientName,
        email: formData.clientEmail,
        phone: formData.clientPhone || '',
        date: dateStr,
        startTime: displayStartTime,
        endTime: displayEndTime,
        notes: formData.bookingNotes || '',
        timezone: clientTimezone // Use client's timezone, not photographer's
      });
      
      navigate(`/booking/confirmation?${queryParams.toString()}`);
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error?.message || "Unable to book this time slot. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleBookingSubmit = (data: BookingFormData) => {
    bookingMutation.mutate(data);
  };

  const handleBookSlot = () => {
    if (selectedSlot) {
      setIsBookingModalOpen(true);
    }
  };

  const startOfDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDay = new Date(startDate);
    
    while (currentDay <= endDate) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  const formatSelectedDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayNumber = date.getDate();
    
    return `${dayName}, ${monthName} ${dayNumber}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const calendarDays = generateCalendarGrid();

  const hasAvailability = (date: Date) => {
    if (!calendarData?.dailyTemplates) return false;
    
    const dayOfWeek = date.getDay();
    return calendarData.dailyTemplates.some(template => 
      template.dayOfWeek === dayOfWeek && template.isEnabled
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Convert and format a time slot from photographer's timezone to client's timezone
  const formatSlotTimeInClientTimezone = (slotTime: string, showDayOffset = false) => {
    if (!selectedDate || !photographer?.timezone) {
      return formatTime(slotTime);
    }
    
    const dateStr = formatDateForAPI(selectedDate);
    const photographerTz = photographer.timezone;
    
    // If client is in same timezone as photographer, no conversion needed
    if (clientTimezone === photographerTz) {
      return formatTime(slotTime);
    }
    
    const { time: convertedTime, dayOffset } = convertTimeBetweenTimezones(
      slotTime,
      dateStr,
      photographerTz,
      clientTimezone
    );
    
    const formatted = formatTime(convertedTime);
    
    // Show day offset indicator if crossing midnight (like Calendly does)
    if (showDayOffset && dayOffset !== 0) {
      return `${formatted} (${dayOffset > 0 ? '+' : ''}${dayOffset}d)`;
    }
    
    return formatted;
  };

  // Get the client timezone abbreviation
  const clientTzAbbr = getTimezoneAbbreviation(clientTimezone);

  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Available</h2>
            <p className="text-gray-600">
              Please access this page through a valid photographer portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking calendar...</p>
        </div>
      </div>
    );
  }

  if (!calendarData?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center p-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Not Found</h2>
            <p className="text-gray-600">
              This booking calendar is not available or the link may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { photographer } = calendarData;

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ 
        '--brand-primary': photographer.brandPrimary || '#3b82f6',
        '--brand-bg': photographer.brandPrimary ? `${photographer.brandPrimary}10` : '#eff6ff'
      } as React.CSSProperties}
    >
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            {photographer.profilePicture ? (
              <img 
                src={photographer.profilePicture}
                alt={photographer.businessName}
                className="w-16 h-16 rounded-full object-cover"
                data-testid="photographer-profile-picture"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: photographer.brandPrimary || '#3b82f6',
                  color: getAccessibleTextColor(photographer.brandPrimary || '#3b82f6')
                }}
              >
                <Camera className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {photographer.businessName}
              </h1>
              <p className="text-gray-600 text-lg">Book your consultation appointment</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Select a Date & Time
                  </h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      data-testid="button-prev-month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      data-testid="button-next-month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayHeaders.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 uppercase">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPast = startOfDay(day) < startOfDay(new Date());
                    const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                    const isAvailable = hasAvailability(day) && !isPast;

                    return (
                      <button
                        key={index}
                        onClick={() => isAvailable ? handleDateSelect(day) : null}
                        disabled={!isAvailable}
                        className={`
                          h-10 w-10 text-sm font-medium rounded-full flex items-center justify-center
                          transition-colors duration-200 hover:bg-gray-100
                          ${isCurrentMonth 
                            ? (isAvailable 
                              ? 'text-gray-900 cursor-pointer' 
                              : 'text-gray-400 cursor-not-allowed')
                            : 'text-gray-300 cursor-not-allowed'
                          }
                          ${isSelected 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : ''
                          }
                          ${isToday && !isSelected 
                            ? 'bg-blue-50 text-blue-600 font-semibold' 
                            : ''
                          }
                          ${isAvailable && !isSelected && !isToday
                            ? 'hover:bg-blue-50 hover:text-blue-600'
                            : ''
                          }
                        `}
                        data-testid={`calendar-day-${day.getDate()}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedDate ? formatSelectedDate(selectedDate) : "Select a date"}
                </h3>
                {selectedDate && (
                  <p className="text-gray-600 text-sm mt-1">
                    Available times ({clientTzAbbr})
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <div className="space-y-3">
                    {slotsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : !Array.isArray(timeSlots) || timeSlots.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2 font-medium">No times available</p>
                        <p className="text-sm text-gray-500">
                          Please select a different date
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Array.isArray(timeSlots) && timeSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                              w-full px-4 py-3 rounded-lg text-left transition-all duration-200
                              font-medium border-2 hover:shadow-sm
                              ${selectedSlot?.id === slot.id
                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                              }
                            `}
                            data-testid={`time-slot-${slot.startTime}-${slot.endTime}`}
                          >
                            <div className="text-center">
                              {formatSlotTimeInClientTimezone(slot.startTime, true)} - {formatSlotTimeInClientTimezone(slot.endTime, true)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Select a date to view available times</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose from available dates in the calendar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedSlot && (
              <div className="mt-6">
                <Button
                  onClick={handleBookSlot}
                  className="w-full py-4 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  data-testid="button-book-slot"
                >
                  Continue to Book
                </Button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  Selected: {formatSlotTimeInClientTimezone(selectedSlot.startTime, true)} - {formatSlotTimeInClientTimezone(selectedSlot.endTime, true)} ({clientTzAbbr})
                </p>
              </div>
            )}

            {/* Timezone Selector - Calendly style */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Globe className="w-4 h-4" />
              <span>Times shown in</span>
              <Select value={clientTimezone} onValueChange={setClientTimezone}>
                <SelectTrigger className="w-auto h-8 text-sm border-0 bg-transparent hover:bg-gray-100 px-2" data-testid="timezone-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                  {/* Include client's detected timezone if not in the standard list */}
                  {!TIMEZONE_OPTIONS.find(tz => tz.value === clientTimezone) && (
                    <SelectItem value={clientTimezone}>
                      {clientTimezone} ({getTimezoneAbbreviation(clientTimezone)})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isBookingModalOpen} onOpenChange={(open) => {
        setIsBookingModalOpen(open);
        if (!open) {
          setBookingSuccess(false);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Your Appointment</DialogTitle>
          </DialogHeader>
          
          {bookingSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 mb-4">
                You'll receive a confirmation email shortly with all the details.
              </p>
              <Button
                onClick={() => {
                  setBookingSuccess(false);
                  setIsBookingModalOpen(false);
                }}
                data-testid="button-close-success"
              >
                Close
              </Button>
            </div>
          ) : (
            <Form {...bookingForm}>
              <form onSubmit={bookingForm.handleSubmit(handleBookingSubmit)} className="space-y-4">
                {selectedSlot && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Time</h4>
                    <div className="text-sm text-gray-600">
                      <p>{selectedDate?.toLocaleDateString()}</p>
                      <p>{formatSlotTimeInClientTimezone(selectedSlot.startTime, true)} - {formatSlotTimeInClientTimezone(selectedSlot.endTime, true)} ({clientTzAbbr})</p>
                    </div>
                  </div>
                )}

                <FormField
                  control={bookingForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your full name" 
                          {...field} 
                          data-testid="input-client-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email address" 
                          {...field} 
                          data-testid="input-client-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter your phone number" 
                          {...field} 
                          data-testid="input-client-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bookingForm.control}
                  name="bookingNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special requests or information..."
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-booking-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="w-full"
                    data-testid="button-cancel-booking"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={bookingMutation.isPending}
                    style={{ 
                      backgroundColor: photographer.brandPrimary || '#3b82f6',
                      borderColor: photographer.brandPrimary || '#3b82f6',
                      color: getAccessibleTextColor(photographer.brandPrimary || '#3b82f6')
                    }}
                    data-testid="button-confirm-booking"
                  >
                    {bookingMutation.isPending ? "Booking..." : "Confirm Booking"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      <ChatbotWidget 
        context="booking" 
        photographerName={photographer.businessName}
      />
    </div>
  );
}
