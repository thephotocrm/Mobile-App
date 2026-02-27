import { useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const DEFAULT_INTERVAL = 30000; // 30 seconds

/**
 * Polls a fetch function at a given interval while the screen is focused
 * and the app is in the foreground. Cleans up on blur/background.
 */
export function useAutoRefresh(
  fetchFn: () => Promise<void> | void,
  interval: number = DEFAULT_INTERVAL,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      // Only fetch if app is active
      if (appStateRef.current === "active") {
        fetchFn();
      }
    }, interval);
  }, [fetchFn, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Start polling when screen is focused
      startPolling();

      // Listen for app state changes to pause/resume
      const subscription = AppState.addEventListener(
        "change",
        (nextAppState: AppStateStatus) => {
          if (appStateRef.current !== "active" && nextAppState === "active") {
            // App came to foreground — do an immediate fetch + restart polling
            fetchFn();
            startPolling();
          } else if (nextAppState !== "active") {
            // App went to background — stop polling
            stopPolling();
          }
          appStateRef.current = nextAppState;
        },
      );

      // Cleanup on blur
      return () => {
        stopPolling();
        subscription.remove();
      };
    }, [fetchFn, startPolling, stopPolling]),
  );
}
