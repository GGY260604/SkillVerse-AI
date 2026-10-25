import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";
import { USE_QUIZ_MOCK_DATA, getMockQuizData } from "@/constants/testing/quiz";

/**
 * POST /api/page-analysis/roadmaps/phase/quiz
 * Generates interactive quiz questions for a roadmap phase via FastAPI backend service (/api/v1/quiz/generate),
 * with deterministic fallback to local mock quiz when offline or testing.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters: None.
 * - Request Body:
 *   - phaseIndex (optional): Number. Index of the roadmap phase. Defaults to 1.
 *   - phaseTitle (optional): String. Title of the roadmap phase.
 *   - skills (optional): String[]. Targeted skills for the phase.
 *   - courseTopic (optional): String. Topic or description of the phase.
 *   - targetRole (optional): String. Target role of the roadmap.
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Language locale for trilingual localization. Defaults to 'en'.
 *
 * Workflow:
 * 1. Parse request payload parameters.
 * 2. Check testing mock flag.
 * 3. Dispatch quiz generation to FastAPI backend service.
 * 4. Fallback to deterministic local mock quiz if upstream is unavailable.
 */
export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // Step 1: Parse Request Payload Parameters
    // ==========================================
    const body = await req.json();
    const {
      phaseIndex = 1,
      phaseTitle = "Core Competency",
      skills = [],
      courseTopic,
      targetRole,
      locale = "en",
    } = body;

    // ==========================================
    // Step 2: Check Testing Mock Flag
    // ==========================================
    if (USE_QUIZ_MOCK_DATA) {
      const mock = getMockQuizData({
        phaseIndex: Number(phaseIndex) || 1,
        phaseTitle,
        locale,
      });
      return NextResponse.json(mock);
    }

    // ==========================================
    // Step 3: Dispatch Quiz Generation to FastAPI Backend Service
    // ==========================================
    try {
      const response = await fetchWithFastApiFallback("/api/v1/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phaseIndex: Number(phaseIndex) || 1,
          phaseTitle,
          skills,
          courseTopic,
          targetRole,
          locale,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (apiErr) {
      console.warn("[/api/page-analysis/roadmaps/phase/quiz] Failed to reach FastAPI endpoint; serving deterministic fallback:", apiErr);
    }

    // ==========================================
    // Step 4: Fallback to Deterministic Local Mock Quiz
    // ==========================================
    const fallbackQuiz = getMockQuizData({
      phaseIndex: Number(phaseIndex) || 1,
      phaseTitle,
      locale,
    });
    return NextResponse.json(fallbackQuiz);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("[/api/page-analysis/roadmaps/phase/quiz] Internal route error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
