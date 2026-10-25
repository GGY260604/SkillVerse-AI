import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/esco_roles
 * Read records from the 'esco_roles' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("esco_roles", request);
}

/**
 * POST /api/supabase/esco_roles
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("esco_roles", request);
}

/**
 * PATCH /api/supabase/esco_roles
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("esco_roles", request);
}

/**
 * DELETE /api/supabase/esco_roles
 * Delete record(s) by role_id or list of role_ids.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("esco_roles", request);
}
