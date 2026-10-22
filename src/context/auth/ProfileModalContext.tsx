"use client";

// --- Available State Actions ---
// openProfileModal(): show the profile modal.
// closeProfileModal(): hide the profile modal.

import React, { createContext, useCallback, useContext, useState } from "react";

interface ProfileModalContextType {
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextType | undefined>(undefined);

// --- Context Provider ---
export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openProfileModal = useCallback(() => {
    setIsProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  // --- Context Value ---
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
