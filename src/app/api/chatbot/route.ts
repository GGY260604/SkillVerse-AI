import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";
import { getAuthenticatedUser } from "@/lib/supabase/cookies";

/**
 * Chatbot Autonomous Agent Proxy Route
 *
 * Proxies conversational inquiries from frontend client components to the FastAPI agent microservice.
 * Enforces dual-tier AI processing with local Qwen 2.5 and Google Gemini API failover.
 *
 * Request Requirements:
 * - Method: POST.
 * - Body:
 *   - message (required): User inquiry string.
 *   - history (optional): Prior conversational messages array.
 *   - locale (optional): User language locale ('en', 'zh', or 'ms').
 *   - system_instruction (optional): Registry-compiled instruction prompt.
 *
 * Workflow:
 * 1. Extract request payload parameters and normalize user inquiry strings.
 * 2. Forward inquiry payload to FastAPI agent endpoint with failover resilience.
 * 3. Return parsed agent directive and conversational response to consumer.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Extract Request Payload Parameters and Normalize User Inquiry Strings
    // ==========================================
    const body = await request.json();
    const { message, history, locale, system_instruction } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Message string is required.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Forward Inquiry Payload to FastAPI Agent Endpoint With Failover Resilience
    // ==========================================
    const authResult = await getAuthenticatedUser();
    const userId = authResult?.user?.id || null;

    const backendResponse = await fetchWithFastApiFallback(
      "/agent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: history || [],
          locale: locale || "en",
          system_instruction: system_instruction || "",
          user_id: userId,
        }),
      },
      { timeoutMs: 35000 }
    );

    if (!backendResponse.ok) {
      throw new Error(`FastAPI agent microservice returned HTTP status ${backendResponse.status}.`);
    }

    const data = await backendResponse.json();

    // ==========================================
    // Step 3: Return Parsed Agent Directive and Conversational Response to Consumer
    // ==========================================
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[/api/chatbot] Agent proxy execution failed:", errorMsg);

    return NextResponse.json(
      {
        success: false,
        target: null,
        message: "The AI agent is currently offline. Please try again later.",
        args: {},
        model_used: "offline_fallback",
        error: errorMsg,
      },
      { status: 502 }
    );
  }
}
