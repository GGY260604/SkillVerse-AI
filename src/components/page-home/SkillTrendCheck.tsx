"use client";

import { useState, useMemo, useId } from "react";
import { useTranslations, useLocale } from "next-intl";

// --- Schema ---

// Used by TrendTimeSeriesPoint schema below.
interface TimeSeriesPoint {
  period: string;
  periodLocalized?: Record<string, string>;
  demandIndex: number;
  postingVolume: number;
  velocityAtPoint: number;
  isProjected: boolean;
}

// Used by SkillTrendVisualization schema below.
interface SkillVisualization {
  velocityScore: number;
  growthRatePercent: string;
  status: "emerging" | "stable" | "declining";
  statusLocalized?: Record<string, string>;
  trendDirection: string;
  marketDemand: string;
  marketDemandLocalized?: Record<string, string>;
  historicalBaseline: number;
  currentDemand: number;
  timeSeries: TimeSeriesPoint[];
  analysisSummary: Record<string, string>;
}

// Used by EscoRoleSuggested schema below.
interface EscoRole {
  roleId: string;
  title: string;
  titleLocalized?: Record<string, string>;
  industry: string;
  industryLocalized?: Record<string, string> | null;
  similarityScore: number;
  requiredSkills: string[];
  requiredSkillsLocalized?: Record<string, string[]>;
  sdgAlignments?: Array<{ targetCode?: string; targetTitle?: string; affinityScore?: number }>;
  isNewlyCreated?: boolean;
}

// Used by SkillSearchResponse schema below.
interface SkillSearchResponse {
  success: boolean;
  query: string;
  matchedSkillName: string;
  matchedSkillLocalized?: Record<string, string>;
  category: string;
  categoryLocalized?: Record<string, string>;
  sources?: Array<Record<string, unknown>>;
  isNewSkillSynthesized?: boolean;
  visualization: SkillVisualization;
  suggestedRoles: EscoRole[];
  locale?: string;
  error?: string;
}

// --- Preset Suggestions ---
const PRESET_SKILLS = [
  "Python",
  "Prompt Engineering",
  "Kubernetes",
  "Autonomous Agents",
  "Cybersecurity",
  "Data Engineering",
];

/**
 * Interactive Skill Trend Diagnostic Component
 *
 * Provides real-time skill velocity diagnostics, historical demand time-series graphs,
 * projected uncertainty forecast cones, and aligned ESCO future-ready occupational recommendations.
 *
 * Component Requirements:
 * - Server Endpoints: GET /api/page-home/skilltrend.
 * - Localization Scope: home.skill_trend.
 *
 * Workflow:
 * 1. Initialize query input, preset suggestions, and interactive SVG chart tooltip state.
 * 2. Execute skill search against backend signal database with vector fallback matching.
 * 3. Calculate SVG spline curves, historical data points, and forward projection cones.
 * 4. Conditionally render diagnostic result views:
 *    - Branch A: Mount interactive SVG trajectory chart with demand indices and ESCO role recommendations.
 *    - Branch B: Mount default introductory diagnostic prompt with preset keyword triggers.
 */
export default function SkillTrendCheck() {
  // ==========================================
  // Step 1: Initialize Multi-Language Translation and Search State
  // ==========================================
  // Ingest localized labels for search inputs, trajectory legends, status badges, and SDG alignments.
  const t = useTranslations("home.skill_trend");
  const locale = useLocale();
  const gradientId = useId();

  // Track search query, loading indicators, server errors, and active SVG point tooltip pins.
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SkillSearchResponse | null>(null);
  const [tooltipState, setTooltipState] = useState<{ index: number; isPinned: boolean } | null>(null);
  const activeTooltipIndex = tooltipState?.index ?? null;

  // ==========================================
  // Step 2: Fetch Skill Trend Telemetry from Backend Search API
  // ==========================================
  // Query backend Next.js API route (/api/page-home/skilltrend) for skill trend telemetry.
  const handleSearch = async (searchTarget?: string) => {
    const rawTarget = typeof searchTarget === "string" ? searchTarget : query;
    const cleanSkill = rawTarget.trim();

    if (!cleanSkill) {
      return;
    }

    setLoading(true);
    setError(null);
    setTooltipState(null);

    try {
      const endpoint = `/api/page-home/skilltrend?query=${encodeURIComponent(cleanSkill)}&locale=${encodeURIComponent(locale)}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(t("error_notice"));
      }

      const data: SkillSearchResponse = await response.json();

      if (!data.success || !data.visualization) {
        throw new Error(data.error || t("error_notice"));
      }

      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("error_notice");
      console.error("[SkillTrendCheck] Search error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Step 3: Compute SVG Chart Coordinates and Trajectory Splines
  // ==========================================

  // 1. Time Series Points Extraction
  // Extract time series coordinates from visualization payload for chart plotting.
  const timeSeries = useMemo(() => {
    return result?.visualization?.timeSeries || [];
  }, [result]);

  // 2. Dual-Zone Boundary Split
  // Separate time series points into historical observations and forecast cone horizon.
  const { historicalPoints, forecastPoints, transitionIndex } = useMemo(() => {
    const historical: TimeSeriesPoint[] = [];
    const forecast: TimeSeriesPoint[] = [];
    let transIdx = -1;

    timeSeries.forEach((pt, index) => {
      if (!pt.isProjected) {
        historical.push(pt);
        transIdx = index;
      } else {
        forecast.push(pt);
      }
    });

    return {
      historicalPoints: historical,
      forecastPoints: forecast,
      transitionIndex: transIdx,
    };
  }, [timeSeries]);

  // 3. SVG Coordinate Mapping Engine
  // Translate time-series metrics into scalable SVG path strings and geometric polygons.
  const chartGeometry = useMemo(() => {
    if (timeSeries.length === 0) {
      return null;
    }

    const svgWidth = 840;
    const svgHeight = 320;
    const padding = { top: 32, right: 36, bottom: 48, left: 52 };
    const plotWidth = svgWidth - padding.left - padding.right;
    const plotHeight = svgHeight - padding.top - padding.bottom;

    const values = timeSeries.map((p) => p.demandIndex);
    const minVal = Math.max(0, Math.min(...values) - 15);
    const maxVal = Math.min(100, Math.max(...values) + 15);
    const range = maxVal - minVal || 1;

    // Map time index to horizontal pixel coordinate.
    const getX = (index: number) => {
      const step = plotWidth / (timeSeries.length - 1);
      return padding.left + index * step;
    };

    // Map demand index value to vertical pixel coordinate.
    const getY = (val: number) => {
      const norm = (val - minVal) / range;
      return padding.top + plotHeight - norm * plotHeight;
    };

    // Calculate pixel coordinates for all chronological points.
    const mappedPoints = timeSeries.map((pt, idx) => ({
      x: getX(idx),
      y: getY(pt.demandIndex),
      data: pt,
      index: idx,
    }));

    // Generate SVG path for historical zone curve.
    let historicalLinePath = "";
    let historicalAreaPath = "";

    if (transitionIndex >= 0) {
      const histPts = mappedPoints.slice(0, transitionIndex + 1);
      if (histPts.length > 0) {
        historicalLinePath = `M ${histPts[0].x} ${histPts[0].y}`;
        for (let i = 1; i < histPts.length; i++) {
          const prev = histPts[i - 1];
          const curr = histPts[i];
          const midX = (prev.x + curr.x) / 2;
          historicalLinePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
        }

        const lastHist = histPts[histPts.length - 1];
        const baseLineY = padding.top + plotHeight;
        historicalAreaPath = `${historicalLinePath} L ${lastHist.x} ${baseLineY} L ${histPts[0].x} ${baseLineY} Z`;
      }
    }

    // Generate SVG path for projected trajectory line.
    let projectedLinePath = "";
    if (transitionIndex >= 0 && transitionIndex < mappedPoints.length - 1) {
      const projPts = mappedPoints.slice(transitionIndex);
      projectedLinePath = `M ${projPts[0].x} ${projPts[0].y}`;
      for (let i = 1; i < projPts.length; i++) {
        const prev = projPts[i - 1];
        const curr = projPts[i];
        const midX = (prev.x + curr.x) / 2;
        projectedLinePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
      }
    }

    // Generate Forecast Cone polygon spanning uncertainty margin.
    let forecastConePath = "";
    if (transitionIndex >= 0 && transitionIndex < mappedPoints.length - 1) {
      const projPts = mappedPoints.slice(transitionIndex);
      const upperCoords: Array<{ x: number; y: number }> = [];
      const lowerCoords: Array<{ x: number; y: number }> = [];

      projPts.forEach((pt, step) => {
        const uncertaintyMargin = step * 6.5;
        const upperVal = Math.min(100, pt.data.demandIndex + uncertaintyMargin);
        const lowerVal = Math.max(0, pt.data.demandIndex - uncertaintyMargin);
        upperCoords.push({ x: pt.x, y: getY(upperVal) });
        lowerCoords.push({ x: pt.x, y: getY(lowerVal) });
      });

      let coneString = `M ${upperCoords[0].x} ${upperCoords[0].y}`;
      for (let i = 1; i < upperCoords.length; i++) {
        coneString += ` L ${upperCoords[i].x} ${upperCoords[i].y}`;
      }
      for (let i = lowerCoords.length - 1; i >= 0; i--) {
        coneString += ` L ${lowerCoords[i].x} ${lowerCoords[i].y}`;
      }
      coneString += " Z";
      forecastConePath = coneString;
    }

    const transitionX = transitionIndex >= 0 ? getX(transitionIndex) : padding.left;

    return {
      svgWidth,
      svgHeight,
      padding,
      plotWidth,
      plotHeight,
      minVal,
      maxVal,
      mappedPoints,
      historicalLinePath,
      historicalAreaPath,
      projectedLinePath,
      forecastConePath,
      transitionX,
    };
  }, [timeSeries, transitionIndex]);

  // 4. Metric Status Theme Resolvers
  // Select color palettes based on market status classification.
  const statusTheme = useMemo(() => {
    const status = result?.visualization?.status || "emerging";
    if (status === "emerging") {
      return {
        badgeBorder: "border-emerald-500/30",
        badgeBg: "bg-emerald-500/10",
        badgeText: "text-emerald-400",
        glow: "shadow-[0_0_24px_rgba(16,185,129,0.15)]",
      };
    }
    if (status === "declining") {
      return {
        badgeBorder: "border-rose-500/30",
        badgeBg: "bg-rose-500/10",
        badgeText: "text-rose-400",
        glow: "shadow-[0_0_24px_rgba(244,63,94,0.15)]",
      };
    }
    return {
      badgeBorder: "border-amber-500/30",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      glow: "shadow-[0_0_24px_rgba(245,158,11,0.15)]",
    };
  }, [result]);

  // --- UI ---
  return (
    <section
      id="skill-trend-check"
      className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20 w-full scroll-mt-24 relative"
    >
      {/* Outer Ambient Glow Mesh for Light and Dark Modes */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-96 h-96 rounded-full bg-accent/25 dark:bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-96 h-96 rounded-full bg-indigo-500/25 dark:bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-80 rounded-full bg-linear-to-r from-accent/20 via-teal-400/10 to-indigo-500/20 dark:from-accent/5 dark:to-indigo-500/5 blur-3xl" />
      </div>

      {/* Gradient Border Frame */}
      <div className="relative rounded-2xl sm:rounded-3xl p-px bg-linear-to-b from-accent/40 via-border-subtle to-indigo-500/40 shadow-xl dark:shadow-2xl">
        {/* Main Content Card */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-bg-card/95 backdrop-blur-xl p-5 sm:p-8 lg:p-10 overflow-hidden">
          {/* Internal Ambient Accents */}
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent/15 dark:bg-accent/10 blur-2xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/15 dark:bg-indigo-500/10 blur-2xl pointer-events-none"
          />

          {/* ========================================== */}
          {/* Step 4: Render Search Input Controls and Quick Keyword Presets */}
          {/* ========================================== */}
          <div className="relative z-10 text-center max-w-3xl mx-auto mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-3">
              {t("title")}
            </h2>

            <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          {/* Search Input Bar */}
          <div className="relative z-10 max-w-2xl mx-auto mb-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex items-center gap-2 p-2 rounded-xl sm:rounded-2xl bg-bg-elevated/90 border border-border-subtle shadow-inner focus-within:border-accent/50 transition-colors"
            >
              {/* Search Input */}
              <div className="relative flex-1 flex items-center min-w-0">
                <svg
                  className="w-5 h-5 ml-3 mr-2 text-text-muted shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search_placeholder")}
                  className="w-full bg-transparent text-sm sm:text-base text-text-primary placeholder:text-text-muted focus:outline-none py-2 px-1"
                  disabled={loading}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResult(null);
                      setTooltipState(null);
                    }}
                    className="p-1 mr-2 text-text-muted hover:text-text-primary transition-colors text-xs"
                    aria-label={t("reset_search")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Arrow Submit Button */}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                aria-label={t("btn_search")}
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg sm:rounded-xl font-semibold text-black bg-accent hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md shrink-0 cursor-pointer"
              >
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-bg-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-bg-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                )}
              </button>
            </form>

            {/* Quick Preset Chips Shown Only Prior to Query Execution */}
            {!result && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 text-xs">
                <span className="text-text-muted font-medium">{t("popular_presets")}</span>
                {PRESET_SKILLS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setQuery(preset);
                      handleSearch(preset);
                    }}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-md bg-bg-elevated hover:bg-bg-card-hover border border-border-subtle hover:border-accent/40 text-text-secondary hover:text-text-primary transition-all text-xs cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Alert Banner */}
          {error && (
            <div className="relative z-10 max-w-2xl mx-auto mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="flex-1">{error}</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="relative z-10 space-y-6 animate-pulse py-6 mt-6">
              <div className="h-28 rounded-2xl bg-bg-elevated/70" />
              <div className="h-80 rounded-2xl bg-bg-elevated/70" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="h-44 rounded-xl bg-bg-elevated/70" />
                <div className="h-44 rounded-xl bg-bg-elevated/70" />
                <div className="h-44 rounded-xl bg-bg-elevated/70" />
              </div>
            </div>
          )}

        {/* ========================================== */}
        {/* Step 5: Render Skill Diagnostic Telemetry Results */}
        {/* ========================================== */}

        {/* ========================================== */}
        {/* Branch A: Diagnostic Visualization Dashboard View */}
        {/* ========================================== */}
        {result && !loading && (
          <div className="animate-fade-in-up relative z-10 space-y-8 mt-6">
            {/* Header Telemetry Summary Card */}
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              {/* Skill Meta Information */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                    {result.matchedSkillLocalized?.[locale] || result.matchedSkillName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-bg-card text-text-secondary border border-border-subtle">
                    {result.categoryLocalized?.[locale] || result.category}
                  </span>
                </div>
              </div>

              {/* Unified Metric Highlights Cards Row Placed Below Skill Title */}
              <div className="flex items-center gap-3 w-full overflow-x-auto flex-nowrap pb-1">
                {/* Velocity Metric Card */}
                <div className="flex-1 min-w-max p-3 sm:p-3.5 rounded-xl bg-bg-card border border-border-subtle flex flex-col justify-between shrink-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1 whitespace-nowrap">
                    {t("metric_velocity")}
                  </div>
                  <div
                    className={`text-base sm:text-lg font-mono font-bold whitespace-nowrap ${
                      result.visualization.velocityScore >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {result.visualization.velocityScore >= 0 ? "+" : ""}
                    {result.visualization.velocityScore.toFixed(2)} ({result.visualization.growthRatePercent})
                  </div>
                </div>

                {/* Market Status Card */}
                <div className="flex-1 min-w-max p-3 sm:p-3.5 rounded-xl bg-bg-card border border-border-subtle flex flex-col justify-between shrink-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1 whitespace-nowrap">
                    {t("metric_status")}
                  </div>
                  <div className={`text-base sm:text-lg font-bold capitalize whitespace-nowrap ${statusTheme.badgeText}`}>
                    {result.visualization.statusLocalized?.[locale] || result.visualization.status}
                  </div>
                </div>

                {/* Market Demand Tier Card */}
                <div className="flex-1 min-w-max p-3 sm:p-3.5 rounded-xl bg-bg-card border border-border-subtle flex flex-col justify-between shrink-0">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted mb-1 whitespace-nowrap">
                    {t("metric_demand")}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-accent whitespace-nowrap">
                    {result.visualization.marketDemandLocalized?.[locale] || result.visualization.marketDemand}
                  </div>
                </div>
              </div>
            </div>

            {/* Dual-Zone Hybrid Line + Area Chart with Forecast Cone Card */}
            <div className="rounded-2xl sm:rounded-3xl bg-bg-elevated/70 border border-border-subtle p-4 sm:p-6 lg:p-8">
              {/* Chart Header Bar */}
              <div className="mb-6 pb-4 border-b border-border-subtle/60 space-y-3">
                {/* Chart Title and Description */}
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-text-primary mb-1">
                    {t("chart_badge")}
                  </h4>
                  <p className="text-xs text-text-muted">
                    {t("chart_description")}
                  </p>
                </div>

                {/* Legend Chips Placed at Top-Left of Graph Area */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  {/* Historical Legend */}
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-3.5 h-1 rounded bg-accent" />
                    <span>{t("historical_line_legend")}</span>
                  </div>
                  {/* Projected Legend */}
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <span className="w-3.5 h-1 border-t-2 border-dashed border-indigo-400" />
                    <span>{t("projected_line_legend")}</span>
                  </div>
                  {/* Forecast Cone Legend */}
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <span className="w-3.5 h-2.5 rounded bg-indigo-500/25 border border-indigo-400/40" />
                    <span>{t("forecast_cone_legend")}</span>
                  </div>
                </div>
              </div>

              {/* Chart SVG Canvas */}
              {chartGeometry && (
                <div
                  className="relative w-full overflow-x-auto pb-4"
                  onClick={() => setTooltipState(null)}
                  onMouseLeave={() => {
                    setTooltipState((prev) => (prev && !prev.isPinned ? null : prev));
                  }}
                >
                  <div className="min-w-180 w-full relative">
                    <svg
                      viewBox={`0 0 ${chartGeometry.svgWidth} ${chartGeometry.svgHeight}`}
                      className="w-full h-auto overflow-visible select-none"
                    >
                      <defs>
                        {/* Historical Area Gradient */}
                        <linearGradient id={`histGrad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00e5c3" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#00e5c3" stopOpacity="0.00" />
                        </linearGradient>

                        {/* Forecast Cone Area Gradient */}
                        <linearGradient id={`coneGrad-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.28" />
                        </linearGradient>

                        {/* Subtle Grid Hatch Pattern for Forecast Zone */}
                        <pattern id={`hatch-${gradientId}`} width="12" height="12" patternUnits="userSpaceOnUse">
                          <path d="M 0 12 L 12 0" stroke="rgba(129, 140, 248, 0.08)" strokeWidth="1" />
                        </pattern>
                      </defs>

                      {/* Forecast Zone Background Shading */}
                      <rect
                        x={chartGeometry.transitionX}
                        y={chartGeometry.padding.top}
                        width={chartGeometry.plotWidth - (chartGeometry.transitionX - chartGeometry.padding.left)}
                        height={chartGeometry.plotHeight}
                        fill={`url(#hatch-${gradientId})`}
                        rx="4"
                      />

                      {/* Horizontal Gridlines */}
                      {[0, 25, 50, 75, 100].map((level) => {
                        const y =
                          chartGeometry.padding.top +
                          chartGeometry.plotHeight -
                          (level / 100) * chartGeometry.plotHeight;
                        return (
                          <g key={level}>
                            <line
                              x1={chartGeometry.padding.left}
                              y1={y}
                              x2={chartGeometry.svgWidth - chartGeometry.padding.right}
                              y2={y}
                              stroke="rgba(255, 255, 255, 0.07)"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={chartGeometry.padding.left - 10}
                              y={y + 3}
                              textAnchor="end"
                              className="text-[10px] font-mono fill-text-muted"
                            >
                              {level}
                            </text>
                          </g>
                        );
                      })}

                      {/* Forecast Cone Shaded Confidence Envelope */}
                      {chartGeometry.forecastConePath && (
                        <path
                          d={chartGeometry.forecastConePath}
                          fill={`url(#coneGrad-${gradientId})`}
                          stroke="rgba(129, 140, 248, 0.45)"
                          strokeWidth="1.2"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* Historical Zone Area Gradient */}
                      {chartGeometry.historicalAreaPath && (
                        <path
                          d={chartGeometry.historicalAreaPath}
                          fill={`url(#histGrad-${gradientId})`}
                        />
                      )}

                      {/* Dual-Zone Vertical Separator Line */}
                      <line
                        x1={chartGeometry.transitionX}
                        y1={chartGeometry.padding.top - 12}
                        x2={chartGeometry.transitionX}
                        y2={chartGeometry.padding.top + chartGeometry.plotHeight + 12}
                        stroke="#00e5c3"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                        opacity="0.75"
                      />

                      {/* Zone Classification Headers */}
                      <text
                        x={chartGeometry.transitionX - 12}
                        y={chartGeometry.padding.top - 14}
                        textAnchor="end"
                        className="text-[11px] font-mono font-bold fill-accent tracking-wider"
                      >
                        ← {t("historical_zone")}
                      </text>
                      <text
                        x={chartGeometry.transitionX + 12}
                        y={chartGeometry.padding.top - 14}
                        textAnchor="start"
                        className="text-[11px] font-mono font-bold fill-indigo-400 tracking-wider"
                      >
                        {t("forecast_zone")} →
                      </text>

                      {/* Historical Trajectory Curve */}
                      {chartGeometry.historicalLinePath && (
                        <path
                          d={chartGeometry.historicalLinePath}
                          fill="none"
                          stroke="#00e5c3"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          className="filter drop-shadow-[0_0_8px_rgba(0,229,195,0.4)]"
                        />
                      )}

                      {/* Projected Trajectory Curve */}
                      {chartGeometry.projectedLinePath && (
                        <path
                          d={chartGeometry.projectedLinePath}
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="3"
                          strokeDasharray="6 5"
                          strokeLinecap="round"
                          className="filter drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]"
                        />
                      )}

                      {/* Data Point Nodes and Interactive Hitboxes */}
                      {chartGeometry.mappedPoints.map((pt) => {
                        const isSelected = activeTooltipIndex === pt.index;
                        const isHist = !pt.data.isProjected;

                        return (
                          <g
                            key={pt.index}
                            className="cursor-pointer"
                            onMouseEnter={() => {
                              setTooltipState({ index: pt.index, isPinned: false });
                            }}
                            onMouseLeave={() => {
                              setTooltipState((prev) => (prev?.index === pt.index && !prev.isPinned ? null : prev));
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTooltipState((prev) => {
                                if (prev?.index === pt.index && prev.isPinned) {
                                  return null;
                                }
                                return { index: pt.index, isPinned: true };
                              });
                            }}
                          >
                            {/* Base Node Circle */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 6.5 : 4.5}
                              fill={isHist ? "#00e5c3" : "#818cf8"}
                              stroke="#0f0f0f"
                              strokeWidth="2.5"
                              className="transition-all duration-150"
                            />

                            {/* Outer Pulse Ring for Projected Horizon */}
                            {!isHist && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="8"
                                fill="none"
                                stroke="#818cf8"
                                strokeWidth="1"
                                opacity="0.6"
                              />
                            )}

                            {/* X-Axis Period Label */}
                            <text
                              x={pt.x}
                              y={chartGeometry.padding.top + chartGeometry.plotHeight + 24}
                              textAnchor="middle"
                              className={`text-[11px] font-mono transition-colors ${
                                isSelected
                                  ? "fill-text-primary font-bold"
                                  : isHist
                                  ? "fill-text-secondary"
                                  : "fill-indigo-300"
                              }`}
                            >
                              {pt.data.periodLocalized?.[locale] || pt.data.period}
                            </text>

                            {/* Transparent Pointer Hit Area */}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="22"
                              fill="transparent"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Floating Point Overlay Tooltip Card */}
                    {activeTooltipIndex !== null && chartGeometry && (() => {
                      const pt = chartGeometry.mappedPoints[activeTooltipIndex];
                      const leftPercent = (pt.x / chartGeometry.svgWidth) * 100;
                      const topPercent = (pt.y / chartGeometry.svgHeight) * 100;
                      const isHist = !pt.data.isProjected;
                      const placeAbove = pt.y > 155;

                      let transformX = "-50%";
                      let caretPosClass = "left-1/2 -translate-x-1/2";
                      if (pt.index <= 1) {
                        transformX = "-12%";
                        caretPosClass = "left-5";
                      } else if (pt.index >= chartGeometry.mappedPoints.length - 2) {
                        transformX = "-88%";
                        caretPosClass = "right-5";
                      }

                      return (
                        <div
                          className="absolute pointer-events-none z-30 transition-all duration-150 animate-fade-in"
                          style={{
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            transform: placeAbove
                              ? `translate(${transformX}, calc(-100% - 14px))`
                              : `translate(${transformX}, 14px)`,
                          }}
                        >
                          {/* Caret Pointer Arrow */}
                          <div
                            className={`w-2.5 h-2.5 rotate-45 border-border-subtle bg-bg-card absolute ${
                              placeAbove
                                ? "-bottom-1.5 border-b border-r"
                                : "-top-1.5 border-t border-l"
                            } ${caretPosClass}`}
                          />

                          {/* Overlay Floating Card Content */}
                          <div className="w-auto min-w-fit max-w-60 px-3 py-2.5 rounded-xl bg-bg-card/95 backdrop-blur-md border border-border-subtle shadow-2xl text-xs font-mono space-y-1.5 whitespace-nowrap">
                            {/* Card Header: Period and Type */}
                            <div className="flex items-center justify-between gap-3 border-b border-border-subtle/50 pb-1.5">
                              <span className="font-bold text-text-primary text-xs">
                                {pt.data.periodLocalized?.[locale] || pt.data.period}
                              </span>
                              <span
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                  isHist
                                    ? "bg-accent/10 text-accent border border-accent/20"
                                    : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                }`}
                              >
                                {isHist ? t("historical_line_legend") : t("projected_line_legend")}
                              </span>
                            </div>

                            {/* Metrics Breakdown Grid */}
                            <div className="space-y-1 text-[11px] text-text-secondary">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">{t("demand_index_label")}:</span>
                                <strong className="text-text-primary">{pt.data.demandIndex} / 100</strong>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">{t("posting_volume_label")}:</span>
                                <strong className="text-text-primary">{pt.data.postingVolume}</strong>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-text-muted">{t("velocity_score_label")}:</span>
                                <strong
                                  className={
                                    pt.data.velocityAtPoint >= 0
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                  }
                                >
                                  {pt.data.velocityAtPoint >= 0 ? "+" : ""}
                                  {(pt.data.velocityAtPoint * 100).toFixed(1)}%
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Narrative Analysis Summary under the graph */}
              {result.visualization.analysisSummary && (
                <div className="mt-6 pt-5 border-t border-border-subtle/60">
                  <div className="flex items-center gap-2 mb-2 text-accent">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <h5 className="text-sm sm:text-base font-bold text-text-primary">
                      {t("analysis_summary_title")}
                    </h5>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {result.visualization.analysisSummary[locale] ||
                      result.visualization.analysisSummary["en"] ||
                      ""}
                  </p>
                </div>
              )}
            </div>

            {/* Aligned Occupational Roles Section */}
            {result.suggestedRoles && result.suggestedRoles.length > 0 && (
              <div>
                <div className="mb-4">
                  <h4 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                    {t("suggested_roles_title")}
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t("suggested_roles_desc")}
                  </p>
                </div>

                {/* Horizontal Scrollable Roles Row */}
                <div className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1 scroll-smooth">
                  {result.suggestedRoles.map((role) => {
                    const similarityPct = Math.round(role.similarityScore * 100);
                    const localizedTitle = role.titleLocalized?.[locale] || role.title;
                    const localizedSkills =
                      role.requiredSkillsLocalized?.[locale] || role.requiredSkills || [];

                    return (
                      <div
                        key={role.roleId}
                        className="flex-none w-70 sm:w-[320px] p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-bg-elevated/70 border border-border-subtle hover:border-accent/30 transition-all flex flex-col justify-between group"
                      >
                        {/* Role Card Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bg-card text-text-secondary border border-border-subtle truncate max-w-45">
                              {role.industry}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-accent/10 text-accent border border-accent/20 shrink-0">
                              {similarityPct}% {t("semantic_match")}
                            </span>
                          </div>

                          {/* Role Title */}
                          <h5 className="text-sm sm:text-base font-bold text-text-primary group-hover:text-accent transition-colors mb-2">
                            {localizedTitle}
                          </h5>

                          {/* Required Competencies */}
                          <div className="mt-3">
                            <div className="text-[11px] text-text-muted mb-1.5 font-medium">
                              {t("required_skills")}
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {localizedSkills.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded text-[10px] bg-bg-card text-text-secondary border border-border-subtle"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* SDG Alignments Footer */}
                        {role.sdgAlignments && role.sdgAlignments.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border-subtle/50 flex flex-wrap items-center gap-1.5">
                            {role.sdgAlignments.map((sdg, gIdx) => (
                              <span
                                key={gIdx}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              >
                                {sdg.targetCode || "SDG"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
