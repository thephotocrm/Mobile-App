import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConversationCard } from '@/components/ConversationCard';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { InboxStackParamList } from '@/navigation/InboxStackNavigator';
import { Spacing } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<InboxStackParamList, 'InboxList'>;

const MOCK_CONVERSATIONS = [
  { id: '1', contactName: 'Sarah Johnson', lastMessage: 'Thank you so much! I cant wait to see the photos from our engagement shoot.', timestamp: '2h ago', unreadCount: 2 },
  { id: '2', contactName: 'Emily Davis', lastMessage: 'Hi! I wanted to check on the timeline for receiving our wedding album.', timestamp: '5h ago', unreadCount: 0 },
  { id: '3', contactName: 'Rachel Martinez', lastMessage: 'Just sent over the venue details via email. Let me know if you need anything else!', timestamp: '1d ago', unreadCount: 1 },
  { id: '4', contactName: 'Jessica Wilson', lastMessage: 'We loved meeting with you yesterday! Excited to move forward with booking.', timestamp: '2d ago', unreadCount: 0 },
  { id: '5', contactName: 'Amanda Brown', lastMessage: 'The sneak peeks are absolutely beautiful! My family is obsessed.', timestamp: '3d ago', unreadCount: 0 },
];

export default function InboxScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScreenScrollView>
      <View style={styles.list}>
        {MOCK_CONVERSATIONS.map((conversation) => (
          <ConversationCard
            key={conversation.id}
            contactName={conversation.contactName}
            lastMessage={conversation.lastMessage}
            timestamp={conversation.timestamp}
            unreadCount={conversation.unreadCount}
            onPress={() =>
              navigation.navigate('ThreadDetail', {
                contactId: conversation.id,
                contactName: conversation.contactName,
              })
            }
          />
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.md,
  },
});
