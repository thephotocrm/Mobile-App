import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/Input';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';

const MOCK_MESSAGES = [
  { id: '1', text: 'Hi! I wanted to check on the timeline for receiving our wedding album.', isSent: false, timestamp: '5h ago' },
  { id: '2', text: 'Hi Emily! Your album is currently being designed. You should receive it within 2-3 weeks.', isSent: true, timestamp: '4h ago' },
  { id: '3', text: 'That sounds great! Also, can we schedule a time to go over the final photo selections?', isSent: false, timestamp: '3h ago' },
  { id: '4', text: 'Absolutely! How does next Tuesday at 2 PM work for you?', isSent: true, timestamp: '2h ago' },
];

export default function ThreadDetailScreen() {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      Alert.alert('Message Sent', `Your message "${message}" has been sent`);
      setMessage('');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScreenKeyboardAwareScrollView contentContainerStyle={styles.messagesContainer}>
        {MOCK_MESSAGES.map((msg) => (
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
        ))}
      </ScreenKeyboardAwareScrollView>

      <View style={[styles.inputContainer, { backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  messagesContainer: {
    padding: Spacing.md,
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
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
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
