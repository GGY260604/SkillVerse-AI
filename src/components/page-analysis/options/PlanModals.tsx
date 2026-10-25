"use client";

import { useAuth } from "@/context/auth/AuthContext";
import PathwaySelectModal from "./PathwaySelectModal";
import UploadOptionModal from "./UploadOptionModal";
import WizardOptionModal from "./WizardOptionModal";
import RoleSelectorModal from "./RoleSelectorModal";

/**
 * Assessment and Roadmap Modals Orchestrator Component
 *
 * Mounts the complete lifecycle modal overlays for authenticated users,
 * including pathway selection, resume upload extraction, manual wizard intake, and role selection.
 *
 * Component Requirements:
 * - Authentication: Required (unauthenticated visitors render null).
 * - Context Dependencies: AuthContext, PlanModalContext.
 *
 * Workflow:
 * 1. Validate authenticated session state.
 * 2. Mount modal overlays:
 *    - Step 2.1: Mount pathway selection dialog.
 *    - Step 2.2: Mount resume upload document extraction dialog.
 *    - Step 2.3: Mount structured profile intake wizard dialog.
 *    - Step 2.4: Mount AI role-matching and roadmap synthesis dialog.
 */
export default function PlanModals() {
  const { isLoggedIn } = useAuth();

  // ==========================================
  // Step 1: Validate Authenticated Session State
  // ==========================================
  if (!isLoggedIn) {
    return null;
  }

  // ==========================================
  // Step 2: Mount Modal Overlays
  // ==========================================
  return (
    <>
      {/* Assessment Pathway Selection Modal */}
      <PathwaySelectModal />

      {/* Resume Document Upload and Extraction Modal */}
      <UploadOptionModal />

      {/* Structured Profile Intake Wizard Modal */}
      <WizardOptionModal />

      {/* AI Role Matching and Synthesis Modal */}
      <RoleSelectorModal />
    </>
  );
}
