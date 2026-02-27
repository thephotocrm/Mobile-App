import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ConversationCard } from "@/components/ConversationCard";
import { ContactPickerModal } from "@/components/ContactPickerModal";
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
import { useInbox } from "@/contexts/InboxContext";
import { inboxApi, createTenantContext, Contact } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<
  InboxStackParamList,
  "InboxList"
>;

type FilterTab = "recent" | "awaiting" | "unread";

interface ConversationItem {
  contactId: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  channel: "SMS" | "EMAIL";
  isYou?: boolean;
  isArchived?: boolean;
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

// Filter tab component
const FilterTabs = React.memo(function FilterTabs({
  activeTab,
  onTabChange,
  unreadCount,
}: {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  unreadCount: number;
}) {
  const { theme, isDark } = useTheme();

  const tabs: { key: FilterTab; label: string; badge?: number }[] = [
    { key: "recent", label: "Recent" },
    { key: "awaiting", label: "Awaiting Reply" },
    {
      key: "unread",
      label: "Unread",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ];

  return (
    <View style={styles.filterTabsContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabChange(tab.key);
            }}
            style={[
              styles.filterTab,
              isActive && {
                backgroundColor: isDark
                  ? `${MessagingColors.primary}30`
                  : `${MessagingColors.primary}15`,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                {
                  color: isActive
                    ? MessagingColors.primary
                    : theme.textSecondary,
                },
                isActive && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </ThemedText>
            {tab.badge && (
              <View
                style={[
                  styles.filterTabBadge,
                  { backgroundColor: MessagingColors.primary },
                ]}
              >
                <ThemedText style={styles.filterTabBadgeText}>
                  {tab.badge > 99 ? "99+" : tab.badge}
                </ThemedText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

// Memoized header component with local search state to prevent keyboard dismissal
const InboxHeader = React.memo(function InboxHeader({
  initialSearchQuery,
  onDebouncedSearchChange,
  onClearSearch,
  searchInputRef,
  activeTab,
  onTabChange,
  totalUnreadCount,
}: {
  initialSearchQuery: string;
  onDebouncedSearchChange: (query: string) => void;
  onClearSearch: () => void;
  searchInputRef: React.RefObject<TextInput | null>;
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  totalUnreadCount: number;
}) {
  const { theme, isDark } = useTheme();

  // Local state for search - prevents parent re-renders during typing
  const [localSearchQuery, setLocalSearchQuery] = useState(initialSearchQuery);

  // Sync local state when parent clears search
  useEffect(() => {
    setLocalSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Debounce and report to parent
  useEffect(() => {
    const timer = setTimeout(() => {
      onDebouncedSearchChange(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, onDebouncedSearchChange]);

  const handleClear = useCallback(() => {
    setLocalSearchQuery("");
    onClearSearch();
  }, [onClearSearch]);

  return (
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
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {localSearchQuery.length > 0 && (
          <Pressable
            onPress={handleClear}
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

      {/* Filter tabs */}
      <FilterTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        unreadCount={totalUnreadCount}
      />
    </View>
  );
});

export default function InboxScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const { decrementUnreadCount, refreshUnreadCount } = useInbox();
  const navigation = useNavigation<NavigationProp>();
  const { paddingTop, paddingBottom } = useScreenInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Separate cached data from filtered display data
  const [allConversations, setAllConversations] = useState<ConversationItem[]>(
    [],
  );
  const [archivedConversations, setArchivedConversations] = useState<
    Set<string>
  >(new Set());
  // Only store the debounced search query - local state lives in InboxHeader
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  // Used to signal InboxHeader to clear its local state
  const [initialSearchQuery, setInitialSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("recent");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const hasLoadedOnce = useRef(false);

  // Reload conversations when switching between "recent" and "awaiting" tabs
  // These require different API sort parameters, while "unread" is a client-side filter
  const prevTabRef = useRef<FilterTab>(activeTab);
  useEffect(() => {
    const prevTab = prevTabRef.current;
    const needsReload =
      (prevTab === "awaiting" && activeTab !== "awaiting") ||
      (prevTab !== "awaiting" && activeTab === "awaiting");

    if (needsReload && hasLoadedOnce.current) {
      loadConversations(true, activeTab);
    }
    prevTabRef.current = activeTab;
  }, [activeTab, token, user]);

  // Calculate total unread count
  const totalUnreadCount = React.useMemo(() => {
    return allConversations.reduce(
      (sum, conv) =>
        sum +
        (!archivedConversations.has(conv.contactId) ? conv.unreadCount : 0),
      0,
    );
  }, [allConversations, archivedConversations]);

  // Filter conversations based on search and tab
  const filteredConversations = React.useMemo(() => {
    let result = allConversations;

    // Filter by tab
    if (activeTab === "unread") {
      // Show only conversations with unread messages (excluding archived)
      result = result.filter(
        (conv) =>
          conv.unreadCount > 0 && !archivedConversations.has(conv.contactId),
      );
    } else {
      // "recent" and "awaiting" tabs - exclude archived
      // (these tabs show all conversations, just sorted differently via API)
      result = result.filter(
        (conv) => !archivedConversations.has(conv.contactId),
      );
    }

    // Filter by search query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.trim().toLowerCase();
      result = result.filter(
        (conversation) =>
          conversation.contactName.toLowerCase().includes(query) ||
          conversation.lastMessage.toLowerCase().includes(query),
      );
    }

    return result;
  }, [
    allConversations,
    debouncedSearchQuery,
    activeTab,
    archivedConversations,
  ]);

  const loadConversations = async (isRefresh = false, tab?: FilterTab) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Only show skeleton on initial load, not on refocus
      if (!isRefresh && !hasLoadedOnce.current) {
        setLoading(true);
      }
      setError(null);

      // Create tenant context for multi-tenant routing
      const tenant = createTenantContext(user);

      // Determine sortBy based on active tab - "awaiting" uses lastReply to surface
      // conversations where clients replied most recently
      const currentTab = tab ?? activeTab;
      const sortBy = currentTab === "awaiting" ? "lastReply" : "recent";

      // Use the correct inbox API endpoint with sortBy parameter
      const apiConversations = await inboxApi.getConversations(
        token,
        tenant,
        sortBy,
      );

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
      hasLoadedOnce.current = true;

      // Sync the global badge count with actual data
      refreshUnreadCount();
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
    loadConversations(true, activeTab);
  }, [token, user, activeTab]);

  const handleClearSearch = useCallback(() => {
    setInitialSearchQuery("");
    setDebouncedSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  const handleDebouncedSearchChange = useCallback((query: string) => {
    setDebouncedSearchQuery(query);
  }, []);

  const handleTabChange = useCallback((tab: FilterTab) => {
    setActiveTab(tab);
  }, []);

  const handleConversationPress = (conversation: ConversationItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Clear unread count locally and update global badge when opening conversation
    if (conversation.unreadCount > 0) {
      setAllConversations((prev) =>
        prev.map((conv) =>
          conv.contactId === conversation.contactId
            ? { ...conv, unreadCount: 0 }
            : conv,
        ),
      );
      // Immediately update the global badge count
      decrementUnreadCount(conversation.unreadCount);
    }

    navigation.navigate("ThreadDetail", {
      conversationId: conversation.contactId,
      contactName: conversation.contactName,
    });
  };

  const handleArchive = (contactId: string) => {
    setArchivedConversations((prev) => {
      const newSet = new Set(prev);
      newSet.add(contactId);
      return newSet;
    });
    // Show toast or feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleMarkUnread = (contactId: string) => {
    setAllConversations((prev) =>
      prev.map((conv) =>
        conv.contactId === contactId
          ? { ...conv, unreadCount: Math.max(conv.unreadCount, 1) }
          : conv,
      ),
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleUnarchive = (contactId: string) => {
    setArchivedConversations((prev) => {
      const newSet = new Set(prev);
      newSet.delete(contactId);
      return newSet;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleNewMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowContactPicker(true);
  };

  const handleSelectContact = (contact: Contact) => {
    const contactName = `${contact.firstName} ${contact.lastName}`.trim();
    navigation.navigate("ThreadDetail", {
      conversationId: contact.id,
      contactName,
    });
  };

  const handleStartConversation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowContactPicker(true);
  };

  const silentRefreshConversations = useCallback(async () => {
    if (!token) return;
    try {
      const tenant = createTenantContext(user);
      const currentTab = activeTab;
      const sortBy = currentTab === "awaiting" ? "lastReply" : "recent";
      const apiConversations = await inboxApi.getConversations(
        token,
        tenant,
        sortBy,
      );

      const result: ConversationItem[] = apiConversations.map((conv) => {
        const firstName = conv.contact?.firstName || "";
        const lastName = conv.contact?.lastName || "";
        const contactName = `${firstName} ${lastName}`.trim() || "Unknown";
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
      refreshUnreadCount();
    } catch (err) {
      console.error("Silent refresh conversations error:", err);
    }
  }, [token, user, activeTab, refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      // Refresh the global badge count when returning to inbox
      refreshUnreadCount();
    }, [token, user]),
  );

  useAutoRefresh(silentRefreshConversations, 30000);

  const renderConversation = useCallback(
    ({ item, index }: { item: ConversationItem; index: number }) => {
      const isArchived = archivedConversations.has(item.contactId);

      return (
        <ConversationCard
          contactName={item.contactName}
          lastMessage={item.lastMessage}
          timestamp={item.timestamp}
          unreadCount={item.unreadCount}
          isYou={item.isYou}
          isLast={index === filteredConversations.length - 1}
          onPress={() => handleConversationPress(item)}
          onArchive={
            isArchived ? undefined : () => handleArchive(item.contactId)
          }
          onMarkUnread={
            isArchived
              ? () => handleUnarchive(item.contactId)
              : () => handleMarkUnread(item.contactId)
          }
        />
      );
    },
    [filteredConversations.length, archivedConversations],
  );

  const renderEmpty = () => {
    const getEmptyIcon = () => {
      if (activeTab === "awaiting") return "check-circle";
      return "inbox";
    };

    const getEmptyTitle = () => {
      if (debouncedSearchQuery) return "No results found";
      if (activeTab === "unread") return "All caught up!";
      if (activeTab === "awaiting") return "All caught up!";
      return "No conversations yet";
    };

    const getEmptyText = () => {
      if (debouncedSearchQuery)
        return `No conversations match "${debouncedSearchQuery}"`;
      if (activeTab === "unread") return "You have no unread messages";
      if (activeTab === "awaiting") return "No clients are waiting for a reply";
      return "Start messaging your clients to stay connected";
    };

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: `${MessagingColors.primary}15` },
          ]}
        >
          <Feather
            name={getEmptyIcon()}
            size={36}
            color={MessagingColors.primary}
          />
        </View>
        <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
          {getEmptyTitle()}
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
          {getEmptyText()}
        </ThemedText>
        {!debouncedSearchQuery && activeTab === "recent" && (
          <Pressable
            onPress={handleStartConversation}
            style={[
              styles.emptyButton,
              { backgroundColor: MessagingColors.primary },
            ]}
          >
            <Feather name="message-circle" size={18} color="#FFFFFF" />
            <ThemedText style={styles.emptyButtonText}>
              Start a Conversation
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

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
        <InboxHeader
          initialSearchQuery={initialSearchQuery}
          onDebouncedSearchChange={handleDebouncedSearchChange}
          onClearSearch={handleClearSearch}
          searchInputRef={searchInputRef}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          totalUnreadCount={totalUnreadCount}
        />
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
        <InboxHeader
          initialSearchQuery={initialSearchQuery}
          onDebouncedSearchChange={handleDebouncedSearchChange}
          onClearSearch={handleClearSearch}
          searchInputRef={searchInputRef}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          totalUnreadCount={totalUnreadCount}
        />
        {renderError()}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot, paddingTop },
      ]}
    >
      {/* Header outside FlatList to prevent keyboard dismiss on search */}
      <InboxHeader
        initialSearchQuery={initialSearchQuery}
        onDebouncedSearchChange={handleDebouncedSearchChange}
        onClearSearch={handleClearSearch}
        searchInputRef={searchInputRef}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        totalUnreadCount={totalUnreadCount}
      />
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.contactId}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom },
          filteredConversations.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[MessagingColors.primary]}
            tintColor={MessagingColors.primary}
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

      {/* Contact Picker Modal */}
      <ContactPickerModal
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelectContact={handleSelectContact}
      />
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
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  // Filter tabs
  filterTabsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 20,
    gap: 6,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filterTabTextActive: {
    fontWeight: "600",
  },
  filterTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterTabBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
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
