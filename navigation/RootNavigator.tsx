import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { SettingsScreen } from "@/screens/SettingsScreen";
import LoginScreen from "@/screens/LoginScreen";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            contentStyle: {
              backgroundColor: theme.backgroundRoot,
            },
          }}
        />
      ) : (
        <>
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
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
