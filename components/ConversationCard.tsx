import React, { useRef } from "react";
import { Pressable, View, StyleSheet, Animated } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "./Avatar";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, MessagingColors } from "@/constants/theme";

interface ConversationCardProps {
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  isYou?: boolean; // If the last message was sent by the user
  messageType?: "text" | "audio" | "photo"; // Type of last message
  onPress: () => void;
  onArchive?: () => void;
  onMarkUnread?: () => void;
  isLast?: boolean;
}

export function ConversationCard({
  contactName,
  lastMessage,
  timestamp,
  unreadCount,
  isYou = false,
  messageType = "text",
  onPress,
  onArchive,
  onMarkUnread,
  isLast = false,
}: ConversationCardProps) {
  const { theme, isDark } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const hasUnread =
    unreadCount !== null && unreadCount !== undefined && unreadCount > 0;

  const handleArchive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onArchive?.();
  };

  const handleMarkUnread = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onMarkUnread?.();
  };

  // Format message preview with "You: " prefix and message type indicators
  const getMessagePreview = () => {
    let prefix = isYou ? "You: " : "";

    if (messageType === "audio") {
      return `${prefix}Audio`;
    } else if (messageType === "photo") {
      return `${prefix}Photo`;
    }

    return `${prefix}${lastMessage}`;
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0.5, 1],
      extrapolate: "clamp",
    });

    const opacity = dragX.interpolate({
      inputRange: [0, 40, 80],
      outputRange: [0, 0.5, 1],
      extrapolate: "clamp",
    });

    if (!onMarkUnread) return null;

    return (
      <Animated.View
        style={[styles.swipeAction, styles.swipeActionLeft, { opacity }]}
      >
        <Pressable
          onPress={handleMarkUnread}
          style={[
            styles.swipeActionButton,
            { backgroundColor: MessagingColors.primary },
          ]}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Feather name="mail" size={20} color="#FFFFFF" />
          </Animated.View>
          <ThemedText style={styles.swipeActionText}>Unread</ThemedText>
        </Pressable>
      </Animated.View>
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: "clamp",
    });

    const opacity = dragX.interpolate({
      inputRange: [-80, -40, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: "clamp",
    });

    if (!onArchive) return null;

    return (
      <Animated.View
        style={[styles.swipeAction, styles.swipeActionRight, { opacity }]}
      >
        <Pressable
          onPress={handleArchive}
          style={[styles.swipeActionButton, { backgroundColor: "#F59E0B" }]}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Feather name="archive" size={20} color="#FFFFFF" />
          </Animated.View>
          <ThemedText style={styles.swipeActionText}>Archive</ThemedText>
        </Pressable>
      </Animated.View>
    );
  };

  const cardContent = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundRoot },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
        pressed && { backgroundColor: theme.backgroundSecondary },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${contactName}. ${hasUnread ? `${unreadCount} unread messages.` : ""} Last message: ${lastMessage}. ${timestamp}`}
      accessibilityHint="Double tap to open conversation"
    >
      <View style={styles.row}>
        {/* Avatar with optional unread badge */}
        <View style={styles.avatarContainer}>
          <Avatar
            name={contactName}
            size={52}
            backgroundColor="#000000"
            textColor="#FFFFFF"
          />
          {hasUnread && unreadCount && unreadCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: isDark
                    ? MessagingColors.unreadBadgeDark
                    : MessagingColors.unreadBadge,
                },
              ]}
            >
              <ThemedText style={styles.unreadCount}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText
              style={[
                styles.name,
                { color: theme.text },
                hasUnread && styles.nameUnread,
              ]}
              numberOfLines={1}
            >
              {contactName}
            </ThemedText>
            <ThemedText
              style={[
                styles.timestamp,
                { color: MessagingColors.timestamp },
                hasUnread && styles.timestampUnread,
              ]}
            >
              {timestamp}
            </ThemedText>
          </View>
          <ThemedText
            style={[
              styles.message,
              { color: theme.textSecondary },
              hasUnread && styles.messageUnread,
              messageType !== "text" && styles.messageSpecial,
            ]}
            numberOfLines={1}
          >
            {getMessagePreview()}
          </ThemedText>
        </View>

        {/* Chevron indicator */}
        <Feather
          name="chevron-right"
          size={18}
          color={theme.textTertiary}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );

  // If no swipe actions, just return the card
  if (!onArchive && !onMarkUnread) {
    return cardContent;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={onMarkUnread ? renderLeftActions : undefined}
      renderRightActions={onArchive ? renderRightActions : undefined}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
    >
      {cardContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  unreadCount: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameUnread: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 13,
    fontWeight: "400",
  },
  timestampUnread: {
    fontWeight: "500",
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageUnread: {
    fontWeight: "500",
    color: "#4B5563",
  },
  messageSpecial: {
    fontStyle: "italic",
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
  // Swipe action styles
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
  },
  swipeActionLeft: {
    backgroundColor: MessagingColors.primary,
  },
  swipeActionRight: {
    backgroundColor: "#F59E0B",
  },
  swipeActionButton: {
    width: 80,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
  },
  swipeActionText: {
    color: "#FFFFFF",
    ...Typography.captionMedium,
  },
});
