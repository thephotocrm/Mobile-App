import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const SWIPE_THRESHOLD = 100;

// Parse date string to extract day and month
const parseDateParts = (
  dateString?: string,
): { day: string; month: string } => {
  if (!dateString || dateString === "No date set") {
    return { day: "--", month: "TBD" };
  }
  const match = dateString.match(/(\w+)\s+(\d+)/);
  if (match) {
    return { day: match[2], month: match[1].substring(0, 3) };
  }
  return { day: "--", month: "TBD" };
};

// Get date badge background color based on stage
const getDateBadgeColor = (stageName: string, isDark: boolean): string => {
  const normalized = stageName.toLowerCase();
  if (isDark) {
    if (normalized.includes("inquiry") || normalized.includes("lead"))
      return "#1E293B"; // Slate dark
    if (normalized.includes("booked") || normalized.includes("contract"))
      return "#1E3A5F";
    if (normalized.includes("deposit") || normalized.includes("paid"))
      return "#14532D";
    if (normalized.includes("editing")) return "#4A1D54";
    if (normalized.includes("delivered") || normalized.includes("completed"))
      return "#14532D";
    return "#2A2A2A";
  }
  if (normalized.includes("inquiry") || normalized.includes("lead"))
    return "#F1F5F9"; // Soft slate/gray
  if (normalized.includes("booked") || normalized.includes("contract"))
    return "#EFF6FF";
  if (normalized.includes("deposit") || normalized.includes("paid"))
    return "#DCFCE7";
  if (normalized.includes("editing")) return "#FDF2F8";
  if (normalized.includes("delivered") || normalized.includes("completed"))
    return "#DCFCE7";
  return "#F5F5F7";
};

// Get date text color based on stage
const getDateTextColor = (stageName: string): string => {
  const normalized = stageName.toLowerCase();
  if (normalized.includes("inquiry") || normalized.includes("lead"))
    return "#64748B"; // Slate gray
  if (normalized.includes("booked") || normalized.includes("contract"))
    return "#3B82F6";
  if (normalized.includes("deposit") || normalized.includes("paid"))
    return "#22C55E";
  if (normalized.includes("editing")) return "#EC4899";
  if (normalized.includes("delivered") || normalized.includes("completed"))
    return "#22C55E";
  return "#6B7280";
};

// Get status badge styling
const getStatusBadgeStyle = (
  stageName: string,
  isDark: boolean,
): { backgroundColor: string; textColor: string } => {
  const normalized = stageName.toLowerCase();
  if (isDark) {
    if (normalized.includes("inquiry") || normalized.includes("lead"))
      return { backgroundColor: "#1E293B", textColor: "#94A3B8" }; // Slate
    if (normalized.includes("booked"))
      return { backgroundColor: "#1E3A5F", textColor: "#60A5FA" };
    if (normalized.includes("contract"))
      return { backgroundColor: "#2E1065", textColor: "#A78BFA" };
    if (normalized.includes("deposit") || normalized.includes("paid"))
      return { backgroundColor: "#14532D", textColor: "#4ADE80" };
    if (normalized.includes("editing"))
      return { backgroundColor: "#4A1D54", textColor: "#F472B6" };
    if (normalized.includes("delivered") || normalized.includes("completed"))
      return { backgroundColor: "#14532D", textColor: "#4ADE80" };
    if (normalized.includes("cancelled"))
      return { backgroundColor: "#450A0A", textColor: "#F87171" };
    return { backgroundColor: "#374151", textColor: "#9CA3AF" };
  }
  if (normalized.includes("inquiry") || normalized.includes("lead"))
    return { backgroundColor: "#F1F5F9", textColor: "#475569" }; // Soft slate
  if (normalized.includes("booked"))
    return { backgroundColor: "#DBEAFE", textColor: "#2563EB" };
  if (normalized.includes("contract"))
    return { backgroundColor: "#EDE9FE", textColor: "#7C3AED" };
  if (normalized.includes("deposit") || normalized.includes("paid"))
    return { backgroundColor: "#DCFCE7", textColor: "#16A34A" };
  if (normalized.includes("editing"))
    return { backgroundColor: "#FCE7F3", textColor: "#DB2777" };
  if (normalized.includes("delivered") || normalized.includes("completed"))
    return { backgroundColor: "#DCFCE7", textColor: "#16A34A" };
  if (normalized.includes("cancelled"))
    return { backgroundColor: "#FEE2E2", textColor: "#DC2626" };
  return { backgroundColor: "#F3F4F6", textColor: "#6B7280" };
};

// Determine context alert based on project state
const getContextAlert = (
  project: EnhancedProjectCardProps["project"],
): {
  message: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
} | null => {
  const stageName = project.stageName?.toLowerCase() || "";

  // Check for contract pending
  if (stageName.includes("booked") && !stageName.includes("contract")) {
    return {
      message: "Contract pending",
      icon: "file-text",
      color: "#8B5CF6", // Purple
    };
  }

  // Check for deposit needed
  if (stageName.includes("contract") && !stageName.includes("deposit")) {
    return {
      message: "Deposit not received",
      icon: "dollar-sign",
      color: "#EF4444",
    };
  }

  // Check if event is approaching (within 7 days)
  if (
    project.eventDate &&
    !stageName.includes("delivered") &&
    !stageName.includes("completed")
  ) {
    const eventDate = new Date(project.eventDate);
    const now = new Date();
    const daysUntil = Math.ceil(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntil <= 7 && daysUntil > 0) {
      return {
        message: `Event in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        icon: "alert-circle",
        color: "#3B82F6", // Blue
      };
    }
  }

  return null;
};

export interface EnhancedProjectCardProps {
  project: {
    id: string;
    title: string;
    clientName: string;
    stageName: string;
    stageColor?: string;
    eventDate?: string;
    eventType?: string;
    location?: string;
  };
  onPress: () => void;
  onArchive?: () => void;
  isUrgent?: boolean;
  isOverdue?: boolean;
}

export function EnhancedProjectCard({
  project,
  onPress,
  onArchive,
  isUrgent,
  isOverdue,
}: EnhancedProjectCardProps) {
  const { theme, isDark } = useTheme();
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);

  const dateParts = parseDateParts(project.eventDate);
  const dateBadgeColor = getDateBadgeColor(project.stageName, isDark);
  const dateTextColor = getDateTextColor(project.stageName);
  const statusStyle = getStatusBadgeStyle(project.stageName, isDark);
  const contextAlert = getContextAlert(project);

  const handleArchive = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onArchive?.();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Only allow left swipe (negative)
      const newX = startX.value + event.translationX;
      translateX.value = Math.min(0, Math.max(-SWIPE_THRESHOLD - 20, newX));
    })
    .onEnd(() => {
      if (translateX.value < -SWIPE_THRESHOLD / 2) {
        // Swipe threshold reached - trigger archive
        translateX.value = withSpring(-SWIPE_THRESHOLD);
        if (onArchive) {
          runOnJS(handleArchive)();
        }
      } else {
        // Spring back
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = 0.98;
    })
    .onEnd(() => {
      scale.value = 1;
      runOnJS(onPress)();
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      scale.value = 1;
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: withSpring(scale.value) },
    ],
  }));

  const archiveBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.container}>
      {/* Archive action background */}
      {onArchive && (
        <Animated.View
          style={[
            styles.archiveBackground,
            { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
            archiveBackgroundStyle,
          ]}
        >
          <View style={styles.archiveContent}>
            <Feather name="archive" size={20} color="#6B7280" />
            <Text style={styles.archiveText}>Archive</Text>
          </View>
        </Animated.View>
      )}

      {/* Main card - wrapped in GestureDetector for swipe/tap */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.card,
            cardAnimatedStyle,
            {
              backgroundColor: theme.backgroundCard,
              borderColor: isDark ? theme.border : "transparent",
              borderWidth: isDark ? 1 : 0,
            },
            isUrgent && styles.cardUrgent,
            isOverdue && styles.cardOverdue,
          ]}
        >
          {/* Date Badge - Left Side */}
          <View style={[styles.dateBadge, { backgroundColor: dateBadgeColor }]}>
            <Text style={[styles.dateDay, { color: dateTextColor }]}>
              {dateParts.day}
            </Text>
            <Text style={[styles.dateMonth, { color: dateTextColor }]}>
              {dateParts.month}
            </Text>
          </View>

          {/* Content - Middle */}
          <View style={styles.content}>
            {/* Title */}
            <ThemedText
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
            >
              {project.title}
            </ThemedText>

            {/* Client name */}
            <Text
              style={[styles.clientName, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {project.clientName}
            </Text>

            {/* Status row with badge and location */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusStyle.backgroundColor },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: statusStyle.textColor }]}
                >
                  {project.stageName?.toUpperCase()}
                </Text>
              </View>
              {project.location && (
                <View style={styles.locationContainer}>
                  <Feather
                    name="map-pin"
                    size={10}
                    color={theme.textTertiary}
                  />
                  <Text
                    style={[styles.locationText, { color: theme.textTertiary }]}
                    numberOfLines={1}
                  >
                    {project.location}
                  </Text>
                </View>
              )}
            </View>

            {/* Context alert */}
            {contextAlert && (
              <View style={styles.alertContainer}>
                <Feather
                  name={contextAlert.icon}
                  size={12}
                  color={contextAlert.color}
                />
                <Text style={[styles.alertText, { color: contextAlert.color }]}>
                  {contextAlert.message}
                </Text>
              </View>
            )}
          </View>

          {/* More button - Right Side */}
          <Pressable
            style={styles.moreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name="more-vertical"
              size={18}
              color={theme.textTertiary}
            />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  archiveBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD + 20,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  archiveContent: {
    alignItems: "center",
    gap: 4,
  },
  archiveText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  cardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: "#8B4565", // Brand dusty rose
  },
  cardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  clientName: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  alertContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  alertText: {
    fontSize: 11,
    fontWeight: "500",
  },
  moreButton: {
    padding: Spacing.xs,
    marginTop: -4,
  },
});
