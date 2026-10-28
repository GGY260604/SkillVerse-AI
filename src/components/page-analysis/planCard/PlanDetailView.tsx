"use client";

import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { PlanData, PlanPhase, CourseItem, LocalizedStringMap, LocalizedListMap, getRoleViabilityInfo } from "./planData";
import { useExpGain } from "@/context/auth/ExpGainContext";
import PhaseQuizModal from "@/components/page-analysis/quiz/PhaseQuizModal";
import { USE_PHASE_QUIZ_MODAL_TESTING } from "@/constants/testing/quiz";

/**
 * Roadmap Detailed Inspection View Component
 *
 * Displays full curriculum breakdown for a selected career roadmap, including
 * itemized skill diagnostics, phase learning objectives, recommended courses, and SDG alignments.
 *
 * Component Properties:
 * - plan: Full roadmap data model containing phases and skill gaps.
 * - onBack (optional): Callback invoked to return to the plan list overview.
 * - isSharedView (optional): Boolean flag indicating peer collaboration mode.
 * - canEdit (optional): Boolean flag controlling milestone completion permissions.
 * - onPhaseToggle (optional): Callback notifying parent containers of phase completion changes.
 *
 * Workflow:
 * 1. Synchronize phase collection with active roadmap props.
 * 2. Resolve localized target role titles, descriptions, and skill categorization arrays.
 * 3. Render roadmap header summary, match scores, and overall progress meters.
 * 4. Render itemized three-dimensional skill gap breakdown (strengths, gaps, and at-risk skills).
 * 5. Render phase curriculum timeline, learning objectives, courses, and expandable SDG rationales:
 *    - Branch A: Interactive milestone assessment triggers and verification for editable roadmaps.
 *    - Branch B: Read-only phase presentation for archived or non-editable roadmaps.
 * 6. Mount interactive competency quiz modal upon phase assessment selection.
 */
interface PlanDetailViewProps {
  plan: PlanData;
  onBack?: () => void;
  isSharedView?: boolean;
  canEdit?: boolean;
  onPhaseToggle?: (phaseId: string, isCompleted: boolean) => void;
}

const TESTING_QUIZ_PHASE: PlanPhase = {
  id: "testing-quiz-phase",
  phase: "Testing",
  weeks: "1 week",
  title: "Quiz Modal Preview",
  desc: "Preview the phase quiz modal without selecting a roadmap phase.",
  tasks: ["General competency assessment"],
};

// --- Localization Helpers ---
// Prefer the active locale, then English, then the first available translation.
function getLocalized(
  localizedMap: LocalizedStringMap | undefined,
  currentLang: string,
  fallbackText: string = ""
): string {
  if (!localizedMap || typeof localizedMap !== "object") return fallbackText;
  return localizedMap[currentLang] || localizedMap["en"] || Object.values(localizedMap)[0] || fallbackText;
}

function getLocalizedList(
  localizedListMap: LocalizedListMap | undefined,
  currentLang: string,
  fallbackList: string[] = []
): string[] {
  if (!localizedListMap || typeof localizedListMap !== "object") return fallbackList;
  const list = localizedListMap[currentLang] || localizedListMap["en"] || Object.values(localizedListMap)[0];
  return Array.isArray(list) && list.length > 0 ? list : fallbackList;
}

interface PhaseSdgInfo {
  goalCode: string;
  explanation: string;
}

export default function PlanDetailView({
  plan,
  isSharedView = false,
  canEdit = true,
  onPhaseToggle,
}: PlanDetailViewProps) {
  const tCurrent = useTranslations("analysis.current");
  const tHistory = useTranslations("analysis.history");
  const locale = useLocale();

  const isCurrent = plan.isCurrent;
  const { addExp } = useExpGain();

  // --- SDG Helpers ---
  const getPhaseSdgDetails = (
    phase: PlanPhase,
    phaseIndex: number
  ): PhaseSdgInfo => {
    if (phase.sdgExplanationLocalized || phase.sdgExplanation) {
      const explanation = getLocalized(
        phase.sdgExplanationLocalized,
        locale,
        phase.sdgExplanation || ""
      );
      if (explanation) {
        return {
          goalCode: phase.sdgGoal || plan.sdgs?.[0] || "SDG 8.2",
          explanation,
        };
      }
    }

    const phaseTitle = getLocalized(phase.titleLocalized, locale, phase.title);
    const titleKey =
      phaseIndex === 1
        ? "sdg_phase_1_title"
        : phaseIndex === 2
          ? "sdg_phase_2_title"
          : "sdg_phase_3_title";
    const explanationKey =
      phaseIndex === 1
        ? "sdg_phase_1_description"
        : phaseIndex === 2
          ? "sdg_phase_2_description"
          : "sdg_phase_3_description";

    return {
      goalCode:
        phaseIndex === 1
          ? "SDG 4.4 & 8.2"
          : phaseIndex === 2
            ? "SDG 9.4 & 8.2"
            : plan.sdgs?.[0] || "SDG 8.2",
      explanation: tCurrent(explanationKey, { phase: phaseTitle }),
    };
  };

  // ==========================================
  // Step 1: Synchronize Phase Collection with Active Roadmap Props
  // ==========================================
  // Maintain local mutable phase collection and track in-flight persistence updates.
  const [phases, setPhases] = useState<PlanPhase[]>(plan.phases || []);
  const [updatingPhaseId, setUpdatingPhaseId] = useState<string | null>(null);

  // --- Quiz State ---
  // Phase currently shown in the quiz modal.
  const [activeQuizPhase, setActiveQuizPhase] = useState<PlanPhase | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(1);

  // Track which phase has its SDG details expanded.
  const [expandedSdgPhases, setExpandedSdgPhases] = useState<Record<string, boolean>>({});

  const toggleSdgExpand = (phaseKey: string) => {
    setExpandedSdgPhases((prev) => ({
      ...prev,
      [phaseKey]: !prev[phaseKey],
    }));
  };

  // Keep local phases synchronized if plan prop updates
  const [prevPlanProp, setPrevPlanProp] = useState(plan);
  if (plan !== prevPlanProp) {
    setPrevPlanProp(plan);
    setPhases(plan.phases || []);
  }

  // --- Quiz Completion ---
  // On a perfect score, update the UI, persist completion for the active roadmap, and award EXP.
  const handleQuizPassed = async (phaseId: string, expReward: number, phaseTitle: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((p) => (p.id === phaseId ? { ...p, isCompleted: true } : p))
    );
    setUpdatingPhaseId(phaseId);
    onPhaseToggle?.(phaseId, true);

    try {
      const response = await fetch("/api/page-analysis/roadmaps/phase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          isCompleted: true,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to persist phase completion.");
      }
    } catch (error) {
      console.error("Failed to persist phase completion:", error);
      setPhases((prevPhases) =>
        prevPhases.map((phase) =>
          phase.id === phaseId ? { ...phase, isCompleted: false } : phase
        )
      );
      onPhaseToggle?.(phaseId, false);
      return;
    } finally {
      setUpdatingPhaseId(null);
    }

    // Award EXP and trigger level progression animation
    addExp(expReward, phaseTitle);
  };

  // --- Progress Metrics ---
  const completedCount = phases.filter((p) => p.isCompleted).length;
  const totalPhases = phases.length;
  const progressPercent = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  // ==========================================
  // Step 2: Resolve Localized Target Role Titles, Descriptions, and Skill Categorizations
  // ==========================================
  // Resolve localized role strings, formatted creation timestamps, and skills.
  const localizedRoleTitle = getLocalized(plan.targetTitleLocalized, locale, plan.targetRole);
  const localizedPlanDesc = getLocalized(plan.descriptionLocalized, locale, plan.description);
  const rawDate = plan.createdAt || plan.date || "";
  const displayDate = rawDate.split("T")[0].split(" ")[0];
  const viability = getRoleViabilityInfo(plan, locale);

  // Helper to resolve localized skill lists for active locale
  const getSkillsForLocale = (
    baseList: string[] = [],
    msList?: string[],
    zhList?: string[],
    locMap?: { en?: string[]; ms?: string[]; zh?: string[]; [key: string]: string[] | undefined }
  ): string[] => {
    if (locale === "zh") {
      if (Array.isArray(zhList) && zhList.length > 0) return zhList;
      if (locMap?.zh && Array.isArray(locMap.zh) && locMap.zh.length > 0) return locMap.zh;
    } else if (locale === "ms") {
      if (Array.isArray(msList) && msList.length > 0) return msList;
      if (locMap?.ms && Array.isArray(locMap.ms) && locMap.ms.length > 0) return locMap.ms;
    }
    if (locMap?.[locale] && Array.isArray(locMap[locale]) && locMap[locale]!.length > 0) {
      return locMap[locale]!;
    }
    return baseList && baseList.length > 0 ? baseList : (locMap?.en || []);
  };

  const localizedMatchedStrengths = getSkillsForLocale(
    plan.matchedStrengths,
    plan.matchedStrengthsMs,
    plan.matchedStrengthsZh,
    plan.matchedStrengthsLocalized
  );

  const localizedSkillsGap = getSkillsForLocale(
    plan.skillsGap,
    plan.skillsGapMs,
    plan.skillsGapZh,
    plan.skillsGapLocalized
  );

  const localizedAtRiskSkills = getSkillsForLocale(
    plan.atRiskSkills,
    plan.atRiskSkillsMs,
    plan.atRiskSkillsZh,
    plan.atRiskSkillsLocalized
  );

  // ==========================================
  // Step 3: Render Roadmap Header Summary, Match Scores, and Overall Progress
  // ==========================================
  // Present roadmap summary, role taxonomy badges, and milestone completion progress bar.
  return (
    <div
      className={`animate-fade-in flex flex-col gap-10 w-full ${
        !isCurrent ? "grayscale opacity-85 select-none" : ""
      }`}
    >
      {/* Archived Roadmap Notice */}
      {!isCurrent && (
        <div className="rounded-2xl bg-bg-card border border-border-subtle p-5 flex items-start gap-3.5 shadow-sm">
          <div>
            <h4 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-text-primary">
              {tHistory("locked_banner_title")}
            </h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {tHistory("locked_banner_desc")}
            </p>
          </div>
        </div>
      )}

      {/* Roadmap Summary */}
      <div
        className={`rounded-2xl p-6 sm:p-7 transition-all duration-300 border ${
          isCurrent
            ? "bg-bg-card border-border-subtle shadow-sm"
            : "bg-bg-secondary/40 border-border-subtle/70"
        }`}
      >
        {/* Roadmap Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-subtle mb-5">
          <span className="text-xs font-mono font-medium text-text-muted">
            {tCurrent("roadmap_id")}: <span className="text-text-secondary font-mono">{plan.id}</span>
          </span>

          <span className="text-xs font-mono text-text-muted">
            {displayDate}
          </span>
        </div>

        {/* Role Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-5">
          <div className="lg:col-span-2">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-text-muted">
                {!plan.roleCategory || plan.roleCategory === "Target Horizon Role"
                  ? tCurrent("role_category_default")
                  : plan.roleCategory}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${viability.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${viability.dotClass}`} />
                <span>{viability.growthPct}</span>
                <span className="opacity-60">•</span>
                <span className="font-sans">{viability.localizedStatus}</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
              {localizedRoleTitle}
            </h2>

            {viability.localizedRecommendation && (
              <p className="text-xs text-text-secondary leading-relaxed mb-3.5 bg-bg-secondary/70 border border-border-subtle/70 rounded-xl px-3 py-2 font-mono">
                {viability.localizedRecommendation}
              </p>
            )}

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
              {localizedPlanDesc}
            </p>

            {/* Sustainable Development Goals */}
            {plan.sdgs && plan.sdgs.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {plan.sdgs.map((sdg) => (
                  <span
                    key={sdg}
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-accent/15 text-accent border border-accent/30 shadow-xs"
                  >
                    {sdg}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Match Score */}
          <div className="rounded-xl border border-border-subtle p-4 flex flex-col items-center text-center justify-center bg-bg-secondary/50">
            <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider mb-0.5">
              {tCurrent("match_score")}
            </span>

            <div className="flex items-baseline gap-0.5 my-0.5">
              <span className="text-3xl font-extrabold font-mono text-text-primary">
                {plan.matchScore.toFixed(1)}
              </span>
              <span className="text-xs font-bold font-mono text-text-muted">%</span>
            </div>

            <span className="text-[10px] text-text-muted font-mono mb-2">
              {plan.matchScoreBasis}
            </span>

            <div className="w-full bg-border-subtle rounded-full h-1.5 overflow-hidden mb-2.5">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${plan.matchScore}%` }}
              />
            </div>

            {/* Role Current Trend & Score Breakdown */}
            <div className="w-full pt-2.5 mt-0.5 border-t border-border-subtle/60 flex items-center justify-between text-[11px] font-mono mb-2 px-0.5">
              <span className="text-text-muted text-[10px] uppercase tracking-wider">
                {locale === "zh" ? "市场趋势" : locale === "ms" ? "Trend Pasaran" : "Market Trend"}
              </span>
              <span className={`font-bold flex items-center gap-1 ${viability.textClass}`}>
                <span>{viability.growthPct}</span>
                <span className="text-[10px] opacity-80">({viability.status === "on_trend" ? (locale === "zh" ? "强劲" : locale === "ms" ? "Tinggi" : "Growth") : viability.status === "falling_behind" ? (locale === "zh" ? "预警" : locale === "ms" ? "Risiko" : "Risk") : (locale === "zh" ? "稳健" : locale === "ms" ? "Stabil" : "Core")})</span>
              </span>
            </div>

            <span className="text-[11px] font-mono text-text-secondary font-medium">
              {tCurrent("duration_summary", {
                weeks: plan.roadmapWeeks?.replace(/\D/g, "") || "10",
                hours: plan.roadmapHours?.replace(/\D/g, "") || "45",
              })}
            </span>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary">
              {tCurrent("progress")}: <strong className="text-text-primary">{completedCount} / {totalPhases}</strong>
            </span>
            <div className="w-36 sm:w-48 bg-border-subtle rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* Step 4: Render Itemized Three-Dimensional Skill Gap Breakdown */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 py-2">
        {/* Matched Strengths (Green) */}
        <div className="skill-card-green rounded-2xl p-4 sm:p-5 border flex flex-col transition-all">
          <div className="skill-border-green flex items-center justify-between pb-3 mb-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <h3 className="skill-header-green text-xs font-bold uppercase tracking-wider font-mono truncate">
                {tCurrent("matched_strengths")}
              </h3>
            </div>
            <span className="skill-badge-green inline-flex items-center justify-center min-w-[1.6rem] h-5 px-1.5 rounded-full text-xs font-mono font-bold shrink-0 shadow-xs">
              {localizedMatchedStrengths.length}
            </span>
          </div>

          {localizedMatchedStrengths.length > 0 ? (
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
              {localizedMatchedStrengths.map((skill) => (
                <li key={skill} className="flex items-start gap-2">
                  <span className="text-emerald-500 dark:text-emerald-400 font-black shrink-0 mt-0.5">✓</span>
                  <span className="skill-item-text font-medium">{skill}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-bg-secondary/40 text-xs text-text-muted font-medium">
              <span>—</span>
              <span>{tCurrent("no_matched_strengths")}</span>
            </div>
          )}
        </div>

        {/* Skills to Acquire (Amber) */}
        <div className="skill-card-amber rounded-2xl p-4 sm:p-5 border flex flex-col transition-all">
          <div className="skill-border-amber flex items-center justify-between pb-3 mb-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              <h3 className="skill-header-amber text-xs font-bold uppercase tracking-wider font-mono truncate">
                {tCurrent("skills_gap")}
              </h3>
            </div>
            <span className="skill-badge-amber inline-flex items-center justify-center min-w-[1.6rem] h-5 px-1.5 rounded-full text-xs font-mono font-bold shrink-0 shadow-xs">
              {localizedSkillsGap.length}
            </span>
          </div>

          {localizedSkillsGap.length > 0 ? (
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
              {localizedSkillsGap.map((skill) => (
                <li key={skill} className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 font-black shrink-0 mt-0.5">▲</span>
                  <span className="skill-item-text font-medium">{skill}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <span className="font-bold text-emerald-500 dark:text-emerald-400">✓</span>
              <span>{tCurrent("no_skills_gap")}</span>
            </div>
          )}
        </div>

        {/* Automation Alerts (Rose/Red) */}
        <div className="skill-card-rose rounded-2xl p-4 sm:p-5 border flex flex-col transition-all">
          <div className="skill-border-rose flex items-center justify-between pb-3 mb-3.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0 shadow-[0_0_10px_rgba(251,113,133,0.8)]" />
              <h3 className="skill-header-rose text-xs font-bold uppercase tracking-wider font-mono truncate">
                {tCurrent("at_risk_skills")}
              </h3>
            </div>
            <span className="skill-badge-rose inline-flex items-center justify-center min-w-[1.6rem] h-5 px-1.5 rounded-full text-xs font-mono font-bold shrink-0 shadow-xs">
              {localizedAtRiskSkills.length}
            </span>
          </div>

          {localizedAtRiskSkills.length > 0 ? (
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
              {localizedAtRiskSkills.map((skill) => (
                <li key={skill} className="flex items-start gap-2">
                  <span className="text-rose-500 dark:text-rose-400 font-black shrink-0 mt-0.5">✕</span>
                  <span className="skill-item-text font-medium">{skill}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center min-h-20">
              <span className="skill-empty-text text-black dark:text-white text-xs sm:text-sm font-medium">
                {tCurrent("no_at_risk_skills")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* Step 5: Render Phase Curriculum Timeline, Objectives, Courses, and SDG Rationales */}
      {/* ========================================== */}
      <div className="pt-6 border-t border-border-subtle">
        <div className="pb-6 mb-2">
          <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {tCurrent("roadmap_timeline")}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {tCurrent("roadmap_timeline_subtitle")}
          </p>
        </div>

        {/* Phase List */}
        <div className="flex flex-col gap-6">
          {phases.map((phase, idx) => {
            const phaseIndex = phase.phaseIndex || idx + 1;
            const phaseTitleLocalized = getLocalized(phase.titleLocalized, locale, phase.title);
            const phaseDescLocalized = getLocalized(phase.descriptionLocalized, locale, phase.desc);
            const phaseObjectives = getLocalizedList(phase.objectivesLocalized, locale, phase.tasks);
            const isUpdating = updatingPhaseId === phase.id;

            return (
              <div
                key={phase.id || idx}
                className={`rounded-2xl border p-6 sm:p-7 flex flex-col gap-5 ${
                  phase.isCompleted
                    ? "bg-bg-card border-emerald-500/40 border-l-4 border-l-emerald-500 shadow-sm"
                    : "bg-bg-card border-border-subtle border-l-4 border-l-zinc-300 dark:border-l-zinc-700 shadow-xs"
                }`}
              >
                {/* Phase Header */}
                <div className="flex flex-col gap-3 pb-4 border-b border-border-subtle/60">
                  <div className="flex flex-col items-start gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider ${
                        phase.isCompleted
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-accent/15 text-accent"
                      }`}
                    >
                      {tCurrent("phase_label", { phase: phaseIndex })}
                    </span>
                    <h4 className="min-w-0 wrap-break-word text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                      {phaseTitleLocalized}
                    </h4>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-xs font-mono text-text-muted">
                      {tCurrent("phase_duration", {
                        weeks: phase.durationWeeks || 3,
                        hours: phase.estimatedHours || 15,
                      })}
                    </span>

                    {/* ========================================== */}
                    {/* Branch A: Completed Skill Verification and Retake Trigger */}
                    {/* ========================================== */}
                    {phase.isCompleted ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs">
                          {tCurrent("skill_mastered")}
                        </span>

                        {isCurrent && (!isSharedView || canEdit) && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuizPhase(phase);
                              setActiveQuizIndex(phaseIndex);
                            }}
                            className="shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-mono text-text-muted hover:text-text-primary bg-bg-secondary hover:bg-bg-elevated border border-border-subtle transition-colors cursor-pointer"
                            title={tCurrent("retake_quiz")}
                          >
                            {tCurrent("retake_quiz")}
                          </button>
                        )}
                      </div>
                    ) : (
                      /* ========================================== */
                      /* Branch B: Uncompleted Milestone Assessment Action Trigger */
                      /* ========================================== */
                      <button
                        type="button"
                        disabled={!isCurrent || (isSharedView && !canEdit) || isUpdating}
                        onClick={() => {
                          setActiveQuizPhase(phase);
                          setActiveQuizIndex(phaseIndex);
                        }}
                        className={`inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all duration-300 border cursor-pointer ${
                          !isCurrent || (isSharedView && !canEdit)
                            ? "opacity-50 cursor-not-allowed bg-bg-secondary text-text-muted border-border-subtle"
                            : "bg-accent/15 hover:bg-accent text-accent hover:text-bg-primary border-accent/40 hover:border-accent hover:shadow-[0_0_15px_var(--accent-glow)]"
                        }`}
                      >
                        <span>{tCurrent("answer_quiz")}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Phase Description */}
                {phaseDescLocalized && (
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed m-0">
                    {phaseDescLocalized}
                  </p>
                )}

                {/* Learning Content */}
                <div className="flex snap-x snap-mandatory items-start gap-5 overflow-x-auto overscroll-x-contain pt-1 lg:grid lg:grid-cols-2 lg:gap-8 lg:overflow-visible">
                  {/* Learning Objectives List */}
                  <div className="w-[85%] min-w-57.5 max-w-95 flex-none snap-start flex flex-col gap-3 lg:w-auto lg:min-w-0 lg:max-w-none">
                    <div className="flex items-center gap-2 pb-2 border-b border-border-subtle/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <h5 className="text-xs font-bold uppercase tracking-wider font-mono text-text-secondary">
                        {tCurrent("learning_objectives")}
                      </h5>
                    </div>
                    <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
                      {phaseObjectives.map((obj, oIdx) => (
                        <li key={oIdx} className="flex items-start gap-2.5 text-text-primary">
                          <span className="text-accent font-bold mt-0.5 shrink-0">•</span>
                          <span className="font-normal">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Courses List */}
                  <div className="w-[85%] min-w-57.5 max-w-95 flex-none snap-start flex flex-col gap-3 lg:w-auto lg:min-w-0 lg:max-w-none">
                    <div className="flex items-center gap-2 pb-2 border-b border-border-subtle/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <h5 className="text-xs font-bold uppercase tracking-wider font-mono text-text-secondary">
                        {tCurrent("recommended_courses")}
                      </h5>
                    </div>

                    {phase.recommendedCourses && phase.recommendedCourses.length > 0 ? (
                      <div className="flex flex-col gap-2.5">
                        {phase.recommendedCourses.map((course: CourseItem, cIdx: number) => {
                          const courseTitle = getLocalized(course.titleLocalized, locale, course.title);
                          return (
                            <div
                              key={cIdx}
                              className="rounded-xl border border-border-subtle/70 p-3.5 bg-bg-secondary/40 hover:bg-bg-secondary/70 transition-colors flex flex-col gap-2"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <h6 className="wrap-break-word text-xs font-semibold text-text-primary tracking-tight">
                                    {courseTitle}
                                  </h6>
                                  <span className="wrap-break-word text-[11px] font-mono text-text-muted">
                                    {tCurrent("platform")}: <span className="text-text-secondary">{course.platform}</span>
                                    {course.durationHours &&
                                      ` • ${tCurrent("course_duration", {
                                        hours: course.durationHours,
                                      })}`}
                                  </span>
                                </div>

                                {course.url && (
                                  <a
                                    href={course.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium text-accent hover:underline shrink-0"
                                    title={tCurrent("open_verified_course")}
                                  >
                                    <span>{tCurrent("learn")} ↗</span>
                                  </a>
                                )}
                              </div>

                              {/* Course Tags */}
                              {(course.isFree || course.isHrdCorpClaimable) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {course.isFree && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      {tCurrent("free_audit_available")}
                                    </span>
                                  )}
                                  {course.isHrdCorpClaimable && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      {tCurrent("hrd_corp_claimable")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted italic">
                        {tCurrent("self_directed_learning")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expandable SDG Alignment */}
                {(() => {
                  const phaseKey = phase.id || `phase-${idx}`;
                  const isSdgExpanded = Boolean(expandedSdgPhases[phaseKey]);
                  const sdgInfo = getPhaseSdgDetails(phase, phaseIndex);

                  return (
                    <div className="pt-4 border-t border-border-subtle/60">
                      <button
                        type="button"
                        onClick={() => toggleSdgExpand(phaseKey)}
                        className="w-full flex items-center justify-between gap-3 text-left p-2 -mx-2 sm:p-2.5 sm:-mx-2.5 rounded-xl hover:bg-bg-secondary/60 transition-colors group cursor-pointer"
                        aria-expanded={isSdgExpanded}
                      >
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                            {tCurrent("sdg_why_relates")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-text-muted hidden sm:inline group-hover:text-text-secondary transition-colors">
                            {isSdgExpanded ? tCurrent("sdg_hide_rationale") : tCurrent("sdg_view_rationale")}
                          </span>
                          <svg
                            className={`w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform duration-200 ${
                              isSdgExpanded ? "rotate-180 text-emerald-400" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* SDG Details */}
                      {isSdgExpanded && (
                        <div className="mt-3.5 flex flex-col gap-2.5 animate-fade-in">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              {tCurrent("sdg_target_label")}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-text-primary">
                              {sdgInfo.goalCode}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed m-0">
                            {sdgInfo.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* Step 6: Mount Interactive Competency Quiz Modal upon Milestone Assessment Selection */}
      {/* ========================================== */}
      {(activeQuizPhase || USE_PHASE_QUIZ_MODAL_TESTING) && (
        <PhaseQuizModal
          isOpen={Boolean(activeQuizPhase)}
          onClose={() => setActiveQuizPhase(null)}
          phaseIndex={activeQuizPhase ? activeQuizIndex : 1}
          phaseTitle={getLocalized(
            activeQuizPhase?.titleLocalized,
            locale,
            activeQuizPhase?.title ?? TESTING_QUIZ_PHASE.title
          )}
          phaseDescription={getLocalized(
            activeQuizPhase?.descriptionLocalized,
            locale,
            activeQuizPhase?.desc ?? TESTING_QUIZ_PHASE.desc
          )}
          skills={
            activeQuizPhase?.tasks && activeQuizPhase.tasks.length > 0
              ? activeQuizPhase.tasks
              : plan.skillsGap && plan.skillsGap.length > 0
              ? plan.skillsGap
              : [activeQuizPhase?.title ?? TESTING_QUIZ_PHASE.title]
          }
          targetRole={localizedRoleTitle}
          alreadyCompleted={Boolean(activeQuizPhase?.isCompleted)}
          onPassed={(expGained) => {
            if (!activeQuizPhase) return;
            const currentPhaseId = activeQuizPhase.id;
            const currentPhaseTitle = getLocalized(activeQuizPhase.titleLocalized, locale, activeQuizPhase.title);
            handleQuizPassed(currentPhaseId, expGained, currentPhaseTitle);
          }}
        />
      )}
    </div>
  );
}
