import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeOutRight,
  Easing,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export type PriorityType = "inquiry" | "shoot" | "payment" | "empty";

interface PriorityCardProps {
  type: PriorityType;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
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
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PriorityCard({
  type,
  title,
  subtitle,
  actionLabel,
  onAction,
  onDismiss,
}: PriorityCardProps) {
  const { theme, isDark } = useTheme();
  const config = PRIORITY_CONFIG[type];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
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
      <AnimatedPressable
        onPress={handleAction}
        onPressIn={() => (scale.value = 0.98)}
        onPressOut={() => (scale.value = 1)}
        style={animatedStyle}
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
            <Feather name={config.icon} size={20} color="#FFFFFF" />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.label, { color: config.iconBg }]}>
              {config.label}
            </Text>
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
      </AnimatedPressable>
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
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
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
