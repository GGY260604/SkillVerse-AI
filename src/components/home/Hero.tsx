"use client";

import { useTranslations } from "next-intl";

// --- Hero Component ---
// Highlight platform value proposition with background atmosphere, CTA, and real-time statistics.
export default function Hero() {
  // --- Multi-Language Setup ---
  const t = useTranslations("home.hero");
  const ts = useTranslations("home.stats");

  // --- Helper Function ---
  // Auto scroll to the transformation plan section after 2 second.
  const handleScrollToPlan = () => {
    const section = document.getElementById("transformation-plan");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  // --- UI ---
  return (
    <section className="relative overflow-hidden">
      {/* Background Image Layer with Atmospheric Overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src="/hero-background.jpg"
          alt="Hero Background"
          className="w-full h-full object-cover object-center opacity-70 scale-105"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-bg-primary/75 via-bg-primary/80 to-bg-primary" />
        {/* Glow Centered Over the Hero */}
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

        {/* Start Button */}
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
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
          {/* Stat Card 1: AI Skills Divide */}
          <div className="group w-[88%] min-w-[260px] max-w-[380px] flex-none snap-start bg-bg-card/85 backdrop-blur-xl border border-border-subtle hover:border-rose-500/60 hover:shadow-[0_0_28px_rgba(244,63,94,0.22)] hover:bg-bg-card-hover/95 transition-all duration-300 rounded-xl p-5 sm:p-6 flex flex-col justify-between lg:w-auto lg:min-w-0 lg:max-w-none">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">{ts("card_1_label")}</span>
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 group-hover:border-rose-500/40 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">{ts("card_1_stat")}</p>
            </div>
            <p className="text-xs text-text-muted mt-2.5 leading-relaxed">{ts("card_1_desc")}</p>
          </div>

          {/* Stat Card 2: National Reskilling Crisis */}
          <div className="group w-[88%] min-w-[260px] max-w-[380px] flex-none snap-start bg-bg-card/85 backdrop-blur-xl border border-border-subtle hover:border-amber-500/60 hover:shadow-[0_0_28px_rgba(245,158,11,0.22)] hover:bg-bg-card-hover/95 transition-all duration-300 rounded-xl p-5 sm:p-6 flex flex-col justify-between lg:w-auto lg:min-w-0 lg:max-w-none">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">{ts("card_2_label")}</span>
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">{ts("card_2_stat")}</p>
            </div>
            <p className="text-xs text-text-muted mt-2.5 leading-relaxed">{ts("card_2_desc")}</p>
          </div>

          {/* Stat Card 3: Sustainable Future Roles */}
          <div className="group w-[88%] min-w-[260px] max-w-[380px] flex-none snap-start bg-bg-card/85 backdrop-blur-xl border border-border-subtle hover:border-accent hover:shadow-[0_0_28px_rgba(0,229,195,0.25)] hover:bg-bg-card-hover/95 transition-all duration-300 rounded-xl p-5 sm:p-6 flex flex-col justify-between lg:w-auto lg:min-w-0 lg:max-w-none">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">{ts("card_3_label")}</span>
                <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent/20 group-hover:border-accent/40 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-accent tracking-tight">{ts("card_3_stat")}</p>
            </div>
            <p className="text-xs text-text-muted mt-2.5 leading-relaxed">{ts("card_3_desc")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
