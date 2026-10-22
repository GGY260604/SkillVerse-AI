"use client";

// --- Available State Actions ---
// addExp(amount, phaseTitle): add EXP, persist it, and open the reward modal.
// dismissExpModal(): close the EXP reward modal.
// EXP totals and reward events are updated internally; raw setters are not exposed.

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth/AuthContext";

export interface ExpGainEvent {
  expGained: number;
  oldExp: number;
  newExp: number;
  oldLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  phaseTitle?: string;
}

interface ExpGainContextType {
  totalExp: number;
  level: number;
  currentLevelExp: number;
  progressPercent: number;
  addExp: (amount: number, phaseTitle?: string) => ExpGainEvent;
  expGainEvent: ExpGainEvent | null;
  dismissExpModal: () => void;
}

const ExpGainContext = createContext<ExpGainContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "skillverse_user_total_exp";

// --- Context Provider ---
export function ExpGainProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const userId = user?.id || "guest";
  const storageKey = `${STORAGE_KEY_PREFIX}_${userId}`;

  // --- Initial EXP State ---
  // Load cached EXP without changing the server-rendered initial state.
  const [totalExp, setTotalExp] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return Math.max(0, parseInt(saved, 10) || 0);
      }
    } catch {
      // Ignore localStorage errors
    }
    return 0;
  });

  const [expGainEvent, setExpGainEvent] = useState<ExpGainEvent | null>(null);

  // --- EXP Synchronization ---
  // Sync local storage and the authoritative database value when the user changes.
  useEffect(() => {
    let resolvedExp = 0;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        resolvedExp = Math.max(0, parseInt(saved, 10) || 0);
      }
    } catch {
      // Ignore
    }

    if (user?.metadata && typeof user.metadata.exp === "number") {
      resolvedExp = Math.max(resolvedExp, user.metadata.exp);
    }

    setTotalExp(resolvedExp);

    // Fetch latest authoritative EXP and level from database for authenticated users
    if (isLoggedIn && user?.id) {
      fetch("/api/profile/exp", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (data && (typeof data.totalExp === "number" || typeof data.level === "number")) {
            let authoritativeExp = typeof data.totalExp === "number" ? data.totalExp : 0;
            // If database has a specific level specified that is higher than exp implies, align exp to match
            if (typeof data.level === "number" && data.level > 1) {
              const minExpForLevel = (data.level - 1) * 100;
              if (authoritativeExp < minExpForLevel) {
                authoritativeExp = minExpForLevel;
              }
            }
            setTotalExp(authoritativeExp);
            try {
              localStorage.setItem(storageKey, authoritativeExp.toString());
            } catch {
              // Ignore
            }
          }
        })
        .catch((err) => {
          console.warn("[ExpGainContext] Failed to fetch exp from server:", err);
        });
    }
  }, [storageKey, user, isLoggedIn]);

  // --- Derived Level Stats ---
  // Each level requires 100 EXP.
  const level = Math.floor(totalExp / 100) + 1;
  const currentLevelExp = totalExp % 100;
  const progressPercent = currentLevelExp; // 0% to 99%

  // --- EXP Awarding ---
  const addExp = useCallback(
    (amount: number, phaseTitle?: string): ExpGainEvent => {
      // Ensure positive multiple of 5
      const cleanAmount = Math.max(5, Math.min(100, Math.round(amount / 5) * 5));

      const oldExp = totalExp;
      const oldLevel = Math.floor(oldExp / 100) + 1;
      const newExp = oldExp + cleanAmount;
      const newLevel = Math.floor(newExp / 100) + 1;
      const didLevelUp = newLevel > oldLevel;

      setTotalExp(newExp);

      // Cache EXP immediately for a responsive UI.
      try {
        localStorage.setItem(storageKey, newExp.toString());
      } catch {
        // Ignore
      }

      // Persist the updated total for authenticated users.
      if (isLoggedIn) {
        fetch("/api/profile/exp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalExp: newExp, level: newLevel }),
        }).catch((err) => {
          console.warn("[ExpGainContext] Failed to sync EXP to database:", err);
        });
      }

      const event: ExpGainEvent = {
        expGained: cleanAmount,
        oldExp,
        newExp,
        oldLevel,
        newLevel,
        didLevelUp,
        phaseTitle,
      };

      setExpGainEvent(event);
      return event;
    },
    [totalExp, storageKey, isLoggedIn]
  );

  // --- Modal Actions ---
  const dismissExpModal = useCallback(() => {
    setExpGainEvent(null);
  }, []);

  // --- Context Value ---
  return (
    <ExpGainContext.Provider
      value={{
        totalExp,
        level,
        currentLevelExp,
        progressPercent,
        addExp,
        expGainEvent,
        dismissExpModal,
      }}
    >
      {children}
    </ExpGainContext.Provider>
  );
}

// --- Context Hook ---
export function useExpGain(): ExpGainContextType {
  const context = useContext(ExpGainContext);
  if (!context) {
    throw new Error("useExpGain must be used within an ExpGainProvider");
  }
  return context;
}
