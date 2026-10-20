"use client";

import React, { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { PlanData, PlanPhase } from "./planData";
import { FileFormatIcon } from "@/lib/fileIcons";

interface PlanDetailViewProps {
  plan: PlanData;
  onBack?: () => void;
  isSharedView?: boolean;
}

// Plan Detail View Component
// Comprehensive presentation of the selected plan's metrics, skills inventory, phase milestones, and interactive AI artifact verification.
// For history plans: completely sealed, read-only, non-interactive, and rendered in full grayscale ("全灰且不能操作").
export default function PlanDetailView({ plan, isSharedView = false }: PlanDetailViewProps) {
  const tCurrent = useTranslations("analysis.current");
  const tHistory = useTranslations("analysis.history");
  const tVerification = useTranslations("analysis.verification");

  const isCurrent = plan.isCurrent;

  // Track phase completion and verified artifacts dynamically (for current active plan).
  const [phases, setPhases] = useState<PlanPhase[]>(plan.phases);

  // Track selected upload files per phase before verification.
  const [stagedFiles, setStagedFiles] = useState<{ [phaseId: string]: File | null }>({});

  // Track active AI verification process.
  const [verifyingPhaseId, setVerifyingPhaseId] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<number>(1);

  // File input refs map for triggering file dialogs per phase.
  const fileInputRefs = useRef<{ [phaseId: string]: HTMLInputElement | null }>({});

  // Handle file selection for a specific phase.
  const handleFileChange = (phaseId: string, file: File | null) => {
    if (!isCurrent) return;
    setStagedFiles((prev) => ({ ...prev, [phaseId]: file }));
  };

  // Simulate stepped AI verification and record node completion.
  const handleStartVerification = (phaseId: string) => {
    if (!isCurrent) return;
    const stagedFile = stagedFiles[phaseId];
    if (!stagedFile) return;

    setVerifyingPhaseId(phaseId);
    setVerificationStep(1);

    setTimeout(() => setVerificationStep(2), 700);
    setTimeout(() => setVerificationStep(3), 1400);

    setTimeout(() => {
      // Mark phase node as completed with AI verification telemetry.
      setPhases((prevPhases) =>
        prevPhases.map((phase) => {
          if (phase.id === phaseId) {
            return {
              ...phase,
              isCompleted: true,
              badgeType: "completed",
              verifiedArtifact: {
                name: stagedFile.name,
                score: 97.8,
                timestamp: "Just now",
              },
            };
          }
          return phase;
        })
      );

      // Clear staged file and verification status.
      setStagedFiles((prev) => ({ ...prev, [phaseId]: null }));
      setVerifyingPhaseId(null);
      setVerificationStep(1);
    }, 2100);
  };

  // Count completed nodes.
  const completedCount = phases.filter((p) => p.isCompleted).length;

  return (
    <div
      className={`animate-fade-in flex flex-col gap-8 w-full ${
        !isCurrent ? "grayscale opacity-85 select-none" : ""
      }`}
    >
      {/* Sealed Locked Alert Banner for Historical Plans ("全灰且封锁锁定") */}
      {!isCurrent && (
        <div className="rounded-xl bg-bg-card/90 border border-border-subtle p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <span className="text-2xl shrink-0 mt-0.5">🔒</span>
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

      {/* Main Plan Overview Banner */}
      <div
        className={`relative rounded-2xl p-6 sm:p-8 overflow-hidden transition-all duration-300 ${
          isCurrent
            ? "bg-bg-card/90 backdrop-blur-2xl border-2 border-accent/40 shadow-[0_0_50px_var(--accent-glow)]"
            : "bg-bg-secondary/40 border border-border-subtle/70"
        }`}
      >
        {/* Ambient Top Glow Overlay (Active Current Plan Only) */}
        {isCurrent && (
          <div className="absolute top-0 left-1/4 w-1/2 h-36 bg-[radial-gradient(ellipse_at_top,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />
        )}

        {/* Top Meta Header */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border-subtle mb-6">
          <div className="flex items-center gap-3">
            {isCurrent ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-accent/20 text-accent border border-accent/40 uppercase">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                {tCurrent("badge")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider bg-text-muted/15 text-text-muted border border-border-subtle uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                {tHistory("badge")}
              </span>
            )}

            <span className="text-xs text-text-muted font-mono">
              Trajectory Code: {plan.code}
            </span>
          </div>

          <span className="text-xs font-mono text-text-secondary">
            {plan.date}
          </span>
        </div>

        {/* Role Title & Match Score Header */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">
          <div className="lg:col-span-2">
            <span
              className={`text-[11px] font-mono uppercase tracking-wider font-semibold block mb-1 ${
                isCurrent ? "text-accent" : "text-text-muted"
              }`}
            >
              {plan.roleCategory}
            </span>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-3">
              {plan.targetRole}
            </h2>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-0">
              {plan.description}
            </p>
          </div>

          {/* Match Score Display Card */}
          <div
            className={`rounded-xl border p-5 flex flex-col items-center text-center justify-center ${
              isCurrent
                ? "bg-bg-secondary/70 border-border-subtle"
                : "bg-bg-card/40 border-border-subtle/50"
            }`}
          >
            <span className="text-[11px] font-mono uppercase text-text-muted tracking-wider mb-1">
              {isCurrent ? tCurrent("match_score") : "Historical Match"}
            </span>

            <div className="flex items-baseline gap-1">
              <span
                className={`text-4xl font-extrabold font-mono ${
                  isCurrent ? "text-accent" : "text-text-primary"
                }`}
              >
                {plan.matchScore.toFixed(1)}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  isCurrent ? "text-accent" : "text-text-secondary"
                }`}
              >
                %
              </span>
            </div>

            <span className="text-[10px] text-text-muted font-mono mt-1">
              {plan.matchScoreBasis}
            </span>

            <div className="w-full bg-border-subtle rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isCurrent
                    ? "bg-linear-to-r from-accent to-accent-dim"
                    : "bg-text-secondary"
                }`}
                style={{ width: `${plan.matchScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Historical Notice Callout Banner */}
        {!isCurrent && (
          <div className="relative z-10 mt-4 p-4 rounded-xl bg-bg-card/60 border border-border-subtle flex items-start gap-3">
            <span className="text-text-muted text-sm mt-0.5">ℹ</span>
            <p className="text-xs text-text-muted leading-relaxed m-0">
              {plan.historyNote || tHistory("note")}
            </p>
          </div>
        )}
      </div>

      {/* Itemized Skills Inventory (Strengths, Gap, At-Risk) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Matched Strengths */}
        <div className="rounded-xl bg-bg-card/80 border border-positive/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
            <span className="w-2 h-2 rounded-full bg-positive shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-positive font-mono">
              {tCurrent("matched_strengths")} ({plan.matchedStrengths.length})
            </h3>
          </div>
          <ul className="flex flex-col gap-2 list-none p-0 m-0 text-xs text-text-primary">
            {plan.matchedStrengths.map((skill) => (
              <li key={skill} className="flex items-start gap-2">
                <span className="text-positive font-bold shrink-0">✓</span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Skills to Acquire (Gap) */}
        <div className="rounded-xl bg-bg-card/80 border border-warning/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
            <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warning font-mono">
              {tCurrent("skills_gap")} ({plan.skillsGap.length})
            </h3>
          </div>
          <ul className="flex flex-col gap-2 list-none p-0 m-0 text-xs text-text-primary">
            {plan.skillsGap.map((skill) => (
              <li key={skill} className="flex items-start gap-2">
                <span className="text-warning font-bold shrink-0">△</span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Automation Alerts (At-Risk Skills) */}
        <div className="rounded-xl bg-bg-card/80 border border-negative/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
            <span className="w-2 h-2 rounded-full bg-negative shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-negative font-mono">
              {tCurrent("at_risk_skills")} ({plan.atRiskSkills.length})
            </h3>
          </div>
          <ul className="flex flex-col gap-2 list-none p-0 m-0 text-xs text-text-primary">
            {plan.atRiskSkills.map((skill) => (
              <li key={skill} className="flex items-start gap-2">
                <span className="text-negative font-bold shrink-0">✕</span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3-Phase Grounded Roadmap Curriculum & AI Verification Section */}
      <div className="rounded-2xl bg-bg-card/80 border border-border-subtle p-6 sm:p-8">
        {/* Roadmap Timeline Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-6">
          <div className="flex items-center gap-3">
            <span className="text-accent text-xl">◈</span>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-text-primary tracking-tight">
                {tCurrent("roadmap_timeline")}
                {!isCurrent && (
                  <span className="text-xs font-mono font-normal text-text-muted ml-2">
                    (Read-Only Snapshot)
                  </span>
                )}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {isCurrent
                  ? "Complete phase milestones, upload verification artifacts, and unlock authenticated career progression."
                  : "Historical roadmap iteration preserved as immutable skill telemetry."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className="text-xs px-3 py-1 rounded-lg bg-bg-secondary border border-border-subtle text-text-muted">
              {plan.roadmapWeeks} • {plan.roadmapHours}
            </span>
            <span className="text-xs px-3 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold">
              {completedCount}/{phases.length} {tVerification("completed_badge")}
            </span>
          </div>
        </div>

        {/* Phase Stepper Progress Track */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {phases.map((phase, idx) => (
            <div
              key={phase.id}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                phase.isCompleted
                  ? "bg-positive/10 border-positive/30 text-positive"
                  : verifyingPhaseId === phase.id
                  ? "bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_var(--accent-glow)]"
                  : "bg-bg-secondary/40 border-border-subtle text-text-muted"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                  phase.isCompleted
                    ? "bg-positive text-bg-primary"
                    : verifyingPhaseId === phase.id
                    ? "bg-accent text-bg-primary animate-pulse"
                    : "bg-border-subtle text-text-secondary"
                }`}
              >
                {phase.isCompleted ? "✓" : idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider block truncate">
                  Phase {idx + 1}
                </span>
                <span className="text-xs font-bold text-text-primary block truncate">
                  {phase.title}
                </span>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded shrink-0">
                {!isCurrent
                  ? phase.isCompleted
                    ? tVerification("completed_badge")
                    : "Archived"
                  : phase.isCompleted
                  ? tVerification("completed_badge")
                  : verifyingPhaseId === phase.id
                  ? tVerification("verifying")
                  : tVerification("pending_badge")}
              </span>
            </div>
          ))}
        </div>

        {/* Phase Cards Breakdown */}
        <div className="flex flex-col gap-6">
          {phases.map((phase) => {
            const isPhaseVerifying = verifyingPhaseId === phase.id;
            const stagedFile = stagedFiles[phase.id];

            return (
              <div
                key={phase.id}
                className={`rounded-xl border p-5 sm:p-6 transition-all duration-300 ${
                  phase.isCompleted
                    ? "bg-bg-secondary/30 border-positive/30"
                    : isPhaseVerifying
                    ? "bg-bg-secondary/60 border-accent shadow-[0_0_25px_var(--accent-glow)]"
                    : "bg-bg-secondary/40 border-border-subtle"
                }`}
              >
                {/* Phase Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                      {phase.phase}
                    </span>
                    <span className="text-xs text-text-muted">•</span>
                    <span className="text-xs font-mono text-text-secondary">
                      {phase.detail}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {phase.isCompleted ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-positive/15 text-positive border border-positive/30">
                      <span>✓</span>
                      <span>{tVerification("completed_badge")}</span>
                    </span>
                  ) : !isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-text-muted/15 text-text-muted border border-border-subtle uppercase">
                      <span>🔒</span>
                      <span>Archived</span>
                    </span>
                  ) : isPhaseVerifying ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent/20 text-accent border border-accent/40 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                      <span>{tVerification("verifying")}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-text-muted/15 text-text-muted border border-border-subtle">
                      <span>○</span>
                      <span>{tVerification("in_progress_badge")}</span>
                    </span>
                  )}
                </div>

                {/* Phase Title & Overview */}
                <h4 className="text-base sm:text-lg font-bold text-text-primary tracking-tight mb-1.5">
                  {phase.title}
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-5">
                  {phase.desc}
                </p>

                {/* Grid: Left = Required Tasks to Do, Right = AI Upload Verification Box OR Sealed Locked Box */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                  {/* Left Column: Tasks */}
                  <div className="rounded-xl bg-bg-card/70 border border-border-subtle/80 p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary">
                        {tVerification("phase_tasks")}
                      </span>
                    </div>

                    <ul className="flex flex-col gap-2.5 list-none p-0 m-0 text-xs">
                      {phase.tasks.map((task, taskIdx) => (
                        <li key={taskIdx} className="flex items-start gap-2.5 text-text-secondary">
                          <span
                            className={`font-mono font-bold mt-0.5 shrink-0 ${
                              phase.isCompleted ? "text-positive" : "text-accent"
                            }`}
                          >
                            {phase.isCompleted ? "✓" : `0${taskIdx + 1}.`}
                          </span>
                          <span className={phase.isCompleted ? "text-text-primary" : "text-text-secondary"}>
                            {task}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right Column: AI Upload (Current Plan) OR Sealed Locked Box (History Plan) */}
                  {!isCurrent ? (
                    /* Read-Only Sealed Box for History Plans ("完全封锁，不能操作") */
                    <div className="rounded-xl bg-bg-card/50 border border-border-subtle/60 p-5 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl mb-2 opacity-60">🔒</span>
                      <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                        {tHistory("locked_phase_label")}
                      </span>
                      <p className="text-[11px] text-text-muted font-mono mt-1.5 max-w-xs leading-relaxed m-0">
                        {phase.isCompleted && phase.verifiedArtifact ? (
                          <span className="text-text-secondary block">
                            📄 {phase.verifiedArtifact.name} • Completed
                          </span>
                        ) : (
                          tHistory("locked_banner_desc")
                        )}
                      </p>
                    </div>
                  ) : (
                    /* Active Interactive AI Verification Box for Current Plan */
                    <div className="rounded-xl bg-bg-card/70 border border-border-subtle/80 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                          <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                            <span>🤖</span>
                            <span>{tVerification("upload_proof")}</span>
                          </span>

                          {phase.isCompleted && (
                            <span className="text-[10px] font-mono text-positive bg-positive/10 px-2 py-0.5 rounded border border-positive/30">
                              {tVerification("passed")}
                            </span>
                          )}
                        </div>

                        {/* State 1: Already Verified & Completed */}
                        {phase.isCompleted && phase.verifiedArtifact ? (
                          <div className="p-3.5 rounded-lg bg-positive/10 border border-positive/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileFormatIcon
                                fileOrName={phase.verifiedArtifact.name}
                                className="w-10 h-10 rounded-lg shadow-sm shrink-0"
                                iconClassName="w-5 h-5"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-mono font-bold text-text-primary block truncate">
                                  {phase.verifiedArtifact.name}
                                </span>
                                <span className="text-[10px] font-mono text-positive block mt-0.5">
                                  Verified by AI • {phase.verifiedArtifact.score}% Confidence • {phase.verifiedArtifact.timestamp}
                                </span>
                              </div>
                            </div>

                            <div className="w-6 h-6 rounded-full bg-positive text-bg-primary flex items-center justify-center font-bold text-xs shrink-0">
                              ✓
                            </div>
                          </div>
                        ) : isPhaseVerifying ? (
                          /* State 2: Actively Verifying with AI */
                          <div className="p-4 rounded-lg bg-bg-secondary/80 border border-accent/40 font-mono text-xs animate-fade-in space-y-2.5">
                            <div className="flex items-center gap-2 text-accent font-bold">
                              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                              <span>
                                {verificationStep === 1 && "Stage 1: Extracting Skill Signatures & Code Artifacts..."}
                                {verificationStep === 2 && "Stage 2: Benchmarking Competencies Against ESCO Taxonomies..."}
                                {verificationStep === 3 && "Stage 3: Authenticating Milestone & Committing Telemetry..."}
                              </span>
                            </div>

                            {/* Stepper Progress Bar */}
                            <div className="w-full bg-border-subtle rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-accent h-full transition-all duration-500"
                                style={{ width: `${(verificationStep / 3) * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : isSharedView ? (
                          /* State 2.5: Peer Read-Only View of In-Progress Milestone */
                          <div className="p-4 rounded-lg bg-bg-secondary/40 border border-dashed border-border-subtle text-center py-6">
                            <span className="text-xl mb-1.5 block">⏳</span>
                            <span className="text-xs font-mono font-medium text-text-secondary block">
                              Peer Milestone In Progress
                            </span>
                            <span className="text-[11px] text-text-muted font-mono mt-1 block">
                              This milestone is awaiting artifact submission by the owner.
                            </span>
                          </div>
                        ) : (
                          /* State 3: Ready for User Upload & Verification */
                          <div>
                            {/* Hidden Native File Input */}
                            <input
                              type="file"
                              ref={(el) => {
                                fileInputRefs.current[phase.id] = el;
                              }}
                              accept=".pdf,.docx,.png,.zip,.jpg"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileChange(phase.id, e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />

                            {stagedFile ? (
                              /* Staged Selected File Card */
                              <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileFormatIcon
                                    fileOrName={stagedFile}
                                    className="w-9 h-9 rounded-md shadow-xs shrink-0"
                                    iconClassName="w-4 h-4"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-xs font-mono font-semibold text-text-primary block truncate">
                                      {stagedFile.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-text-muted block">
                                      {(stagedFile.size / 1024).toFixed(1)} KB • Ready for AI Validation
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleFileChange(phase.id, null)}
                                  className="text-xs text-negative hover:underline font-mono bg-transparent border-none cursor-pointer shrink-0"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              /* Dropzone Click Area */
                              <div
                                onClick={() => fileInputRefs.current[phase.id]?.click()}
                                className="border border-dashed border-border-subtle hover:border-accent bg-bg-secondary/30 hover:bg-bg-secondary/60 rounded-lg p-4 text-center cursor-pointer transition-all duration-200 mb-3"
                              >
                                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto mb-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                </div>
                                <p className="text-xs font-semibold text-text-primary mb-0.5">
                                  {tVerification("upload_proof")}
                                </p>
                                <p className="text-[10px] text-text-muted font-mono m-0">
                                  {tVerification("upload_hint")}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action: Trigger AI Verification */}
                      {!phase.isCompleted && !isPhaseVerifying && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleStartVerification(phase.id)}
                            disabled={!stagedFile}
                            className="px-4 py-2 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span>🤖</span>
                            <span>{tVerification("btn_verify")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
