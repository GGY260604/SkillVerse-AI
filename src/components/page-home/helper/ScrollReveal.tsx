"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Component Properties Specification
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
}

/**
 * ScrollReveal Component
 * Defer visual presentation and trigger entrance animation only when component enters viewport.
 *
 * Component Requirements:
 * - Viewport intersection observation: Observe element visibility via IntersectionObserver API.
 * - Progressive fallback: Display element immediately if browser lacks IntersectionObserver support.
 *
 * Workflow:
 * 1. Check browser IntersectionObserver API support with instantaneous fallback.
 * 2. Configure intersection observer with customizable threshold and rootMargin.
 * 3. Handle visibility state transitions with optional delay timer.
 * 4. Render wrapped animated container with smooth CSS transforms.
 */
export default function ScrollReveal({
  children,
  className = "",
  threshold = 0.05,
  rootMargin = "0px 0px -40px 0px",
  delayMs = 0,
}: ScrollRevealProps) {
  // ==========================================
  // Step 1: Initialize Visibility and Container State
  // ==========================================
  // Track viewport intersection state and link container DOM node.
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // ==========================================
    // Branch A: Unsupported Browser Fallback
    // ==========================================
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const target = containerRef.current;
    if (!target) return;

    // ==========================================
    // Step 2: Configure Intersection Observer
    // ==========================================
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // ==========================================
            // Step 3: Handle Visibility State Transitions with Optional Delay
            // ==========================================

            // ==========================================
            // Branch B: Delayed Reveal Animation
            // ==========================================
            if (delayMs > 0) {
              const timer = setTimeout(() => {
                setIsVisible(true);
              }, delayMs);
              observer.unobserve(entry.target);
              return () => clearTimeout(timer);
            } else {
              // ==========================================
              // Branch C: Instantaneous Reveal Animation
              // ==========================================
              setIsVisible(true);
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(target);

    // Clean up observer on component unmount.
    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, delayMs]);

  // ==========================================
  // Step 4: Render Wrapped Animated Container
  // ==========================================
  return (
    <div
      ref={containerRef}
      className={`transform transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8 pointer-events-none"
      } ${className}`}
    >
      {children}
    </div>
  );
}
