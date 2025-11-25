import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { RootNavigator } from "@/navigation/RootNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
      <ThemeProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
              <StatusBar style="dark" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
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
