import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import {
  getAuthTokensFromCookies,
  attachAuthCookies,
  clearAuthCookies,
} from "@/lib/supabase/cookies";

// User Session Verification and Refresh
// Validate cookie tokens and return current user authentication status.
export async function GET() {
  try {
    const { accessToken, refreshToken } = await getAuthTokensFromCookies();

    // Return unauthenticated status when no access token exists.
    if (!accessToken) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Verify access token with Supabase auth service.
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (!userError && userData?.user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          metadata: userData.user.user_metadata,
        },
      });
    }

    // Attempt silent refresh when access token is expired and refresh token is available.
    if (refreshToken) {
      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (!refreshError && refreshData.session && refreshData.user) {
        const response = NextResponse.json({
          authenticated: true,
          user: {
            id: refreshData.user.id,
            email: refreshData.user.email,
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

    // Clear stale cookies when token verification and silent refresh both fail.
    const response = NextResponse.json({ authenticated: false, user: null });
    return clearAuthCookies(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const response = NextResponse.json({ authenticated: false, user: null, error: message });
    return clearAuthCookies(response);
  }
}
