import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Text,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  FadeInUp,
  FadeInRight,
} from "react-native-reanimated";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Skeleton } from "@/components/Skeleton";
import { PriorityCard, PriorityType } from "@/components/home/PriorityCard";
import {
  FloatingActionButton,
  FABAction,
} from "@/components/home/FloatingActionButton";
import { StatCard } from "@/components/home/StatCard";
import {
  ScheduleCard,
  EmptyScheduleCard,
} from "@/components/home/ScheduleCard";
import {
  ActivityItem,
  EmptyActivityState,
} from "@/components/home/ActivityItem";
import {
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  BlysColors,
  StatColors,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import {
  reportsApi,
  bookingsApi,
  notificationsApi,
  inboxApi,
  createTenantContext,
  ReportsSummary,
  Booking,
  Notification,
} from "@/services/api";

// Helper function to check if date is today
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Helper function to check if date is tomorrow
const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  );
};

// Helper function to format day name
const getDayName = (date: Date): string => {
  return date.toLocaleDateString("en-US", { weekday: "long" });
};

// Group bookings by date
interface GroupedBookings {
  id: string;
  label: string;
  bookings: Booking[];
}

const groupBookingsByDate = (bookings: Booking[]): GroupedBookings[] => {
  const groups: Map<string, { label: string; bookings: Booking[] }> = new Map();

  // Sort bookings by start time
  const sortedBookings = [...bookings].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  sortedBookings.forEach((booking) => {
    const date = new Date(booking.startAt);
    let label: string;
    let key: string;

    if (isToday(date)) {
      label = "Today";
      key = "today";
    } else if (isTomorrow(date)) {
      label = "Tomorrow";
      key = "tomorrow";
    } else {
      label = getDayName(date);
      key = date.toISOString().split("T")[0];
    }

    if (!groups.has(key)) {
      groups.set(key, { label, bookings: [] });
    }
    groups.get(key)!.bookings.push(booking);
  });

  return Array.from(groups.entries()).map(([id, group]) => ({
    id,
    label: group.label,
    bookings: group.bookings,
  }));
};

// Time-aware greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function HomeScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user, token } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priorityDismissed, setPriorityDismissed] = useState(false);

  // API data state
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadInquiries, setUnreadInquiries] = useState(0);

  // Get user's name from email or default
  const userName = user?.email?.split("@")[0] || "Samantha";
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const tenant = createTenantContext(user);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;

    try {
      const [summaryRes, bookingsRes, notificationsRes, conversationsRes] =
        await Promise.allSettled([
          reportsApi.getSummary(token, tenant),
          bookingsApi.getAll(token, tenant),
          notificationsApi.getAll(token, tenant, 10),
          inboxApi.getConversations(token, tenant),
        ]);

      if (summaryRes.status === "fulfilled") {
        setSummary(summaryRes.value);
      }

      if (bookingsRes.status === "fulfilled") {
        // Filter to upcoming bookings only (next 7 days)
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingBookings = bookingsRes.value.filter((b) => {
          const bookingDate = new Date(b.startAt);
          return bookingDate >= now && bookingDate <= weekLater;
        });
        setBookings(upcomingBookings);
      }

      if (notificationsRes.status === "fulfilled") {
        setNotifications(notificationsRes.value);
      }

      if (conversationsRes.status === "fulfilled") {
        // Sum unread counts from conversations for "New Inquiries" stat
        const totalUnread = conversationsRes.value.reduce(
          (sum, conv) => sum + (conv.unreadCount || 0),
          0,
        );
        setUnreadInquiries(totalUnread);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, [token, tenant]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDashboardData();
      setIsLoading(false);
    };
    loadData();
  }, [fetchDashboardData]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  // Get context message for subtitle
  const getContextMessage = (): string => {
    const todayShoots = bookings.filter((b) =>
      isToday(new Date(b.startAt)),
    ).length;
    if (todayShoots > 0) {
      return `You have ${todayShoots} shoot${todayShoots > 1 ? "s" : ""} today`;
    }
    if (unreadInquiries > 0) {
      return `${unreadInquiries} inquiries waiting for reply`;
    }
    return "Your schedule is clear today";
  };

  // Determine priority card type and content
  const getPriorityData = (): {
    type: PriorityType;
    title: string;
    subtitle: string;
    actionLabel: string;
    onAction: () => void;
  } | null => {
    if (priorityDismissed) return null;

    // Check for pending inquiries
    if (unreadInquiries > 0) {
      return {
        type: "inquiry",
        title: `${unreadInquiries} new inquiries`,
        subtitle: "Respond within 24 hours for best results",
        actionLabel: "Reply Now",
        onAction: () => (navigation as any).navigate("InboxTab"),
      };
    }

    // Check for today's shoots
    const todayShoots = bookings.filter((b) => isToday(new Date(b.startAt)));
    if (todayShoots.length > 0) {
      const nextShoot = todayShoots[0];
      return {
        type: "shoot",
        title: nextShoot.title,
        subtitle: nextShoot.location || "Check your equipment list",
        actionLabel: "Get Ready",
        onAction: () => (navigation as any).navigate("BookingsTab"),
      };
    }

    // Check for pending payments
    if ((summary?.pendingPayments ?? 0) > 0) {
      return {
        type: "payment",
        title: `${formatCurrency(summary?.pendingPayments ?? 0)} pending`,
        subtitle: "Send a friendly reminder",
        actionLabel: "Collect",
        onAction: () => (navigation as any).navigate("ToolsTab"),
      };
    }

    // Fallback motivational message
    return {
      type: "empty",
      title: "Follow up with inquiries within 24 hours",
      subtitle: "Quick responses lead to more bookings",
      actionLabel: "View Tips",
      onAction: () => {},
    };
  };

  // FAB actions
  const fabActions: FABAction[] = [
    {
      icon: "user-plus",
      label: "Add New Lead",
      color: StatColors.inquiries,
      onPress: () => (navigation as any).navigate("InboxTab"),
    },
    {
      icon: "dollar-sign",
      label: "Log Payment",
      color: StatColors.payments,
      onPress: () => (navigation as any).navigate("ToolsTab"),
    },
    {
      icon: "edit-3",
      label: "Quick Note",
      color: BlysColors.primary,
      onPress: () => {},
    },
    {
      icon: "folder-plus",
      label: "New Project",
      color: StatColors.projects,
      onPress: () => (navigation as any).navigate("ProjectsTab"),
    },
  ];

  const priorityData = getPriorityData();
  const groupedBookings = groupBookingsByDate(bookings);

  // Loading skeleton
  if (isLoading) {
    return (
      <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          {/* Welcome skeleton */}
          <Skeleton
            width={120}
            height={16}
            borderRadius={6}
            style={{ marginTop: Spacing.md }}
          />
          <Skeleton
            width={180}
            height={28}
            borderRadius={6}
            style={{ marginTop: Spacing.xs }}
          />
          <Skeleton
            width={200}
            height={14}
            borderRadius={6}
            style={{ marginTop: Spacing.xs }}
          />

          {/* Priority card skeleton */}
          <Skeleton
            width="100%"
            height={80}
            borderRadius={BorderRadius.lg}
            style={{ marginTop: Spacing.lg }}
          />

          {/* Stats cards skeleton */}
          <Skeleton
            width="100%"
            height={120}
            borderRadius={BorderRadius.card}
            style={{ marginTop: Spacing.md }}
          />
          <View style={styles.statsGrid}>
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                width="47%"
                height={100}
                borderRadius={BorderRadius.card}
                style={{ marginBottom: Spacing.sm }}
              />
            ))}
          </View>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScreenScrollView
        style={{ backgroundColor: theme.backgroundRoot }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BlysColors.primary}
            colors={[BlysColors.primary]}
          />
        }
      >
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          {/* Welcome Message with Context */}
          <Animated.View
            entering={FadeInUp.delay(50)
              .duration(400)
              .easing(Easing.out(Easing.cubic))}
            style={styles.welcomeSection}
          >
            <ThemedText
              style={[styles.welcomeText, { color: theme.textSecondary }]}
            >
              {getGreeting()},
            </ThemedText>
            <ThemedText style={[styles.userName, { color: theme.text }]}>
              {displayName}
            </ThemedText>
            <ThemedText
              style={[styles.contextText, { color: theme.textTertiary }]}
            >
              {getContextMessage()}
            </ThemedText>
          </Animated.View>

          {/* Priority Card */}
          {priorityData && (
            <PriorityCard
              type={priorityData.type}
              title={priorityData.title}
              subtitle={priorityData.subtitle}
              actionLabel={priorityData.actionLabel}
              onAction={priorityData.onAction}
              onDismiss={() => setPriorityDismissed(true)}
            />
          )}

          {/* Stats Section - Hierarchical Layout */}
          <Animated.View
            entering={FadeInUp.delay(200)
              .duration(400)
              .easing(Easing.out(Easing.cubic))}
          >
            {/* Top row: Pending Payments (full width, prominent) */}
            <StatCard
              label="Pending Payments"
              value={summary?.pendingPayments ?? 0}
              icon="dollar-sign"
              color={StatColors.payments}
              size="large"
              actionLabel="Collect"
              onPress={() => (navigation as any).navigate("ToolsTab")}
            />

            {/* Second row: New Inquiries + Upcoming Events */}
            <View style={styles.statsGrid}>
              <StatCard
                label="New Inquiries"
                value={unreadInquiries}
                icon="mail"
                color={StatColors.inquiries}
                trend={
                  unreadInquiries > 0
                    ? { value: unreadInquiries, direction: "up" }
                    : undefined
                }
                onPress={() => (navigation as any).navigate("InboxTab")}
              />
              <StatCard
                label="Upcoming Events"
                value={summary?.upcomingEvents ?? 0}
                icon="calendar"
                color={StatColors.events}
                onPress={() => (navigation as any).navigate("BookingsTab")}
              />
            </View>

            {/* Third row: Active Projects + Awaiting Response */}
            <View style={styles.statsGrid}>
              <StatCard
                label="Active Projects"
                value={summary?.activeProjects ?? 0}
                icon="briefcase"
                color={StatColors.projects}
                onPress={() => (navigation as any).navigate("ProjectsTab")}
              />
              <StatCard
                label="Awaiting Response"
                value={summary?.recentBookings ?? 0}
                icon="clock"
                color={StatColors.awaiting}
                onPress={() => (navigation as any).navigate("InboxTab")}
              />
            </View>
          </Animated.View>

          {/* Schedule Section */}
          <Animated.View
            entering={FadeInUp.delay(300)
              .duration(400)
              .easing(Easing.out(Easing.cubic))}
          >
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                Schedule
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.seeAllButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => (navigation as any).navigate("BookingsTab")}
              >
                <ThemedText
                  style={[styles.seeAllText, { color: BlysColors.primary }]}
                >
                  See All
                </ThemedText>
              </Pressable>
            </View>
          </Animated.View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scheduleScrollContent}
            style={styles.scheduleScroll}
          >
            {groupedBookings.length > 0 ? (
              groupedBookings.map((day, index) => (
                <Animated.View
                  key={day.id}
                  entering={FadeInRight.delay(350 + index * 80).duration(400)}
                >
                  <ScheduleCard
                    day={day}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      (navigation as any).navigate("BookingsTab");
                    }}
                  />
                </Animated.View>
              ))
            ) : (
              <Animated.View entering={FadeInRight.delay(350).duration(400)}>
                <EmptyScheduleCard
                  onAddShoot={() => (navigation as any).navigate("BookingsTab")}
                />
              </Animated.View>
            )}
          </ScrollView>

          {/* Recent Activity Section */}
          <Animated.View
            entering={FadeInUp.delay(400)
              .duration(400)
              .easing(Easing.out(Easing.cubic))}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                Recent Activity
              </ThemedText>
              <Pressable
                style={({ pressed }) => [
                  styles.seeAllButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => (navigation as any).navigate("NotificationsTab")}
              >
                <ThemedText
                  style={[styles.seeAllText, { color: BlysColors.primary }]}
                >
                  See All
                </ThemedText>
              </Pressable>
            </View>

            {/* Activity List */}
            <View
              style={[
                styles.activityList,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: isDark ? theme.border : "transparent",
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInRight.delay(450 + index * 60).duration(400)}
                  >
                    <ActivityItem
                      notification={notification}
                      showDivider={index < notifications.length - 1}
                      onPress={() => {
                        if (notification.projectId) {
                          (navigation as any).navigate("ProjectsTab");
                        } else {
                          (navigation as any).navigate("NotificationsTab");
                        }
                      }}
                    />
                  </Animated.View>
                ))
              ) : (
                <EmptyActivityState
                  onReachOut={() => (navigation as any).navigate("InboxTab")}
                />
              )}
            </View>
          </Animated.View>

          {/* Bottom spacing for FAB */}
          <View style={{ height: tabBarHeight + 80 }} />
        </View>
      </ScreenScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={fabActions}
        bottomOffset={tabBarHeight + 16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  welcomeSection: {
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  welcomeText: {
    ...Typography.bodySmall,
  },
  userName: {
    ...Typography.h2,
    marginTop: 2,
  },
  contextText: {
    ...Typography.caption,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  seeAllButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  seeAllText: {
    ...Typography.label,
  },
  scheduleScroll: {
    marginHorizontal: -Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  scheduleScrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },
  activityList: {
    borderRadius: BorderRadius.card,
    overflow: "hidden",
    ...Shadows.sm,
  },
});
