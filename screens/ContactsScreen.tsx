import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { ScreenKeyboardAwareScrollView } from '@/components/ScreenKeyboardAwareScrollView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';
import { ToolsStackParamList } from '@/navigation/ToolsStackNavigator';

const MOCK_CONTACTS = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah.johnson@example.com', phone: '+1 (555) 123-4567', projectCount: 1, lastContact: 'Nov 22, 2024' },
  { id: '2', name: 'Mike Chen', email: 'mike.chen@example.com', phone: '+1 (555) 234-5678', projectCount: 1, lastContact: 'Nov 20, 2024' },
  { id: '3', name: 'Jennifer Mills', email: 'jennifer@weddingmagic.com', phone: '+1 (555) 345-6789', projectCount: 3, lastContact: 'Nov 18, 2024' },
  { id: '4', name: 'Robert Johnson', email: 'robert.j@example.com', phone: '+1 (555) 456-7890', projectCount: 1, lastContact: 'Nov 15, 2024' },
  { id: '5', name: 'Emily Davis', email: 'emily.davis@example.com', phone: '+1 (555) 567-8901', projectCount: 2, lastContact: 'Nov 12, 2024' },
  { id: '6', name: 'David Martinez', email: 'david.m@example.com', phone: '+1 (555) 678-9012', projectCount: 1, lastContact: 'Nov 10, 2024' },
  { id: '7', name: 'Lisa Anderson', email: 'lisa.anderson@example.com', phone: '+1 (555) 789-0123', projectCount: 2, lastContact: 'Nov 8, 2024' },
  { id: '8', name: 'James Wilson', email: 'james.w@example.com', phone: '+1 (555) 890-1234', projectCount: 1, lastContact: 'Nov 5, 2024' },
];

type ContactsScreenNavigationProp = NativeStackNavigationProp<ToolsStackParamList, 'Contacts'>;

export default function ContactsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<ContactsScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = MOCK_CONTACTS.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactPress = (contactId: string) => {
    navigation.navigate('ContactDetail', { contactId });
  };

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.container}>
        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search contacts..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ThemedText style={[styles.resultCount, { color: theme.textSecondary }]}>
          {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
        </ThemedText>

        {filteredContacts.map((contact) => (
          <Pressable
            key={contact.id}
            onPress={() => handleContactPress(contact.id)}
            style={({ pressed }) => [
              styles.contactCard,
              { backgroundColor: theme.backgroundSecondary },
              pressed && { opacity: 0.7 }
            ]}
          >
            <View style={styles.contactHeader}>
              <Avatar name={contact.name} size={48} />
              <View style={styles.contactInfo}>
                <ThemedText style={[styles.contactName, { fontSize: Typography.body.fontSize, fontWeight: Typography.body.fontWeight as any }]}>
                  {contact.name}
                </ThemedText>
                <View style={styles.contactMeta}>
                  <Feather name="briefcase" size={14} color={theme.textSecondary} />
                  <ThemedText style={[styles.contactMetaText, { color: theme.textSecondary }]}>
                    {contact.projectCount} {contact.projectCount === 1 ? 'project' : 'projects'}
                  </ThemedText>
                </View>
                <View style={styles.contactMeta}>
                  <Feather name="clock" size={14} color={theme.textSecondary} />
                  <ThemedText style={[styles.contactMetaText, { color: theme.textSecondary }]}>
                    Last contact: {contact.lastContact}
                  </ThemedText>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  resultCount: {
    fontSize: 12,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  contactCard: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contactInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  contactName: {
    fontWeight: '600',
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  contactMetaText: {
    fontSize: 12,
  },
});
