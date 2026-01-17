import React from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

// Shadow configurations for different elevation levels - EasyPay-inspired subtle shadows
const getShadowForElevation = (elevation: number, isDark: boolean) => {
  if (Platform.OS === "android") {
    // Android elevation values (more subtle)
    const elevationMap = { 1: 1, 2: 2, 3: 4 };
    return {
      elevation: elevationMap[elevation as keyof typeof elevationMap] || 0,
    };
  }

  // iOS shadows - very subtle like EasyPay
  const shadowColor = "#000000";

  switch (elevation) {
    case 1:
      return isDark ? Shadows.dark.xs : Shadows.xs;
    case 2:
      return isDark ? Shadows.dark.sm : Shadows.sm;
    case 3:
      return isDark ? Shadows.dark.md : Shadows.md;
    default:
      return Shadows.none;
  }
};

interface CardProps {
  elevation: number;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const getBackgroundColorForElevation = (
  elevation: number,
  theme: any,
): string => {
  switch (elevation) {
    case 1:
      return theme.backgroundDefault;
    case 2:
      return theme.backgroundSecondary;
    case 3:
      return theme.backgroundTertiary;
    default:
      return theme.backgroundRoot;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ elevation, onPress, children, style }: CardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const cardBackgroundColor = getBackgroundColorForElevation(elevation, theme);
  const shadowStyles = getShadowForElevation(elevation, isDark);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: cardBackgroundColor,
        },
        shadowStyles,
        animatedStyle,
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
  },
});
