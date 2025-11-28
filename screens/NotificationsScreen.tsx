import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import { 
  inboxApi, 
  projectsApi, 
  bookingsApi, 
  createTenantContext,
  InboxConversationApiResponse,
  Project,
  Booking
} from "@/services/api";

type AlertType = "message" | "booking_today" | "booking_upcoming" | "event_today" | "event_upcoming" | "payment";

interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  subtitle: string;
  time: string;
  timestamp: Date;
  isUrgent: boolean;
  isToday: boolean;
  contactId?: string;
  projectId?: string;
  bookingId?: string;
}

const parseApiDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Handle "YYYY-MM-DD HH:MM:SS" format (space separator)
  if (dateStr.includes(" ") && !dateStr.includes("T")) {
    const [datePart, timePart] = dateStr.split(" ");
    return new Date(`${datePart}T${timePart}`);
  }
  
  return new Date(dateStr);
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatEventDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((eventDate.getTime() - today.getTime()) / 86400000);
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 2) return "In 2 days";
  if (diffDays === 3) return "In 3 days";
  
  return date.toLocaleDateString("en-US", { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit", 
    hour12: true 
  });
};

const getDaysUntil = (date: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  return Math.round((eventDate.getTime() - today.getTime()) / 86400000);
};

export function NotificationsScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation();
  
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const tenant = createTenantContext(user);
      const allAlerts: AlertItem[] = [];

      // Fetch all data in parallel
      const [conversationsResult, projectsResult, bookingsResult] = await Promise.allSettled([
        inboxApi.getConversations(token, tenant),
        projectsApi.getAll(token, tenant),
        bookingsApi.getAll(token, tenant),
      ]);

      // Process unread messages
      if (conversationsResult.status === "fulfilled") {
        const conversations = conversationsResult.value;
        console.log("[Activity] Conversations received:", conversations.length);
        
        conversations.forEach((conv) => {
          console.log("[Activity] Conversation:", conv.contact?.firstName, "unreadCount:", conv.unreadCount);
          if (conv.unreadCount > 0) {
            const contactName = conv.contact 
              ? `${conv.contact.firstName || ""} ${conv.contact.lastName || ""}`.trim() 
              : "Unknown";
            const messageTime = parseApiDate(conv.lastMessageAt);
            const messageDaysAgo = getDaysUntil(messageTime);
            
            console.log("[Activity] Adding message alert for:", contactName, "time:", messageTime);
            
            allAlerts.push({
              id: `msg-${conv.contact?.id || Math.random()}`,
              type: "message",
              title: `New message from ${contactName}`,
              subtitle: conv.lastMessage || "No preview available",
              time: formatRelativeTime(messageTime),
              timestamp: messageTime,
              isUrgent: messageDaysAgo >= -1, // Today or yesterday is urgent
              isToday: messageDaysAgo === 0, // Only today's messages are "today"
              contactId: conv.contact?.id,
            });
          }
        });
      } else {
        console.log("[Activity] Conversations failed:", conversationsResult);
      }

      // Process projects with upcoming event dates (within 3 days)
      if (projectsResult.status === "fulfilled") {
        const projects = projectsResult.value as Project[];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        projects.forEach((project) => {
          if (project.eventDate && project.status === "ACTIVE") {
            const eventDate = parseApiDate(project.eventDate);
            const daysUntil = getDaysUntil(eventDate);

            // Today's events
            if (daysUntil === 0) {
              allAlerts.push({
                id: `event-today-${project.id}`,
                type: "event_today",
                title: `Today: ${project.title}`,
                subtitle: project.client 
                  ? `${project.client.firstName} ${project.client.lastName}` 
                  : project.projectType || "Event",
                time: "Today",
                timestamp: eventDate,
                isUrgent: true,
                isToday: true,
                projectId: project.id,
              });
            }
            // Upcoming within 3 days
            else if (daysUntil > 0 && daysUntil <= 3) {
              allAlerts.push({
                id: `event-upcoming-${project.id}`,
                type: "event_upcoming",
                title: `${formatEventDate(eventDate)}: ${project.title}`,
                subtitle: project.client 
                  ? `${project.client.firstName} ${project.client.lastName}` 
                  : project.projectType || "Upcoming event",
                time: formatEventDate(eventDate),
                timestamp: eventDate,
                isUrgent: daysUntil === 1,
                isToday: false,
                projectId: project.id,
              });
            }
          }
        });
      }

      // Process bookings - today and upcoming
      if (bookingsResult.status === "fulfilled") {
        const bookings = bookingsResult.value as Booking[];
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        bookings.forEach((booking) => {
          const bookingDate = parseApiDate(booking.startTime);
          const daysUntil = getDaysUntil(bookingDate);

          // Today's bookings
          if (daysUntil === 0) {
            allAlerts.push({
              id: `booking-today-${booking.id}`,
              type: "booking_today",
              title: `Today at ${formatTime(bookingDate)}: ${booking.title}`,
              subtitle: booking.location || "No location set",
              time: formatTime(bookingDate),
              timestamp: bookingDate,
              isUrgent: true,
              isToday: true,
              bookingId: booking.id,
            });
          }
          // Upcoming bookings within 3 days
          else if (daysUntil > 0 && daysUntil <= 3) {
            allAlerts.push({
              id: `booking-upcoming-${booking.id}`,
              type: "booking_upcoming",
              title: `${formatEventDate(bookingDate)}: ${booking.title}`,
              subtitle: `${formatTime(bookingDate)} - ${booking.location || "No location"}`,
              time: formatEventDate(bookingDate),
              timestamp: bookingDate,
              isUrgent: daysUntil === 1,
              isToday: false,
              bookingId: booking.id,
            });
          }
        });
      }

      console.log("[Activity] Total alerts before sort:", allAlerts.length, allAlerts.map(a => a.title));

      // Sort alerts: Priority order: 1) Today items, 2) Urgent items, 3) By timestamp
      allAlerts.sort((a, b) => {
        // 1. Today's items always come first
        if (a.isToday && !b.isToday) return -1;
        if (b.isToday && !a.isToday) return 1;

        // 2. Within today's items: events first, then bookings, then messages
        if (a.isToday && b.isToday) {
          const todayPriority = { event_today: 0, booking_today: 1, message: 2 };
          const aPriority = todayPriority[a.type as keyof typeof todayPriority] ?? 3;
          const bPriority = todayPriority[b.type as keyof typeof todayPriority] ?? 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          // Same type: sort by time (soonest first for events/bookings, newest first for messages)
          if (a.type === "message") {
            return b.timestamp.getTime() - a.timestamp.getTime();
          }
          return a.timestamp.getTime() - b.timestamp.getTime();
        }

        // 3. For non-today items: urgent items come before non-urgent
        if (a.isUrgent && !b.isUrgent) return -1;
        if (b.isUrgent && !a.isUrgent) return 1;

        // 4. Within same urgency level, sort by timestamp (soonest first)
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      console.log("[Activity] Setting alerts:", allAlerts.length);
      setAlerts(allAlerts);
    } catch (err) {
      console.error("Error loading alerts:", err);
      setError("Failed to load activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [token, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts(true);
  };

  const getIconName = (type: AlertType): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "message":
        return "message-circle";
      case "booking_today":
        return "calendar";
      case "booking_upcoming":
        return "calendar";
      case "event_today":
        return "sun";
      case "event_upcoming":
        return "clock";
      case "payment":
        return "credit-card";
      default:
        return "bell";
    }
  };

  const getIconColor = (type: AlertType, isUrgent: boolean): string => {
    if (type === "event_today" || type === "booking_today") return "#EF4444"; // Red for today
    if (type === "message") return theme.primary;
    if (isUrgent) return "#F59E0B"; // Warning amber
    return theme.textSecondary;
  };

  const handleAlertPress = (alert: AlertItem) => {
    if (alert.type === "message" && alert.contactId) {
      // Navigate to thread - need to type this properly
      (navigation as any).navigate("InboxTab", {
        screen: "ThreadDetail",
        params: { contactId: alert.contactId },
      });
    } else if (alert.bookingId) {
      (navigation as any).navigate("BookingsTab", {
        screen: "BookingDetail",
        params: { bookingId: alert.bookingId },
      });
    } else if (alert.projectId) {
      (navigation as any).navigate("ProjectsTab", {
        screen: "ProjectDetail",
        params: { projectId: alert.projectId },
      });
    }
  };

  const renderAlert = ({ item }: { item: AlertItem }) => (
    <Pressable
      style={({ pressed }) => [pressed && styles.cardPressed]}
      onPress={() => handleAlertPress(item)}
    >
      <Card 
        style={[styles.alertCard, item.isUrgent && styles.urgentCard]}
        elevation={item.isUrgent ? 2 : 1}
      >
        <View 
          style={[
            styles.iconContainer, 
            { 
              backgroundColor: item.isUrgent 
                ? `${getIconColor(item.type, item.isUrgent)}15` 
                : theme.backgroundDefault 
            }
          ]}
        >
          <Feather
            name={getIconName(item.type)}
            size={20}
            color={getIconColor(item.type, item.isUrgent)}
          />
        </View>
        <View style={styles.alertContent}>
          <View style={styles.alertHeader}>
            <ThemedText
              style={[
                Typography.body, 
                { color: theme.text }, 
                item.isUrgent && { fontWeight: "700" }
              ]}
              numberOfLines={1}
            >
              {item.title}
            </ThemedText>
            {item.isUrgent && (
              <View style={[styles.urgentDot, { backgroundColor: theme.primary }]} />
            )}
          </View>
          <ThemedText 
            style={[Typography.bodySmall, { color: theme.textSecondary, lineHeight: 20 }]}
            numberOfLines={2}
          >
            {item.subtitle}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary, marginTop: 4 }]}>
            {item.time}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Card>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="bell-off" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        All caught up!
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        No new messages, upcoming events, or bookings in the next 3 days.
      </ThemedText>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Feather name="alert-circle" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
        {error}
      </ThemedText>
      <Pressable
        style={[styles.retryButton, { backgroundColor: theme.primary }]}
        onPress={() => loadAlerts()}
      >
        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading activity...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      {error ? renderError() : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            alerts.length === 0 && styles.emptyListContent
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
  listContent: {
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  urgentCard: {},
  cardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  alertContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
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
