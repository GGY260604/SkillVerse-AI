import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/supabase/prisma";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";

/**
 * PATCH /api/analysis/roadmaps/phase.
 * Toggles or updates the completion status of a specific RoadmapPhase.
 * Payload: `{ phaseId: string, isCompleted: boolean }`.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phaseId, isCompleted } = body;

    if (typeof phaseId !== "string" || !phaseId || typeof isCompleted !== "boolean") {
      return NextResponse.json(
        { success: false, error: "phaseId and boolean isCompleted are required." },
        { status: 400 }
      );
    }

    // Load the parent roadmap to verify ownership and edit permissions.
    const phase = await prisma.roadmapPhase.findUnique({
      where: { id: phaseId },
      include: { roadmap: true },
    });

    if (!phase) {
      return NextResponse.json(
        { success: false, error: "RoadmapPhase not found." },
        { status: 404 }
      );
    }

    const roadmapOwnerId = phase.roadmap.userId;
    const isOwner = roadmapOwnerId === userData.user.id;
    const editPermission =
      !isOwner && roadmapOwnerId
        ? await prisma.sharedRoadmap.findFirst({
            where: {
              ownerId: roadmapOwnerId,
              targetUserId: userData.user.id,
              roadmapId: phase.roadmapId,
              accessLevel: "editable",
            },
            select: { id: true },
          })
        : null;

    if (!isOwner && !editPermission) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot edit this roadmap." },
        { status: 403 }
      );
    }

    // Update the phase completion state after authorization.
    const updatedPhase = await prisma.roadmapPhase.update({
      where: { id: phaseId },
      data: { isCompleted },
    });

    return NextResponse.json({
      success: true,
      phaseId: updatedPhase.id,
      isCompleted: updatedPhase.isCompleted,
    });
  } catch (error: unknown) {
    console.error("[/api/analysis/roadmaps/phase] Error updating phase status:", error);
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
