import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { attachAuthCookies } from "@/lib/supabase/cookies";

// One-Time Password Verification
// Confirm 6-digit verification code for signup confirmation or password recovery.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, type } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required.", errorCode: "invalid_otp" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanToken = token.toString().trim();

    // Enforce strict 6-digit numeric validation.
    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits.", errorCode: "invalid_otp" },
        { status: 400 }
      );
    }

    // Verify OTP against Supabase authentication service.
    const otpType = type === "recovery" ? "recovery" : "signup";
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: otpType,
    });

    if (error) {
      return NextResponse.json({ error: error.message, errorCode: "invalid_otp" }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      message: "Verification successful.",
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });

    // Attach authentication cookies when session is established.
    if (data.session) {
      attachAuthCookies(
        response,
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_in
      );
    }

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
