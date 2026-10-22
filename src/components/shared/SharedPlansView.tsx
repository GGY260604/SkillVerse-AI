"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import ExistPlanState from "@/components/analysis/ExistPlanState";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { PlanData } from "@/components/analysis/planCard/planData";

export interface SharedRoadmapItem {
  id: string; // shared_roadmaps record ID
  roadmapId: string;
  ownerId: string;
  accessLevel: "viewable" | "editable";
  sharedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    department: string;
  };
  currentPlan: PlanData;
  historyPlans: PlanData[];
}

// Shared Plans View Component
// Queries real roadmaps shared with the authenticated user from shared_roadmaps table.
// Displays results matching the share overlay search-result cards with a deletion trash-can button.
// Clicking a peer user loads their full analysis panel in place (with edit rights if granted, strictly no share button).
export default function SharedPlansView() {
  const t = useTranslations("shared");
  const tModal = useTranslations("analysis.share_modal");
  const locale = useLocale();
  const router = useRouter();
  const { isLoggedIn, isLoading: isAuthLoading, openAuthModal } = useAuth();

  // State: List of roadmaps shared with the current user
  const [sharedRoadmaps, setSharedRoadmaps] = useState<SharedRoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State: Currently inspected shared roadmap record ID. Null indicates list view.
  const [activeSharedId, setActiveSharedId] = useState<string | null>(null);

  // State: Search filter query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State: Access level filter ("all" | "viewable" | "editable")
  const [filter, setFilter] = useState<"all" | "viewable" | "editable">("all");

  // State: Targeted item pending deletion confirmation
  const [itemToDelete, setItemToDelete] = useState<SharedRoadmapItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // State: UID copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Redirect unauthenticated user to home and trigger login modal
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [isAuthLoading, isLoggedIn, openAuthModal, router]);

  // Fetch real roadmaps shared with the user from shared_roadmaps table
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

  useEffect(() => {
    if (isLoggedIn) {
      fetchSharedRoadmaps();
    }
  }, [isLoggedIn, fetchSharedRoadmaps]);

  // Filter roadmaps by access level and search query (matches name, email, UID, or target role)
  // Defaults to displaying all shared roadmaps when query is empty and filter is "all"
  const filteredRoadmaps = useMemo(() => {
    let list = sharedRoadmaps;

    // Apply access level filter
    if (filter === "viewable") {
      list = list.filter((item) => item.accessLevel === "viewable");
    } else if (filter === "editable") {
      list = list.filter((item) => item.accessLevel === "editable");
    }

    // Apply search query within the shared roadmaps
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
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
  }, [sharedRoadmaps, searchQuery, filter]);

  // Active peer plan when drilling down
  const activeItem = useMemo(() => {
    if (!activeSharedId) return null;
    return sharedRoadmaps.find((s) => s.id === activeSharedId) || null;
  }, [sharedRoadmaps, activeSharedId]);

  // 1-Click UID Copy Handler
  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedId(uid);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Confirm delete shared connection from shared_roadmaps table
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

      // Remove from local state
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

  // Update phase toggle locally if user modifies an editable plan
  const handlePeerPhaseToggle = (phaseId: string, isCompleted: boolean) => {
    setSharedRoadmaps((prev) =>
      prev.map((item) => {
        if (activeItem && item.id === activeItem.id) {
          return {
            ...item,
            currentPlan: {
              ...item.currentPlan,
              phases: item.currentPlan.phases?.map((p) =>
                p.id === phaseId ? { ...p, isCompleted } : p
              ),
            },
          };
        }
        return item;
      })
    );
  };

  // Prevent flash before auth validation
  if (isAuthLoading || !isLoggedIn) {
    return null;
  }

  // =========================================================================
  // Mode 1: Inspected Peer Dashboard Mode
  // Mounts the standardized ExistPlanState populated with the peer's roadmap.
  // Respects edit permission (canEdit) and strictly omits any share button.
  // =========================================================================
  if (activeItem) {
    const displayName = activeItem.owner.name || activeItem.owner.email.split("@")[0] || "Peer";
    const canEdit = activeItem.accessLevel === "editable";

    return (
      <div className="animate-fade-in max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
        <ExistPlanState
          currentPlan={activeItem.currentPlan}
          historyPlans={activeItem.historyPlans}
          isSharedView={true}
          canEdit={canEdit}
          sharedUser={{
            id: activeItem.owner.id,
            name: displayName,
            role: activeItem.currentPlan.targetRole || activeItem.owner.role,
            email: activeItem.owner.email,
            sharedAt: activeItem.sharedAt,
            department: activeItem.owner.department,
          }}
          onBackToSharedList={() => setActiveSharedId(null)}
          onPhaseToggle={canEdit ? handlePeerPhaseToggle : undefined}
        />
      </div>
    );
  }

  // =========================================================================
  // Mode 2: Shared Plans Directory List Mode
  // Displays roadmaps shared with current user matching the share overlay card style.
  // =========================================================================
  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
      {/* Page Header Bar */}
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

      {/* Search Bar & Access Filter Row (Identical structure and aesthetics to SharedPlansModal) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-6 shrink-0">
        {/* Search Input Box */}
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

        {/* Search Action Button (Square + Magnifying Glass) */}
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

        {/* Access Level Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "all" | "viewable" | "editable")
            }
            aria-label={tModal("filter_label")}
            className="w-full sm:w-auto h-10 appearance-none bg-bg-card border border-border-subtle hover:border-border-hover focus:border-accent text-xs font-mono text-text-primary rounded-xl px-3.5 py-2 pr-8 outline-none cursor-pointer transition-colors"
          >
            <option value="all">{tModal("filter_all")}</option>
            <option value="viewable">{tModal("filter_viewable")}</option>
            <option value="editable">{tModal("filter_editable")}</option>
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

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border-subtle bg-bg-card/50 p-4 sm:p-5 flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-11 h-11 rounded-full bg-bg-secondary shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-36 bg-bg-secondary rounded" />
                  <div className="h-3 w-56 bg-bg-secondary/60 rounded" />
                  <div className="h-2.5 w-44 bg-bg-secondary/40 rounded" />
                </div>
              </div>
              <div className="w-10 h-10 bg-bg-secondary rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Main List: User Cards Styled Like Share Modal Search Results */}
      {!isLoading && filteredRoadmaps.length > 0 && (
        <div className="space-y-3.5">
          {filteredRoadmaps.map((item) => {
            const displayName = item.owner.name || item.owner.email.split("@")[0] || "Peer";
            const initial = (item.owner.name || item.owner.email || "P").charAt(0).toUpperCase();
            const isEditable = item.accessLevel === "editable";

            return (
              <div
                key={item.id}
                onClick={() => setActiveSharedId(item.id)}
                className="group relative rounded-xl border border-border-subtle hover:border-accent bg-bg-card/70 hover:bg-bg-card p-4 sm:p-5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-[0_0_25px_var(--accent-glow)] cursor-pointer"
              >
                {/* Left Identity Card (Styled like Profile identity card & Share Modal result) */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar Circle with Linear Gradient */}
                  <div className="w-11 h-11 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-sm font-bold text-bg-primary shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    {initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                        {displayName}
                      </h3>
                      <span className="text-xs font-mono text-text-muted truncate">
                        • {item.owner.email}
                      </span>
                      {/* Access Level Badge */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                          isEditable
                            ? "bg-accent/15 text-accent border-accent/40"
                            : "bg-blue-500/15 text-blue-400 border-blue-500/40"
                        }`}
                      >
                        {isEditable ? "Can Edit" : "View Only"}
                      </span>
                    </div>

                    {/* Shared Roadmap Role Title & Match Score Badge */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary flex-wrap">
                      <span className="font-semibold text-text-primary flex items-center gap-1 truncate max-w-sm">
                        <span className="text-accent text-xs">◈</span>
                        <span>{item.currentPlan.targetRole}</span>
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="font-mono text-accent text-xs font-semibold">
                        {item.currentPlan.matchScore}% Match
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="font-mono text-[11px] text-text-muted">
                        Shared {item.sharedAt}
                      </span>
                    </div>

                    {/* Peer UID with 1-Click Copy Button */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-text-muted">
                      <span className="font-semibold text-text-secondary">UID:</span>
                      <span className="text-text-muted select-all truncate max-w-44 sm:max-w-none">
                        {item.owner.id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUid(item.owner.id);
                        }}
                        className="p-1 text-text-muted hover:text-accent transition-colors bg-bg-secondary hover:bg-bg-card-hover border border-border-subtle rounded cursor-pointer shrink-0 inline-flex items-center gap-1"
                        title="Copy UID"
                        aria-label="Copy UID"
                      >
                        {copiedId === item.owner.id ? (
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

                {/* Right Side: Trash Can Icon Button */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
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

      {/* Simple Centered Gray Text When No Results (No dashed box, no icons, matching SharedPlansModal) */}
      {!isLoading && filteredRoadmaps.length === 0 && (
        <div className="flex-1 flex items-center justify-center py-20 text-center animate-fade-in">
          <p className="text-xs sm:text-sm text-text-muted font-mono max-w-md mx-auto leading-relaxed">
            {searchQuery || filter !== "all"
              ? "No shared roadmaps found matching your search or filter."
              : "You currently have no career roadmaps shared by other members, or all have been removed."}
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
