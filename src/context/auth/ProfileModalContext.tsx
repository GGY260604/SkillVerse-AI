"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

interface ProfileModalContextType {
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined);

/**
 * ProfileModalProvider Component
 * Coordinate global user profile editing modal visibility and controls.
 *
 * Component Requirements:
 * - Modal visibility toggling: Expose openProfileModal and closeProfileModal handlers.
 *
 * Workflow:
 * 1. Initialize modal visibility state flag.
 * 2. Define open and close callbacks.
 * 3. Provide profile modal context to consumer components.
 */
export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
  // ==========================================
  // Step 1: Initialize Profile Modal Visibility State
  // ==========================================
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // ==========================================
  // Step 2: Define Modal Open and Close Mutation Callbacks
  // ==========================================
  const openProfileModal = useCallback(() => {
    setIsProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  // ==========================================
  // Step 3: Expose Profile Modal Context Provider Tree
  // ==========================================
  return (
    <ProfileModalContext.Provider value={{ isProfileModalOpen, openProfileModal, closeProfileModal }}>
      {children}
    </ProfileModalContext.Provider>
  );
}

// --- Context Hook ---
export function useProfileModal() {
  const context = useContext(ProfileModalContext);
  if (!context) {
    throw new Error("useProfileModal must be used within a ProfileModalProvider");
  }
  return context;
}
