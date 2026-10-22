import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";
import { prisma } from "@/lib/supabase/prisma";
import { formatRoadmapToPlanData } from "@/lib/roadmapFormat";

/**
 * GET /api/shared/roadmaps
 * Retrieves all roadmaps shared WITH the currently authenticated user (targetUserId = currentUserId).
 * Joins owner details and roadmap data including phases.
 *
 * The received-share directory uses each grant's roadmap as the current plan, then adds
 * the owner's history plans so the client can render a complete read-only peer dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const currentUserId = user.id;

    // 1. Read grants received by the signed-in user with owner identity and ordered roadmap phases.
    let sharedRecords: any[] = [];
    try {
      const admin = createAdminClient();
      const { data: dbShares, error: dbErr } = await admin
        .from("shared_roadmaps")
        .select(
          "*, owner:users!shared_roadmaps_owner_id_fkey(id, name, email, level, currentJobTitle, industry), roadmap:roadmaps(*, phases:roadmap_phases(*))"
        )
        .eq("target_user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (!dbErr && dbShares && dbShares.length > 0) {
        sharedRecords = dbShares;
      }
    } catch (adminErr) {
      console.warn("[/api/shared/roadmaps] Admin query fallback to Prisma:", adminErr);
    }

    if (sharedRecords.length === 0) {
      sharedRecords = await (prisma.sharedRoadmap as any).findMany({
        where: {
          targetUserId: currentUserId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              currentJobTitle: true,
              industry: true,
            },
          },
          roadmap: {
            include: {
              phases: {
                orderBy: {
                  phaseIndex: "asc",
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    if (!sharedRecords || sharedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        sharedRoadmaps: [],
      });
    }

    // 2. Load each owner's archived plans once and group them for the directory response.
    const ownerIds: string[] = [
      ...new Set(sharedRecords.map((s: any) => s.ownerId || s.owner_id).filter(Boolean)),
    ] as string[];

    const historyRoadmaps = await prisma.roadmap.findMany({
      where: {
        userId: { in: ownerIds },
        status: "history",
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

    const historyMap = new Map<string, any[]>();
    historyRoadmaps.forEach((hr: any) => {
      if (hr.userId) {
        const list = historyMap.get(hr.userId) || [];
        list.push(formatRoadmapToPlanData(hr as any));
        historyMap.set(hr.userId, list);
      }
    });

    const formattedList = sharedRecords
      .filter((s: any) => s.roadmap && s.owner)
      .map((s: any) => {
        const currentPlan = {
          ...formatRoadmapToPlanData(s.roadmap),
          isCurrent: true,
        };

        const ownerId = s.ownerId || s.owner_id;
        const ownerHistory = historyMap.get(ownerId) || [];

        return {
          id: s.id, // ID of the shared_roadmap record
          roadmapId: s.roadmapId || s.roadmap_id,
          ownerId,
          accessLevel: s.accessLevel || s.access_level || "viewable", // "viewable" | "editable"
          sharedAt: new Date(s.createdAt || s.created_at).toISOString().split("T")[0],
          owner: {
            id: s.owner.id,
            name: s.owner.name,
            email: s.owner.email,
            level: s.owner.level ?? 1,
            role:
              s.owner.currentJobTitle ||
              s.owner.current_job_title ||
              s.roadmap.targetRoleTitle ||
              s.roadmap.target_role_title ||
              "Professional",
            department:
              s.owner.industry ||
              s.roadmap.roleCategory ||
              s.roadmap.role_category ||
              "General",
          },
          currentPlan,
          historyPlans: ownerHistory,
        };
      });

    return NextResponse.json({
      success: true,
      sharedRoadmaps: formattedList,
    });
  } catch (error: any) {
    console.error("[/api/shared/roadmaps GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load shared roadmaps." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shared/roadmaps
 * Deletes the association record in shared_roadmaps between current user and the owner/roadmap.
 * Query or body parameter: id (shared_roadmap ID)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const currentUserId = user.id;

    const { searchParams } = new URL(request.url);
    let sharedId = searchParams.get("id");

    if (!sharedId) {
      try {
        const body = await request.json();
        sharedId = body.id;
      } catch {
        // body might be empty
      }
    }

    if (!sharedId) {
      return NextResponse.json(
        { success: false, error: "Shared record ID is required." },
        { status: 400 }
      );
    }

    // Delete record where targetUserId matches current user
    const deleteResult = await (prisma.sharedRoadmap as any).deleteMany({
      where: {
        id: sharedId,
        targetUserId: currentUserId,
      },
    });

    if (deleteResult.count === 0) {
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
  } catch (error: any) {
    console.error("[/api/shared/roadmaps DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete shared record." },
      { status: 500 }
    );
  }
}
