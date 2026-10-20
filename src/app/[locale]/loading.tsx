"use client";

import { useTranslations } from "next-intl";
import Logo from "@/components/Logo";

// Localized Route Loading Shell
// Render instant high-tech telemetry skeleton and orbital glow while content resolves.
export default function Loading() {
  const t = useTranslations("status.loading");

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] px-4 sm:px-6 relative overflow-hidden select-none animate-fade-in">
      {/* Background Radial Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />

      {/* Center Quantum Orbital Spinner Container */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer Pulsing Orbital Ring */}
        <div className="w-24 h-24 rounded-full border border-accent/20 border-t-accent animate-spin duration-1000" />

        {/* Inner Counter-Rotating Ring */}
        <div className="absolute w-16 h-16 rounded-full border border-border-subtle border-b-accent/60 animate-spin duration-700 direction-reverse" />

        {/* Center Pulsing SkillVerse Logo */}
        <div className="absolute w-10 h-10 rounded-xl bg-bg-card border border-border-accent/40 flex items-center justify-center shadow-[0_0_20px_var(--accent-glow-strong)] animate-pulse-glow">
          <Logo showText={false} iconSize={20} />
        </div>
      </div>

      {/* Status Title & Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2 text-center">{t("title")}</h2>
      <p className="text-xs sm:text-sm text-text-secondary text-center max-w-md leading-relaxed mb-8">{t("subtitle")}</p>

      {/* Shimmering Progress Bar Track */}
      <div className="w-64 sm:w-72 h-1 rounded-full bg-border-subtle overflow-hidden relative">
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-accent to-transparent animate-shimmer" />
      </div>
    </div>
  );
}
