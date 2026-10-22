import { NextRequest, NextResponse } from "next/server";
import { fetchWithFastApiFallback } from "@/app/api/_lib/fastapi/client";
import { USE_QUIZ_MOCK_DATA, getMockQuizData } from "@/constants/quiz";

// --- Route Handler ---
// Endpoint: POST /api/analysis/phase-quiz
// Purpose: Return mock quiz data or generate a quiz through the FastAPI backend.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phaseIndex = 1, phaseTitle = "Core Competency", skills = [], courseTopic, targetRole, locale = "en" } = body;

    // If constant is true, return the rich mock quiz directly
    if (USE_QUIZ_MOCK_DATA) {
      const mock = getMockQuizData({
        phaseIndex: Number(phaseIndex) || 1,
        phaseTitle,
        locale,
      });
      return NextResponse.json(mock);
    }

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
      console.warn("[phase-quiz] Failed to reach FastAPI endpoint, serving deterministic fallback:", apiErr);
    }

    // Local deterministic fallback using mock quiz data
    const fallbackQuiz = getMockQuizData({
      phaseIndex: Number(phaseIndex) || 1,
      phaseTitle,
      locale,
    });
    return NextResponse.json(fallbackQuiz);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
