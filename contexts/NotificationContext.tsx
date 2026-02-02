import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Platform, AppState, AppStateStatus, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "./AuthContext";
import {
  registerForPushNotificationsAsync,
  addNotificationListeners,
  getPermissionStatus,
  setupNotificationCategories,
} from "@/services/notifications";
import {
  pushTokensApi,
  bookingsApi,
  createTenantContext,
} from "@/services/api";

type PermissionStatus = "granted" | "denied" | "undetermined";

interface NotificationContextType {
  pushToken: string | null;
  permissionStatus: PermissionStatus;
  requestPermissions: () => Promise<boolean>;
  isSupported: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("undetermined");
  const hasRegisteredToken = useRef(false);

  // Push notifications are only supported on physical devices running iOS/Android
  const isSupported = Platform.OS !== "web";

  // Check initial permission status and set up notification categories
  useEffect(() => {
    if (!isSupported) return;

    const initialize = async () => {
      // Check permission status
      const status = await getPermissionStatus();
      setPermissionStatus(status);

      // Set up notification categories for actionable notifications
      await setupNotificationCategories();
    };

    initialize();
  }, [isSupported]);

  // Record attendance directly without showing an alert (used for action button taps)
  const recordAttendanceDirectly = useCallback(
    async (bookingId: string, showed: boolean) => {
      if (!token || !user) {
        console.warn("[PUSH] Cannot record attendance - user not logged in");
        return;
      }

      try {
        const tenant = createTenantContext(user);
        const result = await bookingsApi.recordAttendance(
          token,
          bookingId,
          showed,
          tenant,
        );
        if (__DEV__) {
          console.log("[PUSH] Attendance recorded via action button:", result);
        }
        // Show brief confirmation
        Alert.alert(
          "Attendance Recorded",
          showed ? "Client marked as showed up." : "Client marked as no-show.",
        );
      } catch (error) {
        console.error("[PUSH] Failed to record attendance:", error);
        Alert.alert("Error", "Failed to record attendance. Please try again.");
      }
    },
    [token, user],
  );

  // Handle ATTENDANCE_PROMPT notification - show prompt and record attendance
  const handleAttendancePrompt = useCallback(
    (data: { bookingId?: string; projectId?: string }, title?: string) => {
      if (!data.bookingId) {
        console.warn(
          "[PUSH] ATTENDANCE_PROMPT received without bookingId:",
          data,
        );
        return;
      }

      if (!token || !user) {
        console.warn("[PUSH] Cannot record attendance - user not logged in");
        return;
      }

      const alertTitle = title || "Meeting Attendance";
      const alertMessage = "Did the client show up to the meeting?";

      Alert.alert(alertTitle, alertMessage, [
        {
          text: "No-show",
          style: "destructive",
          onPress: async () => {
            try {
              const tenant = createTenantContext(user);
              const result = await bookingsApi.recordAttendance(
                token,
                data.bookingId!,
                false,
                tenant,
              );
              if (__DEV__) {
                console.log("[PUSH] Attendance recorded:", result);
              }
            } catch (error) {
              console.error("[PUSH] Failed to record attendance:", error);
              Alert.alert(
                "Error",
                "Failed to record attendance. Please try again.",
              );
            }
          },
        },
        {
          text: "They showed up",
          style: "default",
          onPress: async () => {
            try {
              const tenant = createTenantContext(user);
              const result = await bookingsApi.recordAttendance(
                token,
                data.bookingId!,
                true,
                tenant,
              );
              if (__DEV__) {
                console.log("[PUSH] Attendance recorded:", result);
              }
            } catch (error) {
              console.error("[PUSH] Failed to record attendance:", error);
              Alert.alert(
                "Error",
                "Failed to record attendance. Please try again.",
              );
            }
          },
        },
      ]);
    },
    [token, user],
  );

  // Set up notification listeners
  useEffect(() => {
    if (!isSupported) return;

    const cleanup = addNotificationListeners(
      (notification) => {
        // Handle foreground notification
        const content = notification.request.content;
        const data = content.data as {
          type?: string;
          bookingId?: string;
          projectId?: string;
        };

        if (__DEV__) {
          console.log("Notification received:", content);
        }

        // Handle ATTENDANCE_PROMPT in foreground
        if (data?.type === "ATTENDANCE_PROMPT") {
          handleAttendancePrompt(data, content.title || undefined);
        }
      },
      (response) => {
        // Handle notification tap or action button press
        const content = response.notification.request.content;
        const data = content.data as {
          type?: string;
          bookingId?: string;
          projectId?: string;
        };
        const actionIdentifier = response.actionIdentifier;

        if (__DEV__) {
          console.log("Notification response:", {
            actionIdentifier,
            data,
          });
        }

        // Handle ATTENDANCE_PROMPT notification
        if (data?.type === "ATTENDANCE_PROMPT" && data.bookingId) {
          // Check if user tapped an action button or the notification body
          if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
            // User tapped the notification body - show alert dialog
            handleAttendancePrompt(data, content.title || undefined);
          } else if (actionIdentifier === "showed_up") {
            // User tapped "Showed Up" action button - record directly
            recordAttendanceDirectly(data.bookingId, true);
          } else if (actionIdentifier === "no_show") {
            // User tapped "No-show" action button - record directly
            recordAttendanceDirectly(data.bookingId, false);
          }
          return; // Don't process further navigation for this type
        }

        // Navigation would be handled here based on notification type
        // e.g., if (data.type === 'message') navigation.navigate('Inbox')
      },
    );

    return cleanup;
  }, [isSupported, handleAttendancePrompt, recordAttendanceDirectly]);

  // Register push token when user logs in
  useEffect(() => {
    if (!isSupported) return;
    if (!user || !token) return;
    if (hasRegisteredToken.current) return;

    const registerPushToken = async () => {
      hasRegisteredToken.current = true;

      // Small delay to let the app settle after login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check current permission status
      const currentStatus = await getPermissionStatus();
      console.log(
        "[PUSH] Starting registration, current status:",
        currentStatus,
      );

      // Always attempt to get the push token - registerForPushNotificationsAsync
      // will request permissions if needed or just get the token if already granted
      const newPushToken = await registerForPushNotificationsAsync();

      if (newPushToken) {
        setPushToken(newPushToken);
        setPermissionStatus("granted");
        console.log(
          "[PUSH] Token obtained:",
          newPushToken.substring(0, 20) + "...",
        );

        // Register push token with the backend API
        try {
          const tenant = createTenantContext(user);
          const platform = Platform.OS as "ios" | "android";
          await pushTokensApi.register(
            token,
            newPushToken,
            platform,
            undefined,
            tenant,
          );
          console.log("[PUSH] Token registered with backend successfully");
        } catch (error) {
          console.error("[PUSH] Failed to register token with backend:", error);
        }
      } else {
        const status = await getPermissionStatus();
        setPermissionStatus(status);
        console.log("[PUSH] No token obtained, permission status:", status);
      }
    };

    registerPushToken();
  }, [user, token, isSupported]);

  // Re-check permission status when app comes to foreground
  // (user may have changed settings in system settings)
  useEffect(() => {
    if (!isSupported) return;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === "active") {
        const status = await getPermissionStatus();
        setPermissionStatus(status);

        // If permission was granted in settings, register for push token
        if (status === "granted" && !pushToken) {
          const newPushToken = await registerForPushNotificationsAsync();
          if (newPushToken) {
            setPushToken(newPushToken);

            // Register push token with the backend API
            if (token && user) {
              try {
                const tenant = createTenantContext(user);
                const platform = Platform.OS as "ios" | "android";
                await pushTokensApi.register(
                  token,
                  newPushToken,
                  platform,
                  undefined,
                  tenant,
                );
                if (__DEV__) {
                  console.log(
                    "Push token sent to API successfully (from settings change)",
                  );
                }
              } catch (error) {
                if (__DEV__) {
                  console.error(
                    "Failed to register push token with API:",
                    error,
                  );
                }
              }
            }
          }
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isSupported, pushToken, token, user]);

  const requestPermissions = useCallback(async () => {
    if (!isSupported) return false;

    const newPushToken = await registerForPushNotificationsAsync();
    if (newPushToken) {
      setPushToken(newPushToken);
      setPermissionStatus("granted");

      // Register push token with the backend API
      if (token && user) {
        try {
          const tenant = createTenantContext(user);
          const platform = Platform.OS as "ios" | "android";
          await pushTokensApi.register(
            token,
            newPushToken,
            platform,
            undefined,
            tenant,
          );
          if (__DEV__) {
            console.log(
              "Push token sent to API successfully (from requestPermissions)",
            );
          }
        } catch (error) {
          if (__DEV__) {
            console.error("Failed to register push token with API:", error);
          }
        }
      }

      return true;
    }

    const status = await getPermissionStatus();
    setPermissionStatus(status);
    return false;
  }, [isSupported, token, user]);

  return (
    <NotificationContext.Provider
      value={{
        pushToken,
        permissionStatus,
        requestPermissions,
        isSupported,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
