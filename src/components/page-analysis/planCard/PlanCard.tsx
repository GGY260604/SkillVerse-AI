"use client";

import React from "react";
import { useTranslations, useLocale } from "next-intl";
import { PlanData, getRoleViabilityInfo } from "./planData";

// Component properties specification for roadmap plan cards.
interface PlanCardProps {
  plan: PlanData;
  variant?: "current" | "history";
  onSelect?: (plan: PlanData) => void;
}

/**
 * Roadmap Summary Card Component
 *
 * Renders an interactive roadmap overview card presenting role alignment,
 * SDG commitments, duration metrics, and phase completion progress.
 *
 * Component Properties:
 * - plan: Roadmap data object containing milestones and scores.
 * - variant (optional): Visual variant selector ('current' | 'history').
 * - onSelect (optional): Callback invoked when user selects the card for inspection.
 *
 * Workflow:
 * 1. Resolve localized titles, descriptions, and milestone progress percentages.
 * 2. Format raw creation timestamp into compact display date.
 * 3. Conditionally render card presentation based on active status:
 *    - Branch A: Mount compact archived historical roadmap card.
 *    - Branch B: Mount prominent active current roadmap card.
 */
export default function PlanCard({ plan, variant, onSelect }: PlanCardProps) {
  const tCurrent = useTranslations("analysis.current");
  const tHistory = useTranslations("analysis.history");
  const locale = useLocale();

  // ==========================================
  // Step 1: Resolve Localized Titles and Progress Percentages
  // ==========================================
  const isCurrent = variant !== undefined ? variant === "current" : plan.isCurrent;
  const displayRoleTitle = plan.targetTitleLocalized?.[locale] || plan.targetRole;
  const displayDescription = plan.descriptionLocalized?.[locale] || plan.description;

  const completedCount = plan.phases?.filter((p) => p.isCompleted).length || 0;
  const totalPhases = plan.phases?.length || 0;
  const progressPercent = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;
  const viability = getRoleViabilityInfo(plan, locale);

  // ==========================================
  // Step 2: Format Creation Timestamp for Display
  // ==========================================
  const rawDate = plan.createdAt || plan.date || "";
  const displayDate = rawDate.split("T")[0].split(" ")[0];

  // ==========================================
  // Step 3: Conditionally Render Card Variant
  // ==========================================
  if (!isCurrent) {
    // ==========================================
    // Branch A: Compact Archived Historical Roadmap Card
    // ==========================================
    return (
      <div
        onClick={() => onSelect?.(plan)}
        className="rounded-xl p-4 sm:p-5 transition-all duration-300 cursor-pointer border bg-bg-card border-border-subtle hover:bg-bg-card-hover hover:shadow-lg shadow-sm"
      >
        {/* Archived Plan Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle mb-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-bg-secondary text-text-muted border border-border-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              {tHistory("badge")}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${viability.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${viability.dotClass}`} />
              <span>{viability.growthPct}</span>
              <span className="opacity-60">•</span>
              <span className="font-sans">{viability.localizedStatus}</span>
            </span>
            <span className="text-[11px] font-mono text-text-muted">
              ID: <span className="text-text-secondary">{plan.id}</span>
            </span>
            {plan.roleCategory && (
              <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                • {plan.roleCategory === "Target Horizon Role" ? tCurrent("role_category_default") : plan.roleCategory}
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono text-text-muted shrink-0">
            {displayDate}
          </span>
        </div>

        {/* Plan Summary Information */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-text-secondary truncate">
              {displayRoleTitle}
            </h3>
            {displayDescription && (
              <p className="text-xs text-text-muted line-clamp-1 mt-1 leading-relaxed">
                {displayDescription}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-text-muted flex-wrap">
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
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bg-secondary text-text-muted border border-border-subtle"
                    >
                      {sdg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Match Score Progress Meter */}
          <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-border-subtle pt-2 sm:pt-0">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-mono uppercase text-text-muted">{tCurrent("match_score")}:</span>
              <span className="text-sm font-bold font-mono text-text-secondary">{plan.matchScore.toFixed(1)}%</span>
            </div>
            <div className="text-[10px] font-mono text-text-muted flex items-center gap-1 mt-0.5">
              <span>{locale === "zh" ? "趋势" : locale === "ms" ? "Trend" : "Trend"}:</span>
              <span className={`font-semibold ${viability.textClass}`}>{viability.growthPct}</span>
            </div>
            <div className="w-24 bg-bg-secondary rounded-full h-1 overflow-hidden mt-1 hidden sm:block">
              <div
                className="h-full bg-text-muted"
                style={{ width: `${plan.matchScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Phase Completion Progress and Detail Link */}
        <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-text-muted">
              <strong className="text-text-secondary font-semibold">{completedCount} / {totalPhases}</strong>
            </span>
            <div className="w-20 sm:w-24 bg-bg-secondary rounded-full h-1 overflow-hidden">
              <div
                className="h-full bg-text-muted transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <span className="text-text-muted inline-flex items-center gap-1 font-semibold">
            <span>{tHistory("view_details")}</span>
            <span>→</span>
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // Branch B: Prominent Active Current Roadmap Card
  // ==========================================
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

      {/* Role Summary Grid */}
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

          <h3 className="wrap-break-word text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2 group-hover:text-accent transition-colors">
            {displayRoleTitle}
          </h3>

          {viability.localizedRecommendation && (
            <p className="text-xs text-text-secondary leading-relaxed mb-3.5 bg-bg-secondary/70 border border-border-subtle/70 rounded-xl px-3 py-2 font-mono">
              {viability.localizedRecommendation}
            </p>
          )}

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
            {displayDescription}
          </p>

          {/* Sustainable Development Goals Alignments */}
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

        {/* Match Score Display Panel */}
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

      {/* Progress Metric and Details Navigation Link */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-3">
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
