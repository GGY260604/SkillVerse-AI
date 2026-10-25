import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/app/api/_lib/fastapi/client";

// --- Route Handler ---
// Endpoint: GET /api/home/skilltrend
// Target Service: Proxies requests to FastAPI backend service (/api/v1/trends/search).
// Data Source: Evaluates skill velocity, predictive time series, and aligned ESCO roles.
// Parameters: Accepts skill search query and locale parameter for trilingual localization.

// --- GET Request Handler ---
// Retrieve trend analytics and trajectory projections for a user-specified skill.
export async function GET(request: NextRequest) {
  try {
    // 1. Parameter Extraction
    // Extract search query and locale from incoming request URL search parameters.
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";
    const locale = request.nextUrl.searchParams.get("locale")?.trim() || "en";

    // 2. Input Validation
    // Validate that the user provided a non-empty skill name query.
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Skill query parameter is required.",
        },
        { status: 400 }
      );
    }

    // 3. Telemetry Ingestion from Upstream Service with Multi-Tier Failover
    // Dispatch query to FastAPI backend trends search endpoint across configured endpoints.
    const endpoint = `/api/v1/trends/search?query=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`;
    const response = await fetchWithFastApiFallback(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    }, { timeoutMs: 70000 });

    // 4. Response Parsing
    // Parse JSON payload returned by upstream Python analytics engine.
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

    // 5. Successful Response Dispatch
    // Return structured skill trend response directly to client application.
    return NextResponse.json({
      success: true,
      ...payload,
    });
  } catch (error: unknown) {
    // 6. Internal Route Error Handling
    // Catch unhandled exceptions and return structured gateway error payload.
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    console.error("[/api/home/skilltrend] Internal route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 502 }
    );
  }
}
