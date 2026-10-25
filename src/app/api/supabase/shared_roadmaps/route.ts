import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/shared_roadmaps
 * Read records from the 'shared_roadmaps' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("shared_roadmaps", request);
}

/**
 * POST /api/supabase/shared_roadmaps
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("shared_roadmaps", request);
}

/**
 * PATCH /api/supabase/shared_roadmaps
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("shared_roadmaps", request);
}

/**
 * DELETE /api/supabase/shared_roadmaps
 * Delete record(s) by id or list of ids.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("shared_roadmaps", request);
}
