import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ConversationCard } from "@/components/ConversationCard";
import { ThemedText } from "@/components/ThemedText";
import { Skeleton } from "@/components/Skeleton";
import { InboxStackParamList } from "@/navigation/InboxStackNavigator";
import {
  Spacing,
  BorderRadius,
  MessagingColors,
  Shadows,
} from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useAuth } from "@/contexts/AuthContext";
import { inboxApi, createTenantContext } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<
  InboxStackParamList,
  "InboxList"
>;

interface ConversationItem {
  contactId: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  channel: "SMS" | "EMAIL";
  isYou?: boolean;
}

const formatTimestamp = (dateString?: string): string => {
  if (!dateString) return "";

  // Handle timestamps with space separator (e.g., "2025-11-28 19:47:20.215071")
  // by replacing the space with 'T' for ISO format parsing
  const isoDateString =
    dateString.includes(" ") && !dateString.includes("T")
      ? dateString.replace(" ", "T") + "Z"
      : dateString;

  const date = new Date(isoDateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 0) return "Just now";
    return `${minutes}m ago`;
  } else if (diffHours < 24) {
    // Show time like "3:44 pm"
    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  } else if (diffDays < 7) {
    // Show day of week
    return date.toLocaleDateString("en-US", { weekday: "long" });
  } else {
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  }
};

// Skeleton loader for conversation cards
const ConversationSkeleton = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.skeletonCard, { borderBottomColor: theme.border }]}>
      <Skeleton width={52} height={52} borderRadius={26} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonHeader}>
          <Skeleton width={140} height={16} borderRadius={4} />
          <Skeleton width={60} height={12} borderRadius={4} />
        </View>
        <Skeleton width="85%" height={14} borderRadius={4} />
      </View>
    </View>
  );
};

export default function InboxScreen() {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Separate cached data from filtered display data
  const [allConversations, setAllConversations] = useState<ConversationItem[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null);

  // Filter conversations client-side (no API call)
  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return allConversations;

    const query = searchQuery.trim().toLowerCase();
    return allConversations.filter(
      (conversation) =>
        conversation.contactName.toLowerCase().includes(query) ||
        conversation.lastMessage.toLowerCase().includes(query),
    );
  }, [allConversations, searchQuery]);

  const loadConversations = async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      // Create tenant context for multi-tenant routing
      const tenant = createTenantContext(user);

      // Use the correct inbox API endpoint
      const apiConversations = await inboxApi.getConversations(token, tenant);

      // Transform API response to UI format
      const result: ConversationItem[] = apiConversations.map((conv) => {
        // Build contact name from firstName + lastName
        const firstName = conv.contact?.firstName || "";
        const lastName = conv.contact?.lastName || "";
        const contactName = `${firstName} ${lastName}`.trim() || "Unknown";

        // Check if last message was from user (outbound)
        const isYou = conv.lastMessageDirection === "OUTBOUND";

        return {
          contactId: conv.contact?.id || "",
          contactName,
          lastMessage: conv.lastMessage || "No messages yet",
          timestamp: formatTimestamp(conv.lastMessageAt),
          unreadCount: conv.unreadCount || 0,
          channel: "SMS" as const,
          isYou,
        };
      });

      setAllConversations(result);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Failed to load conversations");
      setAllConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadConversations(true);
  }, [token, user]);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleConversationPress = (conversation: ConversationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ThreadDetail", {
      conversationId: conversation.contactId,
      contactName: conversation.contactName,
    });
  };

  const handleNewMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("New Message", "Select a contact to start a new conversation");
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [token, user]),
  );

  const renderConversation = useCallback(
    ({ item, index }: { item: ConversationItem; index: number }) => (
      <ConversationCard
        contactName={item.contactName}
        lastMessage={item.lastMessage}
        timestamp={item.timestamp}
        unreadCount={item.unreadCount}
        isYou={item.isYou}
        isLast={index === filteredConversations.length - 1}
        onPress={() => handleConversationPress(item)}
      />
    ),
    [filteredConversations.length],
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search bar */}
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
          placeholder="Search"
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
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
              <Feather name="x" size={10} color={isDark ? "#000" : "#FFF"} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: `${MessagingColors.primary}15` },
        ]}
      >
        <Feather name="inbox" size={32} color={MessagingColors.primary} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? "No results found" : "No conversations yet"}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {searchQuery
          ? `No conversations match "${searchQuery}"`
          : "Start a conversation with a client to see it here"}
      </ThemedText>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: "#EF444415" }]}>
        <Feather name="alert-circle" size={32} color="#EF4444" />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        Something went wrong
      </ThemedText>
      <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
        {error}
      </ThemedText>
      <Pressable
        style={[
          styles.retryButton,
          { backgroundColor: MessagingColors.primary },
        ]}
        onPress={() => loadConversations()}
      >
        <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
      </Pressable>
    </View>
  );

  const renderSkeleton = () => (
    <View>
      {renderHeader()}
      {[1, 2, 3, 4, 5].map((i) => (
        <ConversationSkeleton key={i} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop },
        ]}
      >
        {renderSkeleton()}
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot, paddingTop },
        ]}
      >
        {renderHeader()}
        {renderError()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.contactId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop, paddingBottom },
          filteredConversations.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[MessagingColors.primary]}
            tintColor={MessagingColors.primary}
            progressViewOffset={paddingTop}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* FAB for new message */}
      <Pressable
        onPress={handleNewMessage}
        style={({ pressed }) => [
          styles.fab,
          { bottom: tabBarHeight + Spacing.md },
          pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  emptyListContent: {
    flex: 1,
  },
  // Header styles
  headerContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  // Search styles
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
  // Skeleton styles
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // FAB styles
  fab: {
    position: "absolute",
    right: Spacing.screenHorizontal,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MessagingColors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.lg,
  },
});
