import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "./AuthContext";
import {
  registerForPushNotificationsAsync,
  addNotificationListeners,
  getPermissionStatus,
} from "@/services/notifications";
import { pushTokensApi, createTenantContext } from "@/services/api";

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
  const hasRequestedPermissions = useRef(false);

  // Push notifications are only supported on physical devices running iOS/Android
  const isSupported = Platform.OS !== "web";

  // Check initial permission status
  useEffect(() => {
    if (!isSupported) return;

    const checkStatus = async () => {
      const status = await getPermissionStatus();
      setPermissionStatus(status);
    };

    checkStatus();
  }, [isSupported]);

  // Set up notification listeners
  useEffect(() => {
    if (!isSupported) return;

    const cleanup = addNotificationListeners(
      (notification) => {
        // Handle foreground notification
        if (__DEV__) {
          console.log("Notification received:", notification.request.content);
        }
      },
      (response) => {
        // Handle notification tap - navigate to relevant screen
        const data = response.notification.request.content.data;
        if (__DEV__) {
          console.log("Notification tapped:", data);
        }
        // Navigation would be handled here based on notification type
        // e.g., if (data.type === 'message') navigation.navigate('Inbox')
      },
    );

    return cleanup;
  }, [isSupported]);

  // Request permissions when user logs in (first time only)
  useEffect(() => {
    if (!isSupported) return;
    if (!user || !token) return;
    if (hasRequestedPermissions.current) return;
    if (permissionStatus === "granted") return;

    // Only request permissions once per session after login
    const requestAfterLogin = async () => {
      hasRequestedPermissions.current = true;

      // Small delay to let the app settle after login
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newPushToken = await registerForPushNotificationsAsync();
      if (newPushToken) {
        setPushToken(newPushToken);
        setPermissionStatus("granted");
        if (__DEV__) {
          console.log("Push token registered:", newPushToken);
        }

        // Register push token with the backend API
        if (token && user) {
          try {
            const tenant = createTenantContext(user);
            const platform = Platform.OS as "ios" | "android";
            await pushTokensApi.register(token, newPushToken, platform, undefined, tenant);
            if (__DEV__) {
              console.log("Push token sent to API successfully");
            }
          } catch (error) {
            if (__DEV__) {
              console.error("Failed to register push token with API:", error);
            }
          }
        }
      } else {
        const status = await getPermissionStatus();
        setPermissionStatus(status);
      }
    };

    requestAfterLogin();
  }, [user, token, isSupported, permissionStatus]);

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
                await pushTokensApi.register(token, newPushToken, platform, undefined, tenant);
                if (__DEV__) {
                  console.log("Push token sent to API successfully (from settings change)");
                }
              } catch (error) {
                if (__DEV__) {
                  console.error("Failed to register push token with API:", error);
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
          await pushTokensApi.register(token, newPushToken, platform, undefined, tenant);
          if (__DEV__) {
            console.log("Push token sent to API successfully (from requestPermissions)");
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
