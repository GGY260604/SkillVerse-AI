import { NextRequest, NextResponse } from "next/server";
import { getFastApiConfig } from "@/lib/fastapi/client";

/**
 * GET /api/home/trend
 * Proxies request to FastAPI /trends using the dynamic connection resolver in lib/fastapi/client.ts.
 * Supports trilingual localization via ?locale=en | ms | zh.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";

    const config = getFastApiConfig();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");

    const targetUrl = baseUrl.endsWith("/api/v1")
      ? `${baseUrl}/trends?locale=${encodeURIComponent(locale)}`
      : `${baseUrl}/api/v1/trends?locale=${encodeURIComponent(locale)}`;

    let lastError: any = null;
    let data = null;

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          ...config.headers,
          Accept: "application/json",
        },
        // Cache trends for 30s in Next.js data cache for snappy responsiveness
        next: { revalidate: 30 },
      });

      if (response.ok) {
        data = await response.json();
      } else {
        lastError = new Error(
          `FastAPI returned HTTP ${response.status} from ${targetUrl}`
        );
      }
    } catch (err: any) {
      lastError = err;
    }

    if (!data) {
      console.warn("[/api/home/trend] Backend fetch failed:", lastError?.message);
      return NextResponse.json(
        {
          success: false,
          error: lastError?.message || "Failed to reach FastAPI backend",
          signals: [],
          totalCount: 0,
          locale,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("[/api/home/trend] Internal route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal server error",
        signals: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
