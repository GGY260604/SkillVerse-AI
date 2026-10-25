"use client";

import React, { forwardRef } from "react";
import type { TeamSkillMatrixResponse, TeamMemberAnalysis } from "@/components/page-shared/HeatMapView";
import type { SharedRoadmapItem } from "@/components/page-shared/SharedPlansView";

// --- Properties Schema ---
interface HeatMapPrintReportProps {
  matrixData: TeamSkillMatrixResponse;
  sortedMembers: SharedRoadmapItem[];
  sortedUserIds: string[];
  competencies: Array<{ name: string; localizedName: string }>;
  candidateMap: Map<string, TeamMemberAnalysis>;
  locale: string;
  t: (key: string, values?: any) => string;
}

/**
 * HeatMapPrintReport Component
 * Formatted executive report container optimized for canvas rendering and print-to-PDF export.
 *
 * Component Requirements:
 * - Workforce matrix visualization: Tabulate team competency scores and benchmark ratings.
 * - Print fidelity: Fixed width container styled for high-resolution canvas capture.
 *
 * Workflow:
 * 1. Compute aggregate team performance metrics and top candidate indicators.
 * 2. Render report banner and target role benchmark summary.
 * 3. Render executive KPI cards for team average, candidates, and competencies.
 * 4. Render candidate competency matrix table with color-coded status badges.
 * 5. Render evaluation methodology legend and confidentiality notice.
 */
const HeatMapPrintReport = forwardRef<HTMLDivElement, HeatMapPrintReportProps>(
  (
    {
      matrixData,
      sortedMembers,
      sortedUserIds,
      competencies,
      candidateMap,
      locale,
      t,
    },
    ref
  ) => {
    // ==========================================
    // Step 1: Compute Aggregate Team Metrics and Identify Top Candidate
    // ==========================================
    const candidatesList = sortedMembers.length > 0
      ? sortedMembers.map((m) => candidateMap.get(m.owner.id)).filter(Boolean) as TeamMemberAnalysis[]
      : sortedUserIds.map((uid) => candidateMap.get(uid)).filter(Boolean) as TeamMemberAnalysis[];

    const totalCandidatesCount = candidatesList.length;

    const averageScore = totalCandidatesCount > 0
      ? (
          candidatesList.reduce((sum, c) => sum + (c.matchPercentage || c.overallMatchScore * 100), 0) /
          totalCandidatesCount
        ).toFixed(1)
      : "0.0";

    const topCandidate = candidatesList[0];

    const targetRoleTitle =
      matrixData.targetRoleTitleLocalized?.[locale] || matrixData.targetRoleTitle;

    const industryTitle =
      matrixData.industryLocalized?.[locale] || matrixData.industry;

    const nowFormatted = new Date().toLocaleString(locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // ==========================================
    // Step 2: Render Report Banner and Benchmark Header
    // ==========================================
    return (
      <div
        ref={ref}
        id="heatmap-printable-report"
        className="w-290 bg-white text-slate-900 p-8 font-sans antialiased text-xs"
        style={{
          boxSizing: "border-box",
          color: "#0f172a",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Report Header */}
        <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                SkillVerse AI
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-widest">
                Workforce Intelligence Platform
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t("heatmap.report_title")}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {t("heatmap.target_benchmark")}: <span className="font-bold text-slate-900">{targetRoleTitle}</span>
              {" • "}{industryTitle}
            </p>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-500 space-y-0.5">
            <div>{t("heatmap.generated_at")}: <span className="font-semibold text-slate-800">{nowFormatted}</span></div>
            <div>{t("heatmap.total_candidates")}: <span className="font-semibold text-slate-800">{totalCandidatesCount}</span></div>
            <div>{t("heatmap.total_competencies")}: <span className="font-semibold text-slate-800">{competencies.length}</span></div>
          </div>
        </div>

        {/* ========================================== */}
        {/* Step 3: Render Executive KPI Metric Cards */}
        {/* ========================================== */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {/* Target Role KPI Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-0.5">
              {t("heatmap.target_benchmark")}
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {targetRoleTitle}
            </div>
            <div className="text-[10px] text-slate-500 truncate mt-0.5">
              {industryTitle}
            </div>
          </div>

          {/* Average Score KPI Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-0.5">
              {t("heatmap.team_average_score")}
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600">
              {averageScore}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across {totalCandidatesCount} team members
            </div>
          </div>

          {/* Core Competencies KPI Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-0.5">
              {t("heatmap.required_competencies")}
            </div>
            <div className="text-xl font-bold font-mono text-slate-900">
              {competencies.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Benchmark standards evaluated
            </div>
          </div>

          {/* Top Aligned Candidate KPI Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-0.5">
              Top Ranked Candidate
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {topCandidate?.name || "-"}
            </div>
            <div className="text-[10px] font-mono text-emerald-600 font-semibold mt-0.5">
              {topCandidate ? `${Math.round(topCandidate.matchPercentage || topCandidate.overallMatchScore * 100)}% Match` : "-"}
            </div>
          </div>
        </div>

        {/* Legend Banner */}
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 mb-6 text-[11px]">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5 font-mono">
            <span>{t("heatmap.legend_title")}:</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-500 inline-block" />
              <span className="font-medium text-emerald-900">{t("heatmap.mastered")} (&ge; 70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-500 inline-block" />
              <span className="font-medium text-amber-900">{t("heatmap.bridgeable_gap")} (40% - 69%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-500 inline-block" />
              <span className="font-medium text-rose-900">{t("heatmap.critical_deficit")} (&lt; 40%)</span>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* Step 4: Render Candidate Competency Matrix Table */}
        {/* ========================================== */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-8 shadow-xs">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-mono text-slate-700">
                <th className="p-2.5 font-bold border-r border-slate-300 w-52">
                  {t("heatmap.users_column")} ({totalCandidatesCount})
                </th>
                <th className="p-2.5 font-bold border-r border-slate-300 text-center w-20">
                  {t("heatmap.overall_score")}
                </th>
                {competencies.map((comp, idx) => (
                  <th
                    key={idx}
                    className="p-2 font-bold border-r border-slate-200 text-center truncate max-w-30"
                    title={comp.localizedName}
                  >
                    {comp.localizedName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidatesList.map((cand, rowIdx) => {
                const matchPct = Math.round(cand.matchPercentage || cand.overallMatchScore * 100);

                return (
                  <tr
                    key={cand.userId || rowIdx}
                    className={`border-b border-slate-200 ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                  >
                    {/* Candidate Identity Cell */}
                    <td className="p-2.5 border-r border-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
                          {cand.rank || rowIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {cand.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate font-mono">
                            {cand.department || cand.currentRole || cand.email || "-"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Overall Score Cell */}
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-xs">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          matchPct >= 70
                            ? "bg-emerald-100 text-emerald-800 font-bold"
                            : matchPct >= 40
                            ? "bg-amber-100 text-amber-800 font-bold"
                            : "bg-rose-100 text-rose-800 font-bold"
                        }`}
                      >
                        {matchPct}%
                      </span>
                    </td>

                    {/* Individual Competency Tile Cells */}
                    {competencies.map((comp, colIdx) => {
                      const skillEval =
                        cand.skillsStatus?.[comp.name] || cand.skillsStatus?.[comp.localizedName];
                      const score = Math.round((skillEval?.score || 0) * 100);
                      const status = skillEval?.status;

                      let cellBg = "bg-slate-100 text-slate-400";
                      let statusText = "-";

                      if (skillEval) {
                        if (status === "mastered" || score >= 70) {
                          cellBg = "bg-emerald-50 text-emerald-900 border-emerald-200";
                          statusText = t("heatmap.mastered");
                        } else if (status === "gap" || score >= 40) {
                          cellBg = "bg-amber-50 text-amber-900 border-amber-200";
                          statusText = t("heatmap.bridgeable_gap");
                        } else {
                          cellBg = "bg-rose-50 text-rose-900 border-rose-200";
                          statusText = t("heatmap.critical_deficit");
                        }
                      }

                      return (
                        <td
                          key={colIdx}
                          className={`p-1.5 border-r border-slate-200 text-center font-mono ${cellBg}`}
                        >
                          <div className="text-[11px] font-bold leading-tight">
                            {score}%
                          </div>
                          <div className="text-[8px] font-medium opacity-80 leading-tight mt-0.5 truncate">
                            {statusText}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ========================================== */}
        {/* Step 5: Render Candidate Ranking and Methodology Legend */}
        {/* ========================================== */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 font-bold font-mono text-[11px] text-slate-800">
            Candidate Ranking & Competency Distribution
          </div>
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-600">
                <th className="p-2 text-center w-12">{t("heatmap.rank")}</th>
                <th className="p-2">{t("heatmap.users_column")}</th>
                <th className="p-2 text-center w-28">{t("heatmap.overall_score")}</th>
                <th className="p-2 text-center w-24 text-emerald-700">{t("heatmap.mastered")}</th>
                <th className="p-2 text-center w-24 text-amber-700">{t("heatmap.bridgeable_gap")}</th>
                <th className="p-2 text-center w-24 text-rose-700">{t("heatmap.critical_deficit")}</th>
              </tr>
            </thead>
            <tbody>
              {candidatesList.map((cand, idx) => (
                <tr key={cand.userId || idx} className="border-b border-slate-200">
                  <td className="p-2 text-center font-bold font-mono">{cand.rank || idx + 1}</td>
                  <td className="p-2 font-medium text-slate-900">{cand.name}</td>
                  <td className="p-2 text-center font-mono font-bold text-emerald-700">
                    {Math.round(cand.matchPercentage || cand.overallMatchScore * 100)}%
                  </td>
                  <td className="p-2 text-center font-mono text-emerald-800 font-semibold">{cand.masteredCount ?? "-"}</td>
                  <td className="p-2 text-center font-mono text-amber-800 font-semibold">{cand.gapCount ?? "-"}</td>
                  <td className="p-2 text-center font-mono text-rose-800 font-semibold">{cand.criticalDeficitCount ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>SkillVerse AI Workforce Intelligence &bull; Confidential Executive Report</span>
          <span>Generated via SkillVerse AI Platform</span>
        </div>
      </div>
    );
  }
);

HeatMapPrintReport.displayName = "HeatMapPrintReport";

export default HeatMapPrintReport;
