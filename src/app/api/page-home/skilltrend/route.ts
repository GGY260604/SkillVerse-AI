import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";

/**
 * GET /api/page-home/skilltrend
 * Proxies skill trend analytics and trajectory projections to the FastAPI backend service (/api/v1/trends/search).
 * Evaluates skill velocity, predictive time series, and aligned ESCO roles.
 *
 * Request Requirements:
 * - Authentication: None (public reference endpoint).
 * - Query Parameters:
 *   - query (required): String. Name of the skill to search.
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Language locale for trilingual localization. Defaults to 'en'.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Parse search query and locale parameters.
 * 2. Validate input requirements.
 * 3. Ingest telemetry from FastAPI backend service.
 * 4. Dispatch structured skill trend response.
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Parse Search Query and Locale Parameters
    // ==========================================
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";
    const locale = request.nextUrl.searchParams.get("locale")?.trim() || "en";

    // ==========================================
    // Step 2: Validate Input Requirements
    // ==========================================
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Skill query parameter is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 3: Ingest Telemetry from FastAPI Backend Service
    // ==========================================
    const endpoint = `/api/v1/trends/search?query=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`;
    const response = await fetchWithFastApiFallback(
      endpoint,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 30 },
      },
      { timeoutMs: 70000 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: errorText || `FastAPI backend returned HTTP ${response.status}.`,
        },
        { status: response.status }
      );
    }

    const payload = await response.json();

    // ==========================================
    // Step 4: Dispatch Structured Skill Trend Response
    // ==========================================
    return NextResponse.json({
      success: true,
      ...payload,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    console.error("[/api/page-home/skilltrend] Internal route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 502 }
    );
  }
}
