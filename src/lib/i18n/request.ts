import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

// Translation Message Loaders
// Map supported locale codes to dynamic imports of message catalog files.
const messageImports = {
  en: () => import("../../../messages/en.json"),
  ms: () => import("../../../messages/ms.json"),
  zh: () => import("../../../messages/zh.json"),
} as const;

// Request Configuration Handler
// Resolve and provide translations for server components based on the active locale.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming locale exists in the supported routing list.
  if (!locale || !routing.locales.includes(locale as "en" | "ms" | "zh")) {
    locale = routing.defaultLocale;
  }

  // Dynamically import the matching JSON translation file.
  const importFn = messageImports[locale as keyof typeof messageImports];
  const messages = (await importFn()).default;

  return {
    locale,
    messages,
  };
});


