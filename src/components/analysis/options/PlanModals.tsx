"use client";

import { useAuth } from "@/context/AuthContext";
import PathwaySelectModal from "./PathwaySelectModal";
import UploadOptionModal from "./UploadOptionModal";
import WizardOptionModal from "./WizardOptionModal";

// Plan Modals Orchestrator Component
// Mount and manage lifecycle of all option and pathway overlay windows.
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
    </>
  );
}
