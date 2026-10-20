import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { ACCESS_TOKEN_COOKIE } from "@/lib/supabase/cookies";

const intlMiddleware = createMiddleware(routing);

// Authentication and Localization Edge Middleware
// Enforce unauthenticated user restrictions across protected routes while handling locale routing.
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check whether current path requires user authentication.
  const isProtected = /(analysis|shared)/.test(pathname);

  if (isProtected) {
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    // Redirect unauthenticated requests to home page with auth query trigger.
    if (!token) {
      const segments = pathname.split("/").filter(Boolean);
      const locale = routing.locales.includes(segments[0] as "en" | "ms" | "zh")
        ? segments[0]
        : routing.defaultLocale;

      const redirectUrl = new URL(`/${locale}?auth=login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return intlMiddleware(request);
}

// Middleware Route Matcher Configuration
export const config = {
  // Match the root URL and all supported locale path segments.
  matcher: ["/", "/(en|ms|zh)/:path*"],
};
