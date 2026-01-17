import React from "react";
import { Pressable, StyleSheet, Text, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: PrimaryButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.primary },
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.buttonText} />
      ) : (
        <Text style={[styles.text, { color: theme.buttonText }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md - 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: Spacing.buttonHeight,
  },
  text: {
    fontSize: Typography.button.fontSize,
    fontWeight: Typography.button.fontWeight,
  },
});
