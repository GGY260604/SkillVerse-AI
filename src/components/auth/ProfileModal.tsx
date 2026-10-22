"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/auth/AuthContext";
import { useProfileModal } from "@/context/auth/ProfileModalContext";
import { useExpGain } from "@/context/auth/ExpGainContext";
import Logo from "@/components/Logo";
import { getAvatarInitials } from "@/lib/avatar";

// --- Profile Overlay Modal ---
// Load the latest profile, save display-name edits, and synchronize the authenticated user state.
export default function ProfileModal() {
  const tNav = useTranslations("layout.nav");
  const tProfile = useTranslations("auth.profile");
  const { isProfileModalOpen, closeProfileModal } = useProfileModal();
  const { logout, user, setUser, checkAuth } = useAuth();
  const { level, currentLevelExp, progressPercent } = useExpGain();

  // --- Form State ---
  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Profile Hydration ---
  // 1. Prefill from AuthContext immediately, then replace it with the latest /api/profile value.
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

      // The API reads the database profile; ignore late responses after closing or switching users.
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

  // Auto-close ProfileModal when user session expires or logs out.
  useEffect(() => {
    if (isProfileModalOpen && !user) {
      closeProfileModal();
    }
  }, [isProfileModalOpen, user, closeProfileModal]);

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

  // --- Profile Update ---
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

      // 2. Reflect the saved name immediately, then refresh the authenticated session from the API.
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
  const avatarLetter = getAvatarInitials(name.trim() || initialName.trim() || user?.email);

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProfileModal();
      }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] bg-bg-card/95 border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up flex flex-col"
      >
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between mb-6">
          <Logo size="md" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                closeProfileModal();
                logout();
              }}
              className="text-text-muted hover:text-negative p-2 rounded-xl hover:bg-negative/10 border border-transparent hover:border-negative/20 cursor-pointer transition-all"
              title={tNav("logout")}
              aria-label={tNav("logout")}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="text-text-muted hover:text-text-primary p-2 rounded-xl hover:bg-bg-elevated border border-transparent hover:border-border-subtle cursor-pointer transition-all"
              aria-label={tProfile("btn_close")}
              title={tProfile("btn_close")}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-6 overscroll-contain">
          {/* Header Title & Subtitle */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-1">
              {tProfile("title")}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {tProfile("subtitle")}
            </p>
          </div>

          {/* User Identity Card */}
          <div className="rounded-2xl border border-border-subtle bg-bg-secondary/60 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-lg sm:text-xl font-bold text-bg-primary shadow-[0_0_20px_var(--accent-glow-strong)]">
                  {avatarLetter}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[9px] font-extrabold font-mono bg-bg-elevated border border-accent/70 text-accent rounded-full shadow-[0_0_10px_var(--accent-glow)] pointer-events-none select-none tracking-tight flex items-center justify-center"
                  title={tProfile("level_title", { level, currentExp: currentLevelExp })}
                >
                  Lv.{level}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-text-primary truncate">
                  {currentDisplayName}
                </h3>
                <p className="text-xs font-mono text-text-muted truncate mt-0.5">
                  {user?.email || tProfile("no_email")}
                </p>
              </div>
            </div>

            {/* UID Badge */}
            {user?.id && (
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="uppercase text-[10px] tracking-wider text-zinc-500 font-semibold shrink-0">{tProfile("uid_label")}</span>
                  <span className="text-zinc-400 select-all truncate">{user.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(user.id);
                    setCopiedUid(true);
                    setTimeout(() => setCopiedUid(false), 2000);
                  }}
                  className="p-1 text-zinc-400 hover:text-accent transition-colors bg-transparent border-none cursor-pointer rounded flex items-center justify-center shrink-0"
                  title={tProfile("copy_uid")}
                  aria-label={tProfile("copy_uid")}
                >
                  {copiedUid ? (
                    <span className="text-[10px] text-accent font-semibold">{tProfile("copied")}</span>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* EXP Progress */}
            <div className="flex items-center gap-3">
              <div
                role="progressbar"
                aria-label={tProfile("exp_progress_title")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={currentLevelExp}
                className="flex-1 bg-bg-primary/90 rounded-full h-2.5 overflow-hidden border border-border-subtle p-0.5"
              >
                <div
                  className="h-full bg-linear-to-r from-accent to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_var(--accent-glow)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-mono font-extrabold text-accent">
                {currentLevelExp}/100
              </span>
            </div>
          </div>

          {/* Form Area */}
          <form id="profile-edit-form" onSubmit={handleSave} className="space-y-4">
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
                    {tProfile("unsaved_changes")}
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
          </form>
        </div>

        {/* Modal Actions */}
        <div className="shrink-0 pt-5 mt-5 border-t border-border-subtle flex items-center justify-end">
          <button
            type="submit"
            form="profile-edit-form"
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
      </div>
    </div>
  );
}
