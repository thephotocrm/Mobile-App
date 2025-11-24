import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initializeDatabase } from "@/database";
import { seedDatabase } from "@/database/seed";

export default function App() {
  const [isDbReady, setIsDbReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    async function setupDatabase() {
      if (Platform.OS === 'web') {
        setIsDbReady(true);
        return;
      }
      
      try {
        await initializeDatabase();
        await seedDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsDbReady(true);
      }
    }
    setupDatabase();
  }, []);

  if (!isDbReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
  <ErrorBoundary>
    <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <NavigationContainer>
              <MainTabNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
  </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
