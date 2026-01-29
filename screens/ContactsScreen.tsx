import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { ToolsStackParamList } from "@/navigation/ToolsStackNavigator";
import { contactsApi, Contact, createTenantContext } from "@/services/api";

type ContactsScreenNavigationProp = NativeStackNavigationProp<
  ToolsStackParamList,
  "Contacts"
>;

export default function ContactsScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<ContactsScreenNavigationProp>();
  const tabBarHeight = useBottomTabBarHeight();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create tenant context for multi-tenant routing
      const tenant = createTenantContext(user);

      const result = await contactsApi.getAll(token, tenant);
      setContacts(result);
    } catch (err) {
      console.error("Error loading contacts:", err);
      setError("Failed to load contacts");
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
    }, [token, user]),
  );

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const fullName =
      `${contact.firstName || ""} ${contact.lastName || ""}`.toLowerCase();
    return (
      fullName.includes(query) ||
      (contact.email?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleContactPress = (contactId: string) => {
    navigation.navigate("ContactDetail", { contactId });
  };

  const getContactName = (contact: Contact): string => {
    return (
      `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unknown"
    );
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScreenKeyboardAwareScrollView>
        <View style={styles.container}>
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search contacts..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <ThemedText
            style={[styles.resultCount, { color: theme.textSecondary }]}
          >
            {filteredContacts.length}{" "}
            {filteredContacts.length === 1 ? "contact" : "contacts"}
          </ThemedText>

          {error ? (
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
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={loadContacts}
              >
                <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : filteredContacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color={theme.textSecondary} />
              <ThemedText
                style={[styles.emptyText, { color: theme.textSecondary }]}
              >
                {searchQuery
                  ? "No contacts match your search"
                  : "No contacts yet"}
              </ThemedText>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => handleContactPress(contact.id)}
                style={({ pressed }) => [
                  styles.contactCard,
                  { backgroundColor: theme.backgroundSecondary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.contactHeader}>
                  <Avatar name={getContactName(contact)} size={48} />
                  <View style={styles.contactInfo}>
                    <ThemedText
                      style={[
                        styles.contactName,
                        {
                          fontSize: Typography.body.fontSize,
                          fontWeight: Typography.body.fontWeight as any,
                        },
                      ]}
                    >
                      {getContactName(contact)}
                    </ThemedText>
                    {contact.email ? (
                      <View style={styles.contactMeta}>
                        <Feather
                          name="mail"
                          size={14}
                          color={theme.textSecondary}
                        />
                        <ThemedText
                          style={[
                            styles.contactMetaText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {contact.email}
                        </ThemedText>
                      </View>
                    ) : null}
                    <View style={styles.contactMeta}>
                      <Feather
                        name="calendar"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <ThemedText
                        style={[
                          styles.contactMetaText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {contact.eventDate
                          ? `Event: ${formatDate(contact.eventDate)}`
                          : "No event date"}
                      </ThemedText>
                    </View>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScreenKeyboardAwareScrollView>

      {/* FAB for creating new contact */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.md },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate("AddContact");
        }}
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
  container: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  resultCount: {
    fontSize: 12,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  contactCard: {
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contactName: {
    marginBottom: Spacing.xs,
  },
  contactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  contactMetaText: {
    fontSize: 13,
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
  fab: {
    position: "absolute",
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
