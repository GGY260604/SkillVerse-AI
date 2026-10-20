"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MOCK_SHARED_USERS, SharedUser } from "./mockData";
import SharedUserCard from "./SharedUserCard";
import ExistPlanState from "@/components/analysis/ExistPlanState";

// Shared Plans View Orchestrator Component
// Manages the collection of shared peer users, search filtering, user removal,
// and dynamically mounts the full analysis interface with the selected peer's telemetry datasets.
export default function SharedPlansView() {
  const t = useTranslations("shared");

  // State: List of currently shared users (seeded with mock datasets).
  const [users, setUsers] = useState<SharedUser[]>(MOCK_SHARED_USERS);

  // State: Currently inspected peer user ID. Null indicates list view.
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // State: Search filter query.
  const [searchQuery, setSearchQuery] = useState<string>("");

  // State: Targeted user pending removal confirmation.
  const [userToRemove, setUserToRemove] = useState<SharedUser | null>(null);

  // Filter users by name, role, department, or target role.
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        u.department.toLowerCase().includes(query) ||
        u.currentPlan.targetRole.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Find currently active user when drilling down.
  const activeUser = useMemo(() => {
    if (!activeUserId) return null;
    return users.find((u) => u.id === activeUserId) || null;
  }, [users, activeUserId]);

  // Remove confirmed user from list.
  const handleConfirmRemove = () => {
    if (!userToRemove) return;
    setUsers((prev) => prev.filter((u) => u.id !== userToRemove.id));
    if (activeUserId === userToRemove.id) {
      setActiveUserId(null);
    }
    setUserToRemove(null);
  };

  // Reset to initial demo users if all were cleared.
  const handleResetDemoUsers = () => {
    setUsers(MOCK_SHARED_USERS);
    setActiveUserId(null);
    setSearchQuery("");
  };

  // =========================================================================
  // Mode 1: Inspected Peer Dashboard Mode
  // Mounts the standardized analysis ExistPlanState populated with peer values.
  // =========================================================================
  if (activeUser) {
    return (
      <div className="animate-fade-in max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
        <ExistPlanState
          currentPlan={activeUser.currentPlan}
          historyPlans={activeUser.historyPlans}
          isSharedView={true}
          sharedUser={{
            id: activeUser.id,
            name: activeUser.name,
            role: activeUser.role,
            email: activeUser.email,
            avatar: activeUser.avatarColor,
            sharedAt: activeUser.sharedAt,
            department: activeUser.department,
          }}
          onBackToSharedList={() => setActiveUserId(null)}
        />
      </div>
    );
  }

  // =========================================================================
  // Mode 2: Shared Users Directory List Mode
  // =========================================================================
  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 w-full flex-1">
      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-8 sm:mb-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              {t("title")}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-accent/10 text-accent border border-accent/25">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {users.length} {t("active_connections")}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        {/* Search Filter Bar */}
        {users.length > 0 && (
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              className="w-full pl-9 pr-4 py-2.5 text-xs font-mono bg-bg-card border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {/* Search SVG Icon */}
            <svg
              className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: User Cards List OR Empty State */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <SharedUserCard
              key={user.id}
              user={user}
              onSelect={(u) => setActiveUserId(u.id)}
              onRemove={(u) => setUserToRemove(u)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-bg-card/40 py-20 px-6 text-center max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-text-muted/10 border border-border-subtle flex items-center justify-center text-3xl mx-auto mb-4">
            🤝
          </div>
          <h3 className="text-lg font-bold text-text-primary tracking-tight mb-2">
            {t("empty_title")}
          </h3>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
            {t("empty_desc")}
          </p>

          <button
            type="button"
            onClick={handleResetDemoUsers}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-xl hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
          >
            <span>{t("btn_reset_demo")}</span>
          </button>
        </div>
      )}

      {/* Removal Confirmation Dialog Modal */}
      {userToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-bg-card border border-border-subtle rounded-2xl p-6 shadow-2xl animate-scale-in">
            <h3 className="text-base font-bold text-text-primary tracking-tight mb-2">
              {t("remove_confirm_title")}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
              {t("remove_confirm_desc", { name: userToRemove.name })}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="px-4 py-2 text-xs font-mono font-semibold text-text-secondary hover:text-text-primary bg-bg-secondary hover:bg-bg-card-hover border border-border-subtle rounded-xl cursor-pointer transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="px-5 py-2 text-xs font-mono font-semibold text-white bg-negative hover:bg-negative/90 rounded-xl cursor-pointer shadow-sm transition-colors"
              >
                {t("confirm_remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
