import { useState, useRef, useEffect, useCallback } from "react";
import {
  HelpCircle,
  X,
  Send,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";

interface ChatbotAction {
  label: string;
  type: "navigate" | "external";
  target: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
  feedback?: "helpful" | "not-helpful" | null;
  actions?: ChatbotAction[];
}

interface ChatbotWidgetProps {
  context?: string;
  photographerName?: string;
  hideOnMobile?: boolean;
  stripeConnected?: boolean;
  projectCount?: number;
  hasAutomations?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Page-specific suggestions
const PAGE_SUGGESTIONS: Record<string, string[]> = {
  dashboard: [
    "What do the dashboard stats mean?",
    "How do I track my revenue?",
    "How do I create my first project?",
  ],
  projects: [
    "How do project stages work?",
    "How do I archive a project?",
    "What are pipeline stages?",
  ],
  contacts: [
    "How do I import contacts?",
    "How do I merge duplicate contacts?",
    "What's the difference between clients and leads?",
  ],
  automations: [
    "How do triggers work?",
    "What actions can automations perform?",
    "How do I test an automation?",
  ],
  "smart-files": [
    "How do I create a proposal?",
    "How do payment schedules work?",
    "What's the difference between templates and instances?",
  ],
  templates: [
    "What variables can I use in templates?",
    "How do I create an email template?",
    "Can I reuse templates across projects?",
  ],
  galleries: [
    "How do I upload photos?",
    "How do clients select favorites?",
    "What are gallery privacy settings?",
  ],
  settings: [
    "How do I connect Stripe?",
    "How do I set up email integration?",
    "How do I customize my branding?",
  ],
  scheduling: [
    "How does online booking work?",
    "How do I set my availability?",
    "Can clients reschedule themselves?",
  ],
  inbox: [
    "How does two-way messaging work?",
    "Can I send SMS messages?",
    "How do email replies get tracked?",
  ],
};

const DEFAULT_SUGGESTIONS = [
  "How do I create an automation?",
  "How do Smart Files work?",
  "How do I connect Stripe?",
  "How do I send a proposal?",
];

const STORAGE_KEY = "thePhotocrm-chatbot-history";
const NUDGE_DISMISSED_KEY = "thePhotocrm-chatbot-nudge-dismissed";

export function ChatbotWidget({
  context = "general",
  photographerName,
  hideOnMobile = false,
  stripeConnected,
  projectCount,
  hasAutomations,
  isOpen: controlledIsOpen,
  onOpenChange,
}: ChatbotWidgetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(
    null,
  );
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [pendingFollowUp, setPendingFollowUp] = useState<{
    action: ChatbotAction;
    originalQuestion: string;
    previousPage: string;
  } | null>(null);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useLocation();

  // Get current page context from URL
  const getCurrentPage = useCallback(() => {
    const path = location.split("?")[0].split("/")[1] || "dashboard";
    return path;
  }, [location]);

  // Get dynamic suggestions based on context
  const getSuggestions = useCallback(() => {
    const page = getCurrentPage();

    // Priority 1: Incomplete setup suggestions
    if (stripeConnected === false) {
      return [
        "How do I connect Stripe?",
        "Can I accept payments without Stripe?",
        "What payment methods are supported?",
        ...(PAGE_SUGGESTIONS[page]?.slice(0, 1) || []),
      ];
    }

    if (projectCount === 0) {
      return [
        "How do I create my first project?",
        "What's the best way to organize clients?",
        "How do project stages work?",
        ...(PAGE_SUGGESTIONS[page]?.slice(0, 1) || []),
      ];
    }

    if (hasAutomations === false && (projectCount ?? 0) >= 3) {
      return [
        "How do I set up automations?",
        "What can automations do for me?",
        ...(PAGE_SUGGESTIONS[page]?.slice(0, 2) || []),
      ];
    }

    // Priority 2: Page-specific suggestions
    if (PAGE_SUGGESTIONS[page]) {
      return PAGE_SUGGESTIONS[page];
    }

    // Default suggestions
    return DEFAULT_SUGGESTIONS;
  }, [getCurrentPage, stripeConnected, projectCount, hasAutomations]);

  // Get proactive nudge message
  const getNudgeMessage = useCallback(() => {
    if (nudgeDismissed) return null;

    // Check localStorage for dismissed nudges
    const dismissed = localStorage.getItem(NUDGE_DISMISSED_KEY);
    if (dismissed) {
      const dismissedData = JSON.parse(dismissed);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (dismissedData.timestamp > oneWeekAgo) {
        return null;
      }
    }

    if (stripeConnected === false) {
      return {
        icon: "payment",
        message: "Ready to accept payments? I can help you connect Stripe.",
        question: "How do I connect Stripe?",
      };
    }

    if (projectCount === 0) {
      return {
        icon: "project",
        message: "Let's get started! I can help you create your first project.",
        question: "How do I create my first project?",
      };
    }

    if (hasAutomations === false && (projectCount ?? 0) >= 3) {
      return {
        icon: "automation",
        message: "Save time with automations! Want me to show you how?",
        question: "How do automations work?",
      };
    }

    return null;
  }, [stripeConnected, projectCount, hasAutomations, nudgeDismissed]);

  const dismissNudge = () => {
    setNudgeDismissed(true);
    localStorage.setItem(
      NUDGE_DISMISSED_KEY,
      JSON.stringify({ timestamp: Date.now() }),
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+/ or Ctrl+/ to toggle chatbot
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }

      // Escape to close chatbot (only if open)
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const restored = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
        setShowSuggestions(false);
      } catch (e) {
        console.error("Failed to restore chat history:", e);
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom smoothly
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isFollowUpLoading]);

  // Add greeting when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = photographerName
        ? `Hi ${photographerName}! I'm here to help you get the most out of thePhotoCrm. What would you like to know?`
        : "Hi! I'm here to help you get the most out of thePhotoCrm. What would you like to know?";

      setMessages([
        {
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, photographerName, messages.length]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const res = await apiRequest("POST", "/api/chatbot", {
        message: text,
        context: `${context}:${getCurrentPage()}`,
        photographerName,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const response = (await res.json()) as {
        message: string;
        actions?: ChatbotAction[];
      };

      const assistantMessage: Message = {
        role: "assistant",
        content: response.message,
        timestamp: new Date(),
        actions: response.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (
    index: number,
    feedback: "helpful" | "not-helpful",
  ) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, feedback } : m)),
    );
  };

  // Handle navigation follow-up after user clicks an action button
  const handleNavigationFollowUp = useCallback(
    async (
      action: ChatbotAction,
      originalQuestion: string,
      previousPage: string,
    ) => {
      if (isFollowUpLoading || isLoading) return;

      setIsFollowUpLoading(true);

      try {
        const res = await apiRequest("POST", "/api/chatbot", {
          message: "[NAVIGATION_FOLLOW_UP]",
          context: `${context}:${action.target.replace("/", "").split("?")[0]}`,
          photographerName,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          navigationContext: {
            navigatedTo: action.target,
            actionLabel: action.label,
            previousPage: previousPage,
            originalUserQuestion: originalQuestion,
            isFollowUp: true,
          },
        });

        const response = (await res.json()) as {
          message: string;
          actions?: ChatbotAction[];
        };

        const followUpMessage: Message = {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
          actions: response.actions,
        };

        setMessages((prev) => [...prev, followUpMessage]);
      } catch (error) {
        // Silent fail - follow-ups are bonus UX, not critical
        console.error("Navigation follow-up error:", error);
      } finally {
        setIsFollowUpLoading(false);
        setPendingFollowUp(null);
      }
    },
    [isFollowUpLoading, isLoading, context, photographerName, messages],
  );

  const handleActionClick = (action: ChatbotAction) => {
    if (action.type === "navigate") {
      // Find the last user message to understand context
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      const originalQuestion = lastUserMessage?.content || "";
      const previousPage = getCurrentPage();

      // Navigate first
      setLocation(action.target);

      // Only trigger follow-up for actionable routes
      const actionableRoutes = [
        "/automations",
        "/smart-files",
        "/templates",
        "/projects",
        "/contacts",
        "/galleries",
        "/scheduling",
        "/settings",
        "/lead-forms",
        "/packages",
        "/add-ons",
        "/drip-campaigns",
        "/questionnaires",
      ];

      const targetPath = action.target.split("?")[0];
      if (actionableRoutes.some((route) => targetPath.startsWith(route))) {
        // Set pending follow-up (will be triggered by useEffect after delay)
        setPendingFollowUp({
          action,
          originalQuestion,
          previousPage,
        });
      }
    } else if (action.type === "external") {
      window.open(action.target, "_blank", "noopener,noreferrer");
    }
  };

  // Trigger navigation follow-up after delay
  useEffect(() => {
    if (pendingFollowUp && !isLoading && !isFollowUpLoading) {
      // 500ms delay feels natural - lets navigation complete
      const timer = setTimeout(() => {
        handleNavigationFollowUp(
          pendingFollowUp.action,
          pendingFollowUp.originalQuestion,
          pendingFollowUp.previousPage,
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pendingFollowUp, isLoading, isFollowUpLoading, handleNavigationFollowUp]);

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setShowSuggestions(true);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const nudge = getNudgeMessage();
  const suggestions = getSuggestions();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 md:w-[420px] md:h-[600px] w-full h-full bg-white dark:bg-gray-900 md:rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Help Assistant
                </h3>
                <p className="text-xs text-gray-500">
                  Ask me anything about thePhotoCrm
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chatbot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Proactive Nudge Banner */}
          {nudge && (
            <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    {nudge.message}
                  </p>
                  <button
                    onClick={() => {
                      handleSend(nudge.question);
                      dismissNudge();
                    }}
                    className="text-xs text-amber-700 dark:text-amber-300 hover:underline mt-1 font-medium"
                  >
                    Learn how
                  </button>
                </div>
                <button
                  onClick={dismissNudge}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col gap-1",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                  onMouseEnter={() => setHoveredMessageIndex(index)}
                  onMouseLeave={() => setHoveredMessageIndex(null)}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : message.isError
                          ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-bl-md"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md",
                    )}
                  >
                    {message.isError && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Error</span>
                      </div>
                    )}
                    {message.role === "assistant" ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1.5 px-1">
                      {message.actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          onClick={() => handleActionClick(action)}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                        >
                          {action.label}
                          {action.type === "navigate" ? (
                            <ArrowRight className="w-3 h-3" />
                          ) : (
                            <ExternalLink className="w-3 h-3" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp - show on hover or for messages older than 5 min */}
                  <span
                    className={cn(
                      "text-[10px] text-gray-400 px-2 transition-opacity duration-150",
                      hoveredMessageIndex === index ||
                        new Date().getTime() - message.timestamp.getTime() >
                          300000
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  >
                    {formatTimestamp(message.timestamp)}
                  </span>

                  {/* Feedback buttons for assistant messages */}
                  {message.role === "assistant" &&
                    !message.isError &&
                    index > 0 && (
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2 transition-opacity",
                          hoveredMessageIndex === index || message.feedback
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      >
                        {message.feedback ? (
                          <span className="text-[10px] text-gray-400">
                            {message.feedback === "helpful"
                              ? "Thanks for the feedback!"
                              : "We'll try to improve"}
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] text-gray-400 mr-1">
                              Helpful?
                            </span>
                            <button
                              onClick={() => handleFeedback(index, "helpful")}
                              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900 text-gray-400 hover:text-green-600 transition-colors"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() =>
                                handleFeedback(index, "not-helpful")
                              }
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                </div>
              ))}

              {/* Typing indicator */}
              {(isLoading || isFollowUpLoading) && (
                <div className="flex items-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Suggested questions */}
              {showSuggestions && messages.length === 1 && !isLoading && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((question, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(question)}
                        className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scroll anchor for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Cancel pending follow-up if user starts typing
                  if (e.target.value.trim() && pendingFollowUp) {
                    setPendingFollowUp(null);
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Ask about automations, Smart Files, payments..."
                disabled={isLoading}
                data-testid="input-chatbot-message"
                className="flex-1 text-sm"
              />
              <Button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                size="sm"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Press Enter to send ·{" "}
              <span className="hidden md:inline">⌘/ to toggle</span>
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40",
          hideOnMobile && "hidden md:flex",
        )}
        size="icon"
        data-testid="button-toggle-chatbot"
      >
        {isOpen ? (
          <X className="!h-5 !w-5" />
        ) : (
          <HelpCircle className="!h-8 !w-8" />
        )}
      </Button>
    </>
  );
}
