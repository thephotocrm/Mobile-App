import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    if (__DEV__) {
      console.log("Push notifications require a physical device");
    }
    return null;
  }

  // Web doesn't support native push notifications via Expo
  if (Platform.OS === "web") {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B4565",
    });
  }

  // Get Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return token.data;
}

export async function getPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export function addNotificationListeners(
  onReceived: (notification: Notifications.Notification) => void,
  onResponse: (response: Notifications.NotificationResponse) => void,
) {
  const receivedSubscription =
    Notifications.addNotificationReceivedListener(onReceived);
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set up notification categories for actionable notifications.
 * Categories define action buttons that appear on notifications.
 */
export async function setupNotificationCategories(): Promise<void> {
  // Categories only work on physical devices, not simulators or web
  if (Platform.OS === "web" || !Device.isDevice) {
    if (__DEV__) {
      console.log(
        "[PUSH] Skipping notification categories setup (web or simulator)",
      );
    }
    return;
  }

  try {
    // Set up "attendance" category for meeting attendance prompts
    await Notifications.setNotificationCategoryAsync("attendance", [
      {
        identifier: "showed_up",
        buttonTitle: "Showed Up",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "no_show",
        buttonTitle: "No-show",
        options: { isDestructive: true, opensAppToForeground: true },
      },
    ]);

    if (__DEV__) {
      console.log("[PUSH] Notification categories registered successfully");
    }
  } catch (error) {
    console.error("[PUSH] Failed to set up notification categories:", error);
  }
}
