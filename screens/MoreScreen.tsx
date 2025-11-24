import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

const MOCK_USER = {
  businessName: 'Sarah Johnson Photography',
  email: 'sarah@sarahjohnsonphoto.com',
  phone: '+1 (555) 987-6543',
  website: 'www.sarahjohnsonphoto.com',
};

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

function SettingsItem({ icon, title, subtitle, onPress }: SettingsItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        { backgroundColor: theme.backgroundRoot, borderBottomColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Feather name={icon as any} size={20} color={theme.textSecondary} />
      <View style={styles.settingsContent}>
        <ThemedText style={styles.settingsTitle}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.settingsSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const { theme } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => Alert.alert('Logged Out', 'You have been logged out successfully') },
      ]
    );
  };

  return (
    <ScreenScrollView>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
        <Avatar name={MOCK_USER.businessName} size={80} />
        <ThemedText style={[styles.businessName, { fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight }]}>
          {MOCK_USER.businessName}
        </ThemedText>
        <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
          {MOCK_USER.email}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          BUSINESS INFO
        </ThemedText>
        <View style={[styles.infoCard, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={theme.textSecondary} />
            <ThemedText style={styles.infoText}>{MOCK_USER.phone}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Feather name="globe" size={16} color={theme.textSecondary} />
            <ThemedText style={styles.infoText}>{MOCK_USER.website}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          SETTINGS
        </ThemedText>
        <SettingsItem
          icon="clock"
          title="Availability"
          subtitle="Manage your booking calendar"
          onPress={() => Alert.alert('Availability', 'Availability settings coming soon')}
        />
        <SettingsItem
          icon="bell"
          title="Notifications"
          subtitle="Push notifications and email alerts"
          onPress={() => Alert.alert('Notifications', 'Notification settings coming soon')}
        />
        <SettingsItem
          icon="smartphone"
          title="Face ID & Touch ID"
          subtitle="Quick biometric login"
          onPress={() => Alert.alert('Biometric Auth', 'Biometric settings coming soon')}
        />
      </View>

      <View style={styles.logoutContainer}>
        <PrimaryButton
          title="Logout"
          onPress={handleLogout}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  businessName: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  email: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoText: {
    fontSize: 15,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutContainer: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
});
