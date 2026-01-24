import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { authApi, User, ApiError } from "@/services/api";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

interface AppleLoginPayload {
  identityToken: string;
  firstName?: string;
  lastName?: string;
}

interface GoogleLoginPayload {
  idToken: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithApple: (payload: AppleLoginPayload) => Promise<void>;
  loginWithGoogle: (payload: GoogleLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      // Defensive SecureStore reads - catch any keychain errors (e.g., bundle ID changes)
      let storedToken: string | null = null;
      let storedUser: string | null = null;

      try {
        storedToken = await getSecureItem(TOKEN_KEY);
      } catch (storageError) {
        console.warn("SecureStore token read failed, clearing auth:", storageError);
        storedToken = null;
      }

      try {
        storedUser = await getSecureItem(USER_KEY);
      } catch (storageError) {
        console.warn("SecureStore user read failed, clearing auth:", storageError);
        storedUser = null;
      }

      if (!storedToken || !storedUser) {
        // No stored auth or storage error - user will need to log in
        setIsLoading(false);
        return;
      }

      let parsedUser: User;
      try {
        parsedUser = JSON.parse(storedUser) as User;
      } catch (parseError) {
        console.warn("Failed to parse stored user:", parseError);
        setIsLoading(false);
        return;
      }

      try {
        const freshUser = await authApi.me(storedToken);
        setToken(storedToken);
        setUser(freshUser);
        await setSecureItem(USER_KEY, JSON.stringify(freshUser));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearAuth();
        } else {
          // Network error or other issue - use cached data
          setToken(storedToken);
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      // Always fall back to logged-out state
      try {
        await clearAuth();
      } catch {
        // Ignore secondary errors during cleanup
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuth = async () => {
    await deleteSecureItem(TOKEN_KEY);
    await deleteSecureItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const login = useCallback(async (email: string, password: string) => {
    if (__DEV__) {
      console.log("[AuthContext] Login attempt for:", email);
      console.log("[AuthContext] Calling authApi.login...");
    }

    try {
      const response = await authApi.login(email, password);

      if (__DEV__) {
        console.log("[AuthContext] Login response received");
        console.log(
          "[AuthContext] User:",
          response.user ? JSON.stringify(response.user) : "null",
        );
        console.log(
          "[AuthContext] Token received:",
          response.token ? "YES" : "NO",
        );
      }

      if (!response.token) {
        if (__DEV__) {
          console.log("[AuthContext] ERROR: No token in response");
        }
        throw new Error(
          "Server did not return authentication token. Please contact support.",
        );
      }

      if (__DEV__) {
        console.log(
          "[AuthContext] Storing token and user in secure storage...",
        );
      }
      await setSecureItem(TOKEN_KEY, response.token);
      await setSecureItem(USER_KEY, JSON.stringify(response.user));

      if (__DEV__) {
        console.log("[AuthContext] Setting auth state...");
      }
      setToken(response.token);
      setUser(response.user);
      if (__DEV__) {
        console.log("[AuthContext] Login successful!");
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          "[AuthContext] Login error:",
          error instanceof Error ? error.message : String(error),
        );
      }
      if (error instanceof ApiError) {
        if (__DEV__) {
          console.log("[AuthContext] ApiError status:", error.status);
          console.log(
            "[AuthContext] ApiError data:",
            JSON.stringify(error.data),
          );
        }
        if (error.status === 401) {
          throw new Error("Invalid email or password");
        }
        throw new Error(error.message || "Login failed");
      }
      throw error;
    }
  }, []);

  const loginWithApple = useCallback(async (payload: AppleLoginPayload) => {
    if (__DEV__) {
      console.log("[AuthContext] Apple login attempt");
      console.log("[AuthContext] Calling authApi.appleLogin...");
    }

    try {
      const response = await authApi.appleLogin(payload);

      if (__DEV__) {
        console.log("[AuthContext] Apple login response received");
        console.log(
          "[AuthContext] User:",
          response.user ? JSON.stringify(response.user) : "null",
        );
        console.log(
          "[AuthContext] Token received:",
          response.token ? "YES" : "NO",
        );
      }

      if (!response.token) {
        if (__DEV__) {
          console.log("[AuthContext] ERROR: No token in Apple login response");
        }
        throw new Error(
          "Server did not return authentication token. Please contact support.",
        );
      }

      if (__DEV__) {
        console.log(
          "[AuthContext] Storing token and user in secure storage...",
        );
      }
      await setSecureItem(TOKEN_KEY, response.token);
      await setSecureItem(USER_KEY, JSON.stringify(response.user));

      if (__DEV__) {
        console.log("[AuthContext] Setting auth state...");
      }
      setToken(response.token);
      setUser(response.user);
      if (__DEV__) {
        console.log("[AuthContext] Apple login successful!");
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          "[AuthContext] Apple login error:",
          error instanceof Error ? error.message : String(error),
        );
      }
      if (error instanceof ApiError) {
        if (__DEV__) {
          console.log("[AuthContext] ApiError status:", error.status);
          console.log(
            "[AuthContext] ApiError data:",
            JSON.stringify(error.data),
          );
        }
        if (error.status === 401) {
          throw new Error("Apple authentication failed");
        }
        throw new Error(error.message || "Apple login failed");
      }
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async (payload: GoogleLoginPayload) => {
    if (__DEV__) {
      console.log("[AuthContext] Google login attempt");
      console.log("[AuthContext] Calling authApi.googleLogin...");
    }

    try {
      const response = await authApi.googleLogin(payload);

      if (__DEV__) {
        console.log("[AuthContext] Google login response received");
        console.log(
          "[AuthContext] User:",
          response.user ? JSON.stringify(response.user) : "null",
        );
        console.log(
          "[AuthContext] Token received:",
          response.token ? "YES" : "NO",
        );
      }

      if (!response.token) {
        if (__DEV__) {
          console.log("[AuthContext] ERROR: No token in Google login response");
        }
        throw new Error(
          "Server did not return authentication token. Please contact support.",
        );
      }

      if (__DEV__) {
        console.log(
          "[AuthContext] Storing token and user in secure storage...",
        );
      }
      await setSecureItem(TOKEN_KEY, response.token);
      await setSecureItem(USER_KEY, JSON.stringify(response.user));

      if (__DEV__) {
        console.log("[AuthContext] Setting auth state...");
      }
      setToken(response.token);
      setUser(response.user);
      if (__DEV__) {
        console.log("[AuthContext] Google login successful!");
      }
    } catch (error) {
      if (__DEV__) {
        console.log(
          "[AuthContext] Google login error:",
          error instanceof Error ? error.message : String(error),
        );
      }
      if (error instanceof ApiError) {
        if (__DEV__) {
          console.log("[AuthContext] ApiError status:", error.status);
          console.log(
            "[AuthContext] ApiError data:",
            JSON.stringify(error.data),
          );
        }
        if (error.status === 401) {
          throw new Error("Google authentication failed");
        }
        throw new Error(error.message || "Google login failed");
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      if (__DEV__) {
        console.error("Logout API error:", error);
      }
    } finally {
      await clearAuth();
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    try {
      const freshUser = await authApi.me(token);
      setUser(freshUser);
      await setSecureItem(USER_KEY, JSON.stringify(freshUser));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearAuth();
      }
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    loginWithApple,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
