import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList,
  TextInput,
  Animated,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActionSheetIOS,
} from "react-native";
import { useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/Skeleton";
import { QuickReplyTemplates } from "@/components/QuickReplyTemplates";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, GradientColors, MessagingColors } from "@/constants/theme";
import { InboxStackParamList } from "@/navigation/InboxStackNavigator";
import { inboxApi, createTenantContext } from "@/services/api";

type ThreadDetailRouteProp = RouteProp<InboxStackParamList, "ThreadDetail">;

interface DisplayMessage {
  id: string;
  text: string;
  isSent: boolean;
  timestamp: string;
  createdAt?: number;
  status?: "sending" | "sent" | "delivered" | "read";
  // Grouping info (computed)
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showDateSeparator?: boolean;
  dateSeparatorText?: string;
}

// Message grouping threshold (2 minutes)
const GROUP_THRESHOLD_SECONDS = 120;

// AsyncStorage key prefix for drafts
const DRAFT_KEY_PREFIX = "@inbox_draft_";

const getDateSeparator = (timestamp: number): string => {
  const messageDate = new Date(timestamp * 1000);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  messageDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    // Format like "Tuesday 5" as shown in reference
    const weekday = messageDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const day = messageDate.getDate();
    return `${weekday} ${day}`;
  }
};

const shouldShowDateSeparator = (
  currentMsg: DisplayMessage,
  prevMsg: DisplayMessage | null,
): boolean => {
  if (!currentMsg.createdAt) return false;

  if (!prevMsg) return true;

  if (!prevMsg.createdAt) return true;

  const currentDate = new Date(currentMsg.createdAt * 1000);
  const prevDate = new Date(prevMsg.createdAt * 1000);

  currentDate.setHours(0, 0, 0, 0);
  prevDate.setHours(0, 0, 0, 0);

  return currentDate.getTime() !== prevDate.getTime();
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  // Format like "11:59 am" as shown in reference
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
};

const formatISOToTimestamp = (isoString: string): number => {
  return Math.floor(new Date(isoString).getTime() / 1000);
};

// Skeleton for loading state
const MessageSkeleton = ({ isRight }: { isRight: boolean }) => (
  <View style={[styles.messageRow, isRight && styles.messageRowSent]}>
    {!isRight && (
      <View style={styles.avatar}>
        <Skeleton width={32} height={32} borderRadius={16} />
      </View>
    )}
    <Skeleton width={isRight ? 180 : 200} height={50} borderRadius={20} />
  </View>
);

export default function ThreadDetailScreen() {
  const { theme, isDark } = useTheme();
  const { token, user } = useAuth();
  const route = useRoute<ThreadDetailRouteProp>();
  const { conversationId, contactName } = route.params;
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Calculate keyboard offset dynamically: header height (44) + status bar
  const keyboardVerticalOffset = Platform.OS === "ios" ? insets.top + 44 : 0;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollButtonOpacity = useRef(new Animated.Value(0)).current;

  // Draft persistence key
  const draftKey = `${DRAFT_KEY_PREFIX}${conversationId}`;

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(draftKey);
        if (savedDraft) {
          setMessage(savedDraft);
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      } finally {
        setDraftLoaded(true);
      }
    };
    loadDraft();
  }, [draftKey]);

  // Save draft on blur or when message changes (debounced)
  const saveDraftTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!draftLoaded) return;

    if (saveDraftTimerRef.current) {
      clearTimeout(saveDraftTimerRef.current);
    }

    saveDraftTimerRef.current = setTimeout(async () => {
      try {
        if (message.trim()) {
          await AsyncStorage.setItem(draftKey, message);
        } else {
          await AsyncStorage.removeItem(draftKey);
        }
      } catch (error) {
        console.error("Error saving draft:", error);
      }
    }, 500);

    return () => {
      if (saveDraftTimerRef.current) {
        clearTimeout(saveDraftTimerRef.current);
      }
    };
  }, [message, draftKey, draftLoaded]);

  // Clear draft on successful send
  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(draftKey);
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  };

  // Process messages with grouping info (reversed for inverted FlatList)
  const processedMessages = React.useMemo(() => {
    // First process in normal order to calculate grouping
    const processed = messages.map((msg, index) => {
      const prevMsg = index > 0 ? messages[index - 1] : null;
      const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

      // Check if should show date separator (appears above this message in normal order)
      const showDateSeparator = shouldShowDateSeparator(msg, prevMsg);
      const dateSeparatorText =
        showDateSeparator && msg.createdAt
          ? getDateSeparator(msg.createdAt)
          : undefined;

      // Check grouping with previous message
      const isSameSenderAsPrev = prevMsg?.isSent === msg.isSent;
      const isWithinTimeThresholdOfPrev =
        prevMsg?.createdAt && msg.createdAt
          ? Math.abs(msg.createdAt - prevMsg.createdAt) <
            GROUP_THRESHOLD_SECONDS
          : false;
      const isGroupedWithPrev =
        isSameSenderAsPrev && isWithinTimeThresholdOfPrev && !showDateSeparator;

      // Check grouping with next message
      const isSameSenderAsNext = nextMsg?.isSent === msg.isSent;
      const isWithinTimeThresholdOfNext =
        nextMsg?.createdAt && msg.createdAt
          ? Math.abs(nextMsg.createdAt - msg.createdAt) <
            GROUP_THRESHOLD_SECONDS
          : false;
      const nextShowsDateSeparator = nextMsg
        ? shouldShowDateSeparator(nextMsg, msg)
        : false;
      const isGroupedWithNext =
        isSameSenderAsNext &&
        isWithinTimeThresholdOfNext &&
        !nextShowsDateSeparator;

      return {
        ...msg,
        isFirstInGroup: !isGroupedWithPrev,
        isLastInGroup: !isGroupedWithNext,
        showDateSeparator,
        dateSeparatorText,
      };
    });

    // Reverse for inverted FlatList (newest first)
    return processed.reverse();
  }, [messages]);

  const loadMessages = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Create tenant context for multi-tenant routing
      const tenant = createTenantContext(user);

      // Use the correct inbox API endpoint - conversationId is actually the contactId
      const thread = await inboxApi.getThread(token, conversationId, tenant);

      // API returns messages with: id, content, direction, timestamp, isInbound, status
      const displayMessages: DisplayMessage[] = thread.messages.map(
        (msg: any) => {
          // Use content field (API) or messageBody field (legacy) for message text
          const text = msg.content || msg.messageBody || "";
          // Use timestamp field (API) or sentAt field (legacy) for time
          const msgTimestamp = msg.timestamp || msg.sentAt || "";
          const createdAt = msgTimestamp
            ? formatISOToTimestamp(msgTimestamp)
            : 0;

          // Map API status to our status type
          let status: DisplayMessage["status"] = "sent";
          if (msg.status === "delivered") status = "delivered";
          else if (msg.status === "read") status = "read";

          return {
            id: msg.id,
            text,
            isSent: msg.direction === "OUTBOUND" || msg.isInbound === false,
            timestamp: createdAt ? formatTimestamp(createdAt) : "",
            createdAt,
            status,
          };
        },
      );

      // Sort messages by timestamp ascending (oldest first, newest at bottom)
      displayMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      setMessages(displayMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read when opening thread
  const markMessagesAsRead = async () => {
    if (!token) return;

    try {
      const tenant = createTenantContext(user);
      await inboxApi.markRead(token, conversationId, tenant);
    } catch (error) {
      console.error("Error marking messages as read:", error);
      // Don't show error to user - this is a background operation
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId, token, user]);

  // Mark messages as read when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      markMessagesAsRead();
    }, [conversationId, token, user]),
  );

  // Track keyboard visibility
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Scroll to bottom (offset 0 in inverted list)
  const scrollToBottom = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Handle scroll to show/hide scroll-to-bottom button
  // In inverted list, offset 0 is the bottom (newest messages)
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      // Show button when scrolled away from bottom (offset > threshold)
      const shouldShow = contentOffset.y > 200;

      if (shouldShow !== showScrollButton) {
        setShowScrollButton(shouldShow);
        Animated.spring(scrollButtonOpacity, {
          toValue: shouldShow ? 1 : 0,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    },
    [showScrollButton],
  );

  const handleSend = async () => {
    if (!message.trim() || !token) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();

    const messageText = message.trim();

    try {
      setSending(true);
      const tenant = createTenantContext(user);

      // Add the message locally for immediate feedback (optimistic update)
      const newMessage: DisplayMessage = {
        id: `temp-${Date.now()}`,
        text: messageText,
        isSent: true,
        timestamp: "Just now",
        createdAt: Math.floor(Date.now() / 1000),
        status: "sending",
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");

      // Clear draft on send
      await clearDraft();

      // Scroll to the new message (offset 0 in inverted list)
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);

      // Send SMS via inbox API
      await inboxApi.sendSms(
        token,
        conversationId,
        messageText,
        undefined, // imageUrl - for MMS support
        tenant,
      );

      // Update the temp message status to sent
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMessage.id ? { ...m, status: "sent" as const } : m,
        ),
      );

      // Reload messages to get the confirmed message from server
      setTimeout(() => {
        loadMessages();
      }, 1500);
    } catch (error) {
      console.error("Error sending message:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Send Failed", "Failed to send message. Please try again.");
      // Remove the temp message on error and restore the draft
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
      setMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReplySelect = (templateMessage: string) => {
    setMessage(templateMessage);
    // Focus the input so user can edit before sending
    setInputFocused(true);
  };

  // Copy message to clipboard
  const handleCopyMessage = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error copying message:", error);
    }
  };

  // Show message options (iOS ActionSheet or Android Alert)
  const showMessageOptions = (msg: DisplayMessage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Copy"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCopyMessage(msg.text);
          }
        },
      );
    } else {
      Alert.alert("Message Options", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Copy", onPress: () => handleCopyMessage(msg.text) },
      ]);
    }
  };

  // Render status indicator
  const renderStatusIndicator = (
    status: DisplayMessage["status"],
    isSent: boolean,
  ) => {
    if (!isSent) return null;

    switch (status) {
      case "sending":
        return (
          <ActivityIndicator
            size={10}
            color="rgba(255,255,255,0.7)"
            style={styles.statusIcon}
          />
        );
      case "delivered":
        return (
          <View style={styles.doubleCheck}>
            <Feather name="check" size={10} color="rgba(255,255,255,0.7)" />
            <Feather
              name="check"
              size={10}
              color="rgba(255,255,255,0.7)"
              style={{ marginLeft: -6 }}
            />
          </View>
        );
      case "read":
        return (
          <View style={styles.doubleCheck}>
            <Feather name="check" size={10} color="#60A5FA" />
            <Feather
              name="check"
              size={10}
              color="#60A5FA"
              style={{ marginLeft: -6 }}
            />
          </View>
        );
      case "sent":
      default:
        return (
          <Feather
            name="check"
            size={10}
            color="rgba(255,255,255,0.7)"
            style={styles.statusIcon}
          />
        );
    }
  };

  const renderMessage = useCallback(
    ({ item: msg }: { item: DisplayMessage }) => {
      const isGroupedMessage = !msg.isFirstInGroup;
      const showTimestamp = msg.isLastInGroup;

      return (
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${msg.isSent ? "You" : contactName}: ${msg.text}. ${msg.timestamp}`}
        >
          {/* Date separator */}
          {msg.showDateSeparator && msg.dateSeparatorText && (
            <View style={styles.dateSeparatorContainer}>
              <View
                style={[
                  styles.dateSeparatorPill,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundTertiary
                      : "#E5E7EB",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dateSeparatorText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {msg.dateSeparatorText}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Message row */}
          <View
            style={[
              styles.messageRow,
              msg.isSent && styles.messageRowSent,
              isGroupedMessage && styles.messageRowGrouped,
            ]}
          >
            {/* Avatar - only show for first message in group from contact */}
            {!msg.isSent && msg.isFirstInGroup && (
              <View style={styles.avatar}>
                <Avatar name={contactName} size={32} showGradient={false} />
              </View>
            )}
            {!msg.isSent && !msg.isFirstInGroup && (
              <View style={styles.avatarPlaceholder} />
            )}

            {/* Message bubble with long-press for copy */}
            <Pressable
              onLongPress={() => showMessageOptions(msg)}
              delayLongPress={300}
              style={{ maxWidth: "75%" }}
            >
              {msg.isSent ? (
                <LinearGradient
                  colors={
                    isDark
                      ? (GradientColors.messageSentDark as [string, string])
                      : (GradientColors.messageSent as [string, string])
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.messageBubble,
                    styles.sentMessage,
                    isGroupedMessage && styles.sentMessageGrouped,
                  ]}
                >
                  <ThemedText
                    style={[styles.messageText, { color: "#FFFFFF" }]}
                  >
                    {msg.text}
                  </ThemedText>

                  {/* Footer with timestamp and status - only on last message of group */}
                  {showTimestamp && (
                    <View style={styles.messageFooter}>
                      <ThemedText
                        style={[
                          styles.timestamp,
                          { color: "rgba(255,255,255,0.7)" },
                        ]}
                      >
                        {msg.timestamp}
                      </ThemedText>
                      {renderStatusIndicator(msg.status, msg.isSent)}
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor: isDark
                        ? MessagingColors.receivedBubbleDark
                        : MessagingColors.receivedBubble,
                    },
                    styles.receivedMessage,
                    isGroupedMessage && styles.receivedMessageGrouped,
                  ]}
                >
                  <ThemedText
                    style={[styles.messageText, { color: theme.text }]}
                  >
                    {msg.text}
                  </ThemedText>

                  {/* Footer with timestamp - only on last message of group */}
                  {showTimestamp && (
                    <View style={styles.messageFooter}>
                      <ThemedText
                        style={[
                          styles.timestamp,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {msg.timestamp}
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          </View>
        </View>
      );
    },
    [theme, contactName, isDark],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: `${MessagingColors.primary}15` },
        ]}
      >
        <Feather
          name="message-circle"
          size={32}
          color={MessagingColors.primary}
        />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        Start the conversation
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Send a message to {contactName} to get started
      </ThemedText>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <MessageSkeleton isRight={false} />
      <MessageSkeleton isRight={true} />
      <MessageSkeleton isRight={false} />
      <MessageSkeleton isRight={true} />
      <MessageSkeleton isRight={false} />
    </View>
  );

  // Character count for SMS
  const charCount = message.length;
  const maxChars = 160;
  const showCharCount = charCount > 100;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {loading ? (
        renderSkeleton()
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={processedMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={[
              styles.messagesContainer,
              processedMessages.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={renderEmptyState}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {/* Scroll to bottom FAB */}
          <Animated.View
            style={[
              styles.scrollToBottomButton,
              {
                backgroundColor: theme.backgroundCard,
                borderColor: theme.border,
                opacity: scrollButtonOpacity,
                transform: [
                  {
                    translateY: scrollButtonOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={showScrollButton ? "auto" : "none"}
          >
            <Pressable
              onPress={scrollToBottom}
              style={styles.scrollToBottomPressable}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-down" size={20} color={theme.text} />
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Input area */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
            paddingBottom: keyboardVisible
              ? Spacing.md
              : tabBarHeight + Spacing.sm,
          },
        ]}
      >
        {/* Character count */}
        {showCharCount && (
          <View style={styles.charCountContainer}>
            <ThemedText
              style={[
                styles.charCount,
                {
                  color: charCount > maxChars ? "#EF4444" : theme.textSecondary,
                },
              ]}
            >
              {charCount}/{maxChars}
            </ThemedText>
          </View>
        )}

        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark
                ? theme.backgroundTertiary
                : MessagingColors.searchBg,
              borderColor: inputFocused
                ? MessagingColors.primary
                : "transparent",
              borderWidth: inputFocused ? 1.5 : 0,
            },
          ]}
        >
          {/* Attachment Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Attachments",
                "Attachment functionality coming soon",
              );
            }}
            style={styles.attachmentButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
          >
            <Feather name="paperclip" size={20} color={theme.textSecondary} />
          </Pressable>

          <TextInput
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={[styles.textInput, { color: theme.text }]}
            multiline
            maxLength={1000}
            editable={!sending}
            accessibilityLabel="Message input"
            accessibilityHint="Type your message here"
          />

          {/* Quick Reply Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowQuickReplies(true);
            }}
            style={styles.quickReplyButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Quick replies"
            accessibilityHint="Open quick reply templates"
          >
            <Feather name="zap" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            onPress={handleSend}
            disabled={!message.trim() || sending}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !message.trim() || sending }}
          >
            {!message.trim() && !sending ? (
              <View
                style={[
                  styles.sendButton,
                  { backgroundColor: theme.textTertiary },
                ]}
              >
                <Feather name="arrow-up" size={20} color="#FFFFFF" />
              </View>
            ) : (
              <LinearGradient
                colors={GradientColors.messageSent as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButton}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="arrow-up" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </View>

      {/* Quick Reply Templates Modal */}
      <QuickReplyTemplates
        visible={showQuickReplies}
        onClose={() => setShowQuickReplies(false)}
        onSelectTemplate={handleQuickReplySelect}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messagesContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  messageRowSent: {
    justifyContent: "flex-end",
  },
  messageRowGrouped: {
    marginBottom: 3,
  },
  avatar: {
    marginBottom: 2,
  },
  avatarPlaceholder: {
    width: 32,
  },
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 20,
  },
  sentMessage: {
    borderBottomRightRadius: 6,
  },
  receivedMessage: {
    borderBottomLeftRadius: 6,
  },
  sentMessageGrouped: {
    borderTopRightRadius: 6,
  },
  receivedMessageGrouped: {
    borderTopLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: Spacing.xs,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  statusIcon: {
    marginLeft: 2,
  },
  doubleCheck: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2,
  },
  dateSeparatorContainer: {
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  dateSeparatorPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  // Scroll to bottom FAB
  scrollToBottomButton: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollToBottomPressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Input area styles
  inputContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  charCountContainer: {
    alignItems: "flex-end",
    marginBottom: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  charCount: {
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: Spacing.xs,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 2,
    minHeight: 48,
  },
  attachmentButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  quickReplyButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
