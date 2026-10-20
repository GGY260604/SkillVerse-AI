"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PlanData } from "./planData";

interface PlanCardProps {
  plan: PlanData;
  onSelect?: (plan: PlanData) => void;
}

// Unified Plan Card Component
// Shared card presentation for current active roadmap (full rich view) and archived historical roadmaps (compact streamlined view).
export default function PlanCard({ plan, onSelect }: PlanCardProps) {
  const tCurrent = useTranslations("analysis.current");
  const tHistory = useTranslations("analysis.history");

  const isCurrent = plan.isCurrent;

  // Streamlined Minimal Card Presentation for History Plans (Pelan Sejarah)
  if (!isCurrent) {
    return (
      <div
        onClick={() => onSelect?.(plan)}
        className="relative rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer group bg-bg-secondary/40 border border-border-subtle/70 opacity-90 hover:opacity-100 hover:border-accent/40 hover:bg-bg-secondary/60 hover:shadow-md"
      >
        {/* Top Header Row: Archive Badge, Plan ID, Date */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border-subtle/40 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-text-muted/15 text-text-muted border border-border-subtle uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              {tHistory("badge")}
            </span>
            <span className="text-xs text-text-muted font-mono">
              Plan ID: {plan.code}
            </span>
          </div>

          <span className="text-xs font-mono text-text-muted">
            {plan.date}
          </span>
        </div>

        {/* Content Row: Target Role, Match Score Pill & Chevron Arrow */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-0.5">
              {plan.roleCategory}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-text-secondary group-hover:text-text-primary tracking-tight transition-colors">
              {plan.targetRole}
            </h3>
          </div>

          {/* Compact Right Side Controls */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Match Score Badge */}
            <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-lg bg-bg-card/70 border border-border-subtle/60 font-mono">
              <span className="text-[10px] uppercase text-text-muted mr-1">Match:</span>
              <span className="text-sm font-bold text-text-primary">{plan.matchScore.toFixed(1)}</span>
              <span className="text-xs text-text-muted">%</span>
            </div>

            {/* Direct Chevron > Action Arrow */}
            <div className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-200 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Rich Card Presentation for Current Active Plan (Pelan Semasa)
  return (
    <div
      onClick={() => onSelect?.(plan)}
      className="relative rounded-2xl p-6 sm:p-8 transition-all duration-300 cursor-pointer group bg-bg-card/90 backdrop-blur-2xl border-2 border-accent/40 shadow-[0_0_50px_var(--accent-glow)] hover:border-accent hover:shadow-[0_0_60px_var(--accent-glow-strong)]"
    >
      {/* Ambient Top Glow Overlay */}
      <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-[radial-gradient(ellipse_at_top,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />

      {/* Card Header with Badges and Telemetry Metadata */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border-subtle/60 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold font-mono tracking-wider bg-accent/20 text-accent border border-accent/40 uppercase">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            {tCurrent("badge")}
          </span>

          <span className="text-xs text-text-muted font-mono">
            Plan ID: {plan.code}
          </span>
        </div>

        <span className="text-xs font-mono text-text-secondary">
          {plan.date}
        </span>
      </div>

      {/* Primary Role Info & Match Metric Row */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">
        <div className="lg:col-span-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-accent block mb-1">
            {plan.roleCategory}
          </span>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2 group-hover:text-accent transition-colors">
            {plan.targetRole}
          </h3>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-0">
            {plan.description}
          </p>
        </div>

        {/* Match Score Display Block */}
        <div className="rounded-xl border p-5 flex flex-col items-center text-center justify-center bg-bg-secondary/70 border-border-subtle">
          <span className="text-[11px] font-mono uppercase text-text-muted tracking-wider mb-1">
            {tCurrent("match_score")}
          </span>

          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold font-mono text-accent">
              {plan.matchScore.toFixed(1)}
            </span>
            <span className="text-sm font-bold font-mono text-accent">
              %
            </span>
          </div>

          <span className="text-[10px] text-text-muted font-mono mt-1">
            {plan.matchScoreBasis}
          </span>

          <div className="w-full bg-border-subtle rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-accent to-accent-dim transition-all duration-500"
              style={{ width: `${plan.matchScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Action Footer Bar */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-border-subtle/60">
        <span className="text-xs text-text-muted font-mono">
          {plan.roadmapWeeks} • {plan.roadmapHours}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(plan);
          }}
          className="text-xs font-mono font-semibold flex items-center gap-1.5 transition-all bg-transparent border-none cursor-pointer text-accent group-hover:underline"
        >
          <span>{tCurrent("view_details")}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
