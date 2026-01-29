import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Platform, ScrollView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  DancingScript_700Bold,
} from "@expo-google-fonts/dancing-script";

import { RootNavigator } from "@/navigation/RootNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { InboxProvider } from "@/contexts/InboxContext";
import { initializeDatabase } from "@/database";
import { seedDatabase } from "@/database/seed";

// Capture startup errors globally
const startupLogs: string[] = [];
const logStartup = (message: string) => {
  const timestamp = new Date().toISOString().slice(11, 23);
  const entry = `[${timestamp}] ${message}`;
  startupLogs.push(entry);
  console.log(`[STARTUP] ${message}`);
};

export default function App() {
  const [isDbReady, setIsDbReady] = useState(Platform.OS === "web");
  const [startupError, setStartupError] = useState<string | null>(null);
  const [initPhase, setInitPhase] = useState("starting");
  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
  });

  useEffect(() => {
    logStartup("App component mounted");

    // Set up global error handler for unhandled errors
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      logStartup(
        `GLOBAL ERROR (fatal=${isFatal}): ${error?.message || String(error)}`,
      );
      setStartupError(
        `Global Error: ${error?.message || String(error)}\n\nStack: ${error?.stack || "No stack"}`,
      );
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });

    async function setupDatabase() {
      if (Platform.OS === "web") {
        logStartup("Web platform - skipping DB init");
        setIsDbReady(true);
        setInitPhase("ready");
        return;
      }

      try {
        setInitPhase("initializing database");
        logStartup("Starting database initialization...");
        await initializeDatabase();
        logStartup("Database initialized successfully");

        setInitPhase("seeding database");
        logStartup("Starting database seeding...");
        await seedDatabase();
        logStartup("Database seeded successfully");

        setInitPhase("ready");
        setIsDbReady(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "No stack";
        logStartup(`Database initialization failed: ${errorMsg}`);
        console.error("Database initialization failed:", error);
        setStartupError(`DB Init Error: ${errorMsg}\n\nStack: ${errorStack}`);
        // Set ready anyway so app can run without local DB
        setIsDbReady(true);
        setInitPhase("ready (with errors)");
      }
    }
    setupDatabase();
  }, []);

  // Show startup error screen if something went wrong
  if (startupError) {
    return (
      <SafeAreaProvider>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Startup Error</Text>
          <Text style={styles.errorPhase}>Phase: {initPhase}</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText} selectable>
              {startupError}
            </Text>
            <Text style={styles.logTitle}>Startup Log:</Text>
            {startupLogs.map((log, i) => (
              <Text key={i} style={styles.logText} selectable>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isDbReady || !fontsLoaded) {
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
        <AuthProvider>
          <InboxProvider>
            <NotificationProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <NavigationContainer>
                      <RootNavigator />
                    </NavigationContainer>
                    <StatusBar style="auto" />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </NotificationProvider>
          </InboxProvider>
        </AuthProvider>
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
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    padding: 20,
    paddingTop: 60,
  },
  errorTitle: {
    color: "#ff6b6b",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorPhase: {
    color: "#ffd93d",
    fontSize: 14,
    marginBottom: 16,
  },
  errorScroll: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 16,
  },
  logTitle: {
    color: "#4ecdc4",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 8,
  },
  logText: {
    color: "#a0a0a0",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 4,
  },
});
