import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  automationsApi,
  Automation,
  createTenantContext,
} from "@/services/api";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";

type AutomationDetailRouteProp = RouteProp<
  ToolsStackParamList,
  "AutomationDetail"
>;

// Colors
const DetailColors = {
  primary: "#8B4565",
  active: "#22C55E",
  inactive: "#9CA3AF",
  emailBg: "#DBEAFE",
  emailText: "#1E40AF",
  smsBg: "#D1FAE5",
  smsText: "#065F46",
  pipelineBg: "#EDE9FE",
  pipelineText: "#5B21B6",
  timingBg: "#F0F9FF",
  timingText: "#0369A1",
};

export function AutomationDetailScreen() {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const route = useRoute<AutomationDetailRouteProp>();
  const { automation: initialAutomation } = route.params;

  const [automation, setAutomation] = useState<Automation>(initialAutomation);
  const [toggling, setToggling] = useState(false);

  // Toggle automation enabled/disabled
  const handleToggle = async (newValue: boolean) => {
    try {
      setToggling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const tenant = createTenantContext(user);
      await automationsApi.toggle(token!, automation.id, newValue, tenant);
      setAutomation((prev) => ({ ...prev, enabled: newValue }));
    } catch (err) {
      console.error("Failed to toggle automation:", err);
      Alert.alert("Error", "Failed to update automation");
    } finally {
      setToggling(false);
    }
  };

  // Get trigger description
  const getTriggerInfo = (): {
    icon: string;
    title: string;
    description: string;
  } => {
    if (automation.automationType === "STAGE_CHANGE") {
      return {
        icon: "git-branch",
        title: "Pipeline Move",
        description: "Moves client to another stage",
      };
    }
    if (automation.automationType === "COUNTDOWN") {
      const timing = automation.daysBefore
        ? `${automation.daysBefore} day${automation.daysBefore > 1 ? "s" : ""} before`
        : "On event date";
      return {
        icon: "clock",
        title: "Date-Based Trigger",
        description: timing,
      };
    }
    // COMMUNICATION type - stage entry trigger
    return {
      icon: "zap",
      title: "Stage Entry",
      description: "When client enters this stage",
    };
  };

  // Get action info
  const getActionInfo = (): {
    icon: string;
    title: string;
    color: string;
    bg: string;
  } => {
    const channel = automation.channel || "EMAIL";
    if (automation.automationType === "STAGE_CHANGE") {
      return {
        icon: "git-branch",
        title: "Move in Pipeline",
        color: DetailColors.pipelineText,
        bg: DetailColors.pipelineBg,
      };
    }
    if (channel === "SMS") {
      return {
        icon: "smartphone",
        title: "Send SMS",
        color: DetailColors.smsText,
        bg: DetailColors.smsBg,
      };
    }
    return {
      icon: "mail",
      title: "Send Email",
      color: DetailColors.emailText,
      bg: DetailColors.emailBg,
    };
  };

  // Get timing text for first step
  const getTimingText = (): string => {
    if (automation.steps && automation.steps.length > 0) {
      const step = automation.steps[0];
      if (step.delayDays && step.delayDays > 0) {
        return `${step.delayDays} day${step.delayDays > 1 ? "s" : ""} after trigger`;
      }
      if (step.delayMinutes && step.delayMinutes > 0) {
        const hours = Math.floor(step.delayMinutes / 60);
        const mins = step.delayMinutes % 60;
        if (hours > 0) {
          return `${hours}h ${mins > 0 ? `${mins}m` : ""} after trigger`.trim();
        }
        return `${mins} minutes after trigger`;
      }
    }
    return "Immediately";
  };

  // Get message preview content
  const getMessagePreview = (): {
    subject?: string;
    body?: string;
    sms?: string;
  } => {
    // Check for SMS content in steps
    if (
      automation.channel === "SMS" ||
      automation.automationType === "COMMUNICATION"
    ) {
      const smsStep = automation.steps?.find(
        (s) => s.actionType === "SMS" && s.customSmsContent,
      );
      if (smsStep?.customSmsContent) {
        return { sms: smsStep.customSmsContent };
      }
    }

    // Email content
    if (automation.emailSubject || automation.templateBody) {
      return {
        subject: automation.emailSubject,
        body: automation.templateBody,
      };
    }

    // Description as fallback
    if (automation.description) {
      return { body: automation.description };
    }

    return {};
  };

  // Strip HTML tags for preview
  const stripHtml = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const triggerInfo = getTriggerInfo();
  const actionInfo = getActionInfo();
  const messagePreview = getMessagePreview();

  // Account for transparent navigation header
  const NAV_HEADER_HEIGHT = 56;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + NAV_HEADER_HEIGHT,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        {/* Name & Status Section */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
              borderColor: isDark ? theme.border : "#E5E7EB",
            },
          ]}
        >
          <View style={styles.nameRow}>
            <ThemedText style={[styles.automationName, { color: theme.text }]}>
              {automation.name}
            </ThemedText>
          </View>

          {automation.description && (
            <ThemedText
              style={[styles.description, { color: theme.textSecondary }]}
              numberOfLines={3}
            >
              {automation.description}
            </ThemedText>
          )}

          {/* Enable Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: automation.enabled
                      ? DetailColors.active
                      : DetailColors.inactive,
                  },
                ]}
              />
              <Text style={[styles.toggleLabel, { color: theme.text }]}>
                {automation.enabled ? "Active" : "Paused"}
              </Text>
            </View>
            <Switch
              value={automation.enabled}
              onValueChange={handleToggle}
              disabled={toggling}
              trackColor={{
                false: isDark ? "#374151" : "#D1D5DB",
                true: DetailColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Trigger Section */}
        <View style={styles.sectionLabel}>
          <Text
            style={[styles.sectionLabelText, { color: theme.textTertiary }]}
          >
            TRIGGER
          </Text>
        </View>
        <View
          style={[
            styles.section,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
              borderColor: isDark ? theme.border : "#E5E7EB",
            },
          ]}
        >
          <View style={styles.infoRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: DetailColors.timingBg },
              ]}
            >
              <Feather
                name={triggerInfo.icon as any}
                size={18}
                color={DetailColors.timingText}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>
                {triggerInfo.title}
              </Text>
              <Text
                style={[styles.infoDescription, { color: theme.textSecondary }]}
              >
                {triggerInfo.description}
              </Text>
            </View>
          </View>

          {/* Timing */}
          <View
            style={[
              styles.timingRow,
              { borderTopColor: isDark ? theme.border : "#F3F4F6" },
            ]}
          >
            <Feather name="clock" size={14} color={theme.textTertiary} />
            <Text style={[styles.timingText, { color: theme.textSecondary }]}>
              {getTimingText()}
            </Text>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.sectionLabel}>
          <Text
            style={[styles.sectionLabelText, { color: theme.textTertiary }]}
          >
            ACTION
          </Text>
        </View>
        <View
          style={[
            styles.section,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
              borderColor: isDark ? theme.border : "#E5E7EB",
            },
          ]}
        >
          <View style={styles.infoRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDark
                    ? actionInfo.color + "20"
                    : actionInfo.bg,
                },
              ]}
            >
              <Feather
                name={actionInfo.icon as any}
                size={18}
                color={actionInfo.color}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>
                {actionInfo.title}
              </Text>
            </View>
          </View>
        </View>

        {/* Message Preview Section */}
        {(messagePreview.subject ||
          messagePreview.body ||
          messagePreview.sms) && (
          <>
            <View style={styles.sectionLabel}>
              <Text
                style={[styles.sectionLabelText, { color: theme.textTertiary }]}
              >
                MESSAGE PREVIEW
              </Text>
            </View>
            <View
              style={[
                styles.section,
                {
                  backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
                  borderColor: isDark ? theme.border : "#E5E7EB",
                },
              ]}
            >
              {/* Email Preview */}
              {messagePreview.subject && (
                <View style={styles.emailPreview}>
                  <View style={styles.subjectRow}>
                    <Text
                      style={[
                        styles.subjectLabel,
                        { color: theme.textTertiary },
                      ]}
                    >
                      Subject
                    </Text>
                    <Text
                      style={[styles.subjectText, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {messagePreview.subject}
                    </Text>
                  </View>
                </View>
              )}

              {messagePreview.body && (
                <View
                  style={[
                    styles.bodyPreview,
                    messagePreview.subject && {
                      borderTopWidth: 1,
                      borderTopColor: isDark ? theme.border : "#F3F4F6",
                      paddingTop: Spacing.md,
                      marginTop: Spacing.md,
                    },
                  ]}
                >
                  <Text
                    style={[styles.bodyLabel, { color: theme.textTertiary }]}
                  >
                    Body
                  </Text>
                  <Text
                    style={[styles.bodyText, { color: theme.textSecondary }]}
                    numberOfLines={6}
                  >
                    {stripHtml(messagePreview.body)}
                  </Text>
                </View>
              )}

              {/* SMS Preview */}
              {messagePreview.sms && (
                <View style={styles.smsPreview}>
                  <View
                    style={[
                      styles.smsBubble,
                      {
                        backgroundColor: isDark
                          ? DetailColors.smsText + "15"
                          : DetailColors.smsBg,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.smsText, { color: theme.text }]}
                      numberOfLines={8}
                    >
                      {messagePreview.sms}
                    </Text>
                  </View>
                  <Text
                    style={[styles.smsCharCount, { color: theme.textTertiary }]}
                  >
                    {messagePreview.sms.length}/320 characters
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Stats Section */}
        <View style={styles.sectionLabel}>
          <Text
            style={[styles.sectionLabelText, { color: theme.textTertiary }]}
          >
            STATS
          </Text>
        </View>
        <View
          style={[
            styles.section,
            {
              backgroundColor: isDark ? theme.backgroundCard : "#FFFFFF",
              borderColor: isDark ? theme.border : "#E5E7EB",
            },
          ]}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="play" size={16} color={theme.textTertiary} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {automation.runCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>
                runs
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                { backgroundColor: isDark ? theme.border : "#E5E7EB" },
              ]}
            />

            <View style={styles.statItem}>
              <Feather name="calendar" size={16} color={theme.textTertiary} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {new Date(automation.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textTertiary }]}>
                created
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Notice */}
        <View style={styles.editNotice}>
          <Feather name="info" size={14} color={theme.textTertiary} />
          <Text style={[styles.editNoticeText, { color: theme.textTertiary }]}>
            To edit message content, use the desktop app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  // Sections
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Name & Status
  nameRow: {
    marginBottom: Spacing.xs,
  },
  automationName: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  // Info Rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  timingText: {
    fontSize: 13,
  },
  // Email Preview
  emailPreview: {},
  subjectRow: {
    gap: 4,
  },
  subjectLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  bodyPreview: {},
  bodyLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // SMS Preview
  smsPreview: {
    gap: Spacing.sm,
  },
  smsBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  smsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  smsCharCount: {
    fontSize: 12,
    textAlign: "right",
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 13,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  // Edit Notice
  editNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  editNoticeText: {
    fontSize: 13,
  },
});
