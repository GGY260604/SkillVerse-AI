import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  clearAuthCookies,
} from "@/lib/supabase/cookies";

/**
 * GET /api/auth/session
 * Validates session cookies, refreshes credentials transparently if needed, and returns the current user profile.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Resolve authenticated user from session cookies.
 * 2. Clear cookies and return unauthenticated payload if invalid.
 * 3. Dispatch authenticated user payload and refresh cookies.
 */
export async function GET() {
  try {
    // ==========================================
    // Step 1: Resolve Authenticated User from Session Cookies
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();

    // ==========================================
    // Step 2: Clear Cookies and Return Unauthenticated Payload if Invalid
    // ==========================================
    if (!user) {
      const response = NextResponse.json({ authenticated: false, user: null });
      return clearAuthCookies(response);
    }

    // ==========================================
    // Step 3: Dispatch Authenticated User Payload and Refresh Cookies
    // ==========================================
    const response = NextResponse.json({
      authenticated: true,
      user,
    });

    return applyAuthCookies(response, newTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const response = NextResponse.json({ authenticated: false, user: null, error: message });
    return clearAuthCookies(response);
  }
}
