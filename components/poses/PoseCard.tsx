import React, { useState } from "react";
import {
  View,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography, Shadows } from "@/constants/theme";
import { Pose, POSE_TAGS } from "@/constants/poses";

interface PoseCardProps {
  pose: Pose;
  onPress: () => void;
  onFavoriteToggle?: () => void;
  showTags?: boolean;
}

export function PoseCard({ pose, onPress, onFavoriteToggle, showTags = true }: PoseCardProps) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Get tag labels for display (limit to 3)
  const displayTags = pose.tags?.slice(0, 3).map((tagId) => {
    const tagInfo = POSE_TAGS.find((t) => t.id === tagId);
    return tagInfo?.label || tagId;
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundCard,
          ...(isDark ? Shadows.dark.sm : Shadows.sm),
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        {loading && (
          <View
            style={[
              styles.loadingOverlay,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        )}
        {error ? (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="image" size={32} color={theme.textSecondary} />
          </View>
        ) : (
          <Image
            source={{ uri: pose.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
        {pose.isFavorite && (
          <View style={styles.favoriteIndicator}>
            <Feather name="heart" size={12} color="#FFFFFF" />
          </View>
        )}
        {!pose.isBuiltIn && (
          <View
            style={[styles.customBadge, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={styles.customBadgeText}>Custom</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.contentContainer}>
        {pose.title && (
          <ThemedText
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
          >
            {pose.title}
          </ThemedText>
        )}
        {showTags && displayTags && displayTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {displayTags.map((tag, index) => (
              <View
                key={index}
                style={[
                  styles.tagChip,
                  { backgroundColor: isDark ? theme.backgroundSecondary : "#F0F0F0" },
                ]}
              >
                <ThemedText style={[styles.tagText, { color: theme.textTertiary }]}>
                  {tag}
                </ThemedText>
              </View>
            ))}
            {pose.tags && pose.tags.length > 3 && (
              <ThemedText style={[styles.moreTagsText, { color: theme.textTertiary }]}>
                +{pose.tags.length - 3}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteIndicator: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: "#EC4899",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  customBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  customBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  contentContainer: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  title: {
    ...Typography.label,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 9,
    fontWeight: "500",
    marginLeft: 2,
  },
});
