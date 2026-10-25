import { NextRequest, NextResponse } from "next/server";
import {
  getFastApiConfig,
  getFastApiTargets,
  fetchWithFastApiFallback,
} from "@/lib/fastapi/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";

/**
 * POST /api/page-analysis/analyze
 * Unified server-side proxy route communicating with FastAPI analyze microservices.
 * Supports progressive streaming, multi-phase synthesis persistence, and synchronous role analysis.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required for 'synthesize' action; optional for other actions.
 * - Query Parameters: None.
 * - Request Body:
 *   - action (optional): String ('stream' | 'synthesize'). Defaults to 'stream'.
 *   - sessionId (optional): String. Anonymous or authenticated session ID.
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Defaults to 'en'.
 *   - macroScenario (optional): String ('moderate' | 'accelerated_ai' | 'green_economy'). Defaults to 'moderate'.
 *   - profile (optional): Object. Formulated assessment profile.
 *   - targetRoleId (optional): String. Selected target role identifier.
 *   - userId (optional): String. Target user ID when acting under shared roadmap permissions.
 *
 * Workflow:
 * 1. Authenticate user and resolve session tokens.
 * 2. Route request dynamically based on requested action parameter.
 *    - Branch A: Stream role-matching telemetry via Server-Sent Events.
 *    - Branch B: Synthesize multi-phase roadmap and persist into database.
 *    - Branch C: Run synchronous role analysis proxy.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "stream";

    // ==========================================
    // Step 1: User Authentication and Token Resolution
    // ==========================================
    let authenticatedUserId: string | undefined;
    let newTokens: any = null;
    try {
      const auth = await getAuthenticatedUser();
      if (auth.user?.id) {
        authenticatedUserId = auth.user.id;
        newTokens = auth.newTokens;
      }
    } catch (authError) {
      console.warn("[/api/page-analysis/analyze] Session verification failed.", authError);
    }

    const config = getFastApiConfig();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");

    // ==========================================
    // Branch A: Stream Role-Matching Telemetry via Server-Sent Events
    // ==========================================
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
                  `[/api/page-analysis/analyze] FastAPI stream target '${target.tier}' failed with status ${response.status}${errorDetails}`
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

    // ==========================================
    // Branch B: Synthesize Multi-Phase Roadmap and Persist into Database
    // ==========================================
    if (action === "synthesize") {
      if (!authenticatedUserId) {
        return createUnauthorizedResponse();
      }

      let effectiveUserId = authenticatedUserId;
      if (body.userId && body.userId !== authenticatedUserId) {
        if (typeof body.userId !== "string") {
          return NextResponse.json(
            { success: false, error: "Invalid target user." },
            { status: 400 }
          );
        }

        const admin = createAdminClient();
        const { data: shareRecord } = await admin
          .from("shared_roadmaps")
          .select("id, roadmap_id")
          .eq("owner_id", body.userId)
          .eq("target_user_id", authenticatedUserId)
          .eq("access_level", "editable")
          .limit(1)
          .maybeSingle();

        let hasEditPermission = false;
        if (shareRecord) {
          if (shareRecord.roadmap_id) {
            const { data: targetRoadmap } = await admin
              .from("roadmaps")
              .select("id, status")
              .eq("id", shareRecord.roadmap_id)
              .maybeSingle();
            if (targetRoadmap?.status === "current") {
              hasEditPermission = true;
            }
          } else {
            hasEditPermission = true;
          }
        }

        if (!hasEditPermission) {
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

      const fastApiResponse = await fetchWithFastApiFallback(
        "/api/v1/analyze/synthesize-roadmap",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(forwardPayload),
        },
        { timeoutMs: 90_000 }
      );

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

          // Archive existing current roadmaps and create the new current plan
          const admin = createAdminClient();

          await admin
            .from("roadmaps")
            .update({ status: "history" })
            .eq("user_id", effectiveUserId)
            .eq("status", "current");

          const { data: createdRoadmap, error: roadmapInsertErr } = await admin
            .from("roadmaps")
            .insert({
              user_id: effectiveUserId,
              session_id: data.sessionId || `sess-${Date.now()}`,
              status: "current",
              target_role_id: String(data.targetRoleId || selectedRole.roleId || "custom-role"),
              target_role_title: roleTitle,
              target_title_localized: targetTitleLocalized,
              role_category: selectedRole.industry || "Target Horizon Role",
              description: `Targeting ${targetTitleLocalized.en} in ${
                selectedRole.industry || "emerging sectors"
              }. Aligned with UN ${finalSdgs.join(", ")}.`,
              description_localized: {
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
              match_score: matchScore,
              match_score_basis:
                selectedRole.scenarioMultiplierApplied > 1
                  ? "BGE-M3 Vector + Scenario Multiplier"
                  : "Soft Overlap + BGE-M3 Cosine",
              sdgs: finalSdgs,
              matched_strengths: matchedStrengths,
              matched_strengths_ms: matchedStrengthsLocalized.ms || [],
              matched_strengths_zh: matchedStrengthsLocalized.zh || [],
              matched_strengths_localized: matchedStrengthsLocalized,
              skills_gap: skillsGap,
              skills_gap_ms: skillsGapLocalized.ms || [],
              skills_gap_zh: skillsGapLocalized.zh || [],
              skills_gap_localized: skillsGapLocalized,
              at_risk_skills: atRiskSkills,
              at_risk_skills_ms: atRiskSkillsLocalized.ms || [],
              at_risk_skills_zh: atRiskSkillsLocalized.zh || [],
              at_risk_skills_localized: atRiskSkillsLocalized,
              total_weeks: totalWeeks,
              total_hours: totalHours,
              radar_data: data.radarData || [],
              top_roles: enrichedTopRoles,
            })
            .select()
            .single();

          if (roadmapInsertErr || !createdRoadmap) {
            throw new Error(roadmapInsertErr?.message || "Failed to insert roadmap into database.");
          }

          const phasesToInsert = phasesData.map((p: any) => ({
            roadmap_id: createdRoadmap.id,
            phase_index: p.phaseIndex,
            phase_title: p.phaseTitle,
            title_localized: p.titleLocalized,
            duration_weeks: p.durationWeeks,
            estimated_hours: p.estimatedHours,
            badge: p.badge || "",
            badge_type: p.badgeType || "",
            description: p.description,
            description_localized: p.descriptionLocalized,
            course_detail: p.detail,
            learning_objectives: p.learningObjectives,
            objectives_localized: p.objectivesLocalized,
            recommended_courses: p.recommendedCourses,
            is_completed: false,
          }));

          const { data: insertedPhases, error: phasesInsertErr } = await admin
            .from("roadmap_phases")
            .insert(phasesToInsert)
            .select();

          if (phasesInsertErr) {
            console.error("[/api/page-analysis/analyze] Error inserting roadmap phases:", phasesInsertErr);
          }

          const completeRoadmap = {
            ...createdRoadmap,
            phases: insertedPhases || [],
          };

          const response = NextResponse.json({
            ...data,
            createdRoadmapId: createdRoadmap.id,
            createdRoadmap: completeRoadmap,
          });
          return applyAuthCookies(response, newTokens);
        } catch (dbErr: any) {
          console.error("[/api/page-analysis/analyze] Error persisting roadmap to DB:", dbErr);
          const response = NextResponse.json({
            ...data,
            dbPersistError: dbErr?.message || "DB transaction failed",
          });
          return applyAuthCookies(response, newTokens);
        }
      }

      const response = NextResponse.json(data);
      return applyAuthCookies(response, newTokens);
    }

    // ==========================================
    // Branch C: Run Synchronous Role Analysis Proxy
    // ==========================================
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
    const response = NextResponse.json(data);
    return applyAuthCookies(response, newTokens);
  } catch (error: any) {
    console.error("[/api/page-analysis/analyze] Internal route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to communicate with analysis backend.",
      },
      { status: 500 }
    );
  }
}
