import { NextResponse } from "next/server";
import { prisma } from "@/lib/supabase/prisma";

/**
 * GET /api/shared/roles
 * Returns all standardized ESCO roles with multilingual translations (en, ms, zh)
 * for localized role lookups and searchbar autocomplete recommendations.
 */
export async function GET() {
  try {
    const roles = await prisma.escoRole.findMany({
      select: {
        roleId: true,
        title: true,
        titleMs: true,
        titleZh: true,
        industry: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      roles,
    });
  } catch (err: any) {
    console.error("[/api/shared/roles GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load ESCO roles" },
      { status: 500 }
    );
  }
}
