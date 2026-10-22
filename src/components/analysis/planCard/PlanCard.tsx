"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { PlanData } from "./planData";

// --- Roadmap Overview Card ---
// Render a localized current or archived roadmap summary and its progress.
interface PlanCardProps {
  plan: PlanData;
  variant?: "current" | "history";
  onSelect?: (plan: PlanData) => void;
}

export default function PlanCard({ plan, variant, onSelect }: PlanCardProps) {
  const tCurrent = useTranslations("analysis.current");
  const tHistory = useTranslations("analysis.history");
  const locale = useLocale();

  const isCurrent = variant !== undefined ? variant === "current" : plan.isCurrent;

  const displayRoleTitle = plan.targetTitleLocalized?.[locale] || plan.targetRole;
  const displayDescription = plan.descriptionLocalized?.[locale] || plan.description;

  const completedCount = plan.phases?.filter((p) => p.isCompleted).length || 0;
  const totalPhases = plan.phases?.length || 0;
  const progressPercent = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  const rawDate = plan.createdAt || plan.date || "";
  const displayDate = rawDate.split("T")[0].split(" ")[0];

  // --- UI ---
  // --- History Card ---
  // Archived records are visually sealed and provide a compact read-only summary.
  if (!isCurrent) {
    return (
      <div
        onClick={() => onSelect?.(plan)}
        className="rounded-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer group border bg-bg-secondary/40 border-zinc-800/80 hover:bg-bg-secondary/70 hover:border-zinc-700/90 shadow-sm"
      >
        {/* Archived Plan Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800/70 mb-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800/90 text-zinc-400 border border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              {tHistory("badge")}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              ID: <span className="text-zinc-400">{plan.id}</span>
            </span>
            {plan.roleCategory && (
              <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                • {plan.roleCategory === "Target Horizon Role" ? tCurrent("role_category_default") : plan.roleCategory}
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono text-zinc-500 shrink-0">
            {displayDate}
          </span>
        </div>

        {/* Plan Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
              {displayRoleTitle}
            </h3>
            {displayDescription && (
              <p className="text-xs text-zinc-400 line-clamp-1 mt-1 leading-relaxed">
                {displayDescription}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-zinc-500 flex-wrap">
              <span>
                {tCurrent("duration_summary", {
                  weeks: plan.roadmapWeeks?.replace(/\D/g, "") || "10",
                  hours: plan.roadmapHours?.replace(/\D/g, "") || "45",
                })}
              </span>
              {plan.sdgs && plan.sdgs.length > 0 && (
                <div className="flex items-center gap-1">
                  {plan.sdgs.map((sdg) => (
                    <span
                      key={sdg}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800/60 text-zinc-400 border border-zinc-700/40"
                    >
                      {sdg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Match Score */}
          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-zinc-800/60 pt-2 sm:pt-0">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">{tCurrent("match_score")}:</span>
              <span className="text-sm font-bold font-mono text-zinc-300">{plan.matchScore.toFixed(1)}%</span>
            </div>
            <div className="w-24 bg-zinc-800 rounded-full h-1 overflow-hidden mt-1 hidden sm:block">
              <div
                className="h-full bg-zinc-500"
                style={{ width: `${plan.matchScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress and Details */}
        <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-zinc-500">
              <strong className="text-zinc-300 font-semibold">{completedCount} / {totalPhases}</strong>
            </span>
            <div className="w-20 sm:w-24 bg-zinc-800 rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-zinc-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors inline-flex items-center gap-1 font-semibold">
            <span>{tHistory("view_details")}</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </span>
        </div>
      </div>
    );
  }

  // --- Current Card ---
  // The active roadmap uses the prominent summary treatment.
  return (
    <div
      onClick={() => onSelect?.(plan)}
      className="rounded-2xl p-6 sm:p-7 transition-all duration-300 cursor-pointer group border bg-bg-card border-border-subtle hover:border-accent/40 hover:shadow-lg"
    >
      {/* Plan Header */}
      <div className="flex flex-nowrap items-center justify-between gap-2 pb-4 border-b border-border-subtle mb-5">
        <span className="min-w-0 flex-1 truncate text-[clamp(0.5rem,2.5vw,0.75rem)] font-mono font-medium text-text-muted">
          ID: <span className="text-text-secondary font-mono">{plan.id}</span>
        </span>

        <span className="shrink-0 whitespace-nowrap text-[clamp(0.5rem,2.5vw,0.75rem)] font-mono text-text-muted">
          {displayDate}
        </span>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-5">
        <div className="lg:col-span-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-text-muted block mb-1">
            {!plan.roleCategory || plan.roleCategory === "Target Horizon Role"
              ? tCurrent("role_category_default")
              : plan.roleCategory}
          </span>

          <h3 className="wrap-break-word text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2 group-hover:text-accent transition-colors">
            {displayRoleTitle}
          </h3>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
            {displayDescription}
          </p>

          {/* Sustainable Development Goals */}
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

          <span className="text-[11px] font-mono text-text-secondary font-medium">
            {tCurrent("duration_summary", {
              weeks: plan.roadmapWeeks?.replace(/\D/g, "") || "10",
              hours: plan.roadmapHours?.replace(/\D/g, "") || "45",
            })}
          </span>
        </div>
      </div>

      {/* Progress and Details */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
        {/* Roadmap Progress */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 whitespace-nowrap text-xs font-mono text-text-secondary">
            <span className="hidden sm:inline">{tCurrent("progress")}: </span>
            <strong className="text-text-primary">{completedCount} / {totalPhases}</strong>
          </span>
          <div className="h-1.5 min-w-10 max-w-36 flex-1 overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* View Details */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-mono font-semibold text-accent group-hover:underline">
            <span>{tCurrent("view_details")}</span>
            <span>→</span>
          </span>
        </div>
      </div>
    </div>
  );
}
