import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from './Avatar';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, GradientColors } from '@/constants/theme';

interface ConversationCardProps {
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  onPress: () => void;
  isLast?: boolean;
}

export function ConversationCard({
  contactName,
  lastMessage,
  timestamp,
  unreadCount,
  onPress,
  isLast = false,
}: ConversationCardProps) {
  const { theme } = useTheme();
  const hasUnread = unreadCount !== null && unreadCount !== undefined && unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSecondary },
      ]}
    >
      <View style={styles.row}>
        {hasUnread ? (
          <LinearGradient
            colors={GradientColors.primary as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.unreadIndicator}
          />
        ) : (
          <View style={styles.unreadIndicatorPlaceholder} />
        )}
        <Avatar name={contactName} size={48} />
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={[styles.name, hasUnread && styles.nameUnread]}>{contactName}</ThemedText>
            <ThemedText style={styles.timestamp}>{timestamp}</ThemedText>
          </View>
          <ThemedText style={[styles.message, hasUnread && styles.messageUnread]} numberOfLines={2}>
            {lastMessage}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  unreadIndicatorPlaceholder: {
    width: 8,
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  nameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.6,
  },
  message: {
    fontSize: 14,
    opacity: 0.7,
  },
  messageUnread: {
    opacity: 0.9,
    fontWeight: '500',
  },
});
