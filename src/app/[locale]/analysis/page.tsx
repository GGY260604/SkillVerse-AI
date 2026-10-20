import { getTranslations, setRequestLocale } from "next-intl/server";

import AuthGate from "@/components/AuthGate";

// Career Analysis Dashboard Page
// Display personalized career assessment, current plan progress, and historical paths.
export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await locale parameter from dynamic route.
  const { locale } = await params;

  // Bind locale for static generation.
  setRequestLocale(locale);

  // Fetch translation strings for analysis section.
  const t = await getTranslations("analysis");

  return (
    <AuthGate>
      <div className="animate-fade-in-up max-w-7xl mx-auto py-12 px-6 w-full">
        {/* Page Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-8">{t("title")}</h1>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <div className="glass-card rounded-2xl p-8 hover:border-border-accent hover:bg-bg-card-hover/90 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent-glow border border-border-accent/40 flex items-center justify-center text-2xl mb-5">
              📋
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{t("current_plan")}</h2>
            <p className="text-sm text-text-muted italic">{t("coming_soon")}</p>
          </div>

          {/* History Plan Card */}
          <div className="glass-card rounded-2xl p-8 hover:border-border-accent hover:bg-bg-card-hover/90 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-accent-glow border border-border-accent/40 flex items-center justify-center text-2xl mb-5">
              🕐
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-3">{t("history_plan")}</h2>
            <p className="text-sm text-text-muted italic">{t("coming_soon")}</p>
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

