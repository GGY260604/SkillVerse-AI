"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import EmptyPlanState from "@/components/analysis/EmptyPlanState";
import ExistPlanState from "@/components/analysis/ExistPlanState";

// =================================================================================================
// Analysis Page UI Flow and State Architecture Overview
// =================================================================================================
// This overview documents the complete UI state transitions, modal workflows, and navigation logic.
// While future backend API integrations may alter specific data fields, these core UI interactions will remain intact.
//
// 1. Top-Level Page State
// - Empty Plan State:
//   * Active when no career roadmap exists for the current session.
//   * Mounts the EmptyPlanState component with centered prompt and call to action.
//   * Clicking the Add New Plan button invokes openPathwaySelect() to launch the pathway selection modal.
// - Exist Plan State:
//   * Active when an active or historical roadmap is present.
//   * Mounts the ExistPlanState component to display the overview dashboard or detailed inspection views.
//
// 2. Global Modal and Pathway Selection Flow
// - Managed globally through PlanModalContext and mounted in PlanModals.
// - Pathway Select Modal:
//   * Offers two diagnostic paths: Option 1 (CV Upload) and Option 2 (Guided Diagnostic Wizard).
// - Upload Option Modal:
//   * Supports resume file drag-and-drop with staged parsing animation.
//   * The back button in the header returns the user to the pathway selection modal.
// - Wizard Option Modal:
//   * Provides a four-step diagnostic questionnaire spanning background, skills, career target, and SDG alignment.
//   * The back button on step one returns the user to the pathway selection modal.
// - Modal Trigger Points:
//   * Add New Plan button inside EmptyPlanState.
//   * Edit Plan and Share Plan action buttons in the ExistPlanState header (hidden when viewing historical plan details).
//   * Navigation entry points from the homepage hero and navigation bars.
//
// 3. Two-Tier Plan Inspection System
// - Governed by the local selectedPlan state inside ExistPlanState.
// - Overview Mode (selectedPlan is null):
//   * Current Plan Section:
//     - Highlights the primary active career roadmap with vibrant accent colors and match metrics.
//     - Clicking the current plan card sets selectedPlan to CURRENT_PLAN and enters detail mode.
//   * Historical Plans Archive:
//     - Renders archived plans in subdued, translucent card styles.
//     - Shows only the latest archived plan by default, with an expand/collapse toggle when more exist.
//     - Clicking any historical card sets selectedPlan to that specific history plan and enters detail mode.
// - Detail Mode (selectedPlan is not null):
//   * Displays a prominent back button to the left of the page title to return to overview mode.
//   * Mounts the PlanDetailView component with deep telemetry, gap analysis, and milestone roadmaps.
//   * When viewing the current plan, the Edit Plan and Share Plan buttons remain accessible and artifact verification is interactive.
//   * When viewing historical plans, the Edit Plan and Share Plan buttons are hidden and the view is rendered in full read-only grayscale.
// =================================================================================================

// Temporary Plan Existence Flag for Testing and Prototyping
// Toggle this flag or append ?plan=true or ?plan=false to the URL to simulate different states.
export const HAS_PLAN: boolean = true;

// Career Analysis Dashboard Page

// Handles conditional presentation between EmptyPlanState and ExistPlanState.
export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn, isLoading, openAuthModal } = useAuth();

  // Redirect unauthenticated user to home and trigger login modal.
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [isLoading, isLoggedIn, openAuthModal, router]);

  // Check URL query override or fallback to HAS_PLAN constant.
  const planQuery = searchParams.get("plan");
  const planExists =
    planQuery === "false" ? false : planQuery === "true" ? true : HAS_PLAN;

  // Prevent flashing content while validating authentication or if unauthenticated.
  if (isLoading || !isLoggedIn) {
    return null;
  }


  // Render blank state if no plan exists.
  if (!planExists) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto py-12 px-4 sm:px-6 w-full flex-1 flex flex-col justify-center">
        <EmptyPlanState />
      </div>
    );
  }

  // Render full dashboard when plan exists.
  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
      <ExistPlanState />
    </div>
  );
}
