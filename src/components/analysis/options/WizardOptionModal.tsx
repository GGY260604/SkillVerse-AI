"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";
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
} from "@/lib/profileNormalization";

const getDefaultLanguageForLocale = (loc: string) => {
  if (loc === "zh") return "Mandarin Chinese";
  if (loc === "ms") return "Bahasa Melayu";
  return "English";
};

// Option 2: Interactive Assessment Wizard Modal
// Styled in complete visual harmony with Option 1 (UploadOptionModal)
export default function WizardOptionModal() {
  const t = useTranslations("home.plan");
  const locale = useLocale();
  const { activeModal, openPathwaySelect, openRoleSelect, closeModals } = usePlanModal();

  // Multi-step index: 1 (Baseline), 2 (Skills & Toolchain), 3 (Future Aspirations), 4 (Learning Logistics)
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Baseline (Empty default unless autofilled)
  const [employmentStatus, setEmploymentStatus] = useState<string>("");
  const [currentJobTitle, setCurrentJobTitle] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");

  // Step 2: Skills & Competencies (Empty default unless autofilled)
  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [toolsAndSoftware, setToolsAndSoftware] = useState<string[]>([]);
  const [newToolName, setNewToolName] = useState("");
  const [casualDescription, setCasualDescription] = useState<string>("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguageName, setNewLanguageName] = useState("");

  // Step 3: Future Aspirations (Empty default unless autofilled)
  const [careerGoal, setCareerGoal] = useState<string>("");
  const [targetJobTitle, setTargetJobTitle] = useState<string>("");
  const [targetSectors, setTargetSectors] = useState<string[]>([]);
  const [workArrangement, setWorkArrangement] = useState<string>("");

  // Step 4: Learning Logistics (Empty default unless autofilled)
  const [weeklyCommitmentHours, setWeeklyCommitmentHours] = useState<string>("");
  const [learningProviders, setLearningProviders] = useState<string[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = activeModal === "wizard";

  // Helper function to populate form state from an incoming profile object
  const applyProfileToForm = useCallback((rawProfile: any) => {
    if (!rawProfile) return;
    const profile = normalizeProfileForForm(rawProfile);

    if (profile.employmentStatus) setEmploymentStatus(profile.employmentStatus);
    if (profile.currentJobTitle) setCurrentJobTitle(profile.currentJobTitle);
    if (profile.industry) setIndustry(profile.industry);
    if (profile.educationLevel) setEducationLevel(profile.educationLevel);
    if (profile.yearsOfExperience) setYearsOfExperience(profile.yearsOfExperience);

    // Normalize skills
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
      // Only default to current selected language when profile in DB has no languages
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
  }, []);

  // When modal opens: always load latest saved user profile directly from database
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
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile && !isCancelled) {
            applyProfileToForm(data.profile);
            return;
          }
        }
        // If user profile data cannot be read from DB (new user or empty):
        if (!isCancelled) {
          setLanguages([getDefaultLanguageForLocale(locale)]);
        }
      } catch (err) {
        console.warn("[WizardOptionModal] Failed to prefill from database:", err);
        if (!isCancelled) {
          setLanguages([getDefaultLanguageForLocale(locale)]);
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
  }, [isOpen, locale, applyProfileToForm]);

  // Handle Escape key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        closeModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, closeModals]);

  // Skills handlers
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

  // Tools handlers
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

  // Target sectors toggle
  const toggleSector = (sector: string) => {
    setErrorMessage(null);
    if (targetSectors.includes(sector)) {
      setTargetSectors(targetSectors.filter((s) => s !== sector));
    } else {
      setTargetSectors([...targetSectors, sector]);
    }
  };

  // Learning providers toggle
  const toggleProvider = (provider: string) => {
    setErrorMessage(null);
    if (learningProviders.includes(provider)) {
      setLearningProviders(learningProviders.filter((p) => p !== provider));
    } else {
      setLearningProviders([...learningProviders, provider]);
    }
  };

  // Language handlers (Manual entry just like Skills & Tools)
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

  // Step completion status checkers
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

  const isStepComplete = (stepIdx: number): boolean => {
    switch (stepIdx) {
      case 1:
        return isStep1Complete;
      case 2:
        return isStep2Complete;
      case 3:
        return isStep3Complete;
      case 4:
        return isStep4Complete;
      default:
        return false;
    }
  };

  // Step transition handlers (User is permitted to navigate freely between pages even if incomplete)
  const handleNextStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final submit handler: strictly validates all 4 steps before permitting submission
  const handleFinalSubmit = async () => {
    if (!isStep1Complete) {
      setCurrentStep(1);
      setErrorMessage(
        locale === "zh"
          ? "第 1 部分尚未填写完整。请完成所有必填项 (*)。"
          : locale === "ms"
          ? "Langkah 1 tidak lengkap. Sila lengkapkan semua medan yang diperlukan (*)."
          : "Step 1 is incomplete. Please complete all required fields (*)."
      );
      return;
    }
    if (!isStep2Complete) {
      setCurrentStep(2);
      setErrorMessage(
        locale === "zh"
          ? "第 2 部分尚未填写完整。请完成所有必填项 (*)。"
          : locale === "ms"
          ? "Langkah 2 tidak lengkap. Sila lengkapkan semua medan yang diperlukan (*)."
          : "Step 2 is incomplete. Please complete all required fields (*)."
      );
      return;
    }
    if (!isStep3Complete) {
      setCurrentStep(3);
      setErrorMessage(
        locale === "zh"
          ? "第 3 部分尚未填写完整。请完成所有必填项 (*)。"
          : locale === "ms"
          ? "Langkah 3 tidak lengkap. Sila lengkapkan semua medan yang diperlukan (*)."
          : "Step 3 is incomplete. Please complete all required fields (*)."
      );
      return;
    }
    if (!isStep4Complete) {
      setCurrentStep(4);
      setErrorMessage(
        locale === "zh"
          ? "第 4 部分尚未填写完整。请完成所有必填项 (*)。"
          : locale === "ms"
          ? "Langkah 4 tidak lengkap. Sila lengkapkan semua medan yang diperlukan (*)."
          : "Step 4 is incomplete. Please complete all required fields (*)."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      employmentStatus,
      currentJobTitle: currentJobTitle.trim() || null,
      industry: industry || null,
      educationLevel: educationLevel || null,
      yearsOfExperience: yearsOfExperience || null,
      skills,
      toolsAndSoftware,
      casualDescription: casualDescription.trim() || null,
      languages,
      careerGoal,
      targetSectors,
      targetJobTitle: targetJobTitle.trim() || null,
      workArrangement,
      weeklyCommitmentHours,
      learningProviders,
      outputLanguage: locale || "en",
    };

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user profile in database.");
      }

      setSaveSuccess(true);
      setIsSubmitting(false);
      openRoleSelect(payload as any);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "An unexpected error occurred while saving profile.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) closeModals();
      }}
    >
      {/* Modal Container: Matches Option 1 (UploadOptionModal) */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-bg-card/95 border border-border-subtle rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
      >
        {/* Top Controls: Back, Brand & Close (Identical to Option 1) */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openPathwaySelect}
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
              title={
                locale === "zh"
                  ? "正在读取档案数据..."
                  : locale === "ms"
                  ? "Memuatkan Data Profil..."
                  : "Loading Profile Data..."
              }
              subtitle={
                locale === "zh"
                  ? "正在从数据库同步您的个人技能与职业基准偏好..."
                  : locale === "ms"
                  ? "Menyegerakkan kecekapan kemahiran dan garis dasar kerjaya anda dari pangkalan data..."
                  : "Synchronizing your skills, competencies, and career baseline from database..."
              }
              showProgressBar={true}
              size="md"
            />
          </div>
        ) : (
          <>
            {/* Brand & Header Title (Matches Option 1 Title/Subtitle Pattern) */}
            <div className="mb-6 shrink-0">
          <h3 className="text-lg font-bold text-text-primary tracking-tight mb-1">
            {currentStep === 1 && (locale === "zh" ? "1. 职业基础档案" : locale === "ms" ? "1. Garis Dasar Profesional" : "1. Professional Baseline")}
            {currentStep === 2 && (locale === "zh" ? "2. 技能与技术工具栈" : locale === "ms" ? "2. Kemahiran & Rantaian Alat" : "2. Skills & Technical Toolchain")}
            {currentStep === 3 && (locale === "zh" ? "3. 转型目标与职业抱负" : locale === "ms" ? "3. Aspirasi & Matlamat Kerjaya" : "3. Future Horizons & Career Goals")}
            {currentStep === 4 && (locale === "zh" ? "4. 学习与培训规划" : locale === "ms" ? "4. Logistik Pembelajaran" : "4. Learning Logistics")}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            {currentStep === 1 && (locale === "zh" ? "明确您当前的职业状态、所在行业与资历背景。" : locale === "ms" ? "Tentukan kedudukan pekerjaan semasa, domain dan latar belakang pengalaman anda." : "Define your current occupational standing, domain, and experience background.")}
            {currentStep === 2 && (locale === "zh" ? "输入您的核心专业能力、技术工具、日常职责与语言掌握。" : locale === "ms" ? "Masukkan kecekapan teras, alatan teknikal, rutin harian dan bahasa anda." : "Input your core competencies, technical tools, daily routines, and languages.")}
            {currentStep === 3 && (locale === "zh" ? "选择您的转型意向、目标岗位与偏好的高增长发展领域。" : locale === "ms" ? "Pilih objektif transformasi, jawatan sasaran dan sektor pertumbuhan pilihan anda." : "Select your transformation objective, dream job target, and preferred growth sectors.")}
            {currentStep === 4 && (locale === "zh" ? "设定每周可投入的提升时间与受认可的培训课程提供商。" : locale === "ms" ? "Tetapkan komitmen masa pengajian mingguan dan penyedia latihan bertauliah pilihan." : "Set your weekly available study commitment and preferred certified course providers.")}
          </p>
        </div>

        {/* Error Notice: Plain red text, no background, no border */}
        {errorMessage && (
          <p className="mb-4 text-xs text-rose-400 font-mono animate-fade-in shrink-0">
            {errorMessage}
          </p>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto pr-1.5 space-y-4">
          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 1: Professional Baseline (1/4) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              {/* Box 1: Employment Status */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "职业状态" : locale === "ms" ? "Status Pekerjaan" : "Employment Status"}{" "}
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

              {/* Box 2: Current Job Title */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "当前 / 最近从事的岗位名称" : locale === "ms" ? "Jawatan Pekerjaan Semasa / Terkini" : "Current / Most Recent Occupational Title"}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    locale === "zh"
                      ? "例如：软件工程师、财务文员、数据分析师"
                      : locale === "ms"
                      ? "cth. Jurutera Perisian, Kerani Kewangan, Penganalisis Data"
                      : "e.g. Software Engineer, Financial Clerk, Data Analyst"
                  }
                  value={currentJobTitle}
                  onChange={(e) => {
                    setCurrentJobTitle(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary placeholder:text-text-muted font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                />
              </div>

              {/* Box 3: Industry & Experience Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                  <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "所属行业领域" : locale === "ms" ? "Domain Industri" : "Industry Domain"}{" "}
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
                      {locale === "zh" ? "选择行业领域..." : locale === "ms" ? "Pilih Domain Industri..." : "Select Industry Domain..."}
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
                    {locale === "zh" ? "工作经验年限" : locale === "ms" ? "Tahun Pengalaman" : "Years of Experience"}{" "}
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
                      {locale === "zh" ? "选择经验年限..." : locale === "ms" ? "Pilih Tahap Pengalaman..." : "Select Experience Level..."}
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

              {/* Box 4: Education Level */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "最高学历资质" : locale === "ms" ? "Kelayakan Tertinggi" : "Highest Qualification"}{" "}
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
                    {locale === "zh" ? "选择学历层级..." : locale === "ms" ? "Pilih Tahap Kelayakan..." : "Select Qualification Level..."}
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

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 2: Skills & Toolchain (2/4) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Box 1: Skills Inventory */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-3 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "专业技能与核心能力" : locale === "ms" ? "Kemahiran & Kecekapan" : "Skills & Competencies"}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {skills.length} {locale === "zh" ? "个已添加" : locale === "ms" ? "ditambah" : "added"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={locale === "zh" ? "输入技能（如 Python, SQL, 云架构）并按回车" : locale === "ms" ? "Taip kemahiran (cth. Python, SQL, Senibina Awan) & tekan Enter" : "Type skill (e.g. Python, SQL, Cloud Architecture) & press Enter"}
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="flex-1 py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="w-10 sm:w-12 py-2.5 flex items-center justify-center text-base font-bold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all shrink-0"
                    title={locale === "zh" ? "添加技能" : locale === "ms" ? "Tambah kemahiran" : "Add skill"}
                    aria-label={locale === "zh" ? "添加技能" : locale === "ms" ? "Tambah kemahiran" : "Add skill"}
                  >
                    +
                  </button>
                </div>

                {/* Free-flowing Blue-outlined Skills Chips (Rendered only when items exist) */}
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
                            {locale === "zh" ? "初级" : locale === "ms" ? "Asas" : "Beg"}
                          </option>
                          <option value="intermediate" className="bg-bg-card text-text-primary">
                            {locale === "zh" ? "中级" : locale === "ms" ? "Sederhana" : "Mid"}
                          </option>
                          <option value="advanced" className="bg-bg-card text-text-primary">
                            {locale === "zh" ? "精通" : locale === "ms" ? "Lanjutan" : "Adv"}
                          </option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill.id)}
                          className="text-text-muted hover:text-rose-400 bg-transparent border-none cursor-pointer text-xs ml-0.5 transition-colors"
                          title="Remove skill"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 2: Tools & Software */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-3 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "工具、软件与技术栈" : locale === "ms" ? "Alatan, Perisian & Tindanan" : "Tools, Software & Stack"}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {toolsAndSoftware.length} {locale === "zh" ? "个已添加" : locale === "ms" ? "ditambah" : "added"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={locale === "zh" ? "例如 Git, Docker, Excel, Figma, SAP" : locale === "ms" ? "cth. Git, Docker, Excel, Figma, SAP" : "e.g. Git, Docker, Excel, Figma, SAP"}
                    value={newToolName}
                    onChange={(e) => setNewToolName(e.target.value)}
                    onKeyDown={handleAddTool}
                    className="flex-1 py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddTool}
                    className="w-10 sm:w-12 py-2.5 flex items-center justify-center text-base font-bold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all shrink-0"
                    title={locale === "zh" ? "添加工具" : locale === "ms" ? "Tambah alatan" : "Add tool"}
                    aria-label={locale === "zh" ? "添加工具" : locale === "ms" ? "Tambah alatan" : "Add tool"}
                  >
                    +
                  </button>
                </div>

                {/* Free-flowing Blue-outlined Tools Chips (Rendered only when items exist) */}
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
                          title="Remove tool"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 3: Languages Spoken / Written */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-3 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "掌握与交流语言" : locale === "ms" ? "Bahasa Ditutur / Ditulis" : "Languages Spoken / Written"}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {languages.length} {locale === "zh" ? "种已添加" : locale === "ms" ? "ditambah" : "added"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={locale === "zh" ? "例如 英语, 马来语, 华语, 泰米尔语" : locale === "ms" ? "cth. English, Bahasa Melayu, Mandarin, Tamil" : "e.g. English, Bahasa Melayu, Mandarin, Tamil"}
                    value={newLanguageName}
                    onChange={(e) => setNewLanguageName(e.target.value)}
                    onKeyDown={handleAddLanguage}
                    className="flex-1 py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    className="w-10 sm:w-12 py-2.5 flex items-center justify-center text-base font-bold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all shrink-0"
                    title={locale === "zh" ? "添加语言" : locale === "ms" ? "Tambah bahasa" : "Add language"}
                    aria-label={locale === "zh" ? "添加语言" : locale === "ms" ? "Tambah bahasa" : "Add language"}
                  >
                    +
                  </button>
                </div>

                {/* Free-flowing Blue-outlined Languages Chips */}
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
                          title="Remove language"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 4: Casual Daily Work Description (Optional) */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "日常工作职责与业务描述" : locale === "ms" ? "Tanggungjawab & Rutin Kerja Harian" : "Daily Work Responsibilities & Routines"}
                  </label>
                  <span className="text-[11px] font-mono text-text-muted italic">
                    {locale === "zh" ? "选填" : locale === "ms" ? "Pilihan" : "Optional"}
                  </span>
                </div>
                <textarea
                  rows={2}
                  placeholder={locale === "zh" ? "用您自己的话描述日常工作任务（例如：撰写报告、分析客户数据、处理客服工单）..." : locale === "ms" ? "Terangkan tugasan harian anda (cth. menyediakan laporan, menganalisis data pelanggan, menjawab panggilan sokongan)..." : "Describe your day-to-day tasks in your own words (e.g. drafting reports, analyzing customer datasets, answering support calls)..."}
                  value={casualDescription}
                  onChange={(e) => setCasualDescription(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary placeholder:text-text-muted font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 3: Future Aspirations (3/4) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Box 1: Career Goal Objective */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "转型与进阶目标" : locale === "ms" ? "Objektif Transformasi" : "Transformation Objective"}{" "}
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

              {/* Box 2: Target Job Title */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "目标期望岗位名称" : locale === "ms" ? "Jawatan Sasaran Prospektif" : "Target Prospective Role Title"}{" "}
                  <span className="text-rose-400 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    locale === "zh"
                      ? "例如：AI 系统架构师、ESG 数据审计师、云 DevOps 主管"
                      : locale === "ms"
                      ? "cth. Arkitek Sistem AI, Juruaudit Data ESG, Ketua DevOps Awan"
                      : "e.g. AI Systems Architect, ESG Data Auditor, Cloud DevOps Lead"
                  }
                  value={targetJobTitle}
                  onChange={(e) => {
                    setTargetJobTitle(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-lg bg-bg-secondary/60 border border-border-subtle text-xs text-text-primary placeholder:text-text-muted font-mono focus:border-accent focus:bg-bg-secondary focus:outline-none transition-all"
                />
              </div>

              {/* Box 3: Target Growth Sectors */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "目标高增长赛道" : locale === "ms" ? "Sektor Pertumbuhan Sasaran" : "Target Growth Sectors"}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {targetSectors.length} {locale === "zh" ? "已选" : locale === "ms" ? "dipilih" : "selected"}
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
                  {/* Any custom sectors that were preserved from CV or DB */}
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

              {/* Box 4: Work Arrangement Preference */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "工作模式偏好" : locale === "ms" ? "Keutamaan Susunan Kerja" : "Work Arrangement Preference"}{" "}
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

          {/* ══════════════════════════════════════════════════════════ */}
          {/* STEP 4: Learning Logistics (4/4) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              {/* Box 1: Weekly Commitment Hours */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <label className="block text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                  {locale === "zh" ? "每周学习投入时间" : locale === "ms" ? "Komitmen Masa Pengajian Mingguan" : "Weekly Learning Time Commitment"}{" "}
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

              {/* Box 2: Learning Resource Providers */}
              <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 sm:p-5 space-y-2.5 transition-all duration-300 hover:border-accent/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wide">
                    {locale === "zh" ? "偏好的学习与课程提供方" : locale === "ms" ? "Penyedia Kursus & Sumber Pilihan" : "Preferred Course & Resource Types"}{" "}
                    <span className="text-rose-400 font-bold ml-0.5">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-text-muted">
                    {learningProviders.length} {locale === "zh" ? "已选" : locale === "ms" ? "dipilih" : "selected"}
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

            {/* Step Navigation Controls Footer: Matches Option 1 Footer */}
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

              {/* Centered Step Progress Indicator: Clean Light Grey Plain Text (1/4 -> 2/4 -> 3/4 -> 4/4) */}
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
                          {locale === "zh" ? "正在保存个人档案..." : locale === "ms" ? "Menyimpan Profil..." : "Saving Profile..."}
                        </span>
                      </span>
                    ) : saveSuccess ? (
                      <span>
                        {locale === "zh" ? "✓ 个人档案已保存" : locale === "ms" ? "✓ Profil Disimpan" : "✓ Profile Saved"}
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
