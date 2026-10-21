"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProfileIntakePayload } from "@/lib/fastapi/client";
import { PlanData } from "@/components/analysis/planCard/planData";

export type PlanModalType = "pathway_select" | "upload" | "wizard" | "role_select" | null;

interface PlanModalContextType {
  activeModal: PlanModalType;
  activeProfile: ProfileIntakePayload | null;
  activePlan: PlanData | null;
  wizardPrefillData: any | null;
  openPathwaySelect: () => void;
  openUploadOption: () => void;
  openWizardOption: (prefillData?: any) => void;
  openRoleSelect: (profile: ProfileIntakePayload) => void;
  closeModals: () => void;
  saveActivePlan: (plan: PlanData) => void;
  clearActivePlan: () => void;
}

const PlanModalContext = createContext<PlanModalContextType | undefined>(undefined);

export function PlanModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<PlanModalType>(null);
  const [activeProfile, setActiveProfile] = useState<ProfileIntakePayload | null>(null);
  const [activePlan, setActivePlan] = useState<PlanData | null>(null);
  const [wizardPrefillData, setWizardPrefillData] = useState<any | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, openAuthModal } = useAuth();

  // Redirect to analysis page when user triggers a plan creation or option workflow.
  const navigateToAnalysisIfNeeded = useCallback(() => {
    if (pathname !== "/analysis") {
      router.push("/analysis");
    }
  }, [pathname, router]);

  // Open pathway selection overlay window.
  const openPathwaySelect = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal("login");
      return;
    }
    navigateToAnalysisIfNeeded();
    setActiveModal("pathway_select");
  }, [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]);

  // Directly open upload option overlay window.
  const openUploadOption = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal("login");
      return;
    }
    navigateToAnalysisIfNeeded();
    setActiveModal("upload");
  }, [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]);

  // Directly open guided diagnostic wizard option overlay window with optional prefill data.
  const openWizardOption = useCallback(
    (prefillData?: any) => {
      if (!isLoggedIn) {
        openAuthModal("login");
        return;
      }
      if (prefillData) {
        setWizardPrefillData(prefillData);
      }
      navigateToAnalysisIfNeeded();
      setActiveModal("wizard");
    },
    [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]
  );

  // Open role discovery & selection modal with normalized profile data
  const openRoleSelect = useCallback(
    (profile: ProfileIntakePayload) => {
      setActiveProfile(profile);
      navigateToAnalysisIfNeeded();
      setActiveModal("role_select");
    },
    [navigateToAnalysisIfNeeded]
  );

  // Dismiss any currently active option or pathway modal.
  const closeModals = useCallback(() => {
    setActiveModal(null);
    setWizardPrefillData(null);
  }, []);

  // Save active synthesized plan
  const saveActivePlan = useCallback((plan: PlanData) => {
    setActivePlan(plan);
  }, []);

  const clearActivePlan = useCallback(() => {
    setActivePlan(null);
  }, []);

  // Dismiss any active plan modal immediately when user logs out or session is unauthenticated.
  useEffect(() => {
    if (!isLoggedIn && activeModal !== null) {
      setActiveModal(null);
      setWizardPrefillData(null);
      setActiveProfile(null);
    }
  }, [isLoggedIn, activeModal]);

  return (
    <PlanModalContext.Provider
      value={{
        activeModal,
        activeProfile,
        activePlan,
        wizardPrefillData,
        openPathwaySelect,
        openUploadOption,
        openWizardOption,
        openRoleSelect,
        closeModals,
        saveActivePlan,
        clearActivePlan,
      }}
    >
      {children}
    </PlanModalContext.Provider>
  );
}

export function usePlanModal() {
  const context = useContext(PlanModalContext);
  if (!context) {
    throw new Error("usePlanModal must be used within a PlanModalProvider");
  }
  return context;
}
