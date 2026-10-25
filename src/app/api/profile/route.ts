import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
  createUnauthorizedResponse,
} from "@/lib/supabase/cookies";
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
import { fetchUserProfilesBatch } from "./profileService";

/**
 * GET /api/profile
 * Retrieves user profile(s) from the users table.
 * Supports loading:
 * 1. Authenticated user's own profile (no query params).
 * 2. Single peer profile if shared access has been granted (userId query param).
 * 3. Multiple user profiles in batch for collaborators or peers (userIds query param).
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters:
 *   - userId (optional): String (UUID). Specific user ID to load single profile.
 *   - userIds (optional): String (comma-separated UUIDs). Multiple user IDs to load in batch.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Branch A: Batch multiple user profiles when userIds is provided.
 * 3. Branch B: Retrieve single user profile for requested user or authenticated self.
 */
export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    const currentUserId = user.id;
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const requestedUserIds = searchParams.get("userIds");
    const admin = createAdminClient();

    // ==========================================
    // Branch A: Batch Multiple User Profiles
    // ==========================================
    if (requestedUserIds) {
      const idList = requestedUserIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (idList.length === 0) {
        return NextResponse.json({
          success: true,
          profiles: [],
          users: [],
        });
      }

      const batchResult = await fetchUserProfilesBatch({
        userIds: idList,
        currentUserId,
        admin,
      });

      if (!batchResult.success) {
        return NextResponse.json(
          { success: false, error: batchResult.error },
          { status: 400 }
        );
      }

      const response = NextResponse.json({
        success: true,
        profiles: batchResult.profiles,
        users: batchResult.users,
      });
      return applyAuthCookies(response, newTokens);
    }

    // ==========================================
    // Branch B: Single User Profile
    // ==========================================
    let targetUserId = currentUserId;

    if (requestedUserId && requestedUserId !== currentUserId) {
      const { data: sharePermission, error: permError } = await admin
        .from("shared_roadmaps")
        .select("id, access_level")
        .eq("owner_id", requestedUserId)
        .eq("target_user_id", currentUserId)
        .maybeSingle();

      if (permError) {
        return NextResponse.json(
          { success: false, error: permError.message },
          { status: 400 }
        );
      }

      if (!sharePermission) {
        return NextResponse.json(
          { success: false, error: "Forbidden: No shared access to this profile." },
          { status: 403 }
        );
      }

      targetUserId = requestedUserId;
    }

    const { data: userRecord, error } = await admin
      .from("users")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();

    if (error) {
      console.error("[/api/profile GET] Database query error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // ==========================================
    // Step 2: Format and Return User Profile Response
    // ==========================================
    const resolvedName =
      userRecord?.name ||
      (targetUserId === currentUserId
        ? user.user_metadata?.name || user.user_metadata?.full_name || user.name || ""
        : "");

    const response = NextResponse.json({
      success: true,
      profile: userRecord || null,
      user: {
        id: targetUserId,
        email: userRecord?.email || (targetUserId === currentUserId ? user.email : ""),
        name: resolvedName,
      },
    });
    return applyAuthCookies(response, newTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile GET] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Partially updates authenticated user profile name in users table and auth metadata.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body (JSON):
 *   - name (required): String. New display name (1-100 characters).
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Validate payload parameters.
 * 3. Upsert profile name into users table.
 * 4. Synchronize auth metadata.
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
    // Step 2: Payload Validation
    // ==========================================
    const body = await request.json().catch(() => ({}));
    const rawName = typeof body.name === "string" ? body.name.trim() : "";

    if (!rawName) {
      return NextResponse.json(
        { success: false, error: "Name cannot be empty." },
        { status: 400 }
      );
    }

    if (rawName.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name cannot exceed 100 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ==========================================
    // Step 3: Upsert Profile Name into Users Table
    // ==========================================
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

    // ==========================================
    // Step 4: Synchronize Auth Metadata
    // ==========================================
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

    const response = NextResponse.json({
      success: true,
      message: "Profile name updated successfully.",
      user: {
        id: user.id,
        email: user.email,
        name: rawName,
      },
      profile: updatedUser,
    });
    return applyAuthCookies(response, newTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile PATCH] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/profile
 * Updates unified user profile record in users table with validated and normalized survey fields.
 * Supports updating peer profile if editable shared access is granted.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie required.
 * - Query Parameters: None.
 * - Request Body (JSON):
 *   - targetUserId (optional): String (UUID). Target peer user ID to edit if granted editable access.
 *   - name (optional): String. User full name.
 *   - locale (optional): String. Preferred interface locale ('en' | 'ms' | 'zh').
 *   - employmentStatus (optional): String. Normalized employment status.
 *   - currentJobTitle (optional): String. Current profession or job title.
 *   - industry (optional): String. Industry sector taxonomy value.
 *   - educationLevel (optional): String. Education qualification level.
 *   - yearsOfExperience (optional): String. Experience duration band.
 *   - skills (optional): Array of strings. Current skillset.
 *   - toolsAndSoftware (optional): Array of strings. Software proficiency list.
 *   - casualDescription (optional): String. Freeform background description.
 *   - languages (optional): Array of strings. Known languages.
 *   - careerGoal (optional): String. Primary career development objective.
 *   - targetSectors (optional): Array of strings. Target industry sector values.
 *   - targetJobTitle (optional): String. Target career role title.
 *   - workArrangement (optional): String. Preferred work model ('remote' | 'hybrid' | 'onsite' | 'any').
 *   - weeklyCommitmentHours (optional): String. Weekly time commitment band.
 *   - learningProviders (optional): Array of strings. Selected education providers.
 *   - outputLanguage (optional): String. Preferred roadmap output language.
 *
 * Workflow:
 * 1. Authenticate user from session cookies.
 * 2. Validate peer profile edit permission.
 * 3. Fetch existing user identity data.
 * 4. Upsert normalized profile record.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    let effectiveUserId = user.id;

    // ==========================================
    // Step 2: Validate Peer Profile Edit Permission
    // ==========================================
    if (body.targetUserId && body.targetUserId !== user.id) {
      const { data: sharePermission, error: permError } = await admin
        .from("shared_roadmaps")
        .select("id, access_level")
        .eq("owner_id", body.targetUserId)
        .eq("target_user_id", user.id)
        .eq("access_level", "editable")
        .maybeSingle();

      if (permError) {
        return NextResponse.json(
          { success: false, error: permError.message },
          { status: 400 }
        );
      }

      if (!sharePermission) {
        return NextResponse.json(
          { success: false, error: "Forbidden: No edit permission for this user's profile." },
          { status: 403 }
        );
      }

      effectiveUserId = body.targetUserId;
    }

    // ==========================================
    // Step 3: Fetch Existing User Identity Data
    // ==========================================
    const { data: existingUser } = await admin
      .from("users")
      .select("name, locale, email")
      .eq("id", effectiveUserId)
      .maybeSingle();

    // ==========================================
    // Step 4: Upsert Normalized Profile Record
    // ==========================================
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
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      message: "User profile updated successfully in users table.",
      profile: updatedUser,
    });
    return applyAuthCookies(response, newTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile POST] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
