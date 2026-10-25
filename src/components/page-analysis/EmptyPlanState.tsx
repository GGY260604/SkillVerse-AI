"use client";

import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/analysis/PlanModalContext";

/**
 * Empty Career Plan State Component
 *
 * Prompts authenticated users to initiate their initial AI transformation diagnostic
 * when no current or historical roadmaps exist in the database.
 *
 * Component Requirements:
 * - Context Dependencies: PlanModalContext (for opening pathway selection options).
 * - Localization Scope: analysis.empty.
 *
 * Workflow:
 * 1. Read localized empty-state titles, descriptive guidance, and action labels.
 * 2. Mount responsive empty prompt container and call-to-action trigger.
 */
export default function EmptyPlanState() {
  // ==========================================
  // Step 1: Initialize Multi-Language Translation and Plan Modal Hooks
  // ==========================================
  // Ingest localized empty-state titles, descriptive guidance, and action labels.
  const t = useTranslations("analysis.empty");
  const { openPathwaySelect } = usePlanModal();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4 text-center">
      {/* ========================================== */}
      {/* Step 2: Render Localized Diagnostic Guidance Message */}
      {/* ========================================== */}
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
        {t("title")}
      </h2>

      <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed mb-8">
        {t("desc")}
      </p>

      {/* ========================================== */}
      {/* Step 3: Trigger Pathway Selection Flow */}
      {/* ========================================== */}
      <button
        type="button"
        onClick={() => openPathwaySelect()}
        className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold bg-accent text-bg-primary rounded-xl border-none cursor-pointer tracking-wide hover:opacity-95 hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300 font-mono"
      >
        <span>{t("btn_add_plan")}</span>
      </button>
    </div>
  );
}
