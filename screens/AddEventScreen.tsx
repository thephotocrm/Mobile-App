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
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, Easing } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import {
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  CalendarColors,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { bookingsApi, createTenantContext } from "@/services/api";

// Event categories
const CATEGORIES = [
  { id: "shooting", label: "Shooting", color: CalendarColors.categoryShooting },
  {
    id: "consultation",
    label: "Consultation",
    color: CalendarColors.categoryConsultation,
  },
  { id: "meeting", label: "Meeting", color: CalendarColors.categoryMeeting },
  { id: "editing", label: "Editing", color: CalendarColors.categoryOuting },
  { id: "other", label: "Other", color: CalendarColors.categoryOther },
];

// Generate time options (every 30 minutes)
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period = h >= 12 ? "PM" : "AM";
      const minute = m.toString().padStart(2, "0");
      times.push(`${hour}:${minute} ${period}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

// Generate dates for selection
const generateDateOptions = () => {
  const dates: { date: Date; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < 14; i++) {
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

// Parse time string like "10:00 AM" to hours and minutes
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return { hours: 10, minutes: 0 };

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
};

export function AddEventScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("shooting");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for the event");
      return;
    }

    if (!token) {
      Alert.alert("Error", "You must be logged in to create events");
      return;
    }

    setSaving(true);
    try {
      const tenant = createTenantContext(user);
      const selectedDateObj = DATE_OPTIONS[selectedDate].date;

      // Parse start and end times
      const startParsed = parseTime(startTime);
      const endParsed = parseTime(endTime);

      // Create start and end DateTime objects
      const startDateTime = new Date(selectedDateObj);
      startDateTime.setHours(startParsed.hours, startParsed.minutes, 0, 0);

      const endDateTime = new Date(selectedDateObj);
      endDateTime.setHours(endParsed.hours, endParsed.minutes, 0, 0);

      await bookingsApi.create(
        token,
        {
          title: title.trim(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          location: location.trim() || undefined,
          notes: notes.trim() || `Category: ${selectedCategory}`,
          status: "PENDING",
        },
        tenant,
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      console.error("Failed to create event:", err);
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setSaving(false);
    }
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
          New Event
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Selection */}
        <Animated.View
          entering={FadeInUp.duration(400).easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            DATE
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScrollView}
            contentContainerStyle={styles.dateScrollContent}
          >
            {DATE_OPTIONS.map((item, index) => {
              const isSelected = selectedDate === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(index);
                  }}
                  style={[
                    styles.dateOption,
                    {
                      backgroundColor: isSelected
                        ? CalendarColors.primary
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

        {/* Time Selection */}
        <Animated.View
          entering={FadeInUp.delay(100)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            TIME
          </ThemedText>
          <View
            style={[
              styles.timeContainer,
              {
                backgroundColor: isDark ? theme.backgroundSecondary : "#F5F5F5",
                borderColor: isDark ? theme.border : "transparent",
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <View style={styles.timeColumn}>
              <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>
                FROM
              </Text>
              <ScrollView
                style={styles.timeScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={44}
                decelerationRate="fast"
              >
                {TIME_OPTIONS.map((time, index) => {
                  const isSelected = startTime === time;
                  return (
                    <Pressable
                      key={index}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setStartTime(time);
                      }}
                      style={[
                        styles.timeOption,
                        isSelected && {
                          backgroundColor: isDark
                            ? CalendarColors.primaryDark
                            : CalendarColors.eventCardBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          {
                            color: isSelected
                              ? CalendarColors.primary
                              : theme.text,
                            fontWeight: isSelected ? "700" : "400",
                          },
                        ]}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.timeDivider}>
              <Feather
                name="chevron-right"
                size={20}
                color={CalendarColors.primary}
              />
            </View>

            <View style={styles.timeColumn}>
              <Text style={[styles.timeLabel, { color: theme.textTertiary }]}>
                TO
              </Text>
              <ScrollView
                style={styles.timeScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={44}
                decelerationRate="fast"
              >
                {TIME_OPTIONS.map((time, index) => {
                  const isSelected = endTime === time;
                  return (
                    <Pressable
                      key={index}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEndTime(time);
                      }}
                      style={[
                        styles.timeOption,
                        isSelected && {
                          backgroundColor: isDark
                            ? CalendarColors.primaryDark
                            : CalendarColors.eventCardBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          {
                            color: isSelected
                              ? CalendarColors.primary
                              : theme.text,
                            fontWeight: isSelected ? "700" : "400",
                          },
                        ]}
                      >
                        {time}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Animated.View>

        {/* Category Selection */}
        <Animated.View
          entering={FadeInUp.delay(200)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            CATEGORY
          </ThemedText>
          <View style={styles.categoriesContainer}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(category.id);
                  }}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected
                        ? category.color
                        : isDark
                          ? theme.backgroundSecondary
                          : "#F5F5F5",
                      borderColor: isSelected
                        ? category.color
                        : isDark
                          ? theme.border
                          : "#E5E7EB",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      {
                        backgroundColor: isSelected
                          ? "#FFFFFF"
                          : category.color,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Title Input */}
        <Animated.View
          entering={FadeInUp.delay(300)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            TITLE
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
            placeholder="Event title (e.g., Sarah & James)"
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </Animated.View>

        {/* Location Input */}
        <Animated.View
          entering={FadeInUp.delay(350)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            LOCATION
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
              placeholder="Add location"
              placeholderTextColor={theme.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </Animated.View>

        {/* Notes Input */}
        <Animated.View
          entering={FadeInUp.delay(400)
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
            { backgroundColor: CalendarColors.primary },
            pressed && !saving && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            saving && { opacity: 0.7 },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Event</Text>
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
  timeContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.card,
    padding: Spacing.sm,
    height: 180,
  },
  timeColumn: {
    flex: 1,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  timeScroll: {
    flex: 1,
    width: "100%",
  },
  timeOption: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    marginVertical: 2,
  },
  timeText: {
    fontSize: 16,
  },
  timeDivider: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "500",
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
