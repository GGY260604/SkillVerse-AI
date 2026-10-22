"use client";

import { useAuth } from "@/context/auth/AuthContext";
import PathwaySelectModal from "./PathwaySelectModal";
import UploadOptionModal from "./UploadOptionModal";
import WizardOptionModal from "./WizardOptionModal";
import RoleSelectorModal from "./RoleSelectorModal";

// --- Assessment Modal Orchestrator ---
// Mount the pathway, resume upload, profile wizard, and role-selection overlays for signed-in users.
export default function PlanModals() {
  const { isLoggedIn } = useAuth();

  // Assessment modals are only available to signed-in users.
  if (!isLoggedIn) {
    return null;
  }

  // --- UI ---
  return (
    <>
      {/* Assessment Pathway */}
      <PathwaySelectModal />

      {/* Resume Upload */}
      <UploadOptionModal />

      {/* Profile Wizard */}
      <WizardOptionModal />

      {/* Role Selection */}
      <RoleSelectorModal />
    </>
  );
}
