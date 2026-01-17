import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { theme, isDark } = useTheme();
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmerProgress.value, [0, 1], [-200, 200]),
      },
    ],
  }));

  const baseColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const shimmerColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={["transparent", shimmerColor, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// Pre-built skeleton layouts for common patterns
export function StatCardSkeleton() {
  return (
    <View style={skeletonStyles.statCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <Skeleton
        width={60}
        height={24}
        borderRadius={6}
        style={{ marginTop: Spacing.md }}
      />
      <Skeleton
        width={100}
        height={14}
        borderRadius={4}
        style={{ marginTop: Spacing.xs }}
      />
    </View>
  );
}

export function HeroCardSkeleton() {
  const { theme, isDark } = useTheme();
  return (
    <View
      style={[
        skeletonStyles.heroCard,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.03)",
        },
      ]}
    >
      <Skeleton width={100} height={14} borderRadius={4} />
      <Skeleton
        width={180}
        height={40}
        borderRadius={8}
        style={{ marginTop: Spacing.sm }}
      />
      <Skeleton
        width={140}
        height={14}
        borderRadius={4}
        style={{ marginTop: Spacing.md }}
      />
    </View>
  );
}

export function ClientCardSkeleton() {
  return (
    <View style={skeletonStyles.clientCard}>
      <Skeleton width={52} height={52} borderRadius={26} />
      <Skeleton
        width={120}
        height={16}
        borderRadius={4}
        style={{ marginTop: Spacing.md }}
      />
      <Skeleton
        width={100}
        height={14}
        borderRadius={4}
        style={{ marginTop: Spacing.xs }}
      />
      <Skeleton
        width="100%"
        height={36}
        borderRadius={BorderRadius.md}
        style={{ marginTop: Spacing.md }}
      />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  statCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "flex-start",
  },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  clientCard: {
    width: 180,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
});
