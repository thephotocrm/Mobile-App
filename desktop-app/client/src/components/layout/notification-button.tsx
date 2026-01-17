import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  MessageSquare,
  DollarSign,
  FileText,
  Calendar,
  UserPlus,
  Eye,
  Settings2,
  CheckCheck,
  Loader2,
  Image,
  Zap,
  Clock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Map backend notification types to display config
type NotificationType = "LEAD" | "PAYMENT" | "MESSAGE" | "CONTRACT" | "SMART_FILE_VIEWED" | "SMART_FILE_ACCEPTED" | "BOOKING" | "GALLERY" | "AUTOMATION" | "REMINDER" | "SYSTEM";

interface Notification {
  id: string;
  type: NotificationType;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string | null;
  projectId: string | null;
  contactId: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

const notificationTypeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bgColor: string; label: string }> = {
  LEAD: {
    icon: UserPlus,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-950/40",
    label: "New Leads",
  },
  PAYMENT: {
    icon: DollarSign,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-950/40",
    label: "Payments",
  },
  MESSAGE: {
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-950/40",
    label: "Messages",
  },
  CONTRACT: {
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-950/40",
    label: "Contracts",
  },
  SMART_FILE_VIEWED: {
    icon: Eye,
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-950/40",
    label: "Proposal Views",
  },
  SMART_FILE_ACCEPTED: {
    icon: FileText,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-950/40",
    label: "Proposals Accepted",
  },
  BOOKING: {
    icon: Calendar,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-950/40",
    label: "Bookings",
  },
  GALLERY: {
    icon: Image,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-950/40",
    label: "Gallery Activity",
  },
  AUTOMATION: {
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-950/40",
    label: "Automations",
  },
  REMINDER: {
    icon: Clock,
    color: "text-slate-600",
    bgColor: "bg-slate-100 dark:bg-slate-950/40",
    label: "Reminders",
  },
  SYSTEM: {
    icon: Info,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-950/40",
    label: "System",
  },
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

interface NotificationButtonProps {
  transparent?: boolean;
}

export function NotificationButton({ transparent = false }: NotificationButtonProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Record<NotificationType, boolean>>({
    LEAD: true,
    PAYMENT: true,
    MESSAGE: true,
    CONTRACT: true,
    SMART_FILE_VIEWED: true,
    SMART_FILE_ACCEPTED: true,
    BOOKING: true,
    GALLERY: true,
    AUTOMATION: true,
    REMINDER: true,
    SYSTEM: true,
  });

  // Fetch notifications
  const { data: notifications = [], isLoading, isError } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications?limit=50", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
    enabled: open, // Only fetch when dropdown is open
    staleTime: 30000,
    retry: 2,
  });

  // Fetch unread count (polls every 60 seconds)
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch unread count");
      return response.json();
    },
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 30000,
    retry: 2,
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const toggleFilter = (type: NotificationType) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      setOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const filteredNotifications = notifications.filter((n) => filters[n.type]);
  const unreadCount = unreadData?.count || 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            transparent
              ? "bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 hover:text-white"
              : "hover:bg-muted"
          )}
        >
          <Bell className={cn("h-6 w-6", transparent && "drop-shadow-sm")} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-0.5 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7 px-2 hover:text-foreground"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
              )}
              Mark all read
            </Button>

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-muted"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Filter Notifications</h4>
                  </div>
                  <div className="space-y-2">
                    {(Object.keys(notificationTypeConfig) as NotificationType[]).map((type) => {
                      const config = notificationTypeConfig[type];
                      const Icon = config.icon;
                      return (
                        <label
                          key={type}
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded-md -mx-1.5"
                        >
                          <Checkbox
                            checked={filters[type]}
                            onCheckedChange={() => toggleFilter(type)}
                          />
                          <Icon className={cn("h-4 w-4", config.color)} />
                          <span className="text-sm">{config.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                {notifications.length === 0
                  ? "You're all caught up!"
                  : "Adjust filters to see more"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const config = notificationTypeConfig[notification.type] || notificationTypeConfig.SYSTEM;
                const Icon = config.icon;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      !notification.read && "bg-blue-50/50 dark:bg-blue-950/20",
                      notification.priority === "HIGH" && !notification.read && "border-l-2 border-l-orange-500"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </div>
                      {notification.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {getRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
