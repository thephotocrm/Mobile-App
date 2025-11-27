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
import { conversationsApi, Conversation } from "@/services/api";

type NavigationProp = NativeStackNavigationProp<InboxStackParamList, "InboxList">;

interface ConversationItem {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

const formatTimestamp = (dateString?: string): string => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const minutes = Math.floor(diffMs / (1000 * 60));
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
  const { token } = useAuth();
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

      const apiConversations = await conversationsApi.getAll(token);

      let result: ConversationItem[] = apiConversations.map((conv: Conversation) => ({
        id: conv.id,
        contactName: conv.client
          ? `${conv.client.firstName || ""} ${conv.client.lastName || ""}`.trim() || "Unknown"
          : "Unknown",
        lastMessage: "Tap to view messages",
        timestamp: formatTimestamp(conv.lastMessageAt),
        unreadCount: conv.unreadCount || 0,
      }));

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
    }, [searchQuery, token])
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
                key={conversation.id}
                contactName={conversation.contactName}
                lastMessage={conversation.lastMessage}
                timestamp={conversation.timestamp}
                unreadCount={conversation.unreadCount}
                isLast={index === conversations.length - 1}
                onPress={() =>
                  navigation.navigate("ThreadDetail", {
                    conversationId: conversation.id,
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
