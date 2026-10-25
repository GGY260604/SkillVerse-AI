import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SUPPORTED_TABLES,
  normalizeTableName,
  handlePostTable,
  handlePatchTable,
  handleDeleteTable,
} from "./tableHandler";

/**
 * GET /api/supabase
 * Returns database inventory statistics, table row counts, and administrative usage reference.
 *
 * Request Requirements:
 * - Authentication: None (administrative reference endpoint).
 * - Query Parameters: None.
 * - Request Body: None.
 *
 * Workflow:
 * 1. Query row count statistics for each supported database table.
 * 2. Dispatch inventory summary and API usage guidelines.
 */
export async function GET() {
  try {
    // ==========================================
    // Step 1: Query Row Count Statistics for Each Supported Database Table
    // ==========================================
    const admin = createAdminClient();

    const tableStats = await Promise.all(
      SUPPORTED_TABLES.map(async (table) => {
        try {
          const { count, error } = await admin
            .from(table)
            .select("*", { count: "exact", head: true });

          return {
            table,
            count: error ? null : (count ?? 0),
            status: error ? `Error: ${error.message}` : "available",
            endpoint: `/api/supabase/${table}`,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Query failed";
          return {
            table,
            count: null,
            status: `Error: ${msg}`,
            endpoint: `/api/supabase/${table}`,
          };
        }
      })
    );

    // ==========================================
    // Step 2: Dispatch Inventory Summary and API Usage Guidelines
    // ==========================================
    return NextResponse.json({
      success: true,
      message: "SkillVerse AI Supabase Database Management API",
      supportedTables: SUPPORTED_TABLES,
      tables: tableStats,
      usage: {
        readSingle: "GET /api/supabase/[table]?id=...",
        readPaginated: "GET /api/supabase/[table]?limit=50&page=1&orderBy=created_at&order=desc",
        readAll: "GET /api/supabase/[table]?all=true (or ?limit=-1)",
        addNewOrUpsert: "POST /api/supabase/[table] with { ...fields } or [ { ... } ] (auto-merges existing columns)",
        modifyExistingPreservingCols: "PATCH /api/supabase/[table]?id=... with { col: 'new_val' } (unspecified cols are untouched)",
        deleteRecords: "DELETE /api/supabase/[table]?id=... or ?ids=... with optional JSON body",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/supabase] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/supabase
 * Generic table upload gateway for smart insert and upsert operations.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters:
 *   - table (optional): String. Target table name if not provided in JSON body.
 * - Request Body:
 *   - table (optional): String. Target table name.
 *   - data (required): Object or Array of objects to insert or upsert.
 *
 * Workflow:
 * 1. Validate payload and target table identifier.
 * 2. Delegate operation to generic table handler.
 */
export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload and Target Table Identifier
    // ==========================================
    const clonedRequest = request.clone();
    const body = await clonedRequest.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be a JSON object with a 'table' field." },
        { status: 400 }
      );
    }

    const rawTable = body.table || request.nextUrl.searchParams.get("table");
    if (!rawTable || typeof rawTable !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Table name is required. Specify 'table' in JSON body or '?table=' query parameter.",
          supportedTables: SUPPORTED_TABLES,
        },
        { status: 400 }
      );
    }

    const table = normalizeTableName(rawTable);
    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: `Table '${rawTable}' is not supported.`,
          supportedTables: SUPPORTED_TABLES,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Delegate Operation to Generic Table Handler
    // ==========================================
    return await handlePostTable(table, request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/supabase] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/supabase
 * Generic table modification gateway preserving unspecified columns.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters:
 *   - table (optional): String. Target table name if not provided in JSON body.
 * - Request Body:
 *   - table (optional): String. Target table name.
 *   - id (required): String. Identifier of the record to update.
 *
 * Workflow:
 * 1. Validate payload and target table identifier.
 * 2. Delegate modification to generic table handler.
 */
export async function PATCH(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload and Target Table Identifier
    // ==========================================
    const clonedRequest = request.clone();
    const body = await clonedRequest.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be a JSON object with 'table' and identifier." },
        { status: 400 }
      );
    }

    const rawTable = body.table || request.nextUrl.searchParams.get("table");
    if (!rawTable || typeof rawTable !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Table name is required. Specify 'table' in JSON body or '?table=' query parameter.",
          supportedTables: SUPPORTED_TABLES,
        },
        { status: 400 }
      );
    }

    const table = normalizeTableName(rawTable);
    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: `Table '${rawTable}' is not supported.`,
          supportedTables: SUPPORTED_TABLES,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Delegate Modification to Generic Table Handler
    // ==========================================
    return await handlePatchTable(table, request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[PATCH /api/supabase] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/supabase
 * Generic table deletion gateway for record deletion by identifier.
 *
 * Request Requirements:
 * - Authentication: None.
 * - Query Parameters:
 *   - table (optional): String. Target table name if not provided in JSON body.
 *   - id (optional): String. Record ID to delete.
 * - Request Body:
 *   - table (optional): String. Target table name.
 *   - id (optional): String. Record ID to delete.
 *
 * Workflow:
 * 1. Validate payload and target table identifier.
 * 2. Delegate deletion to generic table handler.
 */
export async function DELETE(request: NextRequest) {
  try {
    // ==========================================
    // Step 1: Validate Payload and Target Table Identifier
    // ==========================================
    const clonedRequest = request.clone();
    const body = await clonedRequest.json().catch(() => null);

    const rawTable =
      (body && typeof body === "object" && body.table) ||
      request.nextUrl.searchParams.get("table");

    if (!rawTable || typeof rawTable !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Table name is required. Specify 'table' in query parameter or JSON body.",
          supportedTables: SUPPORTED_TABLES,
        },
        { status: 400 }
      );
    }

    const table = normalizeTableName(rawTable);
    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: `Table '${rawTable}' is not supported.`,
          supportedTables: SUPPORTED_TABLES,
        },
        { status: 400 }
      );
    }

    // ==========================================
    // Step 2: Delegate Deletion to Generic Table Handler
    // ==========================================
    return await handleDeleteTable(table, request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[DELETE /api/supabase] Error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
