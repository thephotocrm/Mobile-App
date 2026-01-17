import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface InputProps extends TextInputProps {
  onChangeText: (text: string) => void;
  variant?: "default" | "filled" | "search";
}

export function Input({
  onChangeText,
  variant = "default",
  style,
  ...props
}: InputProps) {
  const { theme, isDark } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "search":
        return {
          backgroundColor: theme.backgroundSecondary,
          borderColor: "transparent",
          borderWidth: 0,
        };
      case "filled":
        return {
          backgroundColor: theme.backgroundSecondary,
          borderColor: "transparent",
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          borderWidth: 1,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TextInput
      style={[
        styles.input,
        {
          ...variantStyles,
          color: theme.text,
        },
        style,
      ]}
      placeholderTextColor={theme.textTertiary}
      onChangeText={onChangeText}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.input,
    fontSize: 15,
    minHeight: Spacing.inputHeight,
    textAlignVertical: "center",
  },
});
