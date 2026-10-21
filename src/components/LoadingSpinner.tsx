"use client";

import React from "react";
import Logo from "@/components/Logo";

export interface LoadingSpinnerProps {
  /**
   * Title text or React node to display below the spinner.
   * If omitted, null, or false, the title will not be rendered.
   */
  title?: React.ReactNode;

  /**
   * Subtitle text or React node to display below the title.
   * If omitted, null, or false, the subtitle will not be rendered.
   */
  subtitle?: React.ReactNode;

  /**
   * Whether to display the bottom blue line / progress bar track.
   * Defaults to true. Set to false to hide completely.
   */
  showProgressBar?: boolean;

  /**
   * Optional progress percentage (0 - 100).
   * When provided, renders a filled progress track of that percentage.
   * When omitted, renders an ambient infinite shimmering blue beam.
   */
  progressPercent?: number;

  /**
   * Size variant for the orbital animation.
   * 'sm' | 'md' | 'lg'. Defaults to 'md'.
   */
  size?: "sm" | "md" | "lg";

  /**
   * Custom className for the root wrapper.
   */
  className?: string;

  /**
   * Custom className for the title.
   */
  titleClassName?: string;

  /**
   * Custom className for the subtitle.
   */
  subtitleClassName?: string;

  /**
   * Custom className for the progress bar track.
   */
  progressBarClassName?: string;
}

const SIZE_CONFIGS = {
  sm: {
    outerRing: "w-16 h-16",
    innerRing: "w-11 h-11",
    logoBox: "w-7 h-7 rounded-lg",
    logoIconSize: 14,
    containerMargin: "mb-4",
    title: "text-sm font-bold text-text-primary tracking-tight mb-1",
    subtitle: "text-[11px] text-text-secondary max-w-xs leading-relaxed mb-4",
    progressBar: "w-44 h-1",
  },
  md: {
    outerRing: "w-20 h-20",
    innerRing: "w-14 h-14",
    logoBox: "w-9 h-9 rounded-xl shadow-[0_0_20px_var(--accent-glow-strong)]",
    logoIconSize: 18,
    containerMargin: "mb-6",
    title: "text-base sm:text-lg font-bold text-text-primary tracking-tight mb-1.5",
    subtitle: "text-xs text-text-secondary max-w-sm leading-relaxed mb-6",
    progressBar: "w-56 sm:w-64 h-1",
  },
  lg: {
    outerRing: "w-24 h-24",
    innerRing: "w-16 h-16",
    logoBox: "w-10 h-10 rounded-xl shadow-[0_0_20px_var(--accent-glow-strong)]",
    logoIconSize: 20,
    containerMargin: "mb-8",
    title: "text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2",
    subtitle: "text-xs sm:text-sm text-text-secondary max-w-md leading-relaxed mb-8",
    progressBar: "w-64 sm:w-72 h-1",
  },
} as const;

export default function LoadingSpinner({
  title,
  subtitle,
  showProgressBar = true,
  progressPercent,
  size = "md",
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  progressBarClassName = "",
}: LoadingSpinnerProps) {
  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none animate-fade-in ${className}`}
    >
      {/* Center Quantum Orbital Spinner Container */}
      <div className={`relative flex items-center justify-center ${cfg.containerMargin}`}>
        {/* Outer Pulsing Orbital Ring */}
        <div
          className={`${cfg.outerRing} rounded-full border border-accent/20 border-t-accent animate-spin duration-1000`}
        />

        {/* Inner Counter-Rotating Ring */}
        <div
          className={`absolute ${cfg.innerRing} rounded-full border border-border-subtle border-b-accent/60 animate-spin duration-700 direction-reverse`}
        />

        {/* Center Pulsing Logo */}
        <div
          className={`absolute ${cfg.logoBox} bg-bg-card border border-border-accent/40 flex items-center justify-center animate-pulse-glow`}
        >
          <Logo showText={false} iconSize={cfg.logoIconSize} />
        </div>
      </div>

      {/* Title (Optional) */}
      {Boolean(title) && (
        <h3 className={`${cfg.title} ${titleClassName}`}>{title}</h3>
      )}

      {/* Subtitle (Optional) */}
      {Boolean(subtitle) && (
        <p className={`${cfg.subtitle} ${subtitleClassName}`}>{subtitle}</p>
      )}

      {/* Bottom Blue Line / Progress Bar Track (Optional) */}
      {showProgressBar && (
        <div
          className={`rounded-full bg-border-subtle overflow-hidden relative ${cfg.progressBar} ${progressBarClassName}`}
        >
          {progressPercent !== undefined ? (
            <div
              className="bg-accent h-full transition-all duration-500 rounded-full shadow-[0_0_10px_var(--accent-glow)]"
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-accent to-transparent animate-shimmer" />
          )}
        </div>
      )}
    </div>
  );
}
