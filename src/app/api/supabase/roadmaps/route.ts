import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/roadmaps
 * Read records from the 'roadmaps' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("roadmaps", request);
}

/**
 * POST /api/supabase/roadmaps
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("roadmaps", request);
}

/**
 * PATCH /api/supabase/roadmaps
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("roadmaps", request);
}

/**
 * DELETE /api/supabase/roadmaps
 * Delete record(s) by id or list of ids.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("roadmaps", request);
}
