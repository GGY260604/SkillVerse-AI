"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/analysis/PlanModalContext";
import Logo from "@/components/Logo";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FileFormatIcon } from "@/lib/fileIcons";
import { extractProfileDocument } from "@/lib/analysis/client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

// --- Resume Upload Option ---
// Validate a CV, extract profile data, persist non-empty fields, then continue to the wizard.
export default function UploadOptionModal() {
  const t = useTranslations("home.plan");
  const extractionStageTexts = [
    t("extract_stage_1"),
    t("extract_stage_2"),
    t("extract_stage_3"),
    t("extract_stage_4"),
  ];
  const { activeModal, openPathwaySelect, openWizardOption, closeModals } = usePlanModal();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal === "upload";

  // Handle Escape key to dismiss modal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isAnalyzing) {
        closeModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isAnalyzing, closeModals]);

  // Reset local state when modal closes or opens.
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsAnalyzing(false);
      setAnalysisStep(1);
    } else {
      setSelectedFile(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // --- File Intake ---
  // 1. Validate size and format before accepting a file from the picker or drop zone.
  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(t("file_too_large", { size: (file.size / (1024 * 1024)).toFixed(1) }));
      return;
    }

    const name = file.name.toLowerCase();
    const type = (file.type || "").toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasValidMime = type.startsWith("image/") || type === "application/pdf";

    if (!hasValidExt && !hasValidMime) {
      setErrorMessage(t("unsupported_file_format"));
      return;
    }

    setSelectedFile(file);
  };

  // Support both drag-and-drop and file-picker intake through the same validation.
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // --- Extraction Workflow ---
  // 2. POST the file to /api/analysis/extract; the API calls FastAPI and saves returned
  //    non-empty profile fields for the signed-in user.
  // 3. On success, open the wizard, which reloads the saved profile from /api/profile.
  //    The wizard submit then saves edits and starts role matching.
  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisStep(1);

    const step2Timer = setTimeout(() => {
      setAnalysisStep(2);
    }, 600);

    try {
      const data = await extractProfileDocument(selectedFile);

      if (!data.success) {
        throw new Error(data.error || t("extraction_failed"));
      }

      clearTimeout(step2Timer);

      setAnalysisStep(3);
      await new Promise((r) => setTimeout(r, 700));

      setAnalysisStep(4);
      await new Promise((r) => setTimeout(r, 700));

      setIsAnalyzing(false);
      // Seamlessly transition to Option 2 (Wizard) which fetches fresh profile directly from database
      openWizardOption();
    } catch (err: unknown) {
      clearTimeout(step2Timer);
      setIsAnalyzing(false);
      setErrorMessage(err instanceof Error ? err.message : t("unexpected_extraction_error"));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAnalyzing) closeModals();
      }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-bg-card/95 border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up"
      >
        {/* Top Controls: Back, Brand & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openPathwaySelect()}
              disabled={isAnalyzing}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
              aria-label={t("btn_back")}
              title={t("btn_back")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <Logo size="sm" />
          </div>

          <button
            type="button"
            onClick={closeModals}
            disabled={isAnalyzing}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
            aria-label={t("btn_close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Brand & Header Title */}
        <h3 className="text-lg font-bold text-text-primary tracking-tight mb-1">
          {t("upload_title")}
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          {t("upload_desc")}
        </p>

        {/* Dynamic Area: Upload Widget VS Loading Animation */}
        {!isAnalyzing ? (
          <div>
            {/* File Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                isDragging
                  ? "border-accent bg-accent/10"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border-subtle hover:border-accent bg-bg-secondary/40 hover:bg-bg-secondary/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <FileFormatIcon
                    fileOrName={selectedFile}
                    className="w-14 h-14 rounded-xl mb-3 shadow-md"
                    iconClassName="w-7 h-7"
                  />
                  <span className="text-xs font-semibold text-text-primary font-mono max-w-xs truncate mb-1">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-text-muted font-mono mb-3">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {t("file_ready")}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setErrorMessage(null);
                    }}
                    className="text-xs text-rose-400 hover:underline font-mono bg-transparent border-none cursor-pointer"
                  >
                    {t("remove_file")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-accent-glow border border-border-accent/40 flex items-center justify-center text-accent mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-text-primary mb-1">
                    {t("drag_drop_text")}
                  </p>
                  <p className="text-xs text-text-muted font-mono">
                    {t("drag_drop_subtext")}
                  </p>
                </>
              )}
            </div>

            {/* Error Message: Plain red text, no box, no background, no border */}
            {errorMessage && (
              <p className="mt-2.5 text-xs text-rose-400 font-mono text-left animate-fade-in">
                {errorMessage}
              </p>
            )}
          </div>
        ) : (
          /* Extraction Loading Telemetry (Replaces upload widget during processing) */
          <div className="min-h-60 sm:min-h-70 rounded-xl border border-border-subtle bg-bg-secondary/40 flex flex-col items-center justify-center p-6 sm:p-8 text-center animate-fade-in mb-2">
            <LoadingSpinner
              title={extractionStageTexts[analysisStep - 1] ?? t("analyzing_state")}
              titleClassName="text-xs sm:text-sm font-mono tracking-wide mb-3"
              showProgressBar={true}
              progressPercent={
                analysisStep === 1
                  ? 25
                  : analysisStep === 2
                  ? 60
                  : analysisStep === 3
                  ? 85
                  : 100
              }
              progressBarClassName="h-1.5"
              size="md"
            />
          </div>
        )}

        {/* Action Button: Hidden while extraction is analyzing */}
        {!isAnalyzing && (
          <div className="flex items-center justify-end pt-6 border-t border-border-subtle mt-6">
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={!selectedFile}
              className="px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{t("btn_submit")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
