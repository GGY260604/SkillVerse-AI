import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUserProfilesBatch } from "@/app/api/profile/profileService";

/**
 * GET /api/page-analysis/share
 * User collaboration retrieval endpoint.
 * Direct Supabase database operations are used without binding to any specific roadmapId.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters:
 *   - filter (optional): String. Filter shared users list ('all' | 'viewable').
 *   - search (optional): String. Search term by user ID (UUID), email, or name.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Branch A: Retrieve currently shared users.
 * 3. Branch B: Search users and check collaboration status.
 * 4. Branch C: Default empty response for unfiltered queries.
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
    const searchQuery = (searchParams.get("search") || "").trim();
    const filter = (searchParams.get("filter") || "").toLowerCase().trim();

    const admin = createAdminClient();

    // ==========================================
    // Branch A: Retrieve Currently Shared Users
    // ==========================================
    if (filter === "all" || filter === "viewable") {
      const { data: shares, error: shareErr } = await admin
        .from("shared_roadmaps")
        .select("target_user_id, access_level, created_at, updated_at")
        .eq("owner_id", currentUserId)
        .order("created_at", { ascending: false });

      if (shareErr) {
        return NextResponse.json(
          { success: false, error: shareErr.message },
          { status: 400 }
        );
      }

      if (!shares || shares.length === 0) {
        return NextResponse.json({
          success: true,
          sharedUsers: [],
          total: 0,
        });
      }

      const targetUserIds = Array.from(new Set(shares.map((s) => s.target_user_id)));

      const batchResult = await fetchUserProfilesBatch({
        userIds: targetUserIds,
        currentUserId,
        admin,
      });

      if (!batchResult.success) {
        return NextResponse.json(
          { success: false, error: batchResult.error },
          { status: 400 }
        );
      }

      const userMap = new Map<string, any>();
      batchResult.users.forEach((u) => userMap.set(u.id, u));

      const sharedUsers = shares.map((s) => {
        const profile = userMap.get(s.target_user_id) || {};
        return {
          userId: s.target_user_id,
          email: profile.email || "Unknown email",
          name: profile.name || null,
          role: profile.currentJobTitle || profile.targetJobTitle || "Professional",
          department: profile.industry || "General",
          accessLevel: s.access_level || "viewable",
          avatarUrl: profile.avatarUrl || null,
          sharedAt: s.created_at,
          updatedAt: s.updated_at,
        };
      });

      return NextResponse.json({
        success: true,
        sharedUsers,
        total: sharedUsers.length,
      });
    }

    // ==========================================
    // Branch B: Search Users and Check Collaboration Status
    // ==========================================
    if (searchQuery) {
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          searchQuery
        );

      let targetUser = null;

      if (isUUID) {
        const { data: userById } = await admin
          .from("users")
          .select("id, email, name, currentJobTitle, targetJobTitle, industry")
          .eq("id", searchQuery)
          .maybeSingle();

        if (userById) {
          targetUser = userById;
        }
      }

      if (!targetUser) {
        const { data: userByEmail } = await admin
          .from("users")
          .select("id, email, name, currentJobTitle, targetJobTitle, industry")
          .ilike("email", searchQuery)
          .maybeSingle();

        if (userByEmail) {
          targetUser = userByEmail;
        }
      }

      if (!targetUser) {
        const { data: userByName } = await admin
          .from("users")
          .select("id, email, name, currentJobTitle, targetJobTitle, industry")
          .ilike("name", searchQuery)
          .maybeSingle();

        if (userByName) {
          targetUser = userByName;
        }
      }

      if (!targetUser) {
        return NextResponse.json({
          success: true,
          found: false,
          user: null,
          message: "No user found matching the provided search query.",
        });
      }

      if (targetUser.id === currentUserId) {
        return NextResponse.json({
          success: true,
          found: true,
          isSelf: true,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
          },
          message: "This is your own account.",
        });
      }

      const { data: existingShare } = await admin
        .from("shared_roadmaps")
        .select("id, access_level, created_at, updated_at")
        .eq("owner_id", currentUserId)
        .eq("target_user_id", targetUser.id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        found: true,
        isSelf: false,
        user: {
          userId: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.currentJobTitle || targetUser.targetJobTitle || "Professional",
          department: targetUser.industry || "General",
          accessLevel: existingShare ? existingShare.access_level : "no_access",
          sharedRecordId: existingShare ? existingShare.id : null,
          sharedAt: existingShare ? existingShare.created_at : null,
        },
      });
    }

    // ==========================================
    // Branch C: Default Empty Response for Unfiltered Queries
    // ==========================================
    return NextResponse.json({
      success: true,
      message: "Please specify either ?filter=all/viewable or ?search=uid/email/name.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/page-analysis/share GET] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/page-analysis/share
 * Updates or revokes collaboration permissions for a user.
 * Revoking access (accessLevel: 'no_access') deletes the shared roadmap record.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body (JSON):
 *   - targetUserId (required): String (UUID). Target collaborator ID to share with or revoke.
 *   - accessLevel (optional): String ('viewable' | 'no_access'). Defaults to 'viewable'.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Validate payload parameters.
 * 3. Delete shared collaboration grant if revoked.
 * 4. Grant or update access permission.
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
    const currentUserId = user.id;

    // ==========================================
    // Step 2: Payload Validation
    // ==========================================
    const body = await request.json().catch(() => ({}));
    const { targetUserId, accessLevel: rawAccessLevel } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Target user ID is required." },
        { status: 400 }
      );
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot share with yourself." },
        { status: 400 }
      );
    }

    const accessLevel = rawAccessLevel === "no_access" ? "no_access" : "viewable";
    const admin = createAdminClient();

    // ==========================================
    // Step 3: Delete Shared Collaboration Grant if Revoked
    // ==========================================
    if (accessLevel === "no_access") {
      const { data: deleted, error: delErr } = await admin
        .from("shared_roadmaps")
        .delete()
        .eq("owner_id", currentUserId)
        .eq("target_user_id", targetUserId)
        .select();

      if (delErr) {
        return NextResponse.json(
          { success: false, error: delErr.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Shared roadmap record deleted successfully.",
        deletedId: deleted?.[0]?.id || null,
        accessLevel: "no_access",
        targetUserId,
      });
    }

    // ==========================================
    // Step 4: Grant or Update Access Permission
    // ==========================================
    const { data: existing, error: findErr } = await admin
      .from("shared_roadmaps")
      .select("id")
      .eq("owner_id", currentUserId)
      .eq("target_user_id", targetUserId)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json(
        { success: false, error: findErr.message },
        { status: 400 }
      );
    }

    let shareRecord;
    if (existing) {
      const { data: updated, error: updateErr } = await admin
        .from("shared_roadmaps")
        .update({
          access_level: "viewable",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json(
          { success: false, error: updateErr.message },
          { status: 400 }
        );
      }
      shareRecord = updated;
    } else {
      const { data: created, error: createErr } = await admin
        .from("shared_roadmaps")
        .insert({
          owner_id: currentUserId,
          target_user_id: targetUserId,
          access_level: "viewable",
        })
        .select()
        .single();

      if (createErr) {
        return NextResponse.json(
          { success: false, error: createErr.message },
          { status: 400 }
        );
      }
      shareRecord = created;
    }

    return NextResponse.json({
      success: true,
      message: "Access updated to viewable.",
      share: shareRecord,
      accessLevel: "viewable",
      targetUserId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/page-analysis/share POST] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/page-analysis/share
 * Deletes a shared peer connection where owner_id is the authenticated user.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters:
 *   - targetUserId (optional if id or body provided): String (UUID). Target collaborator ID to revoke access from.
 *   - id (optional if targetUserId or body provided): String (UUID). Shared roadmap grant record ID to delete.
 * - Request Body (JSON, optional if provided in query):
 *   - targetUserId: String (UUID). Target collaborator ID to revoke access from.
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
    let targetUserId = searchParams.get("targetUserId");
    let sharedId = searchParams.get("id");

    if (!targetUserId && !sharedId) {
      const body = await request.json().catch(() => null);
      targetUserId = body?.targetUserId;
      sharedId = body?.id;
    }

    if (!targetUserId && !sharedId) {
      return NextResponse.json(
        { success: false, error: "Target user ID or shared record ID is required." },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 3: Delete Shared Collaboration Grant
    // ==========================================
    const admin = createAdminClient();
    let query = admin.from("shared_roadmaps").delete().eq("owner_id", currentUserId);

    if (sharedId) {
      query = query.eq("id", sharedId);
    } else if (targetUserId) {
      query = query.eq("target_user_id", targetUserId);
    }

    const { data: deleted, error: delErr } = await query.select();

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
      deletedId: deleted[0].id,
      targetUserId: targetUserId || deleted[0].target_user_id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[/api/page-analysis/share DELETE] Error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
