import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import InboxScreen from "@/screens/InboxScreen";
import ThreadDetailScreen from "@/screens/ThreadDetailScreen";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import {
  getMainScreenOptions,
  getCommonScreenOptions,
} from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export type InboxStackParamList = {
  InboxList: undefined;
  ThreadDetail: {
    conversationId: string;
    contactName: string;
    contactPhone?: string;
  };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

// Custom header component for thread detail
function ThreadDetailHeader({
  contactName,
  contactPhone,
  contactId,
}: {
  contactName: string;
  contactPhone?: string;
  contactId: string;
}) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleProfilePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to contact detail - need to use CommonActions to navigate across stacks
    navigation.dispatch(
      CommonActions.navigate({
        name: "MainTabs",
        params: {
          screen: "Projects",
          params: {
            screen: "ContactDetail",
            params: { contactId },
          },
        },
      }),
    );
  };

  return (
    <Pressable
      onPress={handleProfilePress}
      style={({ pressed }) => [
        styles.headerContent,
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`View ${contactName}'s profile`}
    >
      <Avatar name={contactName} size={36} showGradient={false} />
      <View style={styles.headerTextContainer}>
        <View style={styles.headerNameRow}>
          <ThemedText
            style={[styles.headerTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {contactName}
          </ThemedText>
          <Feather
            name="chevron-right"
            size={14}
            color={theme.textTertiary}
            style={styles.chevronIcon}
          />
        </View>
        {contactPhone && (
          <ThemedText
            style={[styles.headerSubtitle, { color: theme.textSecondary }]}
          >
            {contactPhone}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export default function InboxStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="InboxList"
        component={InboxScreen}
        options={getMainScreenOptions({
          theme,
          isDark,
          title: "Inbox",
        })}
      />
      <Stack.Screen
        name="ThreadDetail"
        component={ThreadDetailScreen}
        options={({ route }) => ({
          headerTitle: () => (
            <ThreadDetailHeader
              contactName={route.params.contactName}
              contactPhone={route.params.contactPhone}
              contactId={route.params.conversationId}
            />
          ),
          headerTitleAlign: "left",
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
          // headerRight is set dynamically by ThreadDetailScreen
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTextContainer: {
    gap: 0,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  chevronIcon: {
    marginLeft: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
});
