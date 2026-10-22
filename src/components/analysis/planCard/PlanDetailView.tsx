"use client";

import React, { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { PlanData, PlanPhase, CourseItem, LocalizedStringMap, LocalizedListMap } from "./planData";

interface PlanDetailViewProps {
  plan: PlanData;
  onBack?: () => void;
  isSharedView?: boolean;
  canEdit?: boolean;
  onPhaseToggle?: (phaseId: string, isCompleted: boolean) => void;
}

// Helper to pick localized text according to active system locale
function getLocalized(
  localizedMap: LocalizedStringMap | undefined,
  currentLang: string,
  fallbackText: string = ""
): string {
  if (!localizedMap || typeof localizedMap !== "object") return fallbackText;
  return localizedMap[currentLang] || localizedMap["en"] || Object.values(localizedMap)[0] || fallbackText;
}

// Helper to pick localized list according to active system locale
function getLocalizedList(
  localizedListMap: LocalizedListMap | undefined,
  currentLang: string,
  fallbackList: string[] = []
): string[] {
  if (!localizedListMap || typeof localizedListMap !== "object") return fallbackList;
  const list = localizedListMap[currentLang] || localizedListMap["en"] || Object.values(localizedListMap)[0];
  return Array.isArray(list) && list.length > 0 ? list : fallbackList;
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

  // Phase completion state
  const [phases, setPhases] = useState<PlanPhase[]>(plan.phases || []);
  const [updatingPhaseId, setUpdatingPhaseId] = useState<string | null>(null);

  // Keep local phases synchronized if plan prop updates
  React.useEffect(() => {
    if (plan.phases) {
      setPhases(plan.phases);
    }
  }, [plan.phases]);

  // Toggle phase isCompleted status with optimistic UI update and database persistence
  const handleTogglePhase = async (phaseId: string) => {
    if (!isCurrent || (isSharedView && !canEdit)) return;

    const targetPhase = phases.find((p) => p.id === phaseId);
    if (!targetPhase) return;

    const nextCompleted = !targetPhase.isCompleted;

    // Optimistic UI state update
    setPhases((prevPhases) =>
      prevPhases.map((p) => (p.id === phaseId ? { ...p, isCompleted: nextCompleted } : p))
    );
    setUpdatingPhaseId(phaseId);
    onPhaseToggle?.(phaseId, nextCompleted);

    try {
      const response = await fetch("/api/analysis/roadmaps/phase", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId,
          isCompleted: nextCompleted,
        }),
      });

      if (!response.ok) {
        // Revert on API failure
        setPhases((prevPhases) =>
          prevPhases.map((p) => (p.id === phaseId ? { ...p, isCompleted: !nextCompleted } : p))
        );
        onPhaseToggle?.(phaseId, !nextCompleted);
      }
    } catch (error) {
      console.error("Failed to update phase completion status:", error);
      // Revert on exception
      setPhases((prevPhases) =>
        prevPhases.map((p) => (p.id === phaseId ? { ...p, isCompleted: !nextCompleted } : p))
      );
      onPhaseToggle?.(phaseId, !nextCompleted);
    } finally {
      setUpdatingPhaseId(null);
    }
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
            Roadmap ID: <span className="text-text-secondary font-mono">{plan.id}</span>
          </span>

          <span className="text-xs font-mono text-text-muted">
            {displayDate}
          </span>
        </div>

        {/* Primary Role Info & Match Metric Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-5">
          <div className="lg:col-span-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-text-muted block mb-1">
              {plan.roleCategory}
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
              {plan.roadmapWeeks} • {plan.roadmapHours}
            </span>
          </div>
        </div>

        {/* Global Roadmap Progress Bar (No % in Progress text) */}
        <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-secondary">
              Progress: <strong className="text-text-primary">{completedCount} / {totalPhases}</strong>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 py-2">
        {/* Matched Strengths */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Matched Strengths
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {plan.matchedStrengths.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
            {plan.matchedStrengths.map((skill) => (
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
              Skills to Acquire
            </h3>
            <span className="text-xs font-mono text-amber-400 font-semibold">
              {plan.skillsGap.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
            {plan.skillsGap.map((skill) => (
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
              Automation Alerts
            </h3>
            <span className="text-xs font-mono text-rose-400 font-semibold">
              {plan.atRiskSkills.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs leading-relaxed">
            {plan.atRiskSkills.map((skill) => (
              <li key={skill} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
                <span className="text-text-primary font-medium">{skill}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Phased Curriculum Timeline (Structured Phase Cards with moderate framing and clear separation) */}
      <div className="pt-6 border-t border-border-subtle">
        <div className="pb-6 mb-2">
          <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {tCurrent("roadmap_timeline")}
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Follow this phased curriculum. Check the box on each phase once you complete your study.
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
                      Phase {phaseIndex}
                    </span>
                    <h4 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                      {phaseTitleLocalized}
                    </h4>
                    <span className="text-xs font-mono text-text-muted">
                      ({phase.durationWeeks || 3} Weeks • {phase.estimatedHours || 15} Hours)
                    </span>
                  </div>

                  {/* Clean Completion Checkbox Button */}
                  <button
                    type="button"
                    disabled={!isCurrent || (isSharedView && !canEdit) || isUpdating}
                    onClick={() => handleTogglePhase(phase.id)}
                    className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                      !isCurrent || (isSharedView && !canEdit) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      phase.isCompleted
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-bg-secondary hover:bg-bg-card text-text-secondary hover:text-text-primary border-border-subtle hover:border-accent/50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${
                        phase.isCompleted
                          ? "bg-emerald-500 text-white border-emerald-400"
                          : "border-border-subtle bg-bg-card"
                      }`}
                    >
                      {phase.isCompleted ? "✓" : ""}
                    </span>

                    <span>
                      {isUpdating
                        ? "Saving..."
                        : phase.isCompleted
                        ? "Completed"
                        : "Mark Complete"}
                    </span>
                  </button>
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
                        Learning Objectives
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
                        Recommended Courses
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
                                    Platform: <span className="text-text-secondary">{course.platform}</span>
                                    {course.durationHours && ` • ${course.durationHours} Hours`}
                                  </span>
                                </div>

                                {course.url && (
                                  <a
                                    href={course.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium text-accent hover:underline shrink-0"
                                    title="Open verified course"
                                  >
                                    <span>Learn ↗</span>
                                  </a>
                                )}
                              </div>

                              {/* Course Tags */}
                              {(course.isFree || course.isHrdCorpClaimable) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {course.isFree && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Free / Audit Available
                                    </span>
                                  )}
                                  {course.isHrdCorpClaimable && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      HRD Corp Claimable
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
                        Self-directed experiential learning projects.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
