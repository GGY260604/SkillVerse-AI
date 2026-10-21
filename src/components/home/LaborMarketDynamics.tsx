"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";

interface TrendSignal {
  skillName: string;
  category: string;
  status: "emerging" | "declining" | "stable";
  velocityVs: number;
  sources?: any[];
  updatedAt?: string;
  skillNameLocalized?: string;
  categoryLocalized?: string;
  statusLocalized?: string;
  citationLocalized?: string;
}

interface TrendResponse {
  success: boolean;
  locale: string;
  totalCount: number;
  lastSynced: string | null;
  emergingCount: number;
  decliningCount: number;
  signals: TrendSignal[];
}

export default function LaborMarketDynamics() {
  const t = useTranslations("home.market");
  const locale = useLocale();

  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<"emerging" | "declining">(
    "emerging"
  );

  // Fetch trend signals from Next.js API route (/api/trend) which proxies FastAPI /trends
  useEffect(() => {
    let isCancelled = false;

    async function fetchTrends() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/trend?locale=${encodeURIComponent(locale)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Failed to load trends (HTTP ${res.status})`);
        }
        const json: TrendResponse = await res.json();
        if (!isCancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Error fetching market dynamics:", err);
          setError(err.message || "Failed to load market telemetry");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchTrends();

    return () => {
      isCancelled = true;
    };
  }, [locale]);

  // ─────────────────────────────────────────────────────────────
  // 1. Total Market Signals
  // ─────────────────────────────────────────────────────────────
  // Represents the total count of distinct skill telemetry records loaded from the backend database.
  // Computed directly from the total length of the signals array returned by the API.
  const signals = useMemo(() => data?.signals || [], [data]);

  // ─────────────────────────────────────────────────────────────
  // 2. High-Demand Emerging and Automation Risk Skills Ranking
  // ─────────────────────────────────────────────────────────────
  // Filtered skills categorized under the "emerging" or "declining" status badges.
  // Emerging skills reflect rapid hiring surges with positive demand velocity (Vs >= 0.25).
  // Declining competencies reflect routine workflows at automation risk with negative velocity (Vs <= -0.30).
  // Calculated using the World Economic Forum (WEF) empirical telemetry formula.
  // Formula: Vs = (Ct - Ct_prev) / max(Ct, Ct_prev), where Ct is current window and Ct_prev is past window frequency.
  // The value ranges from -1.0 (complete obsolescence) to +1.0 (exponential expansion).
  // Display percentage is formatted as (Vs * 100).toFixed(1)%.
  // Horizontal progress bar visualizer scales dynamically between 18% minimum width and 100% full width.
  // Formula: Math.min(100, Math.max(18, Math.round(Math.abs(skill.velocityVs) * 100)))%.
  const rankedSkills = useMemo(() => {
    const filtered = signals.filter((s) => s.status === skillFilter);
    return filtered
      .sort((a, b) =>
        skillFilter === "emerging"
          ? b.velocityVs - a.velocityVs
          : a.velocityVs - b.velocityVs
      )
      .slice(0, 6);
  }, [signals, skillFilter]);

  // ─────────────────────────────────────────────────────────────
  // 3. Job Category Telemetry Share and Momentum
  // ─────────────────────────────────────────────────────────────
  // All active skill signals are aggregated by their canonical industry category.
  // Signal count per category represents the total volume of tracked competencies in that domain.
  // Average velocity is calculated by dividing total velocity by signal count: Avg_Vs = Sum(Vs) / Count.
  // Relative bar width represents domain telemetry share relative to the highest-volume category.
  // Formula: Math.min(100, Math.max(20, Math.round((count / maxCategoryCount) * 100)))%.
  // Trend momentum is marked as Surging when Avg_Vs >= 0, and Restructuring when Avg_Vs < 0.
  const rankedCategories = useMemo(() => {
    const map = new Map<
      string,
      {
        categoryName: string;
        categoryNameRaw: string;
        count: number;
        totalVelocity: number;
      }
    >();

    signals.forEach((s) => {
      const displayName = s.categoryLocalized || s.category || "General";
      const existing = map.get(displayName);
      if (existing) {
        existing.count += 1;
        existing.totalVelocity += s.velocityVs;
      } else {
        map.set(displayName, {
          categoryName: displayName,
          categoryNameRaw: s.category,
          count: 1,
          totalVelocity: s.velocityVs,
        });
      }
    });

    const list = Array.from(map.values()).map((c) => ({
      ...c,
      avgVelocity: c.count > 0 ? c.totalVelocity / c.count : 0,
    }));

    // Sort by count descending, then avg velocity descending
    return list
      .sort((a, b) => b.count - a.count || b.avgVelocity - a.avgVelocity)
      .slice(0, 6);
  }, [signals]);

  const maxCategoryCount = useMemo(() => {
    if (rankedCategories.length === 0) return 1;
    return Math.max(...rankedCategories.map((c) => c.count));
  }, [rankedCategories]);

  // ─────────────────────────────────────────────────────────────
  // 4. Telemetry Ingestion Timestamp
  // ─────────────────────────────────────────────────────────────
  // Extracted from the latest updatedAt ISO timestamp in the signal records.
  // Localized dynamically into regional calendar date formats across English, Chinese, and Malay.
  const formattedSyncDate = useMemo(() => {
    if (!data?.lastSynced) return "...";
    try {
      const d = new Date(data.lastSynced);
      if (locale === "zh") {
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      } else if (locale === "ms") {
        return d.toLocaleDateString("ms-MY", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } else {
        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return data.lastSynced;
    }
  }, [data?.lastSynced, locale]);

  return (
    <section className="animate-fade-in-up-delay-2 max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20 w-full">
      {/* ── Section Header ── */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
          {t("title")}
        </h2>
        <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
          {t("description")}
        </p>
      </div>



      {/* Mobile Horizontal Scroll Hint */}
      <div className="flex lg:hidden items-center justify-end gap-1.5 text-xs text-text-muted mb-2 font-mono">
        <span>{t("scroll_hint")}</span>
        <svg
          className="w-3.5 h-3.5 text-accent animate-pulse"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        </svg>
      </div>

      {/* ── Bottom Level: Bar Chart | Bar Chart (Horizontal Side-by-Side) ── */}
      {/* Container is horizontally scrollable on mobile/tablet to ensure barchart | barchart never stacks vertically */}
      <div className="w-full overflow-x-auto pb-4 pt-1">
        <div className="min-w-[760px] lg:min-w-0 grid grid-cols-2 gap-6 items-stretch">
          {/* ══════════════════════════════════════════════════════════ */}
          {/* BAR CHART 1: Ranking of Most Popular / In-Demand Skills */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between border border-border-subtle hover:border-border-accent/40 transition-all duration-300 shadow-lg">
            <div>
              {/* Header with Title and Tab Switcher */}
              <div className="flex items-center justify-between gap-2 min-h-8 mb-2">
                <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                  {t("skills_ranking_title")}
                </h4>

                {/* Filter Tabs (Emerging vs Declining) */}
                <div className="flex items-center p-0.5 rounded-lg bg-bg-elevated border border-border-subtle shrink-0">
                  <button
                    onClick={() => setSkillFilter("emerging")}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                      skillFilter === "emerging"
                        ? "bg-accent/20 text-accent font-semibold shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {t("tab_emerging")}
                  </button>
                  <button
                    onClick={() => setSkillFilter("declining")}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                      skillFilter === "declining"
                        ? "bg-rose-500/20 text-rose-400 font-semibold shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {t("tab_declining")}
                  </button>
                </div>
              </div>

              {/* Skills Bar Chart Rows */}
              <div className="mt-6 space-y-4">
                {loading ? (
                  // Skeleton loader
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="flex justify-between h-4 bg-bg-elevated rounded w-3/4" />
                      <div className="h-3 bg-bg-elevated rounded w-full" />
                    </div>
                  ))
                ) : rankedSkills.length === 0 ? (
                  <div className="text-center py-10 text-xs text-text-muted">
                    {t("no_signals")}
                  </div>
                ) : (
                  rankedSkills.map((skill, index) => {
                    const absScore = Math.abs(skill.velocityVs);
                    const percentage = Math.min(
                      100,
                      Math.max(18, Math.round(absScore * 100))
                    );
                    const isPositive = skill.velocityVs >= 0;

                    return (
                      <div key={skill.skillName || index} className="group">
                        {/* Skill Label & Category Tag */}
                        <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Rank Badge */}
                            <span
                              className={`font-mono text-xs font-bold shrink-0 ${
                                index === 0
                                  ? "text-accent"
                                  : index === 1
                                  ? "text-text-primary"
                                  : index === 2
                                  ? "text-amber-300"
                                  : "text-text-muted"
                              }`}
                            >
                              #{index + 1}
                            </span>
                            {/* Localized Skill Name */}
                            <span className="font-semibold text-text-primary truncate">
                              {skill.skillNameLocalized || skill.skillName}
                            </span>
                            {/* Localized Category Chip */}
                            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-bg-elevated text-text-muted border border-border-subtle shrink-0">
                              {skill.categoryLocalized || skill.category}
                            </span>
                          </div>

                          {/* Velocity Score Metric Badge */}
                          <div className="font-mono text-[11px] font-bold shrink-0">
                            <span
                              className={
                                isPositive
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              {isPositive ? "+" : ""}
                              {(skill.velocityVs * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar Visualizer */}
                        <div className="w-full h-2.5 rounded-full bg-bg-elevated/90 overflow-hidden relative border border-border-subtle/50">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isPositive
                                ? "bg-gradient-to-r from-accent/70 via-accent to-emerald-400 shadow-[0_0_12px_rgba(0,229,195,0.4)]"
                                : "bg-gradient-to-r from-rose-500/70 via-rose-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Citation evidence tooltip / subtext on hover */}
                        {skill.citationLocalized && (
                          <p className="text-[10px] text-text-muted mt-1 truncate group-hover:text-text-secondary transition-colors">
                            {skill.citationLocalized}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* BAR CHART 2: Most Popular Job Categories by Telemetry Share */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between border border-border-subtle hover:border-border-accent/40 transition-all duration-300 shadow-lg">
            <div>
              {/* Header */}
              <div className="flex items-center min-h-8 mb-2">
                <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                  {t("categories_ranking_title")}
                </h4>
              </div>

              {/* Categories Bar Chart Rows */}
              <div className="mt-6 space-y-4">
                {loading ? (
                  // Skeleton loader
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="flex justify-between h-4 bg-bg-elevated rounded w-3/4" />
                      <div className="h-3 bg-bg-elevated rounded w-full" />
                    </div>
                  ))
                ) : rankedCategories.length === 0 ? (
                  <div className="text-center py-10 text-xs text-text-muted">
                    {t("no_categories")}
                  </div>
                ) : (
                  rankedCategories.map((cat, index) => {
                    const relativePercent = Math.min(
                      100,
                      Math.max(
                        20,
                        Math.round((cat.count / maxCategoryCount) * 100)
                      )
                    );
                    const avgVelocityPos = cat.avgVelocity >= 0;

                    return (
                      <div key={cat.categoryName || index} className="group">
                        {/* Category Label & Meta */}
                        <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Rank Badge */}
                            <span
                              className={`font-mono text-xs font-bold shrink-0 ${
                                index === 0
                                  ? "text-teal-300"
                                  : index === 1
                                  ? "text-text-primary"
                                  : index === 2
                                  ? "text-amber-300"
                                  : "text-text-muted"
                              }`}
                            >
                              #{index + 1}
                            </span>
                            {/* Localized Category Name */}
                            <span className="font-semibold text-text-primary truncate">
                              {cat.categoryName}
                            </span>
                          </div>

                          {/* Velocity Metric Badge */}
                          <div className="font-mono text-[11px] font-bold shrink-0">
                            <span
                              className={
                                avgVelocityPos
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              {avgVelocityPos ? "+" : ""}
                              {(cat.avgVelocity * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar Visualizer */}
                        <div className="w-full h-2.5 rounded-full bg-bg-elevated/90 overflow-hidden relative border border-border-subtle/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500/70 via-teal-400 to-accent transition-all duration-700 ease-out shadow-[0_0_12px_rgba(45,212,191,0.35)]"
                            style={{ width: `${relativePercent}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-text-muted mt-1 font-mono">
                          <span>
                            {cat.count} {t("signals_unit")}
                          </span>
                          <span>
                            {t("trend_label")}: {avgVelocityPos ? t("trend_surging") : t("trend_restructuring")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Attribution Note */}
      <div className="mt-3 text-xs text-text-muted font-mono tracking-wide">
        <p>
          {t("footer_sources_note", {
            date: formattedSyncDate,
          })}
        </p>
      </div>
    </section>
  );
}
