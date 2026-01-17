import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GradientColors } from "@/constants/theme";

interface AvatarProps {
  name: string;
  size?: number;
  showGradient?: boolean;
  backgroundColor?: string; // Custom background color override
  textColor?: string; // Custom text color override
}

// Avatar color palettes - more sophisticated EasyPay-inspired colors
const AVATAR_GRADIENTS = [
  GradientColors.avatarPink,
  GradientColors.avatarBlue,
  GradientColors.avatarPurple,
  GradientColors.avatarGreen,
  GradientColors.avatarOrange,
  GradientColors.avatarTeal,
];

const AVATAR_SOLID_COLORS = [
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#10B981", // Green
  "#F97316", // Orange
  "#14B8A6", // Teal
];

export function Avatar({
  name,
  size = 40,
  showGradient = true,
  backgroundColor,
  textColor = "#FFFFFF",
}: AvatarProps) {
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  // Get consistent color index based on name
  const getColorIndex = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % AVATAR_GRADIENTS.length;
  };

  const colorIndex = getColorIndex(name);
  const gradientColors = AVATAR_GRADIENTS[colorIndex] as [string, string];
  const solidColor = AVATAR_SOLID_COLORS[colorIndex];
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  // If custom backgroundColor is provided, use it directly
  if (backgroundColor) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize, color: textColor }]}>
          {initials}
        </Text>
      </View>
    );
  }

  if (showGradient) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize, color: textColor }]}>
          {initials}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: solidColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize, color: textColor }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
