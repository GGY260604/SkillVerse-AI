"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import PlanCard from "./planCard/PlanCard";
import PlanDetailView from "./planCard/PlanDetailView";
import { type PlanData, type PlanPhase } from "./planCard/planData";
import { usePlanModal } from "@/context/page-analysis/PlanModalContext";
import { useSharedModal } from "@/context/page-analysis/SharedModalContext";

// User metadata structure for collaborative peer roadmap exploration.
export interface SharedUserInfo {
  id: string;
  name: string;
  role: string;
  email?: string;
  avatar?: string;
  sharedAt?: string;
  department?: string;
}

// Component properties specification for existing roadmap dashboard.
export interface ExistPlanStateProps {
  currentPlan?: PlanData;
  historyPlans?: PlanData[];
  isSharedView?: boolean;
  canEdit?: boolean;
  sharedUser?: SharedUserInfo;
  onBackToSharedList?: () => void;
  onPhaseToggle?: (phaseId: string, isCompleted: boolean) => void;
}

/**
 * Existing Roadmap Dashboard Component
 *
 * Displays the authenticated user's current roadmap trajectory, expandable milestone history,
 * and detailed learning phases, while seamlessly adapting to shared peer inspection views.
 *
 * Component Properties:
 * - currentPlan (optional): Active primary roadmap object.
 * - historyPlans (optional): Array of archived historical roadmap snapshots.
 * - isSharedView (optional): Boolean flag indicating peer collaboration mode.
 * - canEdit (optional): Boolean flag controlling pathway alteration permissions.
 * - sharedUser (optional): Peer user metadata displayed in shared header mode.
 * - onBackToSharedList (optional): Callback for returning to the shared peer directory.
 * - onPhaseToggle (optional): Callback for notifying parent containers of phase completion changes.
 *
 * Workflow:
 * 1. Synchronize external props with local optimistic state.
 * 2. Subscribe to real-time roadmap refresh events.
 * 3. Handle phase progress toggles and propagate updates to parent listeners.
 * 4. Render header controls, collaborative sharing triggers, and pathway selectors.
 * 5. Conditionally route between detailed milestone inspection and plan card overview:
 *    - Branch A: Mount detailed roadmap milestone inspector when a plan is selected.
 *    - Branch B: Mount current active roadmap and collapsible historical archives list.
 */
export default function ExistPlanState({
  currentPlan,
  historyPlans = [],
  isSharedView = false,
  canEdit = true,
  sharedUser,
  onBackToSharedList,
  onPhaseToggle,
}: ExistPlanStateProps = {}) {
  const t = useTranslations("analysis.header");
  const tHistory = useTranslations("analysis.history");
  const { openPathwaySelect } = usePlanModal();
  const { openSharedPlansModal } = useSharedModal();

  // ==========================================
  // Step 1: Synchronize External Props with Local Optimistic State
  // ==========================================
  // Mirror server-provided records in local state so phase updates render immediately.
  const [activeCurrentPlan, setActiveCurrentPlan] = useState<PlanData | null>(currentPlan ?? null);
  const [activeHistoryPlans, setActiveHistoryPlans] = useState<PlanData[]>(historyPlans);
  const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);

  // Synchronize active current plan whenever parent props update.
  useEffect(() => {
    setActiveCurrentPlan(currentPlan ?? null);
    setSelectedPlan((prev) => {
      if (!prev) return null;
      if (currentPlan && (prev.isCurrent || prev.id === currentPlan.id)) {
        return currentPlan;
      }
      return prev;
    });
  }, [currentPlan]);

  // Synchronize archived roadmap array and maintain selected plan integrity.
  useEffect(() => {
    setActiveHistoryPlans(historyPlans);
    setSelectedPlan((prev) => {
      if (!prev) return null;
      if (prev.isCurrent) return prev;
      const matched = historyPlans.find((hp) => hp.id === prev.id);
      return matched || prev;
    });
  }, [historyPlans]);

  // ==========================================
  // Step 2: Subscribe to Real-Time Roadmap Refresh Events
  // ==========================================
  // Navigate automatically to newly synthesized roadmaps upon event dispatch.
  useEffect(() => {
    const handleRoadmapRefresh = (event: Event) => {
      const customEvt = event as CustomEvent<{ newPlan?: PlanData }>;
      if (customEvt?.detail?.newPlan) {
        const newPlan = customEvt.detail.newPlan;
        setActiveCurrentPlan(newPlan);
        setSelectedPlan(newPlan);
      }
    };
    window.addEventListener("roadmap-refresh", handleRoadmapRefresh);
    return () => {
      window.removeEventListener("roadmap-refresh", handleRoadmapRefresh);
    };
  }, []);

  // ==========================================
  // Step 3: Handle Phase Progress Toggles and Local State Updates
  // ==========================================
  // Optimistically toggle completion status across active plans and notify parent handler.
  const handleInternalPhaseToggle = (phaseId: string, isCompleted: boolean) => {
    const updatePhasesList = (phases?: PlanPhase[]) => {
      if (!phases) return [];
      return phases.map((p) => (p.id === phaseId ? { ...p, isCompleted } : p));
    };

    setActiveCurrentPlan((prev) => {
      if (prev?.phases?.some((p) => p.id === phaseId)) {
        const updated = {
          ...prev,
          phases: updatePhasesList(prev.phases),
        };
        setSelectedPlan((sp) => (sp && sp.id === prev.id ? updated : sp));
        return updated;
      }
      return prev;
    });

    setActiveHistoryPlans((prev) =>
      prev.map((hp) => {
        if (hp.phases?.some((p) => p.id === phaseId)) {
          const updated = {
            ...hp,
            phases: updatePhasesList(hp.phases),
          };
          setSelectedPlan((sp) => (sp && sp.id === hp.id ? updated : sp));
          return updated;
        }
        return hp;
      })
    );

    onPhaseToggle?.(phaseId, isCompleted);
  };

  return (
    <div className="w-full flex-1">
      {/* ========================================== */}
      {/* Step 4: Render Header Navigation and Plan Action Controls */}
      {/* ========================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-8 sm:mb-10">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Back Navigation to Overview */}
          {selectedPlan ? (
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
          ) : isSharedView && onBackToSharedList ? (
            <button
              type="button"
              onClick={onBackToSharedList}
              className="p-2.5 sm:p-3 rounded-xl border border-border-subtle bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-accent hover:border-accent transition-all duration-200 cursor-pointer shadow-sm shrink-0 flex items-center justify-center group"
              aria-label={t("back_to_shared_list")}
              title={t("back_to_shared_list")}
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
          ) : null}

          <div className="min-w-0 flex-1">
            <h1 className="wrap-break-word text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {isSharedView && sharedUser
                ? t("shared_title", { name: sharedUser.name })
                : t("title")}
            </h1>
            <p className="wrap-break-word text-xs sm:text-sm text-text-secondary mt-1">
              {isSharedView && sharedUser
                ? t("shared_subtitle", {
                    name: sharedUser.name,
                    role: sharedUser.role,
                    department: sharedUser.department ? ` (${sharedUser.department})` : "",
                  })
                : t("subtitle")}
            </p>
          </div>
        </div>

        {/* Action Controls for Sharing and Editing */}
        {(!selectedPlan || selectedPlan.isCurrent) &&
          (selectedPlan || activeCurrentPlan) && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
            {/* Share Modal Trigger */}
            {!isSharedView && (
              <button
                type="button"
                onClick={() => {
                  const planToShare = selectedPlan ?? activeCurrentPlan;
                  if (planToShare) {
                    openSharedPlansModal(planToShare.id, planToShare.targetRole);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono text-text-primary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
                title={t("share_plan")}
                aria-label={t("share_plan")}
              >
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span className="hidden sm:inline">{t("share_plan")}</span>
              </button>
            )}

            {/* Pathway Edit Action */}
            {canEdit ? (
              <button
                type="button"
                onClick={() => {
                  if (isSharedView && sharedUser?.id) {
                    openPathwaySelect({
                      targetUserId: sharedUser.id,
                      targetUserName: sharedUser.name,
                    });
                  } else {
                    openPathwaySelect();
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono text-text-primary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
                title={t("edit_plan")}
                aria-label={t("edit_plan")}
              >
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                <span className="hidden sm:inline">{t("edit_plan")}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono text-text-muted bg-bg-card/50 border border-border-subtle rounded-xl shadow-sm opacity-60 cursor-not-allowed select-none"
                title={t("viewable_only")}
                aria-label={t("viewable_only")}
              >
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="hidden sm:inline">{t("viewable_only")}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* Step 5: Conditionally Route Between Detail View and Plans Overview */}
      {/* ========================================== */}
      {selectedPlan ? (
        // ==========================================
        // Branch A: Selected Roadmap Detail Milestone Inspector
        // ==========================================
        <PlanDetailView
          key={selectedPlan.id}
          plan={selectedPlan}
          onBack={() => setSelectedPlan(null)}
          isSharedView={isSharedView}
          canEdit={canEdit}
          onPhaseToggle={handleInternalPhaseToggle}
        />
      ) : (
        // ==========================================
        // Branch B: Current Active Roadmap and Collapsible History Overview
        // ==========================================
        <div className="flex flex-col gap-10">
          {/* Active Primary Roadmap Card */}
          {activeCurrentPlan && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                  <span className="text-accent">◈</span>
                  {t("current_plan")}
                </h2>
              </div>

              <PlanCard
                plan={activeCurrentPlan}
                variant="current"
                onSelect={(plan) => setSelectedPlan(plan)}
              />
            </section>
          )}

          {/* Archived Roadmap Trajectories List */}
          {activeHistoryPlans.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-text-secondary tracking-tight flex items-center gap-2">
                  <span className="text-text-muted">◇</span>
                  {t("history_plan")}
                </h2>
                <span className="text-xs font-mono text-text-muted">
                  {activeHistoryPlans.length} {t("preserved")}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {(showAllHistory ? activeHistoryPlans : activeHistoryPlans.slice(0, 1)).map(
                  (historyPlan) => (
                    <PlanCard
                      key={historyPlan.id}
                      plan={historyPlan}
                      variant="history"
                      onSelect={(plan) => setSelectedPlan(plan)}
                    />
                  )
                )}

                {/* Expansion Toggle Button for Archived Plans */}
                {historyPlans.length > 1 && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-semibold text-text-secondary hover:text-accent bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent/50 rounded-xl transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      <span>
                        {showAllHistory
                          ? tHistory("collapse_history")
                          : `${tHistory("view_more")} (${historyPlans.length - 1})`}
                      </span>
                      <span>{showAllHistory ? "▲" : "▼"}</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
