"use client";

import React, { useEffect, useState } from "react";
import { useUserLevel } from "@/context/UserLevelContext";

export default function ExpGainModal() {
  const { expGainEvent, dismissExpModal } = useUserLevel();

  // Animation states
  const [animatedExp, setAnimatedExp] = useState(0);
  const [barProgress, setBarProgress] = useState(0);
  const [showLevelUpEffect, setShowLevelUpEffect] = useState(false);

  useEffect(() => {
    if (!expGainEvent) {
      setAnimatedExp(0);
      setBarProgress(0);
      setShowLevelUpEffect(false);
      return;
    }

    const { expGained, oldExp, newExp, didLevelUp } = expGainEvent;
    const oldLevelExp = oldExp % 100;
    const newLevelExp = newExp % 100;

    // Start with old progress
    setBarProgress(oldLevelExp);

    // 1. Ticking up the EXP number
    const duration = 1200; // ms
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedExp(Math.round(easeOut * expGained));

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setAnimatedExp(expGained);
      }
    };
    requestAnimationFrame(frame);

    // 2. Animate progress bar & handle level up transition
    const timer1 = setTimeout(() => {
      if (didLevelUp) {
        // First fill to 100%
        setBarProgress(100);

        // Then trigger Level Up fanfare
        const timer2 = setTimeout(() => {
          setShowLevelUpEffect(true);
          // Set to new level current exp
          setBarProgress(newLevelExp);
        }, 600);

        return () => clearTimeout(timer2);
      } else {
        // Smoothly glide to new current level exp
        setBarProgress(newLevelExp);
      }
    }, 250);

    return () => clearTimeout(timer1);
  }, [expGainEvent]);

  if (!expGainEvent) return null;

  const { expGained, oldLevel, newLevel, didLevelUp, phaseTitle } = expGainEvent;
  const currentShownLevel = showLevelUpEffect || !didLevelUp ? newLevel : oldLevel;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className={`w-125 h-125 rounded-full blur-[120px] transition-all duration-700 ${
            showLevelUpEffect
              ? "bg-amber-400/25 scale-125"
              : "bg-emerald-500/20 scale-100"
          }`}
        />
      </div>

      <div className="relative w-full max-w-md bg-bg-card border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Confetti / Particle Sparkles on Level Up */}
        {showLevelUpEffect && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute top-4 left-8 text-amber-400 text-xl animate-bounce">✨</span>
            <span className="absolute top-10 right-10 text-emerald-400 text-lg animate-pulse">🌟</span>
            <span className="absolute bottom-16 left-12 text-accent text-xl animate-bounce">⚡</span>
            <span className="absolute top-1/3 left-4 text-amber-300 text-sm animate-pulse">✦</span>
            <span className="absolute top-1/4 right-6 text-emerald-300 text-base animate-bounce">★</span>
            <span className="absolute bottom-20 right-8 text-amber-400 text-xl animate-pulse">✨</span>
          </div>
        )}

        {/* Top Status Pill */}
        <div className="mb-4">
          {showLevelUpEffect ? (
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-widest bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse">
              🎉 LEVEL UP ACHIEVED!
            </span>
          ) : (
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ⚡ SKILL MASTERY VERIFIED
            </span>
          )}
        </div>

        {/* Phase Title Reference */}
        {phaseTitle && (
          <h3 className="text-sm font-semibold text-text-secondary max-w-xs truncate mb-2">
            {phaseTitle}
          </h3>
        )}

        {/* EXP Reward Counter with glowing typography */}
        <div className="my-3 flex flex-col items-center">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
            Experience Acquired
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-400 tracking-tight drop-shadow-[0_0_20px_rgba(0,229,195,0.4)]">
              +{animatedExp}
            </span>
            <span className="text-base font-bold font-mono text-accent">EXP</span>
          </div>
        </div>

        {/* Level Avatar Badge / Transformation Animation */}
        <div className="my-4 relative flex items-center justify-center">
          <div
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-500 ${
              showLevelUpEffect
                ? "bg-linear-to-b from-amber-500/20 to-bg-secondary border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)] scale-110"
                : "bg-linear-to-b from-accent/20 to-bg-secondary border-accent/60 shadow-[0_0_25px_var(--accent-glow)]"
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold">
              Current Rank
            </span>
            <span className="text-2xl font-black font-mono text-text-primary tracking-tight">
              Lv.{currentShownLevel}
            </span>
            {didLevelUp && !showLevelUpEffect && (
              <span className="text-[10px] font-mono text-emerald-400 font-semibold animate-pulse">
                Leveling Up...
              </span>
            )}
            {showLevelUpEffect && (
              <span className="text-[10px] font-mono text-amber-300 font-bold animate-pulse">
                Rank Up!
              </span>
            )}
          </div>

          {/* Level Transition Indicator when leveled up */}
          {didLevelUp && showLevelUpEffect && (
            <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-amber-400 text-bg-primary text-[10px] font-black font-mono shadow-md animate-bounce">
              +1 LEVEL!
            </div>
          )}
        </div>

        {/* Progress Bar towards Next Level (100 EXP requirement per level) */}
        <div className="w-full my-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">Next Level (Lv.{currentShownLevel + 1})</span>
            <span className="text-text-primary font-bold">{barProgress} / 100 EXP</span>
          </div>

          <div className="w-full h-3 bg-bg-secondary rounded-full overflow-hidden border border-border-subtle p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                showLevelUpEffect
                  ? "bg-linear-to-r from-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                  : "bg-linear-to-r from-accent to-emerald-400 shadow-[0_0_12px_var(--accent-glow)]"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, barProgress))}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-text-muted text-right">
            {100 - barProgress} EXP remaining to reach Lv.{currentShownLevel + 1}
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={dismissExpModal}
          className={`w-full mt-2 py-3.5 px-6 rounded-xl font-bold font-mono text-xs uppercase tracking-wider cursor-pointer border-none transition-all duration-300 ${
            showLevelUpEffect
              ? "bg-linear-to-r from-amber-400 to-emerald-400 text-bg-primary hover:opacity-95 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
              : "bg-accent text-bg-primary hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)]"
          }`}
        >
          {showLevelUpEffect ? "Claim New Level & Continue" : "Continue Roadmap"}
        </button>
      </div>
    </div>
  );
}
