import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import {
  getMainScreenOptions,
  getCommonScreenOptions,
} from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

export type NotificationsStackParamList = {
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<NotificationsStackParamList>();

export function NotificationsStackNavigator() {
  const { theme, isDark } = useTheme();

  const mainOptions = getMainScreenOptions({
    theme,
    isDark,
    title: "Activity",
  });

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={mainOptions}
      />
    </Stack.Navigator>
  );
}
