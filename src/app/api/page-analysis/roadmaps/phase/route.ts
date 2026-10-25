import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";

/**
 * PATCH /api/page-analysis/roadmaps/phase
 * Toggles or updates the completion status of a specific RoadmapPhase.
 * Direct Supabase database operations are used without Prisma dependencies.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body:
 *   - phaseId (required): String. UUID of the target roadmap phase.
 *   - isCompleted (required): Boolean. New completion state of the phase.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Validate payload parameters.
 * 3. Verify parent roadmap ownership and edit permissions.
 * 4. Update phase completion status in database.
 * 5. Dispatch response with updated state.
 */
export async function PATCH(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // ==========================================
    // Step 2: Validate Payload Parameters
    // ==========================================
    const body = await request.json();
    const { phaseId, isCompleted } = body;

    if (typeof phaseId !== "string" || !phaseId || typeof isCompleted !== "boolean") {
      return NextResponse.json(
        { success: false, error: "phaseId and boolean isCompleted are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ==========================================
    // Step 3: Verify Parent Roadmap Ownership and Edit Permissions
    // ==========================================
    const { data: phase, error: phaseErr } = await admin
      .from("roadmap_phases")
      .select("id, roadmap_id, is_completed")
      .eq("id", phaseId)
      .maybeSingle();

    if (phaseErr || !phase) {
      return NextResponse.json(
        { success: false, error: "RoadmapPhase not found." },
        { status: 404 }
      );
    }

    const { data: roadmap, error: roadmapErr } = await admin
      .from("roadmaps")
      .select("id, user_id")
      .eq("id", phase.roadmap_id)
      .maybeSingle();

    if (roadmapErr || !roadmap) {
      return NextResponse.json(
        { success: false, error: "Parent roadmap not found." },
        { status: 404 }
      );
    }

    const roadmapOwnerId = roadmap.user_id;
    const isOwner = roadmapOwnerId === user.id;

    let hasEditPermission = false;
    if (!isOwner && roadmapOwnerId) {
      const { data: shareRecord } = await admin
        .from("shared_roadmaps")
        .select("id")
        .eq("owner_id", roadmapOwnerId)
        .eq("target_user_id", user.id)
        .eq("roadmap_id", phase.roadmap_id)
        .eq("access_level", "editable")
        .maybeSingle();

      if (shareRecord) {
        hasEditPermission = true;
      }
    }

    if (!isOwner && !hasEditPermission) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot edit this roadmap." },
        { status: 403 }
      );
    }

    // ==========================================
    // Step 4: Update Phase Completion Status in Database
    // ==========================================
    const { data: updatedPhase, error: updateErr } = await admin
      .from("roadmap_phases")
      .update({ is_completed: isCompleted })
      .eq("id", phaseId)
      .select("id, is_completed")
      .single();

    if (updateErr || !updatedPhase) {
      throw new Error(updateErr?.message || "Failed to update phase completion status.");
    }

    // ==========================================
    // Step 5: Dispatch Response with Updated State
    // ==========================================
    const response = NextResponse.json({
      success: true,
      phaseId: updatedPhase.id,
      isCompleted: updatedPhase.is_completed,
    });
    return applyAuthCookies(response, newTokens);
  } catch (error: unknown) {
    console.error("[/api/page-analysis/roadmaps/phase] Error updating phase status:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update phase completion status.",
      },
      { status: 500 }
    );
  }
}
