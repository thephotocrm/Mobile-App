import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  showChevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsItem({
  icon,
  title,
  subtitle,
  showChevron = false,
  onPress,
  danger,
}: SettingsItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.settingsItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather
          name={icon}
          size={20}
          color={danger ? "#DC2626" : theme.textSecondary}
        />
      </View>
      <View style={styles.itemContent}>
        <ThemedText style={[styles.itemTitle, danger && { color: "#DC2626" }]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            style={[styles.itemSubtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
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
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: theme.backgroundSecondary },
      ]}
    >
      <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

export function SettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logout, user } = useAuth();
  const { permissionStatus, requestPermissions, isSupported } =
    useNotifications();

  const handleClose = () => {
    navigation.goBack();
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    const subject = encodeURIComponent("Account Deletion Request");
    const body = encodeURIComponent(
      `Hi,\n\nI would like to request deletion of my thePhotoCRM account.\n\nAccount email: ${user?.email || "N/A"}\n\nPlease confirm once my account and all associated data have been permanently deleted.\n\nThank you`,
    );
    const mailtoUrl = `mailto:support@thephotocrm.com?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl);
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://app.thephotocrm.com/privacy");
  };

  const handleTermsOfService = () => {
    Linking.openURL("https://app.thephotocrm.com/tos");
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(
      "Coming Soon",
      `${feature} will be available in a future update.`,
      [{ text: "OK" }],
    );
  };

  const handleMobileNotifications = useCallback(async () => {
    if (!isSupported) {
      Alert.alert(
        "Not Supported",
        "Push notifications are only available on physical iOS and Android devices.",
        [{ text: "OK" }],
      );
      return;
    }

    if (permissionStatus === "granted") {
      Alert.alert(
        "Notifications Enabled",
        "Push notifications are enabled. You'll receive real-time updates about your projects and messages.",
        [
          { text: "OK" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ],
      );
      return;
    }

    if (permissionStatus === "denied") {
      Alert.alert(
        "Notifications Disabled",
        "Push notifications are disabled. To enable them, please go to your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ],
      );
      return;
    }

    // Permission is undetermined - request it
    const granted = await requestPermissions();
    if (granted) {
      Alert.alert(
        "Notifications Enabled",
        "You'll now receive real-time updates about your projects and messages.",
        [{ text: "Great!" }],
      );
    }
  }, [isSupported, permissionStatus, requestPermissions]);

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
        <View
          style={[styles.header, { backgroundColor: theme.backgroundRoot }]}
        >
          {headerContent}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: Spacing.xl },
        ]}
      >
        <SectionHeader title="ACCOUNT SETTINGS" />

        <View
          style={[styles.section, { backgroundColor: theme.backgroundCard }]}
        >
          <SettingsItem
            icon="user"
            title="Account details"
            subtitle="Update your name, website, and description."
            showChevron
            onPress={() => showComingSoon("Account details")}
          />
          <SettingsItem
            icon="droplet"
            title="Brand elements"
            subtitle="Add your brand to invoices, emails, & more."
            showChevron
            onPress={() => showComingSoon("Brand elements")}
          />
          <SettingsItem
            icon="check-circle"
            title="Setup status"
            subtitle="Tap to review content. Completed: 0%"
            showChevron
            onPress={() => showComingSoon("Setup status")}
          />
          <SettingsItem
            icon="lock"
            title="Phone number"
            subtitle="Add security phone number to verify it's you."
            showChevron
            onPress={() => showComingSoon("Phone number verification")}
          />
          <SettingsItem
            icon="calendar"
            title="OOO settings"
            subtitle="Set an out-of-office reply."
            showChevron
            onPress={() => showComingSoon("Out-of-office settings")}
          />
        </View>

        <SectionHeader title="APP SETTINGS" />

        <View
          style={[styles.section, { backgroundColor: theme.backgroundCard }]}
        >
          <SettingsItem
            icon="sliders"
            title="App preferences"
            subtitle="Manage your calendar, reminders, and sound..."
            showChevron
            onPress={() => showComingSoon("App preferences")}
          />
          <SettingsItem
            icon="cpu"
            title="thePhotoCrm AI"
            subtitle="Manage AI settings."
            showChevron
            onPress={() => showComingSoon("thePhotoCrm AI")}
          />
          <SettingsItem
            icon="bell"
            title="Mobile notifications"
            subtitle={
              permissionStatus === "granted"
                ? "Notifications enabled"
                : permissionStatus === "denied"
                  ? "Tap to enable in settings"
                  : "Tap to enable push notifications"
            }
            showChevron
            onPress={handleMobileNotifications}
          />
        </View>

        <SectionHeader title="GENERAL" />

        <View
          style={[styles.section, { backgroundColor: theme.backgroundCard }]}
        >
          <SettingsItem
            icon="message-circle"
            title="Chat with us"
            onPress={() => showComingSoon("Live chat support")}
          />
          <SettingsItem
            icon="help-circle"
            title="Help center"
            onPress={() => showComingSoon("Help center")}
          />
          <SettingsItem
            icon="globe"
            title="Connect with the Community"
            onPress={() => showComingSoon("Community")}
          />
          <SettingsItem
            icon="trash-2"
            title="Delete account"
            subtitle="Contact support to delete your account"
            showChevron
            danger
            onPress={handleDeleteAccount}
          />
          <SettingsItem
            icon="shield"
            title="Privacy policy"
            onPress={handlePrivacyPolicy}
          />
          <SettingsItem
            icon="file-text"
            title="Terms of service"
            onPress={handleTermsOfService}
          />
        </View>

        <View style={styles.footer}>
          <ThemedText
            style={[styles.connectLabel, { color: theme.textSecondary }]}
          >
            CONNECT WITH US
          </ThemedText>
          <View style={styles.socialIcons}>
            <Pressable
              style={[
                styles.socialButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => handleOpenLink("https://facebook.com/thephotocrm")}
            >
              <Feather name="facebook" size={20} color={theme.text} />
            </Pressable>
            <Pressable
              style={[
                styles.socialButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => handleOpenLink("https://twitter.com/thephotocrm")}
            >
              <Feather name="twitter" size={20} color={theme.text} />
            </Pressable>
            <Pressable
              style={[
                styles.socialButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() =>
                handleOpenLink("https://instagram.com/thephotocrm")
              }
            >
              <Feather name="instagram" size={20} color={theme.text} />
            </Pressable>
          </View>

          <ThemedText style={styles.appName}>thePhotoCrm</ThemedText>

          <Pressable
            style={[styles.logoutButton, { borderColor: theme.border }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={18} color={theme.text} />
            <ThemedText style={styles.logoutText}>Log out</ThemedText>
          </Pressable>

          <ThemedText style={[styles.version, { color: theme.textSecondary }]}>
            v 1.0.0 (1), rev 1
          </ThemedText>
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
