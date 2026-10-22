import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { attachAuthCookies } from "@/lib/supabase/cookies";

// --- Route Handler ---
// Endpoint: POST /api/auth/login
// Purpose: Authenticate user credentials and establish session cookies.
// Target Service: Supabase Auth & Prisma Database
export async function POST(request: NextRequest) {
  try {
    // 1. Request Body Parsing and Validation
    // Extract user credentials and remember-me preference from JSON payload.
    // Validate that both email and password are provided.
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // 2. Supabase Authentication
    // Authenticate user credentials against the Supabase Auth service.
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

    // 3. User Synchronization
    // Ensure user record exists in Prisma database for relation mapping.
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

    // 4. Response Dispatch and Cookie Attachment
    // Build user profile payload and attach authentication cookies.
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
    // 5. Internal Error Handling
    // Return structured JSON error message for unexpected failures.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
