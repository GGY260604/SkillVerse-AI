import type { AnalyzeResponsePayload } from "@/lib/analysis/types";

// -------------------------------------------------------------
// Debugging / Testing Only (Role Selector)
// -------------------------------------------------------------

// Keep this constant false for live deployments.
export const USE_ROLE_SELECTOR_MODAL_MOCK_DATA = false;

// -------------------------------------------------------------

export const MOCK_ROLE_SELECTOR_ANALYSIS_RESULT: AnalyzeResponsePayload = {
  assessmentId: "testing-role-selector",
  sessionId: "testing-role-selector",
  generatedAt: "2026-01-01T00:00:00.000Z",
  activeScenario: "moderate",
  radarData: [],
  topRoles: [
    {
      roleId: "testing-role",
      title: "Digital Skills Specialist",
      titleLocalized: "Digital Skills Specialist",
      industry: "Technology",
      matchScore: 0.86,
      scenarioMultiplierApplied: 1,
      sdgAlignments: [],
      matchedStrengths: ["Data analysis", "Communication"],
      skillsGap: [],
      atRiskCompetencies: [],
    },
  ],
};
