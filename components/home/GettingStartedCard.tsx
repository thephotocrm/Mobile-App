import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, FadeOutUp, Easing } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const STORAGE_KEY = "@thePhotocrm:gettingStartedDismissed";
const CHECKLIST_STORAGE_KEY = "@thePhotocrm:gettingStartedChecklist";

interface ChecklistItem {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  screen: string;
  completed: boolean;
  tip?: string;
  videoUrl?: string;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: "contact",
    label: "Create your first contact",
    icon: "user-plus",
    screen: "AddContact",
    completed: false,
    tip: "Contacts help you track client info and communication",
    videoUrl: "https://youtube.com/@thephotocrm/tutorial-contacts",
  },
  {
    id: "project",
    label: "Add a project",
    icon: "folder-plus",
    screen: "AddProject",
    completed: false,
    tip: "Projects organize your shoots from inquiry to delivery",
    videoUrl: "https://youtube.com/@thephotocrm/tutorial-projects",
  },
  {
    id: "calendar",
    label: "Check your calendar",
    icon: "calendar",
    screen: "Calendar",
    completed: false,
    tip: "See all your shoots and deadlines in one place",
    videoUrl: "https://youtube.com/@thephotocrm/tutorial-calendar",
  },
  {
    id: "inbox",
    label: "Set up your inbox",
    icon: "inbox",
    screen: "InboxTab",
    completed: false,
    tip: "Manage all client conversations centrally",
    videoUrl: "https://youtube.com/@thephotocrm/tutorial-inbox",
  },
];

interface GettingStartedCardProps {
  onDismiss?: () => void;
}

export function GettingStartedCard({ onDismiss }: GettingStartedCardProps) {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [checklist, setChecklist] =
    useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [isDismissed, setIsDismissed] = useState(false);

  // Load saved state
  useEffect(() => {
    const loadState = async () => {
      try {
        const [dismissedStr, checklistStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(CHECKLIST_STORAGE_KEY),
        ]);

        if (dismissedStr === "true") {
          setIsDismissed(true);
        }

        if (checklistStr) {
          const savedChecklist = JSON.parse(checklistStr) as ChecklistItem[];
          setChecklist(savedChecklist);
        }
      } catch (error) {
        console.error("Error loading getting started state:", error);
      }
    };
    loadState();
  }, []);

  // Save checklist state
  const saveChecklist = async (newChecklist: ChecklistItem[]) => {
    try {
      await AsyncStorage.setItem(
        CHECKLIST_STORAGE_KEY,
        JSON.stringify(newChecklist),
      );
    } catch (error) {
      console.error("Error saving checklist state:", error);
    }
  };

  const handleItemPress = (item: ChecklistItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark as completed
    const newChecklist = checklist.map((c) =>
      c.id === item.id ? { ...c, completed: true } : c,
    );
    setChecklist(newChecklist);
    saveChecklist(newChecklist);

    // Navigate to the relevant screen
    const nav = navigation as any;
    if (item.screen === "AddContact" || item.screen === "AddProject") {
      nav.getParent()?.navigate(item.screen);
    } else if (item.screen === "Calendar") {
      nav.navigate("ToolsTab", { screen: "Calendar" });
    } else if (item.screen === "InboxTab") {
      nav.navigate("InboxTab");
    }
  };

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, "true");
      setIsDismissed(true);
      onDismiss?.();
    } catch (error) {
      console.error("Error dismissing getting started:", error);
    }
  };

  if (isDismissed) {
    return null;
  }

  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const gradientColors = isDark
    ? (["rgba(124, 58, 237, 0.15)", "rgba(124, 58, 237, 0.05)"] as [
        string,
        string,
      ])
    : (["#F5F3FF", "#EDE9FE"] as [string, string]);

  return (
    <Animated.View
      entering={FadeInUp.delay(100)
        .duration(400)
        .easing(Easing.out(Easing.cubic))}
      exiting={FadeOutUp.duration(300)}
      style={styles.container}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          isDark && { borderWidth: 1, borderColor: theme.border },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: BlysColors.primary },
              ]}
            >
              <Feather name="zap" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <ThemedText
                style={[
                  styles.title,
                  { color: isDark ? theme.text : "#1F2937" },
                ]}
              >
                {"Let's get your business rolling"}
              </ThemedText>
              <Text
                style={[
                  styles.progress,
                  { color: isDark ? theme.textSecondary : "#6B7280" },
                ]}
              >
                {completedCount}/{totalCount} complete
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.dismissButton,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name="x"
              size={18}
              color={isDark ? theme.textSecondary : "#6B7280"}
            />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View
          style={[
            styles.progressBarBg,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(124, 58, 237, 0.1)",
            },
          ]}
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: BlysColors.primary,
              },
            ]}
          />
        </View>

        {/* Checklist */}
        <View style={styles.checklist}>
          {checklist.map((item, index) => {
            const handleVideoPress = () => {
              if (item.videoUrl) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Linking.openURL(item.videoUrl);
              }
            };

            return (
              <View
                key={item.id}
                style={[
                  styles.checklistItemContainer,
                  index < checklist.length - 1 && styles.checklistItemBorder,
                  index < checklist.length - 1 && {
                    borderBottomColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(124, 58, 237, 0.1)",
                  },
                ]}
              >
                <Pressable
                  onPress={() => handleItemPress(item)}
                  delayPressIn={50}
                  style={({ pressed }) => [
                    styles.checklistItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      item.completed && styles.checkboxCompleted,
                      {
                        borderColor: item.completed
                          ? "#22C55E"
                          : isDark
                            ? theme.textTertiary
                            : "#9CA3AF",
                        backgroundColor: item.completed
                          ? "#22C55E"
                          : "transparent",
                      },
                    ]}
                  >
                    {item.completed && (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.checklistContent}>
                    <Text
                      style={[
                        styles.checklistLabel,
                        {
                          color: item.completed
                            ? isDark
                              ? theme.textTertiary
                              : "#9CA3AF"
                            : isDark
                              ? theme.text
                              : "#374151",
                          textDecorationLine: item.completed
                            ? "line-through"
                            : "none",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {!item.completed && item.tip && (
                      <Text
                        style={[
                          styles.checklistTip,
                          { color: isDark ? theme.textTertiary : "#6B7280" },
                        ]}
                        numberOfLines={1}
                      >
                        {item.tip}
                      </Text>
                    )}
                  </View>
                  {!item.completed && (
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={isDark ? theme.textTertiary : "#9CA3AF"}
                    />
                  )}
                </Pressable>
                {!item.completed && item.videoUrl && (
                  <Pressable
                    onPress={handleVideoPress}
                    style={({ pressed }) => [
                      styles.videoButton,
                      {
                        backgroundColor: isDark
                          ? "rgba(124, 58, 237, 0.15)"
                          : "rgba(124, 58, 237, 0.1)",
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name="play-circle"
                      size={14}
                      color={BlysColors.primary}
                    />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// Hook to check if getting started should be shown
export function useGettingStartedVisible(): [boolean, () => void] {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(STORAGE_KEY);
        setIsVisible(dismissed !== "true");
      } catch {
        setIsVisible(true);
      }
    };
    checkVisibility();
  }, []);

  const hide = () => setIsVisible(false);

  return [isVisible, hide];
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  progress: {
    fontSize: 12,
    marginTop: 2,
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  checklist: {
    gap: 0,
  },
  checklistItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  checklistItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  checklistItemBorder: {
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    borderWidth: 0,
  },
  checklistContent: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  checklistTip: {
    fontSize: 11,
    marginTop: 2,
  },
  videoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
});
