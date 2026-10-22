import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";

// --- Route Handler ---
// Endpoint: GET /api/home/trend
// Target Service: Proxies requests to the FastAPI backend service (/trends or /api/v1/trends).
// Data Source: Retrieves labor market telemetry stored in Supabase from ArXiv and RemoteOK.
// Parameters: Accepts locale query parameter for trilingual localization (?locale=en | ms | zh).
export async function GET(request: NextRequest) {
  try {
    // 1. Locale Parameter Extraction
    // Extract target language locale from query parameters, falling back to English.
    const locale = request.nextUrl.searchParams.get("locale") || "en";

    // 2. Telemetry Ingestion from Upstream Service with Multi-Tier Failover
    // Attempt local Python service first, then seamlessly fall back to RunPod and Render.
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

    // 4. Upstream Failure Fallback
    // Return a structured error response with empty telemetry arrays when upstream is unavailable.
    if (!data) {
      console.warn("[/api/home/trend] Backend fetch failed:", lastError?.message);
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

    // 5. Successful Response Dispatch
    // Return unified telemetry payload directly to the client application.
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    // 6. Internal Route Error Handling
    // Catch unhandled exceptions and return an internal server error response.
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    console.error("[/api/home/trend] Internal route error:", error);
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
