import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";

/**
 * GET /api/page-home/trend/search
 * Proxies skill trend search telemetry requests to the FastAPI backend service.
 * Supports BGE-M3 semantic matching and on-demand trend synthesis.
 *
 * Request Requirements:
 * - Authentication: None (public reference endpoint).
 * - Query Parameters:
 *   - query (required): String. Skill name or domain keyword to query.
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Target language locale. Defaults to 'en'.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Validate incoming query parameters.
 * 2. Forward search request to the FastAPI backend service.
 * 3. Parse and return trend telemetry response.
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Query Parameter Validation
    // ==========================================
    const query = (request.nextUrl.searchParams.get("query") || "").trim();
    const locale = request.nextUrl.searchParams.get("locale") || "en";

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query parameter is required." },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Forward Search Request to FastAPI Backend Service
    // ==========================================
    const endpointPath = `/api/v1/trends/search?query=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`;

    const response = await fetchWithFastApiFallback(endpointPath, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `FastAPI backend error (HTTP ${response.status}): ${errorText}`,
        },
        { status: response.status }
      );
    }

    // ==========================================
    // Step 3: Parse and Return Trend Telemetry Response
    // ==========================================
    const data = await response.json();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    console.error("[/api/page-home/trend/search GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
