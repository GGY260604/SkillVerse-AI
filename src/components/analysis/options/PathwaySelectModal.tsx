"use client";

import React, { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/analysis/PlanModalContext";
import Logo from "@/components/Logo";

// --- Pathway Selection Modal ---
// Route the authenticated user to resume extraction or the manual profile wizard.
export default function PathwaySelectModal() {
  const t = useTranslations("home.plan");
  const { activeModal, openUploadOption, openWizardOption, closeModals } = usePlanModal();
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal === "pathway_select";

  // --- Modal Lifecycle ---
  // Close the selector on Escape.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModals]);

  if (!isOpen) return null;

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModals();
      }}
    >
      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-bg-card/95 border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] animate-fade-in-up"
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6">
          {/* Brand */}
          <Logo showBeta size="sm" />

          <button
            type="button"
            onClick={closeModals}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
            aria-label={t("btn_close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mb-2">
            {t("title")}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Assessment Pathways */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Resume Upload Pathway */}
          <div
            onClick={() => openUploadOption()}
            className="group flex flex-col cursor-pointer"
          >
            {/* Pathway Label */}
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted group-hover:text-accent transition-colors duration-200 mb-2 pl-0.5 block">
              {t("option_1_tag")}
            </span>

            {/* Upload Option */}
            <div className="relative flex-1 rounded-xl border border-border-subtle group-hover:border-accent bg-bg-secondary/40 group-hover:bg-bg-secondary/70 p-6 flex flex-col justify-between transition-all duration-300 group-hover:shadow-[0_0_30px_var(--accent-glow)]">
              <div>
                {/* Upload Icon */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-text-primary mb-2 group-hover:text-accent transition-colors">
                  {t("upload_title")}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-6">
                  {t("upload_desc")}
                </p>
              </div>

              <div className="w-full py-2.5 px-4 text-xs font-semibold bg-bg-card group-hover:bg-accent text-text-primary group-hover:text-bg-primary border border-border-subtle group-hover:border-transparent rounded-lg tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm">
                <span>{t("btn_select_file")}</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>

          {/* Profile Wizard Pathway */}
          <div
            onClick={() => openWizardOption()}
            className="group flex flex-col cursor-pointer"
          >
            {/* Pathway Label */}
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted group-hover:text-accent transition-colors duration-200 mb-2 pl-0.5 block">
              {t("option_2_tag")}
            </span>

            {/* Wizard Option */}
            <div className="relative flex-1 rounded-xl border border-border-subtle group-hover:border-accent bg-bg-secondary/40 group-hover:bg-bg-secondary/70 p-6 flex flex-col justify-between transition-all duration-300 group-hover:shadow-[0_0_30px_var(--accent-glow)]">
              <div>
                {/* Wizard Icon */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-bg-card border border-border-subtle flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-text-primary mb-2 group-hover:text-accent transition-colors">
                  {t("wizard_title")}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed mb-6">
                  {t("wizard_desc")}
                </p>
              </div>

              <div className="w-full py-2.5 px-4 text-xs font-semibold bg-bg-card group-hover:bg-accent text-text-primary group-hover:text-bg-primary border border-border-subtle group-hover:border-transparent rounded-lg tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm">
                <span>{t("btn_launch_wizard")}</span>
                <span className="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
