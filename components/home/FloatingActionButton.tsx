import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { BlysColors, Shadows, BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export interface FABAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  bottomOffset?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Separate component for action item to properly use hooks
interface ActionItemProps {
  action: FABAction;
  animation: SharedValue<number>;
  onPress: (action: FABAction) => void;
  isDark: boolean;
  theme: any;
}

function ActionItem({
  action,
  animation,
  onPress,
  isDark,
  theme,
}: ActionItemProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animation.value,
    transform: [
      {
        translateY: interpolate(
          animation.value,
          [0, 1],
          [20, 0],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          animation.value,
          [0, 1],
          [0.8, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.actionItem, animatedStyle]}>
      <Pressable
        onPress={() => onPress(action)}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
            borderColor: isDark ? theme.border : "transparent",
            borderWidth: isDark ? 1 : 0,
          },
          pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Text style={[styles.actionLabel, { color: theme.text }]}>
          {action.label}
        </Text>
        <View
          style={[
            styles.actionIconContainer,
            { backgroundColor: action.color || BlysColors.primary },
          ]}
        >
          <Feather name={action.icon} size={18} color="#FFFFFF" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function FloatingActionButton({
  actions,
  bottomOffset = 90,
}: FloatingActionButtonProps) {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useSharedValue(0);
  const rotation = useSharedValue(0);

  const toggleMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !isExpanded;
    setIsExpanded(newState);
    animation.value = withSpring(newState ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
    rotation.value = withSpring(newState ? 45 : 0, {
      damping: 15,
      stiffness: 150,
    });
  };

  const handleActionPress = (action: FABAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(false);
    animation.value = withSpring(0);
    rotation.value = withSpring(0);
    action.onPress();
  };

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: animation.value * 0.5,
    pointerEvents: animation.value > 0 ? "auto" : "none",
  }));

  const menuContainerStyle = useAnimatedStyle(() => ({
    opacity: animation.value,
    transform: [
      {
        translateY: interpolate(
          animation.value,
          [0, 1],
          [20, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropStyle, { backgroundColor: "#000000" }]}
        pointerEvents={isExpanded ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={toggleMenu} />
      </Animated.View>

      {/* FAB Container */}
      <View style={[styles.container, { bottom: bottomOffset }]}>
        {/* Action Menu */}
        <Animated.View style={[styles.menuContainer, menuContainerStyle]}>
          {actions.map((action) => (
            <ActionItem
              key={action.label}
              action={action}
              animation={animation}
              onPress={handleActionPress}
              isDark={isDark}
              theme={theme}
            />
          ))}
        </Animated.View>

        {/* Main FAB Button */}
        <AnimatedPressable
          onPress={toggleMenu}
          style={[styles.mainButton, { backgroundColor: BlysColors.primary }]}
        >
          <Animated.View style={mainButtonStyle}>
            <Feather name="plus" size={26} color="#FFFFFF" />
          </Animated.View>
        </AnimatedPressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  container: {
    position: "absolute",
    right: Spacing.lg,
    alignItems: "flex-end",
    zIndex: 100,
  },
  menuContainer: {
    marginBottom: Spacing.md,
  },
  actionItem: {
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: Spacing.sm,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mainButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
});
