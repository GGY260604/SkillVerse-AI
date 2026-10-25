import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/app/api/_lib/fastapi/client";

// --- Route Handler ---
// Endpoint: GET /api/home/trend/search?query=...&locale=...
// Target Service: Proxies requests to FastAPI backend (/api/v1/trends/search)
// Features: BGE-M3 Semantic Matching + Gemini Flash On-Demand Synthesis & Dynamic Database Expansion
export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get("query") || "").trim();
    const locale = request.nextUrl.searchParams.get("locale") || "en";

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Query parameter is required." },
        { status: 400 }
      );
    }

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

    const data = await response.json();
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error.";
    console.error("[/api/home/trend/search GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
