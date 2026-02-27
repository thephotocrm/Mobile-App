import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import {
  API_BASE_URL,
  projectsApi,
  smartFilesApi,
  stagesApi,
  Project,
  Stage,
  SmartFile,
  ProjectSmartFile,
  createTenantContext,
} from "@/services/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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
  const [stagePickerVisible, setStagePickerVisible] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Smart Files state
  const [projectSmartFiles, setProjectSmartFiles] = useState<
    ProjectSmartFile[]
  >([]);
  const [smartFileTemplates, setSmartFileTemplates] = useState<SmartFile[]>([]);
  const [loadingSmartFiles, setLoadingSmartFiles] = useState(false);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [attachingSmartFile, setAttachingSmartFile] = useState(false);
  const [sendingSmartFileId, setSendingSmartFileId] = useState<string | null>(
    null,
  );
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailTargetSmartFile, setEmailTargetSmartFile] =
    useState<ProjectSmartFile | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      loadProject();
    }, [loadProject]),
  );

  useAutoRefresh(loadProject, 30000);

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

  const handleStageChange = async (stage: Stage) => {
    if (stage.id === project?.stageId) {
      setStagePickerVisible(false);
      return;
    }
    if (!token || !project) return;

    setUpdatingStage(true);
    try {
      const tenant = createTenantContext(user);
      await projectsApi.updateStage(token, project.id, stage.id, tenant);
      setProject({
        ...project,
        stageId: stage.id,
        stage,
        stageEnteredAt: new Date().toISOString(),
      });
      setStagePickerVisible(false);
    } catch (err) {
      console.error("Failed to update stage:", err);
      Alert.alert(
        "Error",
        "Failed to update pipeline stage. Please try again.",
      );
    } finally {
      setUpdatingStage(false);
    }
  };

  // Smart Files: lazy-load when Files tab is active
  const loadSmartFiles = useCallback(async () => {
    if (!token || !project) return;
    setLoadingSmartFiles(true);
    try {
      const tenant = createTenantContext(user);
      const result = await smartFilesApi.getProjectSmartFiles(
        token,
        project.id,
        tenant,
      );
      setProjectSmartFiles(result);
    } catch (err) {
      console.error("Failed to load smart files:", err);
    } finally {
      setLoadingSmartFiles(false);
    }
  }, [token, user, project]);

  useEffect(() => {
    if (activeTab === "files" && project) {
      loadSmartFiles();
    }
  }, [activeTab, project, loadSmartFiles]);

  const handleOpenTemplatePicker = async () => {
    setTemplatePickerVisible(true);
    setLoadingTemplates(true);
    try {
      const tenant = createTenantContext(user);
      const templates = await smartFilesApi.getTemplates(token!, tenant);
      setSmartFileTemplates(templates.filter((t) => t.status === "ACTIVE"));
    } catch (err) {
      console.error("Failed to load templates:", err);
      Alert.alert("Error", "Failed to load smart file templates.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleAttachTemplate = async (templateId: string) => {
    if (!token || !project) return;
    setAttachingSmartFile(true);
    try {
      const tenant = createTenantContext(user);
      const attached = await smartFilesApi.attach(
        token,
        project.id,
        templateId,
        tenant,
      );
      setProjectSmartFiles((prev) => [...prev, attached]);
      setTemplatePickerVisible(false);
    } catch (err) {
      console.error("Failed to attach smart file:", err);
      Alert.alert("Error", "Failed to attach smart file. Please try again.");
    } finally {
      setAttachingSmartFile(false);
    }
  };

  const handleSendSmartFile = (sf: ProjectSmartFile) => {
    Alert.alert(
      "Send Smart File",
      `How would you like to send "${sf.smartFileName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send via Email",
          onPress: () => {
            setEmailTargetSmartFile(sf);
            setEmailSubject(`Your ${sf.smartFileName}`);
            setEmailMessage(
              `Hi ${project.client?.firstName || "there"},\n\n` +
                `I've prepared your ${sf.smartFileName} for you to review. ` +
                `Please take a look and let me know if you have any questions!\n\n` +
                `Best regards`,
            );
            setEmailModalVisible(true);
          },
        },
        { text: "Send via SMS", onPress: () => sendSmartFileSms(sf) },
      ],
    );
  };

  const sendSmartFileEmail = async () => {
    const sf = emailTargetSmartFile;
    if (!token || !project || !sf) return;
    setSendingSmartFileId(sf.id);
    setEmailModalVisible(false);
    try {
      const tenant = createTenantContext(user);
      await smartFilesApi.sendEmail(
        token,
        project.id,
        sf.id,
        emailSubject,
        emailMessage,
        tenant,
      );
      await loadSmartFiles();
    } catch (err) {
      console.error("Failed to send smart file email:", err);
      Alert.alert("Error", "Failed to send smart file via email.");
    } finally {
      setSendingSmartFileId(null);
      setEmailTargetSmartFile(null);
    }
  };

  const sendSmartFileSms = async (sf: ProjectSmartFile) => {
    if (!token || !project) return;
    if (!clientPhone) {
      Alert.alert("No Phone", "This client has no phone number on file.");
      return;
    }
    setSendingSmartFileId(sf.id);
    try {
      const tenant = createTenantContext(user);
      const publicUrl = `${API_BASE_URL}/f/${sf.token}`;
      await projectsApi.sendSmartFileSms(
        token,
        project.id,
        sf.id,
        `Here is your ${sf.smartFileName}: ${publicUrl}`,
        tenant,
      );
      await loadSmartFiles();
    } catch (err) {
      console.error("Failed to send smart file SMS:", err);
      Alert.alert("Error", "Failed to send smart file via SMS.");
    } finally {
      setSendingSmartFileId(null);
    }
  };

  const handleDeleteSmartFile = (sf: ProjectSmartFile) => {
    Alert.alert(
      "Remove Smart File",
      `Are you sure you want to remove "${sf.smartFileName}" from this project?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (!token || !project) return;
            try {
              const tenant = createTenantContext(user);
              await smartFilesApi.remove(token, project.id, sf.id, tenant);
              setProjectSmartFiles((prev) =>
                prev.filter((item) => item.id !== sf.id),
              );
            } catch (err) {
              console.error("Failed to remove smart file:", err);
              Alert.alert("Error", "Failed to remove smart file.");
            }
          },
        },
      ],
    );
  };

  const getSmartFileStatusColor = (
    status: string,
  ): { bg: string; text: string } => {
    switch (status) {
      case "DRAFT":
        return { bg: "#E5E7EB", text: "#374151" };
      case "SENT":
        return { bg: "#DBEAFE", text: "#1D4ED8" };
      case "VIEWED":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "ACCEPTED":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "DEPOSIT_PAID":
        return { bg: "#A7F3D0", text: "#047857" };
      case "PAID":
        return { bg: "#6EE7B7", text: "#064E3B" };
      default:
        return { bg: "#E5E7EB", text: "#374151" };
    }
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatSmartFileDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            <View style={styles.smartFilesHeader}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  {
                    fontSize: Typography.h3.fontSize,
                    fontWeight: Typography.h3.fontWeight,
                    marginBottom: 0,
                  },
                ]}
              >
                Smart Files
              </ThemedText>
              <Pressable
                onPress={handleOpenTemplatePicker}
                style={({ pressed }) => [
                  styles.attachButton,
                  { backgroundColor: theme.primary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <ThemedText style={styles.attachButtonText}>Attach</ThemedText>
              </Pressable>
            </View>

            {loadingSmartFiles ? (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: theme.backgroundCard },
                ]}
              >
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText
                  style={[
                    styles.emptyStateText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Loading smart files...
                </ThemedText>
              </View>
            ) : projectSmartFiles.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: theme.backgroundCard },
                ]}
              >
                <Feather
                  name="file-text"
                  size={48}
                  color={theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.emptyStateText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No smart files attached
                </ThemedText>
                <ThemedText
                  style={[
                    styles.emptyStateSubtext,
                    { color: theme.textSecondary },
                  ]}
                >
                  Attach proposals, contracts, or invoices to this project
                </ThemedText>
                <Pressable
                  onPress={handleOpenTemplatePicker}
                  style={({ pressed }) => [
                    styles.emptyStateCta,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.emptyStateCtaText}>
                    Attach Smart File
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              projectSmartFiles.map((sf) => {
                const statusColors = getSmartFileStatusColor(sf.status);
                const isSending = sendingSmartFileId === sf.id;
                const isDraft = sf.status === "DRAFT";
                const hasSentStatus = [
                  "SENT",
                  "VIEWED",
                  "ACCEPTED",
                  "DEPOSIT_PAID",
                  "PAID",
                ].includes(sf.status);
                return (
                  <View
                    key={sf.id}
                    style={[
                      styles.smartFileCard,
                      { backgroundColor: theme.backgroundCard },
                    ]}
                  >
                    <View style={styles.smartFileCardHeader}>
                      <View
                        style={[
                          styles.smartFileIcon,
                          { backgroundColor: theme.border },
                        ]}
                      >
                        <Feather
                          name="file-text"
                          size={16}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.smartFileInfo}>
                        <ThemedText style={styles.smartFileName}>
                          {sf.smartFileName}
                        </ThemedText>
                      </View>
                      <Badge
                        label={sf.status.replace("_", " ")}
                        backgroundColor={statusColors.bg}
                        color={statusColors.text}
                      />
                    </View>

                    <View style={styles.smartFileMeta}>
                      {sf.sentAt && (
                        <View style={styles.smartFileMetaItem}>
                          <Feather
                            name="send"
                            size={12}
                            color={theme.textSecondary}
                          />
                          <ThemedText
                            style={[
                              styles.smartFileMetaText,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Sent {formatSmartFileDate(sf.sentAt)}
                          </ThemedText>
                        </View>
                      )}
                      {sf.totalCents != null && sf.totalCents > 0 && (
                        <View style={styles.smartFileMetaItem}>
                          <Feather
                            name="dollar-sign"
                            size={12}
                            color={theme.textSecondary}
                          />
                          <ThemedText
                            style={[
                              styles.smartFileMetaText,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Total: {formatCurrency(sf.totalCents)}
                          </ThemedText>
                        </View>
                      )}
                      {sf.balanceDueCents != null && sf.balanceDueCents > 0 && (
                        <View style={styles.smartFileMetaItem}>
                          <Feather
                            name="alert-circle"
                            size={12}
                            color="#F59E0B"
                          />
                          <ThemedText
                            style={[
                              styles.smartFileMetaText,
                              { color: "#F59E0B" },
                            ]}
                          >
                            Due: {formatCurrency(sf.balanceDueCents)}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.smartFileActions,
                        { borderTopColor: theme.border },
                      ]}
                    >
                      {isDraft && (
                        <Pressable
                          onPress={() => handleSendSmartFile(sf)}
                          disabled={isSending}
                          style={({ pressed }) => [
                            styles.smartFileActionBtn,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          {isSending ? (
                            <ActivityIndicator
                              size="small"
                              color={theme.primary}
                            />
                          ) : (
                            <>
                              <Feather
                                name="send"
                                size={14}
                                color={theme.primary}
                              />
                              <ThemedText
                                style={[
                                  styles.smartFileActionText,
                                  { color: theme.primary },
                                ]}
                              >
                                Send
                              </ThemedText>
                            </>
                          )}
                        </Pressable>
                      )}
                      {hasSentStatus && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(`${API_BASE_URL}/f/${sf.token}`)
                          }
                          style={({ pressed }) => [
                            styles.smartFileActionBtn,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Feather
                            name="external-link"
                            size={14}
                            color={theme.primary}
                          />
                          <ThemedText
                            style={[
                              styles.smartFileActionText,
                              { color: theme.primary },
                            ]}
                          >
                            View
                          </ThemedText>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleDeleteSmartFile(sf)}
                        style={({ pressed }) => [
                          styles.smartFileActionBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Feather name="trash-2" size={14} color={theme.error} />
                        <ThemedText
                          style={[
                            styles.smartFileActionText,
                            { color: theme.error },
                          ]}
                        >
                          Remove
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
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
        <Pressable
          onPress={() => setStagePickerVisible(true)}
          style={({ pressed }) => [
            styles.heroBadge,
            { flexDirection: "row", alignItems: "center", gap: 4 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Badge label={stageName} backgroundColor={stageColor} />
          <Feather name="chevron-down" size={14} color={stageColor} />
        </Pressable>
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

      <Modal
        visible={stagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStagePickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setStagePickerVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundCard },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Pipeline Stage</ThemedText>
              <Pressable onPress={() => setStagePickerVisible(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            {stages.map((stage) => {
              const isCurrentStage = stage.id === project?.stageId;
              return (
                <Pressable
                  key={stage.id}
                  onPress={() => handleStageChange(stage)}
                  style={({ pressed }) => [
                    styles.stageRow,
                    { borderBottomColor: theme.border },
                    isCurrentStage && {
                      backgroundColor: theme.backgroundSecondary,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View
                    style={[
                      styles.stageDot,
                      { backgroundColor: stage.color || "#6B7280" },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.stageName,
                      isCurrentStage && { fontWeight: "700" },
                    ]}
                  >
                    {stage.name}
                  </ThemedText>
                  {isCurrentStage && (
                    <Feather name="check" size={18} color={theme.primary} />
                  )}
                </Pressable>
              );
            })}
            {updatingStage && (
              <View style={styles.stageLoadingOverlay}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={templatePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplatePickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTemplatePickerVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundCard },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Attach Smart File
              </ThemedText>
              <Pressable onPress={() => setTemplatePickerVisible(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            {loadingTemplates ? (
              <View style={styles.templateLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText
                  style={[
                    styles.templateLoadingText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Loading templates...
                </ThemedText>
              </View>
            ) : smartFileTemplates.length === 0 ? (
              <View style={styles.templateEmptyContainer}>
                <Feather
                  name="file-text"
                  size={40}
                  color={theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.templateEmptyText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No templates available
                </ThemedText>
                <ThemedText
                  style={[
                    styles.templateEmptySubtext,
                    { color: theme.textSecondary },
                  ]}
                >
                  Create smart file templates in the desktop app
                </ThemedText>
              </View>
            ) : (
              <ScrollView>
                {smartFileTemplates.map((template) => {
                  const alreadyAttached = projectSmartFiles.some(
                    (sf) => sf.smartFileId === template.id,
                  );
                  return (
                    <Pressable
                      key={template.id}
                      onPress={() =>
                        !alreadyAttached && handleAttachTemplate(template.id)
                      }
                      disabled={alreadyAttached}
                      style={({ pressed }) => [
                        styles.templateRow,
                        { borderBottomColor: theme.border },
                        alreadyAttached && { opacity: 0.5 },
                        pressed && !alreadyAttached && { opacity: 0.7 },
                      ]}
                    >
                      <View
                        style={[
                          styles.templateIcon,
                          { backgroundColor: theme.border },
                        ]}
                      >
                        <Feather
                          name="file-text"
                          size={18}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.templateInfo}>
                        <ThemedText style={styles.templateName}>
                          {template.name}
                        </ThemedText>
                        {template.description ? (
                          <ThemedText
                            style={[
                              styles.templateDescription,
                              { color: theme.textSecondary },
                            ]}
                            numberOfLines={1}
                          >
                            {template.description}
                          </ThemedText>
                        ) : null}
                      </View>
                      <Feather
                        name={alreadyAttached ? "check-circle" : "plus-circle"}
                        size={20}
                        color={alreadyAttached ? "#10B981" : theme.primary}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {attachingSmartFile && (
              <View style={styles.stageLoadingOverlay}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={emailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEmailModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundCard },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Send Smart File</ThemedText>
              <Pressable onPress={() => setEmailModalVisible(false)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: Spacing.md, gap: Spacing.md }}>
              <View>
                <ThemedText
                  style={[
                    styles.emailInputLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Subject
                </ThemedText>
                <TextInput
                  style={[
                    styles.emailInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={emailSubject}
                  onChangeText={setEmailSubject}
                  placeholder="Email subject"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View>
                <ThemedText
                  style={[
                    styles.emailInputLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Message
                </ThemedText>
                <TextInput
                  style={[
                    styles.emailInput,
                    styles.emailInputMultiline,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={emailMessage}
                  onChangeText={setEmailMessage}
                  placeholder="Add a personal message..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.emailInfoNote}>
                <Feather name="info" size={14} color={theme.textSecondary} />
                <ThemedText
                  style={[
                    styles.emailInfoNoteText,
                    { color: theme.textSecondary },
                  ]}
                >
                  A "View Proposal" button with a link will be included
                  automatically.
                </ThemedText>
              </View>

              <Pressable
                onPress={sendSmartFileEmail}
                disabled={!emailSubject.trim()}
                style={({ pressed }) => [
                  styles.sendEmailButton,
                  { backgroundColor: theme.primary },
                  !emailSubject.trim() && styles.sendEmailButtonDisabled,
                  pressed && emailSubject.trim() ? { opacity: 0.8 } : {},
                ]}
              >
                <Feather name="send" size={16} color="#FFFFFF" />
                <ThemedText style={styles.sendEmailButtonText}>
                  Send Email
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Spacing.xl,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stageName: {
    fontSize: 16,
    flex: 1,
  },
  stageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  // Smart Files styles
  smartFilesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  attachButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  smartFileCard: {
    borderRadius: 8,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  smartFileCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  smartFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  smartFileInfo: {
    flex: 1,
  },
  smartFileName: {
    fontSize: 15,
    fontWeight: "600",
  },
  smartFileMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  smartFileMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smartFileMetaText: {
    fontSize: 12,
  },
  smartFileActions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
  },
  smartFileActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  smartFileActionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Template picker styles
  templateLoadingContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  templateLoadingText: {
    fontSize: 14,
  },
  templateEmptyContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  templateEmptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  templateEmptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "500",
  },
  templateDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  // Email compose modal styles
  emailInputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  emailInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  emailInputMultiline: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  sendEmailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  sendEmailButtonDisabled: {
    opacity: 0.5,
  },
  sendEmailButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emailInfoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emailInfoNoteText: {
    fontSize: 12,
    flex: 1,
  },
});
