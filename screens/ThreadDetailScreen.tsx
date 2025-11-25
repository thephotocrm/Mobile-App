import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform, ActivityIndicator, KeyboardAvoidingView, ScrollView, TextInput } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
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
  createdAt?: number;
}

const MOCK_MESSAGES: DisplayMessage[] = [
  { id: '1', text: 'Hi! I wanted to check on the timeline for receiving our wedding album.', isSent: false, timestamp: '5h ago', createdAt: Date.now() / 1000 - 18000 },
  { id: '2', text: 'Hi Emily! Your album is currently being designed. You should receive it within 2-3 weeks.', isSent: true, timestamp: '4h ago', createdAt: Date.now() / 1000 - 14400 },
  { id: '3', text: 'That sounds great! Also, can we schedule a time to go over the final photo selections?', isSent: false, timestamp: '3h ago', createdAt: Date.now() / 1000 - 10800 },
  { id: '4', text: 'Absolutely! How does next Tuesday at 2 PM work for you?', isSent: true, timestamp: '2h ago', createdAt: Date.now() / 1000 - 7200 },
];

const getDateSeparator = (timestamp: number): string => {
  const messageDate = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  messageDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  
  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

const shouldShowDateSeparator = (currentMsg: DisplayMessage, prevMsg: DisplayMessage | null): boolean => {
  if (!currentMsg.createdAt) return false;
  
  if (!prevMsg) return true;
  
  if (!prevMsg.createdAt) return true;
  
  const currentDate = new Date(currentMsg.createdAt * 1000);
  const prevDate = new Date(prevMsg.createdAt * 1000);
  
  currentDate.setHours(0, 0, 0, 0);
  prevDate.setHours(0, 0, 0, 0);
  
  return currentDate.getTime() !== prevDate.getTime();
};

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
          text: msg.text || '',
          isSent: Boolean(msg.is_sent),
          timestamp: formatTimestamp(msg.created_at),
          createdAt: msg.created_at,
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
            messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);
              
              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && msg.createdAt && (
                    <View style={styles.dateSeparatorContainer}>
                      <View style={[styles.dateSeparatorLine, { backgroundColor: theme.border }]} />
                      <ThemedText style={[styles.dateSeparatorText, { color: theme.textSecondary }]}>
                        {getDateSeparator(msg.createdAt)}
                      </ThemedText>
                      <View style={[styles.dateSeparatorLine, { backgroundColor: theme.border }]} />
                    </View>
                  )}
                  
                  <View style={[styles.messageRow, msg.isSent && styles.messageRowSent]}>
                    {!msg.isSent && (
                      <View style={styles.avatar}>
                        <Avatar name={route.params.contactName} size={32} />
                      </View>
                    )}
                    
                    <View
                      style={[
                        styles.messageBubble,
                        msg.isSent
                          ? { backgroundColor: theme.primary }
                          : { backgroundColor: theme.backgroundCard },
                        msg.isSent ? styles.sentMessage : styles.receivedMessage,
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
                      <View style={styles.messageFooter}>
                        <ThemedText
                          style={[
                            styles.timestamp,
                            msg.isSent ? { color: 'rgba(255,255,255,0.7)' } : { color: theme.textSecondary },
                          ]}
                        >
                          {msg.timestamp}
                        </ThemedText>
                        {msg.isSent ? (
                          <Feather 
                            name="check" 
                            size={12} 
                            color="rgba(255,255,255,0.7)" 
                            style={styles.checkIcon}
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          )}
        </ScrollView>
      )}

      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: theme.backgroundDefault, 
          borderTopColor: theme.border,
          paddingBottom: tabBarHeight + Spacing.sm,
        }
      ]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.backgroundRoot, borderColor: theme.border }]}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            style={[styles.textInput, { color: theme.text }]}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  messageRowSent: {
    justifyContent: 'flex-end',
  },
  avatar: {
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sentMessage: {
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  checkIcon: {
    marginTop: 1,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '500',
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
    paddingHorizontal: 10,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    paddingVertical: 4,
    gap: Spacing.sm,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
