"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";
import Logo from "@/components/Logo";

export interface SharedCollaborator {
  id: string;
  name: string | null;
  email: string;
  accessLevel: "no_access" | "viewable" | "editable";
}

// SharedPlansModal Component
// Global overlay modal managed via PlanModalContext (matching UploadOptionModal, WizardOptionModal, RoleSelectorModal).
// Allows searching users by UID/Email and managing viewable/editable access to a roadmap.
export default function SharedPlansModal() {
  const t = useTranslations("analysis.share_modal");
  const { activeModal, shareRoadmapData, closeModals } = usePlanModal();

  const isOpen = activeModal === "share";
  const roadmapId = shareRoadmapData?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"none" | "all">("none");
  const [collaborators, setCollaborators] = useState<SharedCollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch users based on search term or filter
  const fetchUsers = useCallback(
    async (queryText: string, filterMode: "none" | "all") => {
      // If no filter selected and no search term, reset list to empty
      if (filterMode === "none" && !queryText.trim()) {
        setCollaborators([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams();
        if (roadmapId) params.set("roadmapId", roadmapId);

        if (filterMode !== "none") {
          params.set("filter", filterMode);
        } else if (queryText.trim()) {
          params.set("search", queryText.trim());
        }

        const res = await fetch(`/api/analysis/roadmaps/share?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMsg(data.error || "Failed to load collaborators.");
          setCollaborators([]);
          return;
        }

        setCollaborators(data.users || []);
      } catch {
        setErrorMsg("Network error occurred while fetching users.");
        setCollaborators([]);
      } finally {
        setIsLoading(false);
      }
    },
    [roadmapId]
  );

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setFilter("none");
      setCollaborators([]);
      setErrorMsg(null);
      setHasSearched(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Escape key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        closeModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, closeModals]);

  // Handle Search Submission
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (filter !== "none") {
      setFilter("none");
    }
    fetchUsers(searchQuery, "none");
  };

  // Handle Filter Change
  const handleFilterChange = (newFilter: "none" | "all") => {
    setFilter(newFilter);
    if (newFilter !== "none") {
      setSearchQuery("");
      fetchUsers("", newFilter);
    } else {
      setCollaborators([]);
      setHasSearched(false);
    }
  };

  // Handle Access Level Change
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
        setErrorMsg(data.error || "Failed to update permission.");
        return;
      }

      // Update local state immediately
      setCollaborators((prev) =>
        prev
          .map((c) => (c.id === targetUserId ? { ...c, accessLevel: newAccessLevel } : c))
          .filter((c) => {
            if (filter === "all" && newAccessLevel === "no_access") return false;
            return true;
          })
      );
    } catch {
      setErrorMsg("Network error occurred while saving permission.");
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) closeModals();
      }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-bg-card/95 border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
      >
        {/* Top Controls: Brand & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
          </div>

          <button
            type="button"
            onClick={closeModals}
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

        {/* Header Title & Subtitle */}
        <div className="mb-6 shrink-0 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
            {t("title")}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Search Bar & Access Filter Row (Rendered directly without outer wrapping box) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5 shrink-0">
          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full h-10 bg-bg-card border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl pl-4 pr-9 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-mono"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  if (filter === "none") {
                    setCollaborators([]);
                    setHasSearched(false);
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 border-none bg-transparent cursor-pointer"
                title="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          {/* Search Action Button (Square + Magnifying Glass) */}
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            disabled={!searchQuery.trim() || isLoading}
            className="w-10 h-10 flex items-center justify-center bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:opacity-90 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title="Search"
            aria-label="Search"
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

          {/* Access Level Filter Dropdown: Only Search Mode ('none') and All Shared ('all') */}
          <div className="relative shrink-0">
            <select
              value={filter}
              onChange={(e) =>
                handleFilterChange(e.target.value as "none" | "all")
              }
              aria-label={t("filter_label")}
              className="w-full sm:w-auto h-10 appearance-none bg-bg-card border border-border-subtle hover:border-border-hover focus:border-accent text-xs font-mono text-text-primary rounded-xl px-3.5 py-2 pr-8 outline-none cursor-pointer transition-colors"
            >
              <option value="none">{t("filter_none")}</option>
              <option value="all">{t("filter_all")}</option>
            </select>

            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
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

        {/* Collaborators List Area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 focus:outline-none min-h-36">
          {/* Loading Skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 flex items-center justify-between gap-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-bg-card shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-32 bg-bg-card rounded" />
                      <div className="h-2.5 w-48 bg-bg-card/60 rounded" />
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-bg-card rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {/* Simple Centered Gray Text When No Results (No dashed box, no icons) */}
          {!isLoading && collaborators.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-16 text-center">
              <p className="text-xs sm:text-sm text-text-muted font-mono">
                No users found matching your search or filter.
              </p>
            </div>
          )}

          {/* Collaborator User Cards List */}
          {!isLoading &&
            collaborators.map((user) => {
              const displayName = user.name || user.email.split("@")[0] || "User";
              const initial = (user.name || user.email || "U").charAt(0).toUpperCase();
              const isUpdating = updatingUserId === user.id;
              const isShared = user.accessLevel === "viewable" || (user.accessLevel as string) === "editable";

              return (
                <div
                  key={user.id}
                  className="group relative rounded-xl border border-border-subtle hover:border-accent bg-bg-secondary/40 hover:bg-bg-secondary/70 p-4 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm hover:shadow-[0_0_25px_var(--accent-glow)]"
                >
                  {/* Left Identity Card (Styled like Profile user identity card) */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      {initial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                          {displayName}
                        </h4>
                        <span className="text-xs font-mono text-text-muted truncate">
                          • {user.email}
                        </span>
                        {isShared && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold bg-accent/15 text-accent border-accent/40">
                            Shared
                          </span>
                        )}
                      </div>

                      {/* User UID with 1-Click Copy Button */}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-text-muted">
                        <span className="font-semibold text-text-secondary">UID:</span>
                        <span className="text-text-muted select-all truncate max-w-45 sm:max-w-none">
                          {user.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyUid(user.id)}
                          className="p-1 text-text-muted hover:text-accent transition-colors bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded cursor-pointer shrink-0 inline-flex items-center gap-1"
                          title="Copy UID"
                          aria-label="Copy UID"
                        >
                          {copiedId === user.id ? (
                            <span className="text-[10px] text-accent font-semibold inline-flex items-center gap-0.5">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Copied</span>
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

                  {/* Right Side: Share Action Button (Share Icon) */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
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
                      title={isShared ? "Shared (Click to revoke)" : "Share roadmap"}
                      aria-label={isShared ? "Shared" : "Share roadmap"}
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
