import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, title, subtitle, showChevron = false, onPress, danger }: SettingsItemProps) {
  const { theme } = useTheme();
  
  return (
    <Pressable 
      style={[styles.settingsItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={icon} size={20} color={danger ? "#DC2626" : theme.textSecondary} />
      </View>
      <View style={styles.itemContent}>
        <ThemedText style={[styles.itemTitle, danger && { color: "#DC2626" }]}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.itemSubtitle, { color: theme.textSecondary }]}>{subtitle}</ThemedText>
        ) : null}
      </View>
      {showChevron ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundSecondary }]}>
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</ThemedText>
    </View>
  );
}

export function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const headerContent = (
    <View style={[styles.headerContent, { paddingTop: insets.top }]}>
      <Pressable
        onPress={handleClose}
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="x" size={24} color={theme.text} />
      </Pressable>
      <ThemedText style={styles.headerTitle}>Settings</ThemedText>
      <View style={styles.placeholder} />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={100}
          tint={isDark ? "dark" : "light"}
          style={styles.header}
        >
          {headerContent}
        </BlurView>
      ) : (
        <View style={[styles.header, { backgroundColor: theme.backgroundRoot }]}>
          {headerContent}
        </View>
      )}

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: Spacing.xl }
        ]}
      >
        <View style={[styles.notificationBanner, { backgroundColor: "#EDE9FE", borderLeftColor: "#8B45FF" }]}>
          <View style={styles.notificationIcon}>
            <Feather name="bell" size={20} color="#8B45FF" />
          </View>
          <View style={styles.notificationContent}>
            <ThemedText style={styles.notificationTitle}>Turn on real-time updates?</ThemedText>
            <ThemedText style={[styles.notificationSubtitle, { color: theme.textSecondary }]}>
              You'll be notified about new leads, payments, and client messages.
            </ThemedText>
            <Pressable>
              <ThemedText style={[styles.notificationAction, { color: "#8B45FF" }]}>Allow notifications</ThemedText>
            </Pressable>
          </View>
        </View>

        <SectionHeader title="ACCOUNT SETTINGS" />
        
        <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
          <SettingsItem 
            icon="user" 
            title="Account details" 
            subtitle="Update your name, website, and description."
            showChevron
          />
          <SettingsItem 
            icon="droplet" 
            title="Brand elements" 
            subtitle="Add your brand to invoices, emails, & more."
            showChevron
          />
          <SettingsItem 
            icon="check-circle" 
            title="Setup status" 
            subtitle="Tap to review content. Completed: 0%"
            showChevron
          />
          <SettingsItem 
            icon="lock" 
            title="Phone number" 
            subtitle="Add security phone number to verify it's you."
            showChevron
          />
          <SettingsItem 
            icon="calendar" 
            title="OOO settings" 
            subtitle="Set an out-of-office reply."
            showChevron
          />
        </View>

        <SectionHeader title="APP SETTINGS" />
        
        <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
          <SettingsItem 
            icon="sliders" 
            title="App preferences" 
            subtitle="Manage your calendar, reminders, and sound..."
            showChevron
          />
          <SettingsItem 
            icon="cpu" 
            title="thePhotoCrm AI" 
            subtitle="Manage AI settings."
            showChevron
          />
          <SettingsItem 
            icon="bell" 
            title="Mobile notifications" 
            subtitle="Manage your real-time updates."
            showChevron
          />
        </View>

        <SectionHeader title="GENERAL" />
        
        <View style={[styles.section, { backgroundColor: theme.backgroundCard }]}>
          <SettingsItem 
            icon="message-circle" 
            title="Chat with us" 
          />
          <SettingsItem 
            icon="help-circle" 
            title="Help center" 
          />
          <SettingsItem 
            icon="globe" 
            title="Connect with the Community" 
          />
          <SettingsItem 
            icon="trash-2" 
            title="Delete account" 
            danger
          />
          <SettingsItem 
            icon="file-text" 
            title="Terms & privacy" 
          />
        </View>

        <View style={styles.footer}>
          <ThemedText style={[styles.connectLabel, { color: theme.textSecondary }]}>CONNECT WITH US</ThemedText>
          <View style={styles.socialIcons}>
            <Pressable 
              style={[styles.socialButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => handleOpenLink("https://facebook.com")}
            >
              <Feather name="facebook" size={20} color={theme.text} />
            </Pressable>
            <Pressable 
              style={[styles.socialButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => handleOpenLink("https://twitter.com")}
            >
              <Feather name="twitter" size={20} color={theme.text} />
            </Pressable>
            <Pressable 
              style={[styles.socialButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => handleOpenLink("https://instagram.com")}
            >
              <Feather name="instagram" size={20} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText style={styles.appName}>thePhotoCrm</ThemedText>

          <Pressable style={[styles.logoutButton, { borderColor: theme.border }]}>
            <Feather name="log-out" size={18} color={theme.text} />
            <ThemedText style={styles.logoutText}>Log out</ThemedText>
          </Pressable>

          <ThemedText style={[styles.version, { color: theme.textSecondary }]}>v 1.0.0 (1), rev 1</ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: Spacing.sm,
    minHeight: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  placeholder: {
    width: 44,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  notificationBanner: {
    flexDirection: "row",
    margin: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
  },
  notificationIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationAction: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 0,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    paddingHorizontal: 16,
  },
  connectLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  socialIcons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "500",
  },
  version: {
    fontSize: 12,
  },
});
