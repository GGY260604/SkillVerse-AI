"use client";

import { useTranslations } from "next-intl";

// Real-Time Labor Market Dynamics Component
// Display regional market telemetry, emerging competency trends, and telemetry status.
export default function LaborMarketDynamics() {
  const t = useTranslations("home.market");

  return (
    <section className="animate-fade-in-up-delay-2 max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 w-full">
      {/* Section Heading & Subtitle */}
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">{t("title")}</h2>
      <h3 className="text-lg sm:text-xl font-medium text-accent-dim mb-2">{t("subtitle")}</h3>
      <p className="text-sm text-text-secondary mb-8 sm:mb-10 max-w-2xl leading-relaxed">{t("description")}</p>

      {/* Market Data Visualization Card */}
      <div className="glass-card rounded-2xl py-14 sm:py-20 px-4 sm:px-6 text-center border-dashed">
        <p className="text-base text-text-muted italic">📊 {t("coming_soon")}</p>
      </div>
    </section>
  );
}
