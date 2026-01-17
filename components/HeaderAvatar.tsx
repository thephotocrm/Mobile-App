import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { GradientColors } from "@/constants/theme";

interface HeaderAvatarProps {
  onPress?: () => void;
}

export function HeaderAvatar({ onPress }: HeaderAvatarProps) {
  const { user } = useAuth();

  // Get initials from email
  const getInitials = (): string => {
    if (!user?.email) return "?";
    const emailName = user.email.split("@")[0];
    // Try to extract initials from email (e.g., "john.doe" -> "JD")
    const parts = emailName.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    // Just use first two characters
    return emailName.slice(0, 2).toUpperCase();
  };

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      android_ripple={{ color: "transparent" }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <LinearGradient
        colors={GradientColors.journey as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatarContainer}
      >
        <Text style={styles.initials}>{getInitials()}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
    backgroundColor: "transparent",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
