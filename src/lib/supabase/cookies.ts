import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const ACCESS_TOKEN_COOKIE = "sb_access_token";
export const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

// Standard session expiration fallback of seven days in seconds.
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

// ==========================================
// Session Cookie Attachment
// ==========================================

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
  };

  const accessMaxAge = typeof maxAge === "number" ? maxAge : DEFAULT_MAX_AGE;
  // Refresh token retains long session capability for silent token renewal.
  const refreshMaxAge = Math.max(accessMaxAge, 60 * 60 * 24 * 30);

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: accessMaxAge,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: refreshMaxAge,
  });

  return response;
}

// ==========================================
// Session Cookie Invalidation
// ==========================================

// Remove authentication session cookies upon logout or token invalidation.
export function clearAuthCookies(response: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";
  const expireOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", expireOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", expireOptions);

  return response;
}

// ==========================================
// Token Ingestion from Request Headers
// ==========================================

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
  metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface AuthenticatedUserResult {
  user: AuthenticatedUser | null;
  newTokens: AuthenticatedUserTokens | null;
}

// ==========================================
// Authenticated User Resolution
// ==========================================

// Verifies access token first and seamlessly refreshes credentials via refresh token if expired.
export async function getAuthenticatedUser(): Promise<AuthenticatedUserResult> {
  const { accessToken, refreshToken } = await getAuthTokensFromCookies();

  // Fast path: verify current access token directly against the Supabase authentication server.
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
    } catch {
      // Proceed to silent token renewal when access token verification fails.
    }
  }

  // Silent refresh path: renew session when access token has expired and refresh token is present.
  if (refreshToken) {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      const refreshedUser = refreshData?.user || refreshData?.session?.user;

      if (!refreshError && refreshData?.session && refreshedUser) {
        const name = (refreshedUser.user_metadata?.name ||
          refreshedUser.user_metadata?.full_name ||
          null) as string | null;

        return {
          user: {
            id: refreshedUser.id,
            email: refreshedUser.email,
            name,
            metadata: refreshedUser.user_metadata,
            user_metadata: refreshedUser.user_metadata,
          },
          newTokens: {
            accessToken: refreshData.session.access_token,
            refreshToken: refreshData.session.refresh_token,
            expiresIn: refreshData.session.expires_in,
          },
        };
      }
    } catch {
      // Return unauthenticated result when token renewal fails.
    }
  }

  return { user: null, newTokens: null };
}

// ==========================================
// Refreshed Credentials Application
// ==========================================

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

// ==========================================
// Standardized Unauthorized Response Dispatch
// ==========================================

// Clears stale cookies and returns an HTTP 401 unauthorized response with expiration metadata.
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
