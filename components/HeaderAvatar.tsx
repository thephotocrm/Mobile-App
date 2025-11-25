import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/useTheme";

interface HeaderAvatarProps {
  onPress?: () => void;
}

export function HeaderAvatar({ onPress }: HeaderAvatarProps) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.avatarContainer, { borderColor: theme.border }]}>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" }}
          style={styles.avatar}
          contentFit="cover"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 8,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
});
