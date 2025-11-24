import React from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

const TOOLS: ToolItem[] = [
  {
    id: "1",
    title: "Email Templates",
    description: "Manage and send professional email templates",
    icon: "mail",
    color: "#3B82F6",
  },
  {
    id: "2",
    title: "Contracts",
    description: "Create and manage client contracts",
    icon: "file-text",
    color: "#10B981",
  },
  {
    id: "3",
    title: "Invoices",
    description: "Send and track invoices and payments",
    icon: "credit-card",
    color: "#F59E0B",
  },
  {
    id: "4",
    title: "Questionnaires",
    description: "Collect client information with custom forms",
    icon: "clipboard",
    color: "#8B5CF6",
  },
  {
    id: "5",
    title: "Gallery",
    description: "Share photo galleries with clients",
    icon: "image",
    color: "#EC4899",
  },
  {
    id: "6",
    title: "Reports",
    description: "View business analytics and insights",
    icon: "bar-chart-2",
    color: "#06B6D4",
  },
  {
    id: "7",
    title: "Workflows",
    description: "Automate your business processes",
    icon: "git-branch",
    color: "#F97316",
  },
  {
    id: "8",
    title: "Integrations",
    description: "Connect with other apps and services",
    icon: "link",
    color: "#6366F1",
  },
];

export function ToolsScreen() {
  const { theme } = useTheme();
  
  const handleToolPress = (tool: ToolItem) => {
    Alert.alert(tool.title, `Open ${tool.title.toLowerCase()} tool`);
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <View style={styles.toolsGrid}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              style={({ pressed }) => [
                styles.toolCardWrapper,
                pressed && styles.toolCardPressed,
              ]}
              onPress={() => handleToolPress(tool)}
            >
              <Card style={styles.toolCard} elevation={1}>
                <View
                  style={[styles.iconContainer, { backgroundColor: tool.color }]}
                >
                  <Feather name={tool.icon} size={24} color="#FFFFFF" />
                </View>
                <ThemedText style={[Typography.body, { color: theme.text, fontWeight: "600", textAlign: "center" }]}>{tool.title}</ThemedText>
                <ThemedText style={[Typography.caption, { color: theme.textSecondary, textAlign: "center", lineHeight: 16 }]}>
                  {tool.description}
                </ThemedText>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  toolCardWrapper: {
    width: "48%",
    marginBottom: Spacing.md,
  },
  toolCard: {
    alignItems: "center",
  },
  toolCardPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
});
