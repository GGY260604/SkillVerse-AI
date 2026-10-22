"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/auth/AuthContext";
import ExistPlanState from "@/components/analysis/ExistPlanState";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { PlanData } from "@/components/analysis/planCard/planData";

// --- Schema ---

// Shared roadmap record payload received from backend service.
export interface SharedRoadmapItem {
  id: string;
  roadmapId: string;
  ownerId: string;
  accessLevel: "viewable" | "editable";
  sharedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
    level?: number;
    role: string;
    department: string;
  };
  currentPlan: PlanData;
  historyPlans: PlanData[];
}

// --- SharedPlansView Component ---
// Manage received peer roadmaps, search through shared records, and inspect peer dashboards.
export default function SharedPlansView() {
  // --- Multi-Language Setup ---
  const t = useTranslations("shared");
  const tModal = useTranslations("analysis.share_modal");
  const router = useRouter();

  // --- Auth Context ---
  const { isLoggedIn, isLoading: isAuthLoading, openAuthModal } = useAuth();

  // --- State ---
  const [sharedRoadmaps, setSharedRoadmaps] = useState<SharedRoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSharedId, setActiveSharedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [itemToDelete, setItemToDelete] = useState<SharedRoadmapItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- Helper Functions ---

  // 1. Authentication Guard
  // Verify user authentication status before initiating shared directory retrieval.
  // Prompt sign-in modal and redirect to home if unauthenticated.
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [isAuthLoading, isLoggedIn, openAuthModal, router]);

  // 2. Telemetry Ingestion from Shared Service
  // Query shared roadmaps endpoint to fetch all active peer roadmaps.
  const fetchSharedRoadmaps = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/shared/roadmaps", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to load shared roadmaps.");
        setSharedRoadmaps([]);
        return;
      }

      setSharedRoadmaps(data.sharedRoadmaps || []);
    } catch {
      setErrorMsg("Network error occurred while fetching shared roadmaps.");
      setSharedRoadmaps([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch active shared records upon initial authenticated render.
  useEffect(() => {
    if (isLoggedIn) {
      fetchSharedRoadmaps();
    }
  }, [isLoggedIn, fetchSharedRoadmaps]);

  // 3. Search and Filter Computation
  // Filter shared roadmaps by owner name, email, user ID, role, and industry category.
  const filteredRoadmaps = useMemo(() => {
    if (!searchQuery.trim()) return sharedRoadmaps;

    const query = searchQuery.toLowerCase().trim();
    return sharedRoadmaps.filter((item) => {
      const name = (item.owner.name || "").toLowerCase();
      const email = item.owner.email.toLowerCase();
      const uid = item.owner.id.toLowerCase();
      const targetRole = item.currentPlan.targetRole.toLowerCase();
      const category = (item.currentPlan.roleCategory || "").toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        uid.includes(query) ||
        targetRole.includes(query) ||
        category.includes(query)
      );
    });
  }, [sharedRoadmaps, searchQuery]);

  // 4. Active Shared Item Resolution
  // Retrieve selected roadmap object for displaying peer dashboard view.
  const activeItem = useMemo(() => {
    if (!activeSharedId) return null;
    return sharedRoadmaps.find((s) => s.id === activeSharedId) || null;
  }, [sharedRoadmaps, activeSharedId]);

  // 5. User ID Clipboard Copy
  // Copy peer user identifier to system clipboard with visual feedback timer.
  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedId(uid);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // 6. Shared Roadmap Revocation
  // Delete shared roadmap connection and update directory state locally.
  const handleConfirmRemove = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/shared/roadmaps?id=${encodeURIComponent(itemToDelete.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to delete shared record.");
        return;
      }

      setSharedRoadmaps((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      if (activeSharedId === itemToDelete.id) {
        setActiveSharedId(null);
      }
      setItemToDelete(null);
    } catch {
      setErrorMsg("Network error occurred while removing shared connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Guard against flash render while authenticating.
  if (isAuthLoading || !isLoggedIn) {
    return null;
  }

  // --- Peer Dashboard View ---
  // Render the selected peer roadmap in read-only analysis dashboard format.
  if (activeItem) {
    const displayName = activeItem.owner.name || activeItem.owner.email.split("@")[0] || "Peer";

    return (
      <div className="animate-fade-in max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
        <ExistPlanState
          currentPlan={activeItem.currentPlan}
          historyPlans={activeItem.historyPlans}
          isSharedView={true}
          canEdit={false}
          sharedUser={{
            id: activeItem.owner.id,
            name: displayName,
            role: activeItem.currentPlan.targetRole || activeItem.owner.role,
            email: activeItem.owner.email,
            sharedAt: activeItem.sharedAt,
            department: activeItem.owner.department,
          }}
          onBackToSharedList={() => setActiveSharedId(null)}
        />
      </div>
    );
  }

  // --- UI ---
  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Search Bar Row */}
      <div className="flex items-center gap-2.5 mb-6 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="relative flex-1"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tModal("search_placeholder")}
            className="w-full h-10 bg-bg-card border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl pl-4 pr-9 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-mono"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 border-none bg-transparent cursor-pointer"
              title="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => {}}
          disabled={!searchQuery.trim()}
          className="w-10 h-10 flex items-center justify-center bg-accent text-bg-primary rounded-xl border-none cursor-pointer hover:opacity-90 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Search"
          aria-label="Search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-negative/10 border border-negative/30 text-negative text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={fetchSharedRoadmaps}
            className="text-xs underline hover:text-text-primary cursor-pointer border-none bg-transparent font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State Spinner */}
      {isLoading && (
        <div className="flex min-h-72 items-center justify-center py-16">
          <LoadingSpinner
            title={t("loading_title")}
            subtitle={t("loading_desc")}
            size="md"
            showProgressBar={false}
          />
        </div>
      )}

      {/* Main List: Shared Peer Roadmaps */}
      {!isLoading && filteredRoadmaps.length > 0 && (
        <div className="space-y-3.5">
          {filteredRoadmaps.map((item) => {
            const displayName = item.owner.name || item.owner.email.split("@")[0] || tModal("user");
            const initial = (item.owner.name || item.owner.email || "U").charAt(0).toUpperCase();
            const userLevel = item.owner.level ?? 1;

            return (
              <div
                key={item.id}
                onClick={() => setActiveSharedId(item.id)}
                className="group relative rounded-xl border border-border-subtle hover:border-accent bg-bg-secondary/40 hover:bg-bg-secondary/70 p-4 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm hover:shadow-[0_0_25px_var(--accent-glow)] cursor-pointer"
              >
                {/* Left Identity Card (Matching SharedPlansModal collaborator card styling) */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar Circle with Linear Gradient & Level Badge */}
                  <div className="relative w-10 h-10 shrink-0 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary shadow-sm">
                      {initial}
                    </div>
                    <span className="absolute -right-2 -bottom-1 rounded-full border border-bg-card bg-bg-primary px-1 py-0.5 text-[8px] font-mono font-bold leading-none text-accent shadow-sm">
                      Lv.{userLevel}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Top Row: User Name & Email */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                        {displayName}
                      </h4>
                      <span className="text-xs font-mono text-text-muted truncate">
                        • {item.owner.email}
                      </span>
                    </div>

                    {/* User UID with 1-Click Copy Button */}
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-text-muted">
                      <span className="font-semibold text-text-secondary">{tModal("uid")}</span>
                      <span className="text-text-muted select-all truncate max-w-45 sm:max-w-none">
                        {item.owner.id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUid(item.owner.id);
                        }}
                        className="p-1 text-text-muted hover:text-accent transition-colors bg-bg-card hover:bg-bg-card-hover border border-border-subtle rounded cursor-pointer shrink-0 inline-flex items-center gap-1"
                        title={tModal("copy_uid")}
                        aria-label={tModal("copy_uid")}
                      >
                        {copiedId === item.owner.id ? (
                          <span className="text-[10px] text-accent font-semibold inline-flex items-center gap-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{tModal("copied")}</span>
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

                    {/* Divider Line Between User Profile and Shared Roadmap */}
                    <div className="border-t border-border-subtle/70 my-2.5" />

                    {/* Bottom Row: Career Direction, Match Score & Date (No Diamond, Separate Line) */}
                    <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                      <span className="font-semibold text-text-primary truncate max-w-sm">
                        {item.currentPlan.targetRole}
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="font-mono text-accent text-xs font-semibold">
                        {item.currentPlan.matchScore}% {t("match_score")}
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {t("shared_on")} {item.sharedAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Action Button: Trash Can */}
                <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item);
                    }}
                    className="p-2.5 rounded-xl text-text-muted hover:text-negative hover:bg-negative/10 border border-transparent hover:border-negative/30 transition-all duration-200 cursor-pointer"
                    title={t("remove_user")}
                    aria-label={t("remove_user")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State Display */}
      {!isLoading && filteredRoadmaps.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-20 text-center animate-fade-in">
          <p className="text-xs sm:text-sm text-text-muted font-mono max-w-md mx-auto leading-relaxed">
            {searchQuery.trim() ? t("empty_title") : t("empty_desc")}
          </p>
        </div>
      )}

      {/* Removal Confirmation Dialog Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-2xl animate-scale-in">
            <h3 className="text-base font-bold text-text-primary tracking-tight mb-2">
              {t("remove_confirm_title")}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
              {t("remove_confirm_desc", {
                name: itemToDelete.owner.name || itemToDelete.owner.email,
              })}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-mono font-semibold text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card-hover border border-border-subtle rounded-xl cursor-pointer transition-colors disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmRemove}
                className="px-5 py-2 text-xs font-mono font-semibold text-white bg-negative hover:bg-negative/90 rounded-xl cursor-pointer shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <span>{t("confirm_remove")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
