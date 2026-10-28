"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "next-intl";
import { useChatbot } from "@/context/chatbot/ChatbotContext";
import FloatingBall from "./FloatingBall";
import ChatbotModal from "./ChatbotModal";

/**
 * Main Chatbot Orchestration Component
 *
 * Coordinates state distribution across the draggable floating circular trigger and conversational dialog window.
 * Enforces highest layer stacking priority (z-999999) to guarantee visibility above all platform views.
 * Connects directly to ChatbotContext to support programmatic message dispatch, tool execution, and page routing.
 * Adapts layout responsively for mobile screens by anchoring the chat sheet to the bottom and hiding the floating ball while open.
 *
 * Component Requirements:
 * - Top Priority Stacking: Renders inside viewport container with maximum z-index.
 * - Context Integration: Consumes shared ChatbotContext for universal agent interactivity.
 * - Draggable Mobility: Allows floating ball trigger and desktop chat dialog to be repositioned independently.
 * - Mobile Responsiveness: Anchors dialog to the bottom viewport on mobile screens and hides the floating ball while open.
 *
 * Workflow:
 * 1. Initialize conversational state, responsive viewport detection, and action controls.
 * 2. Calculate initial resting coordinates for draggable floating trigger at bottom-right viewport.
 * 3. Restrict floating ball coordinates within viewport boundary limits.
 * 4. Coordinate mouse and touch drag lifecycle handlers with distance threshold detection.
 * 5. Bind window-level event listeners during active floating ball dragging gestures.
 * 6. Mount high-priority fixed overlay container holding modal dialog and conditional mobile trigger.
 */
export default function Chatbot() {
  const locale = useLocale();

  // ==========================================
  // Step 1: Initialize Conversational State, Responsive Viewport Detection, and Action Controls
  // ==========================================
  // Ingest global conversational state and action controls from ChatbotContext.
  const {
    isOpen,
    toggleChatbot,
    closeChatbot,
    messages,
    isTyping,
    inputValue,
    setInputValue,
    sendMessage,
    resetConversation,
  } = useChatbot();

  // Coordinates tracking floating ball position in screen pixels.
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Track responsive viewport state to distinguish mobile screens from desktops.
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // References for tracking drag translation vectors and distance thresholds.
  const dragStartRef = useRef<{ x: number; y: number; mouseX: number; mouseY: number }>({
    x: 0,
    y: 0,
    mouseX: 0,
    mouseY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  // Detect mobile viewport breakpoint on client mount and resize.
  useEffect(() => {
    function checkViewport() {
      setIsMobile(window.innerWidth < 640);
    }

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // ==========================================
  // Step 2: Calculate Initial Resting Coordinates for Draggable Floating Trigger at Bottom-Right Viewport
  // ==========================================
  // Position the floating action button at the bottom-right corner of the browser viewport.
  useEffect(() => {
    function initPosition() {
      const ballSize = 56;
      const margin = 24;
      const initialX = Math.max(margin, window.innerWidth - ballSize - margin);
      const initialY = Math.max(margin, window.innerHeight - ballSize - margin);
      setPosition({ x: initialX, y: initialY });
    }

    initPosition();
    window.addEventListener("resize", initPosition);
    return () => window.removeEventListener("resize", initPosition);
  }, []);

  // ==========================================
  // Step 3: Restrict Floating Ball Coordinates Within Viewport Boundary Limits
  // ==========================================
  // Restrict drag translation coordinates within visible screen borders with safe boundary padding.
  const clampPosition = useCallback((x: number, y: number) => {
    const ballSize = 56;
    const padding = 12;
    const minX = padding;
    const maxX = Math.max(minX, window.innerWidth - ballSize - padding);
    const minY = padding;
    const maxY = Math.max(minY, window.innerHeight - ballSize - padding);

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  // ==========================================
  // Step 4: Coordinate Mouse and Touch Drag Lifecycle Handlers with Distance Threshold Detection
  // ==========================================
  // Capture initial cursor down event and register baseline translation vectors.
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!position) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: position.x,
      y: position.y,
      mouseX: clientX,
      mouseY: clientY,
    };
  };

  // Update position while translating and distinguish movements from clicks.
  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;

      // Mark as drag operation if cursor displacement exceeds five pixels.
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMovedRef.current = true;
      }

      const nextX = dragStartRef.current.x + dx;
      const nextY = dragStartRef.current.y + dy;
      setPosition(clampPosition(nextX, nextY));
    },
    [isDragging, clampPosition]
  );

  // Terminate active dragging gesture on pointer release.
  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
  }, [isDragging]);

  // Toggle chat modal visibility if floating ball was clicked without dragging.
  const handleBallClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    toggleChatbot();
  };

  // ==========================================
  // Step 5: Bind Window-Level Event Listeners During Active Floating Ball Dragging Gestures
  // ==========================================
  // Bind global window event listeners during active drag state.
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handlePointerUp();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      handlePointerUp();
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
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // ==========================================
  // Branch A: Pre-Hydration Coordinates Fallback
  // ==========================================
  // Return early if initial viewport position is not yet computed.
  if (!position) return null;

  // ==========================================
  // Step 6: Mount High-Priority Fixed Overlay Container Holding Modal Dialog and Conditional Mobile Trigger
  // ==========================================
  return (
    <div className="pointer-events-none fixed inset-0 z-999999 overflow-visible">
      {/* Interactive Draggable Chat Window Modal */}
      <ChatbotModal
        isOpen={isOpen}
        onClose={closeChatbot}
        onReset={resetConversation}
        messages={messages}
        isTyping={isTyping}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={sendMessage}
        ballPosition={position}
        locale={locale}
        isMobile={isMobile}
      />

      {/* Persistent Draggable Floating Action Button */}
      {/* Hide the floating ball whenever the chat modal dialog is open */}
      {!isOpen && (
        <FloatingBall
          position={position}
          isDragging={isDragging}
          isOpen={isOpen}
          isThinking={isTyping}
          onPointerDown={handlePointerDown}
          onClick={handleBallClick}
        />
      )}
    </div>
  );
}
