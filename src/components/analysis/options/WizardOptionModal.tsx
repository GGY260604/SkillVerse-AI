"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePlanModal } from "@/context/PlanModalContext";
import Logo from "@/components/Logo";
import { ProfileIntakePayload } from "@/lib/fastapi/client";

// Interactive Assessment Wizard Option Modal Component
// Provide structured multi-step diagnostic form for users without a pre-existing resume.
export default function WizardOptionModal() {
  const t = useTranslations("home.plan");
  const { activeModal, openPathwaySelect, openRoleSelect, closeModals } = usePlanModal();

  // Wizard Multi-Step State
  const [currentStep, setCurrentStep] = useState(1);
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("Software & Cloud");
  const [experienceLevel, setExperienceLevel] = useState("1-3");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "Python",
    "SQL",
    "Cloud Architecture",
  ]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [targetRole, setTargetRole] = useState("AI Systems Architect");
  const [targetGoal, setTargetGoal] = useState("reskill");
  const [isGenerating, setIsGenerating] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = activeModal === "wizard";

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

  // Add a skill tag chip to current competencies set.
  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setNewSkillInput("");
    }
  };

  // Remove a skill tag chip.
  const handleRemoveSkill = (skillToRemove: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skillToRemove));
  };

  // Assemble real user profile payload and transition to Role Discovery
  const handleFinalSubmit = () => {
    const profilePayload: ProfileIntakePayload = {
      employmentStatus: "employed_at_risk",
      currentJobTitle: jobTitle.trim() || undefined,
      industry: industry || undefined,
      yearsOfExperience: experienceLevel || undefined,
      skills: selectedSkills.map((s, idx) => ({
        id: `skill-${idx}-${s.toLowerCase().replace(/\s+/g, "-")}`,
        name: s,
        proficiency: "intermediate",
        isAiExtracted: false,
      })),
      targetJobTitle: targetRole.trim() || undefined,
      careerGoal: targetGoal || "reskill",
      weeklyCommitmentHours: "3-5",
      learningProviders: ["free_open", "hrd_corp"],
      outputLanguage: "en",
    };

    openRoleSelect(profilePayload);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) closeModals();
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
              disabled={isGenerating}
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
            disabled={isGenerating}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
            aria-label={t("btn_close")}
            title={t("btn_close")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Current Baseline (FUTURE EDIT) */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">
              1. Professional Baseline
            </h3>
            <p className="text-xs text-text-secondary">
              Tell us about your current occupation and primary domain experience.
            </p>

            <div>
              <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                Current Job Title
              </label>
              <input
                type="text"
                placeholder="e.g. Software Engineer, Data Analyst, IT Specialist"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs text-text-primary focus:border-accent focus:outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                  Industry Sector
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs text-text-primary focus:border-accent focus:outline-none font-mono"
                >
                  <option value="Software & Cloud">Software & Cloud Services</option>
                  <option value="Finance & FinTech">Banking & Financial Services</option>
                  <option value="Industrial Automation">Manufacturing & Automation</option>
                  <option value="Healthcare & BioTech">Healthcare & Telemedicine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                  Years of Experience
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs text-text-primary focus:border-accent focus:outline-none font-mono"
                >
                  <option value="0-1">0 - 1 Year (Entry)</option>
                  <option value="1-3">1 - 3 Years (Associate)</option>
                  <option value="3-5">3 - 5 Years (Mid-Level)</option>
                  <option value="5+">5+ Years (Senior / Lead)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Core Competencies & Skills (FUTURE EDIT) */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">
              2. Core Competencies & Toolchain
            </h3>
            <p className="text-xs text-text-secondary">
              List the tools, software, and methods you currently use in your day-to-day workflow.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a skill (e.g. Docker, TypeScript, LangChain) and press Enter"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="flex-1 py-2.5 px-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs text-text-primary focus:border-accent focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 text-xs font-semibold bg-accent text-bg-primary rounded-lg border-none cursor-pointer font-mono"
              >
                {t("btn_add_skill")}
              </button>
            </div>

            {/* Selected Skills Chips */}
            <div className="flex flex-wrap gap-2 pt-2 min-h-16 p-3 rounded-lg bg-bg-secondary/40 border border-border-subtle">
              {selectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-accent/15 text-accent border border-accent/30"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-accent hover:text-negative bg-transparent border-none cursor-pointer text-xs"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Target Horizon & Career Goals (FUTURE EDIT) */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">
              3. Target Horizon & Ambitions
            </h3>
            <p className="text-xs text-text-secondary">
              Where would you like to pivot or advance over the next 18 months?
            </p>

            <div>
              <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                Target Role or Echelon
              </label>
              <input
                type="text"
                placeholder="e.g. AI Systems Architect, Full-Stack Lead, MLOps Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg bg-bg-secondary border border-border-subtle text-xs text-text-primary focus:border-accent focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-text-muted uppercase mb-1">
                Transformation Objective
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "upskill", label: "Upskill", desc: "Advance in Current Field" },
                  { id: "reskill", label: "Reskill", desc: "Pivot to AI / Tech" },
                  { id: "explore", label: "Explore", desc: "Open to High-Demand Roles" },
                ].map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => setTargetGoal(obj.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      targetGoal === obj.id
                        ? "border-accent bg-accent/15 text-text-primary"
                        : "border-border-subtle bg-bg-secondary/40 text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <span className="block text-xs font-bold font-mono">{obj.label}</span>
                    <span className="block text-[10px] text-text-muted mt-0.5">{obj.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-border-subtle mt-8">
          <div className="flex-1 flex justify-start">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isGenerating}
                className="px-4 py-2 text-xs font-mono text-text-secondary hover:text-text-primary border border-border-subtle rounded-lg bg-transparent cursor-pointer transition-colors"
              >
                ← {t("btn_prev_step")}
              </button>
            ) : null}
          </div>

          {/* Step Progress Fraction (1/3, 2/3, 3/3) */}
          <div className="flex justify-center px-4">
            <span className="text-xs font-mono font-bold tracking-widest text-text-muted bg-bg-secondary px-3 py-1 rounded-md border border-border-subtle/50">
              {currentStep}/3
            </span>
          </div>

          <div className="flex-1 flex justify-end">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-5 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)] transition-all flex items-center gap-1.5"
              >
                <span>{t("btn_next_step")}</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isGenerating}
                className="px-6 py-2.5 text-xs font-semibold font-mono bg-accent text-bg-primary rounded-lg border-none cursor-pointer tracking-wide hover:opacity-90 shadow-[0_0_20px_var(--accent-glow)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span>{t("generating_state")}</span>
                ) : (
                  <span>{t("btn_submit")}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
