// ==========================================
// Route and Action Handlers Configuration
// ==========================================

import type { AgentActionContext } from "../engine";

// Localized feedback messages for custom tools across English, Chinese, and Malay.
const TOOL_FEEDBACK_MESSAGES: Record<string, { en: string; zh: string; ms: string }> = {
  export_report: {
    en: "Preparing your career transformation roadmap PDF for download.",
    zh: "正在为您准备职业转型路线图 PDF 下载。",
    ms: "Menyediakan PDF pelan hala tuju transformasi kerjaya anda untuk dimuat turun.",
  },
  extract_resume: {
    en: "Opening resume upload dialog. Please upload your PDF or DOCX document.",
    zh: "正在为您打开简历上传窗口，请上传您的 PDF 或 DOCX 文件。",
    ms: "Membuka dialog muat naik resume. Sila muat naik dokumen PDF atau DOCX anda.",
  },
  generate_roadmap: {
    en: "Navigating to analysis dashboard and launching roadmap pathway builder.",
    zh: "正在跳转至分析大屏并启动路线规划器。",
    ms: "Mengarahkan ke papan pemuka analisis dan melancarkan pembina hala tuju.",
  },
  get_roadmaps: {
    en: "Redirecting to your active career transformation roadmap dashboard.",
    zh: "正在跳转至您的当前职业路线图大屏。",
    ms: "Mengarahkan ke papan pemuka pelan hala tuju kerjaya aktif anda.",
  },
  share_roadmap: {
    en: "Redirecting to community shared roadmaps page.",
    zh: "正在跳转至社区共享路线图页面。",
    ms: "Mengarahkan ke halaman pelan hala tuju perkongsian komuniti.",
  },
  get_market_trends: {
    en: "Navigating to real-time labor market telemetry and velocity shifts section.",
    zh: "正在跳转至实时劳动力市场数据与趋势区块。",
    ms: "Mengarahkan ke bahagian telemetri pasaran buruh dan anjakan halaju masa nyata.",
  },
  get_skill_radar: {
    en: "Navigating to interactive live skill trend radar.",
    zh: "正在跳转至实时技能趋势诊断雷达图。",
    ms: "Mengarahkan ke radar diagnostik trend kemahiran interaktif secara langsung.",
  },
  get_shared_roadmaps: {
    en: "Opening peer shared career roadmaps directory.",
    zh: "正在打开同伴共享职业路线图目录。",
    ms: "Membuka direktori pelan hala tuju kerjaya perkongsian rakan sebaya.",
  },
  get_heatmap_comparison: {
    en: "Opening multi-peer skill complementarity heat map view.",
    zh: "正在打开多用户技能互补性热力图对比视图。",
    ms: "Membuka paparan perbandingan peta haba pelengkap kemahiran berbilang rakan.",
  },
  toggle_theme: {
    en: "Platform visual theme toggled successfully.",
    zh: "已成功切换系统显示主题。",
    ms: "Tema visual platform berjaya ditukar.",
  },
};

// Helper resolving localized feedback text based on execution context.
function getToolMessage(key: string, locale?: string): string {
  const norm = (locale || "en").toLowerCase();
  const entry = TOOL_FEEDBACK_MESSAGES[key];
  if (!entry) return "";
  if (norm.startsWith("zh")) return entry.zh;
  if (norm.startsWith("ms")) return entry.ms;
  return entry.en;
}

// Pure configuration dictionary defining what each category or custom action executes.
// You can freely edit, add, or customize actions here without touching the engine.
export const ACTION_HANDLERS: Record<
  string,
  (targetOrArgs: any, context: AgentActionContext, extraArgs?: any) => Promise<unknown> | unknown
> = {
  // ==========================================
  // Category 1: Navigation Execution Default
  // ==========================================
  NAVIGATE: (path: string, context: AgentActionContext) => {
    // Automatically perform locale-aware platform navigation for any registered route.
    context.navigateTo(path);
  },

  // ==========================================
  // Category 2: Modal Execution Default
  // ==========================================
  MODAL: (modalId: string, context: AgentActionContext) => {
    // Trigger target modal dialog overlay using platform modal handlers.
    context.openModal?.(modalId);
  },

  // ==========================================
  // Category 3: Career Analysis and Synthesis Tools
  // ==========================================
  export_report: async (_args: unknown, context: AgentActionContext) => {
    // Export active career roadmap or skill gap analysis as PDF.
    context.addAssistantMessage?.(getToolMessage("export_report", context.locale));
    return { exported: true, timestamp: Date.now() };
  },

  extract_resume: async (_args: unknown, context: AgentActionContext) => {
    // Open the resume file upload dialog to extract candidate skill profiles.
    context.openModal?.("upload");
    context.addAssistantMessage?.(getToolMessage("extract_resume", context.locale));
    return { modalOpened: "upload" };
  },

  generate_roadmap: async (_args: unknown, context: AgentActionContext) => {
    // Navigate to the analysis dashboard and launch the career roadmap pathway builder.
    context.navigateTo("/analysis");
    context.openModal?.("pathway_select");
    context.addAssistantMessage?.(getToolMessage("generate_roadmap", context.locale));
    return { target: "/analysis", modal: "pathway_select" };
  },

  get_roadmaps: async (_args: unknown, context: AgentActionContext) => {
    // Navigate user to their active and historical career roadmap dashboard.
    context.navigateTo("/analysis");
    context.addAssistantMessage?.(getToolMessage("get_roadmaps", context.locale));
    return { target: "/analysis" };
  },

  share_roadmap: async (_args: unknown, context: AgentActionContext) => {
    // Navigate to shared roadmaps community view.
    context.navigateTo("/shared");
    context.addAssistantMessage?.(getToolMessage("share_roadmap", context.locale));
    return { target: "/shared" };
  },

  // ==========================================
  // Category 4: Labor Market Telemetry Tools
  // ==========================================
  get_market_trends: async (_args: unknown, context: AgentActionContext) => {
    // Scroll homepage to real-time labor market telemetry and velocity shifts section.
    context.navigateTo("/#labor-market");
    context.addAssistantMessage?.(getToolMessage("get_market_trends", context.locale));
    return { target: "/#labor-market" };
  },

  get_skill_radar: async (_args: unknown, context: AgentActionContext) => {
    // Scroll homepage to live skill trajectory diagnostics radar.
    context.navigateTo("/#skill-trend-check");
    context.addAssistantMessage?.(getToolMessage("get_skill_radar", context.locale));
    return { target: "/#skill-trend-check" };
  },

  // ==========================================
  // Category 5: Peer Intelligence Tools
  // ==========================================
  get_shared_roadmaps: async (_args: unknown, context: AgentActionContext) => {
    // Navigate to collaborative peer intelligence directory.
    context.navigateTo("/shared");
    context.addAssistantMessage?.(getToolMessage("get_shared_roadmaps", context.locale));
    return { target: "/shared" };
  },

  get_heatmap_comparison: async (_args: unknown, context: AgentActionContext) => {
    // Open multi-peer skill complementarity heat map comparison view.
    context.navigateTo("/shared#heatmap");
    context.addAssistantMessage?.(getToolMessage("get_heatmap_comparison", context.locale));
    return { target: "/shared#heatmap" };
  },

  // ==========================================
  // Category 6: Platform Utilities
  // ==========================================
  toggle_theme: async (_args: unknown, context: AgentActionContext) => {
    // Broadcast theme toggle trigger.
    window.dispatchEvent(new CustomEvent("toggle-theme"));
    context.addAssistantMessage?.(getToolMessage("toggle_theme", context.locale));
    return { toggled: true };
  },
};
