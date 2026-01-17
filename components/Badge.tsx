import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  variant?: "default" | "subtle" | "outline";
}

// Helper to create subtle background from solid color
const createSubtleBackground = (color: string): string => {
  return color + "18"; // 18 is ~10% opacity in hex
};

export function Badge({
  label,
  color = "#FFFFFF",
  backgroundColor = "#1A1A1A",
  variant = "default",
}: BadgeProps) {
  const getStyles = () => {
    switch (variant) {
      case "subtle":
        return {
          backgroundColor: createSubtleBackground(backgroundColor),
          textColor: backgroundColor,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          textColor: backgroundColor,
          borderColor: backgroundColor,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor,
          textColor: color,
        };
    }
  };

  const variantStyles = getStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variantStyles.borderWidth || 0,
        },
      ]}
    >
      <Text style={[styles.text, { color: variantStyles.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  text: {
    ...Typography.captionMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
