import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { Card } from "./Card";
import { Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";

interface StatCardProps {
  value: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

export function StatCard({ value, label, icon, color }: StatCardProps) {
  const { theme } = useTheme();
  
  return (
    <Card elevation={1} style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Feather name={icon} size={20} color="#FFFFFF" />
      </View>
      <ThemedText style={[Typography.h3, { color: theme.text, marginTop: Spacing.md }]}>
        {value}
      </ThemedText>
      <ThemedText style={[Typography.bodySmall, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
