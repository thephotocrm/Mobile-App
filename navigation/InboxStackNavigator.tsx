import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InboxScreen from "@/screens/InboxScreen";
import ThreadDetailScreen from "@/screens/ThreadDetailScreen";
import { getMainScreenOptions, getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type InboxStackParamList = {
  InboxList: undefined;
  ThreadDetail: { conversationId: number; contactName: string };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

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
          headerTitle: route.params.contactName,
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.backgroundRoot,
          },
        })}
      />
    </Stack.Navigator>
  );
}
