import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeInRight,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  automationsApi,
  stagesApi,
  Automation,
  Stage,
  createTenantContext,
} from "@/services/api";

// Automation colors
const AutomationColors = {
  primary: "#8B4565", // Brand primary (dusty rose)
  primaryLight: "#A78BFA",
  primaryDark: "#6D3550",
  // Background
  screenBg: "#F3F4F6", // Light grey background
  screenBgDark: "#111827", // Dark mode background
  // Card backgrounds
  whiteCard: "#FFFFFF",
  blackCard: "#1a1a1a",
  // Column header
  columnHeaderBg: "#F0E6EB", // Light dusty rose tint
  columnHeaderBgDark: "#2D1F26", // Dark mode column header
  // Status dots
  active: "#22C55E", // Green - active and firing
  paused: "#9CA3AF", // Grey - paused
  delayed: "#F59E0B", // Yellow/Amber - delayed or not firing
  // Badge colors
  timingBadgeBg: "#1F2937",
  timingBadgeText: "#FFFFFF",
  channelBadgeBg: "#F3F4F6",
  channelBadgeText: "#374151",
};

// Project types for tabs
const PROJECT_TYPES = [
  { id: "WEDDING", label: "Wedding" },
  { id: "ENGAGEMENT", label: "Engagement" },
  { id: "PORTRAIT", label: "Portrait" },
  { id: "FAMILY", label: "Family" },
  { id: "EVENT", label: "Event" },
];

// Channel labels for badges
const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  SMART_FILE: "Smart File",
  STAGE_CHANGE: "Pipeline",
};

type NavigationProp = NativeStackNavigationProp<
  ToolsStackParamList,
  "Automations"
>;

// Status dot types
type StatusDotType = "active" | "paused" | "delayed";

// Pulsing status dot component
function StatusDot({
  status,
  isBlackCard,
}: {
  status: StatusDotType;
  isBlackCard?: boolean;
}) {
  const pulseOpacity = useSharedValue(1);

  // Only pulse for active status
  React.useEffect(() => {
    if (status === "active") {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1, // Infinite repeat
        false,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [status, pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: status === "active" ? pulseOpacity.value : 1,
  }));

  const dotColor = {
    active: AutomationColors.active,
    paused: AutomationColors.paused,
    delayed: AutomationColors.delayed,
  }[status];

  return (
    <View style={styles.statusDotContainer}>
      <Animated.View
        style={[styles.statusDot, { backgroundColor: dotColor }, animatedStyle]}
      />
      {/* Glow effect for active */}
      {status === "active" && (
        <Animated.View
          style={[
            styles.statusDotGlow,
            { backgroundColor: dotColor },
            animatedStyle,
          ]}
        />
      )}
    </View>
  );
}

export function AutomationsScreen() {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectType, setSelectedProjectType] = useState("WEDDING");
  const [refreshing, setRefreshing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  // Load data from API
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const tenant = createTenantContext(user);
      const [automationsResult, stagesResult] = await Promise.all([
        automationsApi.getAll(token, tenant, selectedProjectType),
        stagesApi.getAll(token, tenant),
      ]);
      setAutomations(automationsResult);
      // Filter stages by project type if available
      setStages(stagesResult);
    } catch (err) {
      console.error("Failed to load automations:", err);
      setError("Failed to load automations");
      setAutomations([]);
      setStages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user, selectedProjectType]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData]),
  );

  // Handle refresh
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Handle project type change
  const handleProjectTypeChange = (projectType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProjectType(projectType);
    setLoading(true);
  };

  // Toggle automation enabled/disabled
  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const tenant = createTenantContext(user);
      await automationsApi.toggle(token!, id, !currentEnabled, tenant);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !currentEnabled } : a)),
      );
    } catch (err) {
      console.error("Failed to toggle automation:", err);
      Alert.alert("Error", "Failed to update automation");
    }
  };

  // Group automations by stage
  const automationsByStage = useMemo(() => {
    const grouped: Record<string, Automation[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = automations.filter((a) => a.stageId === stage.id);
    });
    // Add "No Stage" group for automations without stageId
    const noStageAutomations = automations.filter((a) => !a.stageId);
    if (noStageAutomations.length > 0) {
      grouped["no-stage"] = noStageAutomations;
    }
    return grouped;
  }, [automations, stages]);

  // All stages including "No Stage" if needed
  const allStages = useMemo(() => {
    const stageList = [...stages];
    if (
      automationsByStage["no-stage"] &&
      automationsByStage["no-stage"].length > 0
    ) {
      stageList.push({
        id: "no-stage",
        name: "No Stage",
        color: theme.textTertiary,
        order: 999,
        projectType: selectedProjectType,
      } as Stage);
    }
    return stageList;
  }, [stages, automationsByStage, theme.textTertiary, selectedProjectType]);

  // Current stage
  const currentStage = allStages[currentStageIndex];
  const currentAutomations = currentStage
    ? automationsByStage[currentStage.id] || []
    : [];

  // Navigation handlers
  const handlePrevStage = () => {
    if (currentStageIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  const handleNextStage = () => {
    if (currentStageIndex < allStages.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  // Reset stage index when stages change
  useMemo(() => {
    if (currentStageIndex >= allStages.length && allStages.length > 0) {
      setCurrentStageIndex(0);
    }
  }, [allStages.length, currentStageIndex]);

  // Check if automation is a pipeline move
  const isPipelineMove = (automation: Automation) =>
    automation.automationType === "STAGE_CHANGE";

  // Get delay text for automation
  const getDelayText = (automation: Automation): string => {
    if (automation.steps && automation.steps.length > 0) {
      const step = automation.steps[0];
      if (step.delayDays && step.delayDays > 0) {
        return `${step.delayDays} day${step.delayDays > 1 ? "s" : ""}`;
      }
      if (step.delayMinutes && step.delayMinutes > 0) {
        const hours = Math.floor(step.delayMinutes / 60);
        const mins = step.delayMinutes % 60;
        if (hours > 0) {
          return `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();
        }
        return `${mins}m`;
      }
    }
    if (automation.daysBefore && automation.daysBefore > 0) {
      return `${automation.daysBefore} day${automation.daysBefore > 1 ? "s" : ""} before`;
    }
    return "Immediate";
  };

  // Get channel icon
  const getChannelIcon = (channel?: string): keyof typeof Feather.glyphMap => {
    switch (channel) {
      case "EMAIL":
        return "mail";
      case "SMS":
        return "smartphone";
      case "SMART_FILE":
        return "file-text";
      default:
        return "zap";
    }
  };

  // Get automation type icon
  const getAutomationIcon = (
    automation: Automation,
  ): keyof typeof Feather.glyphMap => {
    if (automation.automationType === "STAGE_CHANGE") {
      return "git-branch";
    }
    if (automation.automationType === "COUNTDOWN") {
      return "clock";
    }
    return getChannelIcon(automation.channel);
  };

  // Get channel label for badge
  const getChannelLabel = (automation: Automation): string => {
    if (automation.automationType === "STAGE_CHANGE") {
      return CHANNEL_LABELS.STAGE_CHANGE;
    }
    return CHANNEL_LABELS[automation.channel || "EMAIL"] || "Email";
  };

  // Determine automation status for dot color
  const getAutomationStatus = (automation: Automation): StatusDotType => {
    // Paused - explicitly disabled
    if (!automation.enabled) {
      return "paused";
    }
    // Delayed/Not firing - enabled but hasn't run recently or has issues
    // Check if it has run count of 0 and was created more than 7 days ago
    if (automation.runCount === 0) {
      const createdDate = new Date(automation.createdAt);
      const daysSinceCreation =
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        return "delayed";
      }
    }
    // Active - enabled and working
    return "active";
  };

  // Render automation card - Original design with white/black cards
  const renderAutomationCard = (automation: Automation, index: number) => {
    const isBlackCard = isPipelineMove(automation);
    const cardBg = isBlackCard
      ? AutomationColors.blackCard
      : isDark
        ? theme.backgroundCard
        : AutomationColors.whiteCard;
    const textColor = isBlackCard ? "#FFFFFF" : theme.text;
    const secondaryTextColor = isBlackCard
      ? "rgba(255,255,255,0.7)"
      : theme.textSecondary;
    const delayText = getDelayText(automation);
    const channelLabel = getChannelLabel(automation);
    const channelIcon = getAutomationIcon(automation);

    return (
      <Animated.View
        key={automation.id}
        entering={FadeInRight.delay(50 + index * 30).duration(300)}
      >
        <Pressable
          style={({ pressed }) => [
            styles.automationCard,
            {
              backgroundColor: cardBg,
              borderColor: isBlackCard
                ? "transparent"
                : isDark
                  ? theme.border
                  : "#F0F0F0",
              borderWidth: isBlackCard ? 0 : 1,
            },
            Shadows.sm,
            pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate("AutomationDetail", { automation });
          }}
        >
          {/* Card Header: Title + Toggle */}
          <View style={styles.cardHeader}>
            <ThemedText
              style={[styles.cardTitle, { color: textColor, flex: 1 }]}
              numberOfLines={2}
            >
              {automation.name}
            </ThemedText>
            <Pressable
              onPress={() => handleToggle(automation.id, automation.enabled)}
              style={({ pressed }) => [
                styles.toggleButton,
                {
                  backgroundColor: automation.enabled
                    ? isBlackCard
                      ? "rgba(255,255,255,0.15)"
                      : AutomationColors.primary + "15"
                    : isBlackCard
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                },
                pressed && { opacity: 0.7 },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name={automation.enabled ? "zap" : "pause"}
                size={16}
                color={
                  automation.enabled
                    ? isBlackCard
                      ? "#FBBF24"
                      : AutomationColors.primary
                    : isBlackCard
                      ? "rgba(255,255,255,0.5)"
                      : theme.textTertiary
                }
              />
            </Pressable>
          </View>

          {/* Badges Row: Timing + Channel */}
          <View style={styles.badgesRow}>
            {/* Timing Badge (dark background) */}
            <View
              style={[
                styles.timingBadge,
                {
                  backgroundColor: isBlackCard
                    ? "rgba(255,255,255,0.15)"
                    : AutomationColors.timingBadgeBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.timingBadgeText,
                  {
                    color: isBlackCard
                      ? "#FFFFFF"
                      : AutomationColors.timingBadgeText,
                  },
                ]}
              >
                {delayText}
              </Text>
            </View>

            {/* Channel Badge (light background) */}
            <View
              style={[
                styles.channelBadge,
                {
                  backgroundColor: isBlackCard
                    ? "rgba(255,255,255,0.1)"
                    : AutomationColors.channelBadgeBg,
                },
              ]}
            >
              <Feather
                name={channelIcon}
                size={12}
                color={
                  isBlackCard
                    ? "rgba(255,255,255,0.8)"
                    : AutomationColors.channelBadgeText
                }
              />
              <Text
                style={[
                  styles.channelBadgeText,
                  {
                    color: isBlackCard
                      ? "rgba(255,255,255,0.8)"
                      : AutomationColors.channelBadgeText,
                  },
                ]}
              >
                {channelLabel}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={[
              styles.cardDivider,
              {
                backgroundColor: isBlackCard
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          />

          {/* Footer Row: Status Dot + Label + Run Count */}
          <View style={styles.cardFooter}>
            <View style={styles.statusBadge}>
              <StatusDot
                status={getAutomationStatus(automation)}
                isBlackCard={isBlackCard}
              />
              <Text style={[styles.statusText, { color: secondaryTextColor }]}>
                {automation.enabled ? "Active" : "Paused"}
              </Text>
            </View>
            {automation.runCount !== undefined && (
              <View style={styles.runCountBadge}>
                <Feather
                  name="play"
                  size={12}
                  color={
                    isBlackCard ? "rgba(255,255,255,0.6)" : theme.textTertiary
                  }
                />
                <Text
                  style={[styles.runCountText, { color: secondaryTextColor }]}
                >
                  {automation.runCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Render stage indicator dots
  const renderStageDots = () => {
    if (allStages.length <= 1) return null;

    return (
      <View style={styles.stageDotsContainer}>
        {allStages.map((stage, index) => (
          <Pressable
            key={stage.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCurrentStageIndex(index);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <View
              style={[
                styles.stageDot,
                index === currentStageIndex
                  ? { backgroundColor: AutomationColors.primary }
                  : {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.15)",
                    },
              ]}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  // Render navigation arrows (outside the column)
  const renderNavigationArrows = () => {
    if (!currentStage || allStages.length <= 1) return null;

    return (
      <View style={styles.arrowsRow}>
        {/* Left Arrow */}
        <Pressable
          onPress={handlePrevStage}
          disabled={currentStageIndex === 0}
          style={({ pressed }) => [
            styles.arrowButton,
            {
              backgroundColor:
                currentStageIndex === 0
                  ? "transparent"
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.04)",
              borderWidth: currentStageIndex === 0 ? 0 : 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
            },
            pressed && { opacity: 0.5 },
            currentStageIndex === 0 && { opacity: 0.3 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather
            name="chevron-left"
            size={20}
            color={currentStageIndex === 0 ? theme.textTertiary : theme.text}
          />
        </Pressable>

        {/* Stage Indicator Dots */}
        {renderStageDots()}

        {/* Right Arrow */}
        <Pressable
          onPress={handleNextStage}
          disabled={currentStageIndex === allStages.length - 1}
          style={({ pressed }) => [
            styles.arrowButton,
            {
              backgroundColor:
                currentStageIndex === allStages.length - 1
                  ? "transparent"
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.04)",
              borderWidth: currentStageIndex === allStages.length - 1 ? 0 : 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.08)",
            },
            pressed && { opacity: 0.5 },
            currentStageIndex === allStages.length - 1 && { opacity: 0.3 },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={
              currentStageIndex === allStages.length - 1
                ? theme.textTertiary
                : theme.text
            }
          />
        </Pressable>
      </View>
    );
  };

  // Render stage header inside the column container
  const renderStageHeader = () => {
    if (!currentStage) return null;

    return (
      <View style={styles.stageHeaderInColumn}>
        <View style={styles.stageNameRow}>
          <View
            style={[
              styles.stageColorDot,
              { backgroundColor: currentStage.color },
            ]}
          />
          <ThemedText style={[styles.stageName, { color: theme.text }]}>
            {currentStage.name}
          </ThemedText>
        </View>
        <View style={styles.stageCountBadge}>
          <Text style={[styles.stageCountText, { color: theme.textSecondary }]}>
            {currentAutomations.length} Total
          </Text>
        </View>
      </View>
    );
  };

  // NAV_HEADER_HEIGHT accounts for the transparent navigation header
  const NAV_HEADER_HEIGHT = 56;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? AutomationColors.screenBgDark
            : AutomationColors.screenBg,
          paddingTop: insets.top + NAV_HEADER_HEIGHT,
        },
      ]}
    >
      {/* Project Type Tabs */}
      <Animated.View
        entering={FadeInUp.duration(400).easing(Easing.out(Easing.cubic))}
        style={styles.tabsContainer}
      >
        <View style={styles.sectionLabelRow}>
          <Text style={[styles.sectionLabel, { color: theme.textTertiary }]}>
            Project Type
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {PROJECT_TYPES.map((type) => {
            const isSelected = selectedProjectType === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => handleProjectTypeChange(type.id)}
                style={({ pressed }) => [
                  styles.tab,
                  isSelected && [
                    styles.tabSelected,
                    { backgroundColor: AutomationColors.primary },
                  ],
                  pressed && !isSelected && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isSelected ? "#FFFFFF" : theme.textSecondary,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AutomationColors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading automations...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View
            style={[
              styles.errorIcon,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#FEF2F2",
              },
            ]}
          >
            <Feather name="alert-circle" size={24} color="#EF4444" />
          </View>
          <ThemedText style={[styles.errorTitle, { color: theme.text }]}>
            {error}
          </ThemedText>
          <Pressable
            onPress={() => {
              setLoading(true);
              loadData();
            }}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: AutomationColors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : allStages.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View
            style={[
              styles.emptyStateIcon,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F3FF",
              },
            ]}
          >
            <Feather name="zap" size={32} color={AutomationColors.primary} />
          </View>
          <ThemedText style={[styles.emptyStateTitle, { color: theme.text }]}>
            No automations yet
          </ThemedText>
          <ThemedText
            style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}
          >
            Create automations in the desktop app to automate your workflow
          </ThemedText>
        </View>
      ) : (
        <>
          {/* Navigation Arrows (outside container) */}
          {renderNavigationArrows()}

          {/* Column Container with Stage Header + Cards */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.columnOuterPadding,
              { paddingBottom: insets.bottom + Spacing.lg + 80 }, // Extra padding for FAB
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={AutomationColors.primary}
                colors={[AutomationColors.primary]}
              />
            }
          >
            <View
              style={[
                styles.columnContainer,
                {
                  backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
                  borderColor: isDark ? theme.border : "#E5E7EB",
                },
              ]}
            >
              {/* Column Header with Stage Label + Name */}
              <View
                style={[
                  styles.columnHeader,
                  {
                    backgroundColor: isDark
                      ? AutomationColors.columnHeaderBgDark
                      : AutomationColors.columnHeaderBg,
                  },
                ]}
              >
                {/* Stage Label inside container */}
                <View style={styles.stageLabelRow}>
                  <Text
                    style={[styles.sectionLabel, { color: theme.textTertiary }]}
                  >
                    Stage
                  </Text>
                </View>

                {/* Stage Header inside container */}
                {renderStageHeader()}
              </View>

              {/* Automations List */}
              <View style={styles.automationsList}>
                {currentAutomations.length === 0 ? (
                  <View style={styles.emptyColumn}>
                    <Feather
                      name="inbox"
                      size={32}
                      color={theme.textTertiary}
                    />
                    <Text
                      style={[styles.emptyText, { color: theme.textTertiary }]}
                    >
                      No automations in this stage
                    </Text>
                  </View>
                ) : (
                  currentAutomations.map((automation, i) =>
                    renderAutomationCard(automation, i),
                  )
                )}
              </View>
            </View>
          </ScrollView>

          {/* Floating Action Button (FAB) */}
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: AutomationColors.primary,
                bottom: insets.bottom + Spacing.lg,
              },
              pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert("Coming Soon", "Add new automation from desktop app");
            }}
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Project Type Tabs
  tabsContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tabsContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "transparent",
  },
  tabSelected: {
    ...Shadows.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Section Labels
  sectionLabelRow: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Navigation Arrows Row (outside container)
  arrowsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  // Stage Indicator Dots
  stageDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Column Container
  columnOuterPadding: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  columnContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    ...Shadows.sm,
  },
  // Column Header (contains label + stage name)
  columnHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  // Stage Label inside Column
  stageLabelRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  // Stage Header inside Column
  stageHeaderInColumn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  stageNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stageColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  stageName: {
    fontSize: 16,
    fontWeight: "700",
  },
  stageCountBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  stageCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Floating Action Button
  fab: {
    position: "absolute",
    right: Spacing.screenHorizontal,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  // Automations List (inside column container)
  automationsList: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyColumn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  // Automation Card
  automationCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginRight: Spacing.sm,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  timingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  channelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDotContainer: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  statusDotGlow: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.3,
    zIndex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  runCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  runCountText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Loading/Error States
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyStateIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
});
