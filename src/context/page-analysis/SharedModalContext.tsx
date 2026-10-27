"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "@/context/auth/AuthContext";

interface SharedModalContextType {
  isSharedPlansModalOpen: boolean;
  shareRoadmapData: { id?: string; title?: string } | null;
  openSharedPlansModal: (roadmapId?: string, roadmapTitle?: string) => void;
  closeSharedPlansModal: () => void;
}

interface SharedModalState {
  isOpen: boolean;
  shareRoadmapData: { id?: string; title?: string } | null;
  wasLoggedIn: boolean;
}

const SharedModalContext = createContext<SharedModalContextType | undefined>(undefined);

/**
 * SharedModalProvider Component
 * Coordinate peer sharing overlay modal and active roadmap sharing permissions.
 *
 * Component Requirements:
 * - Authentication guarding: Intercept share actions for guests and prompt login.
 * - Share target context: Store selected roadmap identifier and title for grant mutations.
 *
 * Workflow:
 * 1. Synchronize modal state with user authentication status.
 * 2. Guard modal opening with authentication check and set target roadmap metadata.
 * 3. Provide modal state and open/close handlers to consumers.
 */
export function SharedModalProvider({ children }: { children: React.ReactNode }) {
  // ==========================================
  // Step 1: Synchronize Modal State with User Authentication Status
  // ==========================================
  const { isLoggedIn, openAuthModal } = useAuth();
  const [modalState, setModalState] = useState<SharedModalState>(() => ({
    isOpen: false,
    shareRoadmapData: null,
    wasLoggedIn: isLoggedIn,
  }));

  if (modalState.wasLoggedIn !== isLoggedIn) {
    setModalState({
      isOpen: false,
      shareRoadmapData: null,
      wasLoggedIn: isLoggedIn,
    });
  }

  // ==========================================
  // Step 2: Guard Modal Opening with Authentication and Set Target Metadata
  // ==========================================
  const openSharedPlansModal = useCallback(
    (roadmapId?: string, roadmapTitle?: string) => {
      if (!isLoggedIn) {
        openAuthModal("login");
        return;
      }
      setModalState({
        isOpen: true,
        shareRoadmapData: { id: roadmapId, title: roadmapTitle },
        wasLoggedIn: true,
      });
    },
    [isLoggedIn, openAuthModal]
  );

  const closeSharedPlansModal = useCallback(() => {
    setModalState((state) => ({
      ...state,
      isOpen: false,
      shareRoadmapData: null,
    }));
  }, []);

  // ==========================================
  // Step 3: Expose Shared Modal Context Provider to Application Tree
  // ==========================================
  return (
    <SharedModalContext.Provider
      value={{
        isSharedPlansModalOpen: modalState.isOpen,
        shareRoadmapData: modalState.shareRoadmapData,
        openSharedPlansModal,
        closeSharedPlansModal,
      }}
    >
      {children}
    </SharedModalContext.Provider>
  );
}

// --- Context Hook ---
export function useSharedModal() {
  const context = useContext(SharedModalContext);
  if (!context) {
    throw new Error("useSharedModal must be used within a SharedModalProvider");
  }
  return context;
}
