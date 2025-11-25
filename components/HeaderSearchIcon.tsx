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
    <Pressable onPress={onPress} style={styles.container}>
      <Feather name="search" size={22} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 8,
    padding: 4,
  },
});
