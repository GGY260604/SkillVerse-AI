import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/users
 * Read records from the 'users' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("users", request);
}

/**
 * POST /api/supabase/users
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("users", request);
}

/**
 * PATCH /api/supabase/users
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("users", request);
}

/**
 * DELETE /api/supabase/users
 * Delete record(s) by ID or list of IDs.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("users", request);
}
