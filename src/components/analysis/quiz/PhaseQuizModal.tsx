"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { USE_QUIZ_MOCK_DATA, getMockQuizData } from "@/constants/quiz";

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

interface PhaseQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  phaseIndex: number;
  phaseTitle: string;
  phaseDescription?: string;
  skills: string[];
  targetRole?: string;
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
  onPassed,
}: PhaseQuizModalProps) {
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizResponseData | null>(null);

  // Selected options: key is question index (0..9), value is option index (0..3)
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Submission results
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Fetch quiz when modal opens (or load Next.js mock data if USE_QUIZ_MOCK_DATA is true)
  useEffect(() => {
    if (!isOpen) {
      setQuizData(null);
      setUserAnswers({});
      setCurrentQIndex(0);
      setIsSubmitted(false);
      setScore(0);
      setError(null);
      return;
    }

    // When constant USE_QUIZ_MOCK_DATA is true, load local mock data directly without calling backend API
    if (USE_QUIZ_MOCK_DATA) {
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
        const res = await fetch("/api/analysis/phase-quiz", {
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
          throw new Error("Failed to generate quiz. Please retry.");
        }

        const data: QuizResponseData = await res.json();
        if (isMounted) {
          setQuizData(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Error generating quiz";
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
  }, [isOpen, phaseIndex, phaseTitle, phaseDescription, skills, targetRole, locale]);

  if (!isOpen) return null;

  const questions = quizData?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQIndex];
  const expReward = quizData?.expReward || 35;
  const answeredCount = Object.keys(userAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  // Handle selecting an answer
  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentQIndex]: optionIndex,
    }));
  };

  // Evaluate quiz on submit
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

    // If 10/10 passed, trigger onPassed
    if (correctCount === 10) {
      setTimeout(() => {
        onPassed(expReward);
        onClose();
      }, 1600);
    }
  };

  // Reset quiz for retrying
  const handleRetry = () => {
    setUserAnswers({});
    setCurrentQIndex(0);
    setIsSubmitted(false);
    setScore(0);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-bg-card border border-border-subtle rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border-subtle bg-bg-secondary/40 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30">
                Phase {phaseIndex} Mastery Exam
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ⚡ +{expReward} EXP Bounty
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                (Strict 10/10 Mastery Gate)
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              {phaseTitle}
            </h3>
            {targetRole && (
              <p className="text-xs font-mono text-text-muted mt-0.5">
                Target Role: <span className="text-text-secondary">{targetRole}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
            aria-label="Close Quiz"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
                <div className="w-14 h-14 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-text-primary">
                  Gemini Evaluating Skill Competencies...
                </h4>
                <p className="text-xs text-text-muted mt-1 max-w-md">
                  Synthesizing 10 targeted multiple-choice challenges based on your planned learning objectives and evaluating modular EXP difficulty.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-negative/15 text-negative flex items-center justify-center text-xl font-bold">
                ✕
              </div>
              <h4 className="text-sm font-bold text-text-primary">{error}</h4>
              <button
                type="button"
                onClick={() => onClose()}
                className="mt-2 px-4 py-2 rounded-lg bg-bg-secondary text-xs font-mono border border-border-subtle hover:border-accent text-text-primary cursor-pointer"
              >
                Close & Try Later
              </button>
            </div>
          ) : isSubmitted ? (
            /* Results & Review View */
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
                        ? "Verified Skill Mastery! 10/10 Perfect Score"
                        : "Mastery Gate Not Passed (10/10 Required)"}
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      {score === 10
                        ? `Congratulations! You mastered this milestone. Awarding +${expReward} EXP now...`
                        : `You scored ${score} out of 10. Every challenge must be answered correctly to certify this skill.`}
                    </p>
                  </div>
                </div>

                {score < 10 && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-5 py-2.5 rounded-xl bg-accent text-bg-primary text-xs font-mono font-bold uppercase tracking-wider hover:opacity-90 shadow-sm cursor-pointer shrink-0"
                  >
                    Retry Assessment
                  </button>
                )}
              </div>

              {/* Review All 10 Questions with Gemini Explanations */}
              <div className="flex flex-col gap-4">
                <h5 className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold">
                  Question Review & Technical Rationales
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

                      {/* AI Technical Explanation */}
                      <div className="p-3 rounded-lg bg-bg-secondary/70 border border-border-subtle/80 text-xs text-text-secondary leading-relaxed">
                        <span className="font-mono font-bold text-accent text-[11px] block mb-0.5">
                          RATIONALE:
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : currentQuestion ? (
            /* Active Interactive Question View */
            <div className="flex flex-col gap-6">
              {/* Question Navigation Stepper Pills (1..10) */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-border-subtle">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {questions.map((_, idx) => {
                    const isAnswered = userAnswers[idx] !== undefined;
                    const isCurrent = idx === currentQIndex;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                          isCurrent
                            ? "bg-accent text-bg-primary border-accent shadow-[0_0_10px_var(--accent-glow)]"
                            : isAnswered
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "bg-bg-secondary text-text-muted border-border-subtle hover:text-text-primary"
                        }`}
                        aria-label={`Go to question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs font-mono text-text-muted shrink-0">
                  {answeredCount} / {totalQuestions} Answered
                </span>
              </div>

              {/* Current Question Block */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase text-accent font-bold tracking-wider">
                    Question {currentQIndex + 1} of {totalQuestions}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-text-primary leading-snug">
                  {currentQuestion.question}
                </h4>

                {/* 4 Interactive Option Cards */}
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

        {/* Modal Footer Controls */}
        {!isLoading && !isSubmitted && totalQuestions > 0 && (
          <div className="p-4 sm:p-5 border-t border-border-subtle bg-bg-secondary/30 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2 rounded-xl bg-bg-secondary hover:bg-bg-card border border-border-subtle text-xs font-mono text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              {currentQIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                  className="px-5 py-2 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-accent text-xs font-mono text-text-primary cursor-pointer transition-colors"
                >
                  Next Question →
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
                  Submit & Verify Mastery
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
