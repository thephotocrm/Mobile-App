import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "./Avatar";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi, createTenantContext, Contact } from "@/services/api";
import { Spacing, MessagingColors } from "@/constants/theme";

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
}

export function ContactPickerModal({
  visible,
  onClose,
  onSelectContact,
}: ContactPickerModalProps) {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const loadContacts = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const tenant = createTenantContext(user);
      const result = await contactsApi.getAll(token, tenant);
      setContacts(result);
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadContacts();
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
    } else {
      setSearchQuery("");
    }
  }, [visible, token, user]);

  // Filter contacts based on search query with debounce
  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;

    const query = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
      const email = contact.email?.toLowerCase() || "";
      const phone = contact.phone?.toLowerCase() || "";
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    });
  }, [contacts, searchQuery]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleSelectContact = (contact: Contact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectContact(contact);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const fullName = `${item.firstName} ${item.lastName}`.trim();
    const subtitle = item.phone || item.email || "";

    return (
      <Pressable
        onPress={() => handleSelectContact(item)}
        style={({ pressed }) => [
          styles.contactItem,
          { borderBottomColor: theme.border },
          pressed && { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Avatar name={fullName} size={44} />
        <View style={styles.contactInfo}>
          <ThemedText style={[styles.contactName, { color: theme.text }]}>
            {fullName}
          </ThemedText>
          {subtitle && (
            <ThemedText
              style={[styles.contactSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>
        <Feather name="chevron-right" size={18} color={theme.textTertiary} />
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: `${MessagingColors.primary}15` },
        ]}
      >
        <Feather name="users" size={28} color={MessagingColors.primary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? "No contacts found" : "No contacts yet"}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {searchQuery
          ? `No contacts match "${searchQuery}"`
          : "Add contacts to start messaging them"}
      </ThemedText>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThemedText
              style={[
                styles.closeButtonText,
                { color: MessagingColors.primary },
              ]}
            >
              Cancel
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
            New Message
          </ThemedText>
          <View style={styles.headerRight} />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchWrapper,
              {
                backgroundColor: isDark
                  ? MessagingColors.searchBgDark
                  : MessagingColors.searchBg,
              },
            ]}
          >
            <Feather
              name="search"
              size={18}
              color={theme.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              placeholder="Search contacts"
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={handleClearSearch}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View
                  style={[
                    styles.clearButtonCircle,
                    { backgroundColor: theme.textSecondary },
                  ]}
                >
                  <Feather
                    name="x"
                    size={10}
                    color={isDark ? "#000" : "#FFF"}
                  />
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Contact List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MessagingColors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={[
              styles.listContent,
              filteredContacts.length === 0 && styles.emptyListContent,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 60,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerRight: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.sm,
  },
  clearButton: {
    marginLeft: Spacing.sm,
  },
  clearButtonCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flex: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
  },
  contactSubtitle: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
