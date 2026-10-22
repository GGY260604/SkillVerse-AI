import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createUnauthorizedResponse } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/supabase/prisma";
import { fetchWithFastApiFallback } from "@/app/api/_lib/fastapi/client";

/**
 * POST /api/shared/heatmap
 * Body:
 * {
 *   targetRoleTitle: string,
 *   userIds: string[],
 *   locale: string
 * }
 *
 * Gathers user profiles and skills for the requested cohort,
 * calls FastAPI /api/v1/analyze/team-matrix, and returns the response.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { targetRoleTitle, userIds = [], locale = "en" } = body;

    if (!targetRoleTitle || typeof targetRoleTitle !== "string" || !targetRoleTitle.trim()) {
      return NextResponse.json(
        { success: false, error: "Target role title is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one user must be selected." },
        { status: 400 }
      );
    }

    // 1. Fetch user records from database including skills
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        currentJobTitle: true,
        industry: true,
        skills: true,
      },
    });

    // Also fetch their active roadmaps to extract pre-analyzed strengths/gaps if available
    const activeRoadmaps = await prisma.roadmap.findMany({
      where: {
        userId: { in: userIds },
        status: "current",
      },
      select: {
        userId: true,
        matchedStrengths: true,
        skillsGap: true,
        targetRoleTitle: true,
      },
    });

    const roadmapMap = new Map<string, any>();
    activeRoadmaps.forEach((r) => {
      if (r.userId) roadmapMap.set(r.userId, r);
    });

    // 2. Format teamMembers array matching TeamMemberInput schema
    const teamMembers = users.map((u) => {
      let parsedSkills: any[] = [];
      if (Array.isArray(u.skills)) {
        parsedSkills = u.skills;
      } else if (typeof u.skills === "string") {
        try {
          parsedSkills = JSON.parse(u.skills);
        } catch {
          parsedSkills = [];
        }
      }

      // Normalize skills format
      const normalizedSkills = parsedSkills.map((s: any) => ({
        name: typeof s === "string" ? s : s.name || s.skillName || "",
        proficiency: typeof s === "object" && s.proficiency ? s.proficiency : "intermediate",
        category: typeof s === "object" ? s.category : undefined,
        verified: typeof s === "object" ? s.verified : undefined,
      })).filter((s) => Boolean(s.name));

      const rMap = roadmapMap.get(u.id);

      return {
        userId: u.id,
        name: u.name || u.email.split("@")[0] || "User",
        email: u.email,
        currentRole: u.currentJobTitle || rMap?.targetRoleTitle || "Professional",
        department: u.industry || "Technology",
        skills: normalizedSkills,
        matchedStrengths: rMap?.matchedStrengths || [],
        skillsGap: rMap?.skillsGap || [],
      };
    });

    // 3. Call FastAPI Backend /api/v1/analyze/team-matrix
    const fastApiPayload = {
      targetRoleTitle: targetRoleTitle.trim(),
      teamMembers,
      locale,
      macroScenario: "moderate",
    };

    const fastApiResponse = await fetchWithFastApiFallback(
      "/api/v1/analyze/team-matrix",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fastApiPayload),
      },
      { timeoutMs: 30000 }
    );

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text();
      console.error("[/api/shared/heatmap] FastAPI team-matrix returned error:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to evaluate workforce skill matrix with backend service.",
          details: errorText,
        },
        { status: fastApiResponse.status }
      );
    }

    const matrixData = await fastApiResponse.json();

    return NextResponse.json({
      success: true,
      data: matrixData,
    });
  } catch (error: any) {
    console.error("[/api/shared/heatmap] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
