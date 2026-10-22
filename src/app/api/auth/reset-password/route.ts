import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachAuthCookies } from "@/lib/supabase/cookies";

// --- Route Handler ---
// Endpoint: POST /api/auth/reset-password
// Purpose: Validate 6-digit recovery OTP, securely update account password, and establish user session.
// Target Service: Supabase Auth & Supabase Auth Admin
export async function POST(request: NextRequest) {
  try {
    // 1. Request Body Parsing and Format Validation
    // Validate email, OTP token format, and password length requirements.
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

    // 2. Recovery OTP Verification
    // Verify the one-time code against Supabase authentication service.
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

    // 3. Secure Password Update via Admin Client
    // Apply the new password directly via privileged admin service.
    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      otpData.user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 4. Session Establishment and Cookie Attachment
    // Sign in with new credentials and attach session cookies to the response.
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
    // 5. Internal Error Handling
    // Return structured JSON error message for unexpected failures.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
