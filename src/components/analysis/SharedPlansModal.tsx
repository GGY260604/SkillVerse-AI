"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSharedModal } from "@/context/analysis/SharedModalContext";
import Logo from "@/components/Logo";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getAvatarInitials } from "@/lib/avatar";

// --- Shared Plans Modal ---
// Search users, display their roadmap access and level, and update sharing permissions.
export interface SharedCollaborator {
  id: string;
  name: string | null;
  email: string;
  level: number;
  accessLevel: "no_access" | "viewable" | "editable";
}

export default function SharedPlansModal() {
  const t = useTranslations("analysis.share_modal");
  const { isSharedPlansModalOpen, shareRoadmapData, closeSharedPlansModal } = useSharedModal();

  const isOpen = isSharedPlansModalOpen;
  const roadmapId = shareRoadmapData?.id;

  // --- State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [collaborators, setCollaborators] = useState<SharedCollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Collaborator Data ---
  // Load current collaborators on open and search by user details.
  const fetchUsers = useCallback(
    async (queryText: string) => {
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const params = new URLSearchParams();
        if (roadmapId) params.set("roadmapId", roadmapId);

        if (!queryText.trim()) {
          params.set("filter", "all");
        } else {
          params.set("search", queryText.trim());
        }

        const res = await fetch(`/api/analysis/roadmaps/share?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMsg(data.error || t("error_load"));
          setCollaborators([]);
          return;
        }

        setCollaborators(data.users || []);
      } catch {
        setErrorMsg(t("network_error_load"));
        setCollaborators([]);
      } finally {
        setIsLoading(false);
      }
    },
    [roadmapId, t]
  );

  // Refresh collaborator state whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      fetchUsers("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, fetchUsers]);

  // --- Modal Lifecycle & Actions ---
  // Close on Escape unless a collaborator request is still in progress.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        closeSharedPlansModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, closeSharedPlansModal]);

  // Search collaborators by UID or email.
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchUsers(searchQuery);
  };

  // Save the access change and update the local list.
  const handleAccessChange = async (targetUserId: string, newAccessLevel: "no_access" | "viewable") => {
    setUpdatingUserId(targetUserId);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/analysis/roadmaps/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          targetUserId,
          accessLevel: newAccessLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || t("error_save"));
        return;
      }

      setCollaborators((prev) => {
        if (!searchQuery.trim() && newAccessLevel === "no_access") {
          return prev.filter((collaborator) => collaborator.id !== targetUserId);
        }

        return prev.map((collaborator) =>
          collaborator.id === targetUserId
            ? { ...collaborator, accessLevel: newAccessLevel }
            : collaborator
        );
      });
    } catch {
      setErrorMsg(t("network_error_save"));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedId(uid);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  if (!isOpen) return null;

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) closeSharedPlansModal();
      }}
    >
      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] bg-bg-card/95 border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up flex flex-col"
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
          </div>

          <button
            type="button"
            onClick={closeSharedPlansModal}
            disabled={isLoading}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
            aria-label={t("btn_close")}
            title={t("btn_close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Heading */}
        <div className="mb-6 shrink-0 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
            {t("title")}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Collaborator Search */}
        <div className="flex w-full min-w-0 flex-row items-center gap-2.5 mb-5 shrink-0">
          {/* Search Field */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              className="h-10 w-full min-w-0 bg-bg-card border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl pl-4 pr-9 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-mono"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchUsers("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 border-none bg-transparent cursor-pointer"
                title={t("clear_search")}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          {/* Search Button */}
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            disabled={!searchQuery.trim() || isLoading}
            className="h-10 w-10 flex items-center justify-center bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:opacity-90 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title={t("search")}
            aria-label={t("search")}
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-negative/10 border border-negative/30 text-negative text-xs font-mono flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0 text-negative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Collaborator List */}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-1 focus:outline-none">
          {/* Loading State */}
          {isLoading && (
            <div className="flex min-h-52 items-center justify-center">
              <LoadingSpinner
                title={t("loading_title")}
                subtitle={t("loading_description")}
                showProgressBar={false}
                size="sm"
              />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && collaborators.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-16 text-center">
              <p className="text-xs sm:text-sm text-text-muted font-mono">
                {searchQuery.trim()
                  ? t("no_users_found")
                  : t("no_shared_members")}
              </p>
            </div>
          )}

          {/* Collaborator User Cards List */}
          {!isLoading &&
            collaborators.map((user) => {
              const displayName = user.name || user.email.split("@")[0] || t("user");
              const initial = getAvatarInitials(user.name || user.email);
              const isUpdating = updatingUserId === user.id;
              const isShared = user.accessLevel === "viewable" || (user.accessLevel as string) === "editable";

              return (
                <div
                  key={user.id}
                  className="group relative flex items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-secondary/40 p-3 transition-all duration-300 hover:border-accent hover:bg-bg-secondary/70 hover:shadow-[0_0_25px_var(--accent-glow)] sm:gap-3.5 sm:p-4"
                >
                  {/* Collaborator Identity */}
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
                    <div className="relative w-10 h-10 shrink-0 group-hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary shadow-sm">
                        {initial}
                      </div>
                              <span className="absolute -right-2 -bottom-1 rounded-full border border-bg-card bg-bg-primary px-1 py-0.5 text-[8px] font-mono font-bold leading-none text-accent shadow-sm">
                        Lv.{user.level}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                          {displayName}
                        </h4>
                        {isShared && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-accent/15 text-accent border-accent/40">
                            {t("shared")}
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-xs font-mono text-text-muted">
                        {user.email}
                      </span>

                      {/* User ID */}
                      <div className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[10px] font-mono text-text-muted">
                        <span className="shrink-0 font-semibold text-text-secondary">{t("uid")}</span>
                        <span className="select-all truncate text-text-muted">
                          {user.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUid(user.id)}
                          className="p-1 text-text-muted hover:text-accent transition-colors bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded cursor-pointer shrink-0 inline-flex items-center gap-1"
                          title={t("copy_uid")}
                          aria-label={t("copy_uid")}
                        >
                          {copiedId === user.id ? (
                            <span className="text-[10px] text-accent font-semibold inline-flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{t("copied")}</span>
                            </span>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>
                  </div>

                  {/* Access Controls */}
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        handleAccessChange(user.id, isShared ? "no_access" : "viewable")
                      }
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                        isShared
                          ? "bg-accent text-bg-primary border-accent hover:opacity-90 shadow-sm shadow-accent/20"
                          : "bg-bg-card hover:bg-bg-card-hover text-text-muted hover:text-accent border-border-subtle hover:border-accent"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isShared ? t("shared_revoke") : t("share_roadmap")}
                      aria-label={isShared ? t("shared") : t("share_roadmap")}
                    >
                      {isUpdating ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
