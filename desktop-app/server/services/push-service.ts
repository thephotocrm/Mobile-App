import Expo, { ExpoPushMessage } from "expo-server-sdk";
import { storage } from "../storage";
import { notificationTypeEnum } from "@shared/schema";

// Create Expo SDK client
const expo = new Expo();

type NotificationType = keyof typeof notificationTypeEnum;

export interface PushPayload {
  photographerId: string;
  title: string;
  body: string;
  data?: {
    type: NotificationType;
    notificationId?: string;
    projectId?: string;
    contactId?: string;
    actionUrl?: string;
  };
  badge?: number;
}

/**
 * Send push notification to all registered devices for a photographer
 * Uses Expo Push API to deliver to both iOS and Android devices
 */
export async function sendPushNotification(
  payload: PushPayload,
): Promise<void> {
  try {
    // Get all push tokens for this photographer
    const tokens = await storage.getPushTokens(payload.photographerId);

    if (!tokens.length) {
      console.log(
        `[PUSH] No push tokens registered for photographer ${payload.photographerId}`,
      );
      return;
    }

    // Filter valid Expo push tokens and create messages
    const messages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        sound: "default" as const,
        badge: payload.badge,
        data: payload.data,
        priority: "high" as const,
      }));

    if (!messages.length) {
      console.log(
        `[PUSH] No valid push tokens for photographer ${payload.photographerId}`,
      );
      return;
    }

    // Send in chunks (Expo limit: 100 per request)
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

        // Log results for debugging
        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === "ok") {
            console.log(`[PUSH] Sent notification successfully`);
          } else if (ticket.status === "error") {
            console.error(`[PUSH] Error sending notification:`, ticket.message);

            // Handle specific error codes
            if (ticket.details?.error === "DeviceNotRegistered") {
              // Token is invalid, should be removed from storage
              const invalidToken = chunk[index]?.to;
              if (invalidToken && typeof invalidToken === "string") {
                console.log(
                  `[PUSH] Removing invalid token: ${invalidToken.slice(0, 20)}...`,
                );
                storage
                  .unregisterPushToken(payload.photographerId, invalidToken)
                  .catch((err) => {
                    console.error("[PUSH] Error removing invalid token:", err);
                  });
              }
            }
          }
        });
      } catch (error) {
        console.error("[PUSH] Error sending push notification chunk:", error);
      }
    }
  } catch (error) {
    console.error("[PUSH] Error in sendPushNotification:", error);
  }
}

/**
 * Send push notifications to multiple photographers at once
 * Useful for batch operations
 */
export async function sendPushNotificationToMany(
  payloads: PushPayload[],
): Promise<void> {
  // Process in parallel but limit concurrency
  const batchSize = 10;
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    await Promise.all(batch.map((payload) => sendPushNotification(payload)));
  }
}
