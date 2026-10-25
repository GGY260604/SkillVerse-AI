"use client";

import { useTranslations } from "next-intl";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Localized route loading skeleton view.
 * Render instant orbital telemetry animation and localized status message during navigation transitions.
 */
export default function Loading() {
  // ==========================================
  // Step 1: Initialize Localized Status Translations
  // ==========================================
  // Bind localization catalog for navigation loading feedback.
  const t = useTranslations("other.status.loading");

  // ==========================================
  // Step 2: Render Loading Shell and Orbital Indicator
  // ==========================================
  // Display ambient glow and animated loading spinner component.
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 relative overflow-hidden select-none animate-fade-in">
      {/* ========================================== */}
      {/* Background Ambient Glow */}
      {/* ========================================== */}
      {/* Render radial ambient backdrop glow. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />

      {/* ========================================== */}
      {/* Orbital Loading Indicator */}
      {/* ========================================== */}
      {/* Render loading spinner with animated progress bar and status text. */}
      <LoadingSpinner
        title={t("title")}
        subtitle={t("subtitle")}
        showProgressBar={true}
        size="lg"
      />
    </div>
  );
}
