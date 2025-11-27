import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { ProjectCard } from "@/components/ProjectCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { ProjectsStackParamList } from "@/navigation/ProjectsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { projectsApi, Project as ApiProject } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<ProjectsStackParamList, "ProjectsList">;

const STAGES = [
  { id: "all", name: "All", color: "#6B7280" },
  { id: "lead", name: "Lead", color: "#F59E0B" },
  { id: "booked", name: "Booked", color: "#3B82F6" },
  { id: "active", name: "Active", color: "#8B4565" },
  { id: "completed", name: "Completed", color: "#22C55E" },
];

const getStageColor = (stageName?: string): string => {
  if (!stageName) return "#6B7280";
  const normalizedStage = stageName.toLowerCase();
  const stageColors: Record<string, string> = {
    inquiry: "#F59E0B",
    lead: "#F59E0B",
    booked: "#3B82F6",
    active: "#8B4565",
    completed: "#22C55E",
    cancelled: "#EF4444",
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

export default function ProjectsListScreen() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [projects, setProjects] = useState<ApiProject[]>([]);
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
      
      const stageFilter = selectedStage !== "all" ? selectedStage : undefined;
      let result = await projectsApi.getAll(token, undefined, stageFilter);

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        result = result.filter(
          (project) =>
            project.title.toLowerCase().includes(query) ||
            (project.client?.firstName?.toLowerCase().includes(query)) ||
            (project.client?.lastName?.toLowerCase().includes(query))
        );
      }

      setProjects(result);
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
    }, [searchQuery, selectedStage, token])
  );

  const getClientName = (project: ApiProject): string => {
    if (project.client) {
      return `${project.client.firstName || ""} ${project.client.lastName || ""}`.trim() || "Unknown Client";
    }
    return "Unknown Client";
  };

  return (
    <ScreenScrollView>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stageContainer}
        contentContainerStyle={styles.stageContent}
      >
        {STAGES.map((stage) => (
          <Pressable
            key={stage.id}
            onPress={() => setSelectedStage(stage.id)}
            style={({ pressed }) => [
              styles.stageChip,
              {
                backgroundColor: selectedStage === stage.id ? stage.color : theme.backgroundSecondary,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText
              style={[
                styles.stageText,
                { color: selectedStage === stage.id ? "#FFFFFF" : theme.text },
              ]}
            >
              {stage.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadProjects}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.projectList}>
          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="folder" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery ? "No projects match your search" : "No projects yet"}
              </ThemedText>
            </View>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                projectTitle={project.title}
                clientName={getClientName(project)}
                stageName={project.stage?.name || "Unknown"}
                stageColor={project.stage?.color || getStageColor(project.stage?.name)}
                eventDate={formatEventDate(project.eventDate)}
                onPress={() => navigation.navigate("ProjectDetail", { projectId: project.id })}
              />
            ))
          )}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
  },
  searchWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: Spacing.md,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  stageContainer: {
    marginTop: Spacing.md,
  },
  stageContent: {
    paddingHorizontal: 10,
    gap: Spacing.sm,
  },
  stageChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  stageText: {
    fontSize: 14,
    fontWeight: "500",
  },
  projectList: {
    paddingVertical: Spacing.md,
    paddingHorizontal: 10,
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
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
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
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
