// Shared type contracts for persisted roadmap data.

export interface LocalizedStringMap {
  en?: string;
  ms?: string;
  zh?: string;
  [key: string]: string | undefined;
}

export interface LocalizedListMap {
  en?: string[];
  ms?: string[];
  zh?: string[];
  [key: string]: string[] | undefined;
}

export interface CourseItem {
  title: string;
  titleLocalized?: LocalizedStringMap;
  platform: string;
  url: string;
  isHrdCorpClaimable?: boolean;
  isFree?: boolean;
  durationHours?: number;
}

export interface PlanPhase {
  id: string;
  phaseIndex?: number;
  phase: string;
  weeks: string;
  durationWeeks?: number;
  estimatedHours?: number;
  badge?: string;
  badgeType?: "free" | "claimable" | "capstone" | "completed" | "superseded";
  title: string;
  titleLocalized?: LocalizedStringMap;
  desc: string;
  descriptionLocalized?: LocalizedStringMap;
  detail?: string;
  tasks: string[];
  objectivesLocalized?: LocalizedListMap;
  recommendedCourses?: CourseItem[];
  isCompleted?: boolean;
  sdgGoal?: string;
  sdgTitle?: string;
  sdgExplanation?: string;
  sdgExplanationLocalized?: LocalizedStringMap;
  verifiedArtifact?: {
    name: string;
    score: number;
    timestamp: string;
  };
}

export interface PlanData {
  id: string;
  isCurrent: boolean;
  code: string;
  date: string;
  createdAt?: string;
  targetRole: string;
  targetTitleLocalized?: LocalizedStringMap;
  roleCategory: string;
  description: string;
  descriptionLocalized?: LocalizedStringMap;
  scenario?: string;
  sdgs?: string[];
  matchScore: number;
  matchScoreBasis: string;
  matchedStrengths: string[];
  matchedStrengthsMs?: string[];
  matchedStrengthsZh?: string[];
  matchedStrengthsLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
  skillsGap: string[];
  skillsGapMs?: string[];
  skillsGapZh?: string[];
  skillsGapLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
  atRiskSkills: string[];
  atRiskSkillsMs?: string[];
  atRiskSkillsZh?: string[];
  atRiskSkillsLocalized?: { en?: string[]; ms?: string[]; zh?: string[] };
  roadmapWeeks: string;
  roadmapHours: string;
  phases: PlanPhase[];
  historyNote?: string;
  roleVelocity?: number;
  roleGrowthRatePercent?: string;
  roleTrendStatus?: "on_trend" | "stable" | "falling_behind" | string;
  roleTrendStatusLocalized?: LocalizedStringMap;
  pursueRecommendation?: LocalizedStringMap;
}

export const DEFAULT_ROLE_TREND_LABELS: Record<string, Record<string, string>> = {
  on_trend: {
    en: "On-Trend (High Growth)",
    ms: "Trend Meningkat (Pertumbuhan Tinggi)",
    zh: "强劲增长 (重点推荐)",
  },
  stable: {
    en: "Stable Core Competency",
    ms: "Stabil (Kompetensi Asas)",
    zh: "平稳基石 (需求稳健)",
  },
  falling_behind: {
    en: "Falling Behind (Automation Risk)",
    ms: "Ketinggalan (Berisiko Automasi)",
    zh: "面临淘汰 (转型预警)",
  },
};

export const DEFAULT_ROLE_PURSUE_RECOMMENDATIONS: Record<string, Record<string, string>> = {
  on_trend: {
    en: "Highly viable career path with expanding workforce demand.",
    ms: "Laluan kerjaya yang amat berdaya maju dengan permintaan pasaran yang berkembang pesat.",
    zh: "具备极高职业拓展前景，企业招聘需求加速扩张。",
  },
  stable: {
    en: "Foundational career path with consistent market absorption and low volatility.",
    ms: "Laluan kerjaya asas dengan penyerapan pasaran yang konsisten dan volatiliti rendah.",
    zh: "稳健型基础职业路径，市场需求稳定且短期自动化波动较低。",
  },
  falling_behind: {
    en: "Core tasks face automation pressure; prioritize AI-augmented tooling.",
    ms: "Tugas teras menghadapi tekanan automasi; utamakan penguasaan alatan berkuasa AI.",
    zh: "基础工作流面临自动化替代风险，建议重点补充 AI 增效工具链。",
  },
};

export function getRoleViabilityInfo(plan: PlanData, locale: string = "en") {
  const status = plan.roleTrendStatus || "stable";
  const velocity = typeof plan.roleVelocity === "number" ? plan.roleVelocity : 0.0;
  const growthPct =
    plan.roleGrowthRatePercent ||
    (velocity >= 0 ? `+${(velocity * 100).toFixed(1)}%` : `${(velocity * 100).toFixed(1)}%`);

  const statusLabels =
    plan.roleTrendStatusLocalized ||
    DEFAULT_ROLE_TREND_LABELS[status] ||
    DEFAULT_ROLE_TREND_LABELS.stable;
  const localizedStatus =
    statusLabels[locale] ||
    statusLabels.en ||
    DEFAULT_ROLE_TREND_LABELS[status]?.en ||
    "Stable Core Competency";

  const recs =
    plan.pursueRecommendation ||
    DEFAULT_ROLE_PURSUE_RECOMMENDATIONS[status] ||
    DEFAULT_ROLE_PURSUE_RECOMMENDATIONS.stable;
  const localizedRecommendation =
    recs[locale] || recs.en || DEFAULT_ROLE_PURSUE_RECOMMENDATIONS[status]?.en || "";

  const isPositive = status === "on_trend";
  const isDeclining = status === "falling_behind";

  const badgeClass = isPositive
    ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
    : isDeclining
    ? "bg-rose-500/12 text-rose-400 border-rose-500/25"
    : "bg-sky-500/12 text-sky-300 border-sky-500/25";

  const dotClass = isPositive
    ? "bg-emerald-400"
    : isDeclining
    ? "bg-rose-400"
    : "bg-sky-400";

  const textClass = isPositive
    ? "text-emerald-400"
    : isDeclining
    ? "text-rose-400"
    : "text-sky-300";

  return {
    status,
    velocity,
    growthPct,
    localizedStatus,
    localizedRecommendation,
    badgeClass,
    dotClass,
    textClass,
  };
}
