import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Group screenOptions={{ presentation: "modal" }}>
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            contentStyle: {
              backgroundColor: theme.backgroundRoot,
            },
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
