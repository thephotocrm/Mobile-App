import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  RouteProp,
  useRoute,
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BlysColors } from "@/constants/theme";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";
import {
  contactsApi,
  projectsApi,
  notificationsApi,
  Contact,
  Project,
  Notification,
  createTenantContext,
} from "@/services/api";

type RootTabParamList = {
  ProjectsTab: { screen: string; params?: { projectId: string } };
};

type ContactDetailScreenRouteProp = RouteProp<
  ToolsStackParamList,
  "ContactDetail"
>;

export default function ContactDetailScreen() {
  const { theme } = useTheme();
  const route = useRoute<ContactDetailScreenRouteProp>();
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const { token, user } = useAuth();
  const contactId = route.params?.contactId;

  const [contact, setContact] = useState<Contact | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activity, setActivity] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContact = useCallback(async () => {
    if (!token || !contactId) {
      setLoading(false);
      setError("Unable to load contact");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tenant = createTenantContext(user);
      const result = await contactsApi.getById(token, contactId, tenant);
      setContact(result);
    } catch (err) {
      console.error("Error loading contact:", err);
      setError("Failed to load contact details");
    } finally {
      setLoading(false);
    }
  }, [token, contactId, user]);

  const loadProjectsAndActivity = useCallback(async () => {
    if (!token || !contactId) return;

    const tenant = createTenantContext(user);

    // Load projects
    setProjectsLoading(true);
    try {
      const allProjects = await projectsApi.getAll(token, tenant);
      const contactProjects = allProjects.filter(
        (p) => p.clientId === contactId,
      );
      setProjects(contactProjects);
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setProjectsLoading(false);
    }

    // Load activity (notifications)
    setActivityLoading(true);
    try {
      const allNotifications = await notificationsApi.getAll(token, tenant, 50);
      const contactActivity = allNotifications
        .filter((n) => n.contactId === contactId)
        .slice(0, 10);
      setActivity(contactActivity);
    } catch (err) {
      console.error("Error loading activity:", err);
    } finally {
      setActivityLoading(false);
    }
  }, [token, contactId, user]);

  // Silent refresh for polling (no loading spinners)
  const silentRefresh = useCallback(async () => {
    if (!token || !contactId) return;
    try {
      const tenant = createTenantContext(user);
      const [contactResult, allProjects, allNotifications] = await Promise.all([
        contactsApi.getById(token, contactId, tenant),
        projectsApi.getAll(token, tenant),
        notificationsApi.getAll(token, tenant, 50),
      ]);
      setContact(contactResult);
      setProjects(allProjects.filter((p) => p.clientId === contactId));
      setActivity(
        allNotifications.filter((n) => n.contactId === contactId).slice(0, 10),
      );
    } catch (err) {
      console.error("Silent refresh failed:", err);
    }
  }, [token, contactId, user]);

  useFocusEffect(
    useCallback(() => {
      loadContact();
      loadProjectsAndActivity();
    }, [loadContact, loadProjectsAndActivity]),
  );

  useAutoRefresh(silentRefresh, 30000);

  const getContactName = (): string => {
    if (!contact) return "";
    return `${contact.firstName} ${contact.lastName}`.trim() || "Unknown";
  };

  const handleCall = () => {
    if (contact?.phone) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const handleText = () => {
    if (contact?.phone) {
      Linking.openURL(`sms:${contact.phone}`);
    }
  };

  const handleEmail = () => {
    if (contact?.email) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  const handleProjectPress = (project: Project) => {
    navigation.navigate("ProjectsTab", {
      screen: "ProjectDetail",
      params: { projectId: project.id },
    });
  };

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStageColor = (stage?: { color?: string }): string => {
    return stage?.color || BlysColors.primary;
  };

  const getActivityIcon = (
    type: string,
  ): "message-circle" | "calendar" | "credit-card" | "file-text" | "bell" => {
    switch (type) {
      case "MESSAGE":
        return "message-circle";
      case "BOOKING":
        return "calendar";
      case "PAYMENT":
        return "credit-card";
      case "CONTRACT":
      case "SMART_FILE_VIEWED":
      case "SMART_FILE_ACCEPTED":
        return "file-text";
      default:
        return "bell";
    }
  };

  if (loading) {
    return (
      <ScreenScrollView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BlysColors.primary} />
          <ThemedText
            style={[styles.loadingText, { color: theme.textSecondary }]}
          >
            Loading contact...
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  if (error || !contact) {
    return (
      <ScreenScrollView>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText
            style={[styles.errorText, { color: theme.textSecondary }]}
          >
            {error || "Contact not found"}
          </ThemedText>
          <Pressable
            onPress={loadContact}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: BlysColors.primary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View
        style={[styles.hero, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Avatar name={getContactName()} size={80} />
        <ThemedText
          style={[
            styles.heroName,
            {
              fontSize: Typography.h2.fontSize,
              fontWeight: Typography.h2.fontWeight,
            },
          ]}
        >
          {getContactName()}
        </ThemedText>
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={handleCall}
          disabled={!contact.phone}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
            !contact.phone && { opacity: 0.4 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="phone" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Call</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleText}
          disabled={!contact.phone}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
            !contact.phone && { opacity: 0.4 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="message-square" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Text</ThemedText>
        </Pressable>

        <Pressable
          onPress={handleEmail}
          disabled={!contact.email}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
            !contact.email && { opacity: 0.4 },
          ]}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="mail" size={24} color={theme.primary} />
          </View>
          <ThemedText style={styles.actionLabel}>Email</ThemedText>
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Projects Section */}
        <ThemedText
          style={[
            styles.sectionTitle,
            {
              fontSize: Typography.h3.fontSize,
              fontWeight: Typography.h3.fontWeight,
            },
          ]}
        >
          Projects
        </ThemedText>

        {projectsLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={BlysColors.primary} />
          </View>
        ) : projects.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="folder" size={24} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              No projects yet
            </ThemedText>
          </View>
        ) : (
          projects.map((project) => (
            <Pressable
              key={project.id}
              onPress={() => handleProjectPress(project)}
              style={({ pressed }) => [
                styles.projectCard,
                { backgroundColor: theme.backgroundSecondary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={styles.projectHeader}>
                <ThemedText style={styles.projectTitle}>
                  {project.title}
                </ThemedText>
                {project.stage && (
                  <View
                    style={[
                      styles.stageBadge,
                      { backgroundColor: getStageColor(project.stage) + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.stageBadgeText,
                        { color: getStageColor(project.stage) },
                      ]}
                    >
                      {project.stage.name}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.projectMeta}>
                {project.eventDate && (
                  <View style={styles.projectMetaItem}>
                    <Feather
                      name="calendar"
                      size={12}
                      color={theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.projectMetaText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {new Date(project.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.projectMetaItem}>
                  <Feather name="tag" size={12} color={theme.textSecondary} />
                  <ThemedText
                    style={[
                      styles.projectMetaText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {project.projectType}
                  </ThemedText>
                </View>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
                style={styles.projectChevron}
              />
            </Pressable>
          ))
        )}

        {/* Recent Activity Section */}
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
          Recent Activity
        </ThemedText>

        {activityLoading ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator size="small" color={BlysColors.primary} />
          </View>
        ) : activity.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="activity" size={24} color={theme.textSecondary} />
            <ThemedText
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              No recent activity
            </ThemedText>
          </View>
        ) : (
          <View
            style={[
              styles.activityList,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {activity.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.activityItem,
                  index > 0 && styles.activityItemBorder,
                  index > 0 && { borderTopColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: BlysColors.primary + "15" },
                  ]}
                >
                  <Feather
                    name={getActivityIcon(item.type)}
                    size={16}
                    color={BlysColors.primary}
                  />
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={styles.activityTitle}>
                    {item.title}
                  </ThemedText>
                  {item.description && (
                    <ThemedText
                      style={[
                        styles.activityDescription,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </ThemedText>
                  )}
                </View>
                <ThemedText
                  style={[styles.activityTime, { color: theme.textSecondary }]}
                >
                  {formatRelativeTime(item.createdAt)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Contact Information Section */}
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
          Contact Information
        </ThemedText>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          {contact.email ? (
            <View style={styles.infoRow}>
              <Feather name="mail" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Email
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {contact.email}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {contact.phone ? (
            <View
              style={[
                styles.infoRow,
                contact.email && styles.infoRowBorder,
                contact.email && { borderTopColor: theme.border },
              ]}
            >
              <Feather name="phone" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Phone
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {contact.phone}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {contact.stage ? (
            <View
              style={[
                styles.infoRow,
                styles.infoRowBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <Feather name="tag" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Stage
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {contact.stage.name}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {contact.eventDate ? (
            <View
              style={[
                styles.infoRow,
                styles.infoRowBorder,
                { borderTopColor: theme.border },
              ]}
            >
              <Feather name="calendar" size={18} color={theme.primary} />
              <View style={styles.infoContent}>
                <ThemedText
                  style={[styles.infoLabel, { color: theme.textSecondary }]}
                >
                  Event Date
                </ThemedText>
                <ThemedText style={styles.infoValue}>
                  {new Date(contact.eventDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl * 2,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  hero: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  heroName: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: Spacing.lg,
  },
  actionButton: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  infoCard: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoRowBorder: {
    borderTopWidth: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionLoading: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  emptyCard: {
    borderRadius: 8,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
  },
  projectCard: {
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: "relative",
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  stageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  projectMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  projectMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  projectMetaText: {
    fontSize: 12,
  },
  projectChevron: {
    position: "absolute",
    right: Spacing.md,
    top: "50%",
    marginTop: -10,
  },
  activityList: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  activityItemBorder: {
    borderTopWidth: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  activityDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
  },
});
