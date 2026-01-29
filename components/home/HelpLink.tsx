import React from "react";
import { Pressable, Text, StyleSheet, Linking } from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Spacing, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

type HelpLinkIcon = "play" | "info" | "book" | "lightbulb";

interface HelpLinkProps {
  label: string;
  url: string;
  icon?: HelpLinkIcon;
  size?: "small" | "normal";
}

const ICON_MAP: Record<HelpLinkIcon, keyof typeof Feather.glyphMap> = {
  play: "play-circle",
  info: "info",
  book: "book-open",
  lightbulb: "zap",
};

export function HelpLink({
  label,
  url,
  icon = "info",
  size = "normal",
}: HelpLinkProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  const iconSize = size === "small" ? 12 : 14;
  const fontSize = size === "small" ? 11 : 12;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.6 }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Feather
        name={ICON_MAP[icon]}
        size={iconSize}
        color={BlysColors.primary}
      />
      <Text
        style={[
          styles.label,
          {
            fontSize,
            color: BlysColors.primary,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Compact icon-only help button for tight spaces
interface HelpIconButtonProps {
  url: string;
  icon?: HelpLinkIcon;
}

export function HelpIconButton({ url, icon = "info" }: HelpIconButtonProps) {
  const { isDark } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: isDark
            ? `${BlysColors.primary}15`
            : `${BlysColors.primary}10`,
        },
        pressed && { opacity: 0.6 },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Feather name={ICON_MAP[icon]} size={12} color={BlysColors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontWeight: "500",
  },
  iconButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
