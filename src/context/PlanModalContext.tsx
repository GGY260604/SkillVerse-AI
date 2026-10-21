"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

export type PlanModalType = "pathway_select" | "upload" | "wizard" | null;

interface PlanModalContextType {
  activeModal: PlanModalType;
  openPathwaySelect: () => void;
  openUploadOption: () => void;
  openWizardOption: () => void;
  closeModals: () => void;
}

const PlanModalContext = createContext<PlanModalContextType | undefined>(undefined);

// Plan Modal Provider Component
// Coordinate overlay window transitions, automatic navigation to /analysis, and option modal state.
export function PlanModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<PlanModalType>(null);
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

  // Directly open guided diagnostic wizard option overlay window.
  const openWizardOption = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal("login");
      return;
    }
    navigateToAnalysisIfNeeded();
    setActiveModal("wizard");
  }, [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]);

  // Dismiss any currently active option or pathway modal.
  const closeModals = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Dismiss any active plan modal immediately when user logs out or session is unauthenticated.
  useEffect(() => {
    if (!isLoggedIn && activeModal !== null) {
      setActiveModal(null);
    }
  }, [isLoggedIn, activeModal]);

  return (
    <PlanModalContext.Provider
      value={{
        activeModal,
        openPathwaySelect,
        openUploadOption,
        openWizardOption,
        closeModals,
      }}
    >
      {children}
    </PlanModalContext.Provider>
  );
}

// Hook to access plan modal controls from any component.
export function usePlanModal() {
  const context = useContext(PlanModalContext);
  if (!context) {
    throw new Error("usePlanModal must be used within a PlanModalProvider");
  }
  return context;
}
