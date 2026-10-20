"use client";

import React, { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";

// Profile Overlay Modal Component
// Provide dedicated user profile workspace overlay window.
export default function ProfileModal() {
  const t = useTranslations("other.nav");
  const { isProfileModalOpen, closeProfileModal, logout, user } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to dismiss modal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isProfileModalOpen) {
        closeProfileModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileModalOpen, closeProfileModal]);

  if (!isProfileModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProfileModal();
      }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-bg-card/95 border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 pointer-events-none" />

        {/* Top Controls: Brand & Actions Bar (Separated by border-b line) */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6">
          {/* Brand Header (Top-Left) */}
          <Logo size="sm" />

          {/* Modal Top Actions: Logout & Close Button (Top-Right) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeProfileModal();
                logout();
              }}
              className="text-text-muted hover:text-negative p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
              title={t("logout")}
              aria-label={t("logout")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>

            <div className="h-4 w-px bg-border-subtle" />

            <button
              type="button"
              onClick={closeProfileModal}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">
          {t("profile")}
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
          User profile settings and personalized workforce telemetry.
        </p>

        {/* Content Placeholder Area */}
        <div className="rounded-xl border border-dashed border-border-subtle bg-bg-secondary/40 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-glow border border-border-accent/40 flex items-center justify-center text-accent mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          {user?.email && (
            <div className="mb-2">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-0.5">
                Signed In Account
              </span>
              <span className="text-sm font-semibold text-text-primary font-mono break-all">
                {user.email}
              </span>
            </div>
          )}

          <p className="text-xs text-text-muted italic mt-2">
            User profile content will be populated here.
          </p>
        </div>
      </div>
    </div>
  );
}
