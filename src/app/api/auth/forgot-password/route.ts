import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLocalizedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

// Password Recovery and Verification Email Dispatch
// Initiate recovery process and dispatch localized email containing verification code.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, locale } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userLocale = locale || "en";

    // Use admin link generator to generate recovery code and bypass built-in email templates.
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const otp = data.properties?.email_otp;

    // Dispatch localized email in code based on user preferred locale.
    if (otp) {
      const localizedEmail = generateLocalizedEmail({
        actionType: "recovery",
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
      message: "6-digit recovery code has been dispatched to your email.",
      email: normalizedEmail,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
