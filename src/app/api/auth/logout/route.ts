import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies, clearAuthCookies } from "@/lib/supabase/cookies";

// User Sign Out and Cookie Clearance
// Sign out active session from Supabase service and wipe browser authentication cookies.
export async function POST() {
  try {
    const { accessToken } = await getAuthTokensFromCookies();

    if (accessToken) {
      await supabase.auth.signOut();
    }

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
