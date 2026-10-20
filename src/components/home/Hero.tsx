"use client";

import { useTranslations } from "next-intl";

// Hero Showcase Component
// Highlight platform value proposition with background atmosphere, CTA, and real-time statistics.
export default function Hero() {
  // Load localized content for hero banner and statistical metrics.
  const t = useTranslations("home.hero");
  const ts = useTranslations("home.stats");

  // Smoothly scroll down to the transformation plan section.
  const handleScrollToPlan = () => {
    const section = document.getElementById("transformation-plan");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background Image Layer with Atmospheric Overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src="/hero-background.jpg"
          alt="Hero Background"
          className="w-full h-full object-cover object-center opacity-70 scale-105"
        />
        {/* Top & Bottom gradient fades to seamlessly blend into pure black bg-primary */}
        <div className="absolute inset-0 bg-linear-to-b from-bg-primary/75 via-bg-primary/80 to-bg-primary" />
        {/* Subtle radial accent glow centered over the hero */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[120%] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_70%)]" />
      </div>

      {/* Main Hero Content */}
      <div className="animate-fade-in-up max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 pb-8 sm:pb-10 text-center relative z-10">
        {/* Tagline */}
        <p className="text-xs font-semibold text-accent tracking-[0.15em] uppercase mb-4 sm:mb-6">{t("tagline")}</p>

        {/* Title */}
        <h1 className="text-2xl sm:text-5xl lg:text-[56px] font-extrabold leading-[1.18] sm:leading-[1.15] text-text-primary max-w-3xl mx-auto mb-4 sm:mb-6 tracking-tight wrap-break-word">
          {t("title_1")}{" "}
          <span className="bg-linear-to-br from-accent to-accent-dim bg-clip-text text-transparent">
            {t("title_highlight_1")}
          </span>{" "}
          {t("title_2")}{" "}
          <span className="bg-linear-to-br from-accent to-accent-dim bg-clip-text text-transparent">
            {t("title_highlight_2")}
          </span>{" "}
          {t("title_3")}
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up-delay-1 text-sm sm:text-base leading-relaxed text-text-secondary max-w-2xl mx-auto mb-8 sm:mb-10">{t("subtitle")}</p>

        {/* CTA Button */}
        <div className="animate-fade-in-up-delay-2 flex justify-center">
          <button
            type="button"
            onClick={handleScrollToPlan}
            className="px-9 py-3.5 text-sm font-semibold bg-accent text-bg-primary rounded-xl border-none cursor-pointer tracking-wide hover:opacity-95 hover:shadow-[0_0_25px_var(--accent-glow-strong)] transition-all duration-300"
          >
            {t("cta_start_plan")}
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="animate-fade-in-up-delay-3 max-w-7xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-4 pb-3 lg:pb-0 snap-x snap-mandatory lg:snap-none scroll-smooth">
          {/* Stat Card 1: Market Shift */}
          <div className="w-65 sm:w-75 lg:w-auto shrink-0 lg:shrink snap-start bg-bg-card/85 backdrop-blur-xl border border-border-subtle hover:border-border-accent hover:bg-bg-card-hover/95 transition-all duration-300 rounded-xl p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{ts("market_shift")}</span>
              <span className="text-xs text-positive">↗</span>
            </div>
            <p className="text-3xl font-extrabold text-positive tracking-tight">+38.4%</p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{ts("market_shift_desc")}</p>
          </div>

          {/* Stat Card 2: Reskill Cycle */}
          <div className="w-65 sm:w-75 lg:w-auto shrink-0 lg:shrink snap-start bg-bg-card/85 backdrop-blur-xl border border-border-subtle hover:border-border-accent hover:bg-bg-card-hover/95 transition-all duration-300 rounded-xl p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{ts("reskill_cycle")}</span>
              <span className="text-xs text-accent">↗</span>
            </div>
            <p className="text-3xl font-extrabold text-text-primary tracking-tight">14.2 <span className="text-base font-medium">Mos</span></p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{ts("reskill_cycle_desc")}</p>
          </div>

          {/* Stat Card 3: Enterprise Partners */}
          <div className="w-65 sm:w-75 lg:w-auto shrink-0 lg:shrink snap-start bg-bg-card/85 backdrop-blur-xl border border-border-subtle hover:border-border-accent hover:bg-bg-card-hover/95 transition-all duration-300 rounded-xl p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{ts("enterprise_partners")}</span>
              <span className="text-xs text-accent">↗</span>
            </div>
            <p className="text-3xl font-extrabold text-text-primary tracking-tight">3,400+</p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{ts("enterprise_partners_desc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
