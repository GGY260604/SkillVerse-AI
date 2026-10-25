"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  USE_PHASE_QUIZ_MODAL_TESTING,
  USE_QUIZ_MOCK_DATA,
  getMockQuizData,
} from "@/constants/testing/quiz";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResponseData {
  phaseIndex: number;
  phaseTitle: string;
  expReward: number;
  expDifficultyTier?: string;
  evaluationReason?: string;
  passingScore: number;
  questions: QuizQuestion[];
}

/**
 * Phase Mastery Assessment Quiz Modal Component
 *
 * Dynamically fetches AI-generated or syllabus-grounded multi-choice competency questions
 * tailored to a specific learning phase, grading responses and awarding verified EXP.
 *
 * Component Properties:
 * - isOpen: Boolean controlling modal overlay visibility.
 * - onClose: Callback invoked to dismiss the quiz modal.
 * - phaseIndex: Numerical index of the milestone phase being assessed.
 * - phaseTitle: Localized title of the target milestone phase.
 * - phaseDescription (optional): Contextual syllabus summary.
 * - skills: Array of core competencies assessed by the quiz.
 * - targetRole (optional): Target career occupation title.
 * - alreadyCompleted (optional): Boolean indicating if phase was previously mastered.
 * - onPassed: Callback notifying parent containers of successful assessment and EXP awarded.
 *
 * Workflow:
 * 1. Fetch tailored quiz questions and passing score criteria from backend API.
 * 2. Stage A: Mount introductory preview card displaying skills, question count, and EXP bounty.
 * 3. Stage B: Present active questions with interactive option selection and live progress tracker.
 * 4. Stage C: Evaluate submissions, display score feedback, and unlock next phase upon passing.
 */
interface PhaseQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  phaseIndex: number;
  phaseTitle: string;
  phaseDescription?: string;
  skills: string[];
  targetRole?: string;
  alreadyCompleted?: boolean;
  onPassed: (expGained: number) => void;
}

export default function PhaseQuizModal({
  isOpen,
  onClose,
  phaseIndex,
  phaseTitle,
  phaseDescription,
  skills,
  targetRole,
  alreadyCompleted = false,
  onPassed,
}: PhaseQuizModalProps) {
  const locale = useLocale();
  const t = useTranslations("analysis.quiz");

  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizResponseData | null>(null);
  const [isTestingOpen, setIsTestingOpen] = useState(USE_PHASE_QUIZ_MODAL_TESTING);
  const hasReportedPass = useRef(false);
  const modalIsOpen = isOpen || (USE_PHASE_QUIZ_MODAL_TESTING && isTestingOpen);

  // ==========================================
  // Step 1: Manage Modal Visibility State and Completion Propagation
  // ==========================================
  // Dismiss modal overlay and award milestone EXP upon achieving perfect score.
  const handleClose = () => {
    if (
      isSubmitted &&
      score === 10 &&
      !alreadyCompleted &&
      !hasReportedPass.current
    ) {
      hasReportedPass.current = true;
      onPassed(quizData?.expReward || 35);
    }
    setIsTestingOpen(false);
    onClose();
  };

  // --- Quiz State ---
  // Store the selected option by question index.
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // --- Submission State ---
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // ==========================================
  // Step 2: Fetch Quiz Questions from Backend API or Local Fixtures
  // ==========================================
  // Retrieve syllabus questions whenever the user initiates assessment session.
  useEffect(() => {
    if (!modalIsOpen || !hasStarted) {
      if (modalIsOpen) return;
      setQuizData(null);
      setUserAnswers({});
      setCurrentQIndex(0);
      setIsSubmitted(false);
      setScore(0);
      setError(null);
      return;
    }

    // Load local test data without calling the API.
    if (USE_PHASE_QUIZ_MODAL_TESTING || USE_QUIZ_MOCK_DATA) {
      const mock = getMockQuizData({
        phaseIndex,
        phaseTitle,
        locale,
      });
      setQuizData(mock);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function fetchQuiz() {
      try {
        const res = await fetch("/api/page-analysis/roadmaps/phase/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phaseIndex,
            phaseTitle,
            skills,
            courseTopic: phaseDescription,
            targetRole,
            locale,
          }),
        });

        if (!res.ok) {
          throw new Error(t("generate_failed"));
        }

        const data: QuizResponseData = await res.json();
        if (isMounted) {
          setQuizData(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : t("unexpected_error");
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchQuiz();

    return () => {
      isMounted = false;
    };
  }, [modalIsOpen, hasStarted, phaseIndex, phaseTitle, phaseDescription, skills, targetRole, locale, t]);

  if (!modalIsOpen || typeof document === "undefined") return null;

  const questions = quizData?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQIndex];
  const expReward = quizData?.expReward || 35;
  const answeredCount = Object.keys(userAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  // ==========================================
  // Step 3: Handle Answer Selection, Score Evaluation, and Retry Actions
  // ==========================================
  // Record selected choice index for currently displayed assessment question.
  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQIndex]: optionIndex,
    }));
  };

  // Score all answers when the user submits the assessment.
  const handleSubmitQuiz = () => {
    if (!quizData) return;

    let correctCount = 0;
    quizData.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        correctCount += 1;
      }
    });

    setScore(correctCount);
    setIsSubmitted(true);

  };

  // Clear the submitted answers so the user can retry.
  const handleRetry = () => {
    setUserAnswers({});
    setCurrentQIndex(0);
    setIsSubmitted(false);
    setScore(0);
  };

  // ==========================================
  // Step 4: Render Portal Overlay Shell and Modal Navigation Controls
  // ==========================================
  // Render backdrop and modal container into portal root.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
    >
      <div className="relative w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] min-h-0 bg-bg-card/95 border border-border-subtle rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden animate-fade-in-up flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border-subtle bg-bg-secondary/40 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              {phaseTitle}
            </h3>
            {targetRole && (
              <p className="text-xs font-mono text-text-muted mt-0.5">
                {t("target_role")}: <span className="text-text-secondary">{targetRole}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg border-none bg-transparent cursor-pointer transition-colors shrink-0"
            aria-label={t("close_quiz")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ========================================== */}
        {/* Step 5: Render Assessment Lifecycle Views */}
        {/* ========================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* ========================================== */}
          {/* Branch A: Confirmation and Rules Briefing View */}
          {/* ========================================== */}
          {!hasStarted ? (
            <div className="mx-auto flex w-full max-w-xl flex-col items-center py-4 sm:py-10 text-center">
              <div className="mb-3 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
                <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25H7.5A2.25 2.25 0 005.25 7.5v11.25A2.25 2.25 0 007.5 21h9a2.25 2.25 0 002.25-2.25V7.5A2.25 2.25 0 0016.5 5.25H15M9 5.25A2.25 2.25 0 0111.25 3h1.5A2.25 2.25 0 0115 5.25M9 5.25A2.25 2.25 0 0011.25 7.5h1.5A2.25 2.25 0 0015 5.25M9 12h6m-6 4.5h6" />
                </svg>
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                {t(alreadyCompleted ? "retake_start_title" : "confirm_start_title")}
              </h4>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                {t(alreadyCompleted ? "retake_start_description" : "confirm_start_description")}
              </p>

              <div className="mt-5 sm:mt-7 w-fit max-w-full">
                <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border-subtle bg-bg-secondary/50 p-4 text-center">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                      {t("assessment_rule_label")}
                    </span>
                    <div className="mt-2 flex items-baseline justify-center gap-2">
                      <span className="text-3xl font-black font-mono text-text-primary">10/10</span>
                      <span className="text-xs font-semibold text-text-secondary">
                        {t("assessment_rule_value")}
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 text-center ${
                    alreadyCompleted
                      ? "border-border-subtle bg-bg-secondary/50"
                      : "border-emerald-500/25 bg-emerald-500/5"
                  }`}>
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                      alreadyCompleted ? "text-text-muted" : "text-emerald-400"
                    }`}>
                      {t(alreadyCompleted ? "retake_reward_label" : "first_pass_reward_label")}
                    </span>
                    <div className="mt-2 flex items-baseline justify-center gap-2">
                      {alreadyCompleted ? (
                        <span className="text-xl font-black font-mono text-text-secondary">
                          {t("no_additional_exp")}
                        </span>
                      ) : (
                        <>
                          <span className="text-3xl font-black font-mono text-emerald-400">
                            +{expReward}
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">
                            EXP
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHasStarted(true)}
                  className="mt-5 sm:mt-7 w-full rounded-xl bg-accent px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider text-bg-primary shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
                >
                  {t("start_quiz")}
                </button>
                <p className="mt-2 text-xs text-text-muted">
                  {t("quiz_retry_hint")}
                </p>
              </div>
            </div>
          ) : isLoading ? (
            /* ========================================== */
            /* Branch B: Assessment Generation Loading State */
            /* ========================================== */
            <LoadingSpinner
              title={t("evaluating_title")}
              subtitle={t("evaluating_description")}
              showProgressBar={false}
              size="md"
              className="py-16"
            />
          ) : error ? (
            /* ========================================== */
            /* Branch C: Error Notice and Fallback Dialog */
            /* ========================================== */
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-negative/15 text-negative flex items-center justify-center text-xl font-bold">
                ✕
              </div>
              <h4 className="text-sm font-bold text-text-primary">{error}</h4>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-4 py-2 rounded-lg bg-bg-secondary text-xs font-mono border border-border-subtle hover:border-accent text-text-primary cursor-pointer"
              >
                {t("close_try_later")}
              </button>
            </div>
          ) : isSubmitted ? (
            /* ========================================== */
            /* Branch D: Submission Scoring and Rationale Review View */
            /* ========================================== */
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Score Summary Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left ${
                  score === 10
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black font-mono shrink-0 ${
                      score === 10
                        ? "bg-emerald-500 text-bg-primary shadow-[0_0_20px_rgba(0,229,195,0.4)]"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                  >
                    {score}/10
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-text-primary">
                      {score === 10
                        ? t("verified_mastery_title")
                        : t("mastery_not_passed_title")}
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      {score === 10
                        ? alreadyCompleted
                          ? t("already_completed_description")
                          : t("verified_mastery_description", { exp: expReward })
                        : t("mastery_not_passed_description", { score })}
                    </p>
                  </div>
                </div>

                {score < 10 && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 shadow-sm cursor-pointer shrink-0"
                  >
                    {t("retry_assessment")}
                  </button>
                )}
              </div>

              {/* Question Review */}
              <div className="flex flex-col gap-4">
                <h5 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold">
                  {t("question_review")}
                </h5>

                {questions.map((q, qIdx) => {
                  const userChoice = userAnswers[qIdx];
                  const isCorrect = userChoice === q.correctIndex;

                  return (
                    <div
                      key={q.id || qIdx}
                      className={`p-4 rounded-xl border flex flex-col gap-3 ${
                        isCorrect
                          ? "bg-emerald-950/20 border-emerald-500/30"
                          : "bg-rose-950/20 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                              isCorrect ? "bg-emerald-500 text-bg-primary" : "bg-rose-500 text-white"
                            }`}
                          >
                            {isCorrect ? "✓" : "✕"}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-text-primary">
                            {qIdx + 1}. {q.question}
                          </span>
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {q.options.map((opt, optIdx) => {
                          const isOptionCorrect = optIdx === q.correctIndex;
                          const isUserOption = optIdx === userChoice;

                          let badgeStyle = "bg-bg-secondary/60 border-border-subtle text-text-muted";
                          if (isOptionCorrect) {
                            badgeStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold";
                          } else if (isUserOption && !isOptionCorrect) {
                            badgeStyle = "bg-rose-500/20 border-rose-500/50 text-rose-300 line-through";
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${badgeStyle}`}
                            >
                              <span className="font-mono font-bold shrink-0">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Answer Explanation */}
                      <div className="p-3 rounded-lg bg-bg-secondary/70 border border-border-subtle/80 text-xs text-text-secondary leading-relaxed">
                        <span className="font-mono font-bold text-accent text-[11px] block mb-0.5">
                          {t("rationale")}:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 shadow-sm cursor-pointer"
                >
                  {t("exit_quiz")}
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            /* ========================================== */
            /* Branch E: Active Assessment Question Navigation and Answering Controls */
            /* ========================================== */
            <div className="flex flex-col gap-6">
              {/* Question Navigation */}
              <div className="flex min-w-0 items-center gap-8 border-b border-border-subtle pb-2">
                <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pr-2">
                  <div className="flex w-max min-w-full flex-nowrap items-center gap-1.5">
                    {questions.map((_, idx) => {
                      const isAnswered = userAnswers[idx] !== undefined;
                      const isCurrent = idx === currentQIndex;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentQIndex(idx)}
                          className={`h-7 w-7 shrink-0 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                            isCurrent
                              ? "bg-accent text-bg-primary border-accent shadow-[0_0_10px_var(--accent-glow)]"
                              : isAnswered
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-bg-secondary text-text-muted border-border-subtle hover:text-text-primary"
                          }`}
                          aria-label={t("go_to_question", { question: idx + 1 })}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <span className="shrink-0 whitespace-nowrap text-xs font-mono text-text-muted">
                  {t("answered_count", { answered: answeredCount, total: totalQuestions })}
                </span>
              </div>

              {/* Current Question Block */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase text-accent font-bold tracking-wider">
                    {t("question_progress", {
                      current: currentQIndex + 1,
                      total: totalQuestions,
                    })}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-text-primary leading-snug">
                  {currentQuestion.question}
                </h4>

                {/* Answer Options */}
                <div className="flex flex-col gap-2.5 mt-2">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = userAnswers[currentQIndex] === optIdx;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? "bg-accent/15 border-accent text-text-primary shadow-[0_0_15px_var(--accent-glow)]"
                            : "bg-bg-secondary/60 hover:bg-bg-secondary border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-accent"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? "bg-accent text-bg-primary"
                              : "bg-bg-card border border-border-subtle text-text-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-xs sm:text-sm font-medium leading-relaxed">
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Navigation Controls */}
        {!isLoading && !isSubmitted && totalQuestions > 0 && (
          <div className="p-4 sm:p-5 border-t border-border-subtle bg-bg-secondary/30 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl bg-bg-secondary hover:bg-bg-card border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {t("previous")}
            </button>

            <div className="flex items-center gap-2">
              {currentQIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent text-xs font-mono text-text-primary cursor-pointer transition-colors"
                >
                  {t("next_question")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isAllAnswered}
                  onClick={handleSubmitQuiz}
                  className={`px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border-none transition-all cursor-pointer ${
                    isAllAnswered
                      ? "bg-accent text-bg-primary hover:opacity-90 shadow-[0_0_15px_var(--accent-glow)]"
                      : "bg-bg-secondary text-text-muted border border-border-subtle opacity-50 cursor-not-allowed"
                  }`}
                >
                  {t("submit_verify")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
