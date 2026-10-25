import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
} from "@/lib/supabase/cookies";
import { formatRoadmapToPlanData } from "@/lib/roadmapFormat";

/**
 * GET /api/page-analysis/roadmaps
 * User roadmap retrieval endpoint.
 * Direct Supabase database operations are used without Prisma dependencies.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Query user roadmaps with associated phases from database.
 * 3. Self-heal and synchronize active current plan status.
 * 4. Format roadmaps and dispatch client response.
 */
export async function GET() {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({
        success: true,
        currentPlan: null,
        historyPlans: [],
      });
    }

    const userId = user.id;
    const admin = createAdminClient();

    // ==========================================
    // Step 2: Query Roadmaps with Phases
    // ==========================================
    const { data: dbRoadmaps, error: dbErr } = await admin
      .from("roadmaps")
      .select("*, phases:roadmap_phases(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (dbErr) {
      console.error("[/api/page-analysis/roadmaps] Supabase query error:", dbErr.message);
      return NextResponse.json(
        {
          success: false,
          error: dbErr.message,
          currentPlan: null,
          historyPlans: [],
        },
        { status: 400 }
      );
    }

    const roadmaps = dbRoadmaps || [];

    if (roadmaps.length === 0) {
      return NextResponse.json({
        success: true,
        currentPlan: null,
        historyPlans: [],
      });
    }

    // ==========================================
    // Step 3: Self-Heal and Synchronize Current Status
    // ==========================================
    let currentRoadmapRecord = roadmaps.find((r) => r.status === "current");
    if (!currentRoadmapRecord) {
      currentRoadmapRecord = roadmaps[0];
      try {
        await admin
          .from("roadmaps")
          .update({ status: "current" })
          .eq("id", currentRoadmapRecord.id);
        currentRoadmapRecord.status = "current";
      } catch (err) {
        console.warn("[/api/page-analysis/roadmaps] Self-healing roadmap status failed:", err);
      }
    }

    // Repair duplicate current statuses by setting older duplicates to history.
    const duplicateCurrentIds = roadmaps
      .filter((roadmap) => roadmap.status === "current" && roadmap.id !== currentRoadmapRecord.id)
      .map((roadmap) => roadmap.id);

    if (duplicateCurrentIds.length > 0) {
      try {
        await admin
          .from("roadmaps")
          .update({ status: "history" })
          .in("id", duplicateCurrentIds);

        for (const roadmap of roadmaps) {
          if (duplicateCurrentIds.includes(roadmap.id)) {
            roadmap.status = "history";
          }
        }
      } catch (err) {
        console.warn("[/api/page-analysis/roadmaps] Duplicate current roadmap repair failed:", err);
      }
    }

    // ==========================================
    // Step 4: Format Roadmaps and Return Response
    // ==========================================
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

    const response = NextResponse.json({
      success: true,
      currentPlan,
      historyPlans,
    });
    return applyAuthCookies(response, newTokens);
  } catch (error: unknown) {
    console.error("[/api/page-analysis/roadmaps] Failed to fetch roadmaps:", error);
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
