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
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInUp, Easing } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { POSE_CATEGORIES, PoseCategory, PoseTag } from "@/constants/poses";
import { TagFilterChips } from "@/components/poses/TagFilterChips";
import { posesApi, createTenantContext } from "@/services/api";

export function AddPoseScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<PoseCategory>("custom");
  const [selectedTags, setSelectedTags] = useState<PoseTag[]>([]);
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to add poses.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to take photos.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTagToggle = (tag: PoseTag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    if (!imageUri) {
      Alert.alert(
        "Missing Image",
        "Please select or take a photo for the pose",
      );
      return;
    }

    setSaving(true);

    try {
      // If authenticated, save to API
      if (token && user) {
        const tenant = createTenantContext(user);
        await posesApi.createCustomPose(
          token,
          {
            imageUrl: imageUri,
            category: selectedCategory,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            title: title.trim() || undefined,
            notes: notes.trim() || undefined,
          },
          tenant,
        );
      } else {
        // Offline mode - just simulate save
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      if (__DEV__) {
        console.error("Failed to save pose:", err);
      }
      Alert.alert("Error", "Failed to save pose. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Filter out 'all' from categories for selection
  const selectableCategories = POSE_CATEGORIES.filter((c) => c.id !== "all");

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
          Add Pose
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker */}
        <Animated.View
          entering={FadeInUp.duration(400).easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            PHOTO *
          </ThemedText>

          {imageUri ? (
            <Pressable onPress={handlePickImage} style={styles.imagePreview}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.changeImageOverlay}>
                <Feather name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.changeImageText}>Change Photo</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.imagePickerContainer}>
              <Pressable
                onPress={handlePickImage}
                style={({ pressed }) => [
                  styles.imagePickerButton,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : "#F5F5F5",
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="image" size={32} color={theme.textSecondary} />
                <Text style={[styles.imagePickerText, { color: theme.text }]}>
                  Choose from Library
                </Text>
              </Pressable>

              <Pressable
                onPress={handleTakePhoto}
                style={({ pressed }) => [
                  styles.imagePickerButton,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundSecondary
                      : "#F5F5F5",
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="camera" size={32} color={theme.textSecondary} />
                <Text style={[styles.imagePickerText, { color: theme.text }]}>
                  Take Photo
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Category Selection */}
        <Animated.View
          entering={FadeInUp.delay(50)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            CATEGORY
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {selectableCategories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(category.id);
                  }}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: isSelected
                        ? BlysColors.primary
                        : isDark
                          ? theme.backgroundSecondary
                          : "#F5F5F5",
                    },
                  ]}
                >
                  <Feather
                    name={category.icon as keyof typeof Feather.glyphMap}
                    size={16}
                    color={isSelected ? "#FFFFFF" : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryOptionText,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Tag Selection */}
        <Animated.View
          entering={FadeInUp.delay(75)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            TAGS (OPTIONAL)
          </ThemedText>
          <ThemedText
            style={[styles.labelSubtext, { color: theme.textTertiary }]}
          >
            Add tags to help filter this pose later
          </ThemedText>
          <View style={styles.tagFilterContainer}>
            <TagFilterChips
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
              showGroupLabels={true}
            />
          </View>
        </Animated.View>

        {/* Title Input */}
        <Animated.View
          entering={FadeInUp.delay(100)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            TITLE (OPTIONAL)
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
            placeholder="e.g., Walking Hand in Hand"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </Animated.View>

        {/* Notes Input */}
        <Animated.View
          entering={FadeInUp.delay(150)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            NOTES (OPTIONAL)
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
            placeholder="Add posing tips or reminders..."
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
          disabled={saving || !imageUri}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: BlysColors.primary },
            pressed &&
              !saving && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            (saving || !imageUri) && { opacity: 0.5 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Pose</Text>
          )}
        </Pressable>
      </View>
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
  labelSubtext: {
    fontSize: 12,
    marginBottom: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  imagePickerContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  imagePickerButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  imagePickerText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changeImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
  },
  changeImageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryScrollView: {
    marginHorizontal: -Spacing.screenHorizontal,
  },
  categoryScrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.chip,
    gap: Spacing.xs,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tagFilterContainer: {
    marginTop: Spacing.xs,
  },
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
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
