import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";

interface Notification {
  id: string;
  type: "message" | "booking" | "payment" | "reminder";
  title: string;
  message: string;
  time: string;
  read: boolean;
  clientName?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "message",
    title: "New message from Sarah Johnson",
    message: "Can we reschedule our session to next week?",
    time: "5 min ago",
    read: false,
    clientName: "Sarah Johnson",
  },
  {
    id: "2",
    type: "booking",
    title: "New booking request",
    message: "Michael Chen requested a wedding photography package",
    time: "1 hour ago",
    read: false,
    clientName: "Michael Chen",
  },
  {
    id: "3",
    type: "payment",
    title: "Payment received",
    message: "$500 deposit received from Emma Williams",
    time: "2 hours ago",
    read: true,
    clientName: "Emma Williams",
  },
  {
    id: "4",
    type: "reminder",
    title: "Session reminder",
    message: "You have a portrait session with David Lee tomorrow at 2 PM",
    time: "3 hours ago",
    read: true,
    clientName: "David Lee",
  },
];

export function NotificationsScreen() {
  const { theme } = useTheme();
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const getIconName = (type: Notification["type"]): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "message":
        return "message-circle";
      case "booking":
        return "calendar";
      case "payment":
        return "credit-card";
      case "reminder":
        return "bell";
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Pressable
      style={({ pressed }) => [
        styles.notificationCard,
        { backgroundColor: theme.backgroundRoot },
        !item.read && [styles.unreadCard, { backgroundColor: theme.primaryLight }],
        pressed && styles.cardPressed,
      ]}
      onPress={() => console.log("Notification tapped:", item.id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.backgroundDefault }]}>
        <Feather
          name={getIconName(item.type)}
          size={20}
          color={item.read ? theme.textSecondary : theme.primary}
        />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <ThemedText
            style={[styles.notificationTitle, { color: theme.text }, !item.read && styles.unreadText]}
          >
            {item.title}
          </ThemedText>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
        </View>
        <ThemedText style={[styles.notificationMessage, { color: theme.textSecondary }]}>
          {item.message}
        </ThemedText>
        <ThemedText style={[styles.notificationTime, { color: theme.textSecondary }]}>{item.time}</ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Notifications</ThemedText>
          {unreadCount > 0 && (
            <Badge label={unreadCount.toString()} />
          )}
        </View>

        {MOCK_NOTIFICATIONS.map((notification) => (
          <View key={notification.id}>
            {renderNotification({ item: notification })}
          </View>
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  notificationCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  unreadCard: {},
  cardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  unreadText: {
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  notificationTime: {
    fontSize: 12,
  },
});
