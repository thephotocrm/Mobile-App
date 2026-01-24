import { Request, Response } from "express";
import jwt from "jsonwebtoken";

// Cookie configuration
export const COOKIE_NAMES = {
  PHOTOGRAPHER: "photographer_token",
  CLIENT: "client_token",
  ADMIN: "admin_token",
  LEGACY: "token", // For backward compatibility
} as const;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: "PHOTOGRAPHER" | "CLIENT" | "ADMIN";
  photographerId?: string;
}

// Set auth cookie based on role with optional domain for client portal subdomains
export function setAuthCookie(
  res: Response,
  token: string,
  role: string,
  req?: Request,
) {
  let cookieName: string;

  switch (role) {
    case "PHOTOGRAPHER":
      cookieName = COOKIE_NAMES.PHOTOGRAPHER;
      break;
    case "CLIENT":
      cookieName = COOKIE_NAMES.CLIENT;
      break;
    case "ADMIN":
      cookieName = COOKIE_NAMES.ADMIN;
      break;
    default:
      cookieName = COOKIE_NAMES.LEGACY;
  }

  // Prepare cookie options for role-specific cookie
  let roleSpecificOptions = { ...COOKIE_OPTIONS };

  // Set domain for cross-subdomain cookie support
  if (req) {
    const hostname = req.hostname || req.get("host")?.split(":")[0] || "";

    // For CLIENT cookies on portal subdomains, set domain to .tpcportal.co
    if (role === "CLIENT" && hostname.endsWith(".tpcportal.co")) {
      roleSpecificOptions = {
        ...roleSpecificOptions,
        domain: ".tpcportal.co", // Leading dot allows cookie to work across all subdomains
      };
      console.log(
        `🍪 Setting CLIENT cookie with domain: .tpcportal.co for ${hostname}`,
      );
    }
    // For PHOTOGRAPHER/ADMIN cookies on photographer domain, set domain to .thephotocrm.com
    // This allows cookies to work across thephotocrm.com and app.thephotocrm.com
    else if (
      (role === "PHOTOGRAPHER" || role === "ADMIN") &&
      hostname.endsWith("thephotocrm.com")
    ) {
      roleSpecificOptions = {
        ...roleSpecificOptions,
        domain: ".thephotocrm.com", // Leading dot allows cookie to work across all subdomains
      };
      console.log(
        `🍪 Setting ${role} cookie with domain: .thephotocrm.com for ${hostname}`,
      );
    } else {
      console.log(
        `🍪 Setting ${role} cookie without domain (host-only) for ${hostname}`,
      );
    }
  }

  // Set the role-specific cookie
  res.cookie(cookieName, token, roleSpecificOptions);

  // Also set legacy token for backward compatibility (except for clients)
  // Use fresh copy of COOKIE_OPTIONS to prevent domain bleed from CLIENT cookies
  if (role !== "CLIENT") {
    res.cookie(COOKIE_NAMES.LEGACY, token, { ...COOKIE_OPTIONS });
  }
}

// Get the highest precedence valid token from cookies
// Priority: IMPERSONATION (photographer with isImpersonating) > ADMIN > PHOTOGRAPHER > CLIENT > LEGACY
export function getAuthToken(
  req: Request,
): { token: string; source: string } | null {
  const cookies = req.cookies || {};

  // First, check if there's an impersonation token (photographer token with isImpersonating flag)
  // Impersonation tokens should take priority over admin tokens
  const photographerToken = cookies[COOKIE_NAMES.PHOTOGRAPHER];
  if (photographerToken) {
    try {
      const payload = jwt.verify(
        photographerToken,
        process.env.JWT_SECRET!,
      ) as any;
      if (payload.isImpersonating) {
        // This is an impersonation token - use it regardless of admin token presence
        return { token: photographerToken, source: "photographer" };
      }
    } catch (err) {
      // Invalid token, continue to normal flow
    }
  }

  // Check cookies in priority order
  const checks = [
    { name: COOKIE_NAMES.ADMIN, source: "admin" },
    { name: COOKIE_NAMES.PHOTOGRAPHER, source: "photographer" },
    { name: COOKIE_NAMES.CLIENT, source: "client" },
    { name: COOKIE_NAMES.LEGACY, source: "legacy" },
  ];

  for (const { name, source } of checks) {
    const token = cookies[name];
    if (token) {
      try {
        // Verify the token is valid JWT
        jwt.verify(token, process.env.JWT_SECRET!);
        return { token, source };
      } catch (err) {
        // Invalid token, continue to next
        continue;
      }
    }
  }

  return null;
}

// Clear all auth cookies
export function clearAuthCookies(res: Response, req?: Request) {
  // Always clear BOTH host-only and domain variants for photographer/admin cookies
  // This handles legacy cookies from before domain cookie implementation
  // and works even when req context is missing
  // Include path: '/' to match how cookies were set
  res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER, { path: "/" }); // Host-only version
  res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER, {
    path: "/",
    domain: ".thephotocrm.com",
  }); // Domain version
  res.clearCookie(COOKIE_NAMES.ADMIN, { path: "/" }); // Host-only version
  res.clearCookie(COOKIE_NAMES.ADMIN, {
    path: "/",
    domain: ".thephotocrm.com",
  }); // Domain version
  res.clearCookie(COOKIE_NAMES.LEGACY, { path: "/" }); // Host-only version
  res.clearCookie(COOKIE_NAMES.LEGACY, {
    path: "/",
    domain: ".thephotocrm.com",
  }); // Domain version

  // Always clear BOTH host-only and domain variants for CLIENT cookies
  // Clearing extra cookies is harmless even if they don't exist
  res.clearCookie(COOKIE_NAMES.CLIENT, { path: "/" }); // Host-only version
  res.clearCookie(COOKIE_NAMES.CLIENT, { path: "/", domain: ".tpcportal.co" }); // Domain version
}

// Clear specific auth cookie
export function clearAuthCookie(res: Response, role: string, req?: Request) {
  // Always clear both host-only and domain variants with path: '/' to match how cookies were set
  // Clearing extra cookies is harmless even if they don't exist
  switch (role) {
    case "PHOTOGRAPHER":
      res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER, { path: "/" }); // Host-only version
      res.clearCookie(COOKIE_NAMES.PHOTOGRAPHER, {
        path: "/",
        domain: ".thephotocrm.com",
      }); // Domain version
      break;
    case "CLIENT":
      res.clearCookie(COOKIE_NAMES.CLIENT, { path: "/" }); // Host-only version
      res.clearCookie(COOKIE_NAMES.CLIENT, {
        path: "/",
        domain: ".tpcportal.co",
      }); // Domain version
      break;
    case "ADMIN":
      res.clearCookie(COOKIE_NAMES.ADMIN, { path: "/" }); // Host-only version
      res.clearCookie(COOKIE_NAMES.ADMIN, {
        path: "/",
        domain: ".thephotocrm.com",
      }); // Domain version
      break;
  }
  // Always clear legacy token (both variants)
  res.clearCookie(COOKIE_NAMES.LEGACY, { path: "/" }); // Host-only version
  res.clearCookie(COOKIE_NAMES.LEGACY, {
    path: "/",
    domain: ".thephotocrm.com",
  }); // Domain version
}
