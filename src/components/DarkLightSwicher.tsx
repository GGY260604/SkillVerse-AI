"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/context/ThemeContext";

interface DarkLightSwicherProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * DarkLightSwicher Component
 * Render an accessible toggle button to seamlessly switch between dark and light themes.
 *
 * Component Requirements:
 * - Theme context integration: Toggle between dark and light themes with persistence.
 * - Hydration safety: Prevent hydration mismatch through client-side mounting checks.
 *
 * Workflow:
 * 1. Synchronize mounting state to avoid server/client hydration mismatches.
 * 2. Resolve active theme state and localized accessibility labels.
 * 3. Render theme toggle button with animated sun/moon indicators.
 */
export default function DarkLightSwicher({
  className = "",
  showLabel = false,
}: DarkLightSwicherProps) {
  const t = useTranslations("layout.nav");
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ==========================================
  // Step 1: Synchronize Mounting State to Prevent Hydration Mismatch
  // ==========================================
  useEffect(() => {
    setMounted(true);
  }, []);

  // ==========================================
  // Branch A: Unmounted Skeleton Placeholder
  // ==========================================
  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-bg-card border border-border-subtle animate-pulse ${className}`}
      />
    );
  }

  // ==========================================
  // Step 2: Resolve Active Theme State and Accessibility Labels
  // ==========================================
  const isDark = theme === "dark";
  const labelText = isDark ? t("darkMode") : t("lightMode");
  const actionTitle = isDark ? t("lightMode") : t("darkMode");

  // ==========================================
  // Step 3: Render Theme Toggle Button with Animated Sun/Moon Indicators
  // ==========================================
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={actionTitle}
      title={actionTitle}
      className={`group relative inline-flex items-center justify-center rounded-xl bg-bg-card border border-border-subtle hover:border-accent text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer shadow-xs ${
        showLabel ? "h-10 px-3.5 gap-2 w-full" : "w-9 h-9 shrink-0"
      } ${className}`}
    >
      {/* ========================================== */}
      {/* Branch B: Active Theme Icon Selection */}
      {/* ========================================== */}
      {isDark ? (
        // Lunar Vector Icon for Dark Theme
        <svg
          className="w-4 h-4 text-accent group-hover:-rotate-12 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // Solar Vector Icon for Light Theme
        <svg
          className="w-4 h-4 text-amber-500 group-hover:rotate-45 transition-transform duration-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide">
          {labelText}
        </span>
      )}
    </button>
  );
}
