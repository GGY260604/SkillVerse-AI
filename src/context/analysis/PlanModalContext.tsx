"use client";

// --- Available State Actions ---
// openPathwaySelect(options) / openUploadOption(options) / openWizardOption(data, options).
// openRoleSelect(profile, options): open a plan workflow modal.
// closeModals(): close the active plan modal and clear its transient options.
// saveActivePlan(plan) / clearActivePlan(): update or clear the active plan.

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/auth/AuthContext";
import { ProfileIntakePayload } from "@/lib/analysis/types";
import { PlanData } from "@/components/analysis/planCard/planData";

export type PlanModalType = "pathway_select" | "upload" | "wizard" | "role_select" | null;

// --- Context Contract ---
interface PlanModalContextType {
  activeModal: PlanModalType;
  activeProfile: ProfileIntakePayload | null;
  activePlan: PlanData | null;
  wizardPrefillData: any | null;
  targetUserId: string | null;
  targetUserName: string | null;
  openPathwaySelect: (options?: { targetUserId?: string; targetUserName?: string }) => void;
  openUploadOption: (options?: { targetUserId?: string; targetUserName?: string }) => void;
  openWizardOption: (prefillData?: any, options?: { targetUserId?: string; targetUserName?: string }) => void;
  openRoleSelect: (profile: ProfileIntakePayload, options?: { targetUserId?: string }) => void;
  closeModals: () => void;
  saveActivePlan: (plan: PlanData) => void;
  clearActivePlan: () => void;
}

const PlanModalContext = createContext<PlanModalContextType | undefined>(undefined);

// --- Context Provider ---
export function PlanModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<PlanModalType>(null);
  const [activeProfile, setActiveProfile] = useState<ProfileIntakePayload | null>(null);
  const [activePlan, setActivePlan] = useState<PlanData | null>(null);
  const [wizardPrefillData, setWizardPrefillData] = useState<any | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, openAuthModal } = useAuth();

  // --- Navigation ---
  const navigateToAnalysisIfNeeded = useCallback(() => {
    if (pathname !== "/analysis" && pathname !== "/shared") {
      router.push("/analysis");
    }
  }, [pathname, router]);

  // --- Modal Actions ---
  const openPathwaySelect = useCallback(
    (options?: { targetUserId?: string; targetUserName?: string }) => {
      if (!isLoggedIn) {
        openAuthModal("login");
        return;
      }
      if (options?.targetUserId !== undefined) {
        setTargetUserId(options.targetUserId || null);
        setTargetUserName(options.targetUserName || null);
      }
      navigateToAnalysisIfNeeded();
      setActiveModal("pathway_select");
    },
    [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]
  );

  const openUploadOption = useCallback(
    (options?: { targetUserId?: string; targetUserName?: string }) => {
      if (!isLoggedIn) {
        openAuthModal("login");
        return;
      }
      if (options?.targetUserId !== undefined) {
        setTargetUserId(options.targetUserId || null);
        setTargetUserName(options.targetUserName || null);
      }
      navigateToAnalysisIfNeeded();
      setActiveModal("upload");
    },
    [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]
  );

  const openWizardOption = useCallback(
    (prefillData?: any, options?: { targetUserId?: string; targetUserName?: string }) => {
      if (!isLoggedIn) {
        openAuthModal("login");
        return;
      }
      if (prefillData) {
        setWizardPrefillData(prefillData);
      }
      if (options?.targetUserId !== undefined) {
        setTargetUserId(options.targetUserId || null);
        setTargetUserName(options.targetUserName || null);
      }
      navigateToAnalysisIfNeeded();
      setActiveModal("wizard");
    },
    [isLoggedIn, openAuthModal, navigateToAnalysisIfNeeded]
  );

  const openRoleSelect = useCallback(
    (profile: ProfileIntakePayload, options?: { targetUserId?: string }) => {
      setActiveProfile(profile);
      if (options?.targetUserId !== undefined) {
        setTargetUserId(options.targetUserId || null);
      }
      navigateToAnalysisIfNeeded();
      setActiveModal("role_select");
    },
    [navigateToAnalysisIfNeeded]
  );

  const closeModals = useCallback(() => {
    setActiveModal(null);
    setWizardPrefillData(null);
    setTargetUserId(null);
    setTargetUserName(null);
  }, []);

  // --- Active Plan Actions ---
  const saveActivePlan = useCallback((plan: PlanData) => {
    setActivePlan(plan);
  }, []);

  const clearActivePlan = useCallback(() => {
    setActivePlan(null);
  }, []);

  // --- Authentication Cleanup ---
  useEffect(() => {
    if (!isLoggedIn && activeModal !== null) {
      setActiveModal(null);
      setWizardPrefillData(null);
      setActiveProfile(null);
      setTargetUserId(null);
      setTargetUserName(null);
    }
  }, [isLoggedIn, activeModal]);

  // --- Context Value ---
  return (
    <PlanModalContext.Provider
      value={{
        activeModal,
        activeProfile,
        activePlan,
        wizardPrefillData,
        targetUserId,
        targetUserName,
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

// --- Context Hook ---
export function usePlanModal() {
  const context = useContext(PlanModalContext);
  if (!context) {
    throw new Error("usePlanModal must be used within a PlanModalProvider");
  }
  return context;
}
