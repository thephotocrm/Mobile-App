import React from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  Spacing,
  BorderRadius,
  Typography,
  BlysColors,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Notification, NotificationType } from "@/services/api";

// Notification type to icon mapping
const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: keyof typeof Feather.glyphMap; color: string; label: string }
> = {
  LEAD: { icon: "mail", color: "#F59E0B", label: "New Inquiry" },
  PAYMENT: { icon: "dollar-sign", color: "#22C55E", label: "Payment Received" },
  MESSAGE: { icon: "message-circle", color: "#3B82F6", label: "New Message" },
  CONTRACT: { icon: "file-text", color: "#3B82F6", label: "Contract Update" },
  SMART_FILE_VIEWED: { icon: "eye", color: "#8B5CF6", label: "File Viewed" },
  SMART_FILE_ACCEPTED: {
    icon: "check-circle",
    color: "#22C55E",
    label: "Contract Signed",
  },
  BOOKING: {
    icon: "calendar",
    color: BlysColors.primary,
    label: "Booking Update",
  },
  GALLERY: {
    icon: "image",
    color: BlysColors.primary,
    label: "Gallery Update",
  },
  AUTOMATION: { icon: "zap", color: "#F59E0B", label: "Automation" },
  REMINDER: { icon: "bell", color: "#6B7280", label: "Reminder" },
  SYSTEM: { icon: "info", color: "#6B7280", label: "System" },
};

interface ActivityItemProps {
  notification: Notification;
  onPress: () => void;
  showDivider?: boolean;
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Format relative time (e.g., "2h ago", "3d ago")
const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Get initials from title
const getInitials = (title: string): string => {
  const words = title.split(" ");
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return title.substring(0, 2).toUpperCase();
};

export function ActivityItem({
  notification,
  onPress,
  showDivider = true,
}: ActivityItemProps) {
  const { theme, isDark } = useTheme();
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const initials = getInitials(notification.title);
  const isUnread = !notification.read;

  return (
    <View>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.container,
          isUnread && {
            backgroundColor: isDark
              ? `${BlysColors.primary}08`
              : `${BlysColors.primary}05`,
          },
          pressed && { opacity: 0.95 },
        ]}
      >
        {/* Avatar/Icon */}
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isDark
                ? theme.backgroundSecondary
                : hexToRgba(config.color, 0.1),
            },
          ]}
        >
          {notification.type === "MESSAGE" || notification.type === "LEAD" ? (
            <Text style={[styles.avatarText, { color: config.color }]}>
              {initials}
            </Text>
          ) : (
            <Feather name={config.icon} size={18} color={config.color} />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText
            style={[
              styles.title,
              { color: theme.text },
              isUnread && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </ThemedText>

          {/* Description or preview */}
          <ThemedText
            style={[styles.description, { color: theme.textSecondary }]}
            numberOfLines={notification.type === "MESSAGE" ? 2 : 1}
          >
            {notification.description || config.label}
          </ThemedText>
        </View>

        {/* Right side - timestamp and unread indicator */}
        <View style={styles.rightSection}>
          <ThemedText style={[styles.timestamp, { color: theme.textTertiary }]}>
            {formatRelativeTime(notification.createdAt)}
          </ThemedText>
          {isUnread && (
            <View
              style={[
                styles.unreadDot,
                { backgroundColor: BlysColors.primary },
              ]}
            />
          )}
        </View>
      </Pressable>

      {/* Divider */}
      {showDivider && (
        <View
          style={[
            styles.divider,
            { backgroundColor: theme.divider, marginLeft: 68 },
          ]}
        />
      )}
    </View>
  );
}

// Empty state for activity feed
interface EmptyActivityStateProps {
  onReachOut: () => void;
}

export function EmptyActivityState({ onReachOut }: EmptyActivityStateProps) {
  const { theme, isDark } = useTheme();

  const handleHelpPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("https://help.thephotocrm.com/tips/follow-up-templates");
  };

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: `${BlysColors.primary}10` },
        ]}
      >
        <Feather name="check-circle" size={32} color={BlysColors.primary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        All caught up!
      </ThemedText>
      <ThemedText
        style={[styles.emptySubtitle, { color: theme.textSecondary }]}
      >
        No new notifications
      </ThemedText>
      <Pressable
        onPress={onReachOut}
        style={({ pressed }) => [
          styles.emptyButton,
          {
            backgroundColor: isDark ? theme.backgroundSecondary : "#F3F4F6",
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Feather name="send" size={14} color={BlysColors.primary} />
        <Text style={[styles.emptyButtonText, { color: BlysColors.primary }]}>
          Reach out to leads?
        </Text>
      </Pressable>
      <Pressable
        onPress={handleHelpPress}
        style={({ pressed }) => [
          styles.emptyHelpLink,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Feather name="zap" size={12} color={BlysColors.primary} />
        <Text style={[styles.emptyHelpText, { color: BlysColors.primary }]}>
          Client follow-up templates
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.bodyMedium,
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: "600",
  },
  description: {
    ...Typography.caption,
    lineHeight: 18,
  },
  rightSection: {
    alignItems: "flex-end",
    minWidth: 60,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
  },
  // Empty state
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyHelpLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: 6,
  },
  emptyHelpText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
