// Multi-Language Email Template Engine
// Generate minimalist dark-themed authentication emails mirroring AuthModal component styling.

export type SupportedLocale = "en" | "zh" | "ms";

export interface GenerateEmailOptions {
  actionType: "signup" | "recovery" | "magiclink" | "email_change" | string;
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

interface LocalizedCopy {
  badge: string;
  title: string;
  description: string;
  otpLabel: string;
  securityNotice: string;
  expiryNotice: string;
  footerRights: string;
  subject: (token: string) => string;
}

const TEMPLATE_CONTENT: Record<SupportedLocale, Record<string, LocalizedCopy>> = {
  zh: {
    signup: {
      badge: "SkillVerse Auth",
      title: "邮箱验证",
      description: "感谢注册 SkillVerse AI 平台。请输入下方 6 位数验证码完成账号认证。",
      otpLabel: "6 位数验证码",
      securityNotice: "若非本人操作，请忽略此邮件，您的账号安全不会受到影响。",
      expiryNotice: "验证码有效期为 10 分钟，请勿泄露给他人。",
      footerRights: "© 2026 SkillVerse AI. 保留所有权利。",
      subject: (token) => `【SkillVerse AI】您的注册验证码：${token}`,
    },
    recovery: {
      badge: "SkillVerse Auth",
      title: "设置新密码",
      description: "我们收到了为您的账号重置密码的申请。请输入下方 6 位数恢复验证码以继续操作。",
      otpLabel: "6 位数验证码",
      securityNotice: "如果您未曾申请重置密码，请立即检查账号安全或忽略此邮件。",
      expiryNotice: "出于安全保护，验证码将在 10 分钟后失效。",
      footerRights: "© 2026 SkillVerse AI. 保留所有权利。",
      subject: (token) => `【SkillVerse AI】密码重置验证码：${token}`,
    },
    magiclink: {
      badge: "SkillVerse Auth",
      title: "快捷登录",
      description: "您正在使用一次性验证码登录 SkillVerse AI。请输入下方 6 位数代码。",
      otpLabel: "6 位数验证码",
      securityNotice: "如非本人操作，请勿将验证码透露给任何人。",
      expiryNotice: "验证码将在 10 分钟后过期。",
      footerRights: "© 2026 SkillVerse AI. 保留所有权利。",
      subject: (token) => `【SkillVerse AI】快捷登录验证码：${token}`,
    },
    email_change: {
      badge: "SkillVerse Auth",
      title: "更换邮箱",
      description: "您正在请求将 SkillVerse AI 账号绑定到此邮箱。请输入以下 6 位数验证码确认更换。",
      otpLabel: "6 位数验证码",
      securityNotice: "如果您并未申请更换邮箱，请立即联系管理员或忽略此邮件。",
      expiryNotice: "验证码将在 10 分钟后失效。",
      footerRights: "© 2026 SkillVerse AI. 保留所有权利。",
      subject: (token) => `【SkillVerse AI】更换邮箱验证码：${token}`,
    },
  },
  ms: {
    signup: {
      badge: "SkillVerse Auth",
      title: "Pengesahan Emel",
      description: "Terima kasih kerana mendaftar dengan SkillVerse AI. Masukkan kod pengesahan 6 digit di bawah untuk mengesahkan akaun anda.",
      otpLabel: "Kod Pengesahan 6 Digit",
      securityNotice: "Jika anda tidak membuat permintaan ini, sila abaikan emel ini. Keselamatan akaun anda tetap terjamin.",
      expiryNotice: "Kod pengesahan ini sah selama 10 minit. Jangan kongsi kod ini dengan sesiapa.",
      footerRights: "© 2026 SkillVerse AI. Hak Cipta Terpelihara.",
      subject: (token) => `SkillVerse AI - Kod Pengesahan Anda: ${token}`,
    },
    recovery: {
      badge: "SkillVerse Auth",
      title: "Tetapkan Semula Kata Laluan",
      description: "Kami telah menerima permintaan untuk menetapkan semula kata laluan anda. Masukkan kod pemulihan 6 digit di bawah.",
      otpLabel: "Kod Pengesahan 6 Digit",
      securityNotice: "Jika anda tidak meminta penetapan semula kata laluan, sila abaikan emel ini dengan selamat.",
      expiryNotice: "Demi keselamatan, kod ini akan tamat tempoh dalam masa 10 minit.",
      footerRights: "© 2026 SkillVerse AI. Hak Cipta Terpelihara.",
      subject: (token) => `SkillVerse AI - Kod Tetapkan Semula Kata Laluan: ${token}`,
    },
    magiclink: {
      badge: "SkillVerse Auth",
      title: "Log Masuk Pantas",
      description: "Anda sedang log masuk ke SkillVerse AI tanpa kata laluan. Sila masukkan kod 6 digit di bawah.",
      otpLabel: "Kod Pengesahan 6 Digit",
      securityNotice: "Jika bukan anda yang memulakannya, sila abaikan emel ini.",
      expiryNotice: "Kod ini akan tamat tempoh dalam masa 10 minit.",
      footerRights: "© 2026 SkillVerse AI. Hak Cipta Terpelihara.",
      subject: (token) => `SkillVerse AI - Kod Log Masuk Sekali: ${token}`,
    },
    email_change: {
      badge: "SkillVerse Auth",
      title: "Tukar Emel",
      description: "Anda telah meminta untuk menukar emel akaun SkillVerse AI anda. Masukkan kod pengesahan 6 digit di bawah.",
      otpLabel: "Kod Pengesahan 6 Digit",
      securityNotice: "Jika anda tidak memohon pertukaran emel, sila abaikan emel ini.",
      expiryNotice: "Kod pengesahan ini akan tamat tempoh dalam masa 10 minit.",
      footerRights: "© 2026 SkillVerse AI. Hak Cipta Terpelihara.",
      subject: (token) => `SkillVerse AI - Sahkan Pertukaran Emel: ${token}`,
    },
  },
  en: {
    signup: {
      badge: "SkillVerse Auth",
      title: "Verify Email",
      description: "Thank you for registering with SkillVerse AI. Enter the 6-digit verification code below to confirm your account.",
      otpLabel: "6-Digit Verification Code",
      securityNotice: "If you did not initiate this request, please safely disregard this email. Your account remains secure.",
      expiryNotice: "This code expires in 10 minutes. Do not share this code with anyone.",
      footerRights: "© 2026 SkillVerse AI. All rights reserved.",
      subject: (token) => `SkillVerse AI - Your Verification Code: ${token}`,
    },
    recovery: {
      badge: "SkillVerse Auth",
      title: "New Password",
      description: "We received a request to reset your SkillVerse AI account password. Enter the 6-digit recovery code below.",
      otpLabel: "6-Digit Verification Code",
      securityNotice: "If you did not request a password reset, please ignore this message. Your password will remain unchanged.",
      expiryNotice: "For your security, this code will expire in 10 minutes.",
      footerRights: "© 2026 SkillVerse AI. All rights reserved.",
      subject: (token) => `SkillVerse AI - Password Reset Code: ${token}`,
    },
    magiclink: {
      badge: "SkillVerse Auth",
      title: "One-Time Sign In",
      description: "You requested a passwordless login to SkillVerse AI. Enter the 6-digit passcode below.",
      otpLabel: "6-Digit Passcode",
      securityNotice: "If you did not request this code, no action is needed.",
      expiryNotice: "This passcode expires in 10 minutes.",
      footerRights: "© 2026 SkillVerse AI. All rights reserved.",
      subject: (token) => `SkillVerse AI - One-Time Login Code: ${token}`,
    },
    email_change: {
      badge: "SkillVerse Auth",
      title: "Email Change",
      description: "You requested to update your SkillVerse AI account email address. Enter the 6-digit code below to confirm this change.",
      otpLabel: "6-Digit Verification Code",
      securityNotice: "If you did not request this update, please ignore this email.",
      expiryNotice: "This code expires in 10 minutes.",
      footerRights: "© 2026 SkillVerse AI. All rights reserved.",
      subject: (token) => `SkillVerse AI - Confirm Email Change: ${token}`,
    },
  },
};

// Normalize input locale to supported values ('en' | 'zh' | 'ms').
export function normalizeLocale(rawLocale?: string): SupportedLocale {
  if (!rawLocale) return "en";
  const lower = rawLocale.toLowerCase().trim();
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ms")) return "ms";
  return "en";
}

// Generate localized email payload matching AuthModal visual styling.
export function generateLocalizedEmail(options: GenerateEmailOptions): GeneratedEmail {
  const { actionType, email, redirectTo } = options;
  const token = options.token || "------";
  const locale = normalizeLocale(options.locale);

  const localizedSet = TEMPLATE_CONTENT[locale] || TEMPLATE_CONTENT.en;
  const copy = localizedSet[actionType] || localizedSet.signup;

  const subject = copy.subject(token);

  const plainText = `
SkillVerse AI - ${copy.badge}
----------------------------------------
${copy.title}

${copy.description}

${copy.otpLabel}: ${token}

${copy.expiryNotice}
${copy.securityNotice}

${copy.footerRights}
`.trim();

  // Email layout styled directly after AuthModal.tsx tokens:
  // - Background: #080808 (Achomatic Black)
  // - Card: #141414 with border rgba(255, 255, 255, 0.08)
  // - Badge: bg-accent/15 (#00e5c3 at 12%) with text-accent (#00e5c3)
  // - OTP Input Box: bg-bg-secondary (#0f0f0f) with border-accent (#00e5c3 at 35%)
  // - Typography: Inter font stack with JetBrains Mono for OTP code
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
              
              <!-- Brand Header (mirrors Header and Footer) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td valign="middle" style="padding-right: 8px;">
                    <img src="cid:skillverse-logo" alt="SkillVerse Auth Logo" width="20" height="20" style="display: block; width: 20px; height: 20px; border-radius: 4px; border: 0;" />
                  </td>
                  <td valign="middle">
                    <span style="font-size: 14px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.2px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      SkillVerse Auth
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Title (mirrors AuthModal h2) -->
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #f5f5f7; letter-spacing: -0.3px; line-height: 1.3;">
                ${copy.title}
              </h1>

              <!-- Description (mirrors AuthModal p.text-secondary) -->
              <p style="margin: 0 0 4px 0; font-size: 13px; line-height: 1.5; color: #9e9e9e;">
                ${copy.description}
              </p>

              <!-- Recipient Email Notice (mirrors AuthModal p.font-mono.text-accent) -->
              <p style="margin: 0 0 24px 0; font-size: 12px; font-family: 'JetBrains Mono', Consolas, Menlo, monospace; color: #00e5c3; word-break: break-all;">
                ${email}
              </p>

              <!-- OTP Form Input Block (mirrors AuthModal OTP input box) -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 11px; font-family: 'JetBrains Mono', Consolas, Menlo, monospace; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9e9e9e; margin-bottom: 6px;">
                  ${copy.otpLabel}
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
                  ${copy.expiryNotice}
                </div>
              </div>

              <!-- Security Notice Alert (mirrors AuthModal alert box) -->
              <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 10px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #f87171;">
                  ${copy.securityNotice}
                </p>
              </div>

              ${
                redirectTo
                  ? `<div style="text-align: center; margin-bottom: 24px;">
                      <a href="${redirectTo}" style="display: inline-block; width: 100%; box-sizing: border-box; text-align: center; padding: 12px 16px; font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; color: #080808; background-color: #00e5c3; border-radius: 12px; text-decoration: none;">
                        Return to SkillVerse AI
                      </a>
                    </div>`
                  : ""
              }

              <!-- Divider (mirrors AuthModal border-border-subtle) -->
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #666666; line-height: 1.5;">
                  ${copy.footerRights}
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
