// ==========================================
// Route and Action Registry Manifest
// ==========================================

// Primary classification categories for chatbot routes and actions.
export type RouteCategory = "NAVIGATE" | "MODAL" | "TOOL";

// Multilingual text description structure supporting English, Chinese, and Malay.
export interface LocalizedDescription {
  en: string;
  zh: string;
  ms: string;
}

// Metadata item structure representing a registered entry.
export interface RouteMeta {
  path: string;
  description: string;
  category: RouteCategory;
}

// Declarative manifest listing all recognized routes, modals, and tools in three languages.
export const ROUTE_REGISTRY: Record<RouteCategory, Record<string, LocalizedDescription>> = {
  // ==========================================
  // Category 1: Navigation Routes (Pages and Anchor Sections)
  // ==========================================
  NAVIGATE: {
    // Primary Platform Pages
    "/": {
      en: "SkillVerse AI homepage with main landing showcase and overview.",
      zh: "SkillVerse AI 首页，包含主要展示与概览。",
      ms: "Laman utama SkillVerse AI dengan paparan dan gambaran keseluruhan.",
    },
    "/analysis": {
      en: "Skill gap analysis dashboard, career roadmaps, and reskilling pathways.",
      zh: "技能缺口分析大屏、职业路线图及技能重塑路径。",
      ms: "Papan pemuka analisis jurang kemahiran, pelan hala tuju kerjaya, dan laluan kemahiran semula.",
    },
    "/shared": {
      en: "Community shared roadmaps, peer benchmarking, and collective intelligence.",
      zh: "社区共享路线图、同伴对标与集体智慧。",
      ms: "Pelan hala tuju perkongsian komuniti, penandaarasan rakan sebaya, dan kecerdasan kolektif.",
    },

    // Homepage Interactive Section Anchors
    "/#skill-trend-check": {
      en: "Live interactive skill radar and trend diagnostic section on homepage.",
      zh: "首页实时交互式技能雷达与趋势诊断区块。",
      ms: "Bahagian radar kemahiran interaktif dan diagnostik trend secara langsung di laman utama.",
    },
    "/#transformation-plan": {
      en: "SDG 8 career transformation roadmap and milestone section on homepage.",
      zh: "首页 SDG 8 职业转型路线图与里程碑方案区块。",
      ms: "Pelan hala tuju transformasi kerjaya SDG 8 dan bahagian peristiwa penting di laman utama.",
    },
    "/#labor-market": {
      en: "Real-time labor market telemetry, velocity shifts, and demand statistics.",
      zh: "实时劳动力市场数据、变化趋势与需求统计。",
      ms: "Telemetri pasaran buruh masa nyata, anjakan halaju, dan statistik permintaan.",
    },

    // Shared Page Section Anchors
    "/shared#heatmap": {
      en: "Multi-peer skill complementarity heat map comparison view.",
      zh: "多用户技能互补性热力图对比视图。",
      ms: "Paparan perbandingan peta haba pelengkap kemahiran berbilang rakan.",
    },
  },

  // ==========================================
  // Category 2: Platform Modals and Dialogs
  // ==========================================
  MODAL: {
    // Authentication Dialogs
    login: {
      en: "User login and sign-in dialog overlay.",
      zh: "用户登录对话框窗口。",
      ms: "Tetingkap dialog log masuk pengguna.",
    },
    register: {
      en: "New user account registration and sign-up dialog overlay.",
      zh: "新用户注册对话框窗口。",
      ms: "Tetingkap dialog pendaftaran akaun pengguna baharu.",
    },
    forgot_password: {
      en: "Password recovery and reset dialog overlay.",
      zh: "密码找回与重置对话框窗口。",
      ms: "Tetingkap dialog pemulihan dan penetapan semula kata laluan.",
    },

    // User Profile
    profile: {
      en: "User profile settings, avatar management, and account details modal.",
      zh: "用户个人资料设置、头像管理与账户信息弹窗。",
      ms: "Tetapan profil pengguna, pengurusan avatar, dan modal butiran akaun.",
    },

    // Career Roadmap Generation Flow
    upload: {
      en: "Resume and skill document file upload modal for profile extraction.",
      zh: "简历与技能文档上传弹窗，用于画像信息提取。",
      ms: "Modal muat naik fail resume dan dokumen kemahiran untuk pengekstrakan profil.",
    },
    wizard: {
      en: "Step-by-step career profile creation wizard modal.",
      zh: "分步式职业画像创建向导弹窗。",
      ms: "Modal wizard penciptaan profil kerjaya langkah demi langkah.",
    },
    pathway_select: {
      en: "Career pathway selection modal to choose between resume upload or wizard.",
      zh: "职业路径选择弹窗，可在上传简历或向导创建间选择。",
      ms: "Modal pemilihan laluan kerjaya untuk memilih antara muat naik resume atau wizard.",
    },
    role_select: {
      en: "Target SDG occupational role selection modal after profile extraction.",
      zh: "目标 SDG 职业岗位选择弹窗。",
      ms: "Modal pemilihan peranan pekerjaan SDG sasaran selepas pengekstrakan profil.",
    },
  },

  // ==========================================
  // Category 3: Autonomous Agent Tools and Custom Actions
  // ==========================================
  TOOL: {
    // Career Analysis & Synthesis
    extract_resume: {
      en: "Extract skills, experience, and profile details from uploaded resume.",
      zh: "从上传的简历中提取技能、经历和画像信息。",
      ms: "Ekstrak kemahiran, pengalaman, dan butiran profil daripada resume yang dimuat naik.",
    },
    generate_roadmap: {
      en: "Synthesize an AI career transformation roadmap based on user profile.",
      zh: "基于用户画像智能合成 AI 职业转型路线图。",
      ms: "Sintesis pelan hala tuju transformasi kerjaya AI berdasarkan profil pengguna.",
    },
    get_roadmaps: {
      en: "Query active and archived career transformation roadmaps for the user.",
      zh: "查询用户当前及历史职业转型路线图。",
      ms: "Mendapatkan pelan hala tuju transformasi kerjaya aktif dan diarkibkan untuk pengguna.",
    },
    share_roadmap: {
      en: "Share the user's active career roadmap with the community.",
      zh: "将用户当前的职业路线图分享至社区。",
      ms: "Kongsi pelan hala tuju kerjaya aktif pengguna dengan komuniti.",
    },

    // Labor Market Telemetry
    get_market_trends: {
      en: "Fetch real-time occupational velocity metrics, emerging and declining skills.",
      zh: "获取实时职业流动速度指标、新兴与衰退技能。",
      ms: "Dapatkan metrik halaju pekerjaan masa nyata, kemahiran baru muncul dan menurun.",
    },
    get_skill_radar: {
      en: "Fetch live skill trajectory benchmarks and market demand radar data. (Parameters: { skill: string })",
      zh: "获取实时技能轨迹基准与市场需求雷达数据。（参数：{ skill: string }）",
      ms: "Dapatkan penanda aras trajektori kemahiran langsung dan data radar permintaan pasaran. (Parameter: { skill: string })",
    },

    // Peer Intelligence
    get_shared_roadmaps: {
      en: "Fetch public career roadmaps shared by peer community members.",
      zh: "获取社区同伴分享的公开职业路线图。",
      ms: "Dapatkan pelan hala tuju kerjaya awam yang dikongsi oleh ahli komuniti rakan sebaya.",
    },
    get_heatmap_comparison: {
      en: "Navigate to shared page and activate selection mode to choose peer roadmaps for skill heatmap.",
      zh: "跳转至共享页面并激活热力图选择模式，供用户勾选需要对比的同伴路线图。",
      ms: "Navigasi ke halaman perkongsian dan aktifkan mod pemilihan untuk memilih pelan hala tuju rakan sebaya.",
    },

    // System Utilities
    export_report: {
      en: "Export current skill analysis report as a PDF document.",
      zh: "将当前技能分析报告导出为 PDF 文档。",
      ms: "Eksport laporan analisis kemahiran semasa sebagai dokumen PDF.",
    },
    toggle_theme: {
      en: "Switch visual theme between Dark and Light mode. Args: {\"theme\": \"dark\" | \"light\"}",
      zh: "切换系统深色/浅色视觉主题。参数：{\"theme\": \"dark\" | \"light\"}",
      ms: "Tukar tema visual antara Mod Gelap dan Mod Cerah. Argumen: {\"theme\": \"dark\" | \"light\"}",
    },
  },
};

// ==========================================
// Registry Lookup and Helper Utilities
// ==========================================

// Helper to resolve localized description string given a target locale.
export function resolveLocalizedDescription(desc: LocalizedDescription, locale: string = "en"): string {
  const normalizedLocale = locale.toLowerCase();
  if (normalizedLocale.startsWith("zh")) {
    return desc.zh || desc.en;
  }
  if (normalizedLocale.startsWith("ms")) {
    return desc.ms || desc.en;
  }
  return desc.en;
}

// Identify the category to which a target path or action key belongs.
export function findTargetCategory(target: string): RouteCategory | undefined {
  if (!target) return undefined;
  const clean = target.replace(/^(tool:|modal:|\/+)/, "").trim();
  if (target in ROUTE_REGISTRY.TOOL || clean in ROUTE_REGISTRY.TOOL || target.startsWith("tool:")) {
    return "TOOL";
  }
  if (target in ROUTE_REGISTRY.MODAL || clean in ROUTE_REGISTRY.MODAL || target.startsWith("modal:")) {
    return "MODAL";
  }
  if (target in ROUTE_REGISTRY.NAVIGATE || ("/" + clean) in ROUTE_REGISTRY.NAVIGATE || target.startsWith("/")) {
    return "NAVIGATE";
  }
  return undefined;
}

// Retrieve flattened array of all registered routes, modals, and tools.
export function getAllRegisteredEntries(locale: string = "en"): RouteMeta[] {
  const entries: RouteMeta[] = [];

  for (const [categoryKey, dict] of Object.entries(ROUTE_REGISTRY)) {
    const category = categoryKey as RouteCategory;
    for (const [path, localizedDesc] of Object.entries(dict)) {
      entries.push({
        path,
        description: resolveLocalizedDescription(localizedDesc, locale),
        category,
      });
    }
  }

  return entries;
}

/**
 * Registry Catalog Text Generator
 *
 * Automatically compiles categorized listings of all registered routes, modals, and tools.
 *
 * Workflow:
 * 1. Iterate through registered category manifests in ROUTE_REGISTRY.
 * 2. Format individual path entries with localized descriptions for target locale.
 * 3. Return compiled markdown catalog text string.
 */
export function generateRegistryCatalogText(locale: string = "en"): string {
  // ==========================================
  // Step 1: Iterate Through Registered Category Manifests in ROUTE_REGISTRY
  // ==========================================
  let catalog = "";

  for (const [category, dict] of Object.entries(ROUTE_REGISTRY)) {
    catalog += `[${category}]:\n`;

    // ==========================================
    // Step 2: Format Individual Path Entries with Localized Descriptions for Target Locale
    // ==========================================
    for (const [path, localizedDesc] of Object.entries(dict)) {
      const desc = resolveLocalizedDescription(localizedDesc, locale);
      catalog += `- "${path}": ${desc}\n`;
    }
    catalog += "\n";
  }

  // ==========================================
  // Step 3: Return Compiled Markdown Catalog Text String
  // ==========================================
  return catalog.trim();
}

// Re-export customizable header compilation utilities from setup.ts.
export { compileAgentSystemInstruction, generateAgentInstructionPrompt } from "./setup";
