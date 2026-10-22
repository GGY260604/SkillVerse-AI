// --- Internationalization Routing ---
// Define supported locales and default fallback locale for application routes.
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ms", "zh"],
  defaultLocale: "en",
});


