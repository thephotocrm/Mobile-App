import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInUp,
  FadeInRight,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Input } from "@/components/Input";
import { Skeleton } from "@/components/Skeleton";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import {
  FloatingActionButton,
  FABAction,
} from "@/components/home/FloatingActionButton";
import { EnhancedProjectCard } from "@/components/projects/EnhancedProjectCard";
import { ProjectEmptyState } from "@/components/projects/ProjectEmptyState";
import { ProjectsStackParamList } from "@/navigation/ProjectsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, BlysColors } from "@/constants/theme";
import {
  projectsApi,
  stagesApi,
  Project as ApiProject,
  Stage,
  ProjectType,
  createTenantContext,
} from "@/services/api";

type NavigationProp = NativeStackNavigationProp<
  ProjectsStackParamList,
  "ProjectsList"
>;

// Quick filter options
const QUICK_FILTERS = [
  { id: "all", name: "All", icon: "grid" as const },
  { id: "wedding", name: "Weddings", icon: "heart" as const },
  { id: "editing", name: "Editing", icon: "edit-3" as const },
  { id: "delivered", name: "Delivered", icon: "check-circle" as const },
];

// Format project type from API enum
const formatProjectType = (type?: ProjectType): string => {
  if (!type) return "Event";
  const typeNames: Record<ProjectType, string> = {
    WEDDING: "Wedding",
    ENGAGEMENT: "Engagement",
    PROPOSAL: "Proposal",
    CORPORATE: "Corporate",
    PORTRAIT: "Portrait",
    FAMILY: "Family",
    MATERNITY: "Maternity",
    NEWBORN: "Newborn",
    EVENT: "Event",
    COMMERCIAL: "Commercial",
    OTHER: "Other",
  };
  return typeNames[type] || "Event";
};

// Format event date for display
const formatEventDate = (dateString?: string): string => {
  if (!dateString) return "No date set";
  const date = new Date(dateString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

export default function ProjectsListScreen() {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const tenant = createTenantContext(user);
      const [projectsResult, stagesResult] = await Promise.all([
        projectsApi.getAll(token, tenant),
        stagesApi.getAll(token, tenant),
      ]);
      setProjects(projectsResult);
      setStages(stagesResult);
    } catch (err) {
      console.error("Error loading projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [token, user]),
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  }, [token, user]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Apply stage filter first
    if (selectedStage) {
      result = result.filter((p) => p.stage?.id === selectedStage);
    }

    // Apply quick filter
    if (selectedFilter !== "all") {
      if (selectedFilter === "wedding") {
        result = result.filter(
          (p) => p.projectType === "WEDDING" || p.projectType === "ENGAGEMENT",
        );
      } else if (selectedFilter === "editing") {
        result = result.filter((p) => {
          const stageName = p.stage?.name?.toLowerCase() || "";
          return stageName.includes("editing") || stageName.includes("edit");
        });
      } else if (selectedFilter === "delivered") {
        result = result.filter((p) => {
          const stageName = p.stage?.name?.toLowerCase() || "";
          return (
            stageName.includes("delivered") || stageName.includes("completed")
          );
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.client?.firstName?.toLowerCase().includes(query) ||
          project.client?.lastName?.toLowerCase().includes(query),
      );
    }

    // Sort by most recently added (newest first) - using createdAt or id
    result.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return (
        new Date(a.eventDate || "2099-01-01").getTime() -
        new Date(b.eventDate || "2099-01-01").getTime()
      );
    });

    return result;
  }, [projects, selectedFilter, selectedStage, searchQuery]);

  const getClientName = (project: ApiProject): string => {
    if (project.client) {
      const firstName = project.client.firstName || "";
      const lastName = project.client.lastName || "";
      return `${firstName} ${lastName}`.trim() || "Unknown Couple";
    }
    return "Unknown Couple";
  };

  const handleArchiveProject = (projectId: string) => {
    Alert.alert(
      "Archive Project",
      "Are you sure you want to archive this project?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            console.log("Archive project:", projectId);
          },
        },
      ],
    );
  };

  const handleFilterPress = (filterId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(filterId);
  };

  const handleStagePress = (stageId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStage(stageId === selectedStage ? null : stageId);
  };

  // Count projects per stage for badges
  const stageCountsMap = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => {
      if (p.stage?.id) {
        counts.set(p.stage.id, (counts.get(p.stage.id) || 0) + 1);
      }
    });
    return counts;
  }, [projects]);

  // FAB actions
  const fabActions: FABAction[] = [
    {
      icon: "calendar",
      label: "Wedding",
      color: "#EC4899",
      onPress: () => console.log("Create wedding project"),
    },
    {
      icon: "gift",
      label: "Engagement",
      color: "#8B5CF6",
      onPress: () => console.log("Create engagement project"),
    },
    {
      icon: "user",
      label: "Portrait",
      color: "#3B82F6",
      onPress: () => console.log("Create portrait project"),
    },
  ];

  // Determine empty state variant
  const getEmptyStateVariant = ():
    | "no-projects"
    | "no-results"
    | "no-search" => {
    if (projects.length === 0) return "no-projects";
    if (searchQuery.trim()) return "no-search";
    if (selectedFilter !== "all" || selectedStage) return "no-results";
    return "no-results";
  };

  const handleEmptyStateAction = () => {
    if (projects.length === 0) {
      Alert.alert("New Project", "Create your first project to get started!");
    } else if (searchQuery.trim()) {
      setSearchQuery("");
    } else {
      setSelectedFilter("all");
      setSelectedStage(null);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <ScreenScrollView style={{ backgroundColor: theme.backgroundRoot }}>
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          {/* Filter chips skeleton */}
          <View style={[styles.filterChipsRow, { marginTop: Spacing.sm }]}>
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                width={80}
                height={36}
                borderRadius={BorderRadius.chip}
                style={{ marginRight: Spacing.sm }}
              />
            ))}
          </View>

          {/* Search skeleton */}
          <Skeleton
            width="100%"
            height={44}
            borderRadius={BorderRadius.input}
            style={{ marginBottom: Spacing.md }}
          />

          {/* Project cards skeleton */}
          {[...Array(5)].map((_, i) => (
            <Skeleton
              key={i}
              width="100%"
              height={100}
              borderRadius={BorderRadius.md}
              style={{ marginBottom: Spacing.sm }}
            />
          ))}
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScreenScrollView
        style={{ backgroundColor: theme.backgroundRoot }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BlysColors.primary}
            colors={[BlysColors.primary]}
          />
        }
      >
        <View
          style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        >
          {/* Quick Filter Chips */}
          <Animated.View
            entering={FadeInUp.delay(50)
              .duration(400)
              .easing(Easing.out(Easing.cubic))}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsContainer}
              style={styles.filterChipsScroll}
            >
              {QUICK_FILTERS.map((filter) => {
                const isActive = selectedFilter === filter.id;
                return (
                  <Pressable
                    key={filter.id}
                    onPress={() => handleFilterPress(filter.id)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      {
                        backgroundColor: isActive
                          ? BlysColors.primary
                          : isDark
                            ? theme.backgroundSecondary
                            : "#F5F5F7",
                        borderColor: isActive
                          ? BlysColors.primary
                          : isDark
                            ? theme.border
                            : "#E5E7EB",
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Feather
                      name={filter.icon}
                      size={14}
                      color={isActive ? "#FFFFFF" : theme.textSecondary}
                      style={styles.filterChipIcon}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {filter.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Stage Filter */}
          {stages.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(75)
                .duration(400)
                .easing(Easing.out(Easing.cubic))}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stageFilterContainer}
                style={styles.stageFilterScroll}
              >
                {stages.map((stage) => {
                  const isActive = selectedStage === stage.id;
                  const count = stageCountsMap.get(stage.id) || 0;
                  const stageColor = stage.color || BlysColors.primary;

                  return (
                    <Pressable
                      key={stage.id}
                      onPress={() => handleStagePress(stage.id)}
                      style={({ pressed }) => [
                        styles.stageChip,
                        {
                          backgroundColor: isActive
                            ? stageColor
                            : isDark
                              ? theme.backgroundSecondary
                              : "#F5F5F7",
                          borderColor: isActive
                            ? stageColor
                            : isDark
                              ? theme.border
                              : "#E5E7EB",
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View
                        style={[
                          styles.stageDot,
                          {
                            backgroundColor: isActive ? "#FFFFFF" : stageColor,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.stageChipText,
                          { color: isActive ? "#FFFFFF" : theme.text },
                        ]}
                      >
                        {stage.name}
                      </Text>
                      {count > 0 && (
                        <View
                          style={[
                            styles.stageCountBadge,
                            {
                              backgroundColor: isActive
                                ? "rgba(255,255,255,0.3)"
                                : `${stageColor}20`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stageCountText,
                              { color: isActive ? "#FFFFFF" : stageColor },
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* Search Bar */}
          <Animated.View
            entering={FadeInUp.delay(100)
              .duration(400)
              .easing(Easing.out(Easing.cubic))}
            style={styles.searchSection}
          >
            <View
              style={[
                styles.searchWrapper,
                {
                  backgroundColor: isDark
                    ? theme.backgroundSecondary
                    : "#F5F5F7",
                },
              ]}
            >
              <Feather
                name="search"
                size={18}
                color={theme.textTertiary}
                style={styles.searchIcon}
              />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                variant="search"
                style={[styles.searchInput, { backgroundColor: "transparent" }]}
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={16} color={theme.textTertiary} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* Results count */}
          <View style={styles.resultsRow}>
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {filteredProjects.length}{" "}
              {filteredProjects.length === 1 ? "project" : "projects"}
            </Text>
            {(selectedFilter !== "all" || selectedStage) && (
              <Pressable
                onPress={() => {
                  setSelectedFilter("all");
                  setSelectedStage(null);
                }}
                style={styles.clearFilterButton}
              >
                <Text
                  style={[
                    styles.clearFilterText,
                    { color: BlysColors.primary },
                  ]}
                >
                  Clear filters
                </Text>
              </Pressable>
            )}
          </View>

          {/* Project List */}
          <View style={styles.projectList}>
            {filteredProjects.length === 0 ? (
              <ProjectEmptyState
                variant={getEmptyStateVariant()}
                onAction={handleEmptyStateAction}
                searchQuery={searchQuery}
                filterName={
                  QUICK_FILTERS.find((f) => f.id === selectedFilter)?.name
                }
              />
            ) : (
              filteredProjects.map((project, index) => (
                <Animated.View
                  key={project.id}
                  entering={FadeInRight.delay(150 + index * 50)
                    .duration(400)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <EnhancedProjectCard
                    project={{
                      id: project.id,
                      title: project.title,
                      clientName: getClientName(project),
                      stageName: project.stage?.name || "Unknown",
                      stageColor: project.stage?.color,
                      eventDate: formatEventDate(project.eventDate),
                      eventType: formatProjectType(project.projectType),
                    }}
                    onPress={() =>
                      navigation.navigate("ProjectDetail", {
                        projectId: project.id,
                      })
                    }
                    onArchive={() => handleArchiveProject(project.id)}
                    isUrgent={
                      project.stage?.name?.toLowerCase().includes("inquiry") ||
                      project.stage?.name?.toLowerCase().includes("lead")
                    }
                  />
                </Animated.View>
              ))
            )}
          </View>

          {/* Bottom spacing for FAB */}
          <View style={{ height: tabBarHeight + 80 }} />
        </View>
      </ScreenScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={fabActions}
        bottomOffset={tabBarHeight + 16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  filterChipsScroll: {
    marginHorizontal: -Spacing.screenHorizontal,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  filterChipsContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  filterChipsRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.chip,
    borderWidth: 1,
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  stageFilterScroll: {
    marginHorizontal: -Spacing.screenHorizontal,
    marginBottom: Spacing.md,
  },
  stageFilterContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.xs,
  },
  stageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  stageCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  stageCountText: {
    fontSize: 11,
    fontWeight: "600",
  },
  searchSection: {
    marginBottom: Spacing.sm,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 0,
    borderWidth: 0,
    height: 44,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  clearFilterButton: {
    padding: Spacing.xs,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  projectList: {
    flex: 1,
  },
});
