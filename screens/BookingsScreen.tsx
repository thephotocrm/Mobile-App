import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ThemedText } from '@/components/ThemedText';
import { BookingCard } from '@/components/BookingCard';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { BookingsStackParamList } from '@/navigation/BookingsStackNavigator';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<BookingsStackParamList, 'BookingsList'>;

const MOCK_BOOKINGS = [
  { id: '1', eventTitle: 'Engagement Session', clientName: 'Sarah Johnson', eventDate: 'Nov 22, 2024', startTime: '10:00 AM', endTime: '12:00 PM', borderColor: '#8B4565' },
  { id: '2', eventTitle: 'Consultation Call', clientName: 'Emily Davis', eventDate: 'Nov 25, 2024', startTime: '2:00 PM', endTime: '3:00 PM', borderColor: '#3B82F6' },
  { id: '3', eventTitle: 'Wedding Day Coverage', clientName: 'Rachel Martinez', eventDate: 'Dec 1, 2024', startTime: '12:00 PM', endTime: '9:00 PM', borderColor: '#22C55E' },
  { id: '4', eventTitle: 'Album Design Review', clientName: 'Jessica Wilson', eventDate: 'Dec 5, 2024', startTime: '11:00 AM', endTime: '12:30 PM', borderColor: '#F59E0B' },
];

export default function BookingsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScreenScrollView>
      <View style={[styles.calendarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText style={[styles.calendarText, { color: theme.textSecondary }]}>
          Calendar View
        </ThemedText>
        <ThemedText style={[styles.calendarSubtext, { color: theme.textSecondary }]}>
          Monthly calendar with booking dots will appear here
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
          Upcoming Appointments
        </ThemedText>
        {MOCK_BOOKINGS.map((booking) => (
          <BookingCard
            key={booking.id}
            eventTitle={booking.eventTitle}
            clientName={booking.clientName}
            eventDate={booking.eventDate}
            startTime={booking.startTime}
            endTime={booking.endTime}
            borderColor={booking.borderColor}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
          />
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  calendarPlaceholder: {
    height: 280,
    marginHorizontal: 10,
    marginVertical: Spacing.md,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  calendarText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  calendarSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
});
