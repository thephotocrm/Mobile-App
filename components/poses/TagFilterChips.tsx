import React from "react";
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PoseTag, POSE_TAGS } from "@/constants/poses";
import * as Haptics from "expo-haptics";

interface TagFilterChipsProps {
  selectedTags: PoseTag[];
  onTagToggle: (tag: PoseTag) => void;
  showGroupLabels?: boolean;
}

export function TagFilterChips({
  selectedTags,
  onTagToggle,
  showGroupLabels = false,
}: TagFilterChipsProps) {
  const { theme, isDark } = useTheme();

  const handleTagPress = (tag: PoseTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTagToggle(tag);
  };

  // Group tags by their group for organized display
  const groupedTags = showGroupLabels
    ? {
        location: POSE_TAGS.filter((t) => t.group === "location"),
        mood: POSE_TAGS.filter((t) => t.group === "mood"),
        technical: POSE_TAGS.filter((t) => t.group === "technical"),
      }
    : null;

  const renderTag = (tag: (typeof POSE_TAGS)[0]) => {
    const isSelected = selectedTags.includes(tag.id);
    return (
      <Pressable
        key={tag.id}
        onPress={() => handleTagPress(tag.id)}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: isSelected
              ? theme.primary
              : isDark
                ? theme.backgroundSecondary
                : "#F0F0F0",
            borderColor: isSelected
              ? theme.primary
              : isDark
                ? theme.border
                : "transparent",
          },
          pressed && styles.chipPressed,
        ]}
      >
        <Feather
          name={tag.icon as keyof typeof Feather.glyphMap}
          size={14}
          color={isSelected ? "#FFFFFF" : theme.textSecondary}
        />
        <ThemedText
          style={[
            styles.chipText,
            { color: isSelected ? "#FFFFFF" : theme.text },
          ]}
        >
          {tag.label}
        </ThemedText>
        {isSelected && (
          <Feather name="check" size={12} color="#FFFFFF" />
        )}
      </Pressable>
    );
  };

  if (showGroupLabels && groupedTags) {
    return (
      <View style={styles.container}>
        {Object.entries(groupedTags).map(([groupName, tags]) => (
          <View key={groupName} style={styles.groupContainer}>
            <ThemedText
              style={[styles.groupLabel, { color: theme.textTertiary }]}
            >
              {groupName.toUpperCase()}
            </ThemedText>
            <View style={styles.tagsRow}>
              {tags.map(renderTag)}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {selectedTags.length > 0 && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            selectedTags.forEach((tag) => onTagToggle(tag));
          }}
          style={({ pressed }) => [
            styles.clearButton,
            { backgroundColor: isDark ? theme.backgroundSecondary : "#F0F0F0" },
            pressed && styles.chipPressed,
          ]}
        >
          <Feather name="x" size={14} color={theme.textSecondary} />
          <ThemedText
            style={[styles.chipText, { color: theme.textSecondary }]}
          >
            Clear
          </ThemedText>
        </Pressable>
      )}
      {POSE_TAGS.map(renderTag)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  scrollContainer: {
    marginHorizontal: -Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  groupContainer: {
    gap: Spacing.xs,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.chip,
    gap: 4,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.chip,
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
