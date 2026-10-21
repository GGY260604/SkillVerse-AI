import { NextRequest, NextResponse } from "next/server";
import { getFastApiConfig } from "@/lib/fastapi/client";

/**
 * GET /api/trend
 * Proxies request to FastAPI /trends using the dynamic connection resolver in lib/fastapi/client.ts.
 * Supports trilingual localization via ?locale=en | ms | zh.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";

    const config = getFastApiConfig();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");

    // Prioritize /api/v1/trends, fallback to /trends
    const candidateUrls = baseUrl.includes("/api/v1")
      ? [`${baseUrl}/trends?locale=${encodeURIComponent(locale)}`]
      : [
          `${baseUrl}/api/v1/trends?locale=${encodeURIComponent(locale)}`,
          `${baseUrl}/trends?locale=${encodeURIComponent(locale)}`,
        ];

    let lastError: any = null;
    let data = null;

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url, {
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
          break;
        } else {
          lastError = new Error(
            `FastAPI returned HTTP ${response.status} from ${url}`
          );
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!data) {
      console.warn("[/api/trend] Backend fetch failed:", lastError?.message);
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
    console.error("[/api/trend] Internal route error:", error);
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
