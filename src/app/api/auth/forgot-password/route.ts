import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLocalizedEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/sender";

/**
 * POST /api/auth/forgot-password
 * Initiates account password recovery and dispatches localized emails containing recovery codes.
 *
 * Request Requirements:
 * - Authentication: None (public recovery initiation endpoint).
 * - Query Parameters: None.
 * - Request Body:
 *   - email (required): String. User email address.
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Defaults to 'en'.
 *   - theme (optional): String ('light' | 'dark'). Defaults to 'dark'.
 *
 * Workflow:
 * 1. Validate payload and email presence.
 * 2. Generate recovery link with Supabase Admin.
 * 3. Dispatch localized recovery email with one-time code.
 * 4. Dispatch confirmation response.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload and Email Presence
    // ==========================================
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

    // ==========================================
    // Step 2: Generate Recovery Link with Supabase Admin
    // ==========================================
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ==========================================
    // Step 3: Dispatch Localized Recovery Email with One-Time Code
    // ==========================================
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

    // ==========================================
    // Step 4: Dispatch Confirmation Response
    // ==========================================
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
