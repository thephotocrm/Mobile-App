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
import { Spacing, BorderRadius, Shadows, BlysColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi, createTenantContext } from "@/services/api";

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

export function AddContactScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert(
        "Missing First Name",
        "Please enter a first name for the contact",
      );
      return;
    }

    if (!lastName.trim()) {
      Alert.alert(
        "Missing Last Name",
        "Please enter a last name for the contact",
      );
      return;
    }

    if (!token) {
      Alert.alert("Error", "You must be logged in to create contacts");
      return;
    }

    setSaving(true);
    try {
      const tenant = createTenantContext(user);

      const contactData: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (email.trim()) {
        contactData.email = email.trim();
      }

      if (phone.trim()) {
        contactData.phone = phone.trim();
      }

      if (selectedDate !== null) {
        contactData.eventDate = DATE_OPTIONS[selectedDate].date.toISOString();
        contactData.hasEventDate = true;
      }

      if (notes.trim()) {
        contactData.notes = notes.trim();
      }

      await contactsApi.create(token, contactData, tenant);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      console.error("Failed to create contact:", err);
      Alert.alert("Error", "Failed to create contact. Please try again.");
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
          New Contact
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* First Name Input */}
        <Animated.View
          entering={FadeInUp.duration(400).easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            FIRST NAME *
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
            placeholder="First name"
            placeholderTextColor={theme.textTertiary}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </Animated.View>

        {/* Last Name Input */}
        <Animated.View
          entering={FadeInUp.delay(50)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            LAST NAME *
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
            placeholder="Last name"
            placeholderTextColor={theme.textTertiary}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </Animated.View>

        {/* Email Input */}
        <Animated.View
          entering={FadeInUp.delay(100)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            EMAIL
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
              name="mail"
              size={18}
              color={theme.textTertiary}
              style={{ marginRight: Spacing.sm }}
            />
            <TextInput
              style={[styles.inputInner, { color: theme.text }]}
              placeholder="Email address"
              placeholderTextColor={theme.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </Animated.View>

        {/* Phone Input */}
        <Animated.View
          entering={FadeInUp.delay(150)
            .duration(400)
            .easing(Easing.out(Easing.cubic))}
        >
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            PHONE
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
              name="phone"
              size={18}
              color={theme.textTertiary}
              style={{ marginRight: Spacing.sm }}
            />
            <TextInput
              style={[styles.inputInner, { color: theme.text }]}
              placeholder="Phone number"
              placeholderTextColor={theme.textTertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </Animated.View>

        {/* Event Date Selection */}
        <Animated.View
          entering={FadeInUp.delay(200)
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
            <Text style={styles.saveButtonText}>Save Contact</Text>
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
