import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/supabase/prisma";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";

/**
 * PATCH /api/analysis/roadmaps/phase.
 * Toggles or updates the completion status of a specific RoadmapPhase.
 * Payload: `{ phaseId: string, isCompleted: boolean }`.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
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
    const isOwner = roadmapOwnerId === user.id;
    const editPermission =
      !isOwner && roadmapOwnerId
        ? await prisma.sharedRoadmap.findFirst({
            where: {
              ownerId: roadmapOwnerId,
              targetUserId: user.id,
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

    const response = NextResponse.json({
      success: true,
      phaseId: updatedPhase.id,
      isCompleted: updatedPhase.isCompleted,
    });
    return applyAuthCookies(response, newTokens);
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
