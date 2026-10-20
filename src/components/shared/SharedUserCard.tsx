"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SharedUser } from "./mockData";

interface SharedUserCardProps {
  user: SharedUser;
  onSelect: (user: SharedUser) => void;
  onRemove: (user: SharedUser) => void;
}

// Shared User Card Component
// Displays peer profile summary, target career trajectory, match metrics, and quick action buttons.
export default function SharedUserCard({
  user,
  onSelect,
  onRemove,
}: SharedUserCardProps) {
  const t = useTranslations("shared");

  return (
    <div className="relative group rounded-2xl p-6 transition-all duration-300 bg-bg-card/70 hover:bg-bg-card hover:border-accent/40 border border-border-subtle shadow-sm hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col justify-between">
      <div>
        {/* Top Header: User Profile Info, Shared Date & Remove Button */}
        <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-border-subtle/60">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* User Avatar Circle */}
            <div
              className={`w-12 h-12 rounded-xl bg-linear-to-br ${user.avatarColor} text-white font-mono font-bold text-base flex items-center justify-center shrink-0 shadow-md`}
            >
              {user.initials}
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-bold text-text-primary tracking-tight truncate group-hover:text-accent transition-colors">
                {user.name}
              </h3>
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {user.role}
              </p>
              <span className="text-[11px] font-mono text-text-muted truncate block mt-0.5">
                {user.department}
              </span>
            </div>
          </div>

          {/* Remove User Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(user);
            }}
            className="p-2 rounded-xl text-text-muted hover:text-negative hover:bg-negative/10 border border-transparent hover:border-negative/25 transition-all duration-200 cursor-pointer shrink-0"
            title={`${t("remove_user")} ${user.name}`}
            aria-label={`${t("remove_user")} ${user.name}`}
          >
            {/* Trash SVG Icon */}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {/* Target Trajectory & Metrics Row */}
        <div className="space-y-3 mb-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              {t("target_role")}
            </span>
            <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="text-accent text-xs">◈</span>
              <span>{user.currentPlan.targetRole}</span>
            </div>
          </div>

          {/* Metrics Pill Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="rounded-xl p-2.5 bg-bg-secondary/60 border border-border-subtle/50">
              <span className="text-[10px] font-mono text-text-muted uppercase block">
                {t("match_score")}
              </span>
              <span className="text-sm font-bold font-mono text-accent">
                {user.currentPlan.matchScore}%
              </span>
            </div>

            <div className="rounded-xl p-2.5 bg-bg-secondary/60 border border-border-subtle/50">
              <span className="text-[10px] font-mono text-text-muted uppercase block">
                {t("shared_on")}
              </span>
              <span className="text-xs font-mono text-text-secondary truncate block mt-0.5">
                {user.sharedAt}
              </span>
            </div>
          </div>

          {/* Key Competencies Badges Preview */}
          <div className="pt-1">
            <div className="flex flex-wrap gap-1.5">
              {user.currentPlan.matchedStrengths.slice(0, 3).map((strength, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-text-muted/10 text-text-secondary border border-border-subtle/50 truncate max-w-50"
                >
                  {strength}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer: Enter User's Analysis Dashboard */}
      <button
        type="button"
        onClick={() => onSelect(user)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono text-text-primary hover:text-accent bg-bg-secondary hover:bg-bg-card-hover border border-border-subtle hover:border-accent rounded-xl transition-all duration-200 cursor-pointer shadow-sm group-hover:border-accent/60"
      >
        <span>{t("view_roadmap")}</span>
        <svg
          className="w-4 h-4 text-accent transition-transform duration-200 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
}
