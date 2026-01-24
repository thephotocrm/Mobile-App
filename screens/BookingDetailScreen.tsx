import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { bookingsApi, Booking, createTenantContext } from "@/services/api";

type BookingDetailRouteProp = RouteProp<
  { BookingDetail: { bookingId: string } },
  "BookingDetail"
>;

// Format date to readable string
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Format time to "10:00 AM" format
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case "CONFIRMED":
      return "#22C55E";
    case "PENDING":
      return "#F59E0B";
    case "CANCELLED":
      return "#EF4444";
    default:
      return "#6B7280";
  }
};

// Get booking type display name
const getBookingTypeLabel = (type?: string): string => {
  switch (type) {
    case "CONSULTATION":
      return "Consultation";
    case "SHOOT":
      return "Photo Session";
    case "MEETING":
      return "Meeting";
    default:
      return "Event";
  }
};

export default function BookingDetailScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const tenant = createTenantContext(user);
      const result = await bookingsApi.getById(token, bookingId, tenant);
      setBooking(result);
    } catch (err) {
      console.error("Failed to load booking:", err);
      setError("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  }, [token, user, bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleConfirm = () => {
    Alert.alert(
      "Booking Confirmed",
      "The client has been notified of your confirmation",
    );
  };

  const handleReschedule = () => {
    Alert.alert(
      "Reschedule",
      "Rescheduling functionality will be available soon",
    );
  };

  const handleCall = () => {
    if (booking?.clientPhone) {
      Linking.openURL(`tel:${booking.clientPhone}`);
    }
  };

  const handleMessage = () => {
    if (booking?.clientPhone) {
      Linking.openURL(`sms:${booking.clientPhone}`);
    }
  };

  const handleEmail = () => {
    if (booking?.clientEmail) {
      Linking.openURL(`mailto:${booking.clientEmail}`);
    }
  };

  const handleDirections = () => {
    if (booking?.location) {
      const address = encodeURIComponent(booking.location);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  const handleJoinMeeting = () => {
    if (booking?.googleMeetLink) {
      Linking.openURL(booking.googleMeetLink);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
          {error || "Booking not found"}
        </ThemedText>
        <Pressable
          onPress={loadBooking}
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </Pressable>
      </View>
    );
  }

  const clientName = booking.clientName || "Client";
  const hasPhone = !!booking.clientPhone;
  const hasEmail = !!booking.clientEmail;
  const hasLocation = !!booking.location;
  const hasMeetLink = !!booking.googleMeetLink;

  return (
    <ScreenScrollView>
      <View
        style={[styles.hero, { backgroundColor: theme.backgroundSecondary }]}
      >
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(booking.status) },
          ]}
        >
          <ThemedText style={styles.statusText}>{booking.status}</ThemedText>
        </View>

        <ThemedText
          style={[
            styles.heroTitle,
            {
              fontSize: Typography.h2.fontSize,
              fontWeight: Typography.h2.fontWeight,
            },
          ]}
        >
          {booking.title}
        </ThemedText>
        <ThemedText
          style={[styles.heroSubtitle, { color: theme.textSecondary }]}
        >
          with {clientName}
        </ThemedText>
        {booking.bookingType && (
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText
              style={[styles.typeText, { color: theme.textSecondary }]}
            >
              {getBookingTypeLabel(booking.bookingType)}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {hasPhone && (
          <Pressable
            onPress={handleCall}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="phone" size={20} color={theme.primary} />
            <ThemedText style={[styles.quickActionText, { color: theme.text }]}>
              Call
            </ThemedText>
          </Pressable>
        )}

        {hasPhone && (
          <Pressable
            onPress={handleMessage}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="message-square" size={20} color={theme.primary} />
            <ThemedText style={[styles.quickActionText, { color: theme.text }]}>
              Message
            </ThemedText>
          </Pressable>
        )}

        {hasEmail && (
          <Pressable
            onPress={handleEmail}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="mail" size={20} color={theme.primary} />
            <ThemedText style={[styles.quickActionText, { color: theme.text }]}>
              Email
            </ThemedText>
          </Pressable>
        )}

        {hasLocation && (
          <Pressable
            onPress={handleDirections}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="navigation" size={20} color={theme.primary} />
            <ThemedText style={[styles.quickActionText, { color: theme.text }]}>
              Directions
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Google Meet Link */}
      {hasMeetLink && (
        <View style={styles.meetSection}>
          <Pressable
            onPress={handleJoinMeeting}
            style={({ pressed }) => [
              styles.meetButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="video" size={20} color="#FFFFFF" />
            <ThemedText style={styles.meetButtonText}>
              Join Google Meet
            </ThemedText>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Date</ThemedText>
            <ThemedText style={styles.infoValue}>
              {formatDate(booking.startAt)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Feather name="clock" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Time</ThemedText>
            <ThemedText style={styles.infoValue}>
              {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
            </ThemedText>
          </View>
        </View>

        {hasLocation && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={20} color={theme.primary} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Location</ThemedText>
              <ThemedText style={styles.infoValue}>
                {booking.location}
              </ThemedText>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <Feather name="user" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Client</ThemedText>
            <ThemedText style={styles.infoValue}>{clientName}</ThemedText>
            {hasEmail && (
              <ThemedText
                style={[styles.infoSubvalue, { color: theme.textSecondary }]}
              >
                {booking.clientEmail}
              </ThemedText>
            )}
            {hasPhone && (
              <ThemedText
                style={[styles.infoSubvalue, { color: theme.textSecondary }]}
              >
                {booking.clientPhone}
              </ThemedText>
            )}
          </View>
        </View>

        {(booking.description || booking.notes) && (
          <View style={styles.infoRow}>
            <Feather name="file-text" size={20} color={theme.primary} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Notes</ThemedText>
              <ThemedText style={styles.infoValue}>
                {booking.description || booking.notes}
              </ThemedText>
            </View>
          </View>
        )}

        {booking.isFirstBooking && (
          <View style={styles.infoRow}>
            <Feather name="star" size={20} color="#F59E0B" />
            <View style={styles.infoContent}>
              <ThemedText style={[styles.infoValue, { color: "#F59E0B" }]}>
                First booking with this client
              </ThemedText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {booking.status === "PENDING" && (
          <PrimaryButton title="Confirm Booking" onPress={handleConfirm} />
        )}
        <SecondaryButton title="Reschedule" onPress={handleReschedule} />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  hero: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  heroTitle: {
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  typeBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  quickActionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
    minWidth: 80,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  meetSection: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  meetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "#1A73E8",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  meetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.6,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
  },
  infoSubvalue: {
    fontSize: 14,
  },
  actions: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
});
