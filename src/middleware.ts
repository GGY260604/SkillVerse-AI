import createMiddleware from "next-intl/middleware";

import { routing } from "@/lib/i18n/routing";

// Internationalization Middleware Setup
// Intercept incoming requests to negotiate and rewrite localized URL paths.
export default createMiddleware(routing);

// Middleware Route Matcher Configuration
// Filter requests to run localization middleware only on relevant page routes.
export const config = {
  // Match the root URL and all supported locale path segments.
  matcher: ["/", "/(en|ms|zh)/:path*"],
};

