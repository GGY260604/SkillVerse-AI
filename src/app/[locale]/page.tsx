import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import Hero from "@/components/page-home/Hero";
import LaborMarketDynamics from "@/components/page-home/LaborMarketDynamics";
import SkillTrendCheck from "@/components/page-home/SkillTrendCheck";
import TransformationPlan from "@/components/page-home/TransformationPlan";
import ScrollReveal from "@/components/page-home/helper/ScrollReveal";

// ==========================================
// Route Prerendering Configuration
// ==========================================

// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// Pre-render home pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Landing Home Page
 *
 * Serves as the primary public entry point for SkillVerse AI.
 * Presents platform mission, live labor market telemetry, interactive skill checks, and transformation plans.
 *
 * Page Requirements:
 * - Authentication: None (public entry page).
 * - Route Parameters:
 *   - locale (required): String ('en' | 'ms' | 'zh'). Language locale parameter.
 * - Server Dependencies: next-intl server-side locale resolver.
 *
 * Workflow:
 * 1. Resolve localized route parameters and configure server translation scope.
 * 2. Render landing hero showcase highlighting national workforce reskilling objectives.
 * 3. Mount real-time labor market telemetry with deferred viewport entrance animations.
 * 4. Mount skill trend trajectory diagnostics with deferred viewport entrance animations.
 * 5. Mount AI transformation pathways and roadmap previews with deferred viewport entrance animations.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // ==========================================
  // Step 1: Resolve Localized Route Parameters and Configure Server Translation Scope
  // ==========================================
  const { locale } = await params;
  setRequestLocale(locale);

  // ------------------------------------------
  // Debugging / Testing Only (Loading & Error)
  // ------------------------------------------

  // Keep these scenarios commented out for live deployments.

  // Simulate a network delay (30 seconds) for testing the loading state. (Uncomment to test.)
  // await new Promise((resolve) => setTimeout(resolve, 30000));

  // Simulate an error for testing the error state. (Uncomment to test.)
  // throw new Error("Test Error");

  // ------------------------------------------

  return (
    <>
      {/* ========================================== */}
      {/* Step 2: Render Landing Hero Showcase Section */}
      {/* ========================================== */}
      <Hero />

      {/* ========================================== */}
      {/* Step 3: Mount Real-Time Labor Market Telemetry */}
      {/* ========================================== */}
      <ScrollReveal>
        <LaborMarketDynamics />
      </ScrollReveal>

      {/* ========================================== */}
      {/* Step 4: Mount Skill Trend Trajectory Diagnostics */}
      {/* ========================================== */}
      <ScrollReveal>
        <SkillTrendCheck />
      </ScrollReveal>

      {/* ========================================== */}
      {/* Step 5: Mount AI Transformation Pathways */}
      {/* ========================================== */}
      <ScrollReveal>
        <TransformationPlan />
      </ScrollReveal>
    </>
  );
}
