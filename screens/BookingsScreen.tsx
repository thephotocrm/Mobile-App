import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BookingCard } from "@/components/BookingCard";
import { Input } from "@/components/Input";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { BookingsStackParamList } from "@/navigation/BookingsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography } from "@/constants/theme";
import { bookingsApi, Booking, createTenantContext } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<BookingsStackParamList, "BookingsList">;

const BORDER_COLORS = ["#8B4565", "#3B82F6", "#22C55E", "#F59E0B"];

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
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
};

const getBorderColor = (index: number): string => {
  return BORDER_COLORS[index % BORDER_COLORS.length];
};

export default function BookingsScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }, [token, user])
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
      const dateKey = formatEventDate(booking.startTime);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(booking);
    });

    return groups;
  };

  const groupedBookings = groupBookingsByDate();

  return (
    <ScreenScrollView>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
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
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
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
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? "No bookings match your search" : "No upcoming bookings"}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.bookingsList}>
          {Object.entries(groupedBookings).map(([date, dateBookings]) => (
            <View key={date} style={styles.dateGroup}>
              <ThemedText style={[styles.dateHeader, { color: theme.textSecondary }]}>
                {date}
              </ThemedText>
              {dateBookings.map((booking, index) => (
                <BookingCard
                  key={booking.id}
                  eventTitle={booking.title}
                  clientName="Client"
                  eventDate={formatEventDate(booking.startTime)}
                  startTime={formatTime(booking.startTime)}
                  endTime={formatTime(booking.endTime)}
                  borderColor={getBorderColor(index)}
                  onPress={() =>
                    navigation.navigate("BookingDetail", { bookingId: booking.id })
                  }
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
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
    paddingVertical: Spacing.md,
    paddingHorizontal: 10,
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
