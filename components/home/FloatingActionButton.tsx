import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Dimensions,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { BlysColors, Shadows, BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MENU_HEIGHT = SCREEN_HEIGHT * 0.8;

export interface FABAction {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  description?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  bottomOffset?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingActionButton({
  actions,
  bottomOffset = 90,
}: FloatingActionButtonProps) {
  const { theme, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const translateY = useSharedValue(MENU_HEIGHT);
  const rotation = useSharedValue(0);

  const openMenu = () => {
    setIsVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    translateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    rotation.value = withTiming(45, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    translateY.value = withTiming(MENU_HEIGHT, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    });
    rotation.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.cubic),
    });
    // Delay hiding modal until animation completes
    setTimeout(() => setIsVisible(false), 300);
  };

  const handleActionPress = (action: FABAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeMenu();
    // Delay action to let menu close smoothly
    setTimeout(() => action.onPress(), 350);
  };

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <>
      {/* Slide-up Menu */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          <View style={StyleSheet.absoluteFill} />
        </Pressable>

        {/* Menu Sheet */}
        <Animated.View
          style={[
            styles.menuSheet,
            menuStyle,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? theme.border : "#E5E7EB" },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.menuHeader}>
            <Text style={[styles.menuTitle, { color: theme.text }]}>
              Quick Actions
            </Text>
            <Pressable
              onPress={closeMenu}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: isDark
                    ? theme.backgroundSecondary
                    : "#F3F4F6",
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          {/* Action Items */}
          <View style={styles.actionsContainer}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => handleActionPress(action)}
                style={({ pressed }) => [
                  styles.actionItem,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : "#F9FAFB",
                    borderColor: isDark ? theme.border : "#F3F4F6",
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.color || BlysColors.primary },
                  ]}
                >
                  <Feather name={action.icon} size={22} color="#FFFFFF" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={[styles.actionLabel, { color: theme.text }]}>
                    {action.label}
                  </Text>
                  {action.description && (
                    <Text
                      style={[
                        styles.actionDescription,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {action.description}
                    </Text>
                  )}
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Modal>

      {/* FAB Button */}
      <View style={[styles.fabContainer, { bottom: bottomOffset }]}>
        <AnimatedPressable
          onPress={isVisible ? closeMenu : openMenu}
          style={[styles.fab, { backgroundColor: BlysColors.primary }]}
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
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: MENU_HEIGHT,
    ...Shadows.lg,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.lg,
  },
});
