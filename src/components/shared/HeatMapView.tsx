"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import simpleheat from "simpleheat";
import type { SharedRoadmapItem } from "@/components/shared/SharedPlansView";
import { getAvatarInitials } from "@/lib/avatar";
import { useTheme, type Theme } from "@/context/ThemeContext";
import { exportHeatmapToPdf } from "@/lib/pdf/heatmapPdfExporter";

// --- Type Definitions ---

export interface SkillEvaluationItem {
  skillName: string;
  skillNameLocalized?: Record<string, string>;
  status: "mastered" | "gap" | "critical_deficit" | string;
  score: number;
  matchedUserSkill?: string;
  matchType?: string;
  proficiency?: string;
  statusLabel?: string;
}

export interface TeamMemberAnalysis {
  userId: string;
  name: string;
  email?: string;
  currentRole?: string;
  department?: string;
  overallMatchScore: number;
  matchPercentage: number;
  rank: number;
  readinessLevel: string;
  readinessLevelLocalized?: Record<string, string>;
  skillsStatus: Record<string, SkillEvaluationItem>;
  masteredCount: number;
  gapCount: number;
  criticalDeficitCount: number;
}

export interface TeamSkillMatrixResponse {
  targetRoleId: string;
  targetRoleTitle: string;
  targetRoleTitleLocalized?: Record<string, string>;
  industry: string;
  industryLocalized?: Record<string, string>;
  requiredSkills: string[];
  requiredSkillsLocalized?: Record<string, string[]>;
  candidates: TeamMemberAnalysis[];
  analyzedAt: string;
}

interface HeatMapViewProps {
  onBack: () => void;
  selectedUserIds?: string[];
  selectedMembers?: SharedRoadmapItem[];
}

interface RoleOption {
  key: string;
  targetRole: string;
  targetTitleLocalized?: {
    en?: string;
    ms?: string;
    zh?: string;
  };
  displayTitle: string;
  secondaryTitle?: string;
  memberCount: number;
  memberNames: string[];
}

// Fallback dictionary for common role titles to guarantee trilingual support across all environments.
const COMMON_ROLE_TRANSLATIONS: Record<string, { en: string; ms: string; zh: string }> = {
  "prompt engineer": {
    en: "Prompt Engineer",
    ms: "Jurutera Prompt",
    zh: "提示词工程师",
  },
  "cloud architect": {
    en: "Cloud Architect",
    ms: "Arkitek Awan",
    zh: "云架构师",
  },
  "ai specialist": {
    en: "AI Specialist",
    ms: "Pakar AI",
    zh: "人工智能专家",
  },
  "ai engineer": {
    en: "AI Engineer",
    ms: "Jurutera AI",
    zh: "人工智能工程师",
  },
  "data scientist": {
    en: "Data Scientist",
    ms: "Saintis Data",
    zh: "数据科学家",
  },
  "data engineer": {
    en: "Data Engineer",
    ms: "Jurutera Data",
    zh: "数据工程师",
  },
  "machine learning engineer": {
    en: "Machine Learning Engineer",
    ms: "Jurutera Pembelajaran Mesin",
    zh: "机器学习工程师",
  },
  "devops engineer": {
    en: "DevOps Engineer",
    ms: "Jurutera DevOps",
    zh: "DevOps 运维工程师",
  },
  "cybersecurity specialist": {
    en: "Cybersecurity Specialist",
    ms: "Pakar Keselamatan Siber",
    zh: "网络安全专家",
  },
  "cybersecurity analyst": {
    en: "Cybersecurity Analyst",
    ms: "Penganalisis Keselamatan Siber",
    zh: "网络安全分析师",
  },
  "full stack developer": {
    en: "Full Stack Developer",
    ms: "Pembangun Tindanan Penuh",
    zh: "全栈开发人员",
  },
  "software engineer": {
    en: "Software Engineer",
    ms: "Jurutera Perisian",
    zh: "软件工程师",
  },
  "digital skills specialist": {
    en: "Digital Skills Specialist",
    ms: "Pakar Kemahiran Digital",
    zh: "数字技能专家",
  },
};

// Resolve localized role title strictly supporting English, Malay, and Chinese.
function getRoleTitleForLocale(
  targetRole: string,
  targetTitleLocalized: { en?: string; ms?: string; zh?: string; [key: string]: string | undefined } | undefined,
  locale: string
): string {
  if (targetTitleLocalized) {
    if (locale === "zh" && targetTitleLocalized.zh?.trim()) return targetTitleLocalized.zh.trim();
    if (locale === "ms" && targetTitleLocalized.ms?.trim()) return targetTitleLocalized.ms.trim();
    if (locale === "en" && targetTitleLocalized.en?.trim()) return targetTitleLocalized.en.trim();
    const locVal = targetTitleLocalized[locale];
    if (locVal?.trim()) return locVal.trim();
  }

  const normalized = targetRole.trim().toLowerCase();
  if (COMMON_ROLE_TRANSLATIONS[normalized]) {
    const entry = COMMON_ROLE_TRANSLATIONS[normalized];
    if (locale === "zh" && entry.zh) return entry.zh;
    if (locale === "ms" && entry.ms) return entry.ms;
    if (locale === "en" && entry.en) return entry.en;
  }

  return targetRole || "";
}

// --- HeatMap Matrix View Component ---
// Render interactive workforce competency heatmap with real-time continuous simpleheat blending.
export default function HeatMapView({
  onBack,
  selectedUserIds = [],
  selectedMembers = [],
}: HeatMapViewProps) {
  const t = useTranslations("shared");
  const locale = useLocale();
  const { theme } = useTheme();

  const [roleInput, setRoleInput] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matrixData, setMatrixData] = useState<TeamSkillMatrixResponse | null>(null);
  const [isScrolledX, setIsScrolledX] = useState<boolean>(false);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollContainerWidth, setScrollContainerWidth] = useState<number>(0);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Dropdown states for role selection
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Extract and deduplicate unique roles from current plans of selected members with trilingual support.
  const availableRoles = React.useMemo<RoleOption[]>(() => {
    if (!selectedMembers || selectedMembers.length === 0) return [];

    const roleMap = new Map<
      string,
      {
        targetRole: string;
        targetTitleLocalized?: { en?: string; ms?: string; zh?: string; [key: string]: string | undefined };
        memberNames: string[];
      }
    >();

    for (const member of selectedMembers) {
      // Prioritize current plan targetRole, fallback to owner role
      const rawRole =
        member.currentPlan?.targetRole ||
        member.owner?.role ||
        "";

      if (!rawRole || !rawRole.trim()) continue;

      const trimmedRole = rawRole.trim();
      const canonicalKey = trimmedRole.toLowerCase();

      const memberName =
        member.owner?.name || member.owner?.email?.split("@")[0] || "User";

      const locMap = member.currentPlan?.targetTitleLocalized;

      if (!roleMap.has(canonicalKey)) {
        roleMap.set(canonicalKey, {
          targetRole: trimmedRole,
          targetTitleLocalized: locMap,
          memberNames: [memberName],
        });
      } else {
        const existing = roleMap.get(canonicalKey)!;
        if (!existing.memberNames.includes(memberName)) {
          existing.memberNames.push(memberName);
        }
        if (locMap) {
          existing.targetTitleLocalized = {
            ...existing.targetTitleLocalized,
            ...locMap,
          };
        }
      }
    }

    const options: RoleOption[] = [];

    roleMap.forEach((val, key) => {
      const displayTitle = getRoleTitleForLocale(
        val.targetRole,
        val.targetTitleLocalized,
        locale
      );

      let secondaryTitle: string | undefined;
      const enTitle = val.targetTitleLocalized?.en || val.targetRole;
      if (locale !== "en" && enTitle && enTitle.toLowerCase() !== displayTitle.toLowerCase()) {
        secondaryTitle = enTitle;
      }

      options.push({
        key,
        targetRole: val.targetRole,
        targetTitleLocalized: val.targetTitleLocalized,
        displayTitle,
        secondaryTitle,
        memberCount: val.memberNames.length,
        memberNames: val.memberNames,
      });
    });

    return options.sort((a, b) => {
      if (b.memberCount !== a.memberCount) {
        return b.memberCount - a.memberCount;
      }
      return a.displayTitle.localeCompare(b.displayTitle);
    });
  }, [selectedMembers, locale]);

  // Dynamically update input text when locale switches if a suggested role was chosen.
  useEffect(() => {
    if (selectedRoleKey) {
      const match = availableRoles.find((r) => r.key === selectedRoleKey);
      if (match) {
        setRoleInput(match.displayTitle);
      }
    }
  }, [locale, selectedRoleKey, availableRoles]);

  // Dismiss dropdown on outside clicks.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Compute filtered role suggestions based on user input.
  const filteredRoles = React.useMemo(() => {
    if (!roleInput.trim()) return availableRoles;
    const query = roleInput.trim().toLowerCase();
    return availableRoles.filter(
      (r) =>
        r.displayTitle.toLowerCase().includes(query) ||
        r.secondaryTitle?.toLowerCase().includes(query) ||
        r.targetRole.toLowerCase().includes(query)
    );
  }, [availableRoles, roleInput]);

  const handleSelectRole = (role: RoleOption) => {
    setRoleInput(role.displayTitle);
    setSelectedRoleKey(role.key);
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    setRoleInput(value);
    const exact = availableRoles.find(
      (r) => r.displayTitle.toLowerCase() === value.trim().toLowerCase()
    );
    setSelectedRoleKey(exact ? exact.key : null);
    if (availableRoles.length > 0 && !isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  // Measure visible width of right scroll container to dynamically expand skill columns.
  useEffect(() => {
    const el = rightScrollRef.current;
    if (!el) return;

    const updateWidth = () => {
      setScrollContainerWidth(el.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Effective list of user IDs to benchmark.
  const effectiveUserIds =
    selectedMembers.length > 0
      ? selectedMembers.map((m) => m.owner.id)
      : selectedUserIds;

  // Handle benchmark execution by calling the shared heatmap API endpoint.
  const handleStartAnalysis = async () => {
    if (!roleInput.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/shared/heatmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoleTitle: roleInput.trim(),
          userIds: effectiveUserIds,
          locale,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || t("heatmap.error_fallback"));
      }

      setMatrixData(json.data);
    } catch (err: any) {
      console.error("[HeatMapView] Analysis failed:", err);
      setErrorMsg(err.message || t("heatmap.error_fallback"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- PDF Export Handler ---
  // Format team benchmark telemetry data programmatically and trigger executive PDF download.
  const handleExportPdf = async () => {
    if (!matrixData || isExportingPdf) return;

    setIsExportingPdf(true);
    try {
      const candidatesList =
        sortedMembers.length > 0
          ? (sortedMembers
              .map((m) => candidateMap.get(m.owner.id))
              .filter(Boolean) as TeamMemberAnalysis[])
          : (sortedUserIds
              .map((uid) => candidateMap.get(uid))
              .filter(Boolean) as TeamMemberAnalysis[]);

      const rawRole =
        matrixData.targetRoleTitleLocalized?.[locale] ||
        matrixData.targetRoleTitle ||
        "Benchmark";
      const sanitizedRole = rawRole
        .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_")
        .slice(0, 40);
      const dateTag = new Date().toISOString().split("T")[0];
      const filename = `SkillVerse_HeatMap_${sanitizedRole}_${dateTag}.pdf`;

      await exportHeatmapToPdf({
        matrixData,
        candidates: candidatesList,
        competencies,
        locale,
        filename,
        labels: {
          reportTitle: t("heatmap.report_title"),
          targetBenchmark: t("heatmap.target_benchmark"),
          industry: t("heatmap.industry"),
          generatedAt: t("heatmap.generated_at"),
          teamAverageScore: t("heatmap.team_average_score"),
          totalCandidates: t("heatmap.total_candidates"),
          totalCompetencies: t("heatmap.total_competencies"),
          rank: t("heatmap.rank"),
          usersColumn: t("heatmap.users_column"),
          overallScore: t("heatmap.overall_score"),
          mastered: t("heatmap.mastered"),
          bridgeableGap: t("heatmap.bridgeable_gap"),
          criticalDeficit: t("heatmap.critical_deficit"),
          legendTitle: t("heatmap.legend_title"),
          topCandidateLabel:
            locale === "zh"
              ? "头号匹配候选人"
              : locale === "ms"
              ? "Calon Kedudukan Teratas"
              : "Top Ranked Candidate",
          confidentialNotice:
            locale === "zh"
              ? "SkillVerse AI 劳动力智能平台 • 绝密行政评估报告"
              : locale === "ms"
              ? "Platform Kecerdasan Tenaga Kerja SkillVerse AI • Laporan Eksekutif Sulit"
              : "SkillVerse AI Workforce Intelligence Platform • Confidential Executive Report",
        },
      });
    } catch (err) {
      console.error("[HeatMapView] PDF export failed:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Resolved list of competencies for table columns.
  const competencies: { name: string; localizedName: string }[] = React.useMemo(() => {
    if (!matrixData || !matrixData.requiredSkills || matrixData.requiredSkills.length === 0) {
      return [1, 2, 3, 4, 5].map((idx) => ({
        name: `Competency ${idx}`,
        localizedName: `${t("heatmap.competency")} ${idx}`,
      }));
    }

    const localizedList = matrixData.requiredSkillsLocalized?.[locale] || [];
    const enList = matrixData.requiredSkillsLocalized?.["en"] || [];

    return matrixData.requiredSkills.map((skillName, index) => {
      // Find the best localized display text.
      const localizedName = localizedList[index] || skillName;
      // Determine the canonical key used in backend skillsStatus mapping.
      const canonicalKey = enList[index] || skillName;

      return {
        name: canonicalKey,
        localizedName,
      };
    });
  }, [matrixData, locale, t]);

  // Calculate dynamic skill column width with a minimum constraint.
  const { skillColWidth, totalTableWidth } = React.useMemo(() => {
    const minColWidth = 130;
    const numCols = competencies.length || 1;
    const minTotalWidth = numCols * minColWidth;

    if (scrollContainerWidth > minTotalWidth) {
      // Expand each column equally when excess space is available on the right.
      const expandedColWidth = scrollContainerWidth / numCols;
      return {
        skillColWidth: expandedColWidth,
        totalTableWidth: scrollContainerWidth,
      };
    }

    return {
      skillColWidth: minColWidth,
      totalTableWidth: minTotalWidth,
    };
  }, [competencies.length, scrollContainerWidth]);

  // Map candidate evaluations by user ID for rapid lookup.
  const candidateMap = React.useMemo(() => {
    const map = new Map<string, TeamMemberAnalysis>();
    if (matrixData?.candidates) {
      matrixData.candidates.forEach((c) => {
        map.set(c.userId, c);
      });
    }
    return map;
  }, [matrixData]);

  // Sort members in descending order of overall match score, strictly respecting candidate rank on ties.
  const sortedMembers = React.useMemo(() => {
    if (!matrixData?.candidates || matrixData.candidates.length === 0) {
      return selectedMembers;
    }
    return [...selectedMembers].sort((a, b) => {
      const candA = candidateMap.get(a.owner.id);
      const candB = candidateMap.get(b.owner.id);
      const rankA = candA?.rank ?? 9999;
      const rankB = candB?.rank ?? 9999;
      if (rankA !== rankB) return rankA - rankB;

      const scoreA = candA?.matchPercentage ?? -1;
      const scoreB = candB?.matchPercentage ?? -1;
      return scoreB - scoreA;
    });
  }, [selectedMembers, matrixData, candidateMap]);

  // Sort fallback user IDs in descending order of overall match score, strictly respecting candidate rank on ties.
  const sortedUserIds = React.useMemo(() => {
    if (!matrixData?.candidates || matrixData.candidates.length === 0) {
      return selectedUserIds;
    }
    return [...selectedUserIds].sort((a, b) => {
      const candA = candidateMap.get(a);
      const candB = candidateMap.get(b);
      const rankA = candA?.rank ?? 9999;
      const rankB = candB?.rank ?? 9999;
      if (rankA !== rankB) return rankA - rankB;

      const scoreA = candA?.matchPercentage ?? -1;
      const scoreB = candB?.matchPercentage ?? -1;
      return scoreB - scoreA;
    });
  }, [selectedUserIds, matrixData, candidateMap]);

  // --- UI ---
  return (
    <div className="w-full flex-1 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Back Navigation Button */}
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 sm:p-3 rounded-xl border border-border-subtle bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-accent hover:border-accent transition-all duration-200 cursor-pointer shadow-sm shrink-0 flex items-center justify-center group"
            aria-label={t("back_to_shared_list") || "Back"}
            title={t("back_to_shared_list") || "Back"}
          >
            <svg
              className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          {/* Title & Subtitle (Trilingual) */}
          <div className="min-w-0 flex-1">
            <h1 className="wrap-break-word text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {t("heatmap.title") || "HeatMap"}
            </h1>
            <p className="wrap-break-word text-xs sm:text-sm text-text-secondary mt-1">
              {t("heatmap.subtitle") || t("subtitle")}
            </p>
          </div>
        </div>

        {/* Top Header Right Action: Export Report as PDF */}
        {matrixData && (
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            title={t("heatmap.export_tooltip")}
            aria-label={t("heatmap.export_pdf")}
            className="h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-xl border border-border-subtle bg-bg-card hover:bg-bg-card-hover text-text-primary hover:text-accent hover:border-accent/40 font-mono text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 group"
          >
            {isExportingPdf ? (
              <svg className="w-4 h-4 animate-spin text-accent shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-accent group-hover:scale-110 transition-transform shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span className="hidden md:inline whitespace-nowrap">
              {isExportingPdf ? t("heatmap.exporting_pdf") : t("heatmap.export_pdf")}
            </span>
          </button>
        )}
      </div>

      {/* Role Input Bar with Dropdown and Analysis Trigger */}
      <div className="mb-6 flex w-full items-center gap-2.5 sm:gap-3">
        <div ref={dropdownRef} className="relative min-w-0 flex-1">
          <div className="relative flex items-center">
            {/* Input Left Icon */}
            <div className="absolute left-3.5 text-text-muted pointer-events-none flex items-center">
              <svg className="w-4 h-4 text-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={roleInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (availableRoles.length > 0) setIsDropdownOpen(true);
              }}
              onClick={() => {
                if (availableRoles.length > 0) setIsDropdownOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsDropdownOpen(false);
                  handleStartAnalysis();
                } else if (e.key === "Escape") {
                  setIsDropdownOpen(false);
                } else if (e.key === "ArrowDown" && !isDropdownOpen && availableRoles.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              disabled={isAnalyzing}
              placeholder={t("heatmap.input_placeholder")}
              className="h-11 w-full bg-bg-card border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl pl-10 pr-20 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-mono disabled:opacity-50"
              aria-label={t("heatmap.input_placeholder")}
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
              role="combobox"
            />

            {/* Right-side Controls: Clear Button + Vertical Divider + Dropdown Chevron */}
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {roleInput && !isAnalyzing && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleInput("");
                    setSelectedRoleKey(null);
                    inputRef.current?.focus();
                    if (availableRoles.length > 0) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-bg-card-hover transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                  title={t("heatmap.clear")}
                  aria-label={t("heatmap.clear")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {roleInput && !isAnalyzing && availableRoles.length > 0 && (
                <div className="h-4 w-px bg-border-subtle/80" />
              )}

              {availableRoles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  disabled={isAnalyzing}
                  className={`p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-card-hover transition-all border-none bg-transparent cursor-pointer flex items-center justify-center ${
                    isDropdownOpen ? "text-accent rotate-180" : ""
                  }`}
                  title={t("heatmap.toggle_roles_dropdown")}
                  aria-label={t("heatmap.toggle_roles_dropdown")}
                  aria-expanded={isDropdownOpen}
                >
                  <svg className="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Role Suggestions Dropdown Menu */}
          {isDropdownOpen && availableRoles.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-border-subtle bg-bg-card/95 backdrop-blur-md shadow-xl overflow-hidden animate-fade-in-up"
              role="listbox"
            >
              {/* Roles List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-border-subtle/40">
                {filteredRoles.length > 0 ? (
                  filteredRoles.map((role) => {
                    const isSelected =
                      selectedRoleKey === role.key ||
                      roleInput.trim().toLowerCase() === role.displayTitle.toLowerCase() ||
                      roleInput.trim().toLowerCase() === role.targetRole.toLowerCase();

                    return (
                      <button
                        key={role.key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectRole(role)}
                        className={`w-full px-3.5 py-2.5 text-left transition-all flex items-center justify-between gap-3 cursor-pointer border-none ${
                          isSelected
                            ? "bg-accent/15 text-accent font-medium"
                            : "bg-transparent hover:bg-bg-card-hover text-text-primary"
                        }`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm truncate">
                            {role.displayTitle}
                          </span>
                          {role.secondaryTitle && (
                            <span className="text-[11px] font-mono text-text-muted truncate hidden sm:inline">
                              ({role.secondaryTitle})
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <svg className="w-4 h-4 text-accent shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div>
                    <div className="p-3 text-center text-xs font-mono text-text-muted">
                      {t("heatmap.dropdown_empty")}
                    </div>
                    {/* Fallback to show all roles */}
                    <div className="px-3.5 py-1.5 bg-bg-primary/40 border-t border-b border-border-subtle/50 text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      {t("heatmap.dropdown_all_roles")}
                    </div>
                    {availableRoles.map((role) => {
                      const isSelected =
                        selectedRoleKey === role.key ||
                        roleInput.trim().toLowerCase() === role.displayTitle.toLowerCase() ||
                        roleInput.trim().toLowerCase() === role.targetRole.toLowerCase();

                      return (
                        <button
                          key={role.key}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectRole(role)}
                          className={`w-full px-3.5 py-2.5 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer border-none ${
                            isSelected
                              ? "bg-accent/15 text-accent font-medium"
                              : "bg-transparent hover:bg-bg-card-hover text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="font-semibold text-xs truncate">
                              {role.displayTitle}
                            </span>
                            {role.secondaryTitle && (
                              <span className="text-[11px] font-mono text-text-muted truncate hidden sm:inline">
                                ({role.secondaryTitle})
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-accent shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dropdown Footer Tip */}
              <div className="px-3.5 py-2 border-t border-border-subtle/60 bg-bg-primary/40 text-[10px] sm:text-[11px] text-text-muted font-mono flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">{t("heatmap.dropdown_custom_tip")}</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setIsDropdownOpen(false);
            handleStartAnalysis();
          }}
          disabled={!roleInput.trim() || isAnalyzing}
          className="h-11 px-5 rounded-xl font-mono text-xs sm:text-sm font-semibold bg-accent text-bg-primary hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-2"
        >
          {isAnalyzing && (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span>{isAnalyzing ? t("heatmap.analyzing") : t("heatmap.start")}</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-negative/10 border border-negative/30 text-negative text-xs font-mono flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={handleStartAnalysis}
            className="text-xs underline hover:text-text-primary cursor-pointer border-none bg-transparent font-semibold"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* Target Benchmark Overview Banner */}
      {matrixData && (
        <div className="mb-6 relative overflow-hidden rounded-2xl p-4 sm:p-5 animate-fade-in-up">
          {/* Subtle Ambient Corner Light Bloom */}
          <div className="absolute -top-12 -right-12 w-36 h-36 pointer-events-none" />

          <div className="relative flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            {/* Target Role Title */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase text-accent">
                  {t("heatmap.target_benchmark") || "Target Benchmark"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary wrap-break-word mt-1 tracking-tight">
                {matrixData.targetRoleTitleLocalized?.[locale] || matrixData.targetRoleTitle}
              </h2>
            </div>

            {/* Target Industry Sector Badge */}
            <div
              title={`${t("heatmap.industry")}: ${matrixData.industryLocalized?.[locale] || matrixData.industry}`}
              className="max-w-full flex items-center gap-1.5 sm:gap-2.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-linear-to-r from-accent/15 via-accent/10 to-transparent border border-accent/30 shadow-xs backdrop-blur-sm self-start sm:self-auto sm:ml-auto transition-all"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono min-w-0">
                <span className="text-text-muted shrink-0">{t("heatmap.industry")}:</span>
                <span className="font-bold text-accent tracking-wide truncate max-w-45 sm:max-w-85 md:max-w-none">
                  {matrixData.industryLocalized?.[locale] || matrixData.industry}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Scroll Hint */}
      {competencies.length > 5 && (
        <div className="mb-3 flex items-center justify-end text-xs font-mono">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <span>{t("heatmap.scroll_hint")}</span>
          </span>
        </div>
      )}

      {/* HeatMap Data Matrix */}
      <div className="w-full flex rounded-2xl border border-border-subtle/80 overflow-hidden bg-bg-card/40 shadow-xs">
        {/* Left Pinned Member Identity Column */}
        <div
          className={`shrink-0 z-20 border-r border-border-subtle/80 bg-bg-primary transition-all duration-300 overflow-hidden ${
            isScrolledX
              ? "w-14 min-w-14 max-w-14 sm:w-88 sm:min-w-88 sm:max-w-88"
              : "w-88 min-w-88 max-w-88"
          }`}
        >
          <table className="w-full border-separate border-spacing-0 table-fixed">
            <thead>
              <tr className="text-left text-xs font-mono text-text-muted h-16">
                <th
                  className={`py-3 font-semibold text-text-secondary border-b border-border-subtle/70 align-middle transition-all duration-300 ${
                    isScrolledX
                      ? "w-14 min-w-14 px-1 text-center sm:w-64 sm:min-w-64 sm:px-3 sm:text-left"
                      : "w-64 min-w-64 px-3"
                  }`}
                >
                  <span className={`${isScrolledX ? "hidden sm:inline" : "inline"}`}>
                    {t("heatmap.users_column")} ({sortedMembers.length || sortedUserIds.length})
                  </span>
                  <span className={`${isScrolledX ? "inline sm:hidden text-[10px]" : "hidden"}`}>
                    #
                  </span>
                </th>
                <th
                  className={`w-24 min-w-24 max-w-24 px-2 py-3 text-center font-semibold text-text-secondary border-b border-border-subtle/70 align-middle transition-opacity duration-300 ${
                    isScrolledX ? "hidden sm:table-cell" : "table-cell"
                  }`}
                  title={t("heatmap.overall_score")}
                  aria-label={t("heatmap.overall_score")}
                >
                  <div className="flex items-center justify-center gap-1 font-mono text-text-primary">
                    <span className="text-base font-bold text-accent">Σ</span>
                    <span className="text-[11px] font-semibold text-text-muted hidden md:inline">%</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {sortedMembers.length > 0 ? (
                sortedMembers.map((member, rowIdx) => {
                  const displayName =
                    member.owner.name || member.owner.email.split("@")[0] || "User";
                  const initial = getAvatarInitials(member.owner.name || member.owner.email);

                  const candidate = candidateMap.get(member.owner.id);
                  const overallPct = candidate ? Math.round(candidate.matchPercentage) : null;
                  const rank = candidate?.rank ?? (rowIdx + 1);

                  return (
                    <tr key={member.id} className="group h-14 border-b border-border-subtle/40">
                      {/* User Identity Column */}
                      <td
                        className={`p-2.5 bg-bg-card/90 group-hover:bg-bg-card-hover transition-all duration-300 ${
                          isScrolledX
                            ? "w-14 min-w-14 px-1 sm:w-64 sm:min-w-64 sm:px-3"
                            : "w-64 min-w-64 pl-3"
                        }`}
                      >
                        <div className={`flex items-center ${isScrolledX ? "justify-center sm:justify-start gap-2.5" : "gap-2.5"}`}>
                          <div
                            className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary shadow-xs shrink-0"
                            title={`${displayName} (${member.owner.email})`}
                          >
                            {initial}
                          </div>
                          <div className={`min-w-0 flex-1 transition-opacity duration-200 ${isScrolledX ? "hidden sm:block" : "block"}`}>
                            <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate leading-tight">
                              {displayName}
                            </h4>
                            <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">
                              {member.owner.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Overall Percentage Score */}
                      <td
                        className={`w-24 min-w-24 max-w-24 p-2 bg-bg-card/90 text-center border-l border-border-subtle/40 group-hover:bg-bg-card-hover transition-all duration-300 ${
                          isScrolledX ? "hidden sm:table-cell" : "table-cell"
                        }`}
                      >
                        {overallPct !== null ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className={`text-xs font-mono font-black ${
                              overallPct >= 70
                                ? theme === "light" ? "text-emerald-900" : "text-emerald-300"
                                : overallPct >= 40
                                ? theme === "light" ? "text-amber-950" : "text-amber-300"
                                : theme === "light" ? "text-rose-900" : "text-rose-300"
                            }`}>
                              {overallPct}%
                            </span>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-sm mt-0.5 font-black uppercase tracking-wider ${
                                rank === 1
                                  ? "bg-amber-500 text-zinc-950 border border-amber-600 shadow-sm"
                                  : rank === 2
                                  ? "bg-slate-800 text-white border border-slate-900 shadow-sm"
                                  : rank === 3
                                  ? "bg-amber-900 text-amber-100 border border-amber-950 shadow-sm"
                                  : "text-text-muted font-bold"
                              }`}
                            >
                              Rank #{rank}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-text-muted select-none">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                sortedUserIds.map((uid, rowIdx) => {
                  const candidate = candidateMap.get(uid);
                  const overallPct = candidate ? Math.round(candidate.matchPercentage) : null;
                  const rank = candidate?.rank ?? (rowIdx + 1);

                  return (
                    <tr key={uid} className="group h-14 border-b border-border-subtle/40">
                      <td
                        className={`p-2.5 bg-bg-card/90 group-hover:bg-bg-card-hover transition-all duration-300 ${
                          isScrolledX
                            ? "w-14 min-w-14 px-1 sm:w-64 sm:min-w-64 sm:px-3"
                            : "w-64 min-w-64 pl-3"
                        }`}
                      >
                        <div className={`flex items-center ${isScrolledX ? "justify-center sm:justify-start gap-2.5" : "gap-2.5"}`}>
                          <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary shadow-xs shrink-0">
                            {getAvatarInitials(candidate?.name || candidate?.email || uid)}
                          </div>
                          <div className={`min-w-0 flex-1 transition-opacity duration-200 ${isScrolledX ? "hidden sm:block" : "block"}`}>
                            <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                              User {uid.slice(0, 8)}
                            </h4>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`w-24 min-w-24 max-w-24 p-2 bg-bg-card/90 text-center border-l border-border-subtle/40 group-hover:bg-bg-card-hover transition-all duration-300 ${
                          isScrolledX ? "hidden sm:table-cell" : "table-cell"
                        }`}
                      >
                        {overallPct !== null ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className={`text-xs font-mono font-black ${
                              overallPct >= 70
                                ? theme === "light" ? "text-emerald-900" : "text-emerald-300"
                                : overallPct >= 40
                                ? theme === "light" ? "text-amber-950" : "text-amber-300"
                                : theme === "light" ? "text-rose-900" : "text-rose-300"
                            }`}>
                              {overallPct}%
                            </span>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded-sm mt-0.5 font-black uppercase tracking-wider ${
                                rank === 1
                                  ? "bg-amber-500 text-zinc-950 border border-amber-600 shadow-sm"
                                  : rank === 2
                                  ? "bg-slate-800 text-white border border-slate-900 shadow-sm"
                                  : rank === 3
                                  ? "bg-amber-900 text-amber-100 border border-amber-950 shadow-sm"
                                  : "text-text-muted font-bold"
                              }`}
                            >
                              Rank #{rank}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-text-muted select-none">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Right Horizontally Scrollable Competency Grid */}
        <div
          ref={rightScrollRef}
          onScroll={(e) => {
            const isScrolled = e.currentTarget.scrollLeft > 10;
            if (isScrolled !== isScrolledX) {
              setIsScrolledX(isScrolled);
            }
          }}
          className="flex-1 min-w-0 overflow-x-auto scrollbar-thin scrollbar-thumb-border-subtle scrollbar-track-transparent"
        >
          <div className="relative pb-1" style={{ width: `${totalTableWidth}px`, minWidth: "100%" }}>
            <table className="border-separate border-spacing-0 table-fixed" style={{ width: `${totalTableWidth}px` }}>
              <thead>
                <tr className="text-left text-xs font-mono text-text-muted h-16">
                  {competencies.map((comp, idx) => (
                    <th
                      key={idx}
                      style={{ width: `${skillColWidth}px`, minWidth: `${skillColWidth}px`, maxWidth: `${skillColWidth}px` }}
                      className="py-2 px-1.5 text-center font-semibold align-middle border-b border-border-subtle/70"
                      title={comp.localizedName}
                    >
                      <span className="block text-[11px] sm:text-xs text-text-primary px-1 leading-snug wrap-break-word whitespace-normal line-clamp-2">
                        {comp.localizedName}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y-0">
                {sortedMembers.length > 0 ? (
                  sortedMembers.map((member) => {
                    const candidate = candidateMap.get(member.owner.id);

                    return (
                      <tr key={member.id} className="h-14 border-b border-border-subtle/40">
                        {competencies.map((comp, colIdx) => {
                          const skillEval =
                            candidate?.skillsStatus?.[comp.name] ||
                            candidate?.skillsStatus?.[comp.localizedName];

                          return (
                            <td
                              key={colIdx}
                              style={{ width: `${skillColWidth}px`, minWidth: `${skillColWidth}px`, maxWidth: `${skillColWidth}px` }}
                              className="p-0 border-0"
                            >
                              {skillEval ? (
                                <TileContent skillEval={skillEval} t={t} theme={theme} />
                              ) : (
                                <div className="h-14 w-full flex items-center justify-center">
                                  <span className="text-[10px] font-mono text-text-muted/50 select-none">
                                    -
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  sortedUserIds.map((uid) => {
                    const candidate = candidateMap.get(uid);

                    return (
                      <tr key={uid} className="h-14 border-b border-border-subtle/40">
                        {competencies.map((comp, colIdx) => {
                          const skillEval =
                            candidate?.skillsStatus?.[comp.name] ||
                            candidate?.skillsStatus?.[comp.localizedName];

                          return (
                            <td
                              key={colIdx}
                              style={{ width: `${skillColWidth}px`, minWidth: `${skillColWidth}px`, maxWidth: `${skillColWidth}px` }}
                              className="p-0 border-0"
                            >
                              {skillEval ? (
                                <TileContent skillEval={skillEval} t={t} theme={theme} />
                              ) : (
                                <div className="h-14 w-full flex items-center justify-center">
                                  <span className="text-[10px] font-mono text-text-muted/50 select-none">
                                    -
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Continuous Canvas Heatmap Overlay */}
            {matrixData && (sortedMembers.length > 0 || sortedUserIds.length > 0) && competencies.length > 0 && (
              <div
                className="absolute top-16 bottom-1 left-0 pointer-events-none"
                style={{
                  width: `${totalTableWidth}px`,
                  height: `${(sortedMembers.length || sortedUserIds.length) * 56}px`,
                }}
              >
                <CanvasHeatmapOverlay
                  members={sortedMembers.length > 0 ? sortedMembers : sortedUserIds.map((uid) => ({ id: uid, owner: { id: uid } }))}
                  competencies={competencies}
                  candidateMap={candidateMap}
                  width={totalTableWidth}
                  height={(sortedMembers.length || sortedUserIds.length) * 56}
                  colWidth={skillColWidth}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Status Color Themes ---
// Define status color classes and rgb values for dark-mode heatmaps.
export interface StatusTheme {
  rgb: string;
  lightTextClass: string;
  lightSubtextClass: string;
  darkTextClass: string;
  darkSubtextClass: string;
}

const STATUS_THEMES: Record<string, StatusTheme> = {
  mastered: {
    rgb: "16, 185, 129",
    lightTextClass: "text-emerald-900",
    lightSubtextClass: "text-emerald-950",
    darkTextClass: "text-emerald-200",
    darkSubtextClass: "text-emerald-300",
  },
  gap: {
    rgb: "234, 179, 8",
    lightTextClass: "text-amber-950",
    lightSubtextClass: "text-amber-950",
    darkTextClass: "text-amber-200",
    darkSubtextClass: "text-amber-300",
  },
  critical_deficit: {
    rgb: "244, 63, 94",
    lightTextClass: "text-rose-900",
    lightSubtextClass: "text-rose-950",
    darkTextClass: "text-rose-200",
    darkSubtextClass: "text-rose-300",
  },
};

// --- Continuous Heatmap Canvas Subcomponent ---
// Render lightweight continuous heatmap overlay via simpleheat.
function CanvasHeatmapOverlay({
  members,
  competencies,
  candidateMap,
  width,
  height,
  colWidth = 130,
}: {
  members: Array<{ id: string; owner: { id: string } }>;
  competencies: Array<{ name: string }>;
  candidateMap: Map<string, TeamMemberAnalysis>;
  width: number;
  height: number;
  colWidth?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0 || members.length === 0 || competencies.length === 0) {
      return;
    }

    // Set physical canvas resolution
    canvas.width = width;
    canvas.height = height;

    try {
      const heat = (simpleheat as any)(canvas);

      // Gradient color configuration:
      // 0.0 - 0.39: Critical Deficit (Rose/Coral)
      // 0.40 - 0.69: Gap (Amber/Gold)
      // 0.70 - 1.00: Mastered (Emerald)
      heat.gradient(
        theme === "light"
          ? {
              0.15: "rgba(190, 24, 93, 0.6)",
              0.35: "rgba(190, 24, 93, 0.92)",
              0.50: "rgba(180, 83, 9, 0.92)",
              0.70: "rgba(4, 120, 87, 0.92)",
              1.00: "rgba(5, 150, 105, 1)",
            }
          : {
              0.15: "rgba(244, 63, 94, 0.4)",
              0.35: "rgba(244, 63, 94, 0.8)",
              0.50: "rgba(234, 179, 8, 0.8)",
              0.70: "rgba(16, 185, 129, 0.8)",
              1.00: "rgba(52, 211, 153, 0.95)",
            }
      );

      // Point coordinates: [x, y, value]
      const actualColWidth = colWidth || 130;
      const rowHeight = 56;
      const dataPoints: [number, number, number][] = [];

      members.forEach((m, rowIdx) => {
        const candidate = candidateMap.get(m.owner.id);
        const y = rowIdx * rowHeight + rowHeight / 2;

        competencies.forEach((comp, colIdx) => {
          const skillEval = candidate?.skillsStatus?.[comp.name];
          const x = colIdx * actualColWidth + actualColWidth / 2;
          const score = skillEval?.score ?? 0;
          dataPoints.push([x, y, Math.max(0.1, score)]);
        });
      });

      heat.data(dataPoints);
      // Scale point radius and blur smoothly based on cell width.
      const pointRadius = Math.max(48, Math.min(80, actualColWidth * 0.42));
      heat.radius(pointRadius, 35);
      heat.max(1.0);
      heat.draw(0.05);
    } catch (err) {
      console.warn("[simpleheat] Render failed:", err);
    }
  }, [members, competencies, candidateMap, width, height, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 left-0 pointer-events-none z-0 ${theme === "light" ? "opacity-100" : "opacity-80"}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}

// --- Competency Tile Cell Subcomponent ---
// Render transparent score tile with localized status indicator.
function TileContent({
  skillEval,
  t,
  theme,
}: {
  skillEval: SkillEvaluationItem;
  t: (key: string) => string;
  theme: Theme;
}) {
  const scorePercent = Math.round((skillEval.score || 0) * 100);
  const status = skillEval.status;

  const currentTheme = STATUS_THEMES[status] || STATUS_THEMES.gap;
  const textClass = theme === "light" ? currentTheme.lightTextClass : currentTheme.darkTextClass;
  const subtextClass = theme === "light" ? currentTheme.lightSubtextClass : currentTheme.darkSubtextClass;

  const statusLabel =
    status === "mastered"
      ? t("heatmap.mastered")
      : status === "gap"
      ? t("heatmap.bridgeable_gap")
      : t("heatmap.critical_deficit");

  return (
    <div
      className="h-14 w-full relative flex flex-col items-center justify-center transition-all duration-200 hover:backdrop-brightness-125 cursor-default select-none z-1"
      title={`${skillEval.skillName}: ${scorePercent}% (${statusLabel})`}
    >
      {/* Score and Status Label */}
      <span className={`text-xs font-mono font-bold ${textClass} drop-shadow-md leading-tight`}>
        {scorePercent}%
      </span>
      <span className={`text-[9px] font-mono font-medium ${subtextClass} tracking-tight leading-tight mt-0.5 drop-shadow-sm`}>
        {statusLabel}
      </span>
    </div>
  );
}