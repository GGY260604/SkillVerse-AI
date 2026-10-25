"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/auth/AuthContext";
import { ProfileIntakePayload } from "@/lib/analysis/types";
import { PlanData } from "@/components/page-analysis/planCard/planData";

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

/**
 * PlanModalProvider Component
 * Coordinate analysis modal workflows (pathway selection, file upload, wizard creation, and role matching).
 *
 * Component Requirements:
 * - Workflow orchestration: Manage active modal view and prefilled profile intake payload.
 * - Authentication guarding: Intercept modal actions for unauthenticated visitors and redirect to login.
 * - Active plan state: Store active roadmap plan for interactive inspection and editing.
 *
 * Workflow:
 * 1. Initialize modal state, active profile payload, and active roadmap plan.
 * 2. Guard modal opening with authentication check and navigate to /analysis when needed.
 * 3. Provide modal open/close actions and plan state mutations to consumers.
 * 4. Clean up active modal state when user logs out.
 */
export function PlanModalProvider({ children }: { children: React.ReactNode }) {
  // ==========================================
  // Step 1: Initialize Modal State, Active Profile Payload, and Active Plan
  // ==========================================
  const [activeModal, setActiveModal] = useState<PlanModalType>(null);
  const [activeProfile, setActiveProfile] = useState<ProfileIntakePayload | null>(null);
  const [activePlan, setActivePlan] = useState<PlanData | null>(null);
  const [wizardPrefillData, setWizardPrefillData] = useState<any | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, openAuthModal } = useAuth();

  // ==========================================
  // Step 2: Handle Modal Routing and Authentication-Guarded Launchers
  // ==========================================
  const navigateToAnalysisIfNeeded = useCallback(() => {
    if (pathname !== "/analysis" && pathname !== "/shared") {
      router.push("/analysis");
    }
  }, [pathname, router]);

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

  // ==========================================
  // Step 3: Handle Active Roadmap Plan Cache and State Cleanup
  // ==========================================
  const saveActivePlan = useCallback((plan: PlanData) => {
    setActivePlan(plan);
  }, []);

  const clearActivePlan = useCallback(() => {
    setActivePlan(null);
  }, []);

  useEffect(() => {
    if (!isLoggedIn && activeModal !== null) {
      setActiveModal(null);
      setWizardPrefillData(null);
      setActiveProfile(null);
      setTargetUserId(null);
      setTargetUserName(null);
    }
  }, [isLoggedIn, activeModal]);

  // ==========================================
  // Step 4: Expose Plan Modal Context Provider to Application Tree
  // ==========================================
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
