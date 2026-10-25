import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachAuthCookies } from "@/lib/supabase/cookies";

/**
 * POST /api/auth/reset-password
 * Verifies recovery code, updates user password via Supabase Admin, and signs the user in.
 *
 * Request Requirements:
 * - Authentication: None (public recovery verification endpoint).
 * - Query Parameters: None.
 * - Request Body:
 *   - email (required): String. User email address.
 *   - token (required): String. 6-digit recovery code.
 *   - newPassword (required): String. New password of at least 6 characters.
 *
 * Workflow:
 * 1. Validate payload format and password length requirements.
 * 2. Verify recovery code with Supabase Auth.
 * 3. Update password via Supabase Admin service.
 * 4. Sign in with new credentials and attach session cookies.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload Format and Password Length Requirements
    // ==========================================
    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: "Email, 6-digit recovery code, and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanToken = token.toString().trim();

    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { error: "Recovery code must be exactly 6 digits.", errorCode: "invalid_otp" },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Verify Recovery Code with Supabase Auth
    // ==========================================
    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: "recovery",
    });

    if (otpError || !otpData.user) {
      return NextResponse.json(
        { error: otpError?.message || "Invalid or expired recovery code.", errorCode: "invalid_otp" },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 3: Update Password via Supabase Admin Service
    // ==========================================
    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      otpData.user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // ==========================================
    // Step 4: Sign in with New Credentials and Attach Session Cookies
    // ==========================================
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: newPassword,
    });

    const response = NextResponse.json({
      success: true,
      message: "Password updated successfully. You are now logged in.",
      user: {
        id: otpData.user.id,
        email: normalizedEmail,
      },
    });

    if (!loginError && sessionData.session) {
      attachAuthCookies(
        response,
        sessionData.session.access_token,
        sessionData.session.refresh_token,
        sessionData.session.expires_in
      );
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
