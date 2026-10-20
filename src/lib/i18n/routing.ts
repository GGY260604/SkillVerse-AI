import { defineRouting } from "next-intl/routing";

// Internationalization Routing Configuration
// Define supported locales and fallback default locale for route resolution.
export const routing = defineRouting({
  locales: ["en", "ms", "zh"],
  defaultLocale: "en",
});

