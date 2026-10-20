import { getTranslations, setRequestLocale } from "next-intl/server";

import AuthGate from "@/components/AuthGate";

// Community Shared Plans Page
// Provide peer learning pathways, mentor-guided roadmaps, and community sharing.
export default async function SharedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await locale parameter from dynamic route.
  const { locale } = await params;

  // Bind locale for static generation.
  setRequestLocale(locale);

  // Fetch translation strings for community shared section.
  const t = await getTranslations("shared");

  return (
    <AuthGate>
      <div className="animate-fade-in-up max-w-7xl mx-auto py-12 px-6 w-full">
        {/* Header Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">{t("title")}</h1>
        <p className="text-base text-text-secondary mb-10">{t("subtitle")}</p>

        {/* Community Showcase Placeholder */}
        <div className="glass-card rounded-2xl py-20 px-6 text-center border-dashed">
          <div className="text-5xl mb-4 animate-float inline-block">🤝</div>
          <p className="text-base text-text-muted italic">{t("coming_soon")}</p>
        </div>
      </div>
    </AuthGate>
  );
}

