import fs from "fs";
import path from "path";
import { GeneratedEmail } from "./templates";

// --- Email Dispatch Service ---
// Purpose: Send dynamic multi-language emails via Resend transactional API.
// Target Service: Resend API (https://api.resend.com/emails)

// --- Schema ---
export interface SendMailOptions {
  to: string;
  email: GeneratedEmail;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const { to, email } = options;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "SkillVerse AI <onboarding@resend.dev>";

  // 1. Environment Key Validation
  // Ensure the Resend API credential is configured before proceeding.
  if (!resendApiKey) {
    console.error("[EMAIL DISPATCH ERROR] RESEND_API_KEY is not configured in environment.");
    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  try {
    // 2. Asset Preparation
    // Read canonical favicon from public directory as embedded base64 attachment.
    const publicFaviconPath = path.join(process.cwd(), "public", "favicon.ico");
    const faviconBase64 = fs.existsSync(publicFaviconPath)
      ? fs.readFileSync(publicFaviconPath).toString("base64")
      : "";

    // 3. Resend API Request Dispatch
    // Transmit email payload with subject, HTML body, plain text, and brand logo.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        attachments: faviconBase64
          ? [
              {
                content: faviconBase64,
                filename: "favicon.ico",
                content_type: "image/x-icon",
                content_id: "skillverse-logo",
              },
            ]
          : undefined,
      }),
    });

    const data = await response.json();

    // 4. Response Validation
    // Validate upstream HTTP status and parse delivery identifier.
    if (!response.ok) {
      console.error("[EMAIL DISPATCH ERROR - RESEND]", data);
      return {
        success: false,
        error: data.message || "Failed to dispatch email via Resend API",
      };
    }

    console.log(`[EMAIL DISPATCH SUCCESS - RESEND] Delivered to ${to} (ID: ${data.id})`);
    return {
      success: true,
      messageId: data.id,
    };
  } catch (err: unknown) {
    // 5. Error Catch and Handling
    // Catch unexpected network exceptions and return failure status.
    const errorMsg = err instanceof Error ? err.message : "Network error during email dispatch";
    console.error("[EMAIL DISPATCH NETWORK ERROR]", errorMsg);
    return { success: false, error: errorMsg };
  }
}
