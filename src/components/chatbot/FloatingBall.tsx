"use client";

import React, { useRef, useId } from "react";
import { useTranslations } from "next-intl";

// ==========================================
// Component Contracts and Property Types
// ==========================================

// Properties interface for the FloatingBall trigger component.
export interface FloatingBallProps {
  position: { x: number; y: number };
  isDragging: boolean;
  isOpen: boolean;
  isThinking?: boolean;
  onPointerDown: (clientX: number, clientY: number) => void;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * Floating Ball Component
 *
 * Provides a persistent draggable circular trigger button positioned above all application viewports.
 * Enables opening and closing the SkillVerse AI Agent chat dialog with touch and mouse dragging support.
 * Displays a slender rotating loading orbit ring and dynamic gradient body transitions when AI is thinking.
 *
 * Component Requirements:
 * - Top Priority Stacking: Operates seamlessly within high z-index overlay containers.
 * - Interaction Discrimination: Distinguishes between drag translation gestures and click toggle events.
 * - Thinking Color Palette: References SkillTrendCheck's signature teal and indigo chromatic gradient tokens.
 * - Slender Loading Orbit: Displays an elegant, thin rotating loading spinner arc around the ball circumference.
 * - Internationalization: Ingests tooltip strings directly from messages translation catalog.
 *
 * Workflow:
 * 1. Initialize localized tooltip labels, unique gradient identifiers, and container references.
 * 2. Render draggable circular trigger with pointer drag handlers.
 * 3. Render slender rotating loading orbit ring around the ball.
 * 4. Render elevated ball surface with dynamic gradient transitions and state icons.
 * 5. Render localized hover tooltip badge.
 */
export default function FloatingBall({
  position,
  isDragging,
  isOpen,
  isThinking = false,
  onPointerDown,
  onClick,
}: FloatingBallProps) {
  // ==========================================
  // Step 1: Initialize Localized Tooltip Labels, Unique Gradient Identifiers, and Container References
  // ==========================================
  // Ingest localized tooltips directly from messages translation catalog.
  const t = useTranslations("chatbot.ball");

  // Generate unique gradient identifier to prevent SVG definition collisions.
  const gradientId = useId();
  const orbitGradId = `thinking-orbit-${gradientId.replace(/:/g, "")}`;

  // Reference for measuring and binding the floating ball DOM node.
  const ballRef = useRef<HTMLDivElement | null>(null);

  // Active tooltip string resolving to thinking label when query processing is underway.
  const activeTooltip = isThinking ? t("thinking_tooltip") : t("tooltip");

  // ==========================================
  // Step 2: Render Draggable Circular Trigger with Pointer Drag Handlers
  // ==========================================
  return (
    <div
      ref={ballRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: "none",
      }}
      onMouseDown={(e) => {
        // Prevent default browser text selection while initiating drag gestures.
        e.preventDefault();
        onPointerDown(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        // Capture initial touch coordinates for mobile gesture translation.
        if (e.touches.length > 0) {
          onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onClick={onClick}
      className={`pointer-events-auto group relative flex items-center justify-center w-14 h-14 rounded-full cursor-grab active:cursor-grabbing select-none transition-transform duration-150 ${
        isDragging ? "scale-105 shadow-2xl" : "hover:scale-105 active:scale-95"
      }`}
      title={activeTooltip}
      aria-label={activeTooltip}
    >
      {/* ========================================== */}
      {/* Step 3: Render Slender Rotating Loading Orbit Ring Around the Ball */}
      {/* ========================================== */}
      {/* Display a slender rotating loading spinner arc around the ball when thinking is active. */}
      {isThinking && (
        <div className="absolute -inset-1.5 pointer-events-none">
          <svg
            className="w-full h-full animate-spin [animation-duration:1.4s]"
            viewBox="0 0 68 68"
            fill="none"
          >
            <defs>
              <linearGradient id={orbitGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e5c3" />
                <stop offset="55%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Subtle Circular Orbit Track */}
            <circle
              cx="34"
              cy="34"
              r="31"
              stroke="rgba(99, 102, 241, 0.18)"
              strokeWidth="1"
            />

            {/* Slender Rotating Loading Arc */}
            <circle
              cx="34"
              cy="34"
              r="31"
              stroke={`url(#${orbitGradId})`}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="115 80"
              className="drop-shadow-[0_0_4px_rgba(0,229,195,0.5)]"
            />
          </svg>
        </div>
      )}

      {/* ========================================== */}
      {/* Step 4: Render Elevated Ball Surface with Dynamic Gradient Transitions and State Icons */}
      {/* ========================================== */}
      <div
        className={`relative w-full h-full rounded-full shadow-lg flex items-center justify-center overflow-hidden backdrop-blur-md transition-all duration-300 ${
          isThinking
            ? "bg-linear-to-br from-indigo-950/85 via-bg-elevated to-teal-950/75 border border-indigo-500/30 shadow-[0_0_16px_rgba(99,102,241,0.25)]"
            : "bg-bg-elevated/95 border border-border-subtle hover:border-accent/50"
        }`}
      >
        {/* Shifting Gradient Background Layer Inside Ball Body */}
        {isThinking && (
          <div className="absolute inset-0 rounded-full bg-linear-to-tr from-accent/20 via-indigo-500/25 to-teal-400/20 animate-pulse pointer-events-none" />
        )}

        {/* Toggle Icon: Close (X) when dialog is open, Chat icon when dialog is closed */}
        {isOpen ? (
          <svg
            className="relative z-10 w-5 h-5 text-text-primary transition-transform duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className={`relative z-10 w-6 h-6 transition-all duration-200 ${
              isThinking
                ? "text-accent drop-shadow-[0_0_6px_rgba(0,229,195,0.7)] scale-105"
                : "text-accent group-hover:scale-105"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </div>

      {/* ========================================== */}
      {/* Step 5: Render Localized Hover Tooltip Badge */}
      {/* ========================================== */}
      {!isDragging && (
        <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-bg-elevated/95 border border-border-subtle text-text-primary text-[11px] font-medium whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {activeTooltip}
        </div>
      )}
    </div>
  );
}
