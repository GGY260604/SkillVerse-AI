import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";
import { formatRoadmapToPlanData } from "@/lib/roadmapFormat";

export interface FetchUserRoadmapsOptions {
  userId: string;
  scope?: "all" | "current";
  includePhases?: boolean;
}

/**
 * fetchUserRoadmapData
 * Shared core helper to fetch roadmaps for a given user.
 * Supports scope ('all' or 'current') and toggleable roadmap phase loading.
 *
 * Parameters (options):
 * - userId (required): String (UUID). User whose roadmaps are being retrieved.
 * - scope (optional): 'all' | 'current'. Scope of roadmaps to fetch. Defaults to 'all'.
 * - includePhases (optional): Boolean. Whether to load roadmap_phases. Defaults to true.
 *
 * Workflow:
 * 1. Query roadmaps with optional phases from database.
 * 2. Resolve role multilingual titles from ESCO taxonomy.
 * 3. Format active current roadmap and history records.
 */
export async function fetchUserRoadmapData(options: FetchUserRoadmapsOptions) {
  const { userId, scope = "all", includePhases = true } = options;
  const admin = createAdminClient();

  // ==========================================
  // Step 1: Query Roadmaps with Optional Phases
  // ==========================================
  const selectQuery = includePhases
    ? "*, phases:roadmap_phases(*)"
    : "*";

  let query = (admin as any)
    .from("roadmaps")
    .select(selectQuery)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (scope === "current") {
    query = query.eq("status", "current").limit(1);
  }

  const { data: dbRoadmaps, error: roadmapErr } = await query;
  if (roadmapErr) {
    throw new Error(roadmapErr.message);
  }

  let roadmaps: any[] = (dbRoadmaps as any[]) || [];

  if (scope === "current" && roadmaps.length === 0) {
    const { data: fallbackRoadmaps } = await (admin as any)
      .from("roadmaps")
      .select(selectQuery)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    roadmaps = (fallbackRoadmaps as any[]) || [];
  }

  if (roadmaps.length === 0) {
    return {
      currentPlan: null,
      historyPlans: [],
    };
  }

  // ==========================================
  // Step 2: Resolve Role Multilingual Titles from ESCO
  // ==========================================
  const roleIdSet = new Set<string>();
  roadmaps.forEach((r: any) => {
    const rid = r.targetRoleId || r.target_role_id;
    if (rid) roleIdSet.add(String(rid));
  });

  const escoMap = new Map<string, { en: string; ms: string; zh: string }>();
  if (roleIdSet.size > 0) {
    const { data: escoRoles } = await admin
      .from("esco_roles")
      .select("role_id, title, title_ms, title_zh")
      .in("role_id", Array.from(roleIdSet));

    (escoRoles || []).forEach((er: any) => {
      const loc = { en: er.title, ms: er.title_ms, zh: er.title_zh };
      const rawId = er.role_id.toLowerCase().trim();
      escoMap.set(rawId, loc);
      escoMap.set(rawId.replace(/^role-/, ""), loc);
      escoMap.set(er.title.toLowerCase().trim(), loc);
    });
  }

  const resolveLocalization = (roleId?: string, roleTitle?: string, existing?: any) => {
    const rId = (roleId || "").toLowerCase().trim();
    const rTitle = (roleTitle || "").toLowerCase().trim();
    const match = escoMap.get(rId) || escoMap.get(rId.replace(/^role-/, "")) || escoMap.get(rTitle);
    return {
      en: match?.en || existing?.en || roleTitle || "Professional",
      ms: match?.ms || existing?.ms || match?.en || roleTitle || "Professional",
      zh: match?.zh || existing?.zh || match?.en || roleTitle || "Professional",
    };
  };

  // ==========================================
  // Step 3: Format Active Current Roadmap and History Records
  // ==========================================
  const currentRoadmapRecord =
    roadmaps.find((r: any) => r.status === "current") || roadmaps[0];

  const targetRoleId = currentRoadmapRecord.targetRoleId || currentRoadmapRecord.target_role_id || "";
  const targetRoleTitle = currentRoadmapRecord.targetRoleTitle || currentRoadmapRecord.target_role_title || "";
  const currentLoc = resolveLocalization(
    targetRoleId,
    targetRoleTitle,
    currentRoadmapRecord.targetTitleLocalized || currentRoadmapRecord.target_title_localized
  );

  const currentPlan = {
    ...formatRoadmapToPlanData({
      ...currentRoadmapRecord,
      targetTitleLocalized: currentLoc,
    }),
    targetRoleId,
    targetTitleLocalized: currentLoc,
    isCurrent: true,
  };

  let historyPlans: any[] = [];
  if (scope === "all") {
    historyPlans = roadmaps
      .filter((r: any) => r.id !== currentRoadmapRecord.id)
      .map((hr: any) => {
        const hrRoleId = hr.targetRoleId || hr.target_role_id || "";
        const hrTitle = hr.targetRoleTitle || hr.target_role_title || "";
        const hrLoc = resolveLocalization(
          hrRoleId,
          hrTitle,
          hr.targetTitleLocalized || hr.target_title_localized
        );
        return {
          ...formatRoadmapToPlanData({
            ...hr,
            targetTitleLocalized: hrLoc,
          }),
          targetRoleId: hrRoleId,
          targetTitleLocalized: hrLoc,
          isCurrent: false,
        };
      });
  }

  return {
    currentPlan,
    historyPlans,
  };
}

/**
 * GET /api/page-shared/roadmaps
 * Dedicated endpoint for deep roadmap retrieval.
 * Supports configurable scopes and phase inclusion options.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters:
 *   - userId / ownerId (optional): String (UUID). Specific peer ID whose roadmaps will be retrieved.
 *   - scope (optional): String ('all' | 'current'). Scope of roadmaps to load. Defaults to 'all'.
 *   - includePhases (optional): String ('true' | 'false'). Whether to include course roadmap phases. Defaults to 'true'.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Branch A: Specific peer user roadmaps (targetUserId provided).
 * 3. Branch B: Batch detailed roadmaps (all peers sharing with current user).
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const currentUserId = user.id;

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || searchParams.get("ownerId");
    const scope = (searchParams.get("scope") || "all").toLowerCase() as "all" | "current";
    const includePhases = searchParams.get("includePhases") !== "false";

    // ==========================================
    // Branch A: Specific Peer User Roadmaps
    // ==========================================
    if (targetUserId) {
      const roadmapData = await fetchUserRoadmapData({
        userId: targetUserId,
        scope,
        includePhases,
      });

      return NextResponse.json({
        success: true,
        userId: targetUserId,
        scope,
        includePhases,
        currentPlan: roadmapData.currentPlan,
        historyPlans: roadmapData.historyPlans,
      });
    }

    // ==========================================
    // Branch B: Batch Detailed Roadmaps
    // ==========================================
    const admin = createAdminClient();
    const { data: dbShares, error: shareErr } = await admin
      .from("shared_roadmaps")
      .select("id, owner_id, target_user_id, access_level, created_at, updated_at")
      .eq("target_user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (shareErr) {
      return NextResponse.json({ success: false, error: shareErr.message }, { status: 400 });
    }

    if (!dbShares || dbShares.length === 0) {
      return NextResponse.json({
        success: true,
        sharedRoadmaps: [],
      });
    }

    const ownerIds = Array.from(new Set(dbShares.map((s) => s.owner_id).filter(Boolean)));

    const detailedRoadmaps = await Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const userPlans = await fetchUserRoadmapData({
            userId: ownerId,
            scope,
            includePhases,
          });

          return {
            ownerId,
            currentPlan: userPlans.currentPlan,
            historyPlans: userPlans.historyPlans,
          };
        } catch (err: unknown) {
          console.warn(`[/api/page-shared/roadmaps] Failed to fetch roadmaps for peer ${ownerId}:`, err);
          return {
            ownerId,
            currentPlan: null,
            historyPlans: [],
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      sharedRoadmaps: detailedRoadmaps,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/page-shared/roadmaps GET] Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
