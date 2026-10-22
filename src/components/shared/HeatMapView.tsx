"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import type { SharedRoadmapItem } from "@/components/shared/SharedPlansView";

interface HeatMapViewProps {
  onBack: () => void;
  selectedUserIds?: string[];
  selectedMembers?: SharedRoadmapItem[];
}

export default function HeatMapView({
  onBack,
  selectedUserIds = [],
  selectedMembers = [],
}: HeatMapViewProps) {
  const t = useTranslations("shared");
  const [roleInput, setRoleInput] = useState<string>("");

  return (
    <div className="w-full flex-1 animate-fade-in-up">
      {/* 1. Page Header (Consistent with Analysis / Shared Roadmap detail view) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-subtle mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Back Navigation Button */}
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 sm:p-3 rounded-xl border border-border-subtle bg-bg-card hover:bg-bg-card-hover text-text-secondary hover:text-accent hover:border-accent transition-all duration-200 cursor-pointer shadow-sm shrink-0 flex items-center justify-center group"
            aria-label={t("back_to_shared_list") || "Back"}
            title={t("back_to_shared_list") || "Back"}
          >
            <svg
              className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          {/* Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <h1 className="wrap-break-word text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              HeatMap
            </h1>
            <p className="wrap-break-word text-xs sm:text-sm text-text-secondary mt-1">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Role Input Bar + Start Button */}
      <div className="mb-6 flex w-full items-center gap-2.5 sm:gap-3">
        <div className="relative min-w-0 flex-1 flex items-center">
          <input
            type="text"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            placeholder="输入基准目标岗位 (例如: Prompt Engineer, Cloud Architect, AI Specialist)..."
            className="h-11 w-full bg-bg-card border border-border-subtle focus:border-accent focus:ring-1 focus:ring-accent/40 rounded-xl pl-4 pr-10 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none transition-all font-mono"
          />
          {roleInput && (
            <button
              type="button"
              onClick={() => setRoleInput("")}
              className="absolute right-3 text-text-muted hover:text-text-primary p-0.5 border-none bg-transparent cursor-pointer"
              title="Clear"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={!roleInput.trim()}
          className="h-11 px-5 rounded-xl font-mono text-xs sm:text-sm font-semibold bg-accent text-bg-primary hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          Start
        </button>
      </div>

      {/* 3. HeatMap Matrix Table (No outer nested container) */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-180 border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs font-mono text-text-muted">
              <th className="w-72 pb-3 font-semibold text-text-secondary pl-2">
                User ({selectedMembers.length || selectedUserIds.length})
              </th>
              {[1, 2, 3, 4, 5].map((colIdx) => (
                <th key={colIdx} className="pb-3 text-center font-semibold">
                  Competency {colIdx}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedMembers.length > 0 ? (
              selectedMembers.map((member) => {
                const displayName =
                  member.owner.name || member.owner.email.split("@")[0] || "User";
                const initial = (member.owner.name || member.owner.email || "U")
                  .charAt(0)
                  .toUpperCase();

                return (
                  <tr key={member.id} className="group">
                    {/* User Identity Cell: Name & Email only */}
                    <td className="p-3 bg-bg-secondary/40 rounded-l-xl border-y border-l border-border-subtle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-accent-gradient-end flex items-center justify-center text-xs font-bold text-bg-primary shadow-sm shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                            {displayName}
                          </h4>
                          <p className="text-[11px] font-mono text-text-muted truncate">
                            {member.owner.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 5 Gray Columns */}
                    {[1, 2, 3, 4, 5].map((colIdx) => (
                      <td
                        key={colIdx}
                        className={`p-2 bg-bg-secondary/40 border-y border-border-subtle text-center ${
                          colIdx === 5 ? "rounded-r-xl border-r" : ""
                        }`}
                      >
                        <div className="h-12 w-full rounded-lg bg-border-subtle/30 border border-border-subtle/40 flex items-center justify-center transition-colors group-hover:border-border-subtle">
                          <span className="text-[10px] font-mono text-text-muted select-none">
                            -
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              // Fallback if rendered with just userIds
              selectedUserIds.map((uid) => (
                <tr key={uid} className="group">
                  <td className="p-3 bg-bg-secondary/40 rounded-l-xl border-y border-l border-border-subtle">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                        User {uid.slice(0, 8)}
                      </h4>
                    </div>
                  </td>
                  {[1, 2, 3, 4, 5].map((colIdx) => (
                    <td
                      key={colIdx}
                      className={`p-2 bg-bg-secondary/40 border-y border-border-subtle text-center ${
                        colIdx === 5 ? "rounded-r-xl border-r" : ""
                      }`}
                    >
                      <div className="h-12 w-full rounded-lg bg-border-subtle/30 border border-border-subtle/40 flex items-center justify-center">
                        <span className="text-[10px] font-mono text-text-muted select-none">
                          -
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}