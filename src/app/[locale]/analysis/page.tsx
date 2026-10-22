import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import AnalysisDashboardView from "@/components/analysis/AnalysisDashboardView";

// --- Route Rendering Configuration ---
// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// --- Static Locale Route Generation ---
// Pre-render analysis pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// --- Analysis Page Server Component ---
// Resolves locale route parameters and mounts the career analysis dashboard view.
export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AnalysisDashboardView />;
}
