"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import EmptyPlanState from "@/components/analysis/EmptyPlanState";
import ExistPlanState from "@/components/analysis/ExistPlanState";
import LoadingSpinner from "@/components/LoadingSpinner";
import { usePlanModal } from "@/context/PlanModalContext";
import { PlanData } from "@/components/analysis/planCard/planData";

// Career Analysis Dashboard Page
// Dynamically reads the user's current roadmap and archived iterations from database.
// Displays EmptyPlanState if no roadmaps exist, or ExistPlanState if roadmaps are found.
export default function AnalysisPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn, isLoading, openAuthModal } = useAuth();
  const { activePlan } = usePlanModal();

  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<PlanData | null>(null);
  const [historyPlans, setHistoryPlans] = useState<PlanData[]>([]);

  // Redirect unauthenticated user to home and trigger login modal.
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [isLoading, isLoggedIn, openAuthModal, router]);

  // Fetch real roadmap data from database via Next.js API
  const fetchRoadmaps = useCallback(async () => {
    try {
      setIsLoadingRoadmaps(true);
      const res = await fetch("/api/analysis/roadmaps", { cache: "no-store" });
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

  // Initial load when user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchRoadmaps();
    }
  }, [isLoggedIn, fetchRoadmaps]);


  // Listen for roadmap-refresh event from role selector or other synthesis flows
  useEffect(() => {
    const handleRefresh = () => {
      fetchRoadmaps();
    };
    window.addEventListener("roadmap-refresh", handleRefresh);
    return () => {
      window.removeEventListener("roadmap-refresh", handleRefresh);
    };
  }, [fetchRoadmaps]);

  // URL query override for quick testing (?plan=true or ?plan=false)
  const planQuery = searchParams.get("plan");

  // Prevent flashing content while validating authentication or if unauthenticated.
  if (isLoading || !isLoggedIn) {
    return null;
  }

  // Loading state while checking roadmap existence from database
  if (isLoadingRoadmaps && !currentPlan && historyPlans.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
        <LoadingSpinner
          title={
            locale === "zh"
              ? "正在读取个人技能路线图..."
              : locale === "ms"
              ? "Memuatkan Pelan Hala Tuju Kemahiran..."
              : "Loading Career Reskilling Roadmaps..."
          }
          subtitle={
            locale === "zh"
              ? "从数据库同步您的当前规划与历史版本..."
              : locale === "ms"
              ? "Menyegerakkan pelan semasa dan sejarah daripada pangkalan data..."
              : "Synchronizing your current plan and milestone archives from database..."
          }
          showProgressBar={false}
          size="lg"
        />
      </div>
    );
  }

  const hasAnyPlan =
    planQuery === "false"
      ? false
      : planQuery === "true"
      ? true
      : Boolean(currentPlan || historyPlans.length > 0 || activePlan);

  // Render blank state if user has no roadmaps in the database
  if (!hasAnyPlan) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto py-12 px-4 sm:px-6 w-full flex-1 flex flex-col justify-center">
        <EmptyPlanState />
      </div>
    );
  }

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

  // Render full dashboard when roadmap(s) exist
  const effectiveCurrentPlan = currentPlan || activePlan || (historyPlans.length > 0 ? historyPlans[0] : undefined);

  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
      <ExistPlanState
        currentPlan={effectiveCurrentPlan}
        historyPlans={historyPlans}
        onPhaseToggle={handlePlanPhaseToggle}
      />
    </div>
  );
}
