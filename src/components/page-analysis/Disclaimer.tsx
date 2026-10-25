"use client";

import { useTranslations } from "next-intl";

// ==========================================
// Analysis Sources Disclaimer Component
// ==========================================

// Display persistent attribution and data source disclaimer links at the bottom of analysis views.
export default function Disclaimer() {
  // ==========================================
  // Step 1: Initialize Multi-Language Translation Hook
  // ==========================================
  // Ingest localized attribution strings and official external institutional hyperlinks.
  const t = useTranslations("analysis");

  // ==========================================
  // Step 2: Render Source Attributions and Hyperlink Anchors
  // ==========================================
  return (
    <div className="mt-12 pt-6 pb-2 border-t border-border-subtle/40 text-center">
      <p className="text-xs font-mono text-text-muted leading-relaxed">
        {t.rich("attribution_sources_note", {
          esco: (chunks) => (
            <a
              href="https://esco.ec.europa.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-accent font-medium underline underline-offset-2 transition-colors duration-200"
            >
              {chunks}
            </a>
          ),
          arxiv: (chunks) => (
            <a
              href="https://arxiv.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-accent font-medium underline underline-offset-2 transition-colors duration-200"
            >
              {chunks}
            </a>
          ),
          remoteok: (chunks) => (
            <a
              href="https://remoteok.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-accent font-medium underline underline-offset-2 transition-colors duration-200"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}
