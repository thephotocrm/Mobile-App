import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/Input';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { InboxStackParamList } from '@/navigation/InboxStackNavigator';
import { MessageRepository, Message } from '@/database/repositories/ConversationRepository';

type ThreadDetailRouteProp = RouteProp<InboxStackParamList, 'ThreadDetail'>;

interface DisplayMessage {
  id: string;
  text: string;
  isSent: boolean;
  timestamp: string;
}

const MOCK_MESSAGES: DisplayMessage[] = [
  { id: '1', text: 'Hi! I wanted to check on the timeline for receiving our wedding album.', isSent: false, timestamp: '5h ago' },
  { id: '2', text: 'Hi Emily! Your album is currently being designed. You should receive it within 2-3 weeks.', isSent: true, timestamp: '4h ago' },
  { id: '3', text: 'That sounds great! Also, can we schedule a time to go over the final photo selections?', isSent: false, timestamp: '3h ago' },
  { id: '4', text: 'Absolutely! How does next Tuesday at 2 PM work for you?', isSent: true, timestamp: '2h ago' },
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

export default function ThreadDetailScreen() {
  const { theme } = useTheme();
  const route = useRoute<ThreadDetailRouteProp>();
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'web') {
        setMessages(MOCK_MESSAGES);
      } else {
        const dbMessages = await MessageRepository.getByConversation(conversationId);
        const displayMessages: DisplayMessage[] = dbMessages.map((msg) => ({
          id: msg.id.toString(),
          text: msg.text,
          isSent: msg.is_sent,
          timestamp: formatTimestamp(msg.created_at),
        }));
        setMessages(displayMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const handleSend = () => {
    if (message.trim()) {
      Alert.alert('Message Sent', `Your message "${message}" has been sent`);
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No messages yet</ThemedText>
            </View>
          ) : (
            messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.isSent
                    ? { ...styles.sentMessage, backgroundColor: theme.primary }
                    : { ...styles.receivedMessage, backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText
                  style={[
                    styles.messageText,
                    msg.isSent && { color: '#FFFFFF' },
                  ]}
                >
                  {msg.text}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.timestamp,
                    msg.isSent ? { color: 'rgba(255,255,255,0.7)' } : { color: theme.textSecondary },
                  ]}
                >
                  {msg.timestamp}
                </ThemedText>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: theme.backgroundRoot, 
          borderTopColor: theme.border,
          paddingBottom: tabBarHeight + Spacing.sm,
        }
      ]}>
        <Input
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
