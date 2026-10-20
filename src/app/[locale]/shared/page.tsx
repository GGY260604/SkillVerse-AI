import { setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import SharedPlansView from "@/components/shared/SharedPlansView";

// Disable instant app shell prerendering to allow direct dynamic route parameter access.
export const instant = false;

// Static Locale Route Generation
// Pre-render community shared pages for all supported language locales at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Community Shared Plans Page
// Displays list of peers who shared their career roadmap and mounts peer analysis interfaces.
export default async function SharedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Await locale parameter from dynamic route.
  const { locale } = await params;

  // Bind locale for static generation.
  setRequestLocale(locale);

  return <SharedPlansView />;
}

