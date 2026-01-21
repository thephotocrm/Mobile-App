import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://app.thephotocrm.com";

interface TenantContext {
  photographerId?: string;
  userRole?: "PHOTOGRAPHER" | "CLIENT";
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  tenant?: TenantContext;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { token, tenant, ...fetchOptions } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    // Add multi-tenant headers for mobile app routing
    if (tenant?.photographerId) {
      (headers as Record<string, string>)["x-photographer-id"] =
        tenant.photographerId;
    }
    if (tenant?.userRole) {
      (headers as Record<string, string>)["x-user-role"] = tenant.userRole;
    }

    const url = `${this.baseUrl}${endpoint}`;

    if (__DEV__) {
      console.log(`[API] ${options.method || "GET"} ${url}`);
      if (fetchOptions.body) {
        const bodyForLog = JSON.parse(fetchOptions.body as string);
        if (bodyForLog.password) {
          bodyForLog.password = "***HIDDEN***";
        }
        console.log("[API] Request body:", JSON.stringify(bodyForLog));
      }
      if (tenant?.photographerId) {
        console.log("[API] Tenant headers:", {
          photographerId: tenant.photographerId,
          userRole: tenant.userRole,
        });
      }
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (__DEV__) {
        console.log(
          `[API] Response status: ${response.status} ${response.statusText}`,
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        if (__DEV__) {
          console.log("[API] Error response body:", errorText);
        }

        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { rawError: errorText };
        }

        throw new ApiError(
          (errorData as { message?: string }).message ||
            `HTTP ${response.status}`,
          response.status,
          errorData,
        );
      }

      if (response.status === 204) {
        if (__DEV__) {
          console.log("[API] Empty response (204)");
        }
        return {} as T;
      }

      const data = await response.json();
      if (__DEV__) {
        console.log(
          "[API] Success response:",
          JSON.stringify(data, (key, value) =>
            key === "token" ? "***TOKEN_RECEIVED***" : value,
          ),
        );
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        if (__DEV__) {
          console.log(
            `[API] ApiError: ${error.message} (status: ${error.status})`,
          );
        }
        throw error;
      }
      if (__DEV__) {
        console.log(
          "[API] Network/Fetch error:",
          error instanceof Error ? error.message : String(error),
        );
      }
      throw new ApiError(
        error instanceof Error ? error.message : "Network error",
        0,
        {},
      );
    }
  }

  async get<T>(
    endpoint: string,
    token?: string | null,
    tenant?: TenantContext,
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", token, tenant });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    token?: string | null,
    tenant?: TenantContext,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      token,
      tenant,
    });
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    token?: string | null,
    tenant?: TenantContext,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      token,
      tenant,
    });
  }

  async delete<T>(
    endpoint: string,
    token?: string | null,
    tenant?: TenantContext,
  ): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", token, tenant });
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    token?: string | null,
    tenant?: TenantContext,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      token,
      tenant,
    });
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE_URL);

export interface User {
  id: string;
  email: string;
  role: "PHOTOGRAPHER" | "CLIENT";
  photographerId?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  projectTypeId?: string;
}

export interface Contact {
  id: string;
  photographerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  hasEventDate: boolean;
  projectType: ProjectType;
  stageId?: string;
  stage?: Stage;
  status: "ACTIVE" | "ARCHIVED";
  emailOptIn: boolean;
  smsOptIn: boolean;
  createdAt: string;
}

export type ProjectType =
  | "WEDDING"
  | "ENGAGEMENT"
  | "PROPOSAL"
  | "CORPORATE"
  | "PORTRAIT"
  | "FAMILY"
  | "MATERNITY"
  | "NEWBORN"
  | "EVENT"
  | "COMMERCIAL"
  | "OTHER";

export type LeadSource =
  | "MANUAL"
  | "WEBSITE_WIDGET"
  | "REFERRAL"
  | "SOCIAL_MEDIA"
  | "OTHER";

export interface Project {
  id: string;
  clientId: string;
  photographerId: string;
  title: string;
  projectType: ProjectType;
  eventDate?: string;
  hasEventDate: boolean;
  stageId?: string;
  stage?: Stage;
  stageEnteredAt?: string;
  leadSource?: LeadSource;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes?: string;
  client?: Contact;
  createdAt: string;
  // Gallery fields
  galleryUrl?: string;
  galleryId?: string;
  galleryReady?: boolean;
  galleryCreatedAt?: string;
  gallerySharedAt?: string;
  isPublicGallery?: boolean;
}

// Inbox conversation from /api/inbox/conversations
// API response structure for /api/inbox/conversations
export interface InboxConversationApiResponse {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  lastReadAt?: string;
  lastMessageDirection?: "INBOUND" | "OUTBOUND";
}

// Transformed structure for UI consumption
export interface InboxConversation {
  contactId: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  channel: "SMS" | "EMAIL";
}

// Message from /api/inbox/thread/:contactId
export interface InboxMessage {
  id: string;
  type: "SMS" | "EMAIL";
  content: string;
  direction: "INBOUND" | "OUTBOUND";
  timestamp: string;
  isInbound: boolean;
  status: string;
  imageUrl?: string | null;
  // Legacy fields for backwards compatibility
  messageBody?: string;
  channel?: "SMS" | "EMAIL";
  sentAt?: string;
  deliveredAt?: string;
}

export interface InboxThread {
  messages: InboxMessage[];
  hasMore: boolean;
}

// Legacy conversation types (kept for compatibility)
export interface Conversation {
  id: string;
  projectId: string;
  photographerId: string;
  clientId: string;
  client?: Contact;
  project?: Project;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "PHOTOGRAPHER" | "CLIENT";
  content: string;
  messageType: "SMS" | "EMAIL" | "INTERNAL";
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  createdAt: string;
}

export interface Booking {
  id: string;
  photographerId: string;
  projectId?: string;
  projectSmartFileId?: string | null;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  location?: string;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  bookingType?: "CONSULTATION" | "SHOOT" | "MEETING" | "OTHER";
  isFirstBooking?: boolean;
  googleCalendarEventId?: string | null;
  googleMeetLink?: string | null;
  bookingToken?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientName?: string;
  photographerReminderSent?: boolean;
  createdAt: string;
}

// Helper to create tenant context from user
export function createTenantContext(user: User | null): TenantContext {
  return {
    photographerId: user?.photographerId,
    userRole: user?.role,
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),

  register: (email: string, password: string, businessName: string) =>
    api.post<LoginResponse>("/api/auth/register", {
      email,
      password,
      businessName,
    }),

  me: (token: string, tenant?: TenantContext) =>
    api.get<User>("/api/auth/me", token, tenant),

  logout: (token: string, tenant?: TenantContext) =>
    api.post<{ message: string }>("/api/auth/logout", undefined, token, tenant),

  deleteAccount: (token: string, tenant?: TenantContext) =>
    api.delete<{ message: string }>("/api/auth/delete-account", token, tenant),
};

export const projectsApi = {
  getAll: (
    token: string,
    tenant?: TenantContext,
    status?: string,
    stageId?: string,
  ) => {
    let endpoint = "/api/projects";
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (stageId) params.append("stageId", stageId);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return api.get<Project[]>(endpoint, token, tenant);
  },

  getById: (token: string, id: string, tenant?: TenantContext) =>
    api.get<Project>(`/api/projects/${id}`, token, tenant),

  create: (token: string, data: Partial<Project>, tenant?: TenantContext) =>
    api.post<Project>("/api/projects", data, token, tenant),

  update: (
    token: string,
    id: string,
    data: Partial<Project>,
    tenant?: TenantContext,
  ) => api.put<Project>(`/api/projects/${id}`, data, token, tenant),

  updateStage: (
    token: string,
    id: string,
    stageId: string,
    tenant?: TenantContext,
  ) =>
    api.put<Project>(`/api/projects/${id}/stage`, { stageId }, token, tenant),

  // POST /api/projects/:id/send-sms - Send SMS to project client
  sendSms: (
    token: string,
    projectId: string,
    message: string,
    imageUrl?: string,
    tenant?: TenantContext,
  ) =>
    api.post<{ success: boolean; messageId?: string }>(
      `/api/projects/${projectId}/send-sms`,
      { message, imageUrl },
      token,
      tenant,
    ),

  // POST /api/projects/:projectId/smart-files/:projectSmartFileId/send-sms
  // Send Smart File link via SMS to project client
  sendSmartFileSms: (
    token: string,
    projectId: string,
    projectSmartFileId: string,
    message: string,
    tenant?: TenantContext,
  ) =>
    api.post<{ success: boolean; messageId?: string }>(
      `/api/projects/${projectId}/smart-files/${projectSmartFileId}/send-sms`,
      { message },
      token,
      tenant,
    ),
};

export const contactsApi = {
  getAll: (
    token: string,
    tenant?: TenantContext,
    stageId?: string,
    status?: string,
  ) => {
    let endpoint = "/api/contacts";
    const params = new URLSearchParams();
    if (stageId) params.append("stageId", stageId);
    if (status) params.append("status", status);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return api.get<Contact[]>(endpoint, token, tenant);
  },

  getById: (token: string, id: string, tenant?: TenantContext) =>
    api.get<Contact>(`/api/contacts/${id}`, token, tenant),

  create: (token: string, data: Partial<Contact>, tenant?: TenantContext) =>
    api.post<Contact>("/api/contacts", data, token, tenant),

  update: (
    token: string,
    id: string,
    data: Partial<Contact>,
    tenant?: TenantContext,
  ) => api.put<Contact>(`/api/contacts/${id}`, data, token, tenant),
};

// NEW: Inbox API using correct endpoints from documentation
export const inboxApi = {
  // GET /api/inbox/conversations - Get all conversations for photographer
  // Returns raw API format with nested contact object
  getConversations: (token: string, tenant?: TenantContext) =>
    api.get<InboxConversationApiResponse[]>(
      "/api/inbox/conversations",
      token,
      tenant,
    ),

  // GET /api/inbox/thread/:contactId - Get message thread with a specific contact
  getThread: (
    token: string,
    contactId: string,
    tenant?: TenantContext,
    options?: { limit?: number; offset?: number },
  ) => {
    const params = new URLSearchParams();
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    const queryString = params.toString();
    const url = `/api/inbox/thread/${contactId}${queryString ? `?${queryString}` : ""}`;
    return api.get<InboxThread>(url, token, tenant);
  },

  // POST /api/inbox/send-sms - Send SMS or MMS to a contact
  sendSms: (
    token: string,
    contactId: string,
    message: string,
    imageUrl?: string,
    tenant?: TenantContext,
  ) =>
    api.post<{ success: boolean; messageId?: string }>(
      "/api/inbox/send-sms",
      { contactId, message, imageUrl },
      token,
      tenant,
    ),

  // POST /api/inbox/mark-read/:contactId - Mark messages from contact as read
  markRead: (token: string, contactId: string, tenant?: TenantContext) =>
    api.post<{ success: boolean }>(
      `/api/inbox/mark-read/${contactId}`,
      null,
      token,
      tenant,
    ),

  // GET /api/inbox/unread-count - Get total unread count
  getUnreadCount: (token: string, tenant?: TenantContext) =>
    api.get<{ unreadCount: number }>("/api/inbox/unread-count", token, tenant),
};

// Legacy conversations API (kept for backwards compatibility)
export const conversationsApi = {
  getAll: (token: string, tenant?: TenantContext) =>
    api.get<Conversation[]>("/api/conversations", token, tenant),

  getById: (token: string, id: string, tenant?: TenantContext) =>
    api.get<Conversation>(`/api/conversations/${id}`, token, tenant),

  getMessages: (
    token: string,
    conversationId: string,
    tenant?: TenantContext,
  ) =>
    api.get<Message[]>(
      `/api/conversations/${conversationId}/messages`,
      token,
      tenant,
    ),

  sendMessage: (
    token: string,
    conversationId: string,
    content: string,
    messageType: string = "SMS",
    tenant?: TenantContext,
  ) =>
    api.post<Message>(
      `/api/conversations/${conversationId}/messages`,
      { content, messageType },
      token,
      tenant,
    ),
};

export const bookingsApi = {
  getAll: (token: string, tenant?: TenantContext) =>
    api.get<Booking[]>("/api/bookings", token, tenant),

  getById: (token: string, id: string, tenant?: TenantContext) =>
    api.get<Booking>(`/api/bookings/${id}`, token, tenant),

  create: (token: string, data: Partial<Booking>, tenant?: TenantContext) =>
    api.post<Booking>("/api/bookings", data, token, tenant),

  update: (
    token: string,
    id: string,
    data: Partial<Booking>,
    tenant?: TenantContext,
  ) => api.put<Booking>(`/api/bookings/${id}`, data, token, tenant),
};

export const stagesApi = {
  getAll: (token: string, tenant?: TenantContext) =>
    api.get<Stage[]>("/api/stages", token, tenant),
};

// Notification types from the API
export type NotificationType =
  | "LEAD"
  | "PAYMENT"
  | "MESSAGE"
  | "CONTRACT"
  | "SMART_FILE_VIEWED"
  | "SMART_FILE_ACCEPTED"
  | "BOOKING"
  | "GALLERY"
  | "AUTOMATION"
  | "REMINDER"
  | "SYSTEM";

export type NotificationPriority = "HIGH" | "MEDIUM" | "LOW";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  description: string | null;
  projectId: string | null;
  contactId: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

// Reports/Summary types
export interface ReportsSummary {
  totalRevenue: number;
  pendingPayments: number;
  activeProjects: number;
  upcomingEvents: number;
  recentBookings: number;
}

export const reportsApi = {
  // GET /api/reports/summary - Get dashboard summary stats
  getSummary: (token: string, tenant?: TenantContext) =>
    api.get<ReportsSummary>("/api/reports/summary", token, tenant),
};

export const notificationsApi = {
  // GET /api/notifications?limit=50 - Fetch list of notifications
  getAll: (token: string, tenant?: TenantContext, limit: number = 50) =>
    api.get<Notification[]>(`/api/notifications?limit=${limit}`, token, tenant),

  // GET /api/notifications/unread-count - Get unread count
  getUnreadCount: (token: string, tenant?: TenantContext) =>
    api.get<UnreadCountResponse>(
      "/api/notifications/unread-count",
      token,
      tenant,
    ),

  // POST /api/notifications/{id}/read - Mark single notification as read
  markAsRead: (token: string, id: string, tenant?: TenantContext) =>
    api.post<void>(`/api/notifications/${id}/read`, {}, token, tenant),

  // POST /api/notifications/mark-all-read - Mark all notifications as read
  markAllAsRead: (token: string, tenant?: TenantContext) =>
    api.post<void>("/api/notifications/mark-all-read", {}, token, tenant),
};

// Client Portal types
export interface PaymentMethod {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  payments: {
    id: string;
    amount: number;
    status: string;
    paidAt?: string;
  }[];
}

// Automation types
export type AutomationType = "COMMUNICATION" | "STAGE_CHANGE" | "COUNTDOWN";
export type AutomationChannel = "EMAIL" | "SMS" | "SMART_FILE";

export interface AutomationStep {
  id: string;
  automationId: string;
  stepIndex: number;
  delayMinutes: number;
  delayDays?: number;
  actionType: AutomationChannel;
  customSmsContent?: string;
  enabled: boolean;
  anchorType?: "STAGE_ENTRY" | "BOOKING_START" | "BOOKING_END";
}

export interface AutomationBusinessTrigger {
  id: string;
  automationId: string;
  triggerType: string;
  enabled: boolean;
}

export interface Automation {
  id: string;
  photographerId: string;
  projectType: string;
  name: string;
  description?: string;
  automationType: AutomationType;
  stageId?: string;
  channel?: AutomationChannel;
  triggerType?: string;
  targetStageId?: string;
  daysBefore?: number;
  useEmailBuilder?: boolean;
  emailSubject?: string;
  templateBody?: string;
  enabled: boolean;
  lastRunAt?: string;
  runCount?: number;
  createdAt: string;
  steps?: AutomationStep[];
  businessTriggers?: AutomationBusinessTrigger[];
}

export const automationsApi = {
  getAll: (token: string, tenant?: TenantContext, projectType?: string) => {
    const endpoint = projectType
      ? `/api/automations?projectType=${projectType}`
      : "/api/automations";
    return api.get<Automation[]>(endpoint, token, tenant);
  },

  toggle: (token: string, id: string, enabled: boolean, tenant?: TenantContext) =>
    api.patch<Automation>(`/api/automations/${id}`, { enabled }, token, tenant),
};

// Client Portal API (for client-facing features)
// Availability types
export interface DailyAvailabilityTemplate {
  id: string;
  photographerId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string; // "08:00"
  endTime: string; // "18:00"
  isEnabled: boolean;
  createdAt: string;
}

export interface AvailabilityBreak {
  startTime: string;
  endTime: string;
  label?: string;
}

export interface DailyAvailabilityOverride {
  id: string;
  photographerId: string;
  date: string; // "2024-01-15" format
  startTime?: string | null; // null = fully blocked
  endTime?: string | null;
  breaks?: AvailabilityBreak[];
  reason?: string; // "Holiday", "Vacation", etc.
  createdAt: string;
}

// Availability status for calendar display
export type AvailabilityStatus = "available" | "blocked" | "partial";

export interface CalendarDayInfo {
  date: string;
  status: AvailabilityStatus;
  eventCount: number;
  override?: DailyAvailabilityOverride;
}

export const availabilityApi = {
  // GET /api/availability/templates - Get weekly templates
  getTemplates: (token: string, tenant?: TenantContext) =>
    api.get<DailyAvailabilityTemplate[]>(
      "/api/availability/templates",
      token,
      tenant,
    ),

  // GET /api/availability/overrides - Get date-specific overrides
  getOverrides: (token: string, tenant?: TenantContext) =>
    api.get<DailyAvailabilityOverride[]>(
      "/api/availability/overrides",
      token,
      tenant,
    ),

  // POST /api/availability/overrides - Create override (block time or custom hours)
  createOverride: (
    token: string,
    data: Omit<DailyAvailabilityOverride, "id" | "photographerId" | "createdAt">,
    tenant?: TenantContext,
  ) =>
    api.post<DailyAvailabilityOverride>(
      "/api/availability/overrides",
      data,
      token,
      tenant,
    ),

  // DELETE /api/availability/overrides/:id - Remove override
  deleteOverride: (token: string, id: string, tenant?: TenantContext) =>
    api.delete<void>(`/api/availability/overrides/${id}`, token, tenant),
};

// Push Token Registration API
export const pushTokensApi = {
  // POST /api/push-tokens - Register a push notification token
  register: (
    authToken: string,
    pushToken: string,
    platform: "ios" | "android",
    deviceId?: string,
    tenant?: TenantContext,
  ) =>
    api.post<{ success: boolean }>(
      "/api/push-tokens",
      { token: pushToken, platform, deviceId },
      authToken,
      tenant,
    ),

  // DELETE /api/push-tokens/:token - Unregister a push notification token
  unregister: (
    authToken: string,
    pushToken: string,
    tenant?: TenantContext,
  ) =>
    api.delete<{ success: boolean }>(
      `/api/push-tokens/${encodeURIComponent(pushToken)}`,
      authToken,
      tenant,
    ),
};

export const clientPortalApi = {
  // POST /api/client-portal/projects/:id/send-message - Client sends message to photographer
  sendMessage: (
    token: string,
    projectId: string,
    message: string,
    tenant?: TenantContext,
  ) =>
    api.post<{ success: boolean }>(
      `/api/client-portal/projects/${projectId}/send-message`,
      { message },
      token,
      tenant,
    ),

  // GET /api/client-portal/payment-methods - Get saved payment methods
  getPaymentMethods: (token: string, tenant?: TenantContext) =>
    api.get<PaymentMethod[]>(
      "/api/client-portal/payment-methods",
      token,
      tenant,
    ),

  // DELETE /api/client-portal/payment-methods/:methodId - Remove payment method
  deletePaymentMethod: (
    token: string,
    methodId: string,
    tenant?: TenantContext,
  ) =>
    api.delete<{ success: boolean }>(
      `/api/client-portal/payment-methods/${methodId}`,
      token,
      tenant,
    ),

  // POST /api/client-portal/set-default-payment-method - Set default payment method
  setDefaultPaymentMethod: (
    token: string,
    methodId: string,
    tenant?: TenantContext,
  ) =>
    api.post<{ success: boolean }>(
      "/api/client-portal/set-default-payment-method",
      { methodId },
      token,
      tenant,
    ),

  // GET /api/client-portal/projects/:id/payment-summary - Get payment summary
  getPaymentSummary: (
    token: string,
    projectId: string,
    tenant?: TenantContext,
  ) =>
    api.get<PaymentSummary>(
      `/api/client-portal/projects/${projectId}/payment-summary`,
      token,
      tenant,
    ),
};
