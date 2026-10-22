import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  clearAuthCookies,
} from "@/lib/supabase/cookies";

// --- Route Handler ---
// Endpoint: GET /api/auth/session
// Purpose: Validate session cookies, refresh credentials transparently if needed, and return user profile.
export async function GET() {
  try {
    const { user, newTokens } = await getAuthenticatedUser();

    if (!user) {
      const response = NextResponse.json({ authenticated: false, user: null });
      return clearAuthCookies(response);
    }

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

