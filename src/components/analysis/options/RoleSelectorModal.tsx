"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePlanModal } from "@/context/analysis/PlanModalContext";
import Logo from "@/components/Logo";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  MatchedRole,
  AnalyzeResponsePayload,
} from "@/lib/analysis/types";
import {
  analyzeWorkforceProfileStream,
  synthesizeSelectedRoadmap,
  convertAssessmentToPlanData,
} from "@/lib/analysis/client";
import { useAuth } from "@/context/auth/AuthContext";
import {
  MOCK_ROLE_SELECTOR_ANALYSIS_RESULT,
  USE_ROLE_SELECTOR_MODAL_MOCK_DATA,
} from "@/constants/testing/roleSelector";

type MacroScenarioType = "moderate" | "accelerated_ai" | "green_economy";

interface ScenarioConfig {
  id: MacroScenarioType;
  labelKey: string;
  descriptionKey: string;
  multiplierBadge: string;
  badgeStyle: string;
}

const SCENARIO_OPTIONS: ScenarioConfig[] = [
  {
    id: "moderate",
    labelKey: "scenario_baseline",
    descriptionKey: "scenario_baseline_desc",
    multiplierBadge: "1.0x",
    badgeStyle: "bg-border-subtle/60 text-text-muted",
  },
  {
    id: "accelerated_ai",
    labelKey: "scenario_ai_surge",
    descriptionKey: "scenario_ai_surge_desc",
    multiplierBadge: "+15% AI",
    badgeStyle: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  },
  {
    id: "green_economy",
    labelKey: "scenario_green_esg",
    descriptionKey: "scenario_green_esg_desc",
    multiplierBadge: "+15% ESG",
    badgeStyle: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
];

// --- Role Selector Modal ---
// Stream role matches, let the user choose a scenario and role, then persist a tailored roadmap.
export default function RoleSelectorModal() {
  const locale = useLocale();
  const t = useTranslations("analysis.roles");
  const { user } = useAuth();
  const { activeModal, activeProfile, openWizardOption, closeModals, saveActivePlan, targetUserId } =
    usePlanModal();

  // --- State ---
  // Execution phases:
  // 1. isMatching: Stage 1 stream running (progress 15% -> 50%)
  // 2. !isMatching && !isSynthesizing: Role selection view (progress paused at 50%)
  // 3. isSynthesizing: Stage 2 synthesis & DB persistence (progress 50% -> 100%)
  const [isMatching, setIsMatching] = useState<boolean>(
    !USE_ROLE_SELECTOR_MODAL_MOCK_DATA
  );
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(
    USE_ROLE_SELECTOR_MODAL_MOCK_DATA ? 50 : 15
  );

  const [loadingTitle, setLoadingTitle] = useState<string>("");
  const [loadingSubtitle, setLoadingSubtitle] = useState<string>("");

  const [topRoles, setTopRoles] = useState<MatchedRole[]>(
    USE_ROLE_SELECTOR_MODAL_MOCK_DATA
      ? MOCK_ROLE_SELECTOR_ANALYSIS_RESULT.topRoles
      : []
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    USE_ROLE_SELECTOR_MODAL_MOCK_DATA
      ? MOCK_ROLE_SELECTOR_ANALYSIS_RESULT.topRoles[0]?.roleId ?? null
      : null
  );
  const [selectedScenario, setSelectedScenario] = useState<MacroScenarioType>("moderate");
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeResponsePayload | null>(
      USE_ROLE_SELECTOR_MODAL_MOCK_DATA
        ? MOCK_ROLE_SELECTOR_ANALYSIS_RESULT
        : null
    );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen =
    USE_ROLE_SELECTOR_MODAL_MOCK_DATA || activeModal === "role_select";
  const isMatchingView = !USE_ROLE_SELECTOR_MODAL_MOCK_DATA && isMatching;
  const isSynthesizingView = !USE_ROLE_SELECTOR_MODAL_MOCK_DATA && isSynthesizing;
  const rawRolesToDisplay = USE_ROLE_SELECTOR_MODAL_MOCK_DATA
    ? MOCK_ROLE_SELECTOR_ANALYSIS_RESULT.topRoles
    : topRoles;
  const rolesToDisplay = rawRolesToDisplay.filter(
    (role, index, self) =>
      index === self.findIndex((r) => r.roleId === role.roleId)
  );
  const roleIdToDisplay =
    selectedRoleId ??
    (USE_ROLE_SELECTOR_MODAL_MOCK_DATA
      ? MOCK_ROLE_SELECTOR_ANALYSIS_RESULT.topRoles[0]?.roleId ?? null
      : rolesToDisplay[0]?.roleId ?? null);
  const activeScenario =
    SCENARIO_OPTIONS.find((scenario) => scenario.id === selectedScenario) ?? SCENARIO_OPTIONS[0];

  // --- Role Matching ---
  // 1. On open, POST the saved profile to /api/analysis/analyze with action=stream.
  // 2. Stream progress and matching scenarios into the modal; stop at 50% until a role is chosen.
  useEffect(() => {
    if (USE_ROLE_SELECTOR_MODAL_MOCK_DATA) return;
    if (!isOpen || !activeProfile) return;

    let isCancelled = false;
    const requestController = new AbortController();
    setErrorMessage(null);
    setTopRoles([]);
    setSelectedRoleId(null);
    setAnalysisResult(null);
    setIsMatching(true);
    setIsSynthesizing(false);
    setProgressPercent(15);

    setLoadingTitle(t("matching_title"));
    setLoadingSubtitle(t("matching_description"));

    const runRoleMatching = async () => {
      try {
        const payload = {
          locale,
          macroScenario: "moderate" as const,
          profile: activeProfile,
          autoSynthesizeRoadmap: false,
        };

        const result = await analyzeWorkforceProfileStream(
          payload,
          (evt) => {
            if (isCancelled) return;

            // Map stream phases (1 to 4) smoothly across 15% -> 50%
            if (evt.percent) {
              const mappedPercent = Math.min(
                50,
                Math.max(15, Math.round(evt.percent * 0.5))
              );
              setProgressPercent(mappedPercent);
            }

            if (evt.phase === 1) {
              setLoadingTitle(t("matching_phase_1_title"));
              setLoadingSubtitle(t("matching_phase_1_description"));
            } else if (evt.phase === 2) {
              setLoadingTitle(t("matching_phase_2_title"));
              setLoadingSubtitle(t("matching_phase_2_description"));
            } else if (evt.phase === 3) {
              setLoadingTitle(t("matching_phase_3_title"));
              setLoadingSubtitle(t("matching_phase_3_description"));
            } else if (evt.phase === 4 || evt.phase === 5) {
              setLoadingTitle(t("matching_phase_4_title"));
              setLoadingSubtitle(t("matching_phase_4_description"));
            }
          },
          requestController.signal
        );

        if (!isCancelled && result && result.topRoles && result.topRoles.length > 0) {
          const scenarioKey = "moderate";
          const rawRoles = result.scenarioRoles?.[scenarioKey] || result.topRoles;
          const rolesForScenario = rawRoles.filter(
            (r, idx, self) => idx === self.findIndex((x) => x.roleId === r.roleId)
          );
          setTopRoles(rolesForScenario);
          setSelectedRoleId(rolesForScenario[0]?.roleId || null);
          setAnalysisResult(result);
          setSelectedScenario("moderate");
          // Keep progress bar at 50% for user action
          setProgressPercent(50);
          setIsMatching(false);
        } else if (!isCancelled && (!result || !result.topRoles || result.topRoles.length === 0)) {
          throw new Error(t("no_matching_roles"));
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setIsMatching(false);
          console.error("[RoleSelectorModal] Matching error:", err);
          const isTimeout =
            err instanceof Error &&
            (err.message === "MATCHING_TIMEOUT" ||
              (err as any).code === "MATCHING_TIMEOUT");

          setErrorMessage(
            isTimeout
              ? t("matching_timeout")
              : err instanceof Error
                ? err.message
                : t("matching_failed")
          );
        }
      }
    };

    runRoleMatching();

    return () => {
      isCancelled = true;
      requestController.abort();
    };
  }, [isOpen, activeProfile, locale, t]);

  // Switch scenarios using the already returned result; no new matching request is needed.
  const handleScenarioChange = (newScenario: MacroScenarioType) => {
    setSelectedScenario(newScenario);
    const result = USE_ROLE_SELECTOR_MODAL_MOCK_DATA
      ? MOCK_ROLE_SELECTOR_ANALYSIS_RESULT
      : analysisResult;
    const rawCandidates =
      result?.scenarioRoles?.[newScenario] || result?.topRoles || topRoles;
    const candidateRoles = rawCandidates.filter(
      (r, idx, self) => idx === self.findIndex((x) => x.roleId === r.roleId)
    );
    setTopRoles(candidateRoles);
    if (!candidateRoles.some((r) => r.roleId === roleIdToDisplay)) {
      setSelectedRoleId(candidateRoles[0]?.roleId || null);
    }
  };

  // --- Roadmap Synthesis ---
  // 3. POST the chosen role and scenario with action=synthesize. The API generates phases,
  //    archives the previous current roadmap, and commits the new current roadmap atomically.
  // 4. Cache the returned plan locally, dispatch roadmap-refresh, then close the modal.
  const handleConfirmRole = async () => {
    if (!activeProfile || !selectedRoleId || isSynthesizing) return;

    const chosenRole = topRoles.find((r) => r.roleId === selectedRoleId) || topRoles[0];
    if (!chosenRole) return;

    try {
      setErrorMessage(null);
      setIsSynthesizing(true);

      // Do NOT reset progress bar - continue from 50% up to 100%!
      setProgressPercent(60);
      setLoadingTitle(t("synthesis_title"));
      setLoadingSubtitle(t("synthesis_description", { role: chosenRole.titleLocalized || chosenRole.title }));

      const synthesizeReq = {
        userId: targetUserId || user?.id,
        sessionId: analysisResult?.sessionId,
        assessmentId: analysisResult?.assessmentId,
        locale,
        macroScenario: selectedScenario,
        targetRoleId: chosenRole.roleId,
        profile: activeProfile,
        topRoles,
        radarData: analysisResult?.radarData,
      };

      // Progress bar moves to 75%
      setTimeout(() => {
        setProgressPercent((prev) => Math.max(prev, 75));
      }, 400);

      const resp = await synthesizeSelectedRoadmap(synthesizeReq);

      // Synthesis completed, progress advances to 90%
      setProgressPercent(90);
      setLoadingTitle(t("saving_title"));
      setLoadingSubtitle(t("saving_description"));

      // Brief delay to let the user see the database persistence feedback
      await new Promise((resolve) => setTimeout(resolve, 600));

      setProgressPercent(100);
      setLoadingTitle(t("complete_title"));

      const planData = convertAssessmentToPlanData(resp, chosenRole);
      saveActivePlan(planData);

      // Dispatch refresh event immediately after DB save is confirmed so the page
      // re-fetches guaranteed-fresh data before the modal animates out.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("roadmap-refresh"));
      }

      // Close modal smoothly after a short cosmetic delay
      setTimeout(() => {
        setIsSynthesizing(false);
        closeModals();
      }, 500);
    } catch (err: unknown) {
      setIsSynthesizing(false);
      setErrorMessage(
        err instanceof Error ? err.message : t("synthesis_failed")
      );
    }
  };

  if (!isOpen) return null;

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMatchingView && !isSynthesizingView) {
          closeModals();
        }
      }}
    >
      {/* Modal Container: Matches Option 1 & 2 */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-bg-card/95 border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
      >
        {/* Top Controls: Back, Brand & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openWizardOption}
              disabled={isMatchingView || isSynthesizingView}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
              aria-label={t("back")}
              title={t("back")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <Logo size="sm" />
          </div>

          <button
            type="button"
            onClick={closeModals}
            disabled={isMatchingView || isSynthesizingView}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
            aria-label={t("close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dynamic Body: Loading State VS Role Selection List */}
        {isMatchingView || isSynthesizingView ? (
          /* Loading Animation (Replaces modal body with persistent progress bar) */
          <div className="flex-1 flex items-center justify-center py-12 sm:py-16 px-4">
            <LoadingSpinner
              title={loadingTitle}
              subtitle={loadingSubtitle}
              showProgressBar={true}
              progressPercent={progressPercent}
              progressBarClassName="h-1.5"
              size="md"
            />
          </div>
        ) : (
          /* Role Selection View */
          <>
            {/* Header Title & Subtitle */}
            <div className="mb-5 shrink-0">
              <h3 className="text-lg font-bold text-text-primary tracking-tight mb-1">
                {t("recommended_title")}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("recommended_description")}
              </p>
            </div>

            {/* Macro Scenario Simulation Switcher */}
            <div className="mb-4 shrink-0">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[11px] font-mono font-medium text-text-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  {t("scenario_title")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-bg-secondary/40 border border-border-subtle">
                {SCENARIO_OPTIONS.map((scen) => {
                  const isActive = selectedScenario === scen.id;
                  return (
                    <button
                      key={scen.id}
                      type="button"
                      onClick={() => handleScenarioChange(scen.id)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isActive
                          ? "bg-accent/15 border-accent text-accent font-bold shadow-[0_0_12px_var(--accent-glow)]"
                          : "border-transparent text-text-muted hover:text-text-primary hover:bg-bg-elevated/40"
                      }`}
                    >
                      <span className="truncate">{t(scen.labelKey)}</span>
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 hidden md:inline-block ${scen.badgeStyle}`}
                      >
                        {scen.multiplierBadge}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-[10px] font-mono leading-relaxed text-text-muted">
                {t(activeScenario.descriptionKey)}
              </p>
            </div>

            {/* Error Message: Plain red text, no background, no border */}
            {errorMessage && (
              <p className="mb-3 text-xs text-rose-400 font-mono animate-fade-in shrink-0">
                {errorMessage}
              </p>
            )}

            {/* Scrollable Roles List */}
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-3">
              {rolesToDisplay.map((role, idx) => {
                const isSelected = roleIdToDisplay === role.roleId;
                const matchPct = Math.round(role.matchScore * 100);
                const strengths = role.matchedStrengths?.slice(0, 3) ?? [];
                const reason = strengths.length
                  ? t("reason_with_strengths", {
                      skills: strengths.join(t("strength_separator")),
                    })
                  : t("reason_general");

                return (
                  <div
                    key={`${role.roleId}-${idx}`}
                    onClick={() => {
                      setSelectedRoleId(role.roleId);
                      setErrorMessage(null);
                    }}
                    className={`rounded-xl border p-4 sm:p-5 text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? "border-accent bg-accent/10 shadow-[0_0_15px_var(--accent-glow)]"
                        : "border-border-subtle bg-bg-secondary/30 hover:border-accent/60 hover:bg-bg-secondary/60"
                    }`}
                  >
                    {/* Line 1: (Role) and (%Match) */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs sm:text-sm font-bold font-mono text-text-primary">
                        {idx + 1}. {role.titleLocalized || role.title}
                      </span>
                      <span className="text-xs font-mono font-bold text-accent shrink-0">
                        {t("match_score", { percent: matchPct })}
                      </span>
                    </div>

                    {/* Line 2: (SDG) - Plain text, no emoji, no background, no border. Shows full name on hover */}
                    {role.sdgAlignments && role.sdgAlignments.length > 0 && (
                      <div className="text-[11px] font-mono text-emerald-400 mt-1 flex flex-wrap gap-x-2">
                        {role.sdgAlignments.map((sdg, sIdx) => (
                          <span
                            key={`${sdg.targetCode}-${sIdx}`}
                            title={`${sdg.targetCode}: ${sdg.targetTitle}`}
                            className="cursor-help hover:underline"
                          >
                            {sdg.targetCode}
                            {sIdx < role.sdgAlignments.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Line 3: (Reason) - Short, plain text */}
                    <p className="text-[11px] sm:text-xs text-text-secondary mt-1.5 leading-snug">
                      {reason}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Footer */}
            <div className="flex items-center justify-end pt-4 border-t border-border-subtle mt-4 shrink-0">
              <button
                type="button"
                onClick={handleConfirmRole}
                disabled={!selectedRoleId || !activeProfile}
                className="px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {t("confirm_generate")}
                </span>
                <span>→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
