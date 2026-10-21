"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";
import Logo from "@/components/Logo";
import {
  MatchedRole,
  AnalyzeResponsePayload,
  analyzeWorkforceProfileStream,
  synthesizeSelectedRoadmap,
  convertAssessmentToPlanData,
  ProfileIntakePayload,
} from "@/lib/fastapi/client";

export default function RoleSelectorModal() {
  const locale = useLocale();
  const { activeModal, activeProfile, closeModals, saveActivePlan } = usePlanModal();

  const [phase, setPhase] = useState<number>(1);
  const [phaseTitle, setPhaseTitle] = useState<string>("Initializing Intake Telemetry...");
  const [phaseDetail, setPhaseDetail] = useState<string>("Connecting to FastAPI microservice...");
  const [progressPercent, setProgressPercent] = useState<number>(15);

  const [topRoles, setTopRoles] = useState<MatchedRole[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponsePayload | null>(null);

  const [activeScenario, setActiveScenario] = useState<"moderate" | "accelerated_ai" | "green_economy">("moderate");
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizingRoleTitle, setSynthesizingRoleTitle] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = activeModal === "role_select";

  // Execute Stage 1 matching pipeline when modal opens with activeProfile
  useEffect(() => {
    if (!isOpen || !activeProfile) return;

    let isMounted = true;
    setErrorMsg(null);
    setTopRoles([]);
    setAnalysisResult(null);
    setPhase(1);
    setProgressPercent(20);
    setPhaseTitle("Phase 1: Auditing Automation Risk");
    setPhaseDetail("Auditing competencies against live Supabase trend signals...");

    const runStream = async () => {
      try {
        const payload = {
          locale,
          macroScenario: activeScenario,
          profile: activeProfile,
          autoSynthesizeRoadmap: false,
        };

        const result = await analyzeWorkforceProfileStream(payload, (evt) => {
          if (!isMounted) return;
          if (evt.phase) setPhase(evt.phase);
          if (evt.title) setPhaseTitle(evt.title);
          if (evt.detail) setPhaseDetail(evt.detail);
          if (evt.percent) setProgressPercent(evt.percent);
          if (evt.error) setErrorMsg(evt.error);
        });

        if (isMounted && result && result.topRoles) {
          setTopRoles(result.topRoles);
          setAnalysisResult(result);
          setProgressPercent(100);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err);
          setErrorMsg(message || "Role discovery failed. Please ensure FastAPI microservice is online.");
        }
      }
    };

    runStream();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeProfile, activeScenario, locale]);

  // Stage 2: User explicitly selects one of the top 5 roles
  const handleSelectRole = async (role: MatchedRole) => {
    if (!activeProfile || isSynthesizing) return;

    try {
      setIsSynthesizing(true);
      setSynthesizingRoleTitle(role.titleLocalized || role.title);

      const synthesizeReq = {
        sessionId: analysisResult?.sessionId,
        assessmentId: analysisResult?.assessmentId,
        locale,
        macroScenario: activeScenario,
        targetRoleId: role.roleId,
        profile: activeProfile,
        topRoles,
        radarData: analysisResult?.radarData,
      };

      const resp = await synthesizeSelectedRoadmap(synthesizeReq);
      const planData = convertAssessmentToPlanData(resp, role);

      saveActivePlan(planData);
      closeModals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || "Roadmap synthesis failed. Please try again.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[92vh] bg-bg-card/95 border border-border-subtle rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-fade-in-up"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-subtle bg-bg-card/70 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size="sm" showBeta />
            <div className="h-4 w-px bg-border-subtle hidden sm:block" />
            <span className="text-xs font-mono font-bold tracking-wider text-accent uppercase hidden sm:inline-block">
              Stage {topRoles.length > 0 ? "2: Commit & Reskill" : "1: Match & Discover"}
            </span>
          </div>

          <button
            type="button"
            onClick={closeModals}
            disabled={isSynthesizing}
            className="text-text-muted hover:text-text-primary p-2 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Synthesizing Overlay */}
          {isSynthesizing && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
                <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Synthesizing Personalized Reskilling Roadmap
                </h3>
                <p className="text-xs text-accent font-mono mt-1 font-semibold">
                  Target Horizon: {synthesizingRoleTitle}
                </p>
                <p className="text-xs text-text-secondary max-w-md mx-auto mt-2 leading-relaxed">
                  Querying Google Gemini 1.5 Flash for customized 3-phase curriculum, grounding
                  recommendations in free Coursera/edX tracks and Malaysian HRD Corp claimable modules.
                </p>
              </div>
            </div>
          )}

          {/* Phase Progress Bar (While evaluating Stage 1) */}
          {!isSynthesizing && topRoles.length === 0 && !errorMsg && (
            <div className="py-10 space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span>Real-Time Computation Telemetry</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                  {phaseTitle}
                </h3>
                <p className="text-xs text-text-secondary max-w-lg mx-auto font-mono">
                  {phaseDetail}
                </p>
              </div>

              {/* Glowing Progress Track */}
              <div className="max-w-xl mx-auto space-y-2">
                <div className="w-full bg-bg-secondary rounded-full h-2.5 overflow-hidden border border-border-subtle shadow-inner">
                  <div
                    className="bg-accent h-full transition-all duration-500 shadow-[0_0_15px_var(--accent-glow-strong)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-text-muted">
                  <span>Phase {phase} of 4</span>
                  <span>{progressPercent}% Complete</span>
                </div>
              </div>

              {/* Stepper Checklist */}
              <div className="max-w-md mx-auto grid grid-cols-2 gap-2 text-xs font-mono">
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${phase >= 1 ? "border-accent/40 bg-accent/10 text-accent" : "border-border-subtle text-text-muted"}`}>
                  <span>{phase > 1 ? "✓" : "◈"}</span>
                  <span>1. Trend Signals Audit</span>
                </div>
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${phase >= 2 ? "border-accent/40 bg-accent/10 text-accent" : "border-border-subtle text-text-muted"}`}>
                  <span>{phase > 2 ? "✓" : "◈"}</span>
                  <span>2. BGE-M3 1024-d Vector</span>
                </div>
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${phase >= 3 ? "border-accent/40 bg-accent/10 text-accent" : "border-border-subtle text-text-muted"}`}>
                  <span>{phase > 3 ? "✓" : "◈"}</span>
                  <span>3. Supabase HNSW Search</span>
                </div>
                <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${phase >= 4 ? "border-accent/40 bg-accent/10 text-accent" : "border-border-subtle text-text-muted"}`}>
                  <span>{phase >= 4 ? "✓" : "◈"}</span>
                  <span>4. SDG Calibration</span>
                </div>
              </div>
            </div>
          )}

          {/* Error View */}
          {errorMsg && (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-negative/15 border border-negative/30 text-negative flex items-center justify-center mx-auto text-xl">
                ✕
              </div>
              <h3 className="text-lg font-bold text-text-primary">Pipeline Execution Warning</h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto font-mono">
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setPhase(1);
                }}
                className="px-5 py-2 text-xs font-mono font-semibold bg-accent text-bg-primary rounded-lg border-none cursor-pointer hover:opacity-90 transition-all"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {/* Top 5 Matched Roles Selection List */}
          {!isSynthesizing && topRoles.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Title & Scenario Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                    Top 5 Recommended Future-Ready Roles
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Ranked by BGE-M3 vector cosine similarity and soft skill overlap against 104 standardized ESCO roles.
                    Choose your desired career path to synthesize your personalized reskilling plan.
                  </p>
                </div>

                {/* Macro Scenario Toggle */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-bg-secondary border border-border-subtle shrink-0">
                  <span className="text-[10px] font-mono text-text-muted px-2">Scenario:</span>
                  {[
                    { id: "moderate", label: "Moderate" },
                    { id: "accelerated_ai", label: "AI Shock" },
                    { id: "green_economy", label: "Green" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveScenario(s.id as "moderate" | "accelerated_ai" | "green_economy")}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-md border-none cursor-pointer transition-all ${
                        activeScenario === s.id
                          ? "bg-accent text-bg-primary font-bold shadow-sm"
                          : "bg-transparent text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roles Cards Stack */}
              <div className="space-y-4">
                {topRoles.map((role, idx) => {
                  const scorePct = Math.round(role.matchScore * 1000) / 10;
                  const isTopMatch = idx === 0;

                  return (
                    <div
                      key={role.roleId}
                      className={`rounded-xl border p-4 sm:p-5 transition-all duration-300 ${
                        isTopMatch
                          ? "border-accent/60 bg-bg-secondary/70 shadow-[0_0_30px_var(--accent-glow)]"
                          : "border-border-subtle hover:border-border-accent/40 bg-bg-secondary/40 hover:bg-bg-secondary/60"
                      }`}
                    >
                      {/* Top Row: Rank, Title, Match Score */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-bg-card border border-border-subtle text-text-muted">
                              #{idx + 1} Candidate
                            </span>
                            <span className="text-[11px] font-mono text-accent font-semibold px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                              {role.industry}
                            </span>
                            {role.scenarioMultiplierApplied > 1 && (
                              <span className="text-[10px] font-mono text-positive bg-positive/10 border border-positive/30 px-1.5 py-0.5 rounded">
                                +{Math.round((role.scenarioMultiplierApplied - 1) * 100)}% {activeScenario.replace("_", " ")} boost
                              </span>
                            )}
                          </div>

                          <h4 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                            {role.titleLocalized || role.title}
                            {role.titleLocalized && role.titleLocalized !== role.title && (
                              <span className="text-xs text-text-muted font-normal ml-2">
                                ({role.title})
                              </span>
                            )}
                          </h4>
                        </div>

                        {/* Match Score Badge */}
                        <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
                          <div className="flex items-baseline gap-1 bg-accent/15 border border-accent/30 rounded-lg px-3 py-1.5">
                            <span className="text-lg font-mono font-black text-accent">{scorePct}%</span>
                            <span className="text-[10px] font-mono text-text-secondary uppercase">Match</span>
                          </div>
                        </div>
                      </div>

                      {/* UN SDG Impact Statement Box (MANDATORY REQUIREMENT) */}
                      {role.sdgAlignments && role.sdgAlignments.length > 0 && (
                        <div className="rounded-lg bg-bg-card/80 border border-border-subtle p-3 mb-3.5 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-text-muted uppercase">
                              UN Sustainable Development Goals (SDG) Alignment:
                            </span>
                            {role.sdgAlignments.map((sdg) => (
                              <span
                                key={sdg.targetCode}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              >
                                <span>🌐</span>
                                <span>{sdg.targetCode}: {sdg.targetTitle}</span>
                                <span className="opacity-70">({Math.round(sdg.affinityScore * 100)}%)</span>
                              </span>
                            ))}
                          </div>

                          {/* How choosing this career path contributes to the UN SDGs */}
                          {role.sdgAlignments[0]?.impactExplanation && (
                            <p className="text-xs text-text-secondary leading-relaxed pl-1 border-l-2 border-emerald-500/50">
                              <span className="font-semibold text-text-primary">Impact Contribution: </span>
                              {role.sdgAlignments[0].impactExplanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Skills Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs font-mono">
                        {/* Possessed Strengths */}
                        <div className="p-2.5 rounded-lg bg-bg-card/50 border border-border-subtle">
                          <span className="text-[10px] uppercase font-bold text-positive flex items-center gap-1 mb-1.5">
                            <span>✓</span> Overlapping Strengths ({role.matchedStrengths.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {role.matchedStrengths.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded text-[10px] bg-positive/10 text-positive border border-positive/20"
                              >
                                {s}
                              </span>
                            ))}
                            {role.matchedStrengths.length > 4 && (
                              <span className="text-[10px] text-text-muted self-center">
                                +{role.matchedStrengths.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Skills Gap */}
                        <div className="p-2.5 rounded-lg bg-bg-card/50 border border-border-subtle">
                          <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1 mb-1.5">
                            <span>⚡</span> Competencies to Acquire ({role.skillsGap.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {role.skillsGap.slice(0, 4).map((g) => (
                              <span
                                key={g}
                                className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              >
                                {g}
                              </span>
                            ))}
                            {role.skillsGap.length > 4 && (
                              <span className="text-[10px] text-text-muted self-center">
                                +{role.skillsGap.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Automation Risk Alert (if at-risk skills identified) */}
                      {role.atRiskCompetencies && role.atRiskCompetencies.length > 0 && (
                        <div className="mb-4 p-2 rounded-lg bg-negative/10 border border-negative/25 text-[11px] font-mono text-negative flex items-center gap-2">
                          <span>⚠️</span>
                          <span>
                            Automation Risk: {role.atRiskCompetencies.map(a => a.skillName).join(", ")} facing displacement pressure.
                          </span>
                        </div>
                      )}

                      {/* Select Action Button */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectRole(role)}
                          className={`px-5 py-2.5 text-xs font-mono font-bold rounded-lg border-none cursor-pointer tracking-wide flex items-center gap-2 transition-all shadow-sm ${
                            isTopMatch
                              ? "bg-accent text-bg-primary hover:opacity-95 shadow-[0_0_20px_var(--accent-glow-strong)]"
                              : "bg-bg-card hover:bg-accent text-text-primary hover:text-bg-primary border border-border-subtle hover:border-transparent"
                          }`}
                        >
                          <span>Choose this Career Path & Build Reskilling Plan</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
