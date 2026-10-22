"use client";

// --- Available State Actions ---
// openSharedPlansModal(roadmapId, roadmapTitle): open the sharing modal for a roadmap.
// closeSharedPlansModal(): close the sharing modal and clear its roadmap data.

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

// --- Context Provider ---
export function SharedModalProvider({ children }: { children: React.ReactNode }) {
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

  // --- Context Value ---
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
