import React from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Booking } from "@/services/api";

interface BookingGroup {
  id: string;
  label: string;
  bookings: Booking[];
}

interface ScheduleCardProps {
  day: BookingGroup;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Get client initials from title
const getInitials = (title: string): string => {
  const words = title.split(" ");
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return title.substring(0, 2).toUpperCase();
};

// Format time from ISO string
const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Determine shoot type icon based on title/type
const getShootTypeIcon = (
  title: string,
): { icon: keyof typeof Feather.glyphMap; color: string } => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("wedding")) {
    return { icon: "heart", color: "#EC4899" };
  }
  if (lowerTitle.includes("engagement") || lowerTitle.includes("couple")) {
    return { icon: "heart", color: "#F59E0B" };
  }
  if (lowerTitle.includes("portrait") || lowerTitle.includes("headshot")) {
    return { icon: "user", color: "#3B82F6" };
  }
  if (lowerTitle.includes("event") || lowerTitle.includes("corporate")) {
    return { icon: "users", color: "#8B5CF6" };
  }
  return { icon: "camera", color: BlysColors.primary };
};

export function ScheduleCard({ day, onPress }: ScheduleCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleNavigate = (location: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => (scale.value = 0.97)}
      onPressOut={() => (scale.value = 1)}
      style={[
        animatedStyle,
        styles.card,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      {/* Day Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark
              ? `${BlysColors.primary}15`
              : `${BlysColors.primary}08`,
          },
        ]}
      >
        <Text style={[styles.dayLabel, { color: BlysColors.primary }]}>
          {day.label}
        </Text>
        <Text style={[styles.eventCount, { color: BlysColors.primary }]}>
          {day.bookings.length} {day.bookings.length === 1 ? "event" : "events"}
        </Text>
      </View>

      {/* Bookings List */}
      <View style={styles.bookingsList}>
        {day.bookings.map((booking, index) => {
          const shootType = getShootTypeIcon(booking.title);
          const initials = getInitials(booking.title);

          return (
            <View
              key={booking.id}
              style={[
                styles.bookingItem,
                index < day.bookings.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? theme.border : "#F3F4F6",
                },
              ]}
            >
              {/* Avatar with initials */}
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${shootType.color}15` },
                ]}
              >
                <Text style={[styles.avatarText, { color: shootType.color }]}>
                  {initials}
                </Text>
              </View>

              {/* Booking info */}
              <View style={styles.bookingInfo}>
                <View style={styles.bookingHeader}>
                  <ThemedText
                    style={[styles.bookingTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {booking.title}
                  </ThemedText>
                  <Feather
                    name={shootType.icon}
                    size={12}
                    color={shootType.color}
                  />
                </View>

                {/* Time - prominent */}
                <Text
                  style={[styles.bookingTime, { color: BlysColors.primary }]}
                >
                  {formatTime(booking.startAt)}
                </Text>

                {/* Location with navigate action */}
                {booking.location && (
                  <Pressable
                    onPress={() => handleNavigate(booking.location!)}
                    style={({ pressed }) => [
                      styles.locationRow,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Feather
                      name="map-pin"
                      size={10}
                      color={theme.textTertiary}
                    />
                    <ThemedText
                      style={[
                        styles.locationText,
                        { color: theme.textTertiary },
                      ]}
                      numberOfLines={1}
                    >
                      {booking.location}
                    </ThemedText>
                    <Feather
                      name="navigation"
                      size={10}
                      color={BlysColors.primary}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </AnimatedPressable>
  );
}

// Empty state for schedule
interface EmptyScheduleCardProps {
  onAddShoot: () => void;
}

export function EmptyScheduleCard({ onAddShoot }: EmptyScheduleCardProps) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <Feather name="sun" size={28} color={BlysColors.primary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        Your week is wide open!
      </ThemedText>
      <ThemedText
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        Time to book some shoots
      </ThemedText>
      <Pressable
        onPress={onAddShoot}
        style={({ pressed }) => [
          styles.emptyButton,
          { backgroundColor: BlysColors.primary },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Feather name="plus" size={14} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Add Shoot</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: BorderRadius.card,
    overflow: "hidden",
    ...Shadows.sm,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  eventCount: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.8,
  },
  bookingsList: {
    padding: Spacing.sm,
  },
  bookingItem: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bookingInfo: {
    flex: 1,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  bookingTime: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  // Empty state
  emptyCard: {
    width: 280,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${BlysColors.primary}10`,
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
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
