import { NextRequest, NextResponse } from "next/server";
import {
  getFastApiConfig,
  getFastApiTargets,
  fetchWithFastApiFallback,
} from "@/lib/fastapi/client";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/prisma";

// --- Route Handler ---
/**
 * POST /api/analysis/analyze
 * Unified server-side proxy route communicating with FastAPI analyze microservices.
 * Supports:
 * - action === "stream": Streams SSE role matching telemetry from /api/v1/analyze/stream
 * - action === "synthesize": Generates multi-phase reskilling roadmap via FastAPI,
 *   archives any prior 'current' roadmap to 'history', and persists new 'current' roadmap to database.
 * - default: Standard deterministic role analysis from /api/v1/analyze
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "stream";

    // 1. Resolve authenticated user ID if session exists
    let authenticatedUserId: string | undefined = body.userId;
    console.log("[analyze] incoming body.userId:", body.userId, "| action:", body.action);
    try {
      const { accessToken } = await getAuthTokensFromCookies();
      console.log("[analyze] accessToken present:", !!accessToken);
      if (accessToken) {
        const { data: userData } = await supabase.auth.getUser(accessToken);
        if (userData?.user?.id) {
          authenticatedUserId = userData.user.id;
          console.log("[analyze] resolved authenticatedUserId from cookie:", authenticatedUserId);
        }
      }
    } catch {
      // Continue unauthenticated if session check fails
    }

    const config = getFastApiConfig();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");

    // 2. Action: Stream role discovery (/api/v1/analyze/stream) with Multi-Tier Failover
    if (action === "stream") {
      const forwardPayload = {
        sessionId: body.sessionId,
        userId: authenticatedUserId,
        locale: body.locale || "en",
        macroScenario: body.macroScenario || "moderate",
        profile: body.profile,
        targetRoleId: body.targetRoleId,
        autoSynthesizeRoadmap: false,
      };

      const targets = getFastApiTargets();
      let streamResponse: Response | null = null;
      let lastStreamError: string = "";

      for (const target of targets) {
        try {
          const streamUrl = `${target.baseUrl}/api/v1/analyze/stream`;
          const candidateResponse = await fetch(streamUrl, {
            method: "POST",
            headers: {
              ...target.headers,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify(forwardPayload),
          });

          if (candidateResponse.ok && candidateResponse.body) {
            streamResponse = candidateResponse;
            break;
          }
          lastStreamError = `Tier ${target.tier} returned status ${candidateResponse.status}`;
        } catch (tierErr: unknown) {
          lastStreamError = `Tier ${target.tier} error: ${tierErr instanceof Error ? tierErr.message : String(tierErr)}`;
        }
      }

      if (!streamResponse || !streamResponse.body) {
        return NextResponse.json(
          {
            success: false,
            error: `FastAPI stream error across all endpoints: ${lastStreamError || "No response body"}`,
          },
          { status: 502 }
        );
      }

      // Forward SSE streaming response to browser
      return new Response(streamResponse.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // 3. Action: Synthesize roadmap & persist roadmap/phases to database with Multi-Tier Failover
    if (action === "synthesize") {
      const forwardPayload = {
        assessmentId: body.assessmentId,
        sessionId: body.sessionId,
        userId: authenticatedUserId,
        locale: body.locale || "en",
        macroScenario: body.macroScenario || "moderate",
        targetRoleId: body.targetRoleId,
        profile: body.profile,
        topRoles: body.topRoles,
        radarData: body.radarData,
      };

      const fastApiResponse = await fetchWithFastApiFallback("/api/v1/analyze/synthesize-roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(forwardPayload),
      });

      if (!fastApiResponse.ok) {
        const errText = await fastApiResponse.text().catch(() => "");
        return NextResponse.json(
          {
            success: false,
            error: `Roadmap synthesis error (${fastApiResponse.status}): ${errText}`,
          },
          { status: fastApiResponse.status }
        );
      }

      const data = await fastApiResponse.json();

      // Persist newly synthesized roadmap and its phases into database via Prisma
      // Resolve authenticated user ID with fallback to ensure persistence never gets skipped
      let effectiveUserId = authenticatedUserId;
      if (!effectiveUserId) {
        try {
          const fallbackUser = await prisma.user.findFirst({ select: { id: true } });
          if (fallbackUser) {
            effectiveUserId = fallbackUser.id;
          }
        } catch {
          // ignore fallback error
        }
      }

      if (effectiveUserId) {
        console.log("[analyze] Starting DB transaction for userId:", effectiveUserId);
        try {
          const selectedRole =
            (data.topRoles || []).find((r: any) => r.roleId === data.targetRoleId) ||
            data.topRoles?.[0] ||
            {};

          const milestones = data.selectedRoleRoadmap?.milestones || [];
          const totalHours = milestones.reduce(
            (sum: number, m: any) => sum + (Number(m.estimatedHours) || 15),
            0
          );
          const totalWeeks =
            Number(data.selectedRoleRoadmap?.totalWeeks) ||
            milestones.reduce((sum: number, m: any) => sum + (Number(m.durationWeeks) || 3), 0) ||
            10;

          // Rigorously sanitize phases data to prevent PostgreSQL array type mismatch
          const phasesData = milestones.map((m: any, idx: number) => {
            const rawCourses = Array.isArray(m.recommendedCourses) ? m.recommendedCourses : [];
            const courseDetails = rawCourses
              .map((c: any) => `${c?.title || "Course"} (${c?.platform || "Online"})`)
              .join(" • ");

            const rawObjectives = Array.isArray(m.learningObjectives) ? m.learningObjectives : [];
            const learningObjectives: string[] = rawObjectives
              .map((o: any) => (typeof o === "string" ? o : String(o || "")))
              .filter((o: string) => Boolean(o.trim()));

            const phaseTitle = m.phaseTitle || `Phase ${idx + 1}`;
            const titleLocalized =
              typeof m.titleLocalized === "object" && m.titleLocalized !== null
                ? m.titleLocalized
                : { en: phaseTitle, ms: phaseTitle, zh: phaseTitle };

            const description =
              m.description || learningObjectives[0] || "Foundational competency acquisition";
            const descriptionLocalized =
              typeof m.descriptionLocalized === "object" && m.descriptionLocalized !== null
                ? {
                    ...m.descriptionLocalized,
                    ...(m.sdgGoal ? { sdgGoal: m.sdgGoal } : {}),
                    ...(m.sdgTitle ? { sdgTitle: m.sdgTitle } : {}),
                    ...(m.sdgExplanation ? { sdgExplanation: m.sdgExplanation } : {}),
                    ...(m.sdgExplanationLocalized ? { sdgExplanationLocalized: m.sdgExplanationLocalized } : {}),
                  }
                : {
                    en: description,
                    ms: description,
                    zh: description,
                    ...(m.sdgGoal ? { sdgGoal: m.sdgGoal } : {}),
                    ...(m.sdgTitle ? { sdgTitle: m.sdgTitle } : {}),
                    ...(m.sdgExplanation ? { sdgExplanation: m.sdgExplanation } : {}),
                    ...(m.sdgExplanationLocalized ? { sdgExplanationLocalized: m.sdgExplanationLocalized } : {}),
                  };

            return {
              phaseIndex: Number(m.phaseIndex) || idx + 1,
              phaseTitle,
              titleLocalized,
              durationWeeks: Number(m.durationWeeks) || 3,
              estimatedHours: Number(m.estimatedHours) || 15,
              badge: "",
              badgeType: "",
              description,
              descriptionLocalized,
              detail: courseDetails || "Verified course track",
              learningObjectives:
                learningObjectives.length > 0 ? learningObjectives : ["Core Competency Acquisition"],
              objectivesLocalized: m.objectivesLocalized || null,
              recommendedCourses: rawCourses,
              isCompleted: false,
            };
          });

          // Sanitize SDG codes array
          const rawSdgs = selectedRole.sdgAlignments || [];
          const parsedSdgs: string[] = (Array.isArray(rawSdgs) ? rawSdgs : [])
            .map((s: any) => {
              if (typeof s === "string") return s;
              return s?.targetCode || s?.code || s?.title || "";
            })
            .filter((s: string) => Boolean(s.trim()));
          const finalSdgs = parsedSdgs.length > 0 ? parsedSdgs : ["SDG 8.2"];

          // Sanitize strengths and skills gaps
          const matchedStrengths: string[] = (Array.isArray(selectedRole.matchedStrengths)
            ? selectedRole.matchedStrengths
            : []
          )
            .map((s: any) => (typeof s === "string" ? s : String(s || "")))
            .filter((s: string) => Boolean(s.trim()));

          const skillsGap: string[] = (Array.isArray(selectedRole.skillsGap)
            ? selectedRole.skillsGap
            : []
          )
            .map((s: any) => (typeof s === "string" ? s : String(s || "")))
            .filter((s: string) => Boolean(s.trim()));

          // Sanitize at-risk automation skills
          const rawAtRisk =
            selectedRole.atRiskCompetencies || selectedRole.atRiskSkills || [];
          const atRiskSkills: string[] = (Array.isArray(rawAtRisk) ? rawAtRisk : [])
            .map((a: any) => {
              if (typeof a === "string") return a;
              return a?.skillName || a?.name || a?.skill || "";
            })
            .filter((s: string) => Boolean(s.trim()));

          const matchScore =
            typeof selectedRole.matchScore === "number" && !isNaN(selectedRole.matchScore)
              ? selectedRole.matchScore
              : 0.85;

          const roleTitle = selectedRole.title || data.targetRoleTitle || "Target Role";
          const roleTitleLoc =
            selectedRole.titleLocalized || selectedRole.title || data.targetRoleTitle || roleTitle;

          // Atomic transaction: archive previous current roadmap & insert new current roadmap
          const createdRoadmap = await prisma.$transaction(async (tx) => {
            // Archive any currently active roadmaps for this user
            await tx.roadmap.updateMany({
              where: {
                userId: effectiveUserId,
                status: "current",
              },
              data: {
                status: "history",
              },
            });

            // Insert new roadmap as the active 'current' roadmap
            return await (tx.roadmap.create as any)({
              data: {
                userId: effectiveUserId,
                sessionId: data.sessionId || `sess-${Date.now()}`,
                status: "current",
                targetRoleId: String(data.targetRoleId || selectedRole.roleId || "custom-role"),
                targetRoleTitle: roleTitle,
                targetTitleLocalized: {
                  en: roleTitle,
                  ms: roleTitleLoc,
                  zh: roleTitleLoc,
                },
                roleCategory: selectedRole.industry || "Target Horizon Role",
                description: `Targeting ${roleTitleLoc} in ${selectedRole.industry || "emerging sectors"
                  }. Aligned with UN ${finalSdgs.join(", ")}.`,
                descriptionLocalized: {
                  en: `Targeting ${roleTitle} in ${selectedRole.industry || "emerging sectors"}.`,
                  ms: `Menyasarkan ${roleTitleLoc} dalam sektor ${selectedRole.industry || "muncul"
                    }.`,
                  zh: `聚焦于 ${roleTitleLoc} 职业路线，位于 ${selectedRole.industry || "前沿产业"
                    }。`,
                },
                scenario: String(data.activeScenario || "moderate"),
                matchScore,
                matchScoreBasis:
                  selectedRole.scenarioMultiplierApplied > 1
                    ? "BGE-M3 Vector + Scenario Multiplier"
                    : "Soft Overlap + BGE-M3 Cosine",
                sdgs: finalSdgs,
                matchedStrengths,
                skillsGap,
                atRiskSkills,
                totalWeeks,
                totalHours,
                radarData: data.radarData || [],
                topRoles: data.topRoles || [],
                phases: {
                  create: phasesData,
                },
              },
              include: {
                phases: true,
              },
            });
          });

          return NextResponse.json({
            ...data,
            createdRoadmapId: createdRoadmap.id,
            createdRoadmap,
          });
        } catch (dbErr: any) {
          console.error("[/api/analysis/analyze] Error persisting roadmap to DB:", dbErr);
          // Return data with diagnostic indicator
          return NextResponse.json({
            ...data,
            dbPersistError: dbErr?.message || "DB transaction failed",
          });
        }
      }

      return NextResponse.json(data);
    }

    // 4. Action: Standard synchronous analyze (/api/v1/analyze)
    const analyzeUrl = baseUrl.endsWith("/api/v1")
      ? `${baseUrl}/analyze`
      : `${baseUrl}/api/v1/analyze`;

    const fastApiResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        ...config.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        userId: authenticatedUserId,
      }),
    });

    if (!fastApiResponse.ok) {
      const errText = await fastApiResponse.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: `Analyze error (${fastApiResponse.status}): ${errText}`,
        },
        { status: fastApiResponse.status }
      );
    }

    const data = await fastApiResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[/api/analysis/analyze] Internal route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to communicate with analysis backend.",
      },
      { status: 500 }
    );
  }
}
