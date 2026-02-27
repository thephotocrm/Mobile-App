import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  inboxApi,
  notificationsApi,
  createTenantContext,
} from "@/services/api";

interface InboxContextType {
  unreadCount: number;
  notificationUnreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (amount?: number) => void;
}

const InboxContext = createContext<InboxContextType | undefined>(undefined);

// Polling interval for unread count (30 seconds)
const UNREAD_COUNT_POLL_INTERVAL = 30000;

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const tenant = createTenantContext(user);
      const [conversations, notifications] = await Promise.all([
        inboxApi.getConversations(token, tenant),
        notificationsApi.getAll(token, tenant, 50).catch(() => []),
      ]);

      // Sum up all unread counts from conversations
      const total = conversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0,
      );
      setUnreadCount(total);

      // Count unread notifications
      if (Array.isArray(notifications)) {
        const unreadNotifs = notifications.filter((n) => !n.read).length;
        setNotificationUnreadCount(unreadNotifs);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [token, user]);

  // Decrement unread count when user reads messages
  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    if (token) {
      refreshUnreadCount();

      // Set up polling
      pollIntervalRef.current = setInterval(
        refreshUnreadCount,
        UNREAD_COUNT_POLL_INTERVAL,
      );
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [token, refreshUnreadCount]);

  return (
    <InboxContext.Provider
      value={{
        unreadCount,
        notificationUnreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
      }}
    >
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  const context = useContext(InboxContext);
  if (context === undefined) {
    throw new Error("useInbox must be used within an InboxProvider");
  }
  return context;
}
