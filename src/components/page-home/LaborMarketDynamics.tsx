"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";

// --- Schema ---

// Used by TrendResponse schema below.
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

// Used to store the trend response from the backend database.
interface TrendResponse {
  success: boolean;
  locale: string;
  totalCount: number;
  lastSynced: string | null;
  emergingCount: number;
  decliningCount: number;
  signals: TrendSignal[];
}

/**
 * Real-Time Labor Market Telemetry Component
 *
 * Monitors real-time occupational frequency shifts and velocity delta metrics,
 * presenting categorized emerging and declining skill signals with verifiable citation sources.
 *
 * Component Requirements:
 * - Server Endpoints: GET /api/page-home/trend.
 * - Localization Scope: home.market, other.helper.date.
 *
 * Workflow:
 * 1. Fetch normalized labor market trend signals and velocity metrics from backend API.
 * 2. Filter signals by status category (emerging vs declining).
 * 3. Render telemetry header metrics, sync timestamps, and filter toggles.
 * 4. Conditionally render trend cards or empty state feedback based on active filter:
 *    - Branch A: Mount emerging skill signals with velocity growth indicators.
 *    - Branch B: Mount declining skill signals with automation exposure risk warnings.
 */
export default function LaborMarketDynamics() {
  // ==========================================
  // Step 1: Initialize Multi-Language Translation and State Management
  // ==========================================
  // Ingest localized strings for market analysis telemetry, titles, and dates.
  const t = useTranslations("home.market");
  const tDate = useTranslations("other.helper.date");
  const locale = useLocale();

  // Track telemetry API payload, loading skeletons, fetch errors, and active status filter.
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<"emerging" | "declining">("emerging");

  // ==========================================
  // Step 2: Fetch Real-Time Labor Market Telemetry Signals from Backend API
  // ==========================================
  // Ingest dynamic skill shifts and occupational demand metrics for the active locale.
  useEffect(() => {
    let isCancelled = false;
    async function fetchTrends() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/page-home/trend?locale=${encodeURIComponent(locale)}`, {
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

  // ==========================================
  // Step 3: Compute Ranked Skills, Categories, and Timestamp Metrics
  // ==========================================

  // 1. Total Market Signals Extraction
  // - Extract all telemetry signal records from the API response payload.
  // - Fall back to an empty array when telemetry data is not yet loaded.
  const signals = useMemo(() => data?.signals || [], [data]);

  // 2. Emerging and Declining Skills Ranking
  // - Filter active telemetry signals based on the selected skill status tab (emerging or declining).
  // - Velocity Metric Definition (Vs):
  //   - Velocity measures the proportional change in skill job postings across comparative sampling windows.
  //   - Weekly Velocity Formula: Vs = (Current_Week_Signals - Previous_Week_Signals) / Previous_Week_Signals.
  //   - Monthly Velocity Formula: Vs = (Current_Month_Signals - Previous_Month_Signals) / Previous_Month_Signals.
  // - Status Classification Thresholds:
  //   - Emerging skills reflect rapid market expansion with high positive velocity (Vs >= +0.25).
  //   - Declining skills reflect automation risk and obsolescence with negative velocity (Vs <= -0.30).
  // - Sorting and Display Logic:
  //   - Sort emerging skills in descending order of velocity (highest positive expansion first).
  //   - Sort declining skills in ascending order of velocity (steepest negative decline first).
  // - Slice to retain only the top six ranked records for leaderboard presentation.
  const rankedSkills = useMemo(() => {
    return signals
      .filter((s) => s.status === skillFilter)
      .sort((a, b) =>
        // If viewing emerging skills (Vs >= +0.25), sort descending (b - a) so the highest positive growth ranks first.
        // If viewing declining skills (Vs <= -0.30), sort ascending (a - b) so the most negative velocity (steepest decline) ranks first.
        skillFilter === "emerging"
          ? b.velocityVs - a.velocityVs
          : a.velocityVs - b.velocityVs
      )
      .slice(0, 6); // Retain only the top six ranked records for leaderboard presentation.
  }, [signals, skillFilter]);

  // 3. Category Volume and Average Momentum
  // - Filter active signals matching the selected skill status (emerging or declining) to align with skills ranking.
  // - Canonical Industry Grouping:
  //   - Group signals under their localized or canonical category name (e.g., "Artificial Intelligence", "Cloud Computing").
  // - Telemetry Volume and Velocity Aggregation:
  //   - Aggregate total signal count (`count`) for each category to represent overall domain job volume.
  //   - Accumulate velocity sum (`totalVelocity`) to measure the net momentum across all skills in that domain.
  // - Average Velocity Metric Formula:
  //   - Avg_Vs = Total_Velocity / Signal_Count.
  //   - Positive Avg_Vs (>= 0) indicates a surging industry domain.
  //   - Negative Avg_Vs (< 0) indicates an industry domain undergoing structural automation or contraction.
  // - Sorting and Display Logic:
  //   - Primary sort: Highest signal volume first (`b.count - a.count`).
  //   - Secondary sort: Average velocity according to status (descending for emerging, ascending for declining).
  // - Slice to retain only the top six category records for leaderboard presentation.
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

    // Filter active signals matching the selected status tab (emerging vs declining).
    const filteredSignals = signals.filter((s) => s.status === skillFilter);

    filteredSignals.forEach((s) => {
      const displayName = s.categoryLocalized || s.category || "General";
      const existing = map.get(displayName);
      if (existing) {
        existing.count += 1; // Increment total signal volume for this industry category.
        existing.totalVelocity += s.velocityVs; // Add velocity score to cumulative category momentum.
      } else {
        map.set(displayName, {
          categoryName: displayName,
          categoryNameRaw: s.category,
          count: 1, // Initialize category signal volume.
          totalVelocity: s.velocityVs, // Initialize cumulative velocity score.
        });
      }
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        avgVelocity: c.count > 0 ? c.totalVelocity / c.count : 0, // Compute mean velocity per category: Avg_Vs = Sum(Vs) / Count.
      }))
      .sort((a, b) =>
        // Sort primarily by highest signal volume, breaking ties with average momentum.
        b.count - a.count ||
        (skillFilter === "emerging"
          ? b.avgVelocity - a.avgVelocity
          : a.avgVelocity - b.avgVelocity)
      )
      .slice(0, 6); // Retain only the top six ranked categories for presentation.
  }, [signals, skillFilter]);

  // 4. Maximum Category Signal Volume
  // - Normalization Base Calculation:
  //   - Determine the largest signal count (`max(count)`) among all ranked categories.
  // - Visual Scaling Purpose:
  //   - Used as the reference denominator to compute relative percentage widths for horizontal progress bars.
  // - Boundary Fallback:
  //   - Fall back to 1 if no categories exist to prevent division by zero in UI rendering.
  const maxCategoryCount = useMemo(() => {
    return rankedCategories.length > 0
      ? Math.max(...rankedCategories.map((c) => c.count)) // Find maximum signal volume across categories.
      : 1; // Fall back to 1 to avoid division by zero.
  }, [rankedCategories]);

  // 5. Telemetry Synchronization Timestamp Localization
  // - Extract the latest date across all telemetry records (signals and their respective sources)
  //   or fall back to the global lastSynced timestamp.
  const latestDataDate = useMemo<Date | null>(() => {
    if (!data) return null;

    let maxTime = -Infinity;
    let maxDateObj: Date | null = null;

    const recordDate = (val: unknown) => {
      if (!val || typeof val !== "string") return;
      const d = new Date(val);
      const time = d.getTime();
      if (!isNaN(time) && time > maxTime) {
        maxTime = time;
        maxDateObj = d;
      }
    };

    // 1. Check root lastSynced timestamp
    recordDate(data.lastSynced);

    // 2. Scan all signals and their source records to identify the latest data date
    if (Array.isArray(data.signals)) {
      for (const signal of data.signals) {
        recordDate(signal.updatedAt);

        if (Array.isArray(signal.sources)) {
          for (const src of signal.sources) {
            if (src && typeof src === "object") {
              recordDate((src as any).capturedAt);
              recordDate((src as any).publishedAt);
              recordDate((src as any).date);
              recordDate((src as any).timestamp);
            }
          }
        }
      }
    }

    return maxDateObj;
  }, [data]);

  const formattedSyncDate = useMemo(() => {
    if (!latestDataDate) {
      if (loading) return "...";
      if (data?.lastSynced) return data.lastSynced;
      return "...";
    }

    try {
      const year = latestDataDate.getFullYear();
      const month = tDate(`month_${latestDataDate.getMonth() + 1}` as any);
      const day = latestDataDate.getDate();
      return tDate("format", { year, month, day });
    } catch {
      return latestDataDate.toISOString().split("T")[0];
    }
  }, [latestDataDate, loading, data?.lastSynced, tDate]);

  // --- UI ---
  return (
    <section id="labor-market" className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20 w-full scroll-mt-24 overflow-x-clip">
      {/* ========================================== */}
      {/* Step 4: Render Telemetry Section Header and Global Filter Switcher */}
      {/* ========================================== */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
            {t("title")}
          </h2>
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            {t("description")}
          </p>
        </div>

        {/* Global Filter Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-bg-elevated border border-border-subtle shrink-0 self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => setSkillFilter("emerging")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              skillFilter === "emerging"
                ? "bg-accent/20 text-accent shadow-sm border border-accent/30"
                : "text-text-muted hover:text-text-primary border border-transparent"
            }`}
          >
            {t("tab_emerging")}
          </button>
          <button
            type="button"
            onClick={() => setSkillFilter("declining")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              skillFilter === "declining"
                ? "bg-rose-500/20 text-rose-400 shadow-sm border border-rose-500/30"
                : "text-text-muted hover:text-text-primary border border-transparent"
            }`}
          >
            {t("tab_declining")}
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* Step 5: Render Ranked Skills and Domain Telemetry Visualizations */}
      {/* ========================================== */}
      <div className="-mx-4 w-full overflow-x-auto overscroll-x-contain px-4 pb-4 pt-1 snap-x snap-mandatory sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="flex min-w-0 items-stretch gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Chart 1: Ranking of Most Popular and In-Demand Skills */}
          <div className={`w-[88%] min-w-70 max-w-110 flex-none snap-start glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between border transition-all duration-300 shadow-lg lg:w-auto lg:min-w-0 lg:max-w-none ${
            skillFilter === "emerging"
              ? "border-border-subtle hover:border-accent/40"
              : "border-border-subtle hover:border-rose-500/40"
          }`}>
            <div>
              {/* Chart Header */}
              <div className="flex items-center min-h-8 mb-2">
                <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                  {t("skills_ranking_title")}
                </h4>
              </div>

              {/* Skills Bar Chart Rows */}
              <div className="mt-6 space-y-4">
                {loading ? (
                  // Skeleton Loader
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
                    // 1. Skill Velocity Magnitude and Bar Width
                    // Convert velocity to an absolute value and scale into a percentage.
                    // Clamp the progress bar width between a minimum of 18% and a maximum of 100%.
                    const absScore = Math.abs(skill.velocityVs);
                    const percentage = Math.min(
                      100,
                      Math.max(18, Math.round(absScore * 100))
                    );
                    const isPositive = skill.velocityVs >= 0;

                    return (
                      <div key={skill.skillName || index} className="group py-0.5">
                        {/* Skill Label and Category */}
                        <div className="flex items-center justify-between text-xs mb-1.5 gap-2 h-5">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Rank Badge */}
                            <span
                              className={`font-mono text-xs font-bold shrink-0 ${
                                index === 0
                                  ? (skillFilter === "emerging" ? "text-accent" : "text-rose-400")
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
                                ? "bg-linear-to-r from-accent/70 via-accent to-emerald-400 shadow-[0_0_12px_rgba(0,229,195,0.4)]"
                                : "bg-linear-to-r from-rose-500/70 via-rose-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Citation Evidence */}
                        <div className="h-4 mt-1.5 flex items-center">
                          <p className="text-[10px] text-text-muted truncate group-hover:text-text-secondary transition-colors">
                            {skill.citationLocalized || "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Chart 2: Most Popular Job Categories by Telemetry Share */}
          <div className={`w-[88%] min-w-70 max-w-110 flex-none snap-start glass-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between border transition-all duration-300 shadow-lg lg:w-auto lg:min-w-0 lg:max-w-none ${
            skillFilter === "emerging"
              ? "border-border-subtle hover:border-accent/40"
              : "border-border-subtle hover:border-rose-500/40"
          }`}>
            <div>
              {/* Chart Header */}
              <div className="flex items-center min-h-8 mb-2">
                <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                  {t("categories_ranking_title")}
                </h4>
              </div>

              {/* Categories Bar Chart Rows */}
              <div className="mt-6 space-y-4">
                {loading ? (
                  // Skeleton Loader
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
                    // 1. Category Telemetry Share Bar Width
                    // Scale the category count relative to the highest category signal count.
                    // Clamp the progress bar width between a minimum of 20% and a maximum of 100%.
                    const relativePercent = Math.min(
                      100,
                      Math.max(
                        20,
                        Math.round((cat.count / maxCategoryCount) * 100)
                      )
                    );
                    const avgVelocityPos = cat.avgVelocity >= 0;

                    return (
                      <div key={cat.categoryName || index} className="group py-0.5">
                        {/* Category Label and Metric */}
                        <div className="flex items-center justify-between text-xs mb-1.5 gap-2 h-5">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Rank Badge */}
                            <span
                              className={`font-mono text-xs font-bold shrink-0 ${
                                index === 0
                                  ? (skillFilter === "emerging" ? "text-teal-300" : "text-rose-400")
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

                          {/* Category Signal Count Metric Badge (Highlighted) */}
                          <div className="font-mono text-[11px] font-bold shrink-0">
                            <span className={skillFilter === "emerging" ? "text-accent" : "text-rose-400"}>
                              {cat.count}
                            </span>
                            <span className="text-text-muted font-normal text-[10px] ml-1">
                              {t("signals_unit")}
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Bar Visualizer */}
                        <div className="w-full h-2.5 rounded-full bg-bg-elevated/90 overflow-hidden relative border border-border-subtle/50">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              skillFilter === "emerging"
                                ? "bg-linear-to-r from-teal-500/70 via-teal-400 to-accent shadow-[0_0_12px_rgba(45,212,191,0.35)]"
                                : "bg-linear-to-r from-rose-500/70 via-rose-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
                            }`}
                            style={{ width: `${relativePercent}%` }}
                          />
                        </div>

                        {/* Category Signals Velocity Metric and Trend State */}
                        <div className="h-4 mt-1.5 flex items-center justify-between text-[10px] text-text-muted font-mono">
                          <span>
                            {t("velocity_label")}:{" "}
                            <span className={avgVelocityPos ? "text-emerald-400" : "text-rose-400"}>
                              {avgVelocityPos ? "+" : ""}
                              {(cat.avgVelocity * 100).toFixed(0)}%
                            </span>
                          </span>
                          <span>
                            {t("trend_label")}:{" "}
                            <span className={avgVelocityPos ? "text-emerald-400" : "text-rose-400"}>
                              {avgVelocityPos ? t("trend_surging") : t("trend_restructuring")}
                            </span>
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

      {/* ========================================== */}
      {/* Step 6: Render Academic and Industry Telemetry Citations Attribution */}
      {/* ========================================== */}
      <div className="mt-3 text-xs text-text-muted font-mono tracking-wide">
        <p>
          {t.rich("footer_sources_note", {
            date: formattedSyncDate,
            arxiv: (chunks) => (
              <a
                href="https://arxiv.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent font-medium underline underline-offset-2 transition-colors duration-200"
              >
                {chunks}
              </a>
            ),
            remoteok: (chunks) => (
              <a
                href="https://remoteok.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent font-medium underline underline-offset-2 transition-colors duration-200"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </section>
  );
}
