import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";

/**
 * PATCH /api/analysis/roadmaps/phase
 * Toggles or updates the completion status of a specific RoadmapPhase.
 * Payload: { phaseId: string, isCompleted: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { phaseId, isCompleted } = body;

    if (!phaseId || typeof isCompleted !== "boolean") {
      return NextResponse.json(
        { success: false, error: "phaseId and boolean isCompleted are required." },
        { status: 400 }
      );
    }

    // Verify existing phase
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

    // Update phase completion state
    const updatedPhase = await prisma.roadmapPhase.update({
      where: { id: phaseId },
      data: { isCompleted },
    });

    return NextResponse.json({
      success: true,
      phaseId: updatedPhase.id,
      isCompleted: updatedPhase.isCompleted,
    });
  } catch (error: any) {
    console.error("[/api/analysis/roadmaps/phase] Error updating phase status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update phase completion status." },
      { status: 500 }
    );
  }
}
