import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || "https://app.thephotocrm.com";

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
    options: RequestOptions = {}
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
      (headers as Record<string, string>)["x-photographer-id"] = tenant.photographerId;
    }
    if (tenant?.userRole) {
      (headers as Record<string, string>)["x-user-role"] = tenant.userRole;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    if (fetchOptions.body) {
      const bodyForLog = JSON.parse(fetchOptions.body as string);
      if (bodyForLog.password) {
        bodyForLog.password = '***HIDDEN***';
      }
      console.log('[API] Request body:', JSON.stringify(bodyForLog));
    }
    if (tenant?.photographerId) {
      console.log('[API] Tenant headers:', { photographerId: tenant.photographerId, userRole: tenant.userRole });
    }
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      console.log(`[API] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[API] Error response body:', errorText);
        
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { rawError: errorText };
        }
        
        throw new ApiError(
          (errorData as { message?: string }).message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      if (response.status === 204) {
        console.log('[API] Empty response (204)');
        return {} as T;
      }

      const data = await response.json();
      console.log('[API] Success response:', JSON.stringify(data, (key, value) => 
        key === 'token' ? '***TOKEN_RECEIVED***' : value
      ));
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        console.log(`[API] ApiError: ${error.message} (status: ${error.status})`);
        throw error;
      }
      console.log('[API] Network/Fetch error:', error instanceof Error ? error.message : String(error));
      throw new ApiError(
        error instanceof Error ? error.message : "Network error",
        0,
        {}
      );
    }
  }

  async get<T>(endpoint: string, token?: string | null, tenant?: TenantContext): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", token, tenant });
  }

  async post<T>(endpoint: string, data?: unknown, token?: string | null, tenant?: TenantContext): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      token,
      tenant,
    });
  }

  async put<T>(endpoint: string, data?: unknown, token?: string | null, tenant?: TenantContext): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      token,
      tenant,
    });
  }

  async delete<T>(endpoint: string, token?: string | null, tenant?: TenantContext): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", token, tenant });
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
  | "PORTRAIT"
  | "CORPORATE"
  | "EVENT"
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
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes?: string;
  client?: Contact;
  createdAt: string;
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
  contact: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  messages: InboxMessage[];
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
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
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
    api.post<LoginResponse>("/api/auth/register", { email, password, businessName }),
  
  me: (token: string, tenant?: TenantContext) =>
    api.get<User>("/api/auth/me", token, tenant),
  
  logout: (token: string, tenant?: TenantContext) =>
    api.post<{ message: string }>("/api/auth/logout", undefined, token, tenant),
};

export const projectsApi = {
  getAll: (token: string, tenant?: TenantContext, status?: string, stageId?: string) => {
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
  
  update: (token: string, id: string, data: Partial<Project>, tenant?: TenantContext) =>
    api.put<Project>(`/api/projects/${id}`, data, token, tenant),
  
  updateStage: (token: string, id: string, stageId: string, tenant?: TenantContext) =>
    api.put<Project>(`/api/projects/${id}/stage`, { stageId }, token, tenant),
};

export const contactsApi = {
  getAll: (token: string, tenant?: TenantContext, stageId?: string, status?: string) => {
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
  
  update: (token: string, id: string, data: Partial<Contact>, tenant?: TenantContext) =>
    api.put<Contact>(`/api/contacts/${id}`, data, token, tenant),
};

// NEW: Inbox API using correct endpoints from documentation
export const inboxApi = {
  // GET /api/inbox/conversations - Get all conversations for photographer
  // Returns raw API format with nested contact object
  getConversations: (token: string, tenant?: TenantContext) =>
    api.get<InboxConversationApiResponse[]>("/api/inbox/conversations", token, tenant),
  
  // GET /api/inbox/thread/:contactId - Get message thread with a specific contact
  getThread: (token: string, contactId: string, tenant?: TenantContext) =>
    api.get<InboxThread>(`/api/inbox/thread/${contactId}`, token, tenant),
  
  // POST /api/inbox/send-sms - Send SMS to a contact
  sendSms: (token: string, contactId: string, message: string, includePortalLink: boolean = false, tenant?: TenantContext) =>
    api.post<{ success: boolean }>("/api/inbox/send-sms", { contactId, message, includePortalLink }, token, tenant),
};

// Legacy conversations API (kept for backwards compatibility)
export const conversationsApi = {
  getAll: (token: string, tenant?: TenantContext) =>
    api.get<Conversation[]>("/api/conversations", token, tenant),
  
  getById: (token: string, id: string, tenant?: TenantContext) =>
    api.get<Conversation>(`/api/conversations/${id}`, token, tenant),
  
  getMessages: (token: string, conversationId: string, tenant?: TenantContext) =>
    api.get<Message[]>(`/api/conversations/${conversationId}/messages`, token, tenant),
  
  sendMessage: (token: string, conversationId: string, content: string, messageType: string = "SMS", tenant?: TenantContext) =>
    api.post<Message>(`/api/conversations/${conversationId}/messages`, { content, messageType }, token, tenant),
};

export const bookingsApi = {
  getAll: (token: string, tenant?: TenantContext) =>
    api.get<Booking[]>("/api/bookings", token, tenant),
  
  getById: (token: string, id: string, tenant?: TenantContext) =>
    api.get<Booking>(`/api/bookings/${id}`, token, tenant),
  
  create: (token: string, data: Partial<Booking>, tenant?: TenantContext) =>
    api.post<Booking>("/api/bookings", data, token, tenant),
  
  update: (token: string, id: string, data: Partial<Booking>, tenant?: TenantContext) =>
    api.put<Booking>(`/api/bookings/${id}`, data, token, tenant),
};

export const stagesApi = {
  getAll: (token: string, tenant?: TenantContext) =>
    api.get<Stage[]>("/api/stages", token, tenant),
};
