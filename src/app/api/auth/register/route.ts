import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLocalizedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

// User Registration and Verification Email Dispatch
// Initiate registration and dispatch localized email containing verification code.
export async function POST(request: NextRequest) {
  try {
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

    // Use admin link generator to create user and bypass built-in email templates.
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

    const otp = data.properties?.email_otp;

    // Dispatch localized email in code based on user preferred locale.
    if (otp) {
      const localizedEmail = generateLocalizedEmail({
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
