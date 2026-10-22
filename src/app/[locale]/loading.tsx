"use client";

import { useTranslations } from "next-intl";
import LoadingSpinner from "@/components/LoadingSpinner";

// --- Localized Route Loading Shell ---
// Render instant high-tech telemetry skeleton and orbital glow while content resolves.
export default function Loading() {
  const t = useTranslations("status.loading");

  // --- UI ---
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 relative overflow-hidden select-none animate-fade-in">
      {/* Background Radial Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />

      <LoadingSpinner
        title={t("title")}
        subtitle={t("subtitle")}
        showProgressBar={true}
        size="lg"
      />
    </div>
  );
}
