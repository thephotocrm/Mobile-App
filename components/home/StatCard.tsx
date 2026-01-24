import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface TrendData {
  value: number;
  direction: "up" | "down";
}

interface StatCardProps {
  label: string;
  value: number;
  trend?: TrendData;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  size?: "normal" | "large";
  onPress?: () => void;
  actionLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export function StatCard({
  label,
  value,
  trend,
  icon,
  color,
  size = "normal",
  onPress,
  actionLabel,
}: StatCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const isLarge = size === "large";

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => (scale.value = 0.95)}
      onPressOut={() => (scale.value = 1)}
      style={[
        animatedStyle,
        styles.container,
        isLarge && styles.containerLarge,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      {/* Header with icon and trend */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark
                ? theme.backgroundSecondary
                : hexToRgba(color, 0.1),
            },
          ]}
        >
          <Feather name={icon} size={isLarge ? 22 : 18} color={color} />
        </View>

        {trend && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor:
                  trend.direction === "up"
                    ? isDark
                      ? "rgba(34, 197, 94, 0.2)"
                      : "#DCFCE7"
                    : isDark
                      ? "rgba(239, 68, 68, 0.2)"
                      : "#FEE2E2",
              },
            ]}
          >
            <Feather
              name={trend.direction === "up" ? "trending-up" : "trending-down"}
              size={10}
              color={trend.direction === "up" ? "#22C55E" : "#EF4444"}
            />
            <Text
              style={[
                styles.trendText,
                {
                  color: trend.direction === "up" ? "#22C55E" : "#EF4444",
                },
              ]}
            >
              {trend.direction === "up" ? "+" : "-"}
              {trend.value}
            </Text>
          </View>
        )}
      </View>

      {/* Value */}
      <ThemedText
        style={[
          styles.value,
          isLarge && styles.valueLarge,
          { color: theme.text },
        ]}
      >
        {value}
      </ThemedText>

      {/* Label */}
      <ThemedText
        style={[styles.label, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>

      {/* Action button (for large cards) */}
      {isLarge && actionLabel && (
        <View style={[styles.actionButton, { backgroundColor: color }]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Feather name="arrow-right" size={12} color="#FFFFFF" />
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  containerLarge: {
    width: "100%",
    paddingVertical: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    fontVariant: ["tabular-nums"],
  },
  valueLarge: {
    fontSize: 36,
    lineHeight: 42,
  },
  label: {
    ...Typography.caption,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: Spacing.md,
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
