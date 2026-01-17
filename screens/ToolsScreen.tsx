import React from "react";
import { View, StyleSheet, Pressable, Alert, Switch } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  available: boolean;
}

const TOOLS: ToolItem[] = [
  {
    id: "calendar",
    title: "Calendar",
    description: "View and manage your schedule",
    icon: "calendar",
    color: "#C92667",
    available: true,
  },
  {
    id: "contacts",
    title: "Contacts",
    description: "Manage all your client contacts",
    icon: "users",
    color: "#8B4565",
    available: true,
  },
  {
    id: "automations",
    title: "Automations",
    description: "Manage your automated workflows",
    icon: "zap",
    color: "#8B5CF6",
    available: true,
  },
  {
    id: "1",
    title: "Email Templates",
    description: "Manage and send professional email templates",
    icon: "mail",
    color: "#3B82F6",
    available: false,
  },
  {
    id: "2",
    title: "Contracts",
    description: "Create and manage client contracts",
    icon: "file-text",
    color: "#10B981",
    available: false,
  },
  {
    id: "3",
    title: "Invoices",
    description: "Send and track invoices and payments",
    icon: "credit-card",
    color: "#F59E0B",
    available: false,
  },
  {
    id: "4",
    title: "Questionnaires",
    description: "Collect client information with custom forms",
    icon: "clipboard",
    color: "#8B5CF6",
    available: false,
  },
  {
    id: "5",
    title: "Gallery",
    description: "Share photo galleries with clients",
    icon: "image",
    color: "#EC4899",
    available: false,
  },
  {
    id: "6",
    title: "Reports",
    description: "View business analytics and insights",
    icon: "bar-chart-2",
    color: "#06B6D4",
    available: false,
  },
  {
    id: "7",
    title: "Workflows",
    description: "Automate your business processes",
    icon: "git-branch",
    color: "#F97316",
    available: false,
  },
  {
    id: "8",
    title: "Integrations",
    description: "Connect with other apps and services",
    icon: "link",
    color: "#6366F1",
    available: false,
  },
];

type ToolsScreenNavigationProp = NativeStackNavigationProp<
  ToolsStackParamList,
  "Tools"
>;

export function ToolsScreen() {
  const { theme, isDark, setMode } = useTheme();
  const navigation = useNavigation<ToolsScreenNavigationProp>();

  const handleToolPress = (tool: ToolItem) => {
    if (tool.available) {
      if (tool.id === "calendar") {
        navigation.navigate("Calendar");
      } else if (tool.id === "contacts") {
        navigation.navigate("Contacts");
      } else if (tool.id === "automations") {
        navigation.navigate("Automations");
      }
    }
  };

  const handleThemeToggle = (value: boolean) => {
    setMode(value ? "dark" : "light");
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
                pressed && tool.available && styles.toolCardPressed,
              ]}
              onPress={() => handleToolPress(tool)}
              disabled={!tool.available}
            >
              <Card
                style={[
                  styles.toolCard,
                  !tool.available && styles.toolCardDisabled,
                ]}
                elevation={tool.available ? 1 : 0}
              >
                {!tool.available && (
                  <View style={styles.comingSoonBadge}>
                    <ThemedText style={styles.comingSoonText}>
                      Coming Soon
                    </ThemedText>
                  </View>
                )}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: tool.available
                        ? tool.color
                        : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={tool.icon}
                    size={24}
                    color={tool.available ? "#FFFFFF" : theme.textSecondary}
                  />
                </View>
                <ThemedText
                  style={[
                    Typography.body,
                    {
                      color: tool.available ? theme.text : theme.textSecondary,
                      fontWeight: "600",
                      textAlign: "center",
                    },
                  ]}
                >
                  {tool.title}
                </ThemedText>
                <ThemedText
                  style={[
                    Typography.caption,
                    {
                      color: theme.textSecondary,
                      textAlign: "center",
                      lineHeight: 16,
                      opacity: tool.available ? 1 : 0.7,
                    },
                  ]}
                >
                  {tool.description}
                </ThemedText>
              </Card>
            </Pressable>
          ))}
        </View>

        <View style={styles.settingsSection}>
          <ThemedText
            style={[
              Typography.h4,
              { color: theme.text, marginBottom: Spacing.md },
            ]}
          >
            Settings
          </ThemedText>
          <View
            style={[
              styles.settingRow,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: theme.backgroundTertiary },
                ]}
              >
                <Feather
                  name={isDark ? "moon" : "sun"}
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View>
                <ThemedText
                  style={[
                    Typography.body,
                    { color: theme.text, fontWeight: "500" },
                  ]}
                >
                  Dark Mode
                </ThemedText>
                <ThemedText
                  style={[Typography.caption, { color: theme.textSecondary }]}
                >
                  {isDark
                    ? "Currently using dark theme"
                    : "Currently using light theme"}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
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
    position: "relative",
    overflow: "hidden",
  },
  toolCardPressed: {
    opacity: 0.7,
  },
  toolCardDisabled: {
    opacity: 0.6,
  },
  comingSoonBadge: {
    position: "absolute",
    top: 8,
    right: -24,
    backgroundColor: "#6B7280",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 2,
    transform: [{ rotate: "45deg" }],
    zIndex: 1,
  },
  comingSoonText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  settingsSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
