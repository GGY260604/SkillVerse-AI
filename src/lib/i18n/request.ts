// --- Internationalization Request Config ---
// Resolve locale and load corresponding translation catalogs for server rendering.
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

// Step 1: Translation Catalog Mapping
// Map supported locale codes to dynamic imports of message JSON files.
const messageImports = {
  en: () => import("../../../messages/en.json"),
  ms: () => import("../../../messages/ms.json"),
  zh: () => import("../../../messages/zh.json"),
} as const;

// Step 2: Request Configuration Resolver
// Resolve active locale and dynamically load messages catalog.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate incoming locale against supported routing locales list.
  if (!locale || !routing.locales.includes(locale as "en" | "ms" | "zh")) {
    locale = routing.defaultLocale;
  }

  // Dynamically import matching JSON translation catalog.
  const importFn = messageImports[locale as keyof typeof messageImports];
  const messages = (await importFn()).default;

  return {
    locale,
    messages,
  };
});



