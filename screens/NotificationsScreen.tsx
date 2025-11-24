import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
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

export const MOCK_NOTIFICATIONS: Notification[] = [
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
        pressed && styles.cardPressed,
      ]}
      onPress={() => console.log("Notification tapped:", item.id)}
    >
      <Card 
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
        ]}
        elevation={!item.read ? 2 : 1}
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
              style={[Typography.body, { color: theme.text }, !item.read && { fontWeight: "700" }]}
            >
              {item.title}
            </ThemedText>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
          </View>
          <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, lineHeight: 20 }]}>
            {item.message}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: theme.textSecondary }]}>{item.time}</ThemedText>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <FlatList
          data={MOCK_NOTIFICATIONS}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  notificationCard: {
    flexDirection: "row",
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.sm,
  },
});
