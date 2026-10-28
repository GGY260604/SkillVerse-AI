"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "skillverse-theme";

/**
 * ThemeProvider Component
 * Manage application theme state (dark and light modes) and synchronize HTML data attributes.
 *
 * Component Requirements:
 * - Persistent theme preferences: Store active theme in localStorage.
 * - DOM document synchronization: Update documentElement data-theme attribute and CSS classes.
 *
 * Workflow:
 * 1. Read stored theme preference from browser localStorage or default to dark.
 * 2. Apply theme attributes and styling classes to root document element.
 * 3. Expose active theme state, setter, and toggle handler to consumers.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // ==========================================
  // Step 1: Read Stored Theme Preference on Client Mount
  // ==========================================
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    // ==========================================
    // Branch A: Valid Saved Theme Found
    // ==========================================
    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      // ==========================================
      // Branch B: Default Platform Dark Theme
      // ==========================================
      setThemeState("dark");
      applyTheme("dark");
    }
    setMounted(true);
  }, []);

  // ==========================================
  // Step 2: Apply Theme Attributes and Classes to Root Document Element
  // ==========================================
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    // ==========================================
    // Branch A: Light Theme Application
    // ==========================================
    if (newTheme === "light") {
      root.classList.remove("dark", "scheme-dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    } else {
      // ==========================================
      // Branch B: Dark Theme Application
      // ==========================================
      root.classList.remove("light");
      root.classList.add("dark", "scheme-dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {}
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const nextTheme: Theme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (e) {}
      applyTheme(nextTheme);
      return nextTheme;
    });
  };

  // Listen to window custom event broadcast for theme toggling.
  useEffect(() => {
    const handleToggleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme?: Theme }>;
      const targetTheme = customEvent.detail?.theme;
      if (targetTheme === "dark" || targetTheme === "light") {
        setTheme(targetTheme);
      } else {
        toggleTheme();
      }
    };

    window.addEventListener("toggle-theme", handleToggleEvent);
    return () => {
      window.removeEventListener("toggle-theme", handleToggleEvent);
    };
  }, []);

  // ==========================================
  // Step 3: Provide Theme Context to Children Components
  // ==========================================
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
