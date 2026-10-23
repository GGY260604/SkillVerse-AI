"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/analysis/PlanModalContext";
import { useAuth } from "@/context/auth/AuthContext";

// --- TransformationPlan Component ---
// Dual diagnostic selection cards triggering upload and form wizard overlay windows.
export default function TransformationPlan() {
  // --- Multi-Language Setup ---
  const t = useTranslations("home.plan");

  // --- Auth & Modal Context ---
  const { isLoggedIn, openAuthModal } = useAuth();
  const { openUploadOption, openWizardOption } = usePlanModal();

  // --- Helper Function ---

  // 1. Pathway Navigation and Modal Trigger
  // Verify user authentication status before initiating diagnosis.
  // Prompt sign-in modal if user is unauthenticated.
  // Open corresponding modal for resume upload or manual form wizard.
  const handleSelectPathway = (pathway: "upload" | "wizard") => {
    if (!isLoggedIn) {
      openAuthModal("login");
      return;
    }
    if (pathway === "upload") {
      openUploadOption();
    } else {
      openWizardOption();
    }
  };

  // 2. Tag Label Formatting
  // Split localized option tags into label prefix and highlight phrase.
  // Extract prefix and title to prevent unwanted mid-phrase line breaks.
  const [opt1Prefix, opt1Label] = useMemo(() => {
    const parts = t("option_1_tag").split(" • ");
    return [parts[0] || "", parts[1] || ""];
  }, [t]);

  const [opt2Prefix, opt2Label] = useMemo(() => {
    const parts = t("option_2_tag").split(" • ");
    return [parts[0] || "", parts[1] || ""];
  }, [t]);

  // --- UI ---
  return (
    <section
      id="transformation-plan"
      className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20 w-full scroll-mt-24"
    >
      {/* Section Header */}
      <div className="text-center mb-8 sm:mb-12">
        {/* Section Title */}
        <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-2 sm:mb-3">
          {t("title")}
        </h2>

        {/* Section Subtitle */}
        <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
          {t("subtitle")}
        </p>
      </div>

      {/* Dual Options Grid */}
      <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-6 overflow-x-auto overscroll-x-contain px-4 pt-3 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-8 lg:overflow-visible lg:px-0 lg:pt-3 lg:pb-3 lg:-mt-3">
        {/* Option 1: CV Upload Mode Selection Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectPathway("upload")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectPathway("upload");
            }
          }}
          className="group relative w-[88%] min-w-67.5 max-w-105 flex-none snap-start bg-bg-card/90 hover:bg-bg-card-hover/95 backdrop-blur-xl border border-border-subtle hover:border-accent rounded-2xl p-5 sm:p-8 flex flex-col justify-between shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_var(--accent-glow)] overflow-hidden lg:w-full lg:min-w-0 lg:max-w-none"
        >
          {/* Ambient Hover Glow */}
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,var(--accent-glow)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            {/* Option Meta Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <span className="whitespace-nowrap">{opt1Prefix} •</span>
                <span className="whitespace-nowrap">{opt1Label}</span>
              </div>
            </div>

            {/* Option Title & Description */}
            <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 group-hover:text-accent transition-colors duration-200">
              {t("upload_title")}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
              {t("upload_desc")}
            </p>

            {/* Upload Visual Box */}
            <div className="border-2 border-dashed border-border-subtle group-hover:border-accent bg-bg-secondary/40 group-hover:bg-bg-secondary/70 rounded-xl p-6 sm:p-8 text-center transition-all duration-300 flex flex-col items-center justify-center">
              {/* Document SVG Icon */}
              <div className="w-12 h-12 rounded-xl bg-accent-glow border border-border-accent/40 group-hover:border-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-6 h-6 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* Instructions */}
              <p className="text-sm font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
                {t("drag_drop_text")}
              </p>
              <p className="text-xs text-text-muted mb-4 font-mono">
                {t("drag_drop_subtext")}
              </p>

              {/* Action Trigger Button */}
              <div className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold bg-accent text-bg-primary rounded-xl tracking-wide flex items-center justify-center gap-1.5 shadow-[0_0_15px_var(--accent-glow)] group-hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300">
                <span>{t("btn_select_file")}</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Option 2: Manual Form Wizard Mode Selection Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelectPathway("wizard")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSelectPathway("wizard");
            }
          }}
          className="group relative w-[88%] min-w-67.5 max-w-105 flex-none snap-start bg-bg-card/90 hover:bg-bg-card-hover/95 backdrop-blur-xl border border-border-subtle hover:border-accent rounded-2xl p-5 sm:p-8 flex flex-col justify-between shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_var(--accent-glow)] overflow-hidden lg:w-full lg:min-w-0 lg:max-w-none"
        >
          {/* Ambient Hover Glow */}
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,var(--accent-glow)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="relative z-10">
            {/* Option Meta Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <span className="whitespace-nowrap">{opt2Prefix} •</span>
                <span className="whitespace-nowrap">{opt2Label}</span>
              </div>
            </div>

            {/* Option Title & Description */}
            <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 group-hover:text-accent transition-colors duration-200">
              {t("wizard_title")}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
              {t("wizard_desc")}
            </p>

            {/* Form Preview Visual Box */}
            <div className="border-2 border-dashed border-border-subtle group-hover:border-accent bg-bg-secondary/40 group-hover:bg-bg-secondary/70 rounded-xl p-6 sm:p-8 text-center transition-all duration-300 flex flex-col items-center justify-center">
              {/* Checklist SVG Icon */}
              <div className="w-12 h-12 rounded-xl bg-accent-glow border border-border-accent/40 group-hover:border-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-6 h-6 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>

              {/* Instructions */}
              <p className="text-sm font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
                {t("form_preview_title")}
              </p>
              <p className="text-xs text-text-muted mb-4 font-mono">
                {t("form_preview_subtext")}
              </p>

              {/* Action Trigger Button */}
              <div className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold bg-accent text-bg-primary rounded-xl tracking-wide flex items-center justify-center gap-1.5 shadow-[0_0_15px_var(--accent-glow)] group-hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300">
                <span>{t("btn_launch_wizard")}</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
