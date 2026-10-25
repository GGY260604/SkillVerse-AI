import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies, clearAuthCookies } from "@/lib/supabase/cookies";

/**
 * POST /api/auth/logout
 * Terminates active user session upstream in Supabase Auth and clears client authentication cookies.
 *
 * Request Requirements:
 * - Authentication: Optional (clears cookies regardless of session validity).
 * - Query Parameters: None.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Extract access token and sign out from Supabase Auth.
 * 2. Clear client authentication cookies and dispatch response.
 */
export async function POST() {
  try {
    // ==========================================
    // Step 1: Extract Access Token and Sign Out from Supabase Auth
    // ==========================================
    const { accessToken } = await getAuthTokensFromCookies();

    if (accessToken) {
      await supabase.auth.signOut();
    }

    // ==========================================
    // Step 2: Clear Client Authentication Cookies and Dispatch Response
    // ==========================================
    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out.",
    });

    return clearAuthCookies(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const response = NextResponse.json({ success: false, error: message }, { status: 500 });
    return clearAuthCookies(response);
  }
}
