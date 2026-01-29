import React from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeOutRight,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export type PriorityType = "inquiry" | "shoot" | "payment" | "empty" | "tip";

// Rotating motivational tips for when there are no urgent actions
export const MOTIVATION_TIPS = [
  {
    id: "response-time",
    title: "Quick tip",
    subtitle: "Respond to inquiries within 2 hours for 3x more bookings",
    icon: "zap" as keyof typeof Feather.glyphMap,
    actionLabel: "Check Inbox",
    screen: "InboxTab",
    learnMoreUrl: "https://help.thephotocrm.com/tips/response-time-guide",
    detail:
      "Studies show photographers who respond within 2 hours book 3x more clients",
  },
  {
    id: "social-share",
    title: "Growth idea",
    subtitle: "Post your best work on social media today",
    icon: "trending-up" as keyof typeof Feather.glyphMap,
    actionLabel: "View Gallery",
    screen: "ProjectsTab",
    learnMoreUrl: "https://help.thephotocrm.com/tips/social-media-growth",
    detail: "Consistent posting builds your brand and attracts ideal clients",
  },
  {
    id: "week-prep",
    title: "Stay sharp",
    subtitle: "Review your upcoming week and prepare shot lists",
    icon: "calendar" as keyof typeof Feather.glyphMap,
    actionLabel: "View Calendar",
    screen: "Calendar",
    learnMoreUrl: "https://help.thephotocrm.com/tips/shoot-preparation",
    detail:
      "Prepared photographers deliver better results and feel less stressed",
  },
  {
    id: "client-love",
    title: "Client love",
    subtitle: "Send a check-in message to a past client",
    icon: "heart" as keyof typeof Feather.glyphMap,
    actionLabel: "View Contacts",
    screen: "ContactsTab",
    learnMoreUrl: "https://help.thephotocrm.com/tips/client-retention",
    detail:
      "Past clients are your best source of referrals and repeat bookings",
  },
  {
    id: "portfolio",
    title: "Portfolio tip",
    subtitle: "Add your recent shoots to showcase your style",
    icon: "image" as keyof typeof Feather.glyphMap,
    actionLabel: "Add Project",
    screen: "AddProject",
    learnMoreUrl: "https://help.thephotocrm.com/tips/portfolio-building",
    detail: "A curated portfolio helps clients visualize working with you",
  },
];

// Get a tip based on session or time (rotates through tips)
export function getRotatingTip(): (typeof MOTIVATION_TIPS)[0] {
  // Use hour of day to rotate tips (changes every few hours)
  const hour = new Date().getHours();
  const tipIndex = Math.floor(hour / 5) % MOTIVATION_TIPS.length;
  return MOTIVATION_TIPS[tipIndex];
}

interface PriorityCardProps {
  type: PriorityType;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  tipIcon?: keyof typeof Feather.glyphMap;
  learnMoreUrl?: string;
}

const PRIORITY_CONFIG: Record<
  PriorityType,
  {
    icon: keyof typeof Feather.glyphMap;
    gradient: [string, string];
    iconBg: string;
    label: string;
  }
> = {
  inquiry: {
    icon: "mail",
    gradient: ["#F8F4F6", "#F3E8ED"], // Soft dusty rose tint
    iconBg: BlysColors.primary, // Uses brand color
    label: "NEEDS REPLY",
  },
  shoot: {
    icon: "camera",
    gradient: ["#DBEAFE", "#BFDBFE"],
    iconBg: "#3B82F6",
    label: "UPCOMING",
  },
  payment: {
    icon: "dollar-sign",
    gradient: ["#D1FAE5", "#A7F3D0"],
    iconBg: "#22C55E",
    label: "OVERDUE",
  },
  empty: {
    icon: "sun",
    gradient: ["#F5F3FF", "#EDE9FE"],
    iconBg: BlysColors.primary,
    label: "TIP",
  },
  tip: {
    icon: "sun",
    gradient: ["#FEF3C7", "#FDE68A"], // Warm amber gradient
    iconBg: "#F59E0B",
    label: "TIP",
  },
};

export function PriorityCard({
  type,
  title,
  subtitle,
  actionLabel,
  onAction,
  onDismiss,
  tipIcon,
  learnMoreUrl,
}: PriorityCardProps) {
  const { theme, isDark } = useTheme();
  const config = PRIORITY_CONFIG[type];

  // Use custom tip icon if provided, otherwise use config icon
  const displayIcon = tipIcon || config.icon;

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  const handleLearnMore = () => {
    if (learnMoreUrl) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(learnMoreUrl);
    }
  };

  const gradientColors = isDark
    ? ([`${config.iconBg}20`, `${config.iconBg}10`] as [string, string])
    : config.gradient;

  return (
    <Animated.View
      entering={FadeInUp.delay(150)
        .duration(400)
        .easing(Easing.out(Easing.cubic))}
      exiting={FadeOutRight.duration(300)}
      style={styles.container}
    >
      <Pressable
        onPress={handleAction}
        style={({ pressed }) => [pressed && { opacity: 0.95 }]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.card,
            isDark && {
              borderWidth: 1,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Dismiss button */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.dismissButton,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name="x"
              size={16}
              color={isDark ? theme.textSecondary : "#6B7280"}
            />
          </Pressable>

          {/* Icon */}
          <View
            style={[styles.iconContainer, { backgroundColor: config.iconBg }]}
          >
            <Feather name={displayIcon} size={20} color="#FFFFFF" />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: config.iconBg }]}>
                {config.label}
              </Text>
              {learnMoreUrl && type === "tip" && (
                <Pressable
                  onPress={handleLearnMore}
                  style={({ pressed }) => [
                    styles.infoButton,
                    {
                      backgroundColor: isDark
                        ? `${config.iconBg}20`
                        : `${config.iconBg}15`,
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="info" size={10} color={config.iconBg} />
                </Pressable>
              )}
            </View>
            <ThemedText
              style={[styles.title, { color: isDark ? theme.text : "#1F2937" }]}
              numberOfLines={1}
            >
              {title}
            </ThemedText>
            <ThemedText
              style={[
                styles.subtitle,
                { color: isDark ? theme.textSecondary : "#6B7280" },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </ThemedText>
          </View>

          {/* Action button */}
          <Pressable
            onPress={handleAction}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: config.iconBg },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Feather name="arrow-right" size={14} color="#FFFFFF" />
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    position: "relative",
  },
  dismissButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  infoButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
