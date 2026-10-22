import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/supabase/prisma";
import { formatRoadmapToPlanData } from "@/lib/roadmapFormat";

/**
 * GET /api/analysis/roadmaps
 * Returns the authenticated user's current roadmap and archived history roadmaps
 * queried directly from PostgreSQL with guaranteed trilingual columns.
 *
 * Data flow:
 * 1. Resolve the user from the Supabase session cookie; unauthenticated requests get empty results.
 * 2. Read that user's roadmaps with phases, newest first, then pick the current record.
 * 3. If no record is marked current, repair the status by promoting the newest roadmap.
 * 4. Format the selected roadmap and remaining records for the analysis dashboard.
 */
export async function GET() {
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

    // 1. Query this user's roadmaps directly with all flat trilingual columns & phases.
    let roadmaps: any[] = [];
    try {
      const admin = createAdminClient();
      const { data: dbRoadmaps, error: dbErr } = await admin
        .from("roadmaps")
        .select("*, phases:roadmap_phases(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!dbErr && dbRoadmaps && dbRoadmaps.length > 0) {
        roadmaps = dbRoadmaps;
      }
    } catch (adminErr) {
      console.warn("[/api/analysis/roadmaps] Admin query fallback to Prisma:", adminErr);
    }

    if (roadmaps.length === 0) {
      roadmaps = await prisma.roadmap.findMany({
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
    }

    if (!roadmaps || roadmaps.length === 0) {
      return NextResponse.json({
        success: true,
        currentPlan: null,
        historyPlans: [],
      });
    }

    // 2. Keep the newest current record, or promote the newest roadmap if none is current.
    let currentRoadmapRecord = roadmaps.find((r) => r.status === "current");
    if (!currentRoadmapRecord) {
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

    // 3. Repair duplicate current statuses by keeping only the newest current roadmap active.
    const duplicateCurrentIds = roadmaps
      .filter((roadmap) => roadmap.status === "current" && roadmap.id !== currentRoadmapRecord.id)
      .map((roadmap) => roadmap.id);

    if (duplicateCurrentIds.length > 0) {
      try {
        await prisma.roadmap.updateMany({
          where: {
            id: { in: duplicateCurrentIds },
            userId,
            status: "current",
          },
          data: { status: "history" },
        });
        for (const roadmap of roadmaps) {
          if (duplicateCurrentIds.includes(roadmap.id)) {
            roadmap.status = "history";
          }
        }
      } catch (err) {
        console.warn("[/api/analysis/roadmaps] Duplicate current roadmap repair failed:", err);
      }
    }

    // 4. Treat every roadmap except the active record as archived history.
    const historyRoadmapRecords = currentRoadmapRecord
      ? roadmaps.filter((roadmap) => roadmap.id !== currentRoadmapRecord.id)
      : [];

    const currentPlan = currentRoadmapRecord
      ? { ...formatRoadmapToPlanData(currentRoadmapRecord), isCurrent: true }
      : null;

    const historyPlans = historyRoadmapRecords.map((r) => ({
      ...formatRoadmapToPlanData(r),
      isCurrent: false,
    }));

    return NextResponse.json({
      success: true,
      currentPlan,
      historyPlans,
    });
  } catch (error: unknown) {
    console.error("[/api/analysis/roadmaps] Failed to fetch roadmaps:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load roadmaps from database.",
        currentPlan: null,
        historyPlans: [],
      },
      { status: 500 }
    );
  }
}
