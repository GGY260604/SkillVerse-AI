"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// --- Properties Schema ---
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  delayMs?: number;
}

// --- ScrollReveal Component ---
// Defer visual presentation and trigger entrance animation only when component enters viewport.
export default function ScrollReveal({
  children,
  className = "",
  threshold = 0.05,
  rootMargin = "0px 0px -40px 0px",
  delayMs = 0,
}: ScrollRevealProps) {
  // --- Viewport State ---
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // --- Viewport Observer Setup ---
  useEffect(() => {
    // Reveal immediately if IntersectionObserver is unsupported in the current browser.
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const target = containerRef.current;
    if (!target) return;

    // Observe element intersection with the browser viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delayMs > 0) {
              const timer = setTimeout(() => {
                setIsVisible(true);
              }, delayMs);
              observer.unobserve(entry.target);
              return () => clearTimeout(timer);
            } else {
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

  // --- UI ---
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
