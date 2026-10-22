"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/context/ThemeContext";

interface DarkLightSwicherProps {
  className?: string;
  showLabel?: boolean;
}

// --- Dark / Light Mode Switcher Component ---
// Render an accessible toggle button to seamlessly switch between dark and light themes.
export default function DarkLightSwicher({
  className = "",
  showLabel = false,
}: DarkLightSwicherProps) {
  const t = useTranslations("layout.nav");
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by mounting client-side.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-bg-card border border-border-subtle animate-pulse ${className}`}
      />
    );
  }

  const isDark = theme === "dark";
  const labelText = isDark ? t("lightMode") : t("darkMode");

  // --- UI ---
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={labelText}
      title={labelText}
      className={`group relative inline-flex items-center justify-center rounded-xl bg-bg-card border border-border-subtle hover:border-accent text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer shadow-xs ${
        showLabel ? "h-10 px-3.5 gap-2 w-full" : "w-9 h-9 shrink-0"
      } ${className}`}
    >
      {/* Dynamic Sun / Moon Icon with Smooth Transitions */}
      {isDark ? (
        // Sun Icon for Dark Mode (indicating switch to light)
        <svg
          className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300"
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
      ) : (
        // Moon Icon for Light Mode (indicating switch to dark)
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
      )}

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide">
          {labelText}
        </span>
      )}
    </button>
  );
}
