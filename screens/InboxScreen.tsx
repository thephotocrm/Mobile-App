import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ConversationCard } from "@/components/ConversationCard";
import { Input } from "@/components/Input";
import { ThemedText } from "@/components/ThemedText";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { InboxStackParamList } from "@/navigation/InboxStackNavigator";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { inboxApi, InboxConversationApiResponse, createTenantContext } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<InboxStackParamList, "InboxList">;

interface ConversationItem {
  contactId: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  channel: "SMS" | "EMAIL";
}

const formatTimestamp = (dateString?: string): string => {
  if (!dateString) return "";
  
  // Handle timestamps with space separator (e.g., "2025-11-28 19:47:20.215071")
  // by replacing the space with 'T' for ISO format parsing
  const isoDateString = dateString.includes(' ') && !dateString.includes('T') 
    ? dateString.replace(' ', 'T') + 'Z'
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
    return `${Math.floor(diffHours)}h ago`;
  } else if (diffDays < 7) {
    return `${Math.floor(diffDays)}d ago`;
  } else {
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  }
};

export default function InboxScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create tenant context for multi-tenant routing
      const tenant = createTenantContext(user);
      
      // Use the correct inbox API endpoint
      const apiConversations = await inboxApi.getConversations(token, tenant) as unknown as InboxConversationApiResponse[];

      // Transform API response to UI format
      let result: ConversationItem[] = apiConversations.map((conv: InboxConversationApiResponse) => {
        // Build contact name from firstName + lastName
        const firstName = conv.contact?.firstName || "";
        const lastName = conv.contact?.lastName || "";
        const contactName = `${firstName} ${lastName}`.trim() || "Unknown";
        
        return {
          contactId: conv.contact?.id || "",
          contactName,
          lastMessage: conv.lastMessage || "No messages yet",
          timestamp: formatTimestamp(conv.lastMessageAt),
          unreadCount: conv.unreadCount || 0,
          channel: "SMS" as const,
        };
      });

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        result = result.filter(
          (conversation) =>
            conversation.contactName.toLowerCase().includes(query) ||
            conversation.lastMessage.toLowerCase().includes(query)
        );
      }

      setConversations(result);
    } catch (err) {
      console.error("Error loading conversations:", err);
      setError("Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadConversations();
    }, [searchQuery, token, user])
  );

  return (
    <ScreenScrollView>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText style={[styles.errorText, { color: theme.textSecondary }]}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadConversations}
          >
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.conversationList}>
          {conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                {searchQuery ? "No conversations match your search" : "No conversations yet"}
              </ThemedText>
            </View>
          ) : (
            conversations.map((conversation, index) => (
              <ConversationCard
                key={conversation.contactId}
                contactName={conversation.contactName}
                lastMessage={conversation.lastMessage}
                timestamp={conversation.timestamp}
                unreadCount={conversation.unreadCount}
                isLast={index === conversations.length - 1}
                onPress={() =>
                  navigation.navigate("ThreadDetail", {
                    conversationId: conversation.contactId,
                    contactName: conversation.contactName,
                  })
                }
              />
            ))
          )}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  searchWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: Spacing.md,
    top: "50%",
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  conversationList: {
    paddingBottom: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
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
});
