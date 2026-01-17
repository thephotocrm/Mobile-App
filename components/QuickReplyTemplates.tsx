import React from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface QuickReplyTemplate {
  id: string;
  title: string;
  message: string;
  category: "greeting" | "availability" | "pricing" | "followup" | "booking";
}

const DEFAULT_TEMPLATES: QuickReplyTemplate[] = [
  {
    id: "1",
    title: "Greeting",
    message:
      "Hi! Thanks for reaching out. I'd love to learn more about what you're looking for. What type of session are you interested in?",
    category: "greeting",
  },
  {
    id: "2",
    title: "Availability",
    message:
      "Thanks for your interest! I currently have availability on [DATE]. Would that work for your schedule?",
    category: "availability",
  },
  {
    id: "3",
    title: "Pricing Info",
    message:
      "Great question! My session packages start at $[AMOUNT] and include [DETAILS]. Would you like me to send over my full pricing guide?",
    category: "pricing",
  },
  {
    id: "4",
    title: "Follow Up",
    message:
      "Hi! Just checking in to see if you had any questions about the information I sent over. Let me know if there's anything else I can help with!",
    category: "followup",
  },
  {
    id: "5",
    title: "Booking Confirmation",
    message:
      "You're all booked! I'm so excited for your session on [DATE] at [LOCATION]. I'll send over all the details soon!",
    category: "booking",
  },
  {
    id: "6",
    title: "Gallery Ready",
    message:
      "Your gallery is ready! You can view and download your photos here: [LINK]. Let me know if you have any questions!",
    category: "followup",
  },
];

const getCategoryIcon = (
  category: QuickReplyTemplate["category"],
): keyof typeof Feather.glyphMap => {
  switch (category) {
    case "greeting":
      return "smile";
    case "availability":
      return "calendar";
    case "pricing":
      return "dollar-sign";
    case "followup":
      return "send";
    case "booking":
      return "check-circle";
    default:
      return "message-circle";
  }
};

const getCategoryColor = (category: QuickReplyTemplate["category"]): string => {
  switch (category) {
    case "greeting":
      return "#22C55E";
    case "availability":
      return "#3B82F6";
    case "pricing":
      return "#F59E0B";
    case "followup":
      return "#8B5CF6";
    case "booking":
      return "#EC4899";
    default:
      return "#6B7280";
  }
};

interface QuickReplyTemplatesProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (message: string) => void;
}

export function QuickReplyTemplates({
  visible,
  onClose,
  onSelectTemplate,
}: QuickReplyTemplatesProps) {
  const { theme } = useTheme();

  const handleSelect = (template: QuickReplyTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectTemplate(template.message);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            Quick Replies
          </ThemedText>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close quick replies"
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Templates List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            style={[styles.sectionLabel, { color: theme.textSecondary }]}
          >
            Tap a template to use it
          </ThemedText>

          {DEFAULT_TEMPLATES.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => handleSelect(template)}
              style={({ pressed }) => [
                styles.templateCard,
                {
                  backgroundColor: theme.backgroundCard,
                  borderColor: theme.border,
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${template.title}: ${template.message}`}
            >
              <View style={styles.templateHeader}>
                <View
                  style={[
                    styles.categoryIcon,
                    {
                      backgroundColor: `${getCategoryColor(template.category)}15`,
                    },
                  ]}
                >
                  <Feather
                    name={getCategoryIcon(template.category)}
                    size={16}
                    color={getCategoryColor(template.category)}
                  />
                </View>
                <ThemedText
                  style={[styles.templateTitle, { color: theme.text }]}
                >
                  {template.title}
                </ThemedText>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
              <ThemedText
                style={[styles.templateMessage, { color: theme.textSecondary }]}
                numberOfLines={2}
              >
                {template.message}
              </ThemedText>
            </Pressable>
          ))}

          <View style={styles.tipContainer}>
            <Feather name="info" size={14} color={theme.textSecondary} />
            <ThemedText
              style={[styles.tipText, { color: theme.textSecondary }]}
            >
              Replace [BRACKETS] with your specific details before sending
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  templateCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  templateTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  templateMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
