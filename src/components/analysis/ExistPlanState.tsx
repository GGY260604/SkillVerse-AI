"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { PlanCard, PlanDetailView, CURRENT_PLAN, HISTORY_PLANS, type PlanData } from "./planCard";
import { usePlanModal } from "@/context/PlanModalContext";

// Exist Plan State Component
// Rendered when an active career roadmap exists. Displays full dashboard, current prominent plan,
// historical iterations archive with expand/collapse, and full plan detail view.
export default function ExistPlanState() {
  const t = useTranslations("analysis.header");
  const tHistory = useTranslations("analysis.history");
  const { openPathwaySelect } = usePlanModal();

  // State for navigating between Overview and Individual Plan Details.
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);

  // State for collapsing / expanding multiple historical cards.
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  return (
    <div className="w-full flex-1">
      {/* Page Header Bar with Conditional Edit Plan Button and Return Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-8 sm:mb-10">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Back button displayed on the LEFT of the title/subtitle when in detail mode */}
          {selectedPlan && (
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="p-2.5 sm:p-3 rounded-xl border border-border-subtle bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-accent hover:border-accent transition-all duration-200 cursor-pointer shadow-sm shrink-0 flex items-center justify-center group"
              aria-label={t("back_to_overview")}
              title={t("back_to_overview")}
            >
              <svg
                className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
          )}

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {t("title")}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Header Actions: Share Plan and Edit Plan Buttons */}
        {/* Shown in Overview mode or Current plan detail mode. Hidden in History detail mode! */}
        {(!selectedPlan || selectedPlan.isCurrent) && (
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Share Plan Action Button */}
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono text-text-primary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
              title={t("share_plan")}
            >
              {/* Share Node Network SVG Icon */}
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span>{t("share_plan")}</span>
            </button>

            {/* Edit Plan Action Button (Pencil Icon) */}
            <button
              type="button"
              onClick={openPathwaySelect}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono text-text-primary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
              title={t("edit_plan")}
            >
              {/* Pencil SVG Icon */}
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>{t("edit_plan")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Analysis Body Content */}
      {selectedPlan ? (
        /* Detailed View Mode: Display only the selected plan's comprehensive details */
        <PlanDetailView
          plan={selectedPlan}
          onBack={() => setSelectedPlan(null)}
        />
      ) : (
        /* Overview Mode: Display Current Plan and History Plan Cards */
        <div className="flex flex-col gap-10">
          {/* Section 1: Current Plan (Most Prominent) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <span className="text-accent">◈</span>
                {t("current_plan")}
              </h2>
            </div>

            <PlanCard
              plan={CURRENT_PLAN}
              onSelect={(plan) => setSelectedPlan(plan)}
            />
          </section>

          {/* Section 2: History Plan (Subdued Muted Gray) */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-text-secondary tracking-tight flex items-center gap-2">
                <span className="text-text-muted">◇</span>
                {t("history_plan")}
              </h2>
              <span className="text-xs font-mono text-text-muted">
                {HISTORY_PLANS.length} Preserved
              </span>
            </div>

            {/* History Cards List: Only first card shown by default if more than 1 */}
            <div className="flex flex-col gap-4">
              {(showAllHistory ? HISTORY_PLANS : HISTORY_PLANS.slice(0, 1)).map(
                (historyPlan) => (
                  <PlanCard
                    key={historyPlan.id}
                    plan={historyPlan}
                    onSelect={(plan) => setSelectedPlan(plan)}
                  />
                )
              )}

              {/* View More / Collapse Toggle Button */}
              {HISTORY_PLANS.length > 1 && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-semibold text-text-secondary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent/50 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    <span>
                      {showAllHistory
                        ? tHistory("collapse_history")
                        : `${tHistory("view_more")} (${HISTORY_PLANS.length - 1})`}
                    </span>
                    <span>{showAllHistory ? "▲" : "▼"}</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
