import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthTokensFromCookies } from "@/lib/supabase/cookies";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/user/exp
 * Persists the user's total EXP and level into both:
 * 1. public.users table (exp and level columns via Prisma)
 * 2. auth.users table (raw_user_meta_data via Supabase Admin)
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json({ success: true, guest: true, message: "Unauthenticated guest session." });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ success: true, guest: true, message: "Session expired or invalid." });
    }

    const body = await request.json();
    const totalExp = typeof body.totalExp === "number" ? Math.max(0, Math.round(body.totalExp)) : undefined;
    const level = typeof body.level === "number" ? Math.max(1, Math.round(body.level)) : undefined;

    if (totalExp === undefined) {
      return NextResponse.json({ error: "Missing totalExp number parameter." }, { status: 400 });
    }

    const calculatedLevel = level || Math.floor(totalExp / 100) + 1;
    const userId = userData.user.id;
    const admin = createAdminClient();

    // 1. Persist directly to public.users table in PostgreSQL (Prisma)
    try {
      await prisma.user.updateMany({
        where: { id: userId },
        data: { exp: totalExp, level: calculatedLevel },
      });
    } catch (dbErr) {
      console.warn("[/api/user/exp POST] public.users update warning:", dbErr);
    }

    // 2. Persist directly to auth.users (raw_user_meta_data) in PostgreSQL (Supabase Auth)
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...userData.user.user_metadata,
        exp: totalExp,
        level: calculatedLevel,
      },
    });

    if (updateError) {
      console.error("[/api/user/exp POST] auth.users update error:", updateError);
    }

    return NextResponse.json({
      success: true,
      totalExp,
      level: calculatedLevel,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/user/exp POST] Uncaught error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/user/exp
 * Retrieves the current authenticated user's total EXP and level from database.
 */
export async function GET() {
  try {
    const { accessToken } = await getAuthTokensFromCookies();
    if (!accessToken) {
      return NextResponse.json({ totalExp: 0, level: 1, guest: true });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ totalExp: 0, level: 1, guest: true });
    }

    const userId = userData.user.id;

    // Check public.users first
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { exp: true, level: true },
    });

    if (dbUser && typeof dbUser.exp === "number") {
      return NextResponse.json({
        success: true,
        totalExp: dbUser.exp,
        level: dbUser.level,
      });
    }

    // Fallback to auth.users user_metadata
    const metadata = userData.user.user_metadata || {};
    const totalExp = typeof metadata.exp === "number" ? metadata.exp : 0;
    const level = typeof metadata.level === "number" ? metadata.level : Math.floor(totalExp / 100) + 1;

    return NextResponse.json({
      success: true,
      totalExp,
      level,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
