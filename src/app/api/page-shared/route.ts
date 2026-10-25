import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";
import { formatRoadmapToPlanData } from "@/lib/roadmapFormat";
import { fetchUserProfilesBatch } from "@/app/api/profile/profileService";

/**
 * GET /api/page-shared
 * Retrieves peer user cards shared with the currently authenticated user.
 * Loads active current roadmap summary without phases for lightweight loading.
 * Combines ESCO role multilingual taxonomy directly within this endpoint.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters:
 *   - search (optional): String. Filter peer cards by name, email, user ID, role, or department.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Query shared grants from Supabase.
 * 3. Fetch owner profiles in batch via profile service.
 * 4. Query active current roadmaps and resolve multilingual roles.
 * 5. Search and filter by profile identity or role.
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
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();
    const admin = createAdminClient();

    // ==========================================
    // Step 2: Query Shared Grants from Database
    // ==========================================
    const { data: dbShares, error: shareErr } = await admin
      .from("shared_roadmaps")
      .select("id, owner_id, target_user_id, access_level, created_at, updated_at")
      .eq("target_user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (shareErr) {
      return NextResponse.json(
        { success: false, error: shareErr.message },
        { status: 400 }
      );
    }

    if (!dbShares || dbShares.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        sharedRoadmaps: [],
      });
    }

    // Deduplicate shares by owner ID so each peer only has one card.
    const shareMap = new Map<string, any>();
    dbShares.forEach((s) => {
      if (s.owner_id && !shareMap.has(s.owner_id)) {
        shareMap.set(s.owner_id, s);
      }
    });

    const ownerIds = Array.from(shareMap.keys());

    // ==========================================
    // Step 3: Fetch Owner Profiles in Batch via Profile Service
    // ==========================================
    const profileResult = await fetchUserProfilesBatch({
      userIds: ownerIds,
      currentUserId,
      admin,
    });

    if (!profileResult.success) {
      return NextResponse.json(
        { success: false, error: profileResult.error },
        { status: 400 }
      );
    }

    const userProfileMap = new Map((profileResult.users || []).map((u) => [u.id, u]));

    // ==========================================
    // Step 4: Query Active Current Roadmaps and Resolve Multilingual Roles
    // ==========================================
    const { data: dbRoadmaps } = await (admin as any)
      .from("roadmaps")
      .select("*")
      .in("user_id", ownerIds)
      .order("created_at", { ascending: false });

    const ownerPlanRecordMap = new Map<string, any>();
    (dbRoadmaps || []).forEach((r: any) => {
      const uid = r.user_id || r.userId;
      if (!uid) return;
      if (!ownerPlanRecordMap.has(uid)) {
        ownerPlanRecordMap.set(uid, r);
      } else if (r.status === "current" && ownerPlanRecordMap.get(uid)?.status !== "current") {
        ownerPlanRecordMap.set(uid, r);
      }
    });

    const roleIdSet = new Set<string>();
    ownerPlanRecordMap.forEach((r) => {
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

    const sharedRoadmaps = ownerIds.map((ownerId) => {
      const owner = userProfileMap.get(ownerId) || {
        id: ownerId,
        name: null,
        email: "unknown@example.com",
        level: 1,
        currentJobTitle: "Professional",
        industry: "General",
      };
      const share = shareMap.get(ownerId);
      const currentRoadmapRecord = ownerPlanRecordMap.get(ownerId);

      let safeCurrentPlan: any;
      let localizedRole: { en: string; ms: string; zh: string };

      if (currentRoadmapRecord) {
        const targetRoleId = currentRoadmapRecord.targetRoleId || currentRoadmapRecord.target_role_id || "";
        const targetRoleTitle = currentRoadmapRecord.targetRoleTitle || currentRoadmapRecord.target_role_title || "";
        localizedRole = resolveLocalization(
          targetRoleId,
          targetRoleTitle,
          currentRoadmapRecord.targetTitleLocalized || currentRoadmapRecord.target_title_localized
        );

        safeCurrentPlan = {
          ...formatRoadmapToPlanData({
            ...currentRoadmapRecord,
            targetTitleLocalized: localizedRole,
          }),
          targetRoleId,
          targetTitleLocalized: localizedRole,
          isCurrent: true,
        };
      } else {
        localizedRole = {
          en: owner.currentJobTitle || "Professional",
          ms: owner.currentJobTitle || "Professional",
          zh: owner.currentJobTitle || "专业人士",
        };

        safeCurrentPlan = {
          id: `plan-${owner.id}`,
          planCode: "PLAN-PEER",
          targetRole: localizedRole.en,
          targetRoleId: "",
          targetTitleLocalized: localizedRole,
          roleCategory: owner.industry || "General",
          matchScore: 0,
          totalWeeks: 0,
          totalHours: 0,
          scenario: "moderate",
          phases: [],
          isCurrent: true,
        };
      }

      return {
        id: share.id,
        roadmapId: safeCurrentPlan.id || "",
        ownerId,
        accessLevel: share.access_level || "viewable",
        sharedAt: share.created_at ? new Date(share.created_at).toISOString().split("T")[0] : "",
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          level: owner.level ?? 1,
          targetRoleId: safeCurrentPlan.targetRoleId || "",
          role: localizedRole.en,
          roleLocalized: localizedRole,
          department: owner.industry || safeCurrentPlan.roleCategory || "General",
        },
        currentPlan: safeCurrentPlan,
        historyPlans: [],
      };
    });

    // ==========================================
    // Step 5: Search and Filter by Profile Identity or Role
    // ==========================================
    let filteredList = sharedRoadmaps;
    if (searchQuery) {
      filteredList = sharedRoadmaps.filter((item) => {
        const name = (item.owner.name || "").toLowerCase();
        const email = item.owner.email.toLowerCase();
        const uid = item.owner.id.toLowerCase();
        const role = item.owner.role.toLowerCase();
        const localizedEn = (item.owner.roleLocalized?.en || "").toLowerCase();
        const localizedMs = (item.owner.roleLocalized?.ms || "").toLowerCase();
        const localizedZh = (item.owner.roleLocalized?.zh || "").toLowerCase();
        const dept = (item.owner.department || "").toLowerCase();

        return (
          name.includes(searchQuery) ||
          email.includes(searchQuery) ||
          uid.includes(searchQuery) ||
          role.includes(searchQuery) ||
          localizedEn.includes(searchQuery) ||
          localizedMs.includes(searchQuery) ||
          localizedZh.includes(searchQuery) ||
          dept.includes(searchQuery)
        );
      });
    }

    return NextResponse.json({
      success: true,
      sharedRoadmaps: filteredList,
      users: filteredList.map((item) => ({
        id: item.owner.id,
        shareId: item.id,
        name: item.owner.name,
        email: item.owner.email,
        level: item.owner.level,
        role: item.owner.role,
        roleLocalized: item.owner.roleLocalized,
        matchScore: item.currentPlan.matchScore,
        department: item.owner.department,
        accessLevel: item.accessLevel,
        sharedAt: item.sharedAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/page-shared GET] Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/page-shared
 * Deletes a shared peer connection where target_user_id is the authenticated user.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters:
 *   - id (optional if provided in body): String (UUID). Shared roadmap grant record ID to delete.
 * - Request Body (JSON, optional if provided in query):
 *   - id: String (UUID). Shared roadmap grant record ID to delete.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Validate payload parameters.
 * 3. Delete shared collaboration grant.
 */
export async function DELETE(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const currentUserId = user.id;

    // ==========================================
    // Step 2: Payload Validation
    // ==========================================
    const { searchParams } = new URL(request.url);
    let sharedId = searchParams.get("id");

    if (!sharedId) {
      const body = await request.json().catch(() => null);
      sharedId = body?.id;
    }

    if (!sharedId) {
      return NextResponse.json(
        { success: false, error: "Shared record ID is required." },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 3: Delete Shared Collaboration Grant
    // ==========================================
    const admin = createAdminClient();
    const { data: deleted, error: delErr } = await admin
      .from("shared_roadmaps")
      .delete()
      .eq("id", sharedId)
      .eq("target_user_id", currentUserId)
      .select();

    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 400 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: "Shared record not found or not owned by current user." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Shared roadmap record deleted successfully.",
      deletedId: sharedId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/page-shared DELETE] Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
