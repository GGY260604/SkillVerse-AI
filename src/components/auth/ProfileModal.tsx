"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";

// Profile Overlay Modal Component
// Displays read-only user email and editable display name with immediate database and session sync.
export default function ProfileModal() {
  const tNav = useTranslations("other.nav");
  const tProfile = useTranslations("other.profile");
  const { isProfileModalOpen, closeProfileModal, logout, user, setUser, checkAuth } = useAuth();

  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync initial name when modal opens or user updates
  useEffect(() => {
    if (isProfileModalOpen) {
      const currentName =
        user?.name ||
        (user?.metadata?.name as string) ||
        (user?.metadata?.full_name as string) ||
        "";
      setName(currentName);
      setInitialName(currentName);
      setStatus(null);

      // Fetch latest profile from API to ensure accurate DB state
      let isMounted = true;
      fetch("/api/profile", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && data.user?.name) {
            setName(data.user.name);
            setInitialName(data.user.name);
          }
        })
        .catch(() => {});

      // Autofocus editable name input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      return () => {
        isMounted = false;
      };
    }
  }, [isProfileModalOpen, user]);

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

  const isDirty = name.trim() !== initialName.trim();
  const canSave = isDirty && name.trim().length > 0 && !isSaving;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSave) return;

    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus({
          type: "error",
          text: data.error || tProfile("save_error"),
        });
        return;
      }

      const updatedName = name.trim();
      setInitialName(updatedName);

      // Instantly update AuthContext global user state
      if (user) {
        setUser({
          ...user,
          name: updatedName,
          metadata: {
            ...user.metadata,
            name: updatedName,
            full_name: updatedName,
          },
        });
      }

      await checkAuth();

      setStatus({
        type: "success",
        text: tProfile("save_success"),
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setStatus((prev) => (prev?.type === "success" ? null : prev));
      }, 3000);
    } catch {
      setStatus({
        type: "error",
        text: tProfile("save_error"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentDisplayName = name.trim() || initialName.trim() || user?.email || "User";
  const avatarLetter = (name.trim() || initialName.trim() || user?.email || "U").charAt(0).toUpperCase();

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
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-36 bg-accent/10 blur-3xl pointer-events-none rounded-full" />

        {/* Top Controls: Brand & Actions Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6">
          {/* Brand Header */}
          <Logo size="sm" />

          {/* Modal Top Actions: Logout & Close Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeProfileModal();
                logout();
              }}
              className="text-text-muted hover:text-negative p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
              title={tNav("logout")}
              aria-label={tNav("logout")}
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
              aria-label={tProfile("btn_close")}
              title={tProfile("btn_close")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1.5">
            {tProfile("title")}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {tProfile("subtitle")}
          </p>
        </div>

        {/* User Identity Hero Banner */}
        <div className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-4 sm:p-5 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xl font-bold text-bg-primary shadow-[0_0_20px_var(--accent-glow-strong)] shrink-0">
            {avatarLetter}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-text-primary truncate mb-1">
              {currentDisplayName}
            </h3>

            <p className="text-xs font-mono text-text-muted truncate">
              {user?.email || "No email linked"}
            </p>
          </div>
        </div>

        {/* Form Area */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Name Field (可以修改的名字 / Editable Display Name) */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="profile-display-name"
                className="text-xs font-semibold font-mono uppercase tracking-wider text-text-secondary"
              >
                {tProfile("name_label")}
              </label>

              {isDirty && (
                <span className="text-[10px] font-mono text-warning">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <input
                ref={inputRef}
                id="profile-display-name"
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (status) setStatus(null);
                }}
                placeholder={tProfile("name_placeholder")}
                className="w-full bg-bg-secondary border border-border-subtle hover:border-border-hover focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl px-4 py-3 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-medium"
              />
              <div className="absolute right-3.5 text-text-muted pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            </div>

            <p className="text-[11px] text-text-muted mt-1.5">
              {tProfile("name_hint")}
            </p>
          </div>

          {/* Feedback Status Alert */}
          {status && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 animate-fade-in ${
                status.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-negative/10 text-negative border-negative/30"
              }`}
            >
              <span>{status.type === "success" ? "✓" : "⚠"}</span>
              <span>{status.text}</span>
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeProfileModal}
              className="px-4 py-2.5 text-xs font-semibold font-mono text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card-hover border border-border-subtle rounded-xl transition-all cursor-pointer"
            >
              {tProfile("btn_close")}
            </button>

            <button
              type="submit"
              disabled={!canSave}
              className="px-5 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-xl border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{tProfile("btn_saving")}</span>
                </>
              ) : (
                <span>{tProfile("btn_save")}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

