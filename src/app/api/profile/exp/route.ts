import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAuthenticatedUser,
  applyAuthCookies,
} from "@/lib/supabase/cookies";

/**
 * POST /api/profile/exp
 * Updates user experience points (EXP) and level in the users table and synchronizes Supabase auth metadata.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie optional (guest sessions return early).
 * - Query Parameters: None.
 * - Request Body (JSON):
 *   - totalExp (required): Number. Accumulated total experience points (non-negative).
 *   - level (optional): Number. Calculated profile level (minimum 1).
 *
 * Workflow:
 * 1. Verify user authentication status.
 * 2. Validate payload parameters and calculate level.
 * 3. Update users table record via Supabase admin client.
 * 4. Synchronize auth user metadata.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: User Authentication Check
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: true, guest: true, message: "Unauthenticated guest session." });
    }

    // ==========================================
    // Step 2: Payload Validation and Level Calculation
    // ==========================================
    const body = await request.json().catch(() => ({}));
    const totalExp = typeof body.totalExp === "number" ? Math.max(0, Math.round(body.totalExp)) : undefined;
    const level = typeof body.level === "number" ? Math.max(1, Math.round(body.level)) : undefined;

    if (totalExp === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing totalExp number parameter." },
        { status: 400 }
      );
    }

    const calculatedLevel = level || Math.floor(totalExp / 100) + 1;
    const userId = user.id;
    const admin = createAdminClient();

    // ==========================================
    // Step 3: Update Users Table Record via Supabase Admin
    // ==========================================
    const { error: dbErr } = await admin
      .from("users")
      .update({ exp: totalExp, level: calculatedLevel })
      .eq("id", userId);

    if (dbErr) {
      console.warn("[/api/profile/exp POST] Users table update warning:", dbErr.message);
    }

    // ==========================================
    // Step 4: Synchronize Auth User Metadata
    // ==========================================
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(user.user_metadata || user.metadata || {}),
        exp: totalExp,
        level: calculatedLevel,
      },
    });

    if (updateError) {
      console.error("[/api/profile/exp POST] Auth metadata update error:", updateError);
    }

    const response = NextResponse.json({
      success: true,
      totalExp,
      level: calculatedLevel,
    });
    return applyAuthCookies(response, newTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile/exp POST] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/profile/exp
 * Retrieves authenticated user total EXP and level from the users table with auth metadata fallback.
 *
 * Request Requirements:
 * - Authentication: Supabase session cookie optional (unauthenticated guests return defaults).
 * - Query Parameters: None.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Verify user authentication status.
 * 2. Query user EXP and level from users table.
 * 3. Fall back to auth user metadata if database record is missing.
 */
export async function GET() {
  try {
    // ==========================================
    // Step 1: User Authentication Check
    // ==========================================
    const { user, newTokens } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: true, totalExp: 0, level: 1, guest: true });
    }

    const userId = user.id;
    const admin = createAdminClient();

    // ==========================================
    // Step 2: Query User EXP and Level from Users Table
    // ==========================================
    const { data: dbUser } = await admin
      .from("users")
      .select("exp, level")
      .eq("id", userId)
      .maybeSingle();

    if (dbUser && (typeof dbUser.exp === "number" || typeof dbUser.level === "number")) {
      const dbExp = typeof dbUser.exp === "number" ? dbUser.exp : 0;
      const dbLevel = typeof dbUser.level === "number" ? dbUser.level : Math.floor(dbExp / 100) + 1;
      return NextResponse.json({
        success: true,
        totalExp: dbExp,
        level: dbLevel,
      });
    }

    // ==========================================
    // Step 3: Fall Back to Auth User Metadata if Database Record Is Missing
    // ==========================================
    const metadata = user.user_metadata || user.metadata || {};
    const totalExp = typeof metadata.exp === "number" ? metadata.exp : 0;
    const level = typeof metadata.level === "number" ? metadata.level : Math.floor(totalExp / 100) + 1;

    const response = NextResponse.json({
      success: true,
      totalExp,
      level,
    });
    return applyAuthCookies(response, newTokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/profile/exp GET] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
