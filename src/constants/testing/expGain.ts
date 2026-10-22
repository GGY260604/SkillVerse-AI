import type { ExpGainEvent } from "@/context/auth/ExpGainContext";

// -------------------------------------------------------------
// Debugging / Testing Only (Exp)
// -------------------------------------------------------------

// Keep this constant false for live deployments.
export const USE_EXP_GAIN_MODAL_MOCK_DATA = false;

// -------------------------------------------------------------

export const MOCK_EXP_GAIN_EVENT: ExpGainEvent = {
  expGained: 35,
  oldExp: 82,
  newExp: 117,
  oldLevel: 1,
  newLevel: 2,
  didLevelUp: true,
  phaseTitle: "Cloud Architecture & Resilient Systems",
};
