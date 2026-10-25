import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { attachAuthCookies } from "@/lib/supabase/cookies";

/**
 * POST /api/auth/login
 * Authenticates user credentials against Supabase Auth, ensures user record synchronization,
 * and attaches session cookies to the response.
 *
 * Request Requirements:
 * - Authentication: None (public login endpoint).
 * - Query Parameters: None.
 * - Request Body:
 *   - email (required): String. User email address.
 *   - password (required): String. User account password.
 *   - rememberMe (optional): Boolean. Extends session cookie duration to 30 days.
 *
 * Workflow:
 * 1. Validate request body credentials.
 * 2. Authenticate user credentials with Supabase Auth.
 * 3. Synchronize user record in database.
 * 4. Dispatch response and attach session cookies.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Request Body Credentials
    // ==========================================
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Authenticate User Credentials with Supabase Auth
    // ==========================================
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "Authentication failed. No active session returned." },
        { status: 401 }
      );
    }

    // ==========================================
    // Step 3: Synchronize User Record in Database
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
        console.error("Failed to sync user in login:", dbErr);
      }
    }

    // ==========================================
    // Step 4: Dispatch Response and Attach Session Cookies
    // ==========================================
    const name =
      (data.user.user_metadata?.name ||
        data.user.user_metadata?.full_name ||
        null) as string | null;

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
      },
    });

    const expiresIn = rememberMe ? 60 * 60 * 24 * 30 : data.session.expires_in;

    return attachAuthCookies(
      response,
      data.session.access_token,
      data.session.refresh_token,
      expiresIn
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
