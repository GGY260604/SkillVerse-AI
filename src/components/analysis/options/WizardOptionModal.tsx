"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePlanModal } from "@/context/analysis/PlanModalContext";
import type { ProfileIntakePayload } from "@/lib/analysis/types";
import Logo from "@/components/Logo";
import LoadingSpinner from "@/components/LoadingSpinner";

export interface UserSkillItem {
  id: string;
  name: string;
  escoUri?: string | null;
  proficiency: "beginner" | "intermediate" | "advanced";
  isAiExtracted?: boolean;
}

import {
  EMPLOYMENT_STATUS_OPTIONS,
  WORK_ARRANGEMENT_OPTIONS,
  CAREER_GOAL_OPTIONS,
  YEARS_OF_EXPERIENCE_OPTIONS,
  INDUSTRY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  WEEKLY_COMMITMENT_OPTIONS,
  LEARNING_PROVIDER_OPTIONS,
  TARGET_SECTORS_DATA,
  getLocalized,
  getSectorLocalizedLabel,
  normalizeProfileForForm,
  normalizeEmploymentStatus,
} from "@/lib/profileNormalization";

const getDefaultLanguageForLocale = (loc: string) => {
  if (loc === "zh") return "Mandarin Chinese";
  if (loc === "ms") return "Bahasa Melayu";
  return "English";
};

// --- Assessment Wizard ---
// Load the saved profile, collect required career inputs, save them, and start role matching.
export default function WizardOptionModal() {
  const t = useTranslations("home.plan");
  const tw = useTranslations("analysis.wizard");
  const locale = useLocale();
  const { activeModal, openPathwaySelect, openRoleSelect, closeModals, targetUserId, targetUserName } =
    usePlanModal();

  // --- Wizard State ---
  // Active step in the four-step profile wizard.
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Professional baseline
  const [employmentStatus, setEmploymentStatus] = useState<string>("");
  const [currentJobTitle, setCurrentJobTitle] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");

  // Step 2: Skills and tools
  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [toolsAndSoftware, setToolsAndSoftware] = useState<string[]>([]);
  const [newToolName, setNewToolName] = useState("");
  const [casualDescription, setCasualDescription] = useState<string>("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguageName, setNewLanguageName] = useState("");

  // Step 3: Career goals
  const [careerGoal, setCareerGoal] = useState<string>("");
  const [targetJobTitle, setTargetJobTitle] = useState<string>("");
  const [targetSectors, setTargetSectors] = useState<string[]>([]);
  const [workArrangement, setWorkArrangement] = useState<string>("");

  // Step 4: Learning preferences
  const [weeklyCommitmentHours, setWeeklyCommitmentHours] = useState<string>("");
  const [learningProviders, setLearningProviders] = useState<string[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = activeModal === "wizard";
  const stepTitles = [
    tw("step_1_title"),
    tw("step_2_title"),
    tw("step_3_title"),
    tw("step_4_title"),
  ];
  const stepDescriptions = [
    tw("step_1_description"),
    tw("step_2_description"),
    tw("step_3_description"),
    tw("step_4_description"),
  ];

  // --- Profile Hydration ---
  // Normalize the profile API response into the four wizard steps, preserving saved values
  // and defaulting the spoken language only when the database has none.
  const applyProfileToForm = useCallback((rawProfile: any) => {
    if (!rawProfile) return;
    const profile = normalizeProfileForForm(rawProfile);

    if (profile.employmentStatus) setEmploymentStatus(profile.employmentStatus);
    if (profile.currentJobTitle) setCurrentJobTitle(profile.currentJobTitle);
    if (profile.industry) setIndustry(profile.industry);
    if (profile.educationLevel) setEducationLevel(profile.educationLevel);
    if (profile.yearsOfExperience) setYearsOfExperience(profile.yearsOfExperience);

    // Normalize skill entries to the form's item shape.
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
      const normalizedSkills: UserSkillItem[] = profile.skills.map((s: any, idx: number) => {
        if (typeof s === "string") {
          return { id: `skill-${idx}`, name: s, proficiency: "intermediate", isAiExtracted: true };
        }
        return {
          id: s.id || `skill-${idx}`,
          name: s.name || "Competency",
          proficiency: s.proficiency || "intermediate",
          escoUri: s.escoUri || null,
          isAiExtracted: s.isAiExtracted ?? true,
        };
      });
      setSkills(normalizedSkills);
    }

    if (Array.isArray(profile.toolsAndSoftware) && profile.toolsAndSoftware.length > 0) {
      setToolsAndSoftware(profile.toolsAndSoftware);
    }

    if (profile.casualDescription) setCasualDescription(profile.casualDescription);
    if (Array.isArray(profile.languages) && profile.languages.length > 0) {
      setLanguages(profile.languages);
    } else {
      // Default to the active locale only when no languages are saved.
      setLanguages([getDefaultLanguageForLocale(locale)]);
    }

    if (profile.careerGoal) setCareerGoal(profile.careerGoal);
    if (profile.targetJobTitle) setTargetJobTitle(profile.targetJobTitle);
    if (Array.isArray(profile.targetSectors) && profile.targetSectors.length > 0) {
      setTargetSectors(profile.targetSectors);
    }
    if (profile.workArrangement) setWorkArrangement(profile.workArrangement);

    if (profile.weeklyCommitmentHours) setWeeklyCommitmentHours(profile.weeklyCommitmentHours);
    if (Array.isArray(profile.learningProviders) && profile.learningProviders.length > 0) {
      setLearningProviders(profile.learningProviders);
    }
  }, [locale]);

  // --- Profile Loading ---
  // Load the saved profile and prefill the form when the wizard opens.
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setIsLoadingProfile(true);
      setErrorMessage(null);
      setSaveSuccess(false);
      setLanguages([]);
      setNewLanguageName("");
      return;
    }

    let isCancelled = false;
    setIsLoadingProfile(true);

    async function loadSavedProfile() {
      try {
        const queryParam = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : "";
        const res = await fetch(`/api/profile${queryParam}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || tw("profile_load_failed"));
        }

        if (data.profile && !isCancelled) {
          applyProfileToForm(data.profile);
          return;
        }

        if (!isCancelled) {
          setLanguages([getDefaultLanguageForLocale(locale)]);
        }
      } catch (err) {
        console.warn("[WizardOptionModal] Failed to prefill from database:", err);
        if (!isCancelled) {
          setLanguages([getDefaultLanguageForLocale(locale)]);
          setErrorMessage(
            err instanceof Error ? err.message : tw("profile_load_failed")
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadSavedProfile();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetUserId, locale, applyProfileToForm, tw]);

  // Close the wizard on Escape.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        closeModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, closeModals]);

  // --- Field Handlers ---
  // Manage skills.
  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (trimmed && !skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setSkills([
        ...skills,
        {
          id: `custom-${Date.now()}`,
          name: trimmed,
          proficiency: "intermediate",
          isAiExtracted: false,
        },
      ]);
      setNewSkillName("");
      setErrorMessage(null);
    }
  };

  const handleRemoveSkill = (idToRemove: string) => {
    setSkills(skills.filter((s) => s.id !== idToRemove));
  };

  const handleUpdateProficiency = (
    id: string,
    proficiency: "beginner" | "intermediate" | "advanced"
  ) => {
    setSkills(skills.map((s) => (s.id === id ? { ...s, proficiency } : s)));
  };

  // Manage tools and software.
  const handleAddTool = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newToolName.trim();
    if (trimmed && !toolsAndSoftware.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setToolsAndSoftware([...toolsAndSoftware, trimmed]);
      setNewToolName("");
      setErrorMessage(null);
    }
  };

  const handleRemoveTool = (toolToRemove: string) => {
    setToolsAndSoftware(toolsAndSoftware.filter((t) => t !== toolToRemove));
  };

  // Toggle target sectors.
  const toggleSector = (sector: string) => {
    setErrorMessage(null);
    if (targetSectors.includes(sector)) {
      setTargetSectors(targetSectors.filter((s) => s !== sector));
    } else {
      setTargetSectors([...targetSectors, sector]);
    }
  };

  // Toggle learning providers.
  const toggleProvider = (provider: string) => {
    setErrorMessage(null);
    if (learningProviders.includes(provider)) {
      setLearningProviders(learningProviders.filter((p) => p !== provider));
    } else {
      setLearningProviders([...learningProviders, provider]);
    }
  };

  // Manage spoken languages.
  const handleAddLanguage = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newLanguageName.trim();
    if (trimmed && !languages.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setLanguages([...languages, trimmed]);
      setNewLanguageName("");
      setErrorMessage(null);
    }
  };

  const handleRemoveLanguage = (langToRemove: string) => {
    setLanguages(languages.filter((l) => l !== langToRemove));
  };

  // --- Step Validation & Navigation ---
  // Validate the required fields for each step.
  const isStep1Complete = Boolean(
    employmentStatus &&
    currentJobTitle.trim() &&
    industry &&
    yearsOfExperience &&
    educationLevel
  );

  const isStep2Complete = Boolean(
    skills.length > 0 &&
    toolsAndSoftware.length > 0 &&
    languages.length > 0
  );

  const isStep3Complete = Boolean(
    careerGoal &&
    targetJobTitle.trim() &&
    targetSectors.length > 0 &&
    workArrangement
  );

  const isStep4Complete = Boolean(
    weeklyCommitmentHours &&
    learningProviders.length > 0
  );

  // Navigate between wizard steps.
  const handleNextStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // --- Form Submission ---
  // Validate and save the profile before starting role matching.
  const handleFinalSubmit = async () => {
    if (!isStep1Complete) {
      setCurrentStep(1);
      setErrorMessage(tw("incomplete_step", { step: 1 }));
      return;
    }
    if (!isStep2Complete) {
      setCurrentStep(2);
      setErrorMessage(tw("incomplete_step", { step: 2 }));
      return;
    }
    if (!isStep3Complete) {
      setCurrentStep(3);
      setErrorMessage(tw("incomplete_step", { step: 3 }));
      return;
    }
    if (!isStep4Complete) {
      setCurrentStep(4);
      setErrorMessage(tw("incomplete_step", { step: 4 }));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const sanitizedSkills: UserSkillItem[] = (skills || []).map((s, idx) => ({
      id: s.id || `skill-${Date.now()}-${idx}`,
      name: s.name?.trim() || "Competency",
      proficiency: s.proficiency || "intermediate",
      escoUri: s.escoUri || null,
      isAiExtracted: s.isAiExtracted ?? true,
    }));

    const sanitizedEmploymentStatus =
      normalizeEmploymentStatus(employmentStatus) || "employed_at_risk";

    const profilePayload: ProfileIntakePayload = {
      employmentStatus: sanitizedEmploymentStatus,
      currentJobTitle: currentJobTitle.trim() || null,
      industry: industry || null,
      educationLevel: educationLevel || null,
      yearsOfExperience: yearsOfExperience || null,
      skills: sanitizedSkills,
      toolsAndSoftware,
      casualDescription: casualDescription.trim() || null,
      languages,
      careerGoal: careerGoal || "explore",
      targetSectors,
      targetJobTitle: targetJobTitle.trim() || null,
      workArrangement: workArrangement || "any",
      weeklyCommitmentHours: weeklyCommitmentHours || "3-5",
      learningProviders:
        learningProviders.length > 0
          ? learningProviders
          : ["free_open", "hrd_corp"],
      outputLanguage: locale || "en",
    };
    const requestPayload = {
      ...profilePayload,
      targetUserId: targetUserId || undefined,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || tw("profile_update_failed"));
      }

      setSaveSuccess(true);
      setIsSubmitting(false);
      openRoleSelect(profilePayload, { targetUserId: targetUserId || undefined });
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrorMessage(err instanceof Error ? err.message : tw("unexpected_profile_error"));
    }
  };

  if (!isOpen) return null;

  // --- UI ---
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) closeModals();
      }}
    >
      {/* Modal Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] min-h-0 bg-bg-card/95 border border-border-subtle rounded-2xl p-4 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up flex flex-col"
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openPathwaySelect({ targetUserId: targetUserId || undefined, targetUserName: targetUserName || undefined })}
              disabled={isSubmitting}
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
            disabled={isSubmitting}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50"
            aria-label={t("btn_close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoadingProfile ? (
          <div className="flex-1 flex items-center justify-center py-16 sm:py-20 px-4">
            <LoadingSpinner
              title={tw("loading_profile_title")}
              subtitle={tw("loading_profile_description")}
              showProgressBar={true}
              size="md"
            />
          </div>
        ) : (
          <>
            {/* Modal Heading */}
            <div className="mb-6 shrink-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                {stepTitles[currentStep - 1]}
              </h3>
              {targetUserName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 font-semibold">
                  {tw("profile_name", { name: targetUserName })}
                </span>
              )}
            </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {stepDescriptions[currentStep - 1]}
          </p>
        </div>

        {/* Form Error */}
        {errorMessage && (
          <p className="mb-4 text-xs text-rose-400 font-mono animate-fade-in shrink-0">
            {errorMessage}
          </p>
        )}

        {/* Wizard Steps */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1.5 space-y-4">
          {/* --- Step 1: Professional Baseline --- */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Employment Status */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("employment_status")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EMPLOYMENT_STATUS_OPTIONS.map((item) => {
                    const isSelected = employmentStatus === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setEmploymentStatus(item.id);
                          setErrorMessage(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "border-accent bg-accent/10 text-text-primary shadow-[0_0_15px_var(--accent-glow)]"
                            : "border-border-subtle bg-bg-secondary/30 text-text-secondary hover:text-text-primary hover:border-accent/60 hover:bg-bg-secondary/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-text-primary">
                            {getLocalized(item.label, locale)}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                              isSelected
                                ? "bg-accent text-bg-primary border-accent font-bold"
                                : "border-border-subtle bg-bg-secondary/50 text-transparent"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1 leading-snug">
                          {getLocalized(item.desc, locale)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Job Title */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("current_job_title")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder={tw("current_job_title_placeholder")}
                  value={currentJobTitle}
                  onChange={(e) => {
                    setCurrentJobTitle(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary placeholder:text-text-muted font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                />
              </div>

              {/* Industry and Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                  <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("industry_domain")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => {
                      setIndustry(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled className="bg-bg-card text-text-muted">
                      {tw("select_industry")}
                    </option>
                    {industry && !INDUSTRY_OPTIONS.some((i) => i.id === industry) && (
                      <option value={industry} className="bg-bg-card text-text-primary">
                        {industry}
                      </option>
                    )}
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind.id} value={ind.id} className="bg-bg-card text-text-primary">
                        {getLocalized(ind.label, locale)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                  <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("years_experience")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={yearsOfExperience}
                    onChange={(e) => {
                      setYearsOfExperience(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled className="bg-bg-card text-text-muted">
                      {tw("select_experience")}
                    </option>
                    {yearsOfExperience && !YEARS_OF_EXPERIENCE_OPTIONS.some((exp) => exp.id === yearsOfExperience) && (
                      <option value={yearsOfExperience} className="bg-bg-card text-text-primary">
                        {yearsOfExperience}
                      </option>
                    )}
                    {YEARS_OF_EXPERIENCE_OPTIONS.map((exp) => (
                      <option key={exp.id} value={exp.id} className="bg-bg-card text-text-primary">
                        {getLocalized(exp.label, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Education Level */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("highest_qualification")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => {
                    setEducationLevel(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all cursor-pointer"
                >
                  <option value="" disabled className="bg-bg-card text-text-muted">
                    {tw("select_qualification")}
                  </option>
                  {educationLevel && !EDUCATION_LEVEL_OPTIONS.some((edu) => edu.id === educationLevel) && (
                    <option value={educationLevel} className="bg-bg-card text-text-primary">
                      {educationLevel}
                    </option>
                  )}
                  {EDUCATION_LEVEL_OPTIONS.map((edu) => (
                    <option key={edu.id} value={edu.id} className="bg-bg-card text-text-primary">
                      {getLocalized(edu.label, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* --- Step 2: Skills & Toolchain --- */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Skills */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-3 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("skills_and_competencies")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {tw("items_added", { count: skills.length })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={tw("skill_placeholder")}
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="flex-1 py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="w-10 sm:w-12 py-2.5 flex items-center justify-center text-base font-bold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all shrink-0"
                    title={tw("add_skill")}
                    aria-label={tw("add_skill")}
                  >
                    +
                  </button>
                </div>

                {/* Selected Skills */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border border-accent bg-accent/15 text-text-primary shadow-[0_0_12px_var(--accent-glow)] animate-fade-in"
                      >
                        <span className="font-semibold text-accent">{skill.name}</span>
                        <div className="h-3 w-px bg-accent/30" />
                        <select
                          value={skill.proficiency}
                          onChange={(e) =>
                            handleUpdateProficiency(
                              skill.id,
                              e.target.value as "beginner" | "intermediate" | "advanced"
                            )
                          }
                          className="text-[11px] bg-transparent border-none text-text-secondary hover:text-accent focus:outline-none cursor-pointer font-mono font-medium"
                        >
                          <option value="beginner" className="bg-bg-card text-text-primary">
                            {tw("proficiency_beginner")}
                          </option>
                          <option value="intermediate" className="bg-bg-card text-text-primary">
                            {tw("proficiency_intermediate")}
                          </option>
                          <option value="advanced" className="bg-bg-card text-text-primary">
                            {tw("proficiency_advanced")}
                          </option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill.id)}
                          className="text-text-muted hover:text-rose-400 bg-transparent border-none cursor-pointer text-xs ml-0.5 transition-colors"
                          title={tw("remove_skill")}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tools and Software */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-3 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("tools_and_software")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {tw("items_added", { count: toolsAndSoftware.length })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={tw("tool_placeholder")}
                    value={newToolName}
                    onChange={(e) => setNewToolName(e.target.value)}
                    onKeyDown={handleAddTool}
                    className="flex-1 py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddTool}
                    className="w-10 sm:w-12 py-2.5 flex items-center justify-center text-base font-bold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all shrink-0"
                    title={tw("add_tool")}
                    aria-label={tw("add_tool")}
                  >
                    +
                  </button>
                </div>

                {/* Selected Tools */}
                {toolsAndSoftware.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {toolsAndSoftware.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-accent bg-accent/15 text-text-primary shadow-[0_0_12px_var(--accent-glow)] animate-fade-in"
                      >
                        <span className="font-semibold text-accent">{tool}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTool(tool)}
                          className="text-text-muted hover:text-rose-400 bg-transparent border-none cursor-pointer text-xs ml-0.5 transition-colors"
                          title={tw("remove_tool")}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Languages */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-3 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("languages_spoken_written")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {tw("items_added", { count: languages.length })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={tw("language_placeholder")}
                    value={newLanguageName}
                    onChange={(e) => setNewLanguageName(e.target.value)}
                    onKeyDown={handleAddLanguage}
                    className="flex-1 py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    className="w-10 sm:w-12 py-2.5 flex items-center justify-center text-base font-bold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all shrink-0"
                    title={tw("add_language")}
                    aria-label={tw("add_language")}
                  >
                    +
                  </button>
                </div>

                {/* Selected Languages */}
                {languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-accent bg-accent/15 text-text-primary shadow-[0_0_12px_var(--accent-glow)] animate-fade-in"
                      >
                        <span className="font-semibold text-accent">{lang}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLanguage(lang)}
                          className="text-text-muted hover:text-rose-400 bg-transparent border-none cursor-pointer text-xs ml-0.5 transition-colors"
                          title={tw("remove_language")}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Work Description */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("daily_work_description")}
                  </label>
                  <span className="text-[11px] font-mono text-text-muted italic">
                    {tw("optional")}
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder={tw("daily_work_placeholder")}
                  value={casualDescription}
                  onChange={(e) => setCasualDescription(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary placeholder:text-text-muted font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* --- Step 3: Future Aspirations --- */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Career Goal */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("transformation_objective")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CAREER_GOAL_OPTIONS.map((item) => {
                    const isSelected = careerGoal === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCareerGoal(item.id);
                          setErrorMessage(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "border-accent bg-accent/10 text-text-primary shadow-[0_0_15px_var(--accent-glow)]"
                            : "border-border-subtle bg-bg-secondary/30 text-text-secondary hover:text-text-primary hover:border-accent/60 hover:bg-bg-secondary/60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-text-primary">
                            {getLocalized(item.label, locale)}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                              isSelected
                                ? "bg-accent text-bg-primary border-accent font-bold"
                                : "border-border-subtle bg-bg-secondary/50 text-transparent"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1 leading-snug">
                          {getLocalized(item.desc, locale)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Job Title */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("target_job_title")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder={tw("target_job_placeholder")}
                  value={targetJobTitle}
                  onChange={(e) => {
                    setTargetJobTitle(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary placeholder:text-text-muted font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                />
              </div>

              {/* Target Sectors */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("target_growth_sectors")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {tw("items_selected", { count: targetSectors.length })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TARGET_SECTORS_DATA.map((sectorItem) => {
                    const isSelected = targetSectors.includes(sectorItem.id);
                    return (
                      <button
                        key={sectorItem.id}
                        type="button"
                        onClick={() => toggleSector(sectorItem.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                          isSelected
                            ? "border-accent bg-accent/15 text-accent font-semibold shadow-sm"
                            : "border-border-subtle bg-bg-secondary/40 text-text-muted hover:text-text-primary hover:border-accent"
                        }`}
                      >
                        <span>{isSelected ? "✓" : "+"}</span>
                        <span>{getLocalized(sectorItem.label, locale)}</span>
                      </button>
                    );
                  })}
                  {/* Custom Sectors */}
                  {targetSectors
                    .filter((s) => !TARGET_SECTORS_DATA.some((def) => def.id === s))
                    .map((customSector) => (
                      <button
                        key={customSector}
                        type="button"
                        onClick={() => toggleSector(customSector)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono border border-accent bg-accent/15 text-accent font-semibold shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>{getSectorLocalizedLabel(customSector, locale)}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Work Arrangement */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("work_arrangement")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {WORK_ARRANGEMENT_OPTIONS.map((arr) => {
                    const isSelected = workArrangement === arr.id;
                    return (
                      <button
                        key={arr.id}
                        type="button"
                        onClick={() => {
                          setWorkArrangement(arr.id);
                          setErrorMessage(null);
                        }}
                        className={`py-2.5 px-3 rounded-xl border text-center text-xs font-mono cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? "border-accent bg-accent/15 text-accent font-bold shadow-sm"
                            : "border-border-subtle bg-bg-secondary/30 text-text-muted hover:text-text-primary hover:border-accent"
                        }`}
                      >
                        {isSelected && <span>✓</span>}
                        <span>{getLocalized(arr.label, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* --- Step 4: Learning Logistics --- */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              {/* Weekly Commitment */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {tw("weekly_learning_commitment")}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {WEEKLY_COMMITMENT_OPTIONS.map((c) => {
                    const isSelected = weeklyCommitmentHours === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setWeeklyCommitmentHours(c.id);
                          setErrorMessage(null);
                        }}
                        className={`p-3.5 rounded-xl border text-center cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "border-accent bg-accent/10 text-accent font-bold shadow-[0_0_15px_var(--accent-glow)]"
                            : "border-border-subtle bg-bg-secondary/30 text-text-muted hover:text-text-primary hover:border-accent"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {isSelected && <span className="text-xs">✓</span>}
                          <span className="text-xs font-mono font-bold text-text-primary">
                            {getLocalized(c.label, locale)}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1">
                          {getLocalized(c.sub, locale)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Learning Providers */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {tw("preferred_learning_providers")}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {tw("items_selected", { count: learningProviders.length })}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEARNING_PROVIDER_OPTIONS.map((prov) => {
                    const isSelected = learningProviders.includes(prov.id);
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => toggleProvider(prov.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "border-accent bg-accent/10 text-text-primary shadow-[0_0_15px_var(--accent-glow)]"
                            : "border-border-subtle bg-bg-secondary/30 text-text-muted hover:text-text-primary hover:border-accent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-text-primary">
                            {getLocalized(prov.label, locale)}
                          </span>
                          <span className={`text-xs font-bold ${isSelected ? "text-accent" : "text-text-muted"}`}>
                            {isSelected ? "✓" : "+"}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-1 leading-snug">
                          {getLocalized(prov.desc, locale)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-border-subtle mt-6 shrink-0">
              <div className="flex-1 flex justify-start">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    className="text-text-muted hover:text-text-primary text-xs font-mono bg-transparent border-none cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>←</span>
                    <span>{t("btn_prev_step")}</span>
                  </button>
                ) : null}
              </div>

              {/* Step Progress */}
              <div className="font-mono text-xs text-text-muted select-none tracking-wider">
                <span>{currentStep}/4</span>
              </div>

              <div className="flex-1 flex justify-end">
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] transition-all flex items-center gap-1.5"
                  >
                    <span>{t("btn_next_step")}</span>
                    <span>→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || saveSuccess}
                    className={`px-6 py-2.5 text-xs font-semibold font-mono rounded-lg border-none cursor-pointer tracking-wide shadow-md transition-all flex items-center gap-2 ${
                      saveSuccess
                        ? "bg-emerald-500 text-bg-primary"
                        : "bg-accent text-bg-primary hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>
                          {tw("saving_profile")}
                        </span>
                      </span>
                    ) : saveSuccess ? (
                      <span>
                        {tw("profile_saved")}
                      </span>
                    ) : (
                      <span>{t("btn_submit")}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
