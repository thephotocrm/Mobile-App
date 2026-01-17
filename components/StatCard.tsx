import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { ThemedText } from "./ThemedText";
import { Spacing, Typography, BorderRadius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";

interface StatCardProps {
  value: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress?: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

// Convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StatCard({
  value,
  label,
  icon,
  color,
  onPress,
}: StatCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const hasValue = value !== "0" && value !== "$0" && value !== "";
  const shadowStyle = isDark ? Shadows.dark.sm : Shadows.sm;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundCard,
        },
        shadowStyle,
        animatedStyle,
      ]}
    >
      {/* Clean icon circle with solid color */}
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: hexToRgba(color, isDark ? 0.15 : 0.1) },
        ]}
      >
        <Feather name={icon} size={18} color={color} />
      </View>

      <ThemedText
        style={[
          styles.value,
          { color: hasValue ? theme.text : theme.textTertiary },
        ]}
      >
        {value}
      </ThemedText>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>

      {/* Interactive indicator */}
      {onPress && (
        <View
          style={[
            styles.tapIndicator,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="chevron-right" size={12} color={theme.textTertiary} />
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: "flex-start",
    position: "relative",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    ...Typography.h3,
    marginTop: Spacing.md,
  },
  label: {
    ...Typography.caption,
    marginTop: 2,
  },
  tapIndicator: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
