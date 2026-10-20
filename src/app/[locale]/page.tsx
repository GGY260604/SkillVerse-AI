import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import Hero from "@/components/home/Hero";
import TransformationPlan from "@/components/home/TransformationPlan";

// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// Static Locale Route Generation
// Pre-render home pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Home Page Component
// Render the landing hero section, real-time market signals, and AI transformation plan.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await locale parameter from dynamic route.
  const { locale } = await params;

  // Bind locale for static generation.
  setRequestLocale(locale);

  // -------------------------------------------------------------------------------------
  // Debugging / Testing Purpose Only (Ensure All Commented Out for Live Deployment)
  // -------------------------------------------------------------------------------------

  // Simulate a network delay (30 seconds) for testing the loading state. (Uncomment to test.)
  // await new Promise((resolve) => setTimeout(resolve, 30000));

  // Simulate a error for testing the error state. (Uncomment to test.)
  // throw new Error("Test Error");

  // -------------------------------------------------------------------------------------
  
  // Fetch translation strings for home market data section.
  const t = await getTranslations("home.market");

  return (
    <>
      {/* Hero Showcase Section */}
      <Hero />

      {/* Real-time Market Data Section */}
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

      {/* AI Transformation Plan Section */}
      <TransformationPlan />
    </>
  );
}
