import { useTranslations } from "next-intl";

import { GITHUB_REPO_URL, LICENSE_URL } from "@/constants/footer";
import Logo from "@/components/Logo";

// --- Footer Navigation and Copyright Component ---
// Render platform brand identity, author attribution, open-source links, and legal notice.
export default function Footer() {
  // Load localized footer strings for copyright, hackathon, and attribution.
  const t = useTranslations("layout.footer");

  // --- UI ---
  return (
    <footer className="border-t border-border-subtle bg-bg-secondary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Main Footer Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-border-subtle">
          {/* Brand & Authorship */}
          <div className="flex flex-col gap-2.5">
            <Logo text={t("copyright")} size="md" />

            {/* Hackathon & Author Info */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
              <span>{t("hackathon")}</span>
              <span className="text-border-subtle select-none">•</span>
              <span className="text-text-secondary font-medium">{t("author")}</span>
            </div>
          </div>

          {/* Embedded GitHub Action & License */}
          <div className="flex flex-col sm:items-end gap-2.5 shrink-0 w-full sm:w-auto">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-text-secondary bg-bg-card hover:text-text-primary hover:bg-bg-card-hover border border-border-subtle hover:border-border-accent transition-all duration-300 group w-full sm:w-auto"
            >
              {/* GitHub SVG */}
              <svg
                className="w-4 h-4 fill-current text-text-secondary group-hover:text-accent transition-colors duration-200 shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>{t("github")}</span>
              <span className="text-[11px] text-text-muted group-hover:text-accent transition-colors duration-200">↗</span>
            </a>

            {/* License */}
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors flex items-center justify-start sm:justify-end gap-1.5"
            >
              <span>{t("license")}:</span>
              <span className="text-text-secondary hover:text-accent underline decoration-border-subtle underline-offset-2">Apache-2.0</span>
            </a>
          </div>
        </div>

        {/* Disclaimer / Notice Row */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-text-muted">
          <p className="leading-relaxed max-w-3xl">{t("tagline")}</p>
          <p className="shrink-0">© 2026 SkillVerse AI</p>
        </div>
      </div>
    </footer>
  );
}
