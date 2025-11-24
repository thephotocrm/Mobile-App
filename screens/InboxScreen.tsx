import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ConversationCard } from '@/components/ConversationCard';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/ThemedText';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { InboxStackParamList } from '@/navigation/InboxStackNavigator';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ConversationRepository, ConversationWithLastMessage } from '@/database/repositories/ConversationRepository';

type NavigationProp = NativeStackNavigationProp<InboxStackParamList, 'InboxList'>;

interface ConversationItem {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

const MOCK_CONVERSATIONS: ConversationItem[] = [
  { id: '1', contactName: 'Sarah Johnson', lastMessage: 'Thank you so much! I cant wait to see the photos from our engagement shoot.', timestamp: '2h ago', unreadCount: 2 },
  { id: '2', contactName: 'Emily Davis', lastMessage: 'Hi! I wanted to check on the timeline for receiving our wedding album.', timestamp: '5h ago', unreadCount: 0 },
  { id: '3', contactName: 'Rachel Martinez', lastMessage: 'Just sent over the venue details via email. Let me know if you need anything else!', timestamp: '1d ago', unreadCount: 1 },
  { id: '4', contactName: 'Jessica Wilson', lastMessage: 'We loved meeting with you yesterday! Excited to move forward with booking.', timestamp: '2d ago', unreadCount: 0 },
  { id: '5', contactName: 'Amanda Brown', lastMessage: 'The sneak peeks are absolutely beautiful! My family is obsessed.', timestamp: '3d ago', unreadCount: 0 },
];

const formatTimestamp = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  } else if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    const date = new Date(timestamp * 1000);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  }
};

export default function InboxScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    try {
      setLoading(true);
      let result: ConversationItem[];

      if (Platform.OS === 'web') {
        result = MOCK_CONVERSATIONS;
        
        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          result = result.filter(conversation => 
            conversation.contactName.toLowerCase().includes(query) ||
            conversation.lastMessage.toLowerCase().includes(query)
          );
        }
      } else {
        let dbConversations: ConversationWithLastMessage[];
        
        if (searchQuery.trim()) {
          dbConversations = await ConversationRepository.searchWithLastMessage(searchQuery.trim());
        } else {
          dbConversations = await ConversationRepository.getAllWithLastMessage();
        }

        result = dbConversations.map((conversation) => ({
          id: conversation.id.toString(),
          contactName: conversation.client_name,
          lastMessage: conversation.last_message_text || 'No messages yet',
          timestamp: conversation.last_message_created_at 
            ? formatTimestamp(conversation.last_message_created_at)
            : formatTimestamp(conversation.last_message_at || Math.floor(Date.now() / 1000)),
          unreadCount: conversation.unread_count,
        }));
      }

      setConversations(result);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadConversations();
    }, [searchQuery])
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
      ) : (
        <View style={styles.list}>
          {conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No conversations found</ThemedText>
            </View>
          ) : (
            conversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                contactName={conversation.contactName}
                lastMessage={conversation.lastMessage}
                timestamp={conversation.timestamp}
                unreadCount={conversation.unreadCount}
                onPress={() =>
                  navigation.navigate('ThreadDetail', {
                    conversationId: parseInt(conversation.id, 10),
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
  },
  searchWrapper: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  list: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
