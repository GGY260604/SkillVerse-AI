import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/roadmap_phases
 * Read records from the 'roadmap_phases' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("roadmap_phases", request);
}

/**
 * POST /api/supabase/roadmap_phases
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("roadmap_phases", request);
}

/**
 * PATCH /api/supabase/roadmap_phases
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("roadmap_phases", request);
}

/**
 * DELETE /api/supabase/roadmap_phases
 * Delete record(s) by id or list of ids.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("roadmap_phases", request);
}
