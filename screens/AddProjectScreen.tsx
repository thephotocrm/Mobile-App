import React, { useState, useEffect } from "react";
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
  Modal,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, Easing } from "react-native-reanimated";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
  projectTypesApi,
  createTenantContext,
  ProjectType,
  ProjectTypeRecord,
  Contact,
} from "@/services/api";
import { ProjectsStackParamList } from "@/navigation/ProjectsStackNavigator";

type AddProjectRouteProp = RouteProp<ProjectsStackParamList, "AddProject">;
type AddProjectNavigationProp = NativeStackNavigationProp<
  ProjectsStackParamList,
  "AddProject"
>;

// Format date for display
const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export function AddProjectScreen() {
  const navigation = useNavigation<AddProjectNavigationProp>();
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
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Project types from API
  const [projectTypes, setProjectTypes] = useState<ProjectTypeRecord[]>([]);
  const [loadingProjectTypes, setLoadingProjectTypes] = useState(true);

  // Fetch project types on mount
  useEffect(() => {
    const fetchProjectTypes = async () => {
      if (!token) return;

      try {
        const tenant = createTenantContext(user);
        const types = await projectTypesApi.getAll(token, tenant);
        setProjectTypes(types);

        // If we have an initial type from params, verify it exists
        if (initialProjectType) {
          const typeExists = types.some(t => t.slug === initialProjectType);
          if (!typeExists) {
            setSelectedProjectType(null);
          }
        }

        // If no type selected, use the default one
        if (!initialProjectType) {
          const defaultType = types.find(t => t.isDefault);
          if (defaultType) {
            setSelectedProjectType(defaultType.slug as ProjectType);
          }
        }
      } catch (err) {
        console.error("Failed to fetch project types:", err);
      } finally {
        setLoadingProjectTypes(false);
      }
    };

    fetchProjectTypes();
  }, [token, user, initialProjectType]);

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

      if (eventDate) {
        projectData.eventDate = eventDate.toISOString();
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
      navigation.navigate("ProjectsList", { refresh: Date.now() });
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
          {loadingProjectTypes ? (
            <View style={styles.projectTypesLoading}>
              <ActivityIndicator size="small" color={BlysColors.primary} />
            </View>
          ) : (
            <View style={styles.projectTypesContainer}>
              {projectTypes.map((type) => {
                const isSelected = selectedProjectType === type.slug;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedProjectType(
                        isSelected ? null : (type.slug as ProjectType)
                      );
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
                      {type.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
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
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDatePicker(true);
            }}
            style={({ pressed }) => [
              styles.dateSelector,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5",
                borderColor: isDark ? theme.border : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather
              name="calendar"
              size={18}
              color={eventDate ? BlysColors.primary : theme.textTertiary}
              style={{ marginRight: Spacing.sm }}
            />
            <Text
              style={[
                styles.dateSelectorText,
                {
                  color: eventDate ? theme.text : theme.textTertiary,
                },
              ]}
            >
              {eventDate ? formatDateDisplay(eventDate) : "Select event date"}
            </Text>
            {eventDate && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEventDate(null);
                }}
                style={styles.clearDateButton}
              >
                <Feather name="x" size={16} color={theme.textTertiary} />
              </Pressable>
            )}
          </Pressable>

          {/* Date Picker Modal for iOS / Inline for Android */}
          {Platform.OS === "ios" ? (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.datePickerModalOverlay}>
                <View
                  style={[
                    styles.datePickerModalContent,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <View style={styles.datePickerHeader}>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.datePickerCancel, { color: theme.textSecondary }]}>
                        Cancel
                      </Text>
                    </Pressable>
                    <ThemedText style={styles.datePickerTitle}>
                      Select Date
                    </ThemedText>
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={[styles.datePickerDone, { color: BlysColors.primary }]}>
                        Done
                      </Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={eventDate || new Date()}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                      if (date) {
                        setEventDate(date);
                      }
                    }}
                    style={styles.datePicker}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={eventDate || new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  setShowDatePicker(false);
                  if (event.type === "set" && date) {
                    setEventDate(date);
                  }
                }}
              />
            )
          )}
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
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 15,
  },
  clearDateButton: {
    padding: Spacing.xs,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  datePickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerCancel: {
    fontSize: 16,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: "600",
  },
  datePicker: {
    height: 200,
  },
  projectTypesLoading: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
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
