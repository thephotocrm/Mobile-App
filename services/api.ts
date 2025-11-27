import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || "https://app.thephotocrm.com";

interface RequestOptions extends RequestInit {
  token?: string | null;
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
    const { token, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : "Network error",
        0,
        {}
      );
    }
  }

  async get<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", token });
  }

  async post<T>(endpoint: string, data?: unknown, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      token,
    });
  }

  async put<T>(endpoint: string, data?: unknown, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      token,
    });
  }

  async delete<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", token });
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

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),
  
  register: (email: string, password: string, businessName: string) =>
    api.post<LoginResponse>("/api/auth/register", { email, password, businessName }),
  
  me: (token: string) =>
    api.get<User>("/api/auth/me", token),
  
  logout: (token: string) =>
    api.post<{ message: string }>("/api/auth/logout", undefined, token),
};

export const projectsApi = {
  getAll: (token: string, status?: string, stageId?: string) => {
    let endpoint = "/api/projects";
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (stageId) params.append("stageId", stageId);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return api.get<Project[]>(endpoint, token);
  },
  
  getById: (token: string, id: string) =>
    api.get<Project>(`/api/projects/${id}`, token),
  
  create: (token: string, data: Partial<Project>) =>
    api.post<Project>("/api/projects", data, token),
  
  update: (token: string, id: string, data: Partial<Project>) =>
    api.put<Project>(`/api/projects/${id}`, data, token),
  
  updateStage: (token: string, id: string, stageId: string) =>
    api.put<Project>(`/api/projects/${id}/stage`, { stageId }, token),
};

export const contactsApi = {
  getAll: (token: string, stageId?: string, status?: string) => {
    let endpoint = "/api/contacts";
    const params = new URLSearchParams();
    if (stageId) params.append("stageId", stageId);
    if (status) params.append("status", status);
    if (params.toString()) endpoint += `?${params.toString()}`;
    return api.get<Contact[]>(endpoint, token);
  },
  
  getById: (token: string, id: string) =>
    api.get<Contact>(`/api/contacts/${id}`, token),
  
  create: (token: string, data: Partial<Contact>) =>
    api.post<Contact>("/api/contacts", data, token),
  
  update: (token: string, id: string, data: Partial<Contact>) =>
    api.put<Contact>(`/api/contacts/${id}`, data, token),
};

export const conversationsApi = {
  getAll: (token: string) =>
    api.get<Conversation[]>("/api/conversations", token),
  
  getById: (token: string, id: string) =>
    api.get<Conversation>(`/api/conversations/${id}`, token),
  
  getMessages: (token: string, conversationId: string) =>
    api.get<Message[]>(`/api/conversations/${conversationId}/messages`, token),
  
  sendMessage: (token: string, conversationId: string, content: string, messageType: string = "SMS") =>
    api.post<Message>(`/api/conversations/${conversationId}/messages`, { content, messageType }, token),
};

export const bookingsApi = {
  getAll: (token: string) =>
    api.get<Booking[]>("/api/bookings", token),
  
  getById: (token: string, id: string) =>
    api.get<Booking>(`/api/bookings/${id}`, token),
  
  create: (token: string, data: Partial<Booking>) =>
    api.post<Booking>("/api/bookings", data, token),
  
  update: (token: string, id: string, data: Partial<Booking>) =>
    api.put<Booking>(`/api/bookings/${id}`, data, token),
};

export const stagesApi = {
  getAll: (token: string) =>
    api.get<Stage[]>("/api/stages", token),
};
