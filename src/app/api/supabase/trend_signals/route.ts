import { NextRequest } from "next/server";
import {
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

/**
 * GET /api/supabase/trend_signals
 * Read records from the 'trend_signals' table (single, paginated, or all).
 */
export async function GET(request: NextRequest) {
  return handleGetTable("trend_signals", request);
}

/**
 * POST /api/supabase/trend_signals
 * Add new record(s) or smart-merge existing record(s).
 */
export async function POST(request: NextRequest) {
  return handlePostTable("trend_signals", request);
}

/**
 * PATCH /api/supabase/trend_signals
 * Partially modify existing record(s). Unspecified columns are completely preserved.
 */
export async function PATCH(request: NextRequest) {
  return handlePatchTable("trend_signals", request);
}

/**
 * DELETE /api/supabase/trend_signals
 * Delete record(s) by skillName or list of skillNames.
 */
export async function DELETE(request: NextRequest) {
  return handleDeleteTable("trend_signals", request);
}
