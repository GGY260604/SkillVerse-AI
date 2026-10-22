import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import {
  getAuthTokensFromCookies,
  attachAuthCookies,
  clearAuthCookies,
} from "@/lib/supabase/cookies";

// --- Route Handler ---
// Endpoint: GET /api/auth/session
// Purpose: Validate session cookies, refresh credentials if needed, and return user profile.
// Target Service: Supabase Auth
export async function GET() {
  try {
    // 1. Cookie Token Extraction
    // Read access and refresh credentials from HTTP request cookies.
    const { accessToken, refreshToken } = await getAuthTokensFromCookies();

    if (!accessToken) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // 2. Token Validation with Upstream Service
    // Verify the access token against Supabase authentication service.
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (!userError && userData?.user) {
      const name =
        (userData.user.user_metadata?.name ||
          userData.user.user_metadata?.full_name ||
          null) as string | null;

      return NextResponse.json({
        authenticated: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          name,
          metadata: userData.user.user_metadata,
        },
      });
    }

    // 3. Silent Token Refresh
    // Refresh session transparently when access token expires and refresh token exists.
    if (refreshToken) {
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (!refreshError && refreshData.session && refreshData.user) {
        const name =
          (refreshData.user.user_metadata?.name ||
            refreshData.user.user_metadata?.full_name ||
            null) as string | null;

        const response = NextResponse.json({
          authenticated: true,
          user: {
            id: refreshData.user.id,
            email: refreshData.user.email,
            name,
            metadata: refreshData.user.user_metadata,
          },
        });

        return attachAuthCookies(
          response,
          refreshData.session.access_token,
          refreshData.session.refresh_token,
          refreshData.session.expires_in
        );
      }
    }

    // 4. Stale Session Invalidation
    // Invalidate stale authentication cookies when both check and refresh fail.
    const response = NextResponse.json({ authenticated: false, user: null });
    return clearAuthCookies(response);
  } catch (err: unknown) {
    // 5. Internal Error Handling
    // Clear cookies and return unauthenticated status on unexpected server error.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const response = NextResponse.json({ authenticated: false, user: null, error: message });
    return clearAuthCookies(response);
  }
}
