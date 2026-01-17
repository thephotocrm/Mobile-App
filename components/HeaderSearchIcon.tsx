import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface HeaderSearchIconProps {
  onPress?: () => void;
}

export function HeaderSearchIcon({ onPress }: HeaderSearchIconProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      android_ripple={{ color: "transparent" }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="search" size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 10,
    backgroundColor: "transparent",
  },
});
