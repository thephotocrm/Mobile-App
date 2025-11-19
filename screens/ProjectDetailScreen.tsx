import React from 'react';
import { View, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

const MOCK_PROJECT = {
  title: 'Sarah & Mike Wedding',
  clientName: 'Sarah Johnson',
  clientEmail: 'sarah.johnson@example.com',
  clientPhone: '+1 (555) 123-4567',
  eventDate: 'June 15, 2025',
  stageName: 'Booked',
  stageColor: '#3B82F6',
  notes: [
    { id: '1', text: 'Initial consultation completed - discussed venue and timeline', date: 'Nov 10, 2024' },
    { id: '2', text: 'Contract signed and deposit received', date: 'Nov 15, 2024' },
  ],
};

export default function ProjectDetailScreen() {
  const { theme } = useTheme();

  const handleCall = () => {
    Linking.openURL(`tel:${MOCK_PROJECT.clientPhone}`);
  };

  const handleText = () => {
    Linking.openURL(`sms:${MOCK_PROJECT.clientPhone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${MOCK_PROJECT.clientEmail}`);
  };

  const handleSendLink = () => {
    Alert.alert('Magic Link Sent', `A secure login link has been sent to ${MOCK_PROJECT.clientEmail}`);
  };

  return (
    <ScreenScrollView>
      <View style={[styles.hero, { backgroundColor: theme.backgroundSecondary }]}>
        <Avatar name={MOCK_PROJECT.clientName} size={64} />
        <ThemedText style={[styles.heroTitle, { fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight }]}>
          {MOCK_PROJECT.title}
        </ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
          {MOCK_PROJECT.clientName}
        </ThemedText>
        <View style={styles.heroBadge}>
          <Badge label={MOCK_PROJECT.stageName} backgroundColor={MOCK_PROJECT.stageColor} />
        </View>
        <ThemedText style={[styles.heroDate, { color: theme.textSecondary }]}>
          Event Date: {MOCK_PROJECT.eventDate}
        </ThemedText>
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="phone" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Call</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleText}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-square" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Text</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleEmail}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="mail" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Email</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleSendLink}
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="link" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Send Link</ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { fontSize: Typography.h3.fontSize, fontWeight: Typography.h3.fontWeight }]}>
          Project Notes
        </ThemedText>
        {MOCK_PROJECT.notes.map((note) => (
          <View key={note.id} style={[styles.noteCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText style={styles.noteText}>{note.text}</ThemedText>
            <ThemedText style={[styles.noteDate, { color: theme.textSecondary }]}>
              {note.date}
            </ThemedText>
          </View>
        ))}
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
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  heroBadge: {
    marginTop: Spacing.md,
  },
  heroDate: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  noteCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  noteText: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  noteDate: {
    fontSize: 12,
  },
});
