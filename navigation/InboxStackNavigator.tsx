import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
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
import { MessagingColors, Spacing } from "@/constants/theme";

export type InboxStackParamList = {
  InboxList: undefined;
  ThreadDetail: { conversationId: string; contactName: string };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

// Custom header component for thread detail
function ThreadDetailHeader({
  contactName,
  onMorePress,
}: {
  contactName: string;
  onMorePress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.headerContent}>
      <Avatar name={contactName} size={36} showGradient={false} />
      <View style={styles.headerTextContainer}>
        <ThemedText
          style={[styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          {contactName}
        </ThemedText>
        <ThemedText
          style={[styles.headerSubtitle, { color: MessagingColors.onlineText }]}
        >
          online
        </ThemedText>
      </View>
    </View>
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
        options={({ route, navigation }) => ({
          headerTitle: () => (
            <ThreadDetailHeader
              contactName={route.params.contactName}
              onMorePress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          ),
          headerTitleAlign: "left",
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
          headerRight: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // More options functionality
              }}
              style={styles.headerRightButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="more-vertical" size={22} color={theme.text} />
            </Pressable>
          ),
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  headerRightButton: {
    padding: Spacing.xs,
  },
});
