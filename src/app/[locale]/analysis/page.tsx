"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import EmptyPlanState from "@/components/analysis/EmptyPlanState";
import ExistPlanState from "@/components/analysis/ExistPlanState";
import { usePlanModal } from "@/context/PlanModalContext";

// Temporary Plan Existence Flag for Testing and Prototyping
// Toggle this flag or append ?plan=true or ?plan=false to the URL to simulate different states.
export const HAS_PLAN: boolean = true;

// Career Analysis Dashboard Page
// Handles conditional presentation between EmptyPlanState and ExistPlanState.
export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn, isLoading, openAuthModal } = useAuth();
  const { activePlan } = usePlanModal();

  // Redirect unauthenticated user to home and trigger login modal.
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [isLoading, isLoggedIn, openAuthModal, router]);

  // Check URL query override or fallback to activePlan presence or HAS_PLAN constant.
  const planQuery = searchParams.get("plan");
  const planExists =
    planQuery === "false"
      ? false
      : planQuery === "true"
      ? true
      : Boolean(activePlan) || HAS_PLAN;

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

  // Render full dashboard when plan exists (passing real activePlan if generated)
  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
      <ExistPlanState currentPlan={activePlan || undefined} />
    </div>
  );
}

