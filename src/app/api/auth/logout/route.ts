import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies, clearAuthCookies } from "@/lib/supabase/cookies";

// --- Route Handler ---
// Endpoint: POST /api/auth/logout
// Purpose: Terminate active sessions and invalidate client authentication cookies.
// Target Service: Supabase Auth
export async function POST() {
  try {
    // 1. Session Token Extraction and Revocation
    // Extract token from incoming request cookies and revoke session upstream.
    const { accessToken } = await getAuthTokensFromCookies();

    if (accessToken) {
      await supabase.auth.signOut();
    }

    // 2. Cookie Clearance and Response Dispatch
    // Invalidate browser authentication cookies and return success status.
    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out.",
    });

    return clearAuthCookies(response);
  } catch (err: unknown) {
    // 3. Fallback and Cookie Invalidation on Error
    // Ensure auth cookies are cleared even when upstream revocation encounters an issue.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    const response = NextResponse.json({ success: false, error: message }, { status: 500 });
    return clearAuthCookies(response);
  }
}
