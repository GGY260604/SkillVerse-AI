import { NextRequest, NextResponse } from "next/server";
import {
  getFastApiConfig,
  getFastApiTargets,
  fetchWithFastApiFallback,
} from "@/app/api/_lib/fastapi/client";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/supabase/prisma";

// --- Route Handler ---
/**
 * POST /api/analysis/analyze.
 * Unified server-side proxy route communicating with FastAPI analyze microservices.
 * Supported actions:
 * - `stream`: Streams role-matching telemetry from `/api/v1/analyze/stream`.
 * - `synthesize`: Generates a multi-phase reskilling roadmap through FastAPI,
 *   archives prior `current` roadmaps to `history`, and persists the new `current` roadmap.
 * - Default: Runs standard role analysis through `/api/v1/analyze`.
 *
 * Synthesis flow:
 * 1. Resolve the session user, then request a roadmap for the selected role from FastAPI.
 * 2. Normalize generated milestones, role metrics, and localized content for database fields.
 * 3. In one transaction, archive current roadmaps and insert the new current roadmap with its phases.
 * 4. Return the created roadmap to the client, which refreshes the analysis page from storage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "stream";

    // 1. Resolve the authenticated user ID for service requests and database ownership.
    let authenticatedUserId: string | undefined;
    try {
      const { accessToken } = await getAuthTokensFromCookies();
      if (accessToken) {
        const { data: userData } = await supabase.auth.getUser(accessToken);
        if (userData?.user?.id) {
          authenticatedUserId = userData.user.id;
        }
      }
    } catch (authError) {
      console.warn("[/api/analysis/analyze] Session verification failed.", authError);
    }

    const config = getFastApiConfig();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");

    // 2. Stream role discovery results to the client for progressive progress updates.
    if (action === "stream") {
      const streamIdleTimeoutMs = 90_000;
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
      let activeAttempt: AbortController | null = null;
      let clientDisconnected = false;
      const encoder = new TextEncoder();

      const responseBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          let lastStreamError = "No endpoint returned a completed matching result.";

          for (const target of targets) {
            if (clientDisconnected || request.signal.aborted) break;

            const attemptController = new AbortController();
            activeAttempt = attemptController;
            let timedOut = false;
            let idleTimer: ReturnType<typeof setTimeout> | undefined;
            const abortWithClient = () => attemptController.abort();
            const resetIdleTimer = () => {
              if (idleTimer) clearTimeout(idleTimer);
              idleTimer = setTimeout(() => {
                timedOut = true;
                attemptController.abort();
              }, streamIdleTimeoutMs);
            };
            request.signal.addEventListener("abort", abortWithClient, { once: true });

            try {
              resetIdleTimer();
              const streamUrl = `${target.baseUrl}/api/v1/analyze/stream`;
              const response = await fetch(streamUrl, {
                method: "POST",
                headers: {
                  ...target.headers,
                  "Content-Type": "application/json",
                  Accept: "text/event-stream",
                },
                body: JSON.stringify(forwardPayload),
                signal: attemptController.signal,
              });

              if (!response.ok || !response.body) {
                let errorDetails = "";
                try {
                  const errorText = await response.text();
                  errorDetails = errorText ? `: ${errorText}` : "";
                } catch {
                  // ignore
                }
                console.error(
                  `[/api/analysis/analyze] FastAPI stream target '${target.tier}' failed with status ${response.status}${errorDetails}`
                );
                lastStreamError = `Tier ${target.tier} returned status ${response.status}${errorDetails}`;
                void response.body?.cancel().catch(() => {});
                continue;
              }

              const reader = response.body.getReader();
              const decoder = new TextDecoder("utf-8");
              let buffer = "";
              let completed = false;
              let tierFailed = false;

              const processEvent = (event: string): "continue" | "complete" | "failed" => {
                const data = event
                  .split(/\r?\n/)
                  .filter((line) => line.startsWith("data:"))
                  .map((line) => line.slice(5).trimStart())
                  .join("\n");

                if (!data.trim()) {
                  if (!clientDisconnected) controller.enqueue(encoder.encode(`${event}\n\n`));
                  return "continue";
                }

                let parsed: { error?: unknown; errorCode?: unknown; result?: unknown };
                try {
                  parsed = JSON.parse(data);
                } catch {
                  lastStreamError = `Tier ${target.tier} returned invalid SSE data.`;
                  return "failed";
                }

                if (parsed.error) {
                  const detail =
                    typeof parsed.error === "string" ? parsed.error : "The matching service returned an error.";
                  const errorCode =
                    typeof parsed.errorCode === "string" ? ` (${parsed.errorCode})` : "";
                  lastStreamError = `Tier ${target.tier} failed: ${detail}${errorCode}`;
                  return "failed";
                }

                resetIdleTimer();
                if (!clientDisconnected) controller.enqueue(encoder.encode(`${event}\n\n`));
                if (parsed.result) return "complete";
                return "continue";
              };

              while (!clientDisconnected && !request.signal.aborted) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split(/\r?\n\r?\n/);
                buffer = events.pop() || "";

                for (const event of events) {
                  const eventStatus = processEvent(event);
                  if (eventStatus === "complete") {
                    completed = true;
                    break;
                  }
                  if (eventStatus === "failed") {
                    tierFailed = true;
                    break;
                  }
                }

                if (completed || tierFailed) break;
              }

              if (!completed && !tierFailed && !clientDisconnected && !request.signal.aborted) {
                buffer += decoder.decode();
                if (buffer.trim()) {
                  const eventStatus = processEvent(buffer);
                  completed = eventStatus === "complete";
                  tierFailed = eventStatus === "failed";
                }
              }

              if (completed) {
                void reader.cancel().catch(() => {});
                if (!clientDisconnected) controller.close();
                return;
              }

              if (!tierFailed && !clientDisconnected && !request.signal.aborted) {
                lastStreamError = timedOut
                  ? `Tier ${target.tier} timed out after ${streamIdleTimeoutMs / 1000} seconds without progress.`
                  : `Tier ${target.tier} stream ended without a matching result.`;
              }
              void reader.cancel().catch(() => {});
            } catch (tierError: unknown) {
              if (request.signal.aborted || clientDisconnected) break;
              lastStreamError = timedOut
                ? `Tier ${target.tier} timed out after ${streamIdleTimeoutMs / 1000} seconds without progress.`
                : `Tier ${target.tier} error: ${tierError instanceof Error ? tierError.message : String(tierError)}`;
            } finally {
              if (idleTimer) clearTimeout(idleTimer);
              request.signal.removeEventListener("abort", abortWithClient);
              if (activeAttempt === attemptController) activeAttempt = null;
            }
          }

          if (!clientDisconnected && request.signal.aborted) {
            controller.close();
            return;
          }

          if (clientDisconnected) return;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                phase: -1,
                error: `FastAPI stream failed across all configured endpoints: ${lastStreamError}`,
                errorCode: "ROLE_MATCHING_FAILED",
              })}\n\n`
            )
          );
          controller.close();
        },
        cancel() {
          clientDisconnected = true;
          activeAttempt?.abort();
        },
      });

      return new Response(responseBody, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // 3. Synthesize the selected role's roadmap, then persist it with its phases.
    if (action === "synthesize") {
      if (!authenticatedUserId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      let effectiveUserId = authenticatedUserId;
      if (body.userId && body.userId !== authenticatedUserId) {
        if (typeof body.userId !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid target user." },
            { status: 400 }
          );
        }

        const editPermission = await prisma.sharedRoadmap.findFirst({
          where: {
            ownerId: body.userId,
            targetUserId: authenticatedUserId,
            accessLevel: "editable",
            roadmap: { status: "current" },
          },
          select: { id: true },
        });

        if (!editPermission) {
          return NextResponse.json(
            { success: false, error: "Forbidden: No edit permission for this user's roadmap." },
            { status: 403 }
          );
        }

        effectiveUserId = body.userId;
      }

      const forwardPayload = {
        assessmentId: body.assessmentId,
        sessionId: body.sessionId,
        userId: effectiveUserId,
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

      if (effectiveUserId) {
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
          const rawRoleTitleLoc =
            selectedRole.titleLocalized || selectedRole.title || data.targetRoleTitle || roleTitle;

          // Compute complete trilingual representations for terms
          const targetTitleLocalized =
            typeof rawRoleTitleLoc === "object" && rawRoleTitleLoc?.zh
              ? rawRoleTitleLoc
              : {
                  en: roleTitle,
                  ms: typeof rawRoleTitleLoc === "string" ? rawRoleTitleLoc : roleTitle,
                  zh: typeof rawRoleTitleLoc === "string" ? rawRoleTitleLoc : roleTitle,
                };

          const matchedStrengthsLocalized =
            selectedRole.matchedStrengthsLocalized || {
              en: matchedStrengths,
              ms: selectedRole.matchedStrengthsMs || matchedStrengths,
              zh: selectedRole.matchedStrengthsZh || matchedStrengths,
            };

          const skillsGapLocalized =
            selectedRole.skillsGapLocalized || {
              en: skillsGap,
              ms: selectedRole.skillsGapMs || skillsGap,
              zh: selectedRole.skillsGapZh || skillsGap,
            };

          const atRiskSkillsLocalized =
            selectedRole.atRiskSkillsLocalized || {
              en: atRiskSkills,
              ms: selectedRole.atRiskSkillsMs || atRiskSkills,
              zh: selectedRole.atRiskSkillsZh || atRiskSkills,
            };

          const enrichedTopRoles = (data.topRoles || []).map((tr: any) => ({
            ...tr,
            matchedStrengthsLocalized:
              tr.matchedStrengthsLocalized || {
                en: tr.matchedStrengths || [],
                ms: tr.matchedStrengthsMs || tr.matchedStrengths || [],
                zh: tr.matchedStrengthsZh || tr.matchedStrengths || [],
              },
            skillsGapLocalized:
              tr.skillsGapLocalized || {
                en: tr.skillsGap || [],
                ms: tr.skillsGapMs || tr.skillsGap || [],
                zh: tr.skillsGapZh || tr.skillsGap || [],
              },
            atRiskSkillsLocalized:
              tr.atRiskSkillsLocalized || {
                en: (tr.atRiskCompetencies || []).map((a: any) => (typeof a === "string" ? a : a.skillName)),
                ms: (tr.atRiskCompetencies || []).map((a: any) => (typeof a === "string" ? a : a.skillName)),
                zh: (tr.atRiskCompetencies || []).map((a: any) => (typeof a === "string" ? a : a.skillName)),
              },
          }));

          // 4. Atomically archive the existing current roadmap(s) and create the new current plan.
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
                targetTitleLocalized,
                roleCategory: selectedRole.industry || "Target Horizon Role",
                description: `Targeting ${targetTitleLocalized.en} in ${
                  selectedRole.industry || "emerging sectors"
                }. Aligned with UN ${finalSdgs.join(", ")}.`,
                descriptionLocalized: {
                  en: `Targeting ${targetTitleLocalized.en} in ${
                    selectedRole.industry || "emerging sectors"
                  }.`,
                  ms: `Menyasarkan ${targetTitleLocalized.ms} dalam sektor ${
                    selectedRole.industry || "muncul"
                  }.`,
                  zh: `聚焦于 ${targetTitleLocalized.zh} 职业路线，位于 ${
                    selectedRole.industry || "前沿产业"
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
                matchedStrengthsMs: matchedStrengthsLocalized.ms || [],
                matchedStrengthsZh: matchedStrengthsLocalized.zh || [],
                matchedStrengthsLocalized,
                skillsGap,
                skillsGapMs: skillsGapLocalized.ms || [],
                skillsGapZh: skillsGapLocalized.zh || [],
                skillsGapLocalized,
                atRiskSkills,
                atRiskSkillsMs: atRiskSkillsLocalized.ms || [],
                atRiskSkillsZh: atRiskSkillsLocalized.zh || [],
                atRiskSkillsLocalized,
                totalWeeks,
                totalHours,
                radarData: data.radarData || [],
                topRoles: enrichedTopRoles,
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
