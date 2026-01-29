import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";
import { CategoryTabs } from "@/components/poses/CategoryTabs";
import { PoseCard } from "@/components/poses/PoseCard";
import {
  Pose,
  PoseCategory,
  PoseTag,
  BUILT_IN_POSES,
  getPosesByCategory,
} from "@/constants/poses";
import { TagFilterChips } from "@/components/poses/TagFilterChips";
import { posesApi, createTenantContext } from "@/services/api";

type PoseGalleryScreenNavigationProp = NativeStackNavigationProp<
  ToolsStackParamList,
  "PoseGallery"
>;

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 2;
const GRID_SPACING = Spacing.sm;
const CARD_WIDTH =
  (SCREEN_WIDTH - Spacing.md * 2 - GRID_SPACING * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export function PoseGalleryScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<PoseGalleryScreenNavigationProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop } = useScreenInsets();

  const [selectedCategory, setSelectedCategory] = useState<PoseCategory>("all");
  const [selectedTags, setSelectedTags] = useState<PoseTag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [customPoses, setCustomPoses] = useState<Pose[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites and custom poses from API
  const loadPosesData = useCallback(async () => {
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    const tenant = createTenantContext(user);

    try {
      // Load favorites and custom poses in parallel
      const [favoritesResponse, customPosesResponse] = await Promise.all([
        posesApi.getFavorites(token, tenant).catch(() => ({ favorites: [] })),
        posesApi.getCustomPoses(token, tenant).catch(() => ({ poses: [] })),
      ]);

      // Update favorites
      setFavorites(new Set(favoritesResponse.favorites));

      // Convert custom poses to Pose format
      const convertedCustomPoses: Pose[] = customPosesResponse.poses.map(
        (customPose) => ({
          id: customPose.id,
          imageUrl: customPose.imageUrl,
          category: customPose.category,
          tags: customPose.tags,
          title: customPose.title,
          notes: customPose.notes,
          isBuiltIn: false,
          isFavorite: favoritesResponse.favorites.includes(customPose.id),
          createdAt: customPose.createdAt,
        }),
      );

      setCustomPoses(convertedCustomPoses);
    } catch (error) {
      if (__DEV__) {
        console.log("[PoseGallery] Error loading poses data:", error);
      }
      // Silently fail - user can still view built-in poses
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  // Load data on mount
  useEffect(() => {
    loadPosesData();
  }, [loadPosesData]);

  // Reload data when screen comes into focus (e.g., after adding a new pose)
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadPosesData();
      }
    }, [loadPosesData, isLoading]),
  );

  // Combine built-in and custom poses
  const allPoses = useMemo(() => {
    const posesWithFavorites = [...BUILT_IN_POSES, ...customPoses].map(
      (pose) => ({
        ...pose,
        isFavorite: favorites.has(pose.id),
      }),
    );
    return posesWithFavorites;
  }, [customPoses, favorites]);

  // Filter poses by category, tags, and search
  const filteredPoses = useMemo(() => {
    let result = getPosesByCategory(allPoses, selectedCategory);

    // Filter by selected tags (intersection - pose must have ALL selected tags)
    if (selectedTags.length > 0) {
      result = result.filter((pose) => {
        if (!pose.tags || pose.tags.length === 0) return false;
        return selectedTags.every((tag) => pose.tags?.includes(tag));
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pose) =>
          pose.title?.toLowerCase().includes(query) ||
          pose.notes?.toLowerCase().includes(query) ||
          pose.category.toLowerCase().includes(query) ||
          pose.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [allPoses, selectedCategory, selectedTags, searchQuery]);

  const handleTagToggle = (tag: PoseTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosesData();
    setRefreshing(false);
  }, [loadPosesData]);

  const handlePosePress = (pose: Pose) => {
    navigation.navigate("PoseDetail", {
      poseId: pose.id,
      poses: filteredPoses,
    });
  };

  const handleFavoriteToggle = async (poseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(poseId)) {
        newFavorites.delete(poseId);
      } else {
        newFavorites.add(poseId);
      }
      return newFavorites;
    });

    // Sync with API if authenticated
    if (token && user) {
      const tenant = createTenantContext(user);
      try {
        await posesApi.toggleFavorite(token, poseId, tenant);
      } catch (error) {
        if (__DEV__) {
          console.log("[PoseGallery] Error toggling favorite:", error);
        }
        // Revert optimistic update on error
        setFavorites((prev) => {
          const newFavorites = new Set(prev);
          if (newFavorites.has(poseId)) {
            newFavorites.delete(poseId);
          } else {
            newFavorites.add(poseId);
          }
          return newFavorites;
        });
      }
    }
  };

  const handleAddPose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("AddPose");
  };

  const renderPoseItem = ({ item, index }: { item: Pose; index: number }) => (
    <View
      style={[
        styles.cardWrapper,
        { marginRight: index % NUM_COLUMNS === 0 ? GRID_SPACING : 0 },
      ]}
    >
      <PoseCard
        pose={item}
        onPress={() => handlePosePress(item)}
        onFavoriteToggle={() => handleFavoriteToggle(item.id)}
      />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search poses..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Category Tabs */}
      <CategoryTabs
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Tag Filter Chips */}
      <View style={styles.tagFilterContainer}>
        <TagFilterChips
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
        />
      </View>

      {/* Results count */}
      <View style={styles.resultsContainer}>
        <ThemedText
          style={[styles.resultsText, { color: theme.textSecondary }]}
        >
          {filteredPoses.length} {filteredPoses.length === 1 ? "pose" : "poses"}
          {selectedTags.length > 0 && ` (${selectedTags.length} tags active)`}
        </ThemedText>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="image" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {searchQuery
          ? "No poses match your search"
          : "No poses in this category"}
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: theme.textTertiary }]}>
        {searchQuery
          ? "Try a different search term"
          : "Add your own poses or try another category"}
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={filteredPoses}
        keyExtractor={(item) => item.id}
        renderItem={renderPoseItem}
        numColumns={NUM_COLUMNS}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop, paddingBottom: tabBarHeight + Spacing.xxl + 56 }, // FAB height
        ]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      />

      {/* FAB for adding custom pose */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.md },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
        onPress={handleAddPose}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: Spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  tagFilterContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  resultsText: {
    ...Typography.caption,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  row: {
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    textAlign: "center",
  },
  emptySubtext: {
    ...Typography.bodySmall,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
