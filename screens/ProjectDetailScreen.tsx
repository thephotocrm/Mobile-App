import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import {
  projectsApi,
  stagesApi,
  Project,
  Stage,
  createTenantContext,
} from "@/services/api";
import { ProjectsStackParamList } from "@/navigation/ProjectsStackNavigator";

type ProjectDetailRouteProp = RouteProp<
  ProjectsStackParamList,
  "ProjectDetail"
>;

type TabType = "activity" | "payments" | "files" | "details";

export default function ProjectDetailScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const route = useRoute<ProjectDetailRouteProp>();
  const { projectId } = route.params;

  const [activeTab, setActiveTab] = useState<TabType>("activity");
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Not authenticated");
      return;
    }

    try {
      setError(null);
      const tenant = createTenantContext(user);
      const [projectResult, stagesResult] = await Promise.all([
        projectsApi.getById(token, projectId, tenant),
        stagesApi.getAll(token, tenant),
      ]);
      setProject(projectResult);
      setStages(stagesResult);
    } catch (err) {
      console.error("Failed to load project:", err);
      setError("Failed to load project details");
    } finally {
      setLoading(false);
    }
  }, [token, user, projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Computed values from project data
  const clientName = project?.client
    ? `${project.client.firstName} ${project.client.lastName}`.trim()
    : "Unknown Client";

  const clientEmail = project?.client?.email || null;
  const clientPhone = project?.client?.phone || null;

  const stageColor = project?.stage?.color || "#6B7280";
  const stageName = project?.stage?.name || "Unknown";

  const eventDate = project?.eventDate
    ? new Date(project.eventDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "No date set";

  const handleCall = () => {
    if (clientPhone) {
      Linking.openURL(`tel:${clientPhone}`);
    } else {
      Alert.alert("No Phone", "No phone number available for this client");
    }
  };

  const handleText = () => {
    if (clientPhone) {
      Linking.openURL(`sms:${clientPhone}`);
    } else {
      Alert.alert("No Phone", "No phone number available for this client");
    }
  };

  const handleEmail = () => {
    if (clientEmail) {
      Linking.openURL(`mailto:${clientEmail}`);
    } else {
      Alert.alert("No Email", "No email address available for this client");
    }
  };

  const handleSendLink = () => {
    if (clientEmail) {
      Alert.alert(
        "Magic Link Sent",
        `A secure login link has been sent to ${clientEmail}`,
      );
    } else {
      Alert.alert("No Email", "No email address available for this client");
    }
  };

  // Loading state
  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <View
        style={[styles.centered, { backgroundColor: theme.backgroundRoot }]}
      >
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
          {error || "Project not found"}
        </ThemedText>
        <Pressable
          onPress={loadProject}
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </Pressable>
      </View>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "activity":
        return (
          <View style={styles.tabContent}>
            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  fontSize: Typography.h3.fontSize,
                  fontWeight: Typography.h3.fontWeight,
                },
              ]}
            >
              Activity Timeline
            </ThemedText>
            {project.notes ? (
              <View
                style={[
                  styles.activityCard,
                  { backgroundColor: theme.backgroundCard },
                ]}
              >
                <View style={styles.activityHeader}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: theme.border },
                    ]}
                  >
                    <Feather
                      name="file-text"
                      size={14}
                      color={theme.textSecondary}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <ThemedText style={styles.activityText}>
                      {project.notes}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.activityDate,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Project Notes
                    </ThemedText>
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: theme.backgroundCard },
                ]}
              >
                <Feather
                  name="activity"
                  size={48}
                  color={theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.emptyStateText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No activity yet
                </ThemedText>
                <ThemedText
                  style={[
                    styles.emptyStateSubtext,
                    { color: theme.textSecondary },
                  ]}
                >
                  Activity tracking coming soon
                </ThemedText>
              </View>
            )}
          </View>
        );

      case "payments":
        return (
          <View style={styles.tabContent}>
            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  fontSize: Typography.h3.fontSize,
                  fontWeight: Typography.h3.fontWeight,
                },
              ]}
            >
              Payment Schedule
            </ThemedText>
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.backgroundCard },
              ]}
            >
              <Feather
                name="credit-card"
                size={48}
                color={theme.textSecondary}
              />
              <ThemedText
                style={[styles.emptyStateText, { color: theme.textSecondary }]}
              >
                No payments recorded
              </ThemedText>
              <ThemedText
                style={[
                  styles.emptyStateSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                Payment tracking coming soon
              </ThemedText>
            </View>
          </View>
        );

      case "files":
        return (
          <View style={styles.tabContent}>
            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  fontSize: Typography.h3.fontSize,
                  fontWeight: Typography.h3.fontWeight,
                },
              ]}
            >
              Files
            </ThemedText>
            <View
              style={[
                styles.emptyState,
                { backgroundColor: theme.backgroundCard },
              ]}
            >
              <Feather name="folder" size={48} color={theme.textSecondary} />
              <ThemedText
                style={[styles.emptyStateText, { color: theme.textSecondary }]}
              >
                No files uploaded yet
              </ThemedText>
              <ThemedText
                style={[
                  styles.emptyStateSubtext,
                  { color: theme.textSecondary },
                ]}
              >
                Share contracts, invoices, and photos with your client
              </ThemedText>
              <Pressable
                onPress={() =>
                  Alert.alert("Upload", "File upload coming soon!")
                }
                style={({ pressed }) => [
                  styles.emptyStateCta,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Feather name="upload" size={16} color="#FFFFFF" />
                <ThemedText style={styles.emptyStateCtaText}>
                  Upload file
                </ThemedText>
              </Pressable>
            </View>
          </View>
        );

      case "details":
        return (
          <View style={styles.tabContent}>
            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  fontSize: Typography.h3.fontSize,
                  fontWeight: Typography.h3.fontWeight,
                },
              ]}
            >
              Project Details
            </ThemedText>

            <View
              style={[
                styles.detailCard,
                { backgroundColor: theme.backgroundCard },
              ]}
            >
              <View style={styles.detailRow}>
                <Feather name="calendar" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText
                    style={[styles.detailLabel, { color: theme.textSecondary }]}
                  >
                    Event Date
                  </ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {eventDate}
                  </ThemedText>
                </View>
              </View>

              <View
                style={[
                  styles.detailRow,
                  styles.detailRowBorder,
                  { borderTopColor: theme.border },
                ]}
              >
                <Feather name="camera" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText
                    style={[styles.detailLabel, { color: theme.textSecondary }]}
                  >
                    Project Type
                  </ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {project.projectType
                      ? project.projectType.charAt(0) +
                        project.projectType.slice(1).toLowerCase()
                      : "Not specified"}
                  </ThemedText>
                </View>
              </View>

              <View
                style={[
                  styles.detailRow,
                  styles.detailRowBorder,
                  { borderTopColor: theme.border },
                ]}
              >
                <Feather name="flag" size={18} color={theme.primary} />
                <View style={styles.detailContent}>
                  <ThemedText
                    style={[styles.detailLabel, { color: theme.textSecondary }]}
                  >
                    Status
                  </ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {project.status
                      ? project.status.charAt(0) +
                        project.status.slice(1).toLowerCase()
                      : "Active"}
                  </ThemedText>
                </View>
              </View>
            </View>

            <ThemedText
              style={[
                styles.sectionTitle,
                {
                  fontSize: Typography.h3.fontSize,
                  fontWeight: Typography.h3.fontWeight,
                  marginTop: Spacing.lg,
                },
              ]}
            >
              Contacts
            </ThemedText>

            {project.client ? (
              <View
                style={[
                  styles.contactCard,
                  { backgroundColor: theme.backgroundCard },
                  { marginTop: 0 },
                ]}
              >
                <View style={styles.contactHeader}>
                  <Avatar name={clientName} size={40} />
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <ThemedText style={styles.contactName}>
                        {clientName}
                      </ThemedText>
                      <Badge
                        label="Primary"
                        backgroundColor={theme.primary}
                        color="#FFFFFF"
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.contactRole,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Client
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.contactDetails}>
                  {clientEmail ? (
                    <View style={styles.contactDetailRow}>
                      <Feather
                        name="mail"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.contactDetailText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {clientEmail}
                      </ThemedText>
                    </View>
                  ) : null}
                  {clientPhone ? (
                    <View style={styles.contactDetailRow}>
                      <Feather
                        name="phone"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.contactDetailText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {clientPhone}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: theme.backgroundCard },
                ]}
              >
                <Feather name="users" size={48} color={theme.textSecondary} />
                <ThemedText
                  style={[
                    styles.emptyStateText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No contacts linked
                </ThemedText>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScreenScrollView contentContainerStyle={{ paddingTop: Spacing.md }}>
      <View style={[styles.hero, { backgroundColor: theme.backgroundCard }]}>
        <Avatar name={clientName} size={64} />
        <ThemedText
          style={[
            styles.heroTitle,
            {
              fontSize: Typography.h2.fontSize,
              fontWeight: Typography.h2.fontWeight,
            },
          ]}
        >
          {project.title}
        </ThemedText>
        <ThemedText
          style={[styles.heroSubtitle, { color: theme.textSecondary }]}
        >
          {clientName}
        </ThemedText>
        <View style={styles.heroBadge}>
          <Badge label={stageName} backgroundColor={stageColor} />
        </View>
        <ThemedText style={[styles.heroDate, { color: theme.textSecondary }]}>
          Event Date: {eventDate}
        </ThemedText>
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="phone" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Call</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleText}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="message-square" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Text</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleEmail}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="mail" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Email</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleSendLink}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="link" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Send Link</ThemedText>
        </Pressable>
      </View>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.backgroundSecondary,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={() => setActiveTab("activity")}
          style={[styles.tab, activeTab === "activity" && styles.tabActive]}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "activity" && {
                color: theme.primary,
                fontWeight: "600",
              },
            ]}
          >
            Activity
          </ThemedText>
          {activeTab === "activity" && (
            <View
              style={[styles.tabIndicator, { backgroundColor: theme.primary }]}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("payments")}
          style={[styles.tab, activeTab === "payments" && styles.tabActive]}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "payments" && {
                color: theme.primary,
                fontWeight: "600",
              },
            ]}
          >
            Payments
          </ThemedText>
          {activeTab === "payments" && (
            <View
              style={[styles.tabIndicator, { backgroundColor: theme.primary }]}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("files")}
          style={[styles.tab, activeTab === "files" && styles.tabActive]}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "files" && {
                color: theme.primary,
                fontWeight: "600",
              },
            ]}
          >
            Files
          </ThemedText>
          {activeTab === "files" && (
            <View
              style={[styles.tabIndicator, { backgroundColor: theme.primary }]}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("details")}
          style={[styles.tab, activeTab === "details" && styles.tabActive]}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "details" && {
                color: theme.primary,
                fontWeight: "600",
              },
            ]}
          >
            Details
          </ThemedText>
          {activeTab === "details" && (
            <View
              style={[styles.tabIndicator, { backgroundColor: theme.primary }]}
            />
          )}
        </Pressable>
      </View>

      {renderTabContent()}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  hero: {
    padding: Spacing.xl,
    alignItems: "center",
    marginHorizontal: Spacing.md,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTitle: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: Spacing.xs,
    fontSize: 16,
  },
  heroBadge: {
    marginTop: Spacing.md,
  },
  heroDate: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.lg,
  },
  actionButton: {
    alignItems: "center",
    gap: Spacing.sm,
    minWidth: 64,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tabContent: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  activityCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityHeader: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  activityDate: {
    fontSize: 12,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: 8,
    alignItems: "center",
    gap: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyStateCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.md,
  },
  emptyStateCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  detailCard: {
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  detailRowBorder: {
    borderTopWidth: 1,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  contactCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  contactHeader: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
  },
  contactRole: {
    fontSize: 12,
  },
  contactDetails: {
    gap: Spacing.xs,
    paddingLeft: 52,
  },
  contactDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  contactDetailText: {
    fontSize: 12,
  },
});
