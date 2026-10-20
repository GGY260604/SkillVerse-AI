import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import Hero from "@/components/home/Hero";
import LaborMarketDynamics from "@/components/home/LaborMarketDynamics";
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

  return (
    <>
      {/* Hero Showcase Section */}
      <Hero />

      {/* Real-time Market Data Section */}
      <LaborMarketDynamics />

      {/* AI Transformation Plan Section */}
      <TransformationPlan />
    </>
  );
}
