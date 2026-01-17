import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Custom error class that preserves API response data
class ApiError extends Error {
  status: number;
  isPrivate?: boolean;
  photographerSlug?: string | null;
  galleryName?: string;
  
  constructor(status: number, message: string, data?: Record<string, any>) {
    super(message);
    this.status = status;
    if (data) {
      this.isPrivate = data.isPrivate;
      this.photographerSlug = data.photographerSlug;
      this.galleryName = data.galleryName;
    }
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let data: Record<string, any> | undefined;
    try {
      data = JSON.parse(text);
    } catch {
      // Not JSON, use text as-is
    }
    const message = data?.message || text || res.statusText;
    throw new ApiError(res.status, `${res.status}: ${message}`, data);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Filter out undefined/null values from queryKey to prevent "/api/resource/undefined" URLs
    const filteredKey = queryKey.filter((segment): segment is string => 
      segment !== undefined && segment !== null && segment !== 'undefined'
    );
    const res = await fetch(filteredKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
