import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLocalizedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

// --- Route Handler ---
// Endpoint: POST /api/auth/forgot-password
// Purpose: Initiate password recovery and dispatch localized email verification codes.
// Target Service: Supabase Auth Admin & Upstream SMTP Provider
export async function POST(request: NextRequest) {
  try {
    // 1. Request Body Parsing and Validation
    // Parse incoming payload and verify email presence.
    const body = await request.json();
    const { email, locale, theme } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userLocale = locale || "en";
    const userTheme = theme || "dark";

    // 2. Recovery Link Generation via Admin Client
    // Generate recovery link and one-time password while bypassing built-in email templates.
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 3. Localized Recovery Email Dispatch
    // Format custom localized template and send the recovery code via transactional email.
    const otp = data.properties?.email_otp;
    if (otp) {
      const localizedEmail = await generateLocalizedEmail({
        actionType: "recovery",
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

    // 4. Successful Response Dispatch
    // Return delivery confirmation for user interface display.
    return NextResponse.json({
      success: true,
      message: "6-digit recovery code has been dispatched to your email.",
      email: normalizedEmail,
    });
  } catch (err: unknown) {
    // 5. Internal Error Handling
    // Return structured JSON error message for unexpected failures.
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
