import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: SecondaryButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.primary },
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.text, { color: theme.primary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md - 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: Spacing.buttonHeight,
    backgroundColor: "transparent",
  },
  text: {
    fontSize: Typography.button.fontSize,
    fontWeight: Typography.button.fontWeight,
  },
});
