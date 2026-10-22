// --- Authentication Cookie Manager ---
// Manage secure HTTP-only session cookies for Supabase authentication tokens.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "sb_access_token";
export const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

// Standard session expiration fallback: 7 days in seconds.
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

// Step 1: Attach Session Cookies
// Attach authentication access and refresh tokens to server response cookies.
export function attachAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  maxAge?: number
) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

  return response;
}

// Step 2: Clear Session Cookies
// Remove authentication session cookies upon logout or token invalidation.
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

// Step 3: Retrieve Session Tokens
// Read authentication tokens from current incoming request cookies.
export async function getAuthTokensFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
  return { accessToken, refreshToken };
}

export interface AuthenticatedUserTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string | null;
  metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

export interface AuthenticatedUserResult {
  user: AuthenticatedUser | null;
  newTokens: AuthenticatedUserTokens | null;
}

// Step 4: Resolve Authenticated User with Transparent Silent Refresh
// Verifies accessToken first; if expired, seamlessly refreshes credentials via refreshToken.
export async function getAuthenticatedUser(): Promise<AuthenticatedUserResult> {
  const { accessToken, refreshToken } = await getAuthTokensFromCookies();
  const { supabase } = await import("@/lib/supabase/client");

  // 1. Fast Path: verify current accessToken against Supabase
  if (accessToken) {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
      if (!userError && userData?.user) {
        const name = (userData.user.user_metadata?.name ||
          userData.user.user_metadata?.full_name ||
          null) as string | null;

        return {
          user: {
            id: userData.user.id,
            email: userData.user.email,
            name,
            metadata: userData.user.user_metadata,
            user_metadata: userData.user.user_metadata,
          },
          newTokens: null,
        };
      }
    } catch {}
  }

  // 2. Silent Refresh Path: if accessToken expired but refreshToken is valid, refresh session
  if (refreshToken) {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (!refreshError && refreshData.session && refreshData.user) {
        const name = (refreshData.user.user_metadata?.name ||
          refreshData.user.user_metadata?.full_name ||
          null) as string | null;

        return {
          user: {
            id: refreshData.user.id,
            email: refreshData.user.email,
            name,
            metadata: refreshData.user.user_metadata,
            user_metadata: refreshData.user.user_metadata,
          },
          newTokens: {
            accessToken: refreshData.session.access_token,
            refreshToken: refreshData.session.refresh_token,
            expiresIn: refreshData.session.expires_in,
          },
        };
      }
    } catch {}
  }

  return { user: null, newTokens: null };
}

// Step 5: Attach Refreshed Credentials
// Automatically attaches new auth cookies to server responses if a silent refresh occurred.
export function applyAuthCookies(
  response: NextResponse,
  newTokens: AuthenticatedUserTokens | null
): NextResponse {
  if (newTokens) {
    return attachAuthCookies(
      response,
      newTokens.accessToken,
      newTokens.refreshToken,
      newTokens.expiresIn
    );
  }
  return response;
}

// Step 6: Create Standardized Unauthorized Response
// Clears stale cookies and returns a 401 response with sessionExpired flag.
export function createUnauthorizedResponse(message: string = "Unauthorized"): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      authenticated: false,
      error: message,
      sessionExpired: true,
    },
    { status: 401 }
  );
  return clearAuthCookies(response);
}

