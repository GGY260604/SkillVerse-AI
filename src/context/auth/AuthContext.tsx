"use client";

// --- Available State Actions ---
// openAuthModal(view, email) / closeAuthModal(): control the authentication modal.
// setAuthModalView(view) / setPendingEmail(email): update the current auth flow.
// setUser(user) / checkAuth() / logout(): update or validate the authenticated user.

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  authModalNotice: string;
  openAuthModal: (view?: AuthModalView, email?: string, notice?: string) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
  setPendingEmail: (email: string) => void;
  setAuthModalNotice: (notice: string) => void;
  checkAuth: (isHeartbeat?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = "skillverse_auth_cache";

// --- Context Provider ---
// Manage authentication state, session validation, proactive heartbeat, and authentication modal visibility.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize user and loading consistently between SSR and client initial hydration to avoid hydration mismatch.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>("login");
  const [pendingEmail, setPendingEmail] = useState("");
  const [authModalNotice, setAuthModalNotice] = useState("");

  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Ref tracking current user state for timer and listener callbacks without stale closures.
  const userRef = useRef<AuthUser | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // --- Modal Actions ---
  const openAuthModal = useCallback(
    (view: AuthModalView = "login", email: string = "", notice?: string) => {
      setAuthModalView(view);
      if (email) setPendingEmail(email);
      if (notice !== undefined) {
        setAuthModalNotice(notice);
      }
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalNotice("");
  }, []);

  // --- Session Expiration Handler ---
  const handleSessionExpired = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(AUTH_CACHE_KEY);
      } catch {}
    }
    openAuthModal("login", "", "session_expired");
  }, [openAuthModal]);

  // --- Session Validation ---
  const checkAuth = useCallback(async (isHeartbeat: boolean = false): Promise<boolean> => {
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

      const hadPreviousUser =
        Boolean(userRef.current) ||
        (typeof window !== "undefined" && Boolean(sessionStorage.getItem(AUTH_CACHE_KEY)));

      setUser(null);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(AUTH_CACHE_KEY);
        } catch {}
      }

      // If active session check detects that a logged-in user's session expired, inform the user
      if (isHeartbeat && hadPreviousUser) {
        openAuthModal("login", "", "session_expired");
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
  }, [openAuthModal]);

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

    checkAuth(false);
  }, [checkAuth]);

  // --- Proactive Session Heartbeat & Window Focus Check ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && userRef.current) {
        checkAuth(true);
      }
    };

    // Heartbeat every 2.5 minutes if logged in
    const heartbeatInterval = setInterval(() => {
      if (userRef.current) {
        checkAuth(true);
      }
    }, 150000);

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [checkAuth]);

  // --- Global 401 Interception (Reactive Detection on User Actions) ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSessionExpiredEvent = () => {
      handleSessionExpired();
    };

    window.addEventListener("skillverse:session-expired", handleSessionExpiredEvent);

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);

      if (res.status === 401) {
        const input = args[0];
        let url = "";
        if (typeof input === "string") {
          url = input;
        } else if (input instanceof Request) {
          url = input.url;
        } else if (input && typeof (input as any).href === "string") {
          url = (input as any).href;
        }

        const isAuthEndpoint =
          url.includes("/api/auth/login") ||
          url.includes("/api/auth/verify-otp") ||
          url.includes("/api/auth/forgot-password") ||
          url.includes("/api/auth/reset-password") ||
          url.includes("/api/auth/session");

        const isInternalApi = url.includes("/api/");

        if (isInternalApi && !isAuthEndpoint) {
          window.dispatchEvent(new CustomEvent("skillverse:session-expired"));
        }
      }

      return res;
    };

    return () => {
      window.removeEventListener("skillverse:session-expired", handleSessionExpiredEvent);
      window.fetch = originalFetch;
    };
  }, [handleSessionExpired]);

  // --- Auth Redirect Handling ---
  useEffect(() => {
    const authQuery = searchParams.get("auth");
    if (authQuery === "login" && !user && !isLoading) {
      setIsAuthModalOpen(true);
      setAuthModalView("login");
    }
  }, [searchParams, user, isLoading]);

  // --- Authentication Actions ---
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAuthModalNotice("");
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
        authModalNotice,
        openAuthModal,
        closeAuthModal,
        setAuthModalView,
        setPendingEmail,
        setAuthModalNotice,
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
