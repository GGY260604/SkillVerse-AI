import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLocalizedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

// --- Route Handler ---
// Endpoint: POST /api/auth/register
// Purpose: Register new users and dispatch localized email verification codes.
// Target Service: Supabase Auth Admin & Upstream SMTP Provider
export async function POST(request: NextRequest) {
  try {
    // 1. Request Body Parsing and Format Validation
    // Parse the incoming JSON payload and validate credential requirements.
    const body = await request.json();
    const { email, password, locale } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userLocale = locale || "en";

    // 2. User Account Creation via Admin Client
    // Generate signup verification link and token while bypassing built-in email templates.
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password,
      options: {
        data: {
          locale: userLocale,
        },
      },
    });

    if (error) {
      const isAlready = error.message.toLowerCase().includes("already");
      const errorCode = isAlready ? "user_already_exists" : "register_failed";
      return NextResponse.json({ error: error.message, errorCode }, { status: 400 });
    }

    // 3. Localized Verification Email Dispatch
    // Format custom localized template and send the one-time code via transactional email.
    const otp = data.properties?.email_otp;
    if (otp) {
      const localizedEmail = await generateLocalizedEmail({
        actionType: "signup",
        token: otp,
        email: normalizedEmail,
        locale: userLocale,
      });

      await sendEmail({
        to: normalizedEmail,
        email: localizedEmail,
      });
    }

    // 4. Database User Synchronization
    // Record the user profile within the local database instance.
    if (data.user?.id) {
      try {
        const { prisma } = await import("@/lib/supabase/prisma");
        await prisma.user.upsert({
          where: { id: data.user.id },
          create: {
            id: data.user.id,
            email: normalizedEmail,
            locale: userLocale,
          },
          update: {
            email: normalizedEmail,
            locale: userLocale,
          },
        });
      } catch (dbErr) {
        console.error("Failed to insert user into database upon registration:", dbErr);
      }
    }

    // 5. Successful Response Dispatch
    // Return registration acknowledgment with user metadata.
    return NextResponse.json({
      success: true,
      message: "6-digit verification code has been dispatched to your email.",
      email: normalizedEmail,
      userId: data.user?.id,
    });
  } catch (err: unknown) {
    // 6. Internal Error Handling
    // Return structured JSON error message for unexpected failures.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
