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
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  FadeInUp,
  FadeInRight,
} from "react-native-reanimated";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Skeleton } from "@/components/Skeleton";
import {
  Spacing,
  BorderRadius,
  Typography,
  GradientColors,
  Shadows,
  BlysColors,
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
  NotificationType,
} from "@/services/api";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Dashboard tabs for filtering activity
const TABS = [
  { id: "overview", name: "Overview" },
  { id: "recent", name: "Recent Activity" },
];

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

// Helper function to format time from ISO string
const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper function to format relative date
const formatRelativeDate = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

export function HomeScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user, token } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

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
          const bookingDate = new Date(b.startTime);
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

          {/* Tab bar skeleton */}
          <Skeleton
            width="100%"
            height={48}
            borderRadius={6}
            style={{ marginTop: Spacing.md }}
          />

          {/* Stats cards skeleton */}
          <View style={styles.statsGrid}>
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                width="47%"
                height={100}
                borderRadius={BorderRadius.card}
                style={{ marginBottom: Spacing.md }}
              />
            ))}
          </View>
        </View>
      </ScreenScrollView>
    );
  }

  return (
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
        {/* Welcome Message */}
        <Animated.View
          entering={FadeInUp.delay(50)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
          style={styles.welcomeSection}
        >
          <ThemedText
            style={[styles.welcomeText, { color: theme.textSecondary }]}
          >
            Good morning,
          </ThemedText>
          <ThemedText style={[styles.userName, { color: theme.text }]}>
            {displayName}
          </ThemedText>
        </Animated.View>

        {/* Blys-style Tab Bar */}
        <Animated.View
          entering={FadeInUp.delay(100)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <View
            style={[
              styles.tabBar,
              { borderBottomColor: isDark ? theme.border : "#E5E7EB" },
            ]}
          >
            {TABS.map((tab) => {
              const isActive = selectedTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setSelectedTab(tab.id)}
                  style={styles.tab}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive
                          ? BlysColors.primary
                          : theme.textSecondary,
                        fontWeight: isActive ? "600" : "400",
                      },
                    ]}
                  >
                    {tab.name}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.tabUnderline,
                        { backgroundColor: BlysColors.primary },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Photography Tip Banner */}
        <Animated.View
          entering={FadeInUp.delay(150)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
          style={styles.bannerContainer}
        >
          <LinearGradient
            colors={
              isDark
                ? (GradientColors.specialOfferDark as [string, string])
                : ["#F5F3FF", "#EDE9FE"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tipBanner}
          >
            <View style={styles.tipContent}>
              <Text style={[styles.tipLabel, { color: BlysColors.primary }]}>
                PHOTOGRAPHY TIP
              </Text>
              <Text
                style={[
                  styles.tipTitle,
                  { color: isDark ? "#F9FAFB" : "#1F2937" },
                ]}
              >
                Follow up with inquiries within 24 hours
              </Text>
              <Text
                style={[
                  styles.tipSubtitle,
                  { color: isDark ? "#D1D5DB" : "#6B7280" },
                ]}
              >
                Quick responses lead to more bookings
              </Text>
            </View>
            <View
              style={[
                styles.tipIcon,
                { backgroundColor: isDark ? "#5B21B6" : "#DDD6FE" },
              ]}
            >
              <Feather
                name="zap"
                size={20}
                color={isDark ? "#A78BFA" : BlysColors.primary}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View
          entering={FadeInUp.delay(200)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
          style={styles.statsGrid}
        >
          <StatBox
            value={(summary?.activeProjects ?? 0).toString()}
            label="Active Projects"
            icon="briefcase"
            color={BlysColors.primary}
            onPress={() => (navigation as any).navigate("ProjectsTab")}
            theme={theme}
            isDark={isDark}
          />
          <StatBox
            value={unreadInquiries.toString()}
            label="New Inquiries"
            icon="mail"
            color="#F59E0B"
            onPress={() => (navigation as any).navigate("InboxTab")}
            theme={theme}
            isDark={isDark}
          />
          <StatBox
            value={(summary?.upcomingEvents ?? 0).toString()}
            label="Upcoming Events"
            icon="calendar"
            color="#3B82F6"
            onPress={() => (navigation as any).navigate("BookingsTab")}
            theme={theme}
            isDark={isDark}
          />
          <StatBox
            value={(summary?.recentBookings ?? 0).toString()}
            label="Recent Bookings"
            icon="clock"
            color="#22C55E"
            onPress={() => (navigation as any).navigate("BookingsTab")}
            theme={theme}
            isDark={isDark}
          />
        </Animated.View>

        {/* Revenue Card - Shows Pending Payments */}
        <Animated.View
          entering={FadeInUp.delay(250)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <Pressable
            style={({ pressed }) => [
              styles.revenueCard,
              {
                backgroundColor: BlysColors.primary,
              },
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => (navigation as any).navigate("ToolsTab")}
          >
            <View style={styles.revenueContent}>
              <Text style={styles.revenueLabel}>Pending Payments</Text>
              <Text style={styles.revenueAmount}>
                {formatCurrency(summary?.pendingPayments ?? 0)}
              </Text>
            </View>
            <View style={styles.revenueIcon}>
              <Feather
                name="dollar-sign"
                size={24}
                color="rgba(255,255,255,0.6)"
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Schedule */}
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
          contentContainerStyle={styles.upcomingScrollContent}
          style={styles.upcomingScroll}
        >
          {groupBookingsByDate(bookings).length > 0 ? (
            groupBookingsByDate(bookings).map((day, index) => (
              <Animated.View
                key={day.id}
                entering={FadeInRight.delay(350 + index * 80).duration(400)}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.dayCard,
                    {
                      backgroundColor: theme.backgroundCard,
                      borderColor: isDark ? theme.border : "transparent",
                      borderWidth: isDark ? 1 : 0,
                    },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    (navigation as any).navigate("BookingsTab");
                  }}
                >
                  {/* Day Header */}
                  <View
                    style={[
                      styles.dayHeader,
                      {
                        backgroundColor: isDark
                          ? BlysColors.primaryDark
                          : "#F5F3FF",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.dayLabel, { color: BlysColors.primary }]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[
                        styles.meetingCount,
                        { color: BlysColors.primary },
                      ]}
                    >
                      {day.bookings.length}{" "}
                      {day.bookings.length === 1 ? "event" : "events"}
                    </Text>
                  </View>

                  {/* Bookings List */}
                  <View style={styles.meetingsList}>
                    {day.bookings.map((booking, bookingIndex) => (
                      <View
                        key={booking.id}
                        style={[
                          styles.meetingItem,
                          bookingIndex < day.bookings.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: isDark
                              ? theme.border
                              : "#F3F4F6",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.meetingTime,
                            { color: BlysColors.primary },
                          ]}
                        >
                          {formatTime(booking.startAt)}
                        </Text>
                        <View style={styles.meetingInfo}>
                          <ThemedText
                            style={[styles.meetingTitle, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {booking.title}
                          </ThemedText>
                          <View style={styles.meetingMeta}>
                            <Feather
                              name="calendar"
                              size={10}
                              color={theme.textTertiary}
                            />
                            {booking.location && (
                              <>
                                <Feather
                                  name="map-pin"
                                  size={10}
                                  color={theme.textTertiary}
                                  style={{ marginLeft: 8 }}
                                />
                                <ThemedText
                                  style={[
                                    styles.meetingLocation,
                                    { color: theme.textTertiary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {booking.location}
                                </ThemedText>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </Pressable>
              </Animated.View>
            ))
          ) : (
            <View
              style={[
                styles.emptyScheduleCard,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: isDark ? theme.border : "transparent",
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <Feather name="calendar" size={24} color={theme.textTertiary} />
              <ThemedText
                style={[
                  styles.emptyScheduleText,
                  { color: theme.textSecondary },
                ]}
              >
                No upcoming events this week
              </ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Recent Activity Section */}
        <Animated.View
          entering={FadeInUp.delay(350)
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
              notifications.map((notification, index) => {
                const config = NOTIFICATION_TYPE_CONFIG[notification.type];
                return (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInRight.delay(400 + index * 80).duration(400)}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.activityItem,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => {
                        // Navigate based on notification type
                        if (notification.projectId) {
                          (navigation as any).navigate("ProjectsTab");
                        } else {
                          (navigation as any).navigate("NotificationsTab");
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.activityIcon,
                          {
                            backgroundColor: isDark
                              ? theme.backgroundSecondary
                              : hexToRgba(config.color, 0.1),
                          },
                        ]}
                      >
                        <Feather
                          name={config.icon}
                          size={16}
                          color={config.color}
                        />
                      </View>
                      <View style={styles.activityInfo}>
                        <ThemedText
                          style={[styles.activityName, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.activityAction,
                            { color: theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {notification.description || config.label}
                        </ThemedText>
                      </View>
                      <View style={styles.activityRight}>
                        <ThemedText
                          style={[
                            styles.activityDate,
                            { color: theme.textTertiary },
                          ]}
                        >
                          {formatRelativeDate(notification.createdAt)}
                        </ThemedText>
                        {!notification.read && (
                          <View
                            style={[
                              styles.unreadDot,
                              { backgroundColor: BlysColors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </Pressable>
                    {/* Divider line */}
                    {index < notifications.length - 1 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: theme.divider,
                          marginLeft: 52,
                        }}
                      />
                    )}
                  </Animated.View>
                );
              })
            ) : (
              <View style={styles.emptyActivityContainer}>
                <Feather name="bell" size={24} color={theme.textTertiary} />
                <ThemedText
                  style={[
                    styles.emptyActivityText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No recent activity
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={{ height: tabBarHeight + Spacing.lg }} />
      </View>
    </ScreenScrollView>
  );
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Stat Box Component
interface StatBoxProps {
  value: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress?: () => void;
  theme: any;
  isDark: boolean;
}

function StatBox({
  value,
  label,
  icon,
  color,
  onPress,
  theme,
  isDark,
}: StatBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statBox,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: isDark
              ? theme.backgroundSecondary
              : hexToRgba(color, 0.1),
          },
        ]}
      >
        <Feather name={icon} size={18} color={color} />
      </View>
      <ThemedText style={[styles.statValue, { color: theme.text }]}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  welcomeSection: {
    marginBottom: Spacing.md,
  },
  welcomeText: {
    ...Typography.bodySmall,
  },
  userName: {
    ...Typography.h2,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabText: {
    fontSize: 15,
    lineHeight: 20,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    borderRadius: 1,
  },
  bannerContainer: {
    marginBottom: Spacing.md,
  },
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  tipContent: {
    flex: 1,
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  tipSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  statBox: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },
  revenueCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  revenueContent: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  revenueAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
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
  upcomingScroll: {
    marginHorizontal: -Spacing.screenHorizontal,
    marginBottom: Spacing.lg,
  },
  upcomingScrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.md,
  },
  dayCard: {
    width: 240,
    borderRadius: BorderRadius.card,
    overflow: "hidden",
    ...Shadows.sm,
  },
  dayHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  meetingCount: {
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.8,
  },
  meetingsList: {
    padding: Spacing.sm,
  },
  meetingItem: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  meetingTime: {
    fontSize: 12,
    fontWeight: "600",
    width: 65,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  meetingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meetingType: {
    fontSize: 11,
  },
  meetingLocation: {
    fontSize: 11,
    flex: 1,
  },
  activityList: {
    borderRadius: BorderRadius.card,
    overflow: "hidden",
    ...Shadows.sm,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...Typography.bodyMedium,
    marginBottom: 2,
  },
  activityAction: {
    ...Typography.caption,
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityDate: {
    ...Typography.caption,
    marginBottom: 2,
  },
  activityAmount: {
    ...Typography.bodyMedium,
    fontWeight: "600",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  emptyScheduleCard: {
    width: 240,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  emptyScheduleText: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyActivityContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActivityText: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
