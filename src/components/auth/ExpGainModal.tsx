"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useExpGain } from "@/context/auth/ExpGainContext";
import {
  MOCK_EXP_GAIN_EVENT,
  USE_EXP_GAIN_MODAL_MOCK_DATA,
} from "@/constants/testing/expGain";

// --- EXP Reward Overlay ---
// Present earned EXP, level progress, and level-up feedback from the auth context.
export default function ExpGainModal() {
  const t = useTranslations("auth.exp_gain");
  const { expGainEvent, dismissExpModal } = useExpGain();
  // Use the test fixture only when no real reward event is active.
  const modalEvent = expGainEvent ?? (USE_EXP_GAIN_MODAL_MOCK_DATA ? MOCK_EXP_GAIN_EVENT : null);

  // --- Reward Animation State ---
  const [animatedExp, setAnimatedExp] = useState(0);
  const [barProgress, setBarProgress] = useState(0);
  const [showLevelUpEffect, setShowLevelUpEffect] = useState(false);

  // Count up the reward first, then animate the level bar and optional level-up transition.
  useEffect(() => {
    if (!modalEvent) {
      setAnimatedExp(0);
      setBarProgress(0);
      setShowLevelUpEffect(false);
      return;
    }

    const { expGained, oldExp, newExp, didLevelUp } = modalEvent;
    const oldLevelExp = oldExp % 100;
    const newLevelExp = newExp % 100;

    // Start with old progress
    setBarProgress(oldLevelExp);

    // 1. Ticking up the EXP number
    const duration = 1200; // ms
    const startTime = performance.now();
    let animationFrameId = 0;
    let levelUpTimer: ReturnType<typeof setTimeout> | undefined;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedExp(Math.round(easeOut * expGained));
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(frame);
      } else {
        setAnimatedExp(expGained);
      }
    };
    animationFrameId = requestAnimationFrame(frame);

    const timer1 = setTimeout(() => {
      if (didLevelUp) {
        setBarProgress(100);

        levelUpTimer = setTimeout(() => {
          setShowLevelUpEffect(true);
          setBarProgress(newLevelExp);
        }, 600);
      } else {
        setBarProgress(newLevelExp);
      }
    }, 250);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timer1);
      if (levelUpTimer) clearTimeout(levelUpTimer);
    };
  }, [modalEvent]);

  if (!modalEvent) return null;

  const { oldLevel, newLevel, didLevelUp, phaseTitle } = modalEvent;
  const currentShownLevel = showLevelUpEffect || !didLevelUp ? newLevel : oldLevel;

  // --- UI ---
  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-bg-card/95 border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] flex flex-col items-center text-center"
      >
        {/* Accent strip reflects whether this reward includes a level-up. */}
        <div
          className={`absolute inset-x-0 top-0 h-px bg-linear-to-r transition-all duration-700 ${
            showLevelUpEffect
              ? "from-amber-400/20 via-amber-300 to-violet-400/50"
              : "from-accent/20 via-accent to-accent/20"
          }`}
        />

        {/* Top Status Pill */}
        <div className="mb-5">
          {showLevelUpEffect ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-[0.16em] bg-linear-to-r from-amber-400/10 via-orange-300/10 to-violet-400/10 text-amber-200 border border-border-subtle">
              {t("level_up")}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-[0.16em] bg-accent/10 text-accent border border-border-subtle">
              {t("mastery_verified")}
            </span>
          )}
        </div>

        {/* Phase Title Reference */}
        {phaseTitle && (
          <h3 className="text-sm font-semibold text-text-secondary max-w-xs truncate mb-2">
            {phaseTitle}
          </h3>
        )}

        {/* EXP Reward Counter */}
        <div className="my-2 flex flex-col items-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
            {t("experience_acquired")}
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className={`text-4xl sm:text-5xl font-bold font-mono tracking-tight bg-clip-text text-transparent bg-linear-to-r transition-all duration-700 ${
                showLevelUpEffect
                  ? "from-amber-200 via-amber-400 to-orange-300"
                  : "from-accent via-emerald-300 to-accent"
              }`}
            >
              +{animatedExp}
            </span>
            <span
              className={`text-sm font-semibold font-mono transition-colors duration-700 ${
                showLevelUpEffect ? "text-amber-300/80" : "text-text-secondary"
              }`}
            >
              EXP
            </span>
          </div>
        </div>

        {/* Level Badge */}
        <div className="my-5 relative flex items-center justify-center">
          <div
            className={`w-22 h-22 rounded-full flex flex-col items-center justify-center border border-border-subtle transition-all duration-700 ${
              showLevelUpEffect
                ? "bg-linear-to-br from-amber-300/20 via-orange-400/10 to-violet-400/10"
                : "bg-linear-to-b from-accent/20 via-accent/10 to-bg-secondary"
            }`}
          >
            <span className="text-2xl font-black font-mono text-text-primary tracking-tight">
              Lv.{currentShownLevel}
            </span>
            {didLevelUp && !showLevelUpEffect && (
              <span className="text-[9px] font-mono text-text-secondary font-medium">
                {t("advancing")}
              </span>
            )}
            {showLevelUpEffect && (
              <span className="text-[9px] font-mono text-amber-300 font-medium">
                {t("new_rank")}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar towards Next Level (100 EXP requirement per level) */}
        <div className="w-full my-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">{t("next_level", { level: currentShownLevel + 1 })}</span>
            <span className="text-text-primary font-bold">{barProgress} / 100 EXP</span>
          </div>

          <div className="w-full h-2.5 bg-bg-secondary rounded-full overflow-hidden border border-border-subtle p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                showLevelUpEffect
                  ? "bg-linear-to-r from-amber-300 via-amber-400 to-orange-400"
                  : "bg-linear-to-r from-accent to-emerald-300"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, barProgress))}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-text-muted text-right">
            {t("exp_remaining", { remaining: 100 - barProgress, level: currentShownLevel + 1 })}
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={dismissExpModal}
          className={`w-full mt-2 py-3.5 px-6 rounded-xl font-bold font-mono text-xs uppercase tracking-wider cursor-pointer border-none transition-all duration-300 ${
            showLevelUpEffect
              ? "bg-linear-to-r from-amber-300 via-amber-400 to-orange-400 text-bg-primary hover:from-amber-200 hover:via-amber-300 hover:to-orange-300"
              : "bg-linear-to-r from-accent to-emerald-300 text-bg-primary hover:from-accent-dim hover:to-emerald-300"
          }`}
        >
          {showLevelUpEffect ? t("claim_level") : t("continue_roadmap")}
        </button>
      </div>
    </div>
  );
}
