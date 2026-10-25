import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createUnauthorizedResponse } from "@/lib/supabase/cookies";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWithFastApiFallback } from "@/lib/fastapi/client";
import { fetchUserProfilesBatch } from "@/app/api/profile/profileService";

/**
 * GET /api/page-shared/heatmap
 * Retrieves standardized ESCO roles catalog for heatmap competency comparison.
 * Supports multilingual translations (en, ms, zh) and optional search filtering.
 *
 * Request Requirements:
 * - Authentication: None (public reference taxonomy).
 * - Query Parameters:
 *   - search (optional): String. Filter roles by title (in EN, MS, or ZH) or role ID.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Parse search query parameters.
 * 2. Query ESCO roles from Supabase.
 * 3. Format roles and return response.
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Parse Search Query Parameters
    // ==========================================
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get("search") || "").trim();

    // ==========================================
    // Step 2: Query ESCO Roles from Database
    // ==========================================
    let query = admin
      .from("esco_roles")
      .select("role_id, title, title_ms, title_zh, industry")
      .order("title", { ascending: true });

    if (searchQuery) {
      query = query.or(
        `title.ilike.%${searchQuery}%,title_ms.ilike.%${searchQuery}%,title_zh.ilike.%${searchQuery}%,role_id.ilike.%${searchQuery}%`
      );
    }

    const { data: roles, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 3: Format Roles and Return Response
    // ==========================================
    const formattedRoles = (roles || []).map((r) => ({
      roleId: r.role_id,
      title: r.title,
      titleMs: r.title_ms,
      titleZh: r.title_zh,
      industry: r.industry,
    }));

    return NextResponse.json({
      success: true,
      roles: formattedRoles,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load ESCO roles.";
    console.error("[/api/page-shared/heatmap GET] Error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/page-shared/heatmap
 * Evaluates workforce skill matrix and gap analysis across selected peers.
 * Gathers user profiles and skills, calls FastAPI /api/v1/analyze/team-matrix, and returns matrix response.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body (JSON):
 *   - targetRoleTitle (required): String. Target role title or ESCO role title to compare against.
 *   - userIds (required): String[] (UUIDs). Array of selected peer user IDs (at least 1 user).
 *   - locale (optional): String ('en' | 'ms' | 'zh'). Language code for localized analysis. Defaults to 'en'.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Validate payload parameters.
 * 3. Query users and active roadmaps via profile service.
 * 4. Resolve canonical role title and format team members.
 * 5. Execute FastAPI team matrix analysis.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // ==========================================
    // Step 2: Payload Validation
    // ==========================================
    const body = await request.json().catch(() => ({}));
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

    const admin = createAdminClient();

    // ==========================================
    // Step 3: Query Users and Active Roadmaps
    // ==========================================
    const profileResult = await fetchUserProfilesBatch({
      userIds,
      currentUserId: user.id,
      admin,
    });

    if (!profileResult.success) {
      return NextResponse.json(
        { success: false, error: profileResult.error },
        { status: 400 }
      );
    }

    const users = profileResult.users;

    const { data: activeRoadmaps, error: roadmapErr } = await admin
      .from("roadmaps")
      .select("user_id, matched_strengths, skills_gap, target_role_title, target_role_id")
      .in("user_id", userIds)
      .eq("status", "current");

    if (roadmapErr) {
      console.warn("[/api/page-shared/heatmap POST] Could not fetch active roadmaps:", roadmapErr.message);
    }

    const roadmapMap = new Map<string, any>();
    (activeRoadmaps || []).forEach((r: any) => {
      if (r.user_id) roadmapMap.set(r.user_id, r);
    });

    // ==========================================
    // Step 4: Resolve Canonical Role Title and Format Team Members
    // ==========================================
    let canonicalRoleTitle = targetRoleTitle.trim();
    const { data: matchedRoles } = await admin
      .from("esco_roles")
      .select("role_id, title, title_ms, title_zh")
      .or(
        `title.ilike.%${canonicalRoleTitle}%,title_ms.ilike.%${canonicalRoleTitle}%,title_zh.ilike.%${canonicalRoleTitle}%,role_id.ilike.%${canonicalRoleTitle}%`
      )
      .limit(1);

    if (matchedRoles && matchedRoles.length > 0) {
      canonicalRoleTitle = matchedRoles[0].title;
    }

    const teamMembers = (users || []).map((u: any) => {
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

      const normalizedSkills = parsedSkills
        .map((s: any) => ({
          name: typeof s === "string" ? s : s.name || s.skillName || "",
          proficiency: typeof s === "object" && s.proficiency ? s.proficiency : "intermediate",
          category: typeof s === "object" ? s.category : undefined,
          verified: typeof s === "object" ? s.verified : undefined,
        }))
        .filter((s: any) => Boolean(s.name));

      const rMap = roadmapMap.get(u.id);

      return {
        userId: u.id,
        name: u.name || u.email?.split("@")[0] || "User",
        email: u.email,
        currentRole: u.currentJobTitle || rMap?.target_role_title || rMap?.targetRoleTitle || "Professional",
        department: u.industry || "Technology",
        skills: normalizedSkills,
        matchedStrengths: rMap?.matched_strengths || rMap?.matchedStrengths || [],
        skillsGap: rMap?.skills_gap || rMap?.skillsGap || [],
      };
    });

    // ==========================================
    // Step 5: Execute FastAPI Team Matrix Analysis
    // ==========================================
    const fastApiPayload = {
      targetRoleTitle: canonicalRoleTitle,
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
      { timeoutMs: 90_000 }
    );

    if (!fastApiResponse.ok) {
      const errorText = await fastApiResponse.text();
      console.error("[/api/page-shared/heatmap] FastAPI team-matrix returned error:", errorText);
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
    console.error("[/api/page-shared/heatmap POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
