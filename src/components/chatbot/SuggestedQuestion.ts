// ==========================================
// Preset Question Catalogs
// ==========================================

// Preconfigured prompt suggestions categorized by supported platform language.
export const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  en: [
    "What skills are high in demand right now?",
    "How can I prepare for an AI engineer role?",
    "Analyze automation risks in tech",
    "Recommend courses for cloud computing",
  ],
  ms: [
    "Apakah kemahiran yang mendapat permintaan tinggi sekarang?",
    "Bagaimanakah saya boleh bersedia untuk peranan jurutera AI?",
    "Analisis risiko automasi dalam bidang teknologi",
    "Cadangkan kursus untuk pengkomputeran awan",
  ],
  zh: [
    "目前哪些技能需求最高？",
    "如何准备成为一名 AI 工程师？",
    "分析科技领域的自动化风险",
    "推荐云计算相关的进阶课程",
  ],
};

// ==========================================
// Suggested Questions Resolver
// ==========================================

/**
 * Suggested Questions Resolver Function
 *
 * Ingests current locale code and retrieves localized prompt suggestions for quick user dispatch.
 *
 * Workflow:
 * 1. Match active locale against registered prompt catalogs and return localized presets with fallback.
 */
export function getSuggestedQuestions(locale: string = "en"): string[] {
  // ==========================================
  // Step 1: Match Active Locale Against Registered Prompt Catalogs and Return Localized Presets
  // ==========================================
  // Resolve localized questions with default English fallback.
  return SUGGESTED_QUESTIONS[locale] || SUGGESTED_QUESTIONS.en;
}
