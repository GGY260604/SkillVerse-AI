import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";

/**
 * GET /api/page-home/trend
 * Proxies labor market trend telemetry requests to the FastAPI backend service.
 * Ingests labor market signals stored in Supabase from ArXiv and RemoteOK.
 *
 * Request Requirements:
 * - Authentication: None (public reference endpoint).
 * - Query Parameters:
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Target language locale for trilingual localization. Defaults to 'en'.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Parse locale query parameter.
 * 2. Ingest telemetry from FastAPI backend service.
 * 3. Dispatch structured trend telemetry response.
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Parse Locale Query Parameter
    // ==========================================
    const locale = request.nextUrl.searchParams.get("locale") || "en";

    // ==========================================
    // Step 2: Ingest Telemetry from FastAPI Backend Service
    // ==========================================
    let lastError: Error | null = null;
    let data: Record<string, unknown> | null = null;

    try {
      const response = await fetchWithFastApiFallback(
        `/api/v1/trends?locale=${encodeURIComponent(locale)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          next: { revalidate: 30 },
        }
      );

      if (response.ok) {
        data = await response.json();
      } else {
        lastError = new Error(`FastAPI returned HTTP ${response.status}.`);
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (!data) {
      console.warn("[/api/page-home/trend] Backend fetch failed:", lastError?.message);
      return NextResponse.json(
        {
          success: false,
          error: lastError?.message || "Failed to reach FastAPI backend.",
          signals: [],
          totalCount: 0,
          locale,
        },
        { status: 502 }
      );
    }

    // ==========================================
    // Step 3: Dispatch Structured Trend Telemetry Response
    // ==========================================
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    console.error("[/api/page-home/trend] Internal route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        signals: [],
        totalCount: 0,
      },
      { status: 500 }
    );
  }
}
