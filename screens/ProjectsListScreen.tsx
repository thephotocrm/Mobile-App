import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Text,
  ScrollView,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { ProjectCard } from "@/components/ProjectCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProjectsStackParamList } from "@/navigation/ProjectsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import {
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  BlysColors,
} from "@/constants/theme";
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

// Sort options
const SORT_OPTIONS = [
  { id: "date_asc", name: "Date (soonest first)", icon: "arrow-up" as const },
  { id: "date_desc", name: "Date (latest first)", icon: "arrow-down" as const },
  { id: "client_asc", name: "Client (A-Z)", icon: "arrow-up" as const },
  { id: "client_desc", name: "Client (Z-A)", icon: "arrow-down" as const },
  { id: "stage", name: "By Stage", icon: "layers" as const },
];

// Stage priority for sorting
const STAGE_PRIORITY: Record<string, number> = {
  inquiry: 1,
  lead: 1,
  booked: 2,
  "contract sent": 3,
  "deposit paid": 4,
  active: 5,
  "shoot complete": 6,
  editing: 7,
  delivered: 8,
  completed: 8,
  cancelled: 9,
  archived: 10,
};

const getStageColor = (stageName?: string): string => {
  if (!stageName) return "#6B7280";
  const normalizedStage = stageName.toLowerCase();
  const stageColors: Record<string, string> = {
    inquiry: "#F59E0B",
    lead: "#F59E0B",
    booked: "#3B82F6",
    "contract sent": "#8B5CF6",
    "deposit paid": "#10B981",
    active: BlysColors.primary,
    "shoot complete": "#14B8A6",
    editing: "#EC4899",
    delivered: "#22C55E",
    completed: "#22C55E",
    cancelled: "#EF4444",
    archived: "#6B7280",
  };
  return stageColors[normalizedStage] || "#6B7280";
};

const formatEventDate = (dateString?: string): string => {
  if (!dateString) return "No date set";

  const date = new Date(dateString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
};

// Format project type from API enum to display-friendly name
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

export default function ProjectsListScreen() {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedSort, setSelectedSort] = useState("date_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tenant = createTenantContext(user);
      const [projectsResult, stagesResult] = await Promise.all([
        projectsApi.getAll(token, tenant),
        stagesApi.getAll(token, tenant),
      ]);
      setProjects(projectsResult);
      setStages(stagesResult);
    } catch (err) {
      console.error("Error loading projects:", err);
      setError("Failed to load projects. Please try again.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
    }, [token, user]),
  );

  // Build dynamic stage filter options from API stages
  const stageFilters = useMemo(() => {
    const allOption = {
      id: "all",
      name: "All",
      icon: "grid" as const,
      color: undefined as string | undefined,
    };
    const stageOptions = stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      icon: "circle" as const,
      color: stage.color,
    }));
    return [allOption, ...stageOptions];
  }, [stages]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by stage (using stageId for dynamic stages)
    if (selectedStage !== "all") {
      result = result.filter((p) => p.stageId === selectedStage);
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

    // Sort
    result.sort((a, b) => {
      switch (selectedSort) {
        case "date_asc":
          return (
            new Date(a.eventDate || "2099-01-01").getTime() -
            new Date(b.eventDate || "2099-01-01").getTime()
          );
        case "date_desc":
          return (
            new Date(b.eventDate || "1970-01-01").getTime() -
            new Date(a.eventDate || "1970-01-01").getTime()
          );
        case "client_asc":
          return (a.client?.lastName || "").localeCompare(
            b.client?.lastName || "",
          );
        case "client_desc":
          return (b.client?.lastName || "").localeCompare(
            a.client?.lastName || "",
          );
        case "stage":
          return (
            (STAGE_PRIORITY[a.stage?.name?.toLowerCase() || "inquiry"] || 5) -
            (STAGE_PRIORITY[b.stage?.name?.toLowerCase() || "inquiry"] || 5)
          );
        default:
          return 0;
      }
    });

    return result;
  }, [projects, selectedStage, searchQuery, selectedSort]);

  // Calculate summary stats
  const stats = useMemo(() => {
    // Check for stages that indicate follow-up needed (inquiry, lead)
    const needsFollowUp = projects.filter((p) => {
      const stageName = p.stage?.name?.toLowerCase() || "";
      return stageName.includes("inquiry") || stageName.includes("lead");
    }).length;
    const upcomingShoots = projects.filter((p) => {
      const eventDate = p.eventDate ? new Date(p.eventDate) : null;
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      return eventDate && eventDate >= now && eventDate <= thirtyDaysFromNow;
    }).length;
    // Check for stages that indicate editing phase
    const inEditing = projects.filter((p) => {
      const stageName = p.stage?.name?.toLowerCase() || "";
      return stageName.includes("editing") || stageName.includes("edit");
    }).length;

    return { total: projects.length, needsFollowUp, upcomingShoots, inEditing };
  }, [projects]);

  const getClientName = (project: ApiProject): string => {
    if (project.client) {
      const firstName = project.client.firstName || "";
      const lastName = project.client.lastName || "";
      return `${firstName} ${lastName}`.trim() || "Unknown Couple";
    }
    return "Unknown Couple";
  };

  const currentSortOption = SORT_OPTIONS.find((s) => s.id === selectedSort);

  return (
    <View style={styles.screenContainer}>
      <ScreenScrollView>
        {/* Summary Stats Banner */}
        <View style={styles.summaryContainer}>
          <View
            style={[
              styles.summaryBanner,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F3FF",
                borderColor: isDark ? theme.border : "#E9E3FF",
              },
            ]}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text
                  style={[styles.summaryNumber, { color: BlysColors.primary }]}
                >
                  {stats.total}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  Total Projects
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: isDark ? theme.border : "#E9E3FF" },
                ]}
              />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: "#F59E0B" }]}>
                  {stats.needsFollowUp}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  Need Follow-up
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: isDark ? theme.border : "#E9E3FF" },
                ]}
              />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: "#3B82F6" }]}>
                  {stats.upcomingShoots}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  Next 30 Days
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: isDark ? theme.border : "#E9E3FF" },
                ]}
              />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: "#EC4899" }]}>
                  {stats.inEditing}
                </Text>
                <Text
                  style={[styles.summaryLabel, { color: theme.textSecondary }]}
                >
                  In Editing
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stage Filter Chips - Horizontal Scroll */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContainer}
          >
            {stageFilters.map((filter) => {
              const isActive = selectedStage === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setSelectedStage(filter.id)}
                  style={[
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
                      {
                        color: isActive ? "#FFFFFF" : theme.text,
                      },
                    ]}
                  >
                    {filter.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Search and Sort Row */}
        <View style={styles.searchSortRow}>
          <View
            style={[
              styles.searchWrapper,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F7",
                flex: 1,
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
              style={[
                styles.searchInput,
                {
                  backgroundColor: "transparent",
                },
              ]}
            />
          </View>

          {/* Sort Button */}
          <Pressable
            style={[
              styles.sortButton,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F7",
                borderColor: isDark ? theme.border : "#E5E7EB",
              },
            ]}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Feather name="sliders" size={18} color={BlysColors.primary} />
          </Pressable>
        </View>

        {/* Sort Menu Dropdown */}
        {showSortMenu && (
          <View
            style={[
              styles.sortMenu,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: isDark ? theme.border : "#E5E7EB",
                ...(isDark ? Shadows.dark.md : Shadows.md),
              },
            ]}
          >
            <Text
              style={[styles.sortMenuTitle, { color: theme.textSecondary }]}
            >
              Sort by
            </Text>
            {SORT_OPTIONS.map((option) => {
              const isSelected = selectedSort === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[
                    styles.sortMenuItem,
                    isSelected && {
                      backgroundColor: isDark ? "#1E1E3F" : "#F5F3FF",
                    },
                  ]}
                  onPress={() => {
                    setSelectedSort(option.id);
                    setShowSortMenu(false);
                  }}
                >
                  <Feather
                    name={option.icon}
                    size={16}
                    color={
                      isSelected ? BlysColors.primary : theme.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.sortMenuItemText,
                      {
                        color: isSelected ? BlysColors.primary : theme.text,
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {option.name}
                  </Text>
                  {isSelected && (
                    <Feather
                      name="check"
                      size={16}
                      color={BlysColors.primary}
                      style={styles.sortMenuCheck}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Current Sort Indicator */}
        <View style={styles.sortIndicator}>
          <Text
            style={[styles.sortIndicatorText, { color: theme.textSecondary }]}
          >
            Sorted by: {currentSortOption?.name}
          </Text>
          <Text style={[styles.resultsCount, { color: theme.textTertiary }]}>
            {filteredProjects.length}{" "}
            {filteredProjects.length === 1 ? "project" : "projects"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BlysColors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Feather
              name="alert-circle"
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText
              style={[styles.errorText, { color: theme.textSecondary }]}
            >
              {error}
            </ThemedText>
            <Pressable
              style={[
                styles.retryButton,
                { backgroundColor: BlysColors.primary },
              ]}
              onPress={loadProjects}
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.projectList}>
            {filteredProjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundSecondary
                        : "#F5F3FF",
                    },
                  ]}
                >
                  <Feather name="folder" size={32} color={BlysColors.primary} />
                </View>
                <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                  {searchQuery
                    ? "No projects found"
                    : selectedStage !== "all"
                      ? `No ${stageFilters.find((f) => f.id === selectedStage)?.name.toLowerCase()} projects`
                      : "No projects yet"}
                </ThemedText>
                <ThemedText
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  {searchQuery
                    ? "Try a different search term"
                    : selectedStage !== "all"
                      ? "Projects in this stage will appear here"
                      : "Add your first project to get started"}
                </ThemedText>
              </View>
            ) : (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  projectTitle={project.title}
                  clientName={getClientName(project)}
                  stageName={project.stage?.name || "Unknown"}
                  stageColor={
                    project.stage?.color || getStageColor(project.stage?.name)
                  }
                  eventDate={formatEventDate(project.eventDate)}
                  eventType={formatProjectType(project.projectType)}
                  onPress={() =>
                    navigation.navigate("ProjectDetail", {
                      projectId: project.id,
                    })
                  }
                />
              ))
            )}
          </View>
        )}
      </ScreenScrollView>

      {/* Backdrop for sort menu */}
      {showSortMenu && (
        <Pressable
          style={styles.sortMenuBackdrop}
          onPress={() => setShowSortMenu(false)}
        />
      )}

      {/* FAB for creating new project */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: BlysColors.primary,
            bottom: tabBarHeight + Spacing.md,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
        onPress={() =>
          Alert.alert(
            "New Project",
            "What type of shoot would you like to add?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Wedding",
                onPress: () => console.log("Create wedding project"),
              },
              {
                text: "Engagement",
                onPress: () => console.log("Create engagement project"),
              },
              {
                text: "Portrait",
                onPress: () => console.log("Create portrait project"),
              },
            ],
          )
        }
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  summaryContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  summaryBanner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  filterSection: {
    marginBottom: Spacing.sm,
  },
  filterChipsContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.chip,
    borderWidth: 1,
  },
  filterChipIcon: {
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  searchSortRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.screenHorizontal,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 0,
    borderWidth: 0,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.input,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sortMenu: {
    position: "absolute",
    top: 200,
    right: Spacing.screenHorizontal,
    width: 220,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    zIndex: 100,
    paddingVertical: Spacing.xs,
  },
  sortMenuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  sortMenuTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  sortMenuItemText: {
    fontSize: 14,
    flex: 1,
  },
  sortMenuCheck: {
    marginLeft: "auto",
  },
  sortIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.xs,
  },
  sortIndicatorText: {
    fontSize: 12,
    fontWeight: "500",
  },
  resultsCount: {
    fontSize: 12,
  },
  projectList: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.screenHorizontal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    ...Typography.body,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.button,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: "#FFFFFF",
    ...Typography.button,
  },
  fab: {
    position: "absolute",
    right: Spacing.screenHorizontal,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.lg,
  },
});
