import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeInRight,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import {
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  CalendarColors,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  bookingsApi,
  availabilityApi,
  Booking,
  DailyAvailabilityTemplate,
  DailyAvailabilityOverride,
  AvailabilityStatus,
  createTenantContext,
} from "@/services/api";

// Get Sunday of the week containing a date
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};

// Generate Sunday-Saturday week
const getWeekDates = (weekStart: Date): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Week navigation
const getNextWeekStart = (current: Date): Date => {
  const next = new Date(current);
  next.setDate(next.getDate() + 7);
  return next;
};

const getPrevWeekStart = (current: Date): Date => {
  const prev = new Date(current);
  prev.setDate(prev.getDate() - 7);
  return prev;
};

// Event type definition for UI
interface CalendarEvent {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  endTime: string;
  location: string;
  type: "shooting" | "consultation" | "meeting" | "other";
  date: Date;
}

// Format time to "10:00 AM" format
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Infer event type from booking title/notes
const inferEventType = (
  title: string,
  notes?: string,
): CalendarEvent["type"] => {
  const text = `${title} ${notes || ""}`.toLowerCase();
  if (
    text.includes("shoot") ||
    text.includes("session") ||
    text.includes("photo")
  ) {
    return "shooting";
  }
  if (
    text.includes("consult") ||
    text.includes("meeting") ||
    text.includes("call")
  ) {
    return "consultation";
  }
  if (
    text.includes("edit") ||
    text.includes("review") ||
    text.includes("contract")
  ) {
    return "meeting";
  }
  return "other";
};

// Transform API booking to calendar event
const transformBookingToEvent = (booking: Booking): CalendarEvent => {
  const notes = booking.description || booking.notes || "";
  const subtitle =
    notes.length > 50
      ? `${notes.substring(0, 50)}...`
      : notes || booking.status;

  return {
    id: booking.id,
    title: booking.title,
    subtitle,
    time: formatTime(booking.startAt),
    endTime: formatTime(booking.endAt),
    location: booking.location || "No location",
    type: inferEventType(booking.title, booking.description || booking.notes),
    date: new Date(booking.startAt),
  };
};

// Get event type color
const getEventTypeColor = (type: string) => {
  switch (type) {
    case "shooting":
      return CalendarColors.categoryShooting;
    case "consultation":
      return CalendarColors.categoryConsultation;
    case "meeting":
      return CalendarColors.categoryMeeting;
    default:
      return CalendarColors.categoryOther;
  }
};

// Get event type icon
const getEventTypeIcon = (type: string): keyof typeof Feather.glyphMap => {
  switch (type) {
    case "shooting":
      return "camera";
    case "consultation":
      return "message-circle";
    case "meeting":
      return "users";
    case "blocked":
      return "slash";
    case "custom":
      return "clock";
    default:
      return "calendar";
  }
};

// Format date to YYYY-MM-DD for comparison
const formatDateKey = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Get availability status for a date
const getAvailabilityStatus = (
  date: Date,
  templates: DailyAvailabilityTemplate[],
  overrides: DailyAvailabilityOverride[],
): { status: AvailabilityStatus; override?: DailyAvailabilityOverride } => {
  const dateKey = formatDateKey(date);
  const dayOfWeek = date.getDay();

  // Check for override first (date-specific)
  const override = overrides.find((o) => o.date === dateKey);
  if (override) {
    if (!override.startTime) {
      // No start time = fully blocked
      return { status: "blocked", override };
    } else {
      // Has custom hours = partial availability
      return { status: "partial", override };
    }
  }

  // If no templates are set up at all, default to available
  // (photographer hasn't configured their schedule yet)
  if (templates.length === 0) {
    return { status: "available" };
  }

  // Check if there's a template for this day of week
  const template = templates.find(
    (t) => t.dayOfWeek === dayOfWeek && t.isEnabled,
  );
  if (template) {
    return { status: "available" };
  }

  // Template exists for other days but not this one = day off per schedule
  return { status: "blocked" };
};

// Get status indicator color
const getStatusColor = (status: AvailabilityStatus): string => {
  switch (status) {
    case "available":
      return "#22C55E"; // green-500
    case "blocked":
      return "#F59E0B"; // amber-500
    case "partial":
      return "#8B5CF6"; // violet-500
    default:
      return "#9CA3AF"; // gray-400
  }
};

export function CalendarScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [templates, setTemplates] = useState<DailyAvailabilityTemplate[]>([]);
  const [overrides, setOverrides] = useState<DailyAvailabilityOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user's name
  const userName = user?.email?.split("@")[0] || "there";
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  };

  // Load bookings and availability from API
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const tenant = createTenantContext(user);

      // Fetch bookings, templates, and overrides in parallel
      const [bookingsResult, templatesResult, overridesResult] =
        await Promise.all([
          bookingsApi.getAll(token, tenant),
          availabilityApi.getTemplates(token, tenant).catch(() => []),
          availabilityApi.getOverrides(token, tenant).catch(() => []),
        ]);

      setBookings(bookingsResult);
      setTemplates(templatesResult);
      setOverrides(overridesResult);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
      setError("Failed to load calendar");
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  // Generate dates for the strip (Sunday-Saturday)
  const dates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  // Get day info (status + event count) for a date
  const getDayInfo = useCallback(
    (date: Date) => {
      const { status, override } = getAvailabilityStatus(
        date,
        templates,
        overrides,
      );
      const eventCount = bookings.filter(
        (b) => new Date(b.startAt).toDateString() === date.toDateString(),
      ).length;
      return { status, override, eventCount };
    },
    [templates, overrides, bookings],
  );

  // Filter events for selected date
  const eventsForDate = useMemo(() => {
    return bookings
      .map(transformBookingToEvent)
      .filter(
        (event) => event.date.toDateString() === selectedDate.toDateString(),
      );
  }, [bookings, selectedDate]);

  // Get availability info for selected date
  const selectedDayInfo = useMemo(() => {
    return getDayInfo(selectedDate);
  }, [selectedDate, getDayInfo]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
  };

  // Week navigation handlers - preserve selected day of week
  const handleNextWeek = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dayOfWeek = selectedDate.getDay();
    setCurrentWeekStart(prev => {
      const newWeekStart = getNextWeekStart(prev);
      // Update selected date to same day of week in new week
      const newSelectedDate = new Date(newWeekStart);
      newSelectedDate.setDate(newWeekStart.getDate() + dayOfWeek);
      setSelectedDate(newSelectedDate);
      return newWeekStart;
    });
  }, [selectedDate]);

  const handlePrevWeek = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const dayOfWeek = selectedDate.getDay();
    setCurrentWeekStart(prev => {
      const newWeekStart = getPrevWeekStart(prev);
      // Update selected date to same day of week in new week
      const newSelectedDate = new Date(newWeekStart);
      newSelectedDate.setDate(newWeekStart.getDate() + dayOfWeek);
      setSelectedDate(newSelectedDate);
      return newWeekStart;
    });
  }, [selectedDate]);

  // Swipe gesture for week navigation
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = screenWidth * 0.01;

  const weekSwipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-screenWidth, { duration: 200 }, () => {
          runOnJS(handleNextWeek)();
          translateX.value = 0;
        });
      } else if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(screenWidth, { duration: 200 }, () => {
          runOnJS(handlePrevWeek)();
          translateX.value = 0;
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const dateStripAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is selected
  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <ScreenScrollView
      style={{ backgroundColor: theme.backgroundRoot }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={CalendarColors.primary}
          colors={[CalendarColors.primary]}
        />
      }
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInUp.duration(400).easing(Easing.out(Easing.cubic))}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <ThemedText
              style={[styles.greeting, { color: theme.textSecondary }]}
            >
              {getGreeting()}
            </ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]}>
              {displayName}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => (navigation as any).navigate("Settings")}
            style={({ pressed }) => [
              styles.avatarButton,
              { backgroundColor: CalendarColors.eventCardBg },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="user" size={20} color={CalendarColors.primary} />
          </Pressable>
        </Animated.View>

        {/* Month/Year Header */}
        <Animated.View
          entering={FadeInUp.delay(100)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
          style={styles.monthYearHeader}
        >
          <ThemedText style={[styles.monthYearText, { color: theme.text }]}>
            {currentWeekStart.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </ThemedText>
        </Animated.View>

        {/* Horizontal Date Strip */}
        <Animated.View
          entering={FadeInUp.delay(150)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
          style={styles.dateStripContainer}
        >
          <GestureDetector gesture={weekSwipeGesture}>
            <Animated.View style={[styles.dateStripContent, dateStripAnimatedStyle]}>
              {dates.map((date, index) => {
                const selected = isSelected(date);
                const today = isToday(date);
                const dayInfo = getDayInfo(date);
                return (
                  <Pressable
                    key={index}
                    onPress={() => handleDateSelect(date)}
                    style={({ pressed }) => [
                      styles.dateItem,
                      selected && [
                        styles.dateItemSelected,
                        { backgroundColor: CalendarColors.primary },
                      ],
                      pressed && !selected && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNumber,
                        { color: selected ? "#FFFFFF" : theme.text },
                        today && !selected && { color: CalendarColors.primary },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    <Text
                      style={[
                        styles.dateDay,
                        {
                          color: selected
                            ? "rgba(255,255,255,0.8)"
                            : theme.textTertiary,
                        },
                        today && !selected && { color: CalendarColors.primary },
                      ]}
                    >
                      {date
                        .toLocaleDateString("en-US", { weekday: "short" })
                        .toUpperCase()}
                    </Text>
                    {/* Availability indicator */}
                    <View style={styles.dateIndicators}>
                      {dayInfo.status !== "available" && (
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: selected
                                ? "rgba(255,255,255,0.9)"
                                : getStatusColor(dayInfo.status),
                            },
                          ]}
                        />
                      )}
                      {dayInfo.eventCount > 0 && (
                        <View style={styles.eventDots}>
                          {Array.from({
                            length: Math.min(dayInfo.eventCount, 3),
                          }).map((_, i) => (
                            <View
                              key={i}
                              style={[
                                styles.eventDot,
                                {
                                  backgroundColor: selected
                                    ? "rgba(255,255,255,0.7)"
                                    : CalendarColors.primary,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </Animated.View>
          </GestureDetector>
        </Animated.View>

        {/* Schedule Section */}
        <Animated.View
          entering={FadeInUp.delay(200)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              {isToday(selectedDate)
                ? "Schedule Today"
                : `Schedule for ${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </ThemedText>
            <ThemedText
              style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
            >
              {eventsForDate.length}{" "}
              {eventsForDate.length === 1 ? "event" : "events"}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Availability Status Card */}
        {selectedDayInfo.status !== "available" && (
          <Animated.View
            entering={FadeInUp.delay(220).duration(400)}
            style={styles.availabilityCardContainer}
          >
            <View
              style={[
                styles.availabilityCard,
                {
                  backgroundColor:
                    selectedDayInfo.status === "blocked"
                      ? isDark
                        ? "rgba(245, 158, 11, 0.15)"
                        : "#FEF3C7"
                      : isDark
                        ? "rgba(139, 92, 246, 0.15)"
                        : "#EDE9FE",
                  borderLeftColor: getStatusColor(selectedDayInfo.status),
                },
              ]}
            >
              <View style={styles.availabilityCardContent}>
                <View
                  style={[
                    styles.availabilityIcon,
                    {
                      backgroundColor:
                        selectedDayInfo.status === "blocked"
                          ? "#F59E0B"
                          : "#8B5CF6",
                    },
                  ]}
                >
                  <Feather
                    name={
                      selectedDayInfo.status === "blocked" ? "slash" : "clock"
                    }
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.availabilityTextContainer}>
                  <ThemedText
                    style={[styles.availabilityTitle, { color: theme.text }]}
                  >
                    {selectedDayInfo.status === "blocked"
                      ? "Blocked"
                      : "Custom Hours"}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.availabilitySubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedDayInfo.status === "blocked"
                      ? selectedDayInfo.override?.reason || "Time off"
                      : `Available ${selectedDayInfo.override?.startTime || ""} - ${selectedDayInfo.override?.endTime || ""}`}
                  </ThemedText>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Events List */}
        <View style={styles.eventsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={CalendarColors.primary} />
            </View>
          ) : error ? (
            <Animated.View
              entering={FadeInUp.delay(250).duration(400)}
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: isDark ? theme.border : "transparent",
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : "#FEF2F2",
                  },
                ]}
              >
                <Feather name="alert-circle" size={24} color="#EF4444" />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                {error}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setLoading(true);
                  loadData();
                }}
                style={({ pressed }) => [
                  styles.retryButton,
                  { backgroundColor: CalendarColors.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </Animated.View>
          ) : eventsForDate.length === 0 ? (
            <Animated.View
              entering={FadeInUp.delay(250).duration(400)}
              style={[
                styles.emptyState,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: isDark ? theme.border : "transparent",
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : "#F5F3FF",
                  },
                ]}
              >
                <Feather
                  name="calendar"
                  size={24}
                  color={CalendarColors.primary}
                />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                No events scheduled
              </ThemedText>
              <ThemedText
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Tap the + button to add a new event
              </ThemedText>
            </Animated.View>
          ) : (
            eventsForDate.map((event, index) => (
              <Animated.View
                key={event.id}
                entering={FadeInRight.delay(250 + index * 80).duration(400)}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.eventCard,
                    {
                      backgroundColor: isDark
                        ? CalendarColors.eventCardBgDark
                        : CalendarColors.eventCardBg,
                    },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    (navigation as any).navigate("BookingDetail", {
                      bookingId: event.id,
                    });
                  }}
                >
                  <View style={styles.eventTimeContainer}>
                    <Text
                      style={[
                        styles.eventTime,
                        { color: CalendarColors.primary },
                      ]}
                    >
                      {event.time}
                    </Text>
                    <Text
                      style={[
                        styles.eventEndTime,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.5)"
                            : "rgba(0,0,0,0.4)",
                        },
                      ]}
                    >
                      {event.endTime}
                    </Text>
                  </View>
                  <View style={styles.eventContent}>
                    <ThemedText
                      style={[
                        styles.eventTitle,
                        { color: isDark ? "#FFFFFF" : "#1A1A1A" },
                      ]}
                      numberOfLines={1}
                    >
                      {event.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.eventSubtitle,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.7)"
                            : "rgba(0,0,0,0.6)",
                        },
                      ]}
                    >
                      {event.subtitle}
                    </ThemedText>
                    <View style={styles.eventMeta}>
                      <Feather
                        name="map-pin"
                        size={12}
                        color={
                          isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"
                        }
                      />
                      <Text
                        style={[
                          styles.eventLocation,
                          {
                            color: isDark
                              ? "rgba(255,255,255,0.5)"
                              : "rgba(0,0,0,0.4)",
                          },
                        ]}
                      >
                        {event.location}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.eventTypeIndicator,
                      { backgroundColor: getEventTypeColor(event.type) },
                    ]}
                  >
                    <Feather
                      name={getEventTypeIcon(event.type)}
                      size={14}
                      color="#FFFFFF"
                    />
                  </View>
                </Pressable>
              </Animated.View>
            ))
          )}
        </View>

        {/* Reminders Section - Placeholder */}
        <Animated.View
          entering={FadeInUp.delay(400)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <View style={styles.sectionHeader}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
              Reminders
            </ThemedText>
          </View>
        </Animated.View>

        <View style={styles.remindersContainer}>
          <View
            style={[
              styles.placeholderCard,
              {
                backgroundColor: isDark
                  ? CalendarColors.reminderCardBgDark
                  : CalendarColors.reminderCardBg,
              },
            ]}
          >
            <Feather name="clock" size={24} color={theme.textTertiary} />
            <ThemedText
              style={[styles.placeholderText, { color: theme.textSecondary }]}
            >
              Reminders coming soon
            </ThemedText>
          </View>
        </View>

        {/* Legend */}
        <Animated.View
          entering={FadeInUp.delay(450).duration(400)}
          style={styles.legendContainer}
        >
          <ThemedText
            style={[styles.legendTitle, { color: theme.textTertiary }]}
          >
            Calendar Legend
          </ThemedText>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#F59E0B" }]}
              />
              <ThemedText
                style={[styles.legendText, { color: theme.textSecondary }]}
              >
                Blocked
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#8B5CF6" }]}
              />
              <ThemedText
                style={[styles.legendText, { color: theme.textSecondary }]}
              >
                Custom Hours
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: CalendarColors.primary },
                ]}
              />
              <ThemedText
                style={[styles.legendText, { color: theme.textSecondary }]}
              >
                Events
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + Spacing.lg + 80 }} />
      </View>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: CalendarColors.primary,
            bottom: insets.bottom + 20,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          (navigation as any).navigate("AddEvent");
        }}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "400",
  },
  userName: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 2,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  monthYearHeader: {
    marginBottom: Spacing.sm,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "600",
  },
  dateStripContainer: {
    marginHorizontal: -Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  dateStripContent: {
    flexDirection: "row",
    paddingHorizontal: Spacing.screenHorizontal,
    justifyContent: "space-between",
  },
  dateItem: {
    flex: 1,
    height: 76,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
  },
  dateItemSelected: {
    ...Shadows.sm,
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  dateDay: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  eventsContainer: {
    marginBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.card,
    ...Shadows.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  eventCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
    alignItems: "flex-start",
  },
  eventTimeContainer: {
    width: 70,
    marginRight: Spacing.md,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  eventEndTime: {
    fontSize: 12,
    marginTop: 2,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventLocation: {
    fontSize: 12,
  },
  eventTypeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  remindersContainer: {
    marginBottom: Spacing.lg,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 12,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  placeholderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.card,
    gap: Spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Date indicator styles
  dateIndicators: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    height: 10,
    gap: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventDots: {
    flexDirection: "row",
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Availability card styles
  availabilityCardContainer: {
    marginBottom: Spacing.md,
  },
  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    borderLeftWidth: 4,
  },
  availabilityCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  availabilityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  availabilityTextContainer: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  availabilitySubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  // Legend styles
  legendContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
