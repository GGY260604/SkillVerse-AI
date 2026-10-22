"use client";

import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { PlanData, PlanPhase, CourseItem, LocalizedStringMap, LocalizedListMap } from "./planData";
import { useExpGain } from "@/context/auth/ExpGainContext";
import PhaseQuizModal from "@/components/analysis/quiz/PhaseQuizModal";
import { USE_PHASE_QUIZ_MODAL_TESTING } from "@/constants/testing/quiz";

// --- Roadmap Detail View ---
// Display a roadmap's phases, persist current-plan progress, and support read-only shared/history views.
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
  title: string;
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
          title: phase.sdgTitle || tCurrent("sdg_alignment_title"),
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
      title: tCurrent(titleKey),
      explanation: tCurrent(explanationKey, { phase: phaseTitle }),
    };
  };

  // --- Phase State ---
  // Keep the visible phase state synchronized with the selected roadmap prop.
  const [phases, setPhases] = useState<PlanPhase[]>(plan.phases || []);
  const [updatingPhaseId, setUpdatingPhaseId] = useState<string | null>(null);

  // Active quiz phase modal
  const [activeQuizPhase, setActiveQuizPhase] = useState<PlanPhase | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number>(1);

  // Track expanded SDG section for each phase
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
      const response = await fetch("/api/analysis/roadmaps/phase", {
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

  // Metrics calculation
  const completedCount = phases.filter((p) => p.isCompleted).length;
  const totalPhases = phases.length;
  const progressPercent = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  // Localized plan header values based directly on system locale
  const localizedRoleTitle = getLocalized(plan.targetTitleLocalized, locale, plan.targetRole);
  const localizedPlanDesc = getLocalized(plan.descriptionLocalized, locale, plan.description);
  const rawDate = plan.createdAt || plan.date || "";
  const displayDate = rawDate.split("T")[0].split(" ")[0];

  return (
    <div
      className={`animate-fade-in flex flex-col gap-10 w-full ${
        !isCurrent ? "grayscale opacity-85 select-none" : ""
      }`}
    >
      {/* Historical Sealed Notice Banner */}
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

      {/* Main Strategic Roadmap Header Card (Identical structure to outer PlanCard, without blue border) */}
      <div
        className={`rounded-2xl p-6 sm:p-7 transition-all duration-300 border ${
          isCurrent
            ? "bg-bg-card border-border-subtle shadow-sm"
            : "bg-bg-secondary/40 border-border-subtle/70"
        }`}
      >
        {/* Top Header Row: Roadmap ID on Left, Generation Date on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-subtle mb-5">
          <span className="text-xs font-mono font-medium text-text-muted">
            {tCurrent("roadmap_id")}: <span className="text-text-secondary font-mono">{plan.id}</span>
          </span>

          <span className="text-xs font-mono text-text-muted">
            {displayDate}
          </span>
        </div>

        {/* Primary Role Info & Match Metric Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-5">
          <div className="lg:col-span-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-text-muted block mb-1">
              {!plan.roleCategory || plan.roleCategory === "Target Horizon Role"
                ? tCurrent("role_category_default")
                : plan.roleCategory}
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
              {localizedRoleTitle}
            </h2>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
              {localizedPlanDesc}
            </p>

            {/* SDGs Chips (without "Aligned UN Goals:" label) */}
            {plan.sdgs && plan.sdgs.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {plan.sdgs.map((sdg) => (
                  <span
                    key={sdg}
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    {sdg}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Match Score Block (Identical styling inside & outside, total time placed inside) */}
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

            <span className="text-[11px] font-mono text-text-secondary font-medium">
              {tCurrent("duration_summary", {
                weeks: plan.roadmapWeeks?.replace(/\D/g, "") || "10",
                hours: plan.roadmapHours?.replace(/\D/g, "") || "45",
              })}
            </span>
          </div>
        </div>

        {/* Global Roadmap Progress Bar (No % in Progress text) */}
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

      {/* Itemized Skills Section (No outer border/bg, no item border/bg, distinct colors and markers preserved) */}
      {/* Itemized Skills Section (Direct database trilingual render, zero client translation lists) */}
      {(() => {
        const currentLocale = (locale || "en").toLowerCase();
        const displayedStrengths =
          currentLocale === "zh"
            ? (plan.matchedStrengthsZh?.length ? plan.matchedStrengthsZh : plan.matchedStrengthsLocalized?.zh || plan.matchedStrengths)
            : currentLocale === "ms"
            ? (plan.matchedStrengthsMs?.length ? plan.matchedStrengthsMs : plan.matchedStrengthsLocalized?.ms || plan.matchedStrengths)
            : (plan.matchedStrengthsLocalized?.en || plan.matchedStrengths);

        const displayedGaps =
          currentLocale === "zh"
            ? (plan.skillsGapZh?.length ? plan.skillsGapZh : plan.skillsGapLocalized?.zh || plan.skillsGap)
            : currentLocale === "ms"
            ? (plan.skillsGapMs?.length ? plan.skillsGapMs : plan.skillsGapLocalized?.ms || plan.skillsGap)
            : (plan.skillsGapLocalized?.en || plan.skillsGap);

        const displayedAtRisk =
          currentLocale === "zh"
            ? (plan.atRiskSkillsZh?.length ? plan.atRiskSkillsZh : plan.atRiskSkillsLocalized?.zh || plan.atRiskSkills)
            : currentLocale === "ms"
            ? (plan.atRiskSkillsMs?.length ? plan.atRiskSkillsMs : plan.atRiskSkillsLocalized?.ms || plan.atRiskSkills)
            : (plan.atRiskSkillsLocalized?.en || plan.atRiskSkills);

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 py-2">
            {/* Matched Strengths */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  {tCurrent("matched_strengths")}
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {displayedStrengths.length}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
                {displayedStrengths.map((skill) => (
                  <li key={skill} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                    <span className="text-text-primary font-medium">{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills to Acquire */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  {tCurrent("skills_gap")}
                </h3>
                <span className="text-xs font-mono text-amber-400 font-semibold">
                  {displayedGaps.length}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
                {displayedGaps.map((skill) => (
                  <li key={skill} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold shrink-0 mt-0.5">▲</span>
                    <span className="text-text-primary font-medium">{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Automation Alerts */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
                  {tCurrent("at_risk_skills")}
                </h3>
                <span className="text-xs font-mono text-rose-400 font-semibold">
                  {displayedAtRisk.length}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
                {displayedAtRisk.map((skill) => (
                  <li key={skill} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="text-text-primary font-medium">{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* Phased Curriculum Timeline (Structured Phase Cards with moderate framing and clear separation) */}
      <div className="pt-6 border-t border-border-subtle">
        <div className="pb-6 mb-2">
          <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {tCurrent("roadmap_timeline")}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {tCurrent("roadmap_timeline_subtitle")}
          </p>
        </div>

        {/* List of Phases with moderate containers and clear visual emphasis */}
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
                className={`rounded-2xl border p-6 sm:p-7 transition-all flex flex-col gap-5 ${
                  phase.isCompleted
                    ? "bg-bg-card/90 border-emerald-500/30 border-l-4 border-l-emerald-500 shadow-sm"
                    : "bg-bg-card/70 border-border-subtle border-l-4 border-l-accent hover:border-border-subtle/80 shadow-xs"
                }`}
              >
                {/* Phase Header Row: Phase Tag, Title, Duration, and Completion Checkbox */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle/60">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider ${
                        phase.isCompleted
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-accent/15 text-accent"
                      }`}
                    >
                      {tCurrent("phase_label", { phase: phaseIndex })}
                    </span>
                    <h4 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                      {phaseTitleLocalized}
                    </h4>
                    <span className="text-xs font-mono text-text-muted">
                      {tCurrent("phase_duration", {
                        weeks: phase.durationWeeks || 3,
                        hours: phase.estimatedHours || 15,
                      })}
                    </span>
                  </div>

                  {/* Answer Quiz or Skill Mastered Badge */}
                  {phase.isCompleted ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {tCurrent("skill_mastered")}
                      </span>

                      {isCurrent && (!isSharedView || canEdit) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuizPhase(phase);
                            setActiveQuizIndex(phaseIndex);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-text-muted hover:text-text-primary bg-bg-secondary hover:bg-bg-elevated border border-border-subtle transition-colors cursor-pointer"
                          title={tCurrent("retake_quiz")}
                        >
                          {tCurrent("retake_quiz")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!isCurrent || (isSharedView && !canEdit) || isUpdating}
                      onClick={() => {
                        setActiveQuizPhase(phase);
                        setActiveQuizIndex(phaseIndex);
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all duration-300 border cursor-pointer ${
                        !isCurrent || (isSharedView && !canEdit)
                          ? "opacity-50 cursor-not-allowed bg-bg-secondary text-text-muted border-border-subtle"
                          : "bg-accent/15 hover:bg-accent text-accent hover:text-bg-primary border-accent/40 hover:border-accent hover:shadow-[0_0_15px_var(--accent-glow)]"
                      }`}
                    >
                      <span>⚡</span>
                      <span>{tCurrent("answer_quiz")}</span>
                    </button>
                  )}
                </div>

                {/* Phase Description */}
                {phaseDescLocalized && (
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed m-0">
                    {phaseDescLocalized}
                  </p>
                )}

                {/* Two Column Content: Objectives & Courses with clean dividers and highlighted key points */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start pt-1">
                  {/* Learning Objectives List */}
                  <div className="flex flex-col gap-3">
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
                  <div className="flex flex-col gap-3">
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
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h6 className="text-xs font-semibold text-text-primary tracking-tight">
                                    {courseTitle}
                                  </h6>
                                  <span className="text-[11px] font-mono text-text-muted">
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

                {/* Down Expandable UN SDG Alignment Section */}
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 group-hover:border-emerald-500/40 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {sdgInfo.goalCode}
                          </span>
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

                      {/* Expandable Drawer Content */}
                      {isSdgExpanded && (
                        <div className="mt-3.5 p-4 sm:p-5 rounded-xl bg-linear-to-br from-emerald-950/20 via-bg-secondary/80 to-bg-secondary/40 border border-emerald-500/20 flex flex-col gap-3.5 animate-fade-in shadow-inner">
                          {/* Target Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-500/15">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {tCurrent("sdg_target_label")}
                              </span>
                              <h6 className="text-xs sm:text-sm font-bold text-text-primary">
                                {sdgInfo.title}
                              </h6>
                            </div>

                            <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
                              {sdgInfo.goalCode}
                            </span>
                          </div>

                          {/* Explanation Rationale */}
                          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed m-0">
                            {sdgInfo.explanation}
                          </p>

                          {/* 3 Impact Pillars */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card/70 border border-border-subtle">
                              <span className="text-emerald-400 text-sm">🛡️</span>
                              <span className="text-[11px] font-mono text-text-secondary font-medium">
                                {tCurrent("sdg_pillar_automation")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card/70 border border-border-subtle">
                              <span className="text-accent text-sm">📈</span>
                              <span className="text-[11px] font-mono text-text-secondary font-medium">
                                {tCurrent("sdg_pillar_productivity")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card/70 border border-border-subtle">
                              <span className="text-blue-400 text-sm">🌍</span>
                              <span className="text-[11px] font-mono text-text-secondary font-medium">
                                {tCurrent("sdg_pillar_sustainable")}
                              </span>
                            </div>
                          </div>
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

      {/* 10-Question Skill Competency Assessment Modal */}
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
          targetRole={plan.targetRole}
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
