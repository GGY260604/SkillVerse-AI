"use client";

import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";

// Empty Plan State Component
// Rendered when no career roadmap exists for the current user session.
export default function EmptyPlanState() {
  const t = useTranslations("analysis.empty");
  const { openPathwaySelect } = usePlanModal();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4 text-center">
      {/* Main Empty State Heading */}
      <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
        {t("title")}
      </h2>

      {/* Subtitle Description */}
      <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed mb-8">
        {t("desc")}
      </p>

      {/* Action Button: Add New Plan */}
      <button
        type="button"
        onClick={openPathwaySelect}
        className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold bg-accent text-bg-primary rounded-xl border-none cursor-pointer tracking-wide hover:opacity-95 hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300 font-mono"
      >
        <span>{t("btn_add_plan")}</span>
      </button>
    </div>
  );
}
