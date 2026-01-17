import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BookingCard } from "@/components/BookingCard";
import { Input } from "@/components/Input";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { BookingsStackParamList } from "@/navigation/BookingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { bookingsApi, Booking, createTenantContext } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<
  BookingsStackParamList,
  "BookingsList"
>;

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#22C55E",
  PENDING: "#F59E0B",
  CANCELLED: "#EF4444",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getMonthDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const days: (number | null)[] = [];

  // Add empty slots for days before the first of the month
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }

  // Add the days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return days;
};

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getBorderColor = (status: string): string => {
  return STATUS_COLORS[status] || "#8B4565";
};

export default function BookingsScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const monthDays = useMemo(
    () => getMonthDays(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const bookingDates = useMemo(() => {
    const dates = new Set<string>();
    bookings.forEach((booking) => {
      const date = new Date(booking.startAt);
      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        dates.add(date.getDate().toString());
      }
    });
    return dates;
  }, [bookings, currentMonth, currentYear]);

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const loadBookings = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create tenant context for multi-tenant routing
      const tenant = createTenantContext(user);

      const result = await bookingsApi.getAll(token, tenant);
      setBookings(result);
    } catch (err) {
      console.error("Error loading bookings:", err);
      setError("Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadBookings();
    }, [token, user]),
  );

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      booking.title.toLowerCase().includes(query) ||
      (booking.location?.toLowerCase().includes(query) ?? false)
    );
  });

  const groupBookingsByDate = () => {
    const groups: { [key: string]: Booking[] } = {};

    filteredBookings.forEach((booking) => {
      const dateKey = formatEventDate(booking.startAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(booking);
    });

    return groups;
  };

  const groupedBookings = groupBookingsByDate();

  const isToday = (day: number | null) => {
    if (!day) return false;
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  return (
    <View style={styles.screenContainer}>
      <ScreenScrollView>
        {/* Mini Calendar */}
        <View
          style={[
            styles.calendarContainer,
            { backgroundColor: theme.backgroundCard },
          ]}
        >
          <View style={styles.calendarHeader}>
            <Pressable
              onPress={goToPreviousMonth}
              style={({ pressed }) => [
                styles.calendarNavButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="chevron-left" size={20} color={theme.text} />
            </Pressable>
            <ThemedText style={[Typography.body, { fontWeight: "600" }]}>
              {monthName}
            </ThemedText>
            <Pressable
              onPress={goToNextMonth}
              style={({ pressed }) => [
                styles.calendarNavButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="chevron-right" size={20} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((day) => (
              <ThemedText
                key={day}
                style={[styles.weekdayText, { color: theme.textSecondary }]}
              >
                {day}
              </ThemedText>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {monthDays.map((day, index) => (
              <View key={index} style={styles.dayCell}>
                {day !== null && (
                  <View
                    style={[
                      styles.dayContent,
                      isToday(day) && [
                        styles.todayCell,
                        { backgroundColor: theme.primary },
                      ],
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayText,
                        { color: isToday(day) ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {day}
                    </ThemedText>
                    {bookingDates.has(day.toString()) && !isToday(day) && (
                      <View
                        style={[
                          styles.bookingDot,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Feather
              name="search"
              size={20}
              color={theme.textSecondary}
              style={styles.searchIcon}
            />
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Feather
              name="alert-circle"
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText
              style={[styles.errorText, { color: theme.textSecondary }]}
            >
              {error}
            </ThemedText>
            <Pressable
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={loadBookings}
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="calendar" size={48} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              {searchQuery
                ? "No bookings match your search"
                : "No upcoming bookings"}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {Object.entries(groupedBookings).map(([date, dateBookings]) => (
              <View key={date} style={styles.dateGroup}>
                <ThemedText
                  style={[styles.dateHeader, { color: theme.textSecondary }]}
                >
                  {date}
                </ThemedText>
                {dateBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    eventTitle={booking.title}
                    clientName={booking.clientName || "Client"}
                    eventDate={formatEventDate(booking.startAt)}
                    startTime={formatTime(booking.startAt)}
                    endTime={formatTime(booking.endAt)}
                    borderColor={getBorderColor(booking.status)}
                    onPress={() =>
                      navigation.navigate("BookingDetail", {
                        bookingId: booking.id,
                      })
                    }
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScreenScrollView>

      {/* FAB for creating new booking */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.md },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
        onPress={() =>
          Alert.alert("New Booking", "Create booking feature coming soon!")
        }
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  calendarNavButton: {
    padding: Spacing.sm,
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayContent: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  todayCell: {
    borderRadius: 16,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  bookingDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  searchWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: Spacing.md,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  bookingsList: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  fab: {
    position: "absolute",
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
