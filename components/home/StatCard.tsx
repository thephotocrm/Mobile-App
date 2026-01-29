import React from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  BlysColors,
} from "@/constants/theme";
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
  emptyMessage?: string; // Encouraging message when value = 0
  celebratory?: boolean; // For "zero is good" cases (like pending payments)
  isCurrency?: boolean; // Format value as currency
  helpUrl?: string; // URL to help article for this metric
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Format currency helper
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  emptyMessage,
  celebratory = false,
  isCurrency = false,
  helpUrl,
}: StatCardProps) {
  const { theme, isDark } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleHelpPress = () => {
    if (helpUrl) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(helpUrl);
    }
  };

  const isLarge = size === "large";
  const isEmpty = value === 0;
  const showCelebration = isEmpty && celebratory;
  const showEncouragement = isEmpty && emptyMessage && !celebratory;
  const showHelpIcon = isEmpty && helpUrl && !celebratory;

  // Format the display value
  const displayValue = isCurrency ? formatCurrency(value) : value.toString();

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        isLarge && styles.containerLarge,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: isDark ? theme.border : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
        pressed && { opacity: 0.95 },
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

      {/* Value with optional celebration indicator */}
      <View style={styles.valueRow}>
        <ThemedText
          style={[
            styles.value,
            isLarge && styles.valueLarge,
            { color: theme.text },
          ]}
        >
          {displayValue}
        </ThemedText>
        {showCelebration && (
          <View
            style={[
              styles.celebrationBadge,
              {
                backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "#DCFCE7",
              },
            ]}
          >
            <Feather name="check" size={12} color="#22C55E" />
          </View>
        )}
      </View>

      {/* Label */}
      <ThemedText
        style={[styles.label, { color: theme.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>

      {/* Encouraging message for empty states */}
      {showEncouragement && (
        <View style={styles.emptyMessageRow}>
          <Text
            style={[styles.emptyMessage, { color: theme.textTertiary }]}
            numberOfLines={1}
          >
            {emptyMessage}
          </Text>
          {showHelpIcon && (
            <Pressable
              onPress={handleHelpPress}
              style={({ pressed }) => [
                styles.helpButton,
                {
                  backgroundColor: isDark
                    ? `${BlysColors.primary}15`
                    : `${BlysColors.primary}10`,
                },
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="help-circle"
                size={12}
                color={BlysColors.primary}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* Celebratory message */}
      {showCelebration && (
        <Text
          style={[styles.celebratoryMessage, { color: "#22C55E" }]}
          numberOfLines={1}
        >
          All caught up!
        </Text>
      )}

      {/* Action button (for large cards) */}
      {isLarge && actionLabel && (
        <View style={[styles.actionButton, { backgroundColor: color }]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Feather name="arrow-right" size={12} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
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
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  celebrationBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...Typography.caption,
    marginTop: 2,
  },
  emptyMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  emptyMessage: {
    fontSize: 10,
    fontWeight: "500",
    flex: 1,
  },
  helpButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  celebratoryMessage: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
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
