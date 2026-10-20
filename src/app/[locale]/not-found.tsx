"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";

// Localized 404 Not Found Screen
// Display futuristic celestial 404 message with interactive navigation options.
export default function NotFound() {
  const t = useTranslations("status.not_found");
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] px-4 sm:px-6 relative overflow-hidden select-none animate-fade-in py-16">
      {/* Background Radial Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)] pointer-events-none" />

      {/* Massive Gradient 404 Display */}
      <div className="relative mb-4">
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-text-primary via-text-secondary to-transparent font-mono select-none drop-shadow-2xl">{t("code")}</h1>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-accent/50">SIGNAL LOST IN DEEP SPACE</span>
        </div>
      </div>

      {/* Narrative Title & Description */}
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-3 text-center max-w-lg">{t("title")}</h2>
      <p className="text-sm text-text-secondary text-center max-w-md leading-relaxed mb-8">{t("description")}</p>

      {/* Interactive Navigation Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
        {/* Primary CTA: Return to Platform Home */}
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg-primary text-xs font-semibold uppercase tracking-wider font-mono hover:opacity-90 hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300 no-underline cursor-pointer"
        >
          <span>←</span>
          <span>{t("btn_home")}</span>
        </Link>

        {/* Secondary Action: Go Back in Navigation History */}
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-bg-card hover:bg-bg-card-hover border border-border-subtle hover:border-border-accent text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider font-mono transition-all duration-300 cursor-pointer"
        >
          <span>{t("btn_back")}</span>
        </button>
      </div>
    </div>
  );
}
