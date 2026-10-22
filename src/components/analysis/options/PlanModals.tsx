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

  // Guard against unauthenticated modal presentation
  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* Mode Selection Pathway Overlay */}
      <PathwaySelectModal />

      {/* Option 01: CV Upload Overlay */}
      <UploadOptionModal />

      {/* Option 02: Guided Diagnostic Wizard Overlay */}
      <WizardOptionModal />

      {/* Top 5 Role Discovery & Reskilling Selection Overlay */}
      <RoleSelectorModal />
    </>
  );
}
