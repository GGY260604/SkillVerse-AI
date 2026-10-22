"use client";

// --- Available State Actions ---
// openAuthModal(view, email) / closeAuthModal(): control the authentication modal.
// setAuthModalView(view) / setPendingEmail(email): update the current auth flow.
// setUser(user) / checkAuth() / logout(): update or validate the authenticated user.

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";

export type AuthModalView =
  | "login"
  | "register"
  | "forgot"
  | "verify-register"
  | "verify-forgot";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  pendingEmail: string;
  openAuthModal: (view?: AuthModalView, email?: string) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  setPendingEmail: (email: string) => void;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = "skillverse_auth_cache";

// --- Context Provider ---
// Manage authentication state, session validation, and authentication modal visibility.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize user and loading consistently between SSR and client initial hydration to avoid hydration mismatch.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>("login");
  const [pendingEmail, setPendingEmail] = useState("");

  const searchParams = useSearchParams();
  const pathname = usePathname();

  // --- Session Validation ---
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data.user));
            } catch {}
          }
          return true;
        }
      }
      setUser(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(AUTH_CACHE_KEY);
        } catch {}
      }
      return false;
    } catch {
      setUser(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(AUTH_CACHE_KEY);
        } catch {}
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Initial Session Restore ---
  useEffect(() => {
    // Instantly restore cached session on browser client mount without causing SSR mismatch
    try {
      const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch {}

    checkAuth();
  }, [checkAuth]);

  // --- Auth Redirect Handling ---
  useEffect(() => {
    const authQuery = searchParams.get("auth");
    if (authQuery === "login" && !user && !isLoading) {
      setIsAuthModalOpen(true);
      setAuthModalView("login");
    }
  }, [searchParams, user, isLoading]);

  // --- Modal Actions ---
  const openAuthModal = useCallback(
    (view: AuthModalView = "login", email: string = "") => {
      setAuthModalView(view);
      if (email) setPendingEmail(email);
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // --- Authentication Actions ---
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(AUTH_CACHE_KEY);
        } catch {}
      }
      // Redirect to home page when logging out from a protected route.
      if (pathname.includes("/analysis") || pathname.includes("/shared")) {
        window.location.href = "/";
      }
    }
  }, [pathname]);

  // Update user state and its session cache synchronously.
  const handleSetUser = useCallback((newUser: AuthUser | null) => {
    setUser(newUser);
    if (typeof window !== "undefined") {
      try {
        if (newUser) {
          sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(newUser));
        } else {
          sessionStorage.removeItem(AUTH_CACHE_KEY);
        }
      } catch {}
    }
  }, []);

  // --- Context Value ---
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        isAuthModalOpen,
        authModalView,
        pendingEmail,
        openAuthModal,
        closeAuthModal,
        setAuthModalView,
        setPendingEmail,
        checkAuth,
        logout,
        setUser: handleSetUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --- Context Hook ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
