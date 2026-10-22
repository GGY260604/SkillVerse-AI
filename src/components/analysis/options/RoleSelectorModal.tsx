"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";
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
import { useAuth } from "@/context/AuthContext";

/**
 * Generates an ultra-concise, single-sentence justification for why this role was matched.
 * Free of emojis, boxes, or decorative borders.
 */
function getRoleReason(role: MatchedRole, locale: string): string {
  if (role.matchedStrengths && role.matchedStrengths.length > 0) {
    const skillsList = role.matchedStrengths.slice(0, 3);
    if (locale === "zh") {
      return `基于您掌握的 ${skillsList.join("、")} 等基础，具备高度技能迁移与适应潜力。`;
    }
    if (locale === "ms") {
      return `Berdasarkan penguasaan anda dalam ${skillsList.join(", ")}, mempunyai kebolehsesuaian tinggi.`;
    }
    return `High transition potential based on your foundation in ${skillsList.join(", ")}.`;
  }

  if (locale === "zh") {
    return "高度契合您的职业发展方向与行业转型高增长需求。";
  }
  if (locale === "ms") {
    return "Sejajar dengan objektif transformasi kerjaya dan permintaan industri yang pesat membangun.";
  }
  return "Closely aligns with your career transition goals and high-growth industry demands.";
}

// --- Role Selector Modal ---
// Match prospective roles and synthesize a personalized learning roadmap.
type MacroScenarioType = "moderate" | "accelerated_ai" | "green_economy";

interface ScenarioConfig {
  id: MacroScenarioType;
  icon: string;
  label: Record<string, string>;
  description: Record<string, string>;
  multiplierBadge: string;
  badgeStyle: string;
}

const SCENARIO_OPTIONS: ScenarioConfig[] = [
  {
    id: "moderate",
    icon: "🌐",
    label: {
      en: "Baseline",
      ms: "Garis Dasar",
      zh: "稳健基准",
    },
    description: {
      en: "Standard economic growth trajectory (1.0x)",
      ms: "Trajektori pertumbuhan ekonomi standard (1.0x)",
      zh: "标准平稳经济增长预测轨迹 (1.0x)",
    },
    multiplierBadge: "1.0x",
    badgeStyle: "bg-border-subtle/60 text-text-muted",
  },
  {
    id: "accelerated_ai",
    icon: "⚡",
    label: {
      en: "AI Surge",
      ms: "Lonjakan AI",
      zh: "AI 颠覆浪潮",
    },
    description: {
      en: "Rapid AI & autonomous systems adoption (+15% Tech affinity)",
      ms: "Penggunaan pesat AI & automasi (+15% afiniti teknologi)",
      zh: "大模型与自动化智能体深度渗透 (+15% 技术亲和度)",
    },
    multiplierBadge: "+15% AI",
    badgeStyle: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  },
  {
    id: "green_economy",
    icon: "🌿",
    label: {
      en: "Green / ESG",
      ms: "Hijau / ESG",
      zh: "绿色与 ESG",
    },
    description: {
      en: "Net-zero transition & sustainability mandates (+15% ESG affinity)",
      ms: "Peralihan sifar bersih & mandat kelestarian (+15% afiniti ESG)",
      zh: "双碳绿色经济转型与可持续合规 (+15% ESG 亲和度)",
    },
    multiplierBadge: "+15% ESG",
    badgeStyle: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  },
];

export default function RoleSelectorModal() {
  // --- Context and Locale ---
  const locale = useLocale();
  const { user } = useAuth();
  const { activeModal, activeProfile, openWizardOption, closeModals, saveActivePlan, targetUserId } =
    usePlanModal();

  // --- State ---
  // Execution phases:
  // 1. isMatching: Stage 1 stream running (progress 15% -> 50%)
  // 2. !isMatching && !isSynthesizing: Role selection view (progress paused at 50%)
  // 3. isSynthesizing: Stage 2 synthesis & DB persistence (progress 50% -> 100%)
  const [isMatching, setIsMatching] = useState<boolean>(true);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(15);

  const [loadingTitle, setLoadingTitle] = useState<string>("");
  const [loadingSubtitle, setLoadingSubtitle] = useState<string>("");

  const [topRoles, setTopRoles] = useState<MatchedRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<MacroScenarioType>("moderate");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponsePayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = activeModal === "role_select";

  // --- Matching Effect ---
  // Stage 1: Trigger /api/analysis/analyze stream matching upon modal open
  useEffect(() => {
    if (!isOpen || !activeProfile) return;

    let isCancelled = false;
    setErrorMessage(null);
    setTopRoles([]);
    setSelectedRoleId(null);
    setAnalysisResult(null);
    setIsMatching(true);
    setIsSynthesizing(false);
    setProgressPercent(15);

    setLoadingTitle(
      locale === "zh"
        ? "正在评估高增长匹配岗位..."
        : locale === "ms"
        ? "Menilai Peranan Sesuai..."
        : "Evaluating Matching Future Roles..."
    );
    setLoadingSubtitle(
      locale === "zh"
        ? "正在通过高维向量相似度与技能重合度检索契合岗位..."
        : locale === "ms"
        ? "Menganalisis padanan vektor dan kecekapan kemahiran..."
        : "Analyzing vector similarities and skill overlaps against ESCO taxonomy..."
    );

    const runRoleMatching = async () => {
      try {
        const payload = {
          locale,
          macroScenario: "moderate" as const,
          profile: activeProfile,
          autoSynthesizeRoadmap: false,
        };

        const result = await analyzeWorkforceProfileStream(payload, (evt) => {
          if (isCancelled) return;
          if (evt.error) {
            setErrorMessage(evt.error);
          }

          // Map stream phases (1 to 4) smoothly across 15% -> 50%
          if (evt.percent) {
            const mappedPercent = Math.min(50, Math.max(15, Math.round(evt.percent * 0.5)));
            setProgressPercent(mappedPercent);
          }

          if (evt.phase === 1) {
            setLoadingTitle(
              locale === "zh"
                ? "正在审计技能自动化风险..."
                : locale === "ms"
                ? "Mengaudit Risiko Automasi..."
                : "Auditing Automation Risk..."
            );
            setLoadingSubtitle(
              locale === "zh"
                ? "对比实时行业趋势信号分析核心技能面临的替代压力..."
                : locale === "ms"
                ? "Menilai tekanan penggantian terhadap isyarat trend pasaran..."
                : "Auditing competencies against live workforce trend signals..."
            );
          } else if (evt.phase === 2) {
            setLoadingTitle(
              locale === "zh"
                ? "正在生成语义特征向量..."
                : locale === "ms"
                ? "Menjana Vektor Profil..."
                : "Generating Semantic Profile Vector..."
            );
            setLoadingSubtitle(
              locale === "zh"
                ? "构建 1024 维密集特征向量表征您的职业经历与能力..."
                : locale === "ms"
                ? "Membina vektor semantik profil 1024 dimensi..."
                : "Generating 1024-dimensional semantic profile vector..."
            );
          } else if (evt.phase === 3) {
            setLoadingTitle(
              locale === "zh"
                ? "正在检索职业分类库..."
                : locale === "ms"
                ? "Mencari Taksonomi Pekerjaan..."
                : "Searching Occupational Taxonomy..."
            );
            setLoadingSubtitle(
              locale === "zh"
                ? "在标准职业库中比对软技能与专业技能重叠度..."
                : locale === "ms"
                ? "Menilai pertindihan kemahiran dalam taksonomi standard..."
                : "Querying vector index & calculating soft skill overlaps..."
            );
          } else if (evt.phase === 4 || evt.phase === 5) {
            setLoadingTitle(
              locale === "zh"
                ? "正在校准联合国 SDG 目标匹配..."
                : locale === "ms"
                ? "Menentukur Penjajaran SDG..."
                : "Calibrating UN SDG Alignment..."
            );
            setLoadingSubtitle(
              locale === "zh"
                ? "校准可持续发展目标亲和度与能力雷达指标..."
                : locale === "ms"
                ? "Menentukur matlamat kelestarian dan radar kompetensi..."
                : "Calibrating radar axes & UN SDG impact goals..."
            );
          }
        });

        if (!isCancelled && result && result.topRoles && result.topRoles.length > 0) {
          const scenarioKey = "moderate";
          const rolesForScenario = result.scenarioRoles?.[scenarioKey] || result.topRoles;
          setTopRoles(rolesForScenario);
          setSelectedRoleId(rolesForScenario[0]?.roleId || null);
          setAnalysisResult(result);
          setSelectedScenario("moderate");
          // Keep progress bar at 50% for user action
          setProgressPercent(50);
          setIsMatching(false);
        } else if (!isCancelled && (!result || !result.topRoles || result.topRoles.length === 0)) {
          throw new Error("No matching prospective roles could be identified.");
        }
      } catch (err: any) {
        if (!isCancelled) {
          setIsMatching(false);
          setErrorMessage(err.message || "Failed to discover matching roles.");
        }
      }
    };

    runRoleMatching();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeProfile, locale]);

  // --- Role Selection Handler ---
  // Handles user switching between simulation scenarios
  const handleScenarioChange = (newScenario: MacroScenarioType) => {
    setSelectedScenario(newScenario);
    const candidateRoles = analysisResult?.scenarioRoles?.[newScenario] || analysisResult?.topRoles || topRoles;
    setTopRoles(candidateRoles);
    if (!candidateRoles.some((r) => r.roleId === selectedRoleId)) {
      setSelectedRoleId(candidateRoles[0]?.roleId || null);
    }
  };

  // Stage 2: User explicitly confirms role selection and synthesizes roadmap
  const handleConfirmRole = async () => {
    if (!activeProfile || !selectedRoleId || isSynthesizing) return;

    const chosenRole = topRoles.find((r) => r.roleId === selectedRoleId) || topRoles[0];
    if (!chosenRole) return;

    try {
      setErrorMessage(null);
      setIsSynthesizing(true);

      // Do NOT reset progress bar - continue from 50% up to 100%!
      setProgressPercent(60);
      setLoadingTitle(
        locale === "zh"
          ? "正在生成技能转型路线图..."
          : locale === "ms"
          ? "Menjana Pelan Kemahiran..."
          : "Synthesizing Reskilling Roadmap..."
      );
      setLoadingSubtitle(
        locale === "zh"
          ? `针对目标岗位「${chosenRole.titleLocalized || chosenRole.title}」规划三阶段学习路径与受认可课程...`
          : locale === "ms"
          ? `Merangka kurikulum 3 fasa untuk '${chosenRole.titleLocalized || chosenRole.title}'...`
          : `Formulating 3-phase curriculum for '${chosenRole.titleLocalized || chosenRole.title}'...`
      );

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
      setLoadingTitle(
        locale === "zh"
          ? "正在存入数据库..."
          : locale === "ms"
          ? "Menyimpan ke Pangkalan Data..."
          : "Saving Assessment to Database..."
      );
      setLoadingSubtitle(
        locale === "zh"
          ? "路线图生成完成，正在将评估记录与个人学习规划同步存入数据库..."
          : locale === "ms"
          ? "Menyegerakkan rekod penilaian dan pelan pembelajaran ke pangkalan data..."
          : "Synchronizing assessment record and milestones to database..."
      );

      // Brief delay to let the user see the database persistence feedback
      await new Promise((resolve) => setTimeout(resolve, 600));

      setProgressPercent(100);
      setLoadingTitle(
        locale === "zh"
          ? "规划生成完毕！"
          : locale === "ms"
          ? "Pelan Siap Dijana!"
          : "Roadmap Complete!"
      );

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
    } catch (err: any) {
      setIsSynthesizing(false);
      setErrorMessage(err.message || "Roadmap synthesis failed. Please try again.");
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
        if (e.target === e.currentTarget && !isMatching && !isSynthesizing) {
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
              disabled={isMatching || isSynthesizing}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
              aria-label="Back"
              title="Back"
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
            disabled={isMatching || isSynthesizing}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dynamic Body: Loading State VS Role Selection List */}
        {isMatching || isSynthesizing ? (
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
                {locale === "zh"
                  ? "推荐未来匹配岗位"
                  : locale === "ms"
                  ? "Peranan Masa Depan Disyorkan"
                  : "Recommended Future-Ready Roles"}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {locale === "zh"
                  ? "根据您的技能基准与发展意向计算出的最佳职业方向，请选择一个开启路线图："
                  : locale === "ms"
                  ? "Berdasarkan garis dasar kemahiran dan aspirasi kerjaya anda, pilih satu untuk menjana pelan:"
                  : "Select your preferred prospective horizon to generate your personalized reskilling roadmap:"}
              </p>
            </div>

            {/* Macro Scenario Simulation Switcher */}
            <div className="mb-4 shrink-0">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[11px] font-mono font-medium text-text-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  {locale === "zh"
                    ? "未来宏观模拟情景"
                    : locale === "ms"
                    ? "Mod Simulasi Makro Masa Depan"
                    : "Future Labor Market Scenario"}
                </span>
                <span className="text-[10px] font-mono text-text-muted hidden sm:inline-block">
                  {SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.description[locale] ||
                    SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.description.en}
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
                      <span className="text-sm shrink-0">{scen.icon}</span>
                      <span className="truncate">{scen.label[locale] || scen.label.en}</span>
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 hidden md:inline-block ${scen.badgeStyle}`}
                      >
                        {scen.multiplierBadge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message: Plain red text, no background, no border */}
            {errorMessage && (
              <p className="mb-3 text-xs text-rose-400 font-mono animate-fade-in shrink-0">
                {errorMessage}
              </p>
            )}

            {/* Scrollable Roles List */}
            <div className="flex-1 overflow-y-auto pr-1.5 space-y-3">
              {topRoles.map((role, idx) => {
                const isSelected = selectedRoleId === role.roleId;
                const matchPct = Math.round(role.matchScore * 100);
                const reason = getRoleReason(role, locale);

                return (
                  <div
                    key={role.roleId}
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
                        {matchPct}% Match
                      </span>
                    </div>

                    {/* Line 2: (SDG) - Plain text, no emoji, no background, no border. Shows full name on hover */}
                    {role.sdgAlignments && role.sdgAlignments.length > 0 && (
                      <div className="text-[11px] font-mono text-emerald-400 mt-1 flex flex-wrap gap-x-2">
                        {role.sdgAlignments.map((sdg, sIdx) => (
                          <span
                            key={sdg.targetCode}
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
            <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4 shrink-0">
              <span className="text-[11px] font-mono text-text-muted">
                {locale === "zh"
                  ? `已选定 1 个岗位（${SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.label.zh || "稳健基准"}模式）`
                  : locale === "ms"
                  ? `1 peranan dipilih (${SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.label.ms || "Garis Dasar"})`
                  : `1 role selected (${SCENARIO_OPTIONS.find((s) => s.id === selectedScenario)?.label.en || "Baseline"})`}
              </span>

              <button
                type="button"
                onClick={handleConfirmRole}
                disabled={!selectedRoleId}
                className="px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {locale === "zh"
                    ? "确认选择并生成路线图"
                    : locale === "ms"
                    ? "Sahkan & Jana Pelan"
                    : "Confirm & Generate Roadmap"}
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
