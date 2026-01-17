import React from "react";
import { View, StyleSheet, Pressable, Alert, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";

const MOCK_USER = {
  businessName: "Sarah Johnson Photography",
  email: "sarah@sarahjohnsonphoto.com",
  phone: "+1 (555) 987-6543",
  website: "www.sarahjohnsonphoto.com",
};

const MOCK_STATS = {
  activeProjects: 8,
  thisMonthBookings: 12,
  totalClients: 47,
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
        {
          backgroundColor: theme.backgroundRoot,
          borderBottomColor: theme.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Feather name={icon as any} size={20} color={theme.textSecondary} />
      <View style={styles.settingsContent}>
        <ThemedText style={styles.settingsTitle}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText
            style={[styles.settingsSubtitle, { color: theme.textSecondary }]}
          >
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
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const handleSupport = () => {
    Linking.openURL("mailto:support@thephotocrm.com");
  };

  return (
    <ScreenScrollView>
      <View
        style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Avatar name={MOCK_USER.businessName} size={80} />
        <ThemedText
          style={[
            styles.businessName,
            {
              fontSize: Typography.h2.fontSize,
              fontWeight: Typography.h2.fontWeight,
            },
          ]}
        >
          {MOCK_USER.businessName}
        </ThemedText>
        <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
          {MOCK_USER.email}
        </ThemedText>
        <Pressable
          onPress={() =>
            Alert.alert("Edit Profile", "Profile editing coming soon!")
          }
          style={({ pressed }) => [
            styles.editProfileButton,
            { borderColor: theme.primary },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="edit-2" size={14} color={theme.primary} />
          <ThemedText
            style={[styles.editProfileText, { color: theme.primary }]}
          >
            Edit Profile
          </ThemedText>
        </Pressable>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View
          style={[styles.statCard, { backgroundColor: theme.backgroundCard }]}
        >
          <ThemedText style={[styles.statValue, { color: theme.primary }]}>
            {MOCK_STATS.activeProjects}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            Active Projects
          </ThemedText>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.backgroundCard }]}
        >
          <ThemedText style={[styles.statValue, { color: theme.primary }]}>
            {MOCK_STATS.thisMonthBookings}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            This Month
          </ThemedText>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.backgroundCard }]}
        >
          <ThemedText style={[styles.statValue, { color: theme.primary }]}>
            {MOCK_STATS.totalClients}
          </ThemedText>
          <ThemedText
            style={[styles.statLabel, { color: theme.textSecondary }]}
          >
            Total Clients
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          BUSINESS INFO
        </ThemedText>
        <View
          style={[styles.infoCard, { backgroundColor: theme.backgroundRoot }]}
        >
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
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          SETTINGS
        </ThemedText>
        <SettingsItem
          icon="clock"
          title="Availability"
          subtitle="Manage your booking calendar"
          onPress={() =>
            Alert.alert("Availability", "Availability settings coming soon")
          }
        />
        <SettingsItem
          icon="bell"
          title="Notifications"
          subtitle="Push notifications and email alerts"
          onPress={() =>
            Alert.alert("Notifications", "Notification settings coming soon")
          }
        />
        <SettingsItem
          icon="smartphone"
          title="Face ID & Touch ID"
          subtitle="Quick biometric login"
          onPress={() =>
            Alert.alert("Biometric Auth", "Biometric settings coming soon")
          }
        />
      </View>

      <View style={styles.section}>
        <ThemedText
          style={[styles.sectionTitle, { color: theme.textSecondary }]}
        >
          SUPPORT
        </ThemedText>
        <SettingsItem
          icon="help-circle"
          title="Help Center"
          subtitle="FAQs and documentation"
          onPress={() => Linking.openURL("https://thephotocrm.com/help")}
        />
        <SettingsItem
          icon="message-circle"
          title="Contact Support"
          subtitle="Get help from our team"
          onPress={handleSupport}
        />
      </View>

      <View style={styles.logoutContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: theme.error },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={theme.error} />
          <ThemedText style={[styles.logoutText, { color: theme.error }]}>
            Logout
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText style={[styles.versionText, { color: theme.textSecondary }]}>
        thePhotoCRM v1.0.0
      </ThemedText>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  businessName: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  email: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  infoText: {
    fontSize: 15,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutContainer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
});
