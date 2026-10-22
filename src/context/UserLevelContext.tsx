"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export interface ExpGainEvent {
  expGained: number;
  oldExp: number;
  newExp: number;
  oldLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  phaseTitle?: string;
}

interface UserLevelContextType {
  totalExp: number;
  level: number;
  currentLevelExp: number;
  progressPercent: number;
  addExp: (amount: number, phaseTitle?: string) => ExpGainEvent;
  expGainEvent: ExpGainEvent | null;
  dismissExpModal: () => void;
}

const UserLevelContext = createContext<UserLevelContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "skillverse_user_total_exp";

export function UserLevelProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const userId = user?.id || "guest";
  const storageKey = `${STORAGE_KEY_PREFIX}_${userId}`;

  // Initial EXP load from localStorage or user metadata
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

  // Sync with storage and database when user changes
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
      fetch("/api/user/exp", { cache: "no-store" })
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
          console.warn("[UserLevelContext] Failed to fetch exp from server:", err);
        });
    }
  }, [storageKey, user, isLoggedIn]);

  // Derived level stats: 100 EXP per level
  const level = Math.floor(totalExp / 100) + 1;
  const currentLevelExp = totalExp % 100;
  const progressPercent = currentLevelExp; // 0% to 99%

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

      // 1. Immediately cache in localStorage for instant responsiveness
      try {
        localStorage.setItem(storageKey, newExp.toString());
      } catch {
        // Ignore
      }

      // 2. Persist to database (Supabase auth.users user_metadata)
      if (isLoggedIn) {
        fetch("/api/user/exp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalExp: newExp, level: newLevel }),
        }).catch((err) => {
          console.warn("[UserLevelContext] Failed to sync EXP to database:", err);
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

  const dismissExpModal = useCallback(() => {
    setExpGainEvent(null);
  }, []);

  return (
    <UserLevelContext.Provider
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
    </UserLevelContext.Provider>
  );
}

export function useUserLevel(): UserLevelContextType {
  const context = useContext(UserLevelContext);
  if (!context) {
    throw new Error("useUserLevel must be used within a UserLevelProvider");
  }
  return context;
}
