import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/prisma";
import { formatRoadmapToPlanData } from "@/lib/roadmapFormat";

/**
 * GET /api/analysis/roadmaps
 * Returns the authenticated user's current roadmap and archived history roadmaps
 * queried directly from Supabase via Prisma.
 */
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json({
        success: true,
        currentPlan: null,
        historyPlans: [],
      });
    }

    const { data: userData } = await supabase.auth.getUser(accessToken);
    const userId = userData?.user?.id;

    if (!userId) {
      return NextResponse.json({
        success: true,
        currentPlan: null,
        historyPlans: [],
      });
    }

    // Query user roadmaps with their respective phases
    const roadmaps = await prisma.roadmap.findMany({
      where: {
        userId,
      },
      include: {
        phases: {
          orderBy: {
            phaseIndex: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!roadmaps || roadmaps.length === 0) {
      return NextResponse.json({
        success: true,
        currentPlan: null,
        historyPlans: [],
      });
    }

    // Locate active current roadmap. If no record has status='current', self-heal by setting latest to 'current'
    let currentRoadmapRecord = roadmaps.find((r) => r.status === "current");
    if (!currentRoadmapRecord && roadmaps.length > 0) {
      currentRoadmapRecord = roadmaps[0];
      try {
        await prisma.roadmap.update({
          where: { id: currentRoadmapRecord.id },
          data: { status: "current" },
        });
        currentRoadmapRecord.status = "current";
      } catch (err) {
        console.warn("[/api/analysis/roadmaps] Self-healing roadmap status failed:", err);
      }
    }

    // Separate historical roadmaps
    const historyRoadmapRecords = currentRoadmapRecord
      ? roadmaps.filter((r) => r.id !== currentRoadmapRecord!.id)
      : [];

    const currentPlan = currentRoadmapRecord
      ? { ...formatRoadmapToPlanData(currentRoadmapRecord as any), isCurrent: true }
      : null;

    const historyPlans = historyRoadmapRecords.map((r) => ({
      ...formatRoadmapToPlanData(r as any),
      isCurrent: false,
    }));

    return NextResponse.json({
      success: true,
      currentPlan,
      historyPlans,
    });
  } catch (error: any) {
    console.error("[/api/analysis/roadmaps] Failed to fetch roadmaps:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load roadmaps from database.",
        currentPlan: null,
        historyPlans: [],
      },
      { status: 500 }
    );
  }
}
