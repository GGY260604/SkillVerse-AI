"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

// --- Component Props ---
interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Localized client runtime error boundary component.
 * Catch unhandled exceptions and render interactive diagnostic telemetry with retry controls.
 */
export default function ErrorBoundary({ error, reset }: ErrorProps) {
  // ==========================================
  // Step 1: Initialize Localized Translations and State
  // ==========================================
  // Bind localization dictionary for error messaging.
  const t = useTranslations("other.status.error");
  // Manage visibility toggle for diagnostic digest details.
  const [showDetails, setShowDetails] = useState(false);

  // ==========================================
  // Step 2: Log Client Runtime Exception
  // ==========================================
  // Emit error payload to browser console for diagnostic tracing.
  useEffect(() => {
    console.error("[SKILLVERSE RUNTIME ERROR]", error);
  }, [error]);

  // ==========================================
  // Step 3: Render Error Diagnostic Interface
  // ==========================================
  // Display error status, localized explanation, retry button, and incident digest.
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] px-4 sm:px-6 relative overflow-hidden select-none animate-fade-in py-16">
      {/* ========================================== */}
      {/* Background Ambient Glow */}
      {/* ========================================== */}
      {/* Render radial warning ambient glow backdrop. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* ========================================== */}
      {/* Status Code Indicator */}
      {/* ========================================== */}
      {/* Display error code and anomaly warning banner. */}
      <div className="relative mb-4">
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-text-primary via-text-secondary to-transparent font-mono select-none drop-shadow-2xl">{t("code")}</h1>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-negative/60">SYSTEM ANOMALY DETECTED</span>
        </div>
      </div>

      {/* ========================================== */}
      {/* Narrative Explanation */}
      {/* ========================================== */}
      {/* Present human-readable title and descriptive message. */}
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3 text-center max-w-lg">{t("title")}</h2>
      <p className="text-sm text-text-secondary text-center max-w-md leading-relaxed mb-8">{t("description")}</p>

      {/* ========================================== */}
      {/* Action Controls Row */}
      {/* ========================================== */}
      {/* Provide retry trigger and return-to-home navigation link. */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-6">
        {/* Branch A: Trigger Runtime Recovery Callback */}
        <button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary text-xs font-semibold uppercase tracking-wider font-mono hover:opacity-90 hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300 cursor-pointer border-none"
        >
          <span>↻</span>
          <span>{t("btn_retry")}</span>
        </button>

        {/* Branch B: Navigate to Platform Home */}
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-border-accent text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider font-mono transition-all duration-300 no-underline cursor-pointer"
        >
          <span>←</span>
          <span>{t("btn_home")}</span>
        </Link>
      </div>

      {/* ========================================== */}
      {/* Diagnostic Error Digest Box */}
      {/* ========================================== */}
      {/* Render optional incident digest for telemetry inspection. */}
      {error.digest && (
        <div className="w-full max-w-md mt-4">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors underline cursor-pointer bg-transparent border-none p-0 mx-auto block mb-2"
          >
            {showDetails ? "Hide Diagnostic Telemetry" : "Show Diagnostic Telemetry"}
          </button>

          {showDetails && (
            <div className="p-3.5 rounded-xl bg-bg-secondary border border-border-subtle text-left font-mono text-xs text-text-muted break-all">
              <span className="text-text-secondary font-semibold">Incident Digest: </span>
              {error.digest}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
