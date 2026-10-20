// Email Dispatch Service
// Dispatches dynamic multi-language emails via Resend API.

import fs from "fs";
import path from "path";
import { GeneratedEmail } from "./templates";

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

  if (!resendApiKey) {
    console.error("[EMAIL DISPATCH ERROR] RESEND_API_KEY is not configured in environment.");
    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  try {
    // Load canonical favicon from public directory.
    const publicFaviconPath = path.join(process.cwd(), "public", "favicon.ico");
    const faviconBase64 = fs.existsSync(publicFaviconPath)
      ? fs.readFileSync(publicFaviconPath).toString("base64")
      : "";

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
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Network error during email dispatch";
    console.error("[EMAIL DISPATCH NETWORK ERROR]", errorMsg);
    return { success: false, error: errorMsg };
  }
}
