import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "sb_access_token";
export const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

// Standard session expiration fallback: 7 days in seconds.
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

// Attach authentication session tokens to server response cookies.
export function attachAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  maxAge?: number
) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions);
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

  return response;
}

// Clear authentication session cookies upon logout or token invalidation.
export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

// Read authentication tokens from current incoming request cookies.
export async function getAuthTokensFromCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null;
  return { accessToken, refreshToken };
}
