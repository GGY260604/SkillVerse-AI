// --- Email Template Engine ---
// Purpose: Generate dark-themed authentication emails mirroring AuthModal visual styling.
// Target Locale Files: messages/{locale}.json under other.auth.email

// --- Schema ---
export type SupportedLocale = "en" | "zh" | "ms";

export type EmailActionType = "signup" | "recovery" | "magiclink" | "email_change";

export interface GenerateEmailOptions {
  actionType: EmailActionType | string;
  token?: string;
  email: string;
  locale?: string;
  redirectTo?: string;
}

export interface GeneratedEmail {
  subject: string;
  html: string;
  text: string;
}

interface EmailCategoryCopy {
  title: string;
  description: string;
  otp_label: string;
  security_notice: string;
  expiry_notice: string;
  subject: string;
}

interface EmailCommonCopy {
  badge: string;
  btn_return: string;
  footer_rights: string;
}

interface EmailCatalog {
  common: EmailCommonCopy;
  signup: EmailCategoryCopy;
  recovery: EmailCategoryCopy;
  magiclink: EmailCategoryCopy;
  email_change: EmailCategoryCopy;
}

// 1. Locale Normalization
// Normalize incoming locale string to supported project locales.
export function normalizeLocale(rawLocale?: string): SupportedLocale {
  if (!rawLocale) return "en";
  const lower = rawLocale.toLowerCase().trim();
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ms")) return "ms";
  return "en";
}

// 2. Dynamic Locale Catalog Loader
// Load message catalog on demand according to the selected locale without static imports.
export async function loadEmailCatalog(locale: SupportedLocale): Promise<EmailCatalog> {
  try {
    const messages = await import(`../../../messages/${locale}.json`);
    return messages.other.auth.email as EmailCatalog;
  } catch {
    const fallbackMessages = await import("../../../messages/en.json");
    return fallbackMessages.other.auth.email as EmailCatalog;
  }
}

// 3. Localized Email Generation
// Assemble subject, plaintext, and HTML email templates based on dynamic locale messages.
export async function generateLocalizedEmail(options: GenerateEmailOptions): Promise<GeneratedEmail> {
  const { actionType, email, redirectTo } = options;
  const token = options.token || "------";
  const locale = normalizeLocale(options.locale);

  const catalog = await loadEmailCatalog(locale);
  const safeCategory = (actionType in catalog && actionType !== "common"
    ? actionType
    : "signup") as EmailActionType;

  const categoryCopy = catalog[safeCategory];
  const commonCopy = catalog.common;

  // 4. Token Interpolation
  // Format subject and text with dynamic OTP values.
  const subject = categoryCopy.subject.replace("{token}", token);

  const plainText = `
SkillVerse AI - ${commonCopy.badge}
----------------------------------------
${categoryCopy.title}

${categoryCopy.description}

${categoryCopy.otp_label}: ${token}

${categoryCopy.expiry_notice}
${categoryCopy.security_notice}

${commonCopy.footer_rights}
`.trim();

  // 5. HTML Layout Generation
  // Structure email markup matching AuthModal.tsx visual design tokens.
  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f7; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #080808; min-height: 100vh; padding: 48px 16px;">
    <tr>
      <td align="center" valign="center">
        
        <!-- Modal Card Container (mirrors AuthModal.tsx) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 440px; background-color: #141414; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 0 60px rgba(0, 0, 0, 0.9);">
          
          <!-- Subtle Top Accent Glow Line -->
          <tr>
            <td height="2" style="background-color: #00e5c3;"></td>
          </tr>

          <tr>
            <td style="padding: 32px 28px;">
              
              <!-- Brand Header -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td valign="middle" style="padding-right: 8px;">
                    <img src="cid:skillverse-logo" alt="SkillVerse Auth Logo" width="20" height="20" style="display: block; width: 20px; height: 20px; border-radius: 4px; border: 0;" />
                  </td>
                  <td valign="middle">
                    <span style="font-size: 14px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      ${commonCopy.badge}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.3px; line-height: 1.3;">
                ${categoryCopy.title}
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 4px 0; font-size: 13px; line-height: 1.5; color: #9e9e9e;">
                ${categoryCopy.description}
              </p>

              <!-- Recipient Email Notice -->
              <p style="margin: 0 0 24px 0; font-size: 12px; font-family: 'JetBrains Mono', Consolas, Menlo, monospace; color: #00e5c3; word-break: break-all;">
                ${email}
              </p>

              <!-- OTP Form Input Block -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 11px; font-family: 'JetBrains Mono', Consolas, Menlo, monospace; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9e9e9e; margin-bottom: 6px;">
                  ${categoryCopy.otp_label}
                </div>
                
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="background-color: #0f0f0f; border: 1px solid rgba(0, 229, 195, 0.4); border-radius: 12px; padding: 18px 12px;">
                      <div style="font-size: 32px; font-weight: 700; font-family: 'JetBrains Mono', Consolas, Menlo, monospace; color: #00e5c3; letter-spacing: 10px; margin-left: 10px;">
                        ${token}
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="margin-top: 8px; font-size: 11px; color: #666666; font-family: 'Inter', sans-serif;">
                  ${categoryCopy.expiry_notice}
                </div>
              </div>

              <!-- Security Notice Alert -->
              <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #f87171;">
                  ${categoryCopy.security_notice}
                </p>
              </div>

              ${
                redirectTo
                  ? `<div style="text-align: center; margin-bottom: 24px;">
                      <a href="${redirectTo}" style="display: inline-block; width: 100%; box-sizing: border-box; text-align: center; padding: 12px 16px; font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; color: #080808; background-color: #00e5c3; border-radius: 12px; text-decoration: none;">
                        ${commonCopy.btn_return}
                      </a>
                    </div>`
                  : ""
              }

              <!-- Divider and Footer -->
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #666666; line-height: 1.5;">
                  ${commonCopy.footer_rights}
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return {
    subject,
    html,
    text: plainText,
  };
}
