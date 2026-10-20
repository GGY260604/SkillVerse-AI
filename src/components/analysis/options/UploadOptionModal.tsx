"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";
import Logo from "@/components/Logo";
import { FileFormatIcon } from "@/lib/fileIcons";

// Upload Option Modal Component
// Provide dedicated file ingestion overlay window for CV extraction and semantic matching.
export default function UploadOptionModal() {
  const t = useTranslations("home.plan");
  const { activeModal, openPathwaySelect, closeModals } = usePlanModal();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isOpen = activeModal === "upload";

  // Handle Escape key to dismiss modal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModals]);

  // Handle drag and drop file ingestion events.
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
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Simulate semantic analysis pipeline with stepped feedback.
  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisStep(1);

    setTimeout(() => setAnalysisStep(2), 1200);
    setTimeout(() => setAnalysisStep(3), 2400);
    setTimeout(() => {
      setIsAnalyzing(false);
      closeModals();
    }, 3600);
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
              onClick={openPathwaySelect}
              disabled={isAnalyzing}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
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
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
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

        {/* File Drag & Drop Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center mb-6 ${
            isDragging
              ? "border-accent bg-accent/10"
              : selectedFile
              ? "border-positive/50 bg-positive/5"
              : "border-border-subtle hover:border-accent bg-bg-secondary/40 hover:bg-bg-secondary/70"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
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
                }}
                className="text-xs text-negative hover:underline font-mono bg-transparent border-none cursor-pointer"
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

        {/* Live Analysis Stepper Status (FUTURE EDIT) */}
        {isAnalyzing && (
          <div className="rounded-xl bg-bg-secondary/80 border border-accent/40 p-4 mb-6 animate-fade-in font-mono text-xs">
            <div className="flex items-center gap-2 mb-2 text-accent font-bold">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span>
                {analysisStep === 1 && "Stage 1: PII Scrubbing & ESCO Taxonomy Normalization..."}
                {analysisStep === 2 && "Stage 2: GPU Vector Embedding & Soft Overlap Matching..."}
                {analysisStep === 3 && "Stage 3: Synthesizing 3-Phase Reskilling Roadmap..."}
              </span>
            </div>
            <div className="w-full bg-border-subtle rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-accent h-full transition-all duration-700"
                style={{ width: `${(analysisStep / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step Navigation / Action Controls */}
        <div className="flex items-center justify-end pt-6 border-t border-border-subtle mt-8">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || !selectedFile}
            className="px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <span>{t("analyzing_state")}</span>
            ) : (
              <span>{t("btn_submit")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
