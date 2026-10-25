import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { attachAuthCookies } from "@/lib/supabase/cookies";

/**
 * POST /api/auth/verify-otp
 * Verifies 6-digit one-time code for signup confirmation or password recovery,
 * synchronizes the user profile in the database, and establishes session cookies.
 *
 * Request Requirements:
 * - Authentication: None (public OTP verification endpoint).
 * - Query Parameters: None.
 * - Request Body:
 *   - email (required): String. User email address.
 *   - token (required): String. 6-digit verification code.
 *   - type (optional): String ('signup' | 'recovery'). Defaults to 'signup'.
 *
 * Workflow:
 * 1. Validate payload format and 6-digit pattern.
 * 2. Verify one-time code with Supabase Auth.
 * 3. Synchronize user profile in database.
 * 4. Dispatch response and attach session cookies.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload Format and 6-Digit Pattern
    // ==========================================
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

    if (!/^\d{6}$/.test(cleanToken)) {
      return NextResponse.json(
        { error: "Verification code must be exactly 6 digits.", errorCode: "invalid_otp" },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Verify One-Time Code with Supabase Auth
    // ==========================================
    const otpType = type === "recovery" ? "recovery" : "signup";
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: otpType,
    });

    if (error) {
      return NextResponse.json({ error: error.message, errorCode: "invalid_otp" }, { status: 400 });
    }

    // ==========================================
    // Step 3: Synchronize User Profile in Database
    // ==========================================
    if (data.user?.id && data.user.email) {
      try {
        const { prisma } = await import("@/lib/supabase/prisma");
        await prisma.user.upsert({
          where: { id: data.user.id },
          create: {
            id: data.user.id,
            email: data.user.email.toLowerCase(),
            locale: (data.user.user_metadata?.locale as string) || "en",
          },
          update: {},
        });
      } catch (dbErr) {
        console.error("Failed to sync user in verify-otp:", dbErr);
      }
    }

    // ==========================================
    // Step 4: Dispatch Response and Attach Session Cookies
    // ==========================================
    const response = NextResponse.json({
      success: true,
      message: "Verification successful.",
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });

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
