"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/Logo";
import { getSuggestedQuestions } from "./SuggestedQuestion";

// ==========================================
// Component Contracts and Message Types
// ==========================================

// Message payload contract for individual conversational turns.
export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

// Properties interface for ChatbotModal component.
export interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSendMessage: (text?: string) => void;
  ballPosition: { x: number; y: number } | null;
  locale?: string;
  isMobile?: boolean;
}

/**
 * Chatbot Modal Dialog Component
 *
 * Provides a responsive conversational overlay dialog with real-time thinking states,
 * desktop header drag mobility, mobile bottom sheet height resizing, and preset suggestion chips.
 *
 * Component Requirements:
 * - Brand Alignment: Mounts official SkillVerse Logo emblem without artificial bounding frames.
 * - Draggable Window: Allows users to freely move the chat dialog across screen boundaries on desktop viewports.
 * - Mobile Sheet Resize: Allows users to slide the top horizontal bar to adjust coverage height on mobile screens.
 * - Minimum Content Visibility: Guarantees that resizing never cuts off the last conversational message.
 * - Thinking Lifecycle: Displays a lightweight animated thinking indicator with cycling dots.
 * - Design Uniformity: Implements vertical dividers between secondary actions mirroring platform modal overlays.
 * - Internationalization: Ingests all text directly from messages translation catalogs.
 *
 * Workflow:
 * 1. Initialize resting coordinates anchored relative to the floating ball.
 * 2. Bind window-level event listeners for desktop drag and mobile height resize gestures.
 * 3. Animate cyclical thinking dots during active message processing.
 * 4. Synchronize auto-scrolling to the latest message in the conversation viewport.
 * 5. Render responsive dialog header with mobile pull handle, brand title, and dismissal controls.
 * 6. Render conversational message stream, message bubbles, and thinking indicator.
 * 7. Render preset suggestion chips for quick prompt execution.
 * 8. Render input field, submission button, and brand footer attribution.
 */
export default function ChatbotModal({
  isOpen,
  onClose,
  onReset,
  messages,
  isTyping,
  inputValue,
  onInputChange,
  onSendMessage,
  ballPosition,
  locale = "en",
  isMobile = false,
}: ChatbotModalProps) {
  // Ingest localized labels directly from messages translation catalog.
  const t = useTranslations("chatbot");

  // DOM node references for dimension measurements and scroll tracking.
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Modal drag translation position state in screen pixels on desktop.
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingModal, setIsDraggingModal] = useState<boolean>(false);

  // References for tracking desktop modal drag gestures.
  const modalDragStartRef = useRef<{ x: number; y: number; mouseX: number; mouseY: number }>({
    x: 0,
    y: 0,
    mouseX: 0,
    mouseY: 0,
  });

  // Mobile bottom sheet height adjustment states in pixels.
  const [mobileHeight, setMobileHeight] = useState<number | null>(null);
  const [isDraggingHeight, setIsDraggingHeight] = useState<boolean>(false);
  const heightDragStartRef = useRef<{ startY: number; startHeight: number }>({
    startY: 0,
    startHeight: 0,
  });

  // Track cyclical dot count for the simple thinking animation.
  const [dotCount, setDotCount] = useState<number>(1);

  // Retrieve localized prompt suggestions for active language.
  const suggestedQuestions = getSuggestedQuestions(locale);

  // Restrict modal dialog drag coordinates within visible screen limits on desktop.
  const clampModalPosition = useCallback((x: number, y: number) => {
    const chatWidth = 380;
    const chatHeight = 540;
    const padding = 16;

    const minX = padding;
    const maxX = Math.max(minX, window.innerWidth - chatWidth - padding);
    const minY = padding;
    const maxY = Math.max(minY, window.innerHeight - chatHeight - padding);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  // Dynamically calculate the minimum mobile sheet height ensuring the last message is fully visible.
  const calculateMinHeight = useCallback(() => {
    if (typeof window === "undefined") return 260;

    const headerH = headerRef.current?.offsetHeight || 56;
    const chipsH = chipsRef.current?.offsetHeight || 38;
    const inputH = inputContainerRef.current?.offsetHeight || 58;
    const footerH = footerRef.current?.offsetHeight || 22;
    const lastMsgH = lastMessageRef.current?.offsetHeight || 64;

    // Calculate total height needed: header + chips + input + footer + last message + padding buffer.
    const requiredHeight = headerH + chipsH + inputH + footerH + lastMsgH + 20;
    const screenMaxClamp = window.innerHeight * 0.85;
    const baselineMin = 220;

    return Math.max(baselineMin, Math.min(requiredHeight, screenMaxClamp));
  }, []);

  // ==========================================
  // Step 1: Initialize Resting Coordinates Anchored Relative to Floating Ball
  // ==========================================
  // Set initial floating dialog position anchored near bottom-right when dialog first mounts on desktop.
  useEffect(() => {
    if (typeof window === "undefined" || isMobile) return;

    const chatWidth = 380;
    const chatHeight = 540;
    const padding = 16;

    const initialLeft = ballPosition
      ? Math.max(padding, Math.min(window.innerWidth - chatWidth - padding, ballPosition.x - chatWidth + 56))
      : Math.max(padding, window.innerWidth - chatWidth - 24);

    const initialTop = ballPosition
      ? Math.max(padding, Math.min(window.innerHeight - chatHeight - padding, ballPosition.y - chatHeight - 14))
      : Math.max(padding, window.innerHeight - chatHeight - 24);

    setModalPosition({ x: initialLeft, y: initialTop });
  }, [ballPosition, isMobile]);

  // Set initial default height for mobile bottom sheet on mount.
  useEffect(() => {
    if (typeof window === "undefined" || !isMobile) return;
    if (mobileHeight === null) {
      setMobileHeight(Math.round(window.innerHeight * 0.72));
    }
  }, [isMobile, mobileHeight]);

  // Ensure mobile height never falls below minimum threshold when new messages arrive.
  useEffect(() => {
    if (!isMobile || mobileHeight === null) return;
    const minH = calculateMinHeight();
    if (mobileHeight < minH) {
      setMobileHeight(minH);
    }
  }, [messages, isMobile, mobileHeight, calculateMinHeight]);

  // ==========================================
  // Step 2: Bind Window-Level Event Listeners for Desktop Drag and Mobile Height Resize Gestures
  // ==========================================
  // Start dragging modal window when clicking or touching the desktop header bar.
  const handleHeaderPointerDown = (clientX: number, clientY: number, target: EventTarget) => {
    if (isMobile) return;

    if ((target as HTMLElement).closest("button, input, a")) {
      return;
    }

    if (!modalPosition) return;
    setIsDraggingModal(true);
    modalDragStartRef.current = {
      x: modalPosition.x,
      y: modalPosition.y,
      mouseX: clientX,
      mouseY: clientY,
    };
  };

  // Move desktop modal dialog position during active drag gesture.
  const handleHeaderPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingModal || isMobile) return;
      const dx = clientX - modalDragStartRef.current.mouseX;
      const dy = clientY - modalDragStartRef.current.mouseY;

      const nextX = modalDragStartRef.current.x + dx;
      const nextY = modalDragStartRef.current.y + dy;
      setModalPosition(clampModalPosition(nextX, nextY));
    },
    [isDraggingModal, isMobile, clampModalPosition]
  );

  // Finish desktop modal drag gesture on pointer release.
  const handleHeaderPointerUp = useCallback(() => {
    if (!isDraggingModal) return;
    setIsDraggingModal(false);
  }, [isDraggingModal]);

  // Start adjusting mobile bottom sheet height when touching top pull bar.
  const handlePullPointerDown = (clientY: number) => {
    if (!isMobile || typeof window === "undefined") return;
    const currentH =
      modalContainerRef.current?.offsetHeight || mobileHeight || Math.round(window.innerHeight * 0.72);
    heightDragStartRef.current = {
      startY: clientY,
      startHeight: currentH,
    };
    setIsDraggingHeight(true);
  };

  // Adjust mobile sheet height dynamically as finger slides vertically.
  const handlePullPointerMove = useCallback(
    (clientY: number) => {
      if (!isDraggingHeight || !isMobile || typeof window === "undefined") return;
      const dy = clientY - heightDragStartRef.current.startY;
      const candidateHeight = heightDragStartRef.current.startHeight - dy;

      const minH = calculateMinHeight();
      const maxH = Math.round(window.innerHeight * 0.92);

      const clampedHeight = Math.max(minH, Math.min(candidateHeight, maxH));
      setMobileHeight(clampedHeight);
    },
    [isDraggingHeight, isMobile, calculateMinHeight]
  );

  // Finish mobile height adjustment on touch release.
  const handlePullPointerUp = useCallback(() => {
    if (!isDraggingHeight) return;
    setIsDraggingHeight(false);
  }, [isDraggingHeight]);

  // Bind window-level event listeners for desktop drag operations.
  useEffect(() => {
    if (!isDraggingModal || isMobile) return;

    const onMouseMove = (e: MouseEvent) => {
      handleHeaderPointerMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleHeaderPointerUp();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleHeaderPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      handleHeaderPointerUp();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDraggingModal, isMobile, handleHeaderPointerMove, handleHeaderPointerUp]);

  // Bind window-level event listeners for mobile sheet height resizing.
  useEffect(() => {
    if (!isDraggingHeight || !isMobile) return;

    const onMouseMove = (e: MouseEvent) => {
      handlePullPointerMove(e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePullPointerMove(e.touches[0].clientY);
      }
    };

    const onEnd = () => {
      handlePullPointerUp();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [isDraggingHeight, isMobile, handlePullPointerMove, handlePullPointerUp]);

  // ==========================================
  // Step 3: Animate Cyclical Thinking Dots During Active Message Processing
  // ==========================================
  // Cycle dot count between one, two, and three dots while message requests are active.
  useEffect(() => {
    if (!isTyping) {
      setDotCount(1);
      return;
    }

    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);

    return () => clearInterval(interval);
  }, [isTyping]);

  // Compute animated dots string.
  const thinkingDots = ".".repeat(dotCount);

  // ==========================================
  // Step 4: Synchronize Auto-Scrolling to the Latest Message in the Conversation Viewport
  // ==========================================
  // Automatically scroll conversation viewport into view when messages change or height adjusts.
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isDraggingHeight ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages, isTyping, isOpen, mobileHeight, isDraggingHeight]);

  // Dispatch message when Enter key is pressed without Shift modifier.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  // ==========================================
  // Branch A: Dormant Closed Modal State
  // ==========================================
  // Skip rendering tree if dialog is closed.
  if (!isOpen) return null;

  // Build inline style for positioned modal dialog on desktop or bottom sheet on mobile.
  const modalStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: mobileHeight ? `${mobileHeight}px` : "72vh",
        maxHeight: "92vh",
        transition: isDraggingHeight ? "none" : "height 0.22s ease-out",
      }
    : modalPosition
    ? {
        position: "fixed",
        left: `${modalPosition.x}px`,
        top: `${modalPosition.y}px`,
        width: "380px",
        maxHeight: "85vh",
      }
    : {
        position: "fixed",
        right: "24px",
        bottom: "88px",
        width: "380px",
        maxHeight: "85vh",
      };

  return (
    <div
      ref={modalContainerRef}
      style={modalStyle}
      className={`pointer-events-auto flex flex-col bg-bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-text-primary ${
        isMobile
          ? "w-full rounded-t-2xl rounded-b-none border-t border-border-subtle"
          : "h-135 w-95 rounded-2xl border border-border-subtle transition-all duration-300"
      } ${isDraggingModal && !isMobile ? "shadow-[0_25px_60px_rgba(0,0,0,0.85)] scale-[1.01]" : ""}`}
    >
      {/* ========================================== */}
      {/* Step 5: Render Responsive Dialog Header with Mobile Pull Handle, Brand Title, and Dismissal Controls */}
      {/* ========================================== */}
      <div
        ref={headerRef}
        onMouseDown={(e) => {
          handleHeaderPointerDown(e.clientX, e.clientY, e.target);
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handleHeaderPointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
          }
        }}
        className={`relative flex items-center justify-between px-4 py-3.5 border-b border-border-subtle bg-bg-elevated/70 select-none ${
          isMobile ? "cursor-default pt-5" : "cursor-grab active:cursor-grabbing"
        }`}
        title={isMobile ? undefined : "Drag to reposition window"}
      >
        {/* Mobile Height Resize Pull Bar Handle */}
        {isMobile && (
          <div
            role="slider"
            aria-label="Adjust chatbox height"
            aria-valuemin={calculateMinHeight()}
            aria-valuemax={typeof window !== "undefined" ? Math.round(window.innerHeight * 0.92) : 800}
            aria-valuenow={mobileHeight || 500}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePullPointerDown(e.clientY);
            }}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handlePullPointerDown(e.touches[0].clientY);
              }
            }}
            className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-row-resize touch-none z-30 select-none"
          >
            <div
              className={`w-12 h-1.5 rounded-full transition-colors duration-150 ${
                isDraggingHeight
                  ? "bg-accent shadow-sm"
                  : "bg-border-subtle hover:bg-text-muted/40"
              }`}
            />
          </div>
        )}

        {/* Brand Logo Presentation without Artificial Frame Wrapping */}
        <div className="flex flex-col pointer-events-none">
          <Logo size="sm" text={t("header.title")} />
          <span className="text-[10px] text-text-muted leading-none mt-1 ml-7.5">
            {t("header.subtitle")}
          </span>
        </div>

        {/* Secondary Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Conversation History Reset Button */}
          <button
            type="button"
            onClick={onReset}
            title={t("header.reset_title")}
            aria-label={t("header.reset_title")}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-card-hover border border-transparent hover:border-border-subtle cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Action Divider Separator Mirroring Platform Modal Overlays */}
          <div className="h-4 w-px bg-border-subtle" />

          {/* Dialog Dismissal Button */}
          <button
            type="button"
            onClick={onClose}
            title={t("header.close_title")}
            aria-label={t("header.close_title")}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-card-hover border border-transparent hover:border-border-subtle cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* Step 6: Render Conversational Message Stream, Message Bubbles, and Thinking Indicator */}
      {/* ========================================== */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 scrollbar-thin scrollbar-thumb-border-subtle">
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          return (
            <div
              key={msg.id}
              ref={isLastMessage ? lastMessageRef : undefined}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              {/* Branch A: User Query Bubble */}
              {msg.sender === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-xs px-3.5 py-2.5 text-xs leading-relaxed shadow-sm bg-accent text-bg-primary font-medium">
                  {msg.text}
                </div>
              ) : (
                /* Branch B: Assistant Response Bubble */
                <div className="max-w-[85%] rounded-2xl rounded-bl-xs px-3.5 py-2.5 text-xs leading-relaxed shadow-sm bg-bg-elevated border border-border-subtle text-text-primary">
                  {msg.text}
                </div>
              )}
              <span className="mt-1 px-1 text-[9px] text-text-muted">{msg.timestamp}</span>
            </div>
          );
        })}

        {/* Lightweight Thinking Indicator */}
        {isTyping && (
          <div className="flex items-center px-1 py-1 text-xs text-text-muted animate-fade-in select-none">
            <span>
              {t("messages.thinking")}
              {thinkingDots}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ========================================== */}
      {/* Step 7: Render Preset Suggestion Chips for Quick Prompt Execution */}
      {/* ========================================== */}
      <div
        ref={chipsRef}
        className="px-3 py-2 border-t border-border-subtle bg-bg-secondary/40 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5"
      >
        {suggestedQuestions.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(prompt)}
            className="shrink-0 px-2.5 py-1 text-[10px] font-medium rounded-full bg-bg-elevated hover:bg-bg-card-hover border border-border-subtle text-text-secondary hover:text-accent transition-all cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* Step 8: Render Input Field, Submission Button, and Brand Footer Attribution */}
      {/* ========================================== */}
      <div
        ref={inputContainerRef}
        className="p-3 border-t border-border-subtle bg-bg-elevated/50 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("input.placeholder")}
          className="flex-1 bg-bg-secondary text-text-primary text-xs rounded-xl px-3.5 py-2.5 border border-border-subtle focus:outline-none focus:border-accent/60 placeholder:text-text-muted"
        />
        <button
          type="button"
          onClick={() => onSendMessage()}
          disabled={!inputValue.trim()}
          aria-label={t("input.send_aria")}
          className="p-2.5 rounded-xl bg-accent text-bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

      {/* Brand Footer Attribution */}
      <div
        ref={footerRef}
        className="py-1 px-3 bg-bg-secondary/60 text-center border-t border-border-subtle/50 text-[9px] text-text-muted select-none"
      >
        {t("footer.note")}
      </div>
    </div>
  );
}
