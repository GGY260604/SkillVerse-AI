"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/auth/AuthContext";
import { usePlanModal } from "@/context/analysis/PlanModalContext";
import { type PlanData } from "@/components/page-analysis/planCard/planData";
import EmptyPlanState from "@/components/page-analysis/EmptyPlanState";
import ExistPlanState from "@/components/page-analysis/ExistPlanState";
import Disclaimer from "@/components/page-analysis/Disclaimer";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Career Analysis Page
 *
 * Synchronizes user career reskilling trajectories, manages interactive milestones,
 * and dynamically renders either active roadmaps or empty state prompts.
 *
 * Page Requirements:
 * - Authentication: Required (unauthenticated visitors are redirected to the homepage with login modal displayed).
 * - Context Dependencies: AuthContext, PlanModalContext.
 * - Server Endpoints: GET /api/page-analysis/roadmaps.
 *
 * Workflow:
 * 1. Validate user authentication and gate unauthorized access.
 * 2. Fetch active and archived roadmaps from the server endpoint.
 * 3. Subscribe to real-time roadmap synthesis and refresh events.
 * 4. Handle milestone completion and optimistic state updates.
 * 5. Display localized loading indicators during asynchronous synchronization.
 * 6. Conditionally render roadmap views based on plan existence:
 *    - Branch A: Mount existing plan dashboard when current or historical roadmaps exist.
 *    - Branch B: Mount empty plan state when no roadmaps are present in the database.
 */
export default function AnalysisPage() {
  const t = useTranslations("analysis");
  const router = useRouter();
  const { isLoggedIn, isLoading, openAuthModal } = useAuth();
  const { activePlan } = usePlanModal();

  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<PlanData | null>(null);
  const [historyPlans, setHistoryPlans] = useState<PlanData[]>([]);

  // ==========================================
  // Step 1: Validate User Authentication and Gate Unauthorized Access
  // ==========================================
  // Redirect unauthenticated visitors back to the home page and trigger the login modal.
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [isLoading, isLoggedIn, openAuthModal, router]);

  // ==========================================
  // Step 2: Fetch Active and Archived Roadmaps from the Server Endpoint
  // ==========================================
  // Query uncached roadmap records from the database through the Next.js API route handler.
  const fetchRoadmaps = useCallback(async () => {
    try {
      setIsLoadingRoadmaps(true);
      const res = await fetch("/api/page-analysis/roadmaps", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentPlan(data.currentPlan);
          setHistoryPlans(data.historyPlans || []);
        }
      }
    } catch (err) {
      console.error("[AnalysisPage] Failed to fetch roadmaps from database:", err);
    } finally {
      setIsLoadingRoadmaps(false);
    }
  }, []);

  // Synchronize roadmaps immediately once the user session is authenticated.
  useEffect(() => {
    if (isLoggedIn) {
      fetchRoadmaps();
    }
  }, [isLoggedIn, fetchRoadmaps]);

  // ==========================================
  // Step 3: Subscribe to Real-Time Roadmap Synthesis and Refresh Events
  // ==========================================
  // Re-fetch roadmap data whenever a role selection or synthesis flow completes.
  useEffect(() => {
    const handleRefresh = (event?: Event) => {
      const customEvt = event as CustomEvent<{ newPlan?: PlanData }>;
      if (customEvt?.detail?.newPlan) {
        setCurrentPlan(customEvt.detail.newPlan);
      }
      fetchRoadmaps();
    };
    window.addEventListener("roadmap-refresh", handleRefresh);
    return () => {
      window.removeEventListener("roadmap-refresh", handleRefresh);
    };
  }, [fetchRoadmaps]);

  // ==========================================
  // Step 4: Handle Milestone Completion and Optimistic State Updates
  // ==========================================
  // Update phase completion state across active plans and archived versions.
  const handlePlanPhaseToggle = (phaseId: string, isCompleted: boolean) => {
    setCurrentPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases?.map((p) => (p.id === phaseId ? { ...p, isCompleted } : p)),
      };
    });
    setHistoryPlans((prev) =>
      prev.map((hp) => ({
        ...hp,
        phases: hp.phases?.map((p) => (p.id === phaseId ? { ...p, isCompleted } : p)),
      }))
    );
  };

  // Prevent UI flashing while checking authentication status.
  if (isLoading || !isLoggedIn) {
    return null;
  }

  // ==========================================
  // Step 5: Display Localized Loading Indicators During Asynchronous Synchronization
  // ==========================================
  // Render loading state while reading roadmap data from the database.
  if (isLoadingRoadmaps && !currentPlan && historyPlans.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
        <LoadingSpinner
          title={t("loading.title")}
          subtitle={t("loading.subtitle")}
          showProgressBar={false}
          size="lg"
        />
      </div>
    );
  }

  // ==========================================
  // Step 6: Conditionally Render Roadmap States Alongside Attribution Disclaimers
  // ==========================================
  // Determine whether any current or archived plan exists.
  const effectiveCurrentPlan = currentPlan || activePlan || undefined;
  const hasAnyPlan = Boolean(currentPlan || historyPlans.length > 0 || activePlan);

  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1 flex flex-col justify-between">
      {hasAnyPlan ? (
        // ==========================================
        // Branch A: Existing Career Roadmap Dashboard
        // ==========================================
        <ExistPlanState
          currentPlan={effectiveCurrentPlan}
          historyPlans={historyPlans}
          onPhaseToggle={handlePlanPhaseToggle}
        />
      ) : (
        // ==========================================
        // Branch B: Empty Career Plan Prompt State
        // ==========================================
        <EmptyPlanState />
      )}
      <Disclaimer />
    </div>
  );
}
