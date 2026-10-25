import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const SUPPORTED_TABLES = [
  "users",
  "esco_roles",
  "sdg_targets",
  "trend_signals",
  "roadmaps",
  "roadmap_phases",
  "shared_roadmaps",
] as const;

export type SupportedTable = (typeof SUPPORTED_TABLES)[number];

export const TABLE_PRIMARY_KEYS: Record<SupportedTable, string> = {
  users: "id",
  esco_roles: "role_id",
  sdg_targets: "target_code",
  trend_signals: "skillName",
  roadmaps: "id",
  roadmap_phases: "id",
  shared_roadmaps: "id",
};

const TABLE_DEFAULT_ORDER_BY: Record<SupportedTable, string> = {
  users: "createdAt",
  esco_roles: "created_at",
  sdg_targets: "created_at",
  trend_signals: "updatedAt",
  roadmaps: "created_at",
  roadmap_phases: "created_at",
  shared_roadmaps: "created_at",
};

export function isSupportedTable(table: string): table is SupportedTable {
  return (SUPPORTED_TABLES as readonly string[]).includes(table);
}

/**
 * Normalizes input table parameter (supports snake_case and kebab-case).
 */
export function normalizeTableName(input: string): SupportedTable | null {
  const normalized = input.toLowerCase().trim().replace(/-/g, "_");
  if (isSupportedTable(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Type-safe query helper that bypasses Supabase recursive union depth limits.
 */
function getTableQuery(admin: ReturnType<typeof createAdminClient>, table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (admin as any).from(table);
}

/**
 * 1. GET: Read table data
 * Supports:
 * - Single record: ?id=... (or primary key lookup)
 * - All records: ?all=true or ?limit=-1 or ?limit=all
 * - Pagination: ?page=1&limit=50 or ?offset=0&limit=50
 * - Field filters: e.g. ?status=current or ?email=user@example.com
 * - Ordering: ?orderBy=created_at&order=desc
 */
export async function handleGetTable(table: SupportedTable, request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const primaryKey = TABLE_PRIMARY_KEYS[table];

    // ==========================================
    // Single Record Lookup by Identifier
    // ==========================================
    const lookupId = searchParams.get("id") || searchParams.get(primaryKey);
    if (lookupId) {
      let query = getTableQuery(admin, table).select("*");
      if (searchParams.has("id")) {
        query = query.eq("id", lookupId);
      } else {
        query = query.eq(primaryKey, lookupId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return NextResponse.json(
          { success: false, table, error: error.message },
          { status: 400 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { success: false, table, error: `Record with identifier '${lookupId}' was not found.` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        table,
        data,
      });
    }

    // ==========================================
    // Query Parameter Evaluation
    // ==========================================
    const orderBy = searchParams.get("orderBy") || TABLE_DEFAULT_ORDER_BY[table] || "id";
    const orderDirection = searchParams.get("order")?.toLowerCase() === "asc" ? "asc" : "desc";

    const reservedParams = new Set([
      "id",
      "limit",
      "offset",
      "page",
      "orderBy",
      "order",
      "table",
      "all",
    ]);

    // ==========================================
    // Unbounded Full Dataset Ingestion
    // ==========================================
    const isAllMode =
      searchParams.get("all") === "true" ||
      searchParams.get("limit") === "-1" ||
      searchParams.get("limit")?.toLowerCase() === "all";

    if (isAllMode) {
      let allRecords: Record<string, unknown>[] = [];
      const CHUNK_SIZE = 1000;
      let from = 0;
      let hasMore = true;
      let totalCount = 0;

      while (hasMore) {
        let chunkQuery = getTableQuery(admin, table).select("*", { count: "exact" });

        searchParams.forEach((val, key) => {
          if (!reservedParams.has(key) && val.trim() !== "") {
            if (val.includes(",")) {
              const list = val.split(",").map((s) => s.trim()).filter(Boolean);
              chunkQuery = chunkQuery.in(key, list);
            } else {
              chunkQuery = chunkQuery.eq(key, val);
            }
          }
        });

        chunkQuery = chunkQuery
          .order(orderBy, { ascending: orderDirection === "asc" })
          .range(from, from + CHUNK_SIZE - 1);

        const { data, count, error } = await chunkQuery;

        if (error) {
          return NextResponse.json(
            { success: false, table, error: error.message },
            { status: 400 }
          );
        }

        if (count !== null && totalCount === 0) {
          totalCount = count;
        }

        if (data && data.length > 0) {
          allRecords = allRecords.concat(data);
          from += data.length;
          if (data.length < CHUNK_SIZE || allRecords.length >= totalCount) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      return NextResponse.json({
        success: true,
        table,
        isAll: true,
        total: totalCount || allRecords.length,
        count: allRecords.length,
        data: allRecords,
      });
    }

    // ==========================================
    // Standard Paginated Query Execution
    // ==========================================
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 1000);

    let offset = 0;
    const pageParam = searchParams.get("page");
    const offsetParam = searchParams.get("offset");

    if (pageParam) {
      const page = Math.max(parseInt(pageParam, 10) || 1, 1);
      offset = (page - 1) * limit;
    } else if (offsetParam) {
      offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
    }

    let query = getTableQuery(admin, table).select("*", { count: "exact" });

    searchParams.forEach((val, key) => {
      if (!reservedParams.has(key) && val.trim() !== "") {
        if (val.includes(",")) {
          const list = val.split(",").map((s) => s.trim()).filter(Boolean);
          query = query.in(key, list);
        } else {
          query = query.eq(key, val);
        }
      }
    });

    query = query
      .order(orderBy, { ascending: orderDirection === "asc" })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, table, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      table,
      isAll: false,
      total: count ?? 0,
      limit,
      offset,
      count: data?.length ?? 0,
      data: data ?? [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`[GET /api/supabase/${table}] Error:`, err);
    return NextResponse.json({ success: false, table, error: message }, { status: 500 });
  }
}

/**
 * 2. POST: Add new records (Insert) or Smart Upsert (Auto-Merge)
 * Supports:
 * - Single record: { ...fields }
 * - Array of records: [ { ... }, { ... } ]
 * - Wrapper payload: { data: [...] } or { records: [...] }
 * - Mode:
 *   - "merge" (Default): Checks if line exists. If it exists, merges fields with database existing line so omitted columns are 100% preserved!
 *   - "insert": Strictly inserts as new line (fails if duplicate key exists).
 */
export async function handlePostTable(table: SupportedTable, request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, table, error: "Request body cannot be empty." },
        { status: 400 }
      );
    }

    // Extract records payload
    let rawRecords: Record<string, unknown>[] = [];

    if (Array.isArray(body)) {
      rawRecords = body;
    } else if (Array.isArray(body.data)) {
      rawRecords = body.data;
    } else if (Array.isArray(body.records)) {
      rawRecords = body.records;
    } else if (body.data && typeof body.data === "object") {
      rawRecords = [body.data];
    } else if (typeof body === "object") {
      const cleanRecord = { ...body };
      delete cleanRecord.table;
      delete cleanRecord.mode;
      delete cleanRecord.onConflict;
      rawRecords = [cleanRecord];
    }

    if (rawRecords.length === 0) {
      return NextResponse.json(
        { success: false, table, error: "No records found in upload payload." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || (body && body.mode) || "merge"; // "merge" | "insert"
    const conflictKey =
      (typeof body.onConflict === "string" && body.onConflict.trim()) ||
      searchParams.get("onConflict") ||
      TABLE_PRIMARY_KEYS[table];

    // ==========================================
    // Mode A: Strict Insert
    // ==========================================
    if (mode === "insert") {
      const { data, error } = await getTableQuery(admin, table).insert(rawRecords).select();

      if (error) {
        return NextResponse.json(
          { success: false, table, mode: "insert", error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        table,
        mode: "insert",
        insertedCount: rawRecords.length,
        data,
      });
    }

    // ==========================================
    // Mode B: Smart Merge
    // ==========================================
    // Collect all conflict key identifiers from payload.
    const conflictValues = rawRecords
      .map((r) => r[conflictKey] ?? r.id)
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "");

    // Fetch existing rows from database in one query.
    const existingMap = new Map<string, Record<string, unknown>>();
    if (conflictValues.length > 0) {
      const { data: existingRows } = await getTableQuery(admin, table)
        .select("*")
        .in(conflictKey, conflictValues);

      if (existingRows) {
        existingRows.forEach((row: Record<string, unknown>) => {
          const val = row[conflictKey] ?? row.id;
          if (val !== undefined && val !== null) {
            existingMap.set(String(val), row);
          }
        });
      }
    }

    // 3. For existing records: merge incoming fields onto existing fields (preserving all other columns!)
    //    For new records: keep incoming fields as-is
    let updatedCount = 0;
    let newInsertedCount = 0;

    const mergedRecords = rawRecords.map((incoming) => {
      const incomingVal = incoming[conflictKey] ?? incoming.id;
      if (incomingVal !== undefined && incomingVal !== null && existingMap.has(String(incomingVal))) {
        const existingRow = existingMap.get(String(incomingVal))!;
        updatedCount++;
        return {
          ...existingRow,
          ...incoming,
        };
      }
      newInsertedCount++;
      return incoming;
    });

    // 4. Upsert merged records safely
    const { data, error } = await getTableQuery(admin, table)
      .upsert(mergedRecords, { onConflict: conflictKey })
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, table, mode: "merge", error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      table,
      mode: "merge",
      conflictKey,
      totalProcessed: mergedRecords.length,
      updatedCount,
      insertedCount: newInsertedCount,
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`[POST /api/supabase/${table}] Error:`, err);
    return NextResponse.json({ success: false, table, error: message }, { status: 500 });
  }
}

/**
 * 3. PATCH: Modify existing records (Partial Update)
 * Crucial feature: ONLY modifies the fields supplied in request.
 * Any unsupplied columns automatically remain 100% untouched and preserved in database!
 *
 * Supports:
 * - Direct single update:
 *   PATCH /api/supabase/users?id=xxx with { "currentJobTitle": "Lead Developer" }
 *   or PATCH /api/supabase/users with { "id": "xxx", "currentJobTitle": "Lead Developer" }
 * - Batch updates:
 *   PATCH /api/supabase/users with [ { "id": "1", "level": 2 }, { "id": "2", "level": 3 } ]
 */
export async function handlePatchTable(table: SupportedTable, request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const primaryKey = TABLE_PRIMARY_KEYS[table];
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, table, error: "Request body cannot be empty." },
        { status: 400 }
      );
    }

    // ==========================================
    // Case A: Batch Updates Array
    // ==========================================
    if (Array.isArray(body)) {
      const updatedResults: Record<string, unknown>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < body.length; i++) {
        const item = body[i];
        const recordId = item[primaryKey] ?? item.id;

        if (!recordId) {
          errors.push(`Row index ${i}: missing identifier field '${primaryKey}' or 'id'.`);
          continue;
        }

        const patchData = { ...item };
        delete patchData[primaryKey];
        delete patchData.id;

        const { data, error } = await getTableQuery(admin, table)
          .update(patchData)
          .eq(primaryKey, recordId)
          .select()
          .maybeSingle();

        if (error) {
          errors.push(`Row ${recordId}: ${error.message}`);
        } else if (data) {
          updatedResults.push(data);
        } else {
          errors.push(`Row ${recordId}: record not found.`);
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        table,
        updatedCount: updatedResults.length,
        errors: errors.length > 0 ? errors : undefined,
        data: updatedResults,
      });
    }

    // ==========================================
    // Case B: Single Update Object
    // ==========================================
    const recordId = searchParams.get("id") || searchParams.get(primaryKey) || body[primaryKey] || body.id;

    if (!recordId) {
      return NextResponse.json(
        {
          success: false,
          table,
          error: `Identifier is required to modify a line. Specify '?id=' in query string or '${primaryKey}' in JSON body.`,
        },
        { status: 400 }
      );
    }

    // Prepare patch fields (exclude identifiers and meta keys from update payload)
    const patchFields: Record<string, unknown> = { ...body };
    delete patchFields[primaryKey];
    delete patchFields.id;
    delete patchFields.table;

    if (Object.keys(patchFields).length === 0) {
      return NextResponse.json(
        { success: false, table, error: "No fields provided to update." },
        { status: 400 }
      );
    }

    // Perform partial update
    const { data, error } = await getTableQuery(admin, table)
      .update(patchFields)
      .eq(primaryKey, recordId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, table, error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, table, error: `Record with ${primaryKey}='${recordId}' was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      table,
      message: "Record partially updated successfully. Unspecified columns were preserved.",
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`[PATCH /api/supabase/${table}] Error:`, err);
    return NextResponse.json({ success: false, table, error: message }, { status: 500 });
  }
}

/**
 * 4. DELETE: Delete records from table
 * Supports:
 * - Single record via query param: DELETE /api/supabase/users?id=xxx
 * - Single record via JSON body: { "id": "xxx" }
 * - Batch deletion via query param: DELETE /api/supabase/users?ids=xxx,yyy,zzz
 * - Batch deletion via JSON body: { "ids": ["xxx", "yyy"] } or [ "xxx", "yyy" ]
 */
export async function handleDeleteTable(table: SupportedTable, request: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const primaryKey = TABLE_PRIMARY_KEYS[table];

    // Try reading JSON body if present
    const body = await request.json().catch(() => null);

    // Collect IDs to delete from request parameters.
    const idsToDelete: string[] = [];

    // Check query params.
    const queryId = searchParams.get("id") || searchParams.get(primaryKey);
    const queryIds = searchParams.get("ids");

    if (queryId) {
      if (queryId.includes(",")) {
        idsToDelete.push(...queryId.split(",").map((s) => s.trim()).filter(Boolean));
      } else {
        idsToDelete.push(queryId.trim());
      }
    }

    if (queryIds) {
      idsToDelete.push(...queryIds.split(",").map((s) => s.trim()).filter(Boolean));
    }

    // Check body content.
    if (body) {
      if (Array.isArray(body)) {
        body.forEach((item) => {
          if (typeof item === "string" || typeof item === "number") {
            idsToDelete.push(String(item));
          } else if (item && typeof item === "object") {
            const val = item[primaryKey] ?? item.id;
            if (val) idsToDelete.push(String(val));
          }
        });
      } else if (typeof body === "object") {
        if (Array.isArray(body.ids)) {
          body.ids.forEach((id: unknown) => {
            if (id) idsToDelete.push(String(id));
          });
        } else {
          const singleVal = body[primaryKey] ?? body.id;
          if (singleVal) idsToDelete.push(String(singleVal));
        }
      }
    }

    const uniqueIds = Array.from(new Set(idsToDelete));

    if (uniqueIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          table,
          error: `Identifier is required to delete record(s). Specify '?id=' or '?ids=' in query string, or provide 'id' / 'ids' in JSON body.`,
        },
        { status: 400 }
      );
    }

    // Perform record deletion from database.
    let query = getTableQuery(admin, table).delete();
    if (uniqueIds.length === 1) {
      query = query.eq(primaryKey, uniqueIds[0]);
    } else {
      query = query.in(primaryKey, uniqueIds);
    }

    const { data, error } = await query.select();

    if (error) {
      return NextResponse.json(
        { success: false, table, error: error.message },
        { status: 400 }
      );
    }

    const deletedCount = data ? data.length : uniqueIds.length;

    return NextResponse.json({
      success: true,
      table,
      message: `Deleted ${deletedCount} record(s) from '${table}'.`,
      deletedCount,
      deletedIds: uniqueIds,
      data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`[DELETE /api/supabase/${table}] Error:`, err);
    return NextResponse.json({ success: false, table, error: message }, { status: 500 });
  }
}
