import React from "react";
import { ScrollView, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { POSE_CATEGORIES, PoseCategory } from "@/constants/poses";

interface CategoryTabsProps {
  selectedCategory: PoseCategory;
  onSelectCategory: (category: PoseCategory) => void;
}

export function CategoryTabs({
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {POSE_CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <Pressable
            key={category.id}
            style={[
              styles.tab,
              {
                backgroundColor: isSelected
                  ? theme.primary
                  : theme.backgroundSecondary,
                borderColor: isSelected ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onSelectCategory(category.id)}
          >
            <Feather
              name={category.icon as keyof typeof Feather.glyphMap}
              size={16}
              color={isSelected ? "#FFFFFF" : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.tabText,
                {
                  color: isSelected ? "#FFFFFF" : theme.text,
                },
              ]}
            >
              {category.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.chip,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  tabText: {
    ...Typography.label,
  },
});
