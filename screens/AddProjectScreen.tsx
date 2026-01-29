import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, Easing } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ContactPickerModal } from "@/components/ContactPickerModal";
import { Feather } from "@expo/vector-icons";
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import {
  projectsApi,
  createTenantContext,
  ProjectType,
  Contact,
} from "@/services/api";
import { ProjectsStackParamList } from "@/navigation/ProjectsStackNavigator";

type AddProjectRouteProp = RouteProp<ProjectsStackParamList, "AddProject">;

// Project type options
const PROJECT_TYPES: { id: ProjectType; label: string; color: string }[] = [
  { id: "WEDDING", label: "Wedding", color: "#EC4899" },
  { id: "ENGAGEMENT", label: "Engagement", color: "#8B5CF6" },
  { id: "PORTRAIT", label: "Portrait", color: "#3B82F6" },
  { id: "FAMILY", label: "Family", color: "#10B981" },
  { id: "EVENT", label: "Event", color: "#F59E0B" },
  { id: "OTHER", label: "Other", color: "#6B7280" },
];

// Generate dates for selection (next 365 days)
const generateDateOptions = () => {
  const dates: { date: Date; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    let label: string;
    if (i === 0) {
      label = "Today";
    } else if (i === 1) {
      label = "Tomorrow";
    } else {
      label = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    dates.push({ date, label });
  }
  return dates;
};

const DATE_OPTIONS = generateDateOptions();

export function AddProjectScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddProjectRouteProp>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  // Get initial project type from route params
  const initialProjectType = route.params?.projectType || null;

  const [title, setTitle] = useState("");
  const [selectedClient, setSelectedClient] = useState<Contact | null>(null);
  const [selectedProjectType, setSelectedProjectType] =
    useState<ProjectType | null>(initialProjectType);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for the project");
      return;
    }

    if (!selectedClient) {
      Alert.alert("Missing Client", "Please select a client for the project");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You must be logged in to create projects");
      return;
    }

    setSaving(true);
    try {
      const tenant = createTenantContext(user);

      const projectData: Record<string, unknown> = {
        title: title.trim(),
        clientId: selectedClient.id,
      };

      if (selectedProjectType) {
        projectData.projectType = selectedProjectType;
      }

      if (selectedDate !== null) {
        projectData.eventDate = DATE_OPTIONS[selectedDate].date.toISOString();
        projectData.hasEventDate = true;
      }

      if (venue.trim()) {
        projectData.venue = venue.trim();
      }

      if (notes.trim()) {
        projectData.notes = notes.trim();
      }

      await projectsApi.create(token, projectData, tenant);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      console.error("Failed to create project:", err);
      Alert.alert("Error", "Failed to create project. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedClient(contact);
  };

  const getClientName = (client: Contact): string => {
    return `${client.firstName} ${client.lastName}`.trim() || "Unknown";
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
          New Project
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <Animated.View
          entering={FadeInUp.duration(400).easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            TITLE *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5",
                color: theme.text,
                borderColor: isDark ? theme.border : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            placeholder="e.g., Sarah & Mike Wedding"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </Animated.View>

        {/* Client Selector */}
        <Animated.View
          entering={FadeInUp.delay(50)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            CLIENT *
          </ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowContactPicker(true);
            }}
            style={({ pressed }) => [
              styles.clientSelector,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5",
                borderColor: isDark ? theme.border : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            {selectedClient ? (
              <>
                <Avatar name={getClientName(selectedClient)} size={40} />
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientName, { color: theme.text }]}>
                    {getClientName(selectedClient)}
                  </Text>
                  {selectedClient.email && (
                    <Text
                      style={[
                        styles.clientEmail,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {selectedClient.email}
                    </Text>
                  )}
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textTertiary}
                />
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.clientPlaceholderIcon,
                    { backgroundColor: `${BlysColors.primary}15` },
                  ]}
                >
                  <Feather
                    name="user-plus"
                    size={20}
                    color={BlysColors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.clientPlaceholderText,
                    { color: theme.textTertiary },
                  ]}
                >
                  Select a client
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textTertiary}
                />
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Project Type Selection */}
        <Animated.View
          entering={FadeInUp.delay(100)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            PROJECT TYPE
          </ThemedText>
          <View style={styles.projectTypesContainer}>
            {PROJECT_TYPES.map((type) => {
              const isSelected = selectedProjectType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedProjectType(isSelected ? null : type.id);
                  }}
                  style={[
                    styles.projectTypePill,
                    {
                      backgroundColor: isSelected
                        ? type.color
                        : isDark
                          ? theme.backgroundSecondary
                          : "#F5F5F5",
                      borderColor: isSelected
                        ? type.color
                        : isDark
                          ? theme.border
                          : "#E5E7EB",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.projectTypeDot,
                      {
                        backgroundColor: isSelected ? "#FFFFFF" : type.color,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.projectTypeLabel,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Event Date Selection */}
        <Animated.View
          entering={FadeInUp.delay(150)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            EVENT DATE
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScrollView}
            contentContainerStyle={styles.dateScrollContent}
          >
            {DATE_OPTIONS.slice(0, 30).map((item, index) => {
              const isSelected = selectedDate === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(isSelected ? null : index);
                  }}
                  style={[
                    styles.dateOption,
                    {
                      backgroundColor: isSelected
                        ? BlysColors.primary
                        : isDark
                          ? theme.backgroundSecondary
                          : "#F5F5F5",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateOptionText,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Venue Input */}
        <Animated.View
          entering={FadeInUp.delay(200)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            VENUE
          </ThemedText>
          <View
            style={[
              styles.inputWithIcon,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5",
                borderColor: isDark ? theme.border : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <Feather
              name="map-pin"
              size={18}
              color={theme.textTertiary}
              style={{ marginRight: Spacing.sm }}
            />
            <TextInput
              style={[styles.inputInner, { color: theme.text }]}
              placeholder="Add venue location"
              placeholderTextColor={theme.textTertiary}
              value={venue}
              onChangeText={setVenue}
            />
          </View>
        </Animated.View>

        {/* Notes Input */}
        <Animated.View
          entering={FadeInUp.delay(250)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            NOTES
          </ThemedText>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5",
                color: theme.text,
                borderColor: isDark ? theme.border : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            placeholder="Add any notes or details..."
            placeholderTextColor={theme.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Animated.View>
      </ScrollView>

      {/* Save Button */}
      <View
        style={[
          styles.bottomContainer,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: BlysColors.primary },
            pressed &&
              !saving && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            saving && { opacity: 0.7 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Project</Text>
          )}
        </Pressable>
      </View>

      {/* Contact Picker Modal */}
      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelectContact={handleSelectContact}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: 100,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  clientSelector: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  clientInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "500",
  },
  clientEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  clientPlaceholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  clientPlaceholderText: {
    flex: 1,
    fontSize: 15,
    marginLeft: Spacing.md,
  },
  dateScrollView: {
    marginHorizontal: -Spacing.screenHorizontal,
  },
  dateScrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  dateOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  projectTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  projectTypePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  projectTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  projectTypeLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  notesInput: {
    height: 100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    fontSize: 15,
  },
  bottomContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  saveButton: {
    height: 54,
    borderRadius: BorderRadius.card,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
