import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { attachAuthCookies } from "@/lib/supabase/cookies";

// User Authentication and Session Initialization
// Authenticate user credentials and establish session cookies.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.session) {
      const rawMsg = error?.message || "";
      const isNotConfirmed = rawMsg.toLowerCase().includes("not confirmed");
      const errorCode = isNotConfirmed ? "email_not_confirmed" : "invalid_credentials";

      return NextResponse.json(
        { error: rawMsg || "Invalid login credentials.", errorCode },
        { status: 401 }
      );
    }

    // Ensure user record exists in user table
    if (data.user?.id && data.user.email) {
      try {
        const { prisma } = await import("@/lib/prisma");
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

    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata,
      },
    });

    // Persist session for 30 days when rememberMe is selected; otherwise default to browser session.
    const maxAge = rememberMe !== false ? 60 * 60 * 24 * 30 : undefined;

    // Attach session tokens to HTTP-only authentication cookies.
    return attachAuthCookies(
      response,
      data.session.access_token,
      data.session.refresh_token,
      maxAge
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
