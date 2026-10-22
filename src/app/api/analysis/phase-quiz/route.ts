import { NextRequest, NextResponse } from "next/server";
import { getFastApiConfig } from "@/lib/fastapi/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phaseIndex = 1, phaseTitle = "Core Competency", skills = [], courseTopic, targetRole, locale = "en" } = body;

    const fastApiConfig = getFastApiConfig();
    const endpoint = `${fastApiConfig.baseUrl}/api/v1/quiz/generate`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: fastApiConfig.headers,
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

    // Local deterministic fallback
    const expBase = phaseIndex === 1 ? 35 : phaseIndex === 2 ? 65 : 85;
    const expReward = Math.max(5, Math.min(100, Math.round(expBase / 5) * 5));

    const skillName = skills[0] || phaseTitle;
    const questions = Array.from({ length: 10 }).map((_, idx) => ({
      id: idx + 1,
      question: `In a production deployment implementing ${skillName}, what is the verified best practice for scenario #${idx + 1}?`,
      options: [
        `Apply automated validation and structured error handling for ${skillName}`,
        "Rely on unmonitored manual operational routines",
        "Bypass testing protocols and documentation",
        "Disable telemetry logging across pipeline nodes",
      ],
      correctIndex: 0,
      explanation: `Automated validation and structured error handling in ${skillName} ensures resilient execution and enterprise-grade reliability.`,
    }));

    return NextResponse.json({
      phaseIndex,
      phaseTitle,
      expReward,
      expDifficultyTier: `Phase ${phaseIndex} Mastery (${expReward} EXP)`,
      evaluationReason: `Cognitive audit for ${skillName} evaluated at ${expReward} EXP.`,
      passingScore: 10,
      questions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
