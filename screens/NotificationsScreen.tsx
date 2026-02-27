import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  SectionList,
} from "react-native";
import {
  useNavigation,
  useFocusEffect,
  NavigationProp,
} from "@react-navigation/native";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import {
  notificationsApi,
  createTenantContext,
  Notification,
  NotificationType,
} from "@/services/api";
import { setBadgeCount } from "@/services/notifications";

// Define the navigation types for tab navigator with nested stacks
type RootTabParamList = {
  InboxTab: { screen: string; params?: { contactId: string } };
  BookingsTab: { screen: string; params?: { bookingId: string } };
  ProjectsTab: { screen: string; params?: { projectId: string } };
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getDateSection = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Earlier";
};

export function NotificationsScreen() {
  const { theme } = useTheme();
  const screenInsets = useScreenInsets();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [apiAvailable, setApiAvailable] = useState(true);

  const loadNotifications = async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const tenant = createTenantContext(user);
      const data = await notificationsApi.getAll(token, tenant, 50);

      // Validate that we got an array back (API might return HTML on error)
      if (!Array.isArray(data)) {
        console.warn(
          "[Notifications] API returned non-array data:",
          typeof data,
        );
        setNotifications([]);
        return;
      }

      console.log("[Notifications] Loaded:", data.length, "notifications");
      setNotifications(data);
    } catch (err) {
      console.error("Error loading notifications:", err);
      // Check if this is a JSON parse error (API returning HTML)
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
        // API endpoint not available yet - show empty state instead of error
        console.warn("[Notifications] API not available, showing empty state");
        setNotifications([]);
        setApiAvailable(false);
      } else {
        setError("Failed to load notifications");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const silentRefreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const tenant = createTenantContext(user);
      const data = await notificationsApi.getAll(token, tenant, 50);
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Silent refresh notifications error:", err);
    }
  }, [token, user]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [token, user]),
  );

  useAutoRefresh(silentRefreshNotifications, 30000);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!token || notification.read) return;

    try {
      const tenant = createTenantContext(user);
      await notificationsApi.markAsRead(token, notification.id, tenant);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );

      // If this was the last unread notification, clear the badge
      const remainingUnread = notifications.filter(
        (n) => !n.read && n.id !== notification.id,
      ).length;
      if (remainingUnread === 0) {
        await setBadgeCount(0);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;

    try {
      const tenant = createTenantContext(user);
      await notificationsApi.markAllAsRead(token, tenant);

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      // Clear the app badge on home screen
      await setBadgeCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const getIconName = (
    type: NotificationType,
  ): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "MESSAGE":
        return "message-circle";
      case "BOOKING":
        return "calendar";
      case "LEAD":
        return "user-plus";
      case "PAYMENT":
        return "credit-card";
      case "CONTRACT":
        return "file-text";
      case "SMART_FILE_VIEWED":
      case "SMART_FILE_ACCEPTED":
        return "eye";
      case "GALLERY":
        return "image";
      case "AUTOMATION":
        return "zap";
      case "REMINDER":
        return "clock";
      case "SYSTEM":
        return "settings";
      default:
        return "bell";
    }
  };

  const getIconColor = (type: NotificationType, priority: string): string => {
    if (priority === "HIGH") return "#F97316"; // Coral/orange for high priority

    switch (type) {
      case "MESSAGE":
        return "#6B7280"; // Gray for messages/mentions
      case "LEAD":
        return "#14B8A6"; // Teal for leads
      case "PAYMENT":
        return "#22C55E"; // Green for payments
      case "BOOKING":
        return "#14B8A6"; // Teal for bookings
      case "REMINDER":
        return "#14B8A6"; // Teal for reminders (bell icon)
      case "CONTRACT":
      case "SMART_FILE_VIEWED":
      case "SMART_FILE_ACCEPTED":
        return "#F97316"; // Coral for contracts/alerts
      default:
        return "#6B7280"; // Gray default
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read when tapped
    handleMarkAsRead(notification);

    // Navigate based on notification type
    if (notification.contactId && notification.type === "MESSAGE") {
      navigation.navigate("InboxTab", {
        screen: "ThreadDetail",
        params: { contactId: notification.contactId },
      });
    } else if (notification.projectId) {
      navigation.navigate("ProjectsTab", {
        screen: "ProjectDetail",
        params: { projectId: notification.projectId },
      });
    }
  };

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by date section
  const groupedNotifications = useMemo(() => {
    const sections: { [key: string]: Notification[] } = {};

    filteredNotifications.forEach((notification) => {
      const section = getDateSection(notification.createdAt);
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(notification);
    });

    // Convert to array format for SectionList
    const sectionOrder = [
      "Today",
      "Yesterday",
      "This Week",
      "This Month",
      "Earlier",
    ];
    return sectionOrder
      .filter((title) => sections[title] && sections[title].length > 0)
      .map((title) => ({
        title,
        data: sections[title],
      }));
  }, [filteredNotifications]);

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconColor = getIconColor(item.type, item.priority);

    return (
      <Pressable
        style={({ pressed }) => [pressed && styles.cardPressed]}
        onPress={() => handleNotificationPress(item)}
      >
        <View
          style={[
            styles.notificationCard,
            { backgroundColor: theme.backgroundCard },
          ]}
        >
          {/* Left: Circular icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${iconColor}20`,
              },
            ]}
          >
            <Feather
              name={getIconName(item.type)}
              size={20}
              color={iconColor}
            />
          </View>

          {/* Middle: Title and description */}
          <View style={styles.notificationContent}>
            <ThemedText
              style={[
                styles.notificationTitle,
                { color: theme.text },
                !item.read && { fontWeight: "600" },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </ThemedText>
            {item.description && (
              <ThemedText
                style={[
                  styles.notificationDescription,
                  { color: theme.textSecondary },
                ]}
                numberOfLines={2}
              >
                {item.description}
              </ThemedText>
            )}
          </View>

          {/* Right: Timestamp and unread dot */}
          <View style={styles.notificationRight}>
            <ThemedText
              style={[styles.timestamp, { color: theme.textSecondary }]}
            >
              {formatRelativeTime(item.createdAt)}
            </ThemedText>
            {!item.read && (
              <View
                style={[styles.unreadDot, { backgroundColor: iconColor }]}
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => {
    // Don't show filters if API isn't available
    if (!apiAvailable) {
      return null;
    }

    return (
      <View style={styles.headerContainer}>
        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <Pressable
            style={[
              styles.filterTab,
              filter === "all" && [
                styles.filterTabActive,
                { borderBottomColor: theme.primary },
              ],
            ]}
            onPress={() => setFilter("all")}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                {
                  color: filter === "all" ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              All
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.filterTab,
              filter === "unread" && [
                styles.filterTabActive,
                { borderBottomColor: theme.primary },
              ],
            ]}
            onPress={() => setFilter("unread")}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                {
                  color:
                    filter === "unread" ? theme.primary : theme.textSecondary,
                },
              ]}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </ThemedText>
          </Pressable>
        </View>

        {/* Mark All Read Button */}
        {unreadCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.markAllButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleMarkAllAsRead}
          >
            <Feather name="check-circle" size={16} color={theme.primary} />
            <ThemedText style={[styles.markAllText, { color: theme.primary }]}>
              Mark all read
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    // Show different message if API isn't available yet
    if (!apiAvailable) {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: `${theme.primary}15` },
            ]}
          >
            <Feather name="bell" size={32} color={theme.primary} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
            Coming Soon
          </ThemedText>
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            Notifications are being set up. You'll soon see updates about
            messages, bookings, payments, and more here.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: `${theme.primary}15` },
          ]}
        >
          <Feather name="bell-off" size={32} color={theme.primary} />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
          {filter === "unread" ? "No unread notifications" : "All caught up!"}
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          {filter === "unread"
            ? "You've read all your notifications."
            : "You'll be notified about messages, bookings, and important updates here."}
        </ThemedText>
      </View>
    );
  };

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Feather name="alert-circle" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
        {error}
      </ThemedText>
      <Pressable
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={() => loadNotifications()}
      >
        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText
          style={[styles.loadingText, { color: theme.textSecondary }]}
        >
          Loading notifications...
        </ThemedText>
      </View>
    );
  }

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {section.title}
      </ThemedText>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
    >
      {error ? (
        renderError()
      ) : (
        <SectionList
          sections={groupedNotifications}
          renderItem={renderNotification}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: screenInsets.paddingTop },
            groupedNotifications.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  headerContainer: {
    marginBottom: Spacing.md,
  },
  filterTabs: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  filterTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: "500",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  // Section header styles
  sectionHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  // Notification card styles (matching reference)
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: 1, // Minimal spacing between cards
    borderRadius: 0, // Flat design like reference
  },
  cardPressed: {
    opacity: 0.6,
  },
  // Circular icon on the left
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  // Middle content
  notificationContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  // Right side (timestamp + dot)
  notificationRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 40,
  },
  timestamp: {
    fontSize: 12,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
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
});
