import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/prisma";
import {
  normalizeWorkArrangement,
  normalizeEmploymentStatus,
  normalizeYearsOfExperience,
  normalizeEducationLevel,
  normalizeIndustry,
  normalizeCareerGoal,
  normalizeWeeklyCommitmentHours,
  normalizeLearningProviders,
  normalizeTargetSectors,
} from "@/lib/profileNormalization";

/**
 * GET /api/profile
 * Data flow:
 * 1. Authenticate the requester and use their own ID by default.
 * 2. For a requested peer profile, verify that the peer shared a roadmap with the requester.
 * 3. Read and return the selected users-table record for the wizard/profile UI.
 */
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = userData.user.id;
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    let targetUserId = currentUserId;
    if (requestedUserId && requestedUserId !== currentUserId) {
      // Verify that requested user shared a roadmap with current logged-in user
      const sharePermission = await (prisma.sharedRoadmap as any).findFirst({
        where: {
          ownerId: requestedUserId,
          targetUserId: currentUserId,
        },
      });

      if (!sharePermission) {
        return NextResponse.json({ error: "Forbidden: No shared access to this profile" }, { status: 403 });
      }

      targetUserId = requestedUserId;
    }

    const admin = createAdminClient();

    // Query single user record from users table
    const { data: userRecord, error } = await admin
      .from("users")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();

    if (error) {
      console.error("[/api/profile GET] Database query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resolvedName =
      userRecord?.name ||
      (targetUserId === currentUserId
        ? userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || ""
        : "");

    return NextResponse.json({
      success: true,
      profile: userRecord || null,
      user: {
        id: targetUserId,
        email: userRecord?.email || (targetUserId === currentUserId ? userData.user.email : ""),
        name: resolvedName,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile GET] Uncaught exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Partially updates the user's profile, specifically their display name.
 * Updates both the database `users` table and Supabase Auth `user_metadata`.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = userData.user;
    const body = await request.json();
    const rawName = typeof body.name === "string" ? body.name.trim() : "";

    if (!rawName) {
      return NextResponse.json(
        { error: "Name cannot be empty." },
        { status: 400 }
      );
    }

    if (rawName.length > 100) {
      return NextResponse.json(
        { error: "Name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Update or upsert user in `users` table
    const { data: existingUser } = await admin
      .from("users")
      .select("id, email, name")
      .eq("id", user.id)
      .maybeSingle();

    let updatedUser;
    if (existingUser) {
      const { data, error } = await admin
        .from("users")
        .update({
          name: rawName,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("[/api/profile PATCH] DB update error:", error);
        throw error;
      }
      updatedUser = data;
    } else {
      const { data, error } = await admin
        .from("users")
        .insert({
          id: user.id,
          email: user.email || "",
          name: rawName,
          locale: "en",
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("[/api/profile PATCH] DB insert error:", error);
        throw error;
      }
      updatedUser = data;
    }

    // 2. Also sync to Supabase Auth metadata so future session tokens immediately reflect the updated name
    try {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          name: rawName,
          full_name: rawName,
        },
      });
    } catch (authErr) {
      console.warn("[/api/profile PATCH] Auth metadata sync warning:", authErr);
    }

    return NextResponse.json({
      success: true,
      message: "Profile name updated successfully.",
      user: {
        id: user.id,
        email: user.email,
        name: rawName,
      },
      profile: updatedUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile PATCH] Uncaught exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Updates the user's unified profile record in the users table.
 * The assessment wizard calls this after validating all steps. Shared-user edits require an
 * editable grant; an upsert preserves identity fields and writes the normalized intake values.
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = userData.user;
    const body = await request.json();
    const admin = createAdminClient();

    let effectiveUserId = user.id;
    if (body.targetUserId && body.targetUserId !== user.id) {
      // Verify that current user has "editable" permission on a shared roadmap from targetUserId
      const sharePermission = await (prisma.sharedRoadmap as any).findFirst({
        where: {
          ownerId: body.targetUserId,
          targetUserId: user.id,
          accessLevel: "editable",
        },
      });

      if (!sharePermission) {
        return NextResponse.json(
          { error: "Forbidden: No edit permission for this user's profile" },
          { status: 403 }
        );
      }

      effectiveUserId = body.targetUserId;
    }

    // Fetch existing user to preserve identity fields (name, email, locale)
    const { data: existingUser } = await admin
      .from("users")
      .select("name, locale, email")
      .eq("id", effectiveUserId)
      .maybeSingle();

    // Upsert the validated profile under the effective owner ID while retaining existing identity fields.
    const { data: updatedUser, error: updateError } = await admin
      .from("users")
      .upsert(
        {
          id: effectiveUserId,
          email: existingUser?.email || (effectiveUserId === user.id ? user.email || "" : ""),
          name: body.name ?? existingUser?.name ?? (effectiveUserId === user.id ? user.user_metadata?.full_name ?? user.user_metadata?.name : null) ?? null,
          locale: body.locale ?? existingUser?.locale ?? "en",
          employmentStatus: normalizeEmploymentStatus(body.employmentStatus) || "employed_at_risk",
          currentJobTitle: body.currentJobTitle ?? null,
          industry: normalizeIndustry(body.industry) ?? null,
          educationLevel: normalizeEducationLevel(body.educationLevel) ?? null,
          yearsOfExperience: normalizeYearsOfExperience(body.yearsOfExperience) ?? null,
          skills: body.skills || [],
          toolsAndSoftware: body.toolsAndSoftware || [],
          casualDescription: body.casualDescription ?? null,
          languages: body.languages || [],
          careerGoal: normalizeCareerGoal(body.careerGoal) || "explore",
          targetSectors: normalizeTargetSectors(body.targetSectors) || [],
          targetJobTitle: body.targetJobTitle ?? null,
          workArrangement: normalizeWorkArrangement(body.workArrangement) || "any",
          weeklyCommitmentHours: normalizeWeeklyCommitmentHours(body.weeklyCommitmentHours) || "3-5",
          learningProviders: normalizeLearningProviders(body.learningProviders) || ["free_open", "hrd_corp"],
          outputLanguage: body.outputLanguage || "en",
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (updateError) {
      console.error("[/api/profile POST] User profile upsert error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "User profile updated successfully in users table.",
      profile: updatedUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile POST] Uncaught exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
