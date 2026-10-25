import { NextRequest, NextResponse } from "next/server";
import {
  SUPPORTED_TABLES,
  normalizeTableName,
  handleGetTable,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "../tableHandler";

interface RouteProps {
  params: Promise<{
    table: string;
  }>;
}

/**
 * GET /api/supabase/[table]
 * Dynamically handles reading records from any supported table.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters:
 *   - id (optional): String. Lookup specific record by primary key.
 *   - all (optional): Boolean. If true, fetches all records.
 *   - limit (optional): Number. Page size, defaults to 50.
 *   - page (optional): Number. Page index.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Validate table name against supported schema registry.
 * 2. Delegate query execution to generic table handler.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  // ==========================================
  // Step 1: Validate Table Name Against Supported Schema Registry
  // ==========================================
  const { table: rawTable } = await props.params;
  const table = normalizeTableName(rawTable);

  if (!table) {
    return NextResponse.json(
      {
        success: false,
        error: `Table '${rawTable}' is not recognized or supported.`,
        supportedTables: SUPPORTED_TABLES,
      },
      { status: 404 }
    );
  }

  // ==========================================
  // Step 2: Delegate Query Execution to Generic Table Handler
  // ==========================================
  return handleGetTable(table, request);
}

/**
 * POST /api/supabase/[table]
 * Dynamically handles inserting new records or smart-merging existing records.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters: None.
 * - Request Body:
 *   - data (required): Object or Array of records to insert or upsert.
 *
 * Workflow:
 * 1. Validate table name against supported schema registry.
 * 2. Delegate insert or upsert operation to generic table handler.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  // ==========================================
  // Step 1: Validate Table Name Against Supported Schema Registry
  // ==========================================
  const { table: rawTable } = await props.params;
  const table = normalizeTableName(rawTable);

  if (!table) {
    return NextResponse.json(
      {
        success: false,
        error: `Table '${rawTable}' is not recognized or supported.`,
        supportedTables: SUPPORTED_TABLES,
      },
      { status: 404 }
    );
  }

  // ==========================================
  // Step 2: Delegate Insert or Upsert Operation to Generic Table Handler
  // ==========================================
  return handlePostTable(table, request);
}

/**
 * PATCH /api/supabase/[table]
 * Dynamically handles modifying existing records while preserving unspecified columns.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters:
 *   - id (optional): String. Target record identifier.
 * - Request Body:
 *   - id (optional): String. Target record identifier.
 *   - patchFields (required): Object with updated column values.
 *
 * Workflow:
 * 1. Validate table name against supported schema registry.
 * 2. Delegate patch operation to generic table handler.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  // ==========================================
  // Step 1: Validate Table Name Against Supported Schema Registry
  // ==========================================
  const { table: rawTable } = await props.params;
  const table = normalizeTableName(rawTable);

  if (!table) {
    return NextResponse.json(
      {
        success: false,
        error: `Table '${rawTable}' is not recognized or supported.`,
        supportedTables: SUPPORTED_TABLES,
      },
      { status: 404 }
    );
  }

  // ==========================================
  // Step 2: Delegate Patch Operation to Generic Table Handler
  // ==========================================
  return handlePatchTable(table, request);
}

/**
 * DELETE /api/supabase/[table]
 * Dynamically handles deleting records by identifier from any supported table.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters:
 *   - id (optional): String. Record ID to delete.
 * - Request Body:
 *   - id (optional): String. Record ID to delete.
 *
 * Workflow:
 * 1. Validate table name against supported schema registry.
 * 2. Delegate delete operation to generic table handler.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  // ==========================================
  // Step 1: Validate Table Name Against Supported Schema Registry
  // ==========================================
  const { table: rawTable } = await props.params;
  const table = normalizeTableName(rawTable);

  if (!table) {
    return NextResponse.json(
      {
        success: false,
        error: `Table '${rawTable}' is not recognized or supported.`,
        supportedTables: SUPPORTED_TABLES,
      },
      { status: 404 }
    );
  }

  // ==========================================
  // Step 2: Delegate Delete Operation to Generic Table Handler
  // ==========================================
  return handleDeleteTable(table, request);
}
