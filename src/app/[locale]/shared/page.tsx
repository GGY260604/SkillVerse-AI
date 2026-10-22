import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import SharedPlansView from "@/components/shared/SharedPlansView";

// --- Route Rendering Configuration ---
// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// --- Static Locale Route Generation ---
// Pre-render community shared pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// --- Shared Page Component ---
// Render the peer shared roadmaps directory and mount collaborative exploration views.
export default async function SharedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // 1. Dynamic Route Locale Resolution
  // Await incoming locale parameter from next-intl routing pipeline.
  const { locale } = await params;

  // 2. Static Locale Binding
  // Bind current locale for static generation and server-side translations.
  setRequestLocale(locale);

  // --- UI ---
  return <SharedPlansView />;
}
