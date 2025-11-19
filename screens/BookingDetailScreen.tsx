import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SecondaryButton } from '@/components/SecondaryButton';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

const MOCK_BOOKING = {
  eventTitle: 'Engagement Session',
  clientName: 'Sarah Johnson',
  clientEmail: 'sarah.johnson@example.com',
  clientPhone: '+1 (555) 123-4567',
  eventDate: 'November 22, 2024',
  startTime: '10:00 AM',
  endTime: '12:00 PM',
  location: 'Golden Gate Park, San Francisco, CA',
  notes: 'Client requested outdoor photos with natural lighting. Bring reflector and backup battery.',
};

export default function BookingDetailScreen() {
  const { theme } = useTheme();

  const handleConfirm = () => {
    Alert.alert('Booking Confirmed', 'The client has been notified of your confirmation');
  };

  const handleReschedule = () => {
    Alert.alert('Reschedule', 'Rescheduling functionality will be available soon');
  };

  return (
    <ScreenScrollView>
      <View style={[styles.hero, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText style={[styles.heroTitle, { fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight }]}>
          {MOCK_BOOKING.eventTitle}
        </ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          with {MOCK_BOOKING.clientName}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Feather name="calendar" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Date</ThemedText>
            <ThemedText style={styles.infoValue}>{MOCK_BOOKING.eventDate}</ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Feather name="clock" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Time</ThemedText>
            <ThemedText style={styles.infoValue}>
              {MOCK_BOOKING.startTime} - {MOCK_BOOKING.endTime}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Feather name="map-pin" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Location</ThemedText>
            <ThemedText style={styles.infoValue}>{MOCK_BOOKING.location}</ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Feather name="user" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Client</ThemedText>
            <ThemedText style={styles.infoValue}>{MOCK_BOOKING.clientName}</ThemedText>
            <ThemedText style={[styles.infoSubvalue, { color: theme.textSecondary }]}>
              {MOCK_BOOKING.clientEmail}
            </ThemedText>
            <ThemedText style={[styles.infoSubvalue, { color: theme.textSecondary }]}>
              {MOCK_BOOKING.clientPhone}
            </ThemedText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Feather name="file-text" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <ThemedText style={styles.infoLabel}>Notes</ThemedText>
            <ThemedText style={styles.infoValue}>{MOCK_BOOKING.notes}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title="Confirm Booking" onPress={handleConfirm} />
        <SecondaryButton title="Reschedule" onPress={handleReschedule} />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  section: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
  },
  infoSubvalue: {
    fontSize: 14,
  },
  actions: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
});
