import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface StatCardProps {
  value: string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ThemedText style={[styles.value, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minWidth: "47%",
    marginBottom: Spacing.md,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
});
