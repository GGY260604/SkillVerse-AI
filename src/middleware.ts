import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/lib/i18n/routing";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/supabase/cookies";

/**
 * Edge Routing and Authentication Middleware
 *
 * Coordinates edge-level internationalized route rewriting and protects authenticated routes.
 * Redirects unauthenticated traffic attempting to access protected resources to the localized login flow.
 *
 * Requirements:
 * - Route Protection: Intercept paths matching '/analysis' or '/shared'.
 * - Session Validation: Inspect access token and refresh token cookies.
 * - Internationalization: Delegate path localization to next-intl middleware.
 *
 * Workflow:
 * 1. Initialize next-intl localization routing middleware.
 * 2. Evaluate route protection criteria against active pathname.
 * 3. Validate user authentication credentials on protected pathways:
 *    - Branch A: Redirect unauthenticated requests to localized home page with login modal prompt.
 *    - Branch B: Allow authenticated traffic to proceed.
 * 4. Delegate localized request processing to internationalization middleware.
 */

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // ==========================================
  // Step 1: Evaluate Route Protection Criteria
  // ==========================================
  const { pathname } = request.nextUrl;
  const isProtected = /(analysis|shared)/.test(pathname);

  // ==========================================
  // Step 2: Validate User Authentication Credentials on Protected Pathways
  // ==========================================
  if (isProtected) {
    // Check both access token and refresh token so sessions undergoing silent refresh are preserved.
    const token =
      request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    // ==========================================
    // Branch A: Redirect Unauthenticated Requests to Localized Login Prompt
    // ==========================================
    if (!token) {
      const segments = pathname.split("/").filter(Boolean);
      const locale = routing.locales.includes(segments[0] as "en" | "ms" | "zh")
        ? segments[0]
        : routing.defaultLocale;

      const redirectUrl = new URL(`/${locale}?auth=login`, request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);
      redirectResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      redirectResponse.headers.set("Pragma", "no-cache");
      redirectResponse.headers.set("Expires", "0");
      return redirectResponse;
    }
  }

  // ==========================================
  // Step 3: Delegate Localized Request Processing to Internationalization Middleware
  // ==========================================
  return intlMiddleware(request);
}

// ==========================================
// Step 4: Configure Middleware Path Matcher Filter
// ==========================================
export const config = {
  // Match all request paths except internal assets, api endpoints, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
