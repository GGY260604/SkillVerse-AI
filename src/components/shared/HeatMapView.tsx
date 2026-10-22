"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import simpleheat from "simpleheat";
import type { SharedRoadmapItem } from "@/components/shared/SharedPlansView";
import { getAvatarInitials } from "@/lib/avatar";

// --- Type Definitions ---

interface SkillEvaluationItem {
  skillName: string;
  skillNameLocalized?: Record<string, string>;
  status: "mastered" | "gap" | "critical_deficit" | string;
  score: number;
  matchedUserSkill?: string;
  matchType?: string;
  proficiency?: string;
  statusLabel?: string;
}

interface TeamMemberAnalysis {
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

interface TeamSkillMatrixResponse {
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

// --- HeatMap Matrix View Component ---
// Render interactive workforce competency heatmap with real-time continuous simpleheat blending.
export default function HeatMapView({
  onBack,
  selectedUserIds = [],
  selectedMembers = [],
}: HeatMapViewProps) {
  const t = useTranslations("shared");
  const locale = useLocale();

  const [roleInput, setRoleInput] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matrixData, setMatrixData] = useState<TeamSkillMatrixResponse | null>(null);
  const [isScrolledX, setIsScrolledX] = useState<boolean>(false);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollContainerWidth, setScrollContainerWidth] = useState<number>(0);

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

  // Sort members in descending order of overall match score.
  const sortedMembers = React.useMemo(() => {
    if (!matrixData?.candidates || matrixData.candidates.length === 0) {
      return selectedMembers;
    }
    return [...selectedMembers].sort((a, b) => {
      const scoreA = candidateMap.get(a.owner.id)?.matchPercentage ?? -1;
      const scoreB = candidateMap.get(b.owner.id)?.matchPercentage ?? -1;
      return scoreB - scoreA;
    });
  }, [selectedMembers, matrixData, candidateMap]);

  // Sort fallback user IDs in descending order of overall match score.
  const sortedUserIds = React.useMemo(() => {
    if (!matrixData?.candidates || matrixData.candidates.length === 0) {
      return selectedUserIds;
    }
    return [...selectedUserIds].sort((a, b) => {
      const scoreA = candidateMap.get(a)?.matchPercentage ?? -1;
      const scoreB = candidateMap.get(b)?.matchPercentage ?? -1;
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
      </div>

      {/* Role Input Bar and Analysis Trigger */}
      <div className="mb-6 flex w-full items-center gap-2.5 sm:gap-3">
        <div className="relative min-w-0 flex-1 flex items-center">
          <input
            type="text"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleStartAnalysis();
              }
            }}
            disabled={isAnalyzing}
            placeholder={t("heatmap.input_placeholder")}
            className="h-11 w-full bg-bg-card border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl pl-4 pr-10 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-mono disabled:opacity-50"
          />
          {roleInput && !isAnalyzing && (
            <button
              type="button"
              onClick={() => setRoleInput("")}
              className="absolute right-3 text-text-muted hover:text-text-primary p-0.5 border-none bg-transparent cursor-pointer"
              title={t("heatmap.clear")}
              aria-label={t("heatmap.clear")}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleStartAnalysis}
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

          <div className="relative flex items-center justify-between gap-4">
            {/* Target Role Title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase text-accent">
                  {t("heatmap.target_benchmark") || "Target Benchmark"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary truncate mt-1 tracking-tight">
                {matrixData.targetRoleTitleLocalized?.[locale] || matrixData.targetRoleTitle}
              </h2>
            </div>

            {/* Target Industry Sector Badge */}
            <div className="shrink-0 ml-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-accent/15 via-accent/10 to-transparent border border-accent/30 shadow-xs backdrop-blur-sm">
              <svg className="w-3.5 h-3.5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-text-muted hidden sm:inline">{t("heatmap.industry")}:</span>
                <span className="font-bold text-accent tracking-wide">
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
                            <span className={`text-xs font-mono font-bold ${
                              overallPct >= 70
                                ? "text-emerald-400"
                                : overallPct >= 40
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}>
                              {overallPct}%
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm mt-0.5 font-bold ${
                                rank === 1
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                  : rank === 2
                                  ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                                  : rank === 3
                                  ? "bg-amber-700/25 text-amber-500 border border-amber-600/40"
                                  : "text-text-muted"
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
                            <span className={`text-xs font-mono font-bold ${
                              overallPct >= 70
                                ? "text-emerald-400"
                                : overallPct >= 40
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}>
                              {overallPct}%
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm mt-0.5 font-bold ${
                                rank === 1
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                  : rank === 2
                                  ? "bg-slate-300/20 text-slate-200 border border-slate-300/40"
                                  : rank === 3
                                  ? "bg-amber-700/25 text-amber-500 border border-amber-600/40"
                                  : "text-text-muted"
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
                                <TileContent skillEval={skillEval} t={t} />
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
                                <TileContent skillEval={skillEval} t={t} />
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
  textClass: string;
  subtextClass: string;
}

const STATUS_THEMES: Record<string, StatusTheme> = {
  mastered: {
    rgb: "16, 185, 129",
    textClass: "text-emerald-300",
    subtextClass: "text-emerald-400/90",
  },
  gap: {
    rgb: "234, 179, 8",
    textClass: "text-amber-300",
    subtextClass: "text-amber-400/90",
  },
  critical_deficit: {
    rgb: "244, 63, 94",
    textClass: "text-rose-300",
    subtextClass: "text-rose-400/90",
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
      heat.gradient({
        0.15: "rgba(244, 63, 94, 0.4)",
        0.35: "rgba(244, 63, 94, 0.8)",
        0.50: "rgba(234, 179, 8, 0.8)",
        0.70: "rgba(16, 185, 129, 0.8)",
        1.00: "rgba(52, 211, 153, 0.95)",
      });

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
  }, [members, competencies, candidateMap, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none z-0 opacity-80"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}

// --- Competency Tile Cell Subcomponent ---
// Render transparent score tile with localized status indicator.
function TileContent({
  skillEval,
  t,
}: {
  skillEval: SkillEvaluationItem;
  t: (key: string) => string;
}) {
  const scorePercent = Math.round((skillEval.score || 0) * 100);
  const status = skillEval.status;

  const currentTheme = STATUS_THEMES[status] || STATUS_THEMES.gap;

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
      <span className={`text-xs font-mono font-bold ${currentTheme.textClass} drop-shadow-md leading-tight`}>
        {scorePercent}%
      </span>
      <span className={`text-[9px] font-mono font-medium ${currentTheme.subtextClass} tracking-tight leading-tight mt-0.5 drop-shadow-sm`}>
        {statusLabel}
      </span>
    </div>
  );
}