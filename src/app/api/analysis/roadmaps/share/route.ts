import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";
import { prisma } from "@/lib/supabase/prisma";

/**
 * GET /api/analysis/roadmaps/share
 * Searches users by ID/Email and retrieves existing collaboration permissions.
 * Supports filtering by granted access level (viewable, editable, all).
 *
 * Data flow:
 * 1. Authenticate the owner and resolve the requested roadmap (or their current roadmap).
 * 2. For the shared filter, load existing grants and their user profiles; for search, load
 *    matching users and join any existing grant for the resolved roadmap.
 * 3. Return identity, level, and access level for each collaborator card.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const currentUserId = user.id;

    const { searchParams } = new URL(request.url);
    const roadmapIdParam = searchParams.get("roadmapId") || "";
    const searchQuery = (searchParams.get("search") || "").trim();
    const filter = (searchParams.get("filter") || "").toLowerCase().trim();

    // Locate the target roadmap owned by current user
    let targetRoadmap = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roadmapIdParam);

    if (isUuid) {
      targetRoadmap = await prisma.roadmap.findFirst({
        where: {
          id: roadmapIdParam,
          userId: currentUserId,
        },
      });
    }

    // Fallback: If roadmapId was mock or not found by exact ID, find user's active current roadmap
    if (!targetRoadmap) {
      targetRoadmap = await prisma.roadmap.findFirst({
        where: {
          userId: currentUserId,
          status: "current",
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    // If user has no roadmaps at all in database
    if (!targetRoadmap) {
      return NextResponse.json({
        success: true,
        users: [],
        roadmapId: null,
      });
    }

    // 1. For the default/shared filters, read granted users and their access level.
    if (filter === "all" || filter === "viewable" || filter === "editable") {
      const whereClause: any = {
        ownerId: currentUserId,
        roadmapId: targetRoadmap.id,
      };

      if (filter === "viewable") whereClause.accessLevel = "viewable";
      if (filter === "editable") whereClause.accessLevel = "editable";

      const shares: any[] = await (prisma.sharedRoadmap as any).findMany({
        where: whereClause,
        select: {
          targetUserId: true,
          accessLevel: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      const targetIds: string[] = shares.map((s) => s.targetUserId).filter(Boolean);
      const targetUsers = targetIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: targetIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

      const userMap = new Map(targetUsers.map((u) => [u.id, u]));

      const users = shares
        .filter((s) => userMap.has(s.targetUserId))
        .map((s) => {
          const user = userMap.get(s.targetUserId)!;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            level: (user as any).level ?? 1,
            accessLevel: s.accessLevel,
          };
        });

      return NextResponse.json({
        success: true,
        users,
        roadmapId: targetRoadmap.id,
      });
    }

    // 2. For a search, find up to 20 other users by UID, email, or name, then attach
    //    the current roadmap's existing permission (or no_access).
    if (searchQuery) {
      const isSearchUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery);

      const userWhere: any = {
        id: { not: currentUserId },
      };

      if (isSearchUuid) {
        userWhere.OR = [
          { id: searchQuery },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
        ];
      } else {
        userWhere.OR = [
          { email: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
        ];
      }

      const matchingUsers = await prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, email: true },
        take: 20,
      });

      const targetUserIds = matchingUsers.map((u) => u.id);
      const existingShares: any[] = await (prisma.sharedRoadmap as any).findMany({
        where: {
          roadmapId: targetRoadmap.id,
          targetUserId: { in: targetUserIds },
        },
      });

      const shareMap = new Map<string, string>();
      existingShares.forEach((s) => shareMap.set(s.targetUserId, s.accessLevel));

      const users = matchingUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        level: (u as any).level ?? 1,
        accessLevel: shareMap.get(u.id) || "no_access",
      }));

      return NextResponse.json({
        success: true,
        users,
        roadmapId: targetRoadmap.id,
      });
    }

    // 3. An empty, unfiltered query intentionally returns no user records.
    return NextResponse.json({
      success: true,
      users: [],
      roadmapId: targetRoadmap.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/analysis/roadmaps/share GET] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/analysis/roadmaps/share
 * Updates a collaborator's access level for a specific roadmap.
 * Setting accessLevel='no_access' removes the record from shared_roadmaps.
 *
 * The owner and roadmap are revalidated server-side. Revoking deletes the grant;
 * granting view/edit access inserts or updates the unique collaborator record.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const currentUserId = user.id;

    const body = await request.json();
    const { roadmapId: reqRoadmapId, targetUserId, accessLevel } = body;

    if (!targetUserId || !accessLevel) {
      return NextResponse.json(
        { error: "Target user ID and access level are required." },
        { status: 400 }
      );
    }

    if (!["no_access", "viewable", "editable"].includes(accessLevel)) {
      return NextResponse.json(
        { error: "Invalid access level. Must be 'no_access', 'viewable', or 'editable'." },
        { status: 400 }
      );
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot share a roadmap with yourself." },
        { status: 400 }
      );
    }

    // Resolve target roadmap owned by current user
    let targetRoadmap = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reqRoadmapId || "");

    if (isUuid) {
      targetRoadmap = await prisma.roadmap.findFirst({
        where: {
          id: reqRoadmapId,
          userId: currentUserId,
        },
      });
    }

    if (!targetRoadmap) {
      targetRoadmap = await prisma.roadmap.findFirst({
        where: {
          userId: currentUserId,
          status: "current",
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!targetRoadmap) {
      return NextResponse.json(
        { error: "Roadmap not found or you do not have permission to share it." },
        { status: 404 }
      );
    }

    // If accessLevel is "no_access", delete the shared entry
    if (accessLevel === "no_access") {
      await (prisma.sharedRoadmap as any).deleteMany({
        where: {
          roadmapId: targetRoadmap.id,
          targetUserId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Access revoked.",
        accessLevel: "no_access",
        roadmapId: targetRoadmap.id,
        targetUserId,
      });
    }

    // Otherwise, upsert the shared entry with "viewable" or "editable"
    const existing = await (prisma.sharedRoadmap as any).findFirst({
      where: {
        roadmapId: targetRoadmap.id,
        targetUserId,
      },
    });

    let updatedShare;
    if (existing) {
      updatedShare = await (prisma.sharedRoadmap as any).update({
        where: { id: existing.id },
        data: {
          accessLevel,
          updatedAt: new Date(),
        },
      });
    } else {
      updatedShare = await (prisma.sharedRoadmap as any).create({
        data: {
          ownerId: currentUserId,
          targetUserId,
          roadmapId: targetRoadmap.id,
          accessLevel,
          title: targetRoadmap.targetRoleTitle || "Roadmap",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Access updated to ${accessLevel}.`,
      share: updatedShare,
      accessLevel,
      roadmapId: targetRoadmap.id,
      targetUserId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/analysis/roadmaps/share POST] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
