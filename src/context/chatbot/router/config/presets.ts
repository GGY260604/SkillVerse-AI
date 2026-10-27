// ==========================================
// Preset Input Triggers Configuration
// ==========================================

import type { AgentDirective } from "../engine";

// Multilingual text description structure supporting English, Chinese, and Malay.
export interface LocalizedMessage {
  en: string;
  zh: string;
  ms: string;
}

// Preset trigger rule associating user keywords with a target action directive.
export interface PresetTriggerRule {
  // Trigger keywords or phrases across English, Chinese, and Malay (case-insensitive substring evaluation).
  keywords: string[];
  // The deterministic directive to execute when matched.
  action: {
    target: string;
    message?: string | LocalizedMessage;
    args?: Record<string, unknown>;
  };
}

// Declarative list of preset input keyword rules supporting English, Chinese, and Malay.
// You can freely edit, add, or customize preset triggers here without touching the engine.
export const PRESET_INPUT_RULES: PresetTriggerRule[] = [
  // ==========================================
  // Rule 1: Skill Gap Analysis Dashboard
  // ==========================================
  {
    keywords: [
      "/analysis",
      "analysis",
      "skill analysis",
      "career analysis",
      "gap analysis",
      "技能分析",
      "差距分析",
      "职业分析",
      "职业规划",
      "规划",
      "analisis",
      "analisis kemahiran",
      "jurang kemahiran",
      "analisis kerjaya",
    ],
    action: {
      target: "/analysis",
      message: {
        en: "Navigating to Skill Gap Analysis dashboard.",
        zh: "正在为您导航至技能缺口分析大屏。",
        ms: "Mengarahkan ke papan pemuka Analisis Jurang Kemahiran.",
      },
    },
  },

  // ==========================================
  // Rule 2: Resume Document Upload Modal
  // ==========================================
  {
    keywords: [
      "/upload",
      "upload resume",
      "upload cv",
      "upload",
      "上传简历",
      "上传文档",
      "简历上传",
      "上传",
      "muat naik",
      "muat naik resume",
      "hantar resume",
    ],
    action: {
      target: "upload",
      message: {
        en: "Opening resume upload dialog.",
        zh: "正在为您打开简历上传窗口。",
        ms: "Membuka dialog muat naik resume.",
      },
    },
  },

  // ==========================================
  // Rule 3: User Authentication Login Modal
  // ==========================================
  {
    keywords: [
      "/login",
      "login",
      "sign in",
      "log in",
      "登录",
      "登陆",
      "用户登录",
      "log masuk",
      "masuk akaun",
      "log masuk pengguna",
    ],
    action: {
      target: "login",
      message: {
        en: "Opening user login dialog.",
        zh: "正在为您打开用户登录窗口。",
        ms: "Membuka dialog log masuk pengguna.",
      },
    },
  },

  // ==========================================
  // Rule 4: User Registration Modal
  // ==========================================
  {
    keywords: [
      "/register",
      "register",
      "sign up",
      "create account",
      "注册",
      "用户注册",
      "创建账号",
      "daftar",
      "daftar akaun",
      "cipta akaun",
    ],
    action: {
      target: "register",
      message: {
        en: "Opening user registration dialog.",
        zh: "正在为您打开用户注册窗口。",
        ms: "Membuka dialog pendaftaran pengguna.",
      },
    },
  },

  // ==========================================
  // Rule 5: User Profile Settings Modal
  // ==========================================
  {
    keywords: [
      "/profile",
      "profile",
      "my profile",
      "account settings",
      "个人资料",
      "我的档案",
      "个人档案",
      "个人设置",
      "profil",
      "profil saya",
      "maklumat peribadi",
      "akaun saya",
    ],
    action: {
      target: "profile",
      message: {
        en: "Opening user profile settings.",
        zh: "正在为您打开个人资料设置。",
        ms: "Membuka tetapan profil pengguna.",
      },
    },
  },

  // ==========================================
  // Rule 6: Real-Time Labor Market Dynamics Telemetry
  // ==========================================
  {
    keywords: [
      "/market",
      "market",
      "labor market",
      "market trends",
      "市场",
      "劳动力市场",
      "市场趋势",
      "趋势",
      "pasaran",
      "pasaran buruh",
      "trend pasaran",
    ],
    action: {
      target: "/#labor-market",
      message: {
        en: "Navigating to real-time labor market telemetry.",
        zh: "正在为您导航至实时劳动力市场数据分析。",
        ms: "Mengarahkan ke telemetri pasaran buruh masa nyata.",
      },
    },
  },

  // ==========================================
  // Rule 7: Interactive Skill Trend Radar
  // ==========================================
  {
    keywords: [
      "/radar",
      "radar",
      "skill radar",
      "trend radar",
      "雷达",
      "技能雷达",
      "技能趋势",
      "雷达图",
      "radar kemahiran",
      "trend kemahiran",
    ],
    action: {
      target: "/#skill-trend-check",
      message: {
        en: "Navigating to skill trend diagnostic radar.",
        zh: "正在为您导航至技能趋势诊断雷达。",
        ms: "Mengarahkan ke radar diagnostik trend kemahiran.",
      },
    },
  },

  // ==========================================
  // Rule 8: Collaborative Community Shared Roadmaps
  // ==========================================
  {
    keywords: [
      "/shared",
      "shared",
      "community",
      "shared roadmaps",
      "社区",
      "共享路线图",
      "共享",
      "公开路线图",
      "komuniti",
      "dikongsi",
      "perkongsian",
      "pelan perkongsian",
    ],
    action: {
      target: "/shared",
      message: {
        en: "Navigating to community shared roadmaps.",
        zh: "正在为您导航至社区共享路线图。",
        ms: "Mengarahkan ke pelan hala tuju perkongsian komuniti.",
      },
    },
  },
];

/**
 * Match Preset Trigger Utility
 *
 * Evaluates raw user input text against configured preset keyword rules across all three supported languages.
 *
 * Workflow:
 * 1. Normalize user inquiry string to lowercase trim.
 * 2. Search configured preset input rules for keyword matches.
 * 3. Resolve localized action response message and return directive.
 */
export function matchPresetTrigger(userInput: string, locale: string = "en"): AgentDirective | null {
  // ==========================================
  // Step 1: Normalize User Inquiry String to Lowercase Trim
  // ==========================================
  const normalized = userInput.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  // ==========================================
  // Step 2: Search Configured Preset Input Rules for Keyword Matches
  // ==========================================
  for (const rule of PRESET_INPUT_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        // ==========================================
        // Step 3: Resolve Localized Action Response Message and Return Directive
        // ==========================================
        let resolvedMessage: string | undefined;

        if (typeof rule.action.message === "object" && rule.action.message !== null) {
          const normLocale = (locale || "en").toLowerCase();
          if (normLocale.startsWith("zh")) {
            resolvedMessage = rule.action.message.zh;
          } else if (normLocale.startsWith("ms")) {
            resolvedMessage = rule.action.message.ms;
          } else {
            resolvedMessage = rule.action.message.en;
          }
        } else if (typeof rule.action.message === "string") {
          resolvedMessage = rule.action.message;
        }

        return {
          target: rule.action.target,
          message: resolvedMessage,
          args: rule.action.args,
          isMessageOnly: false,
        };
      }
    }
  }

  return null;
}
