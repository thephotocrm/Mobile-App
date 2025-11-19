import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

interface BookingCardProps {
  eventTitle: string;
  clientName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  borderColor: string;
  onPress: () => void;
}

export function BookingCard({
  eventTitle,
  clientName,
  eventDate,
  startTime,
  endTime,
  borderColor,
  onPress,
}: BookingCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundRoot, borderLeftColor: borderColor },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.content}>
        <ThemedText style={styles.title}>{eventTitle}</ThemedText>
        <ThemedText style={styles.subtitle}>{clientName}</ThemedText>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={16} color={theme.textSecondary} />
          <ThemedText style={styles.info}>{eventDate}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <Feather name="clock" size={16} color={theme.textSecondary} />
          <ThemedText style={styles.info}>
            {startTime} - {endTime}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  info: {
    fontSize: 14,
    opacity: 0.7,
  },
});
