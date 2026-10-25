import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLocalizedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

/**
 * POST /api/auth/register
 * Registers new user accounts and dispatches localized verification emails.
 *
 * Request Requirements:
 * - Authentication: None (public registration endpoint).
 * - Query Parameters: None.
 * - Request Body:
 *   - email (required): String. User email address.
 *   - password (required): String. Password of at least 6 characters.
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Defaults to 'en'.
 *   - theme (optional): String ('light' | 'dark'). Defaults to 'dark'.
 *
 * Workflow:
 * 1. Validate payload format and credential requirements.
 * 2. Create user signup link with Supabase Admin.
 * 3. Dispatch localized verification email with one-time code.
 * 4. Synchronize user profile in local database.
 * 5. Dispatch registration success response.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload Format and Credential Requirements
    // ==========================================
    const body = await request.json();
    const { email, password, locale, theme } = body;

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
    const userTheme = theme || "dark";

    // ==========================================
    // Step 2: Create User Signup Link with Supabase Admin
    // ==========================================
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

    // ==========================================
    // Step 3: Dispatch Localized Verification Email with One-Time Code
    // ==========================================
    const otp = data.properties?.email_otp;
    if (otp) {
      const localizedEmail = await generateLocalizedEmail({
        actionType: "signup",
        token: otp,
        email: normalizedEmail,
        locale: userLocale,
        theme: userTheme,
      });

      await sendEmail({
        to: normalizedEmail,
        email: localizedEmail,
      });
    }

    // ==========================================
    // Step 4: Synchronize User Profile in Local Database
    // ==========================================
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

    // ==========================================
    // Step 5: Dispatch Registration Success Response
    // ==========================================
    return NextResponse.json({
      success: true,
      message: "6-digit verification code has been dispatched to your email.",
      email: normalizedEmail,
      userId: data.user?.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
