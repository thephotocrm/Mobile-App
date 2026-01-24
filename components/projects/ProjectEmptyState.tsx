import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  Typography,
  BlysColors,
} from "@/constants/theme";

export type EmptyStateVariant = "no-projects" | "no-results" | "no-search";

interface ProjectEmptyStateProps {
  variant: EmptyStateVariant;
  onAction: () => void;
  searchQuery?: string;
  filterName?: string;
}

const EMPTY_STATE_CONFIG: Record<
  EmptyStateVariant,
  {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    actionLabel: string;
    iconColor: string;
    iconBgColor: string;
    iconBgColorDark: string;
  }
> = {
  "no-projects": {
    icon: "folder-plus",
    title: "No projects yet",
    subtitle:
      "Start by adding your first project to track your photography bookings",
    actionLabel: "Add Your First Project",
    iconColor: BlysColors.primary,
    iconBgColor: "#F5F3FF",
    iconBgColorDark: "#2E1065",
  },
  "no-results": {
    icon: "filter",
    title: "No matching projects",
    subtitle: "Try adjusting your filters to see more projects",
    actionLabel: "Clear Filters",
    iconColor: "#6B7280",
    iconBgColor: "#F3F4F6",
    iconBgColorDark: "#374151",
  },
  "no-search": {
    icon: "search",
    title: "No results found",
    subtitle: "We couldn't find any projects matching your search",
    actionLabel: "Clear Search",
    iconColor: "#6B7280",
    iconBgColor: "#F3F4F6",
    iconBgColorDark: "#374151",
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProjectEmptyState({
  variant,
  onAction,
  searchQuery,
  filterName,
}: ProjectEmptyStateProps) {
  const { theme, isDark } = useTheme();
  const config = EMPTY_STATE_CONFIG[variant];
  const scale = useSharedValue(1);

  // Customize subtitle based on context
  let subtitle = config.subtitle;
  if (variant === "no-search" && searchQuery) {
    subtitle = `We couldn't find any projects matching "${searchQuery}"`;
  } else if (variant === "no-results" && filterName) {
    subtitle = `No projects in "${filterName}" stage. Try a different filter.`;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction();
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(100).duration(400)}
      style={styles.container}
    >
      {/* Icon */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isDark
              ? config.iconBgColorDark
              : config.iconBgColor,
          },
        ]}
      >
        <Feather name={config.icon} size={36} color={config.iconColor} />
      </View>

      {/* Text Content */}
      <ThemedText style={[styles.title, { color: theme.text }]}>
        {config.title}
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
        {subtitle}
      </ThemedText>

      {/* Action Button */}
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => (scale.value = 0.95)}
        onPressOut={() => (scale.value = 1)}
        style={[
          styles.actionButton,
          animatedStyle,
          {
            backgroundColor:
              variant === "no-projects"
                ? BlysColors.primary
                : isDark
                  ? theme.backgroundSecondary
                  : "#F3F4F6",
            borderWidth: variant !== "no-projects" ? 1 : 0,
            borderColor: isDark ? theme.border : "#E5E7EB",
          },
        ]}
      >
        <Text
          style={[
            styles.actionButtonText,
            {
              color:
                variant === "no-projects"
                  ? "#FFFFFF"
                  : isDark
                    ? theme.text
                    : "#374151",
            },
          ]}
        >
          {config.actionLabel}
        </Text>
        <Feather
          name={variant === "no-projects" ? "plus" : "x"}
          size={16}
          color={
            variant === "no-projects"
              ? "#FFFFFF"
              : isDark
                ? theme.text
                : "#374151"
          }
        />
      </AnimatedPressable>

      {/* Decorative elements for no-projects variant */}
      {variant === "no-projects" && (
        <View style={styles.decorativeContainer}>
          <View
            style={[
              styles.decorativeDot,
              { backgroundColor: "#F59E0B", left: "20%", top: 0 },
            ]}
          />
          <View
            style={[
              styles.decorativeDot,
              { backgroundColor: "#3B82F6", right: "25%", top: 10 },
            ]}
          />
          <View
            style={[
              styles.decorativeDot,
              {
                backgroundColor: "#22C55E",
                left: "30%",
                bottom: 0,
                width: 6,
                height: 6,
              },
            ]}
          />
          <View
            style={[
              styles.decorativeDot,
              {
                backgroundColor: "#EC4899",
                right: "15%",
                bottom: 15,
                width: 8,
                height: 8,
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    position: "relative",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.button,
    gap: Spacing.sm,
  },
  actionButtonText: {
    ...Typography.button,
  },
  decorativeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  decorativeDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.4,
  },
});
