import React from "react";
import { Pressable, View, StyleSheet, Image, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, BlysColors } from "@/constants/theme";

interface ProjectCardProps {
  projectTitle: string;
  clientName: string;
  stageName: string;
  stageColor: string;
  eventDate: string;
  eventType?: string;
  imageUrl?: string;
  onPress: () => void;
}

// Parse date string to extract day and month
const parseDateParts = (
  dateString: string,
): { day: string; month: string; year: string } => {
  // Handle "No date set" case
  if (!dateString || dateString === "No date set") {
    return { day: "--", month: "TBD", year: "" };
  }

  // Try to parse "Mon DD, YYYY" format
  const match = dateString.match(/(\w+)\s+(\d+),?\s*(\d{4})?/);
  if (match) {
    return {
      day: match[2],
      month: match[1].substring(0, 3),
      year: match[3] || "",
    };
  }

  return { day: "--", month: "TBD", year: "" };
};

// Get date badge background color based on photography stage
const getDateBadgeColor = (stageName: string, isDark: boolean): string => {
  const normalizedStage = stageName.toLowerCase();

  if (isDark) {
    // Dark mode backgrounds
    switch (normalizedStage) {
      case "inquiry":
      case "lead":
        return "#422006"; // Dark amber
      case "booked":
      case "contract sent":
        return "#1E3A5F"; // Dark blue
      case "deposit paid":
        return "#14532D"; // Dark green
      case "editing":
        return "#4A1D54"; // Dark pink
      case "shot complete":
      case "shoot complete":
        return "#134E4A"; // Dark teal
      case "delivered":
      case "completed":
        return "#14532D"; // Dark green
      default:
        return "#2A2A2A"; // Dark gray
    }
  }

  // Light mode backgrounds
  switch (normalizedStage) {
    case "inquiry":
    case "lead":
      return "#FEF3C7"; // Light amber
    case "booked":
    case "contract sent":
      return "#EFF6FF"; // Light blue
    case "deposit paid":
      return "#DCFCE7"; // Light green
    case "editing":
      return "#FDF2F8"; // Light pink
    case "shot complete":
    case "shoot complete":
      return "#F0FDFA"; // Light teal
    case "delivered":
    case "completed":
      return "#DCFCE7"; // Light green
    default:
      return "#F5F5F7"; // Light gray
  }
};

// Get date text color based on photography stage
const getDateTextColor = (stageName: string): string => {
  const normalizedStage = stageName.toLowerCase();

  switch (normalizedStage) {
    case "inquiry":
    case "lead":
      return "#D97706"; // Amber
    case "booked":
    case "contract sent":
      return "#3B82F6"; // Blue
    case "deposit paid":
      return "#22C55E"; // Green
    case "editing":
      return "#EC4899"; // Pink
    case "shot complete":
    case "shoot complete":
      return "#14B8A6"; // Teal
    case "delivered":
    case "completed":
      return "#22C55E"; // Green
    default:
      return "#6B7280"; // Gray
  }
};

// Get status badge styling for photography stages
const getStatusBadgeStyle = (
  stageName: string,
  isDark: boolean,
): { backgroundColor: string; textColor: string } => {
  const normalizedStage = stageName.toLowerCase();

  if (isDark) {
    switch (normalizedStage) {
      case "inquiry":
      case "lead":
        return { backgroundColor: "#422006", textColor: "#F59E0B" };
      case "booked":
        return { backgroundColor: "#1E3A5F", textColor: "#60A5FA" };
      case "contract sent":
        return { backgroundColor: "#2E1065", textColor: "#A78BFA" };
      case "deposit paid":
        return { backgroundColor: "#14532D", textColor: "#4ADE80" };
      case "editing":
        return { backgroundColor: "#4A1D54", textColor: "#F472B6" };
      case "shot complete":
      case "shoot complete":
        return { backgroundColor: "#134E4A", textColor: "#2DD4BF" };
      case "delivered":
      case "completed":
        return { backgroundColor: "#14532D", textColor: "#4ADE80" };
      case "cancelled":
        return { backgroundColor: "#450A0A", textColor: "#F87171" };
      default:
        return { backgroundColor: "#374151", textColor: "#9CA3AF" };
    }
  }

  switch (normalizedStage) {
    case "inquiry":
    case "lead":
      return { backgroundColor: "#FEF3C7", textColor: "#D97706" };
    case "booked":
      return { backgroundColor: "#DBEAFE", textColor: "#2563EB" };
    case "contract sent":
      return { backgroundColor: "#EDE9FE", textColor: "#7C3AED" };
    case "deposit paid":
      return { backgroundColor: "#DCFCE7", textColor: "#16A34A" };
    case "editing":
      return { backgroundColor: "#FCE7F3", textColor: "#DB2777" };
    case "shot complete":
    case "shoot complete":
      return { backgroundColor: "#CCFBF1", textColor: "#0D9488" };
    case "delivered":
    case "completed":
      return { backgroundColor: "#DCFCE7", textColor: "#16A34A" };
    case "cancelled":
      return { backgroundColor: "#FEE2E2", textColor: "#DC2626" };
    default:
      return { backgroundColor: "#F3F4F6", textColor: "#6B7280" };
  }
};

// Get event type icon
const getEventTypeIcon = (
  eventType?: string,
): keyof typeof Feather.glyphMap => {
  if (!eventType) return "heart";
  switch (eventType.toLowerCase()) {
    case "wedding":
      return "heart";
    case "engagement":
      return "gift";
    case "portrait":
      return "user";
    case "elopement":
      return "map-pin";
    default:
      return "camera";
  }
};

// Get event type badge color
const getEventTypeBadgeStyle = (
  eventType: string | undefined,
  isDark: boolean,
): { backgroundColor: string; textColor: string } => {
  if (isDark) {
    return { backgroundColor: "#1E1B4B", textColor: "#A78BFA" };
  }
  return { backgroundColor: "#EDE9FE", textColor: "#7C3AED" };
};

export function ProjectCard({
  projectTitle,
  clientName,
  stageName,
  stageColor,
  eventDate,
  eventType,
  imageUrl,
  onPress,
}: ProjectCardProps) {
  const { theme, isDark } = useTheme();
  const dateParts = parseDateParts(eventDate);
  const dateBadgeColor = getDateBadgeColor(stageName, isDark);
  const dateTextColor = getDateTextColor(stageName);
  const statusStyle = getStatusBadgeStyle(stageName, isDark);
  const eventTypeStyle = getEventTypeBadgeStyle(eventType, isDark);
  const eventIcon = getEventTypeIcon(eventType);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
        pressed && styles.cardPressed,
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
        <View style={styles.titleRow}>
          <ThemedText
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
          >
            {projectTitle}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.subtitle, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {clientName}
        </ThemedText>
        {/* Event Type Badge */}
        {eventType && (
          <View style={styles.eventTypeRow}>
            <View
              style={[
                styles.eventTypeBadge,
                { backgroundColor: eventTypeStyle.backgroundColor },
              ]}
            >
              <Feather
                name={eventIcon}
                size={10}
                color={eventTypeStyle.textColor}
                style={styles.eventTypeIcon}
              />
              <Text
                style={[
                  styles.eventTypeText,
                  { color: eventTypeStyle.textColor },
                ]}
              >
                {eventType}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Status Badge & More Button - Right Side */}
      <View style={styles.rightSection}>
        <Pressable
          style={styles.moreButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather
            name="more-horizontal"
            size={20}
            color={theme.textTertiary}
          />
        </Pressable>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusStyle.backgroundColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusStyle.textColor }]}>
            {stageName.toUpperCase()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
    minHeight: 80,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  dateBadge: {
    width: 52,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    textTransform: "capitalize",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  eventTypeRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  eventTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  eventTypeIcon: {
    marginRight: 4,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 56,
  },
  moreButton: {
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
