import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import Hero from "@/components/home/Hero";
import LaborMarketDynamics from "@/components/home/LaborMarketDynamics";
import SkillTrendCheck from "@/components/home/SkillTrendCheck";
import TransformationPlan from "@/components/home/TransformationPlan";
import ScrollReveal from "@/components/home/ScrollReveal";

// --- Route Rendering Configuration ---
// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// --- Static Locale Route Generation ---
// Pre-render home pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// --- Home Page Component ---
// Render landing hero, real-time telemetry, skill trend diagnostics, and AI transformation plan.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await locale parameter from dynamic route.
  const { locale } = await params;

  // Bind locale for static generation.
  setRequestLocale(locale);

  // -------------------------------------------------------------
  // Debugging / Testing Only (Loading & Error)
  // -------------------------------------------------------------

  // Keep these scenarios commented out for live deployments.

  // Simulate a network delay (30 seconds) for testing the loading state. (Uncomment to test.)
  // await new Promise((resolve) => setTimeout(resolve, 30000));

  // Simulate an error for testing the error state. (Uncomment to test.)
  // throw new Error("Test Error");

  // -------------------------------------------------------------

  // --- UI ---
  return (
    <>
      {/* Hero Showcase Section */}
      <Hero />

      {/* Real-time Market Data Section */}
      <ScrollReveal>
        <LaborMarketDynamics />
      </ScrollReveal>

      {/* Skill Trend Trajectory Diagnostic Section */}
      <ScrollReveal>
        <SkillTrendCheck />
      </ScrollReveal>

      {/* AI Transformation Plan Section */}
      <ScrollReveal>
        <TransformationPlan />
      </ScrollReveal>
    </>
  );
}
