import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachAuthCookies } from "@/lib/supabase/cookies";

// Password Reset Confirmation
// Validate 6-digit recovery OTP and securely update account password.
export async function POST(request: NextRequest) {
  try {
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

    // Enforce strict 6-digit numeric validation.
    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { error: "Recovery code must be exactly 6 digits.", errorCode: "invalid_otp" },
        { status: 400 }
      );
    }

    // Verify recovery OTP code with Supabase auth service.
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

    // Update password using admin client for reliable execution.
    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      otpData.user.id,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Sign in with new credentials to establish active session tokens.
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

    // Attach authentication cookies when session login succeeds.
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
