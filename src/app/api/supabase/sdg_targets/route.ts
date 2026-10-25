import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/sdg_targets
 * Read records from the 'sdg_targets' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("sdg_targets", request);
}

/**
 * POST /api/supabase/sdg_targets
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("sdg_targets", request);
}

/**
 * PATCH /api/supabase/sdg_targets
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("sdg_targets", request);
}

/**
 * DELETE /api/supabase/sdg_targets
 * Delete record(s) by target_code or list of target_codes.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("sdg_targets", request);
}
