import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { BookingCard } from '@/components/BookingCard';
import { Input } from '@/components/Input';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { BookingsStackParamList } from '@/navigation/BookingsStackNavigator';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';
import { BookingRepository, BookingWithClient } from '@/database/repositories/BookingRepository';

type NavigationProp = NativeStackNavigationProp<BookingsStackParamList, 'BookingsList'>;

const BORDER_COLORS = ['#8B4565', '#3B82F6', '#22C55E', '#F59E0B'];

const MOCK_BOOKINGS: BookingWithClient[] = [
  {
    id: 1,
    client_id: 1,
    client_name: 'Sarah Johnson',
    client_email: 'sarah.johnson@example.com',
    event_title: 'Engagement Session',
    event_date: Math.floor(new Date('2024-11-22').getTime() / 1000),
    start_time: '10:00 AM',
    end_time: '12:00 PM',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 2,
    client_id: 2,
    client_name: 'Emily Davis',
    client_email: 'emily.davis@example.com',
    event_title: 'Consultation Call',
    event_date: Math.floor(new Date('2024-11-25').getTime() / 1000),
    start_time: '2:00 PM',
    end_time: '3:00 PM',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 3,
    client_id: 3,
    client_name: 'Rachel Martinez',
    client_email: 'rachel.martinez@example.com',
    event_title: 'Wedding Day Coverage',
    event_date: Math.floor(new Date('2024-12-01').getTime() / 1000),
    start_time: '12:00 PM',
    end_time: '9:00 PM',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  },
  {
    id: 4,
    client_id: 4,
    client_name: 'Jessica Wilson',
    client_email: 'jessica.wilson@example.com',
    event_title: 'Album Design Review',
    event_date: Math.floor(new Date('2024-12-05').getTime() / 1000),
    start_time: '11:00 AM',
    end_time: '12:30 PM',
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
  },
];

const formatEventDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
};

const getBorderColor = (bookingId: number): string => {
  return BORDER_COLORS[bookingId % BORDER_COLORS.length];
};

export default function BookingsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<BookingWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      setLoading(true);
      let result: BookingWithClient[];

      if (Platform.OS === 'web') {
        result = MOCK_BOOKINGS;
        
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          result = result.filter(booking => 
            booking.event_title.toLowerCase().includes(query) ||
            booking.client_name.toLowerCase().includes(query) ||
            (booking.location && booking.location.toLowerCase().includes(query))
          );
        }
      } else {
        if (searchQuery.trim()) {
          result = await BookingRepository.search(searchQuery.trim());
        } else {
          result = await BookingRepository.getAll();
        }
      }

      setBookings(result);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadBookings();
    }, [searchQuery])
  );

  return (
    <ScreenScrollView>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={[styles.calendarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText style={[styles.calendarText, { color: theme.textSecondary }]}>
          Calendar View
        </ThemedText>
        <ThemedText style={[styles.calendarSubtext, { color: theme.textSecondary }]}>
          Monthly calendar with booking dots will appear here
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
            All Bookings
          </ThemedText>
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No bookings found</ThemedText>
            </View>
          ) : (
            bookings.map((booking) => (
              <BookingCard
                key={booking.id.toString()}
                eventTitle={booking.event_title}
                clientName={booking.client_name}
                eventDate={formatEventDate(booking.event_date)}
                startTime={booking.start_time}
                endTime={booking.end_time}
                borderColor={getBorderColor(booking.id)}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id.toString() })}
              />
            ))
          )}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
  },
  searchWrapper: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
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
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
